// Run state and combat math. Pure functions over plain objects so it can be unit-tested.
import { BOONS, ITEMS, ITEM_WEIGHTS, ELITES, KAMI, META } from "./content.js";

export const ROOMS_PER_FLOOR = 4; // then the boss
export const FLOOR_COUNT = 4;
export const BASE_DAMAGE = 20;
export const BASE_HP = 100;
export const BASE_CRIT = 0.05;
export const CAPS = { crit: 0.75, double: 0.6, dodge: 0.6, removeOptions: 2, priceCut: 0.6 };

const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

function weighted(weights, rng) {
  const entries = Object.entries(weights).filter(([, w]) => w > 0);
  let r = rng() * entries.reduce((s, [, w]) => s + w, 0);
  for (const [k, w] of entries) if ((r -= w) < 0) return k;
  return entries[entries.length - 1][0];
}

export function newRun(meta = {}, lookKey = "male") {
  const lv = (id) => Math.min(meta[id] || 0, META[id].max);
  const maxHp = BASE_HP + lv("vitality") * 10;
  return {
    lookKey,
    meta: { ...meta },
    maxHp,
    hp: maxHp,
    gold: 0,
    hints: 3 + lv("scholar"),
    rerolls: lv("fate"),
    revives: lv("defiance"),
    boons: {}, // id -> { value, level, rarity }
    items: {}, // id -> count
    floor: 0,
    room: 0, // rooms cleared on this floor
    depth: 0, // combat rooms entered this run (drives scaling)
    streak: 0,
    shield: 0,
    forgive: 0,
    usedDoors: {},
    stats: { correct: 0, wrong: 0, rooms: 0, kills: 0, bosses: 0 },
    missed: [], // { affix, meaning }
    over: false,
    won: false,
  };
}

// Sum every boon, relic and shrine perk into one flat stat block.
export function stats(run) {
  const s = {
    dmgFlat: 0, dmgPct: 0, crit: BASE_CRIT, critMult: 0, double: 0, dodge: 0, armor: 0,
    healRoom: 0, healKill: 0, healCorrect: 0, goldMult: 0, shieldRoom: 0, forgiveRoom: 0,
    burn: 0, static: 0, thunder: 0, removeOptions: 0, priceCut: 0, streakMult: 0, streakFlat: 0,
    enemyDmg: 0, maxHpMult: 0, noRoomHeal: 0, hintRemoves: 0,
  };
  for (const [id, b] of Object.entries(run.boons)) {
    const def = BOONS[id];
    if (def.stat !== "hintGain") s[def.stat] += b.value;
    if (id === "wisdom") s.hintRemoves = 1;
  }
  for (const [id, n] of Object.entries(run.items)) {
    const def = ITEMS[id];
    if (!n || def.stat === "hintGain" || def.stat === "revive") continue;
    s[def.stat] += def.per * n;
    for (const [k, v] of Object.entries(def.extra || {})) s[k] += v * n;
  }
  const m = run.meta || {};
  s.goldMult += 0.15 * (m.prosperity || 0);
  s.crit += 0.04 * (m.keen || 0);
  s.crit = Math.min(CAPS.crit, s.crit);
  s.double = Math.min(CAPS.double, s.double);
  s.dodge = Math.min(CAPS.dodge, s.dodge);
  s.removeOptions = Math.min(CAPS.removeOptions, s.removeOptions);
  s.priceCut = Math.min(CAPS.priceCut, s.priceCut);
  return s;
}

/* ----------------------------------------------------------------- enemies */

const FLOOR_FOES = [
  { normals: ["lantern", "wisp", "umbrella"], boss: "cat" },
  { normals: ["wisp", "umbrella", "lantern"], boss: "oni" },
  { normals: ["umbrella", "lantern", "wisp"], boss: "fox" },
  { normals: ["wisp", "lantern", "umbrella"], boss: "dragon" },
];

export function enemyStats(run, { boss = false, elite = null } = {}) {
  const d = run.depth;
  let hp, dmg;
  if (boss) {
    hp = 110 * (1 + 0.5 * run.floor) * (1 + 0.04 * d);
    dmg = 14 + 5 * run.floor + 0.4 * d;
  } else {
    hp = 34 * (1 + 0.13 * d);
    dmg = 9 + 1.1 * d;
  }
  if (elite) hp *= 1.6;
  return { hp: Math.round(hp), dmg: Math.round(dmg) };
}

export function makeEnemy(run, rng, { boss = false, elite = false } = {}) {
  const foes = FLOOR_FOES[run.floor];
  const type = boss ? foes.boss : pick(foes.normals, rng);
  const eliteId = elite ? pick(Object.keys(ELITES), rng) : null;
  const { hp, dmg } = enemyStats(run, { boss, elite: eliteId });
  return {
    type, boss, hp, max: hp, dmg,
    elite: eliteId,
    ward: eliteId ? ELITES[eliteId].ward || 0 : 0,
    burn: 0,
    turns: 0,
    charging: false,
  };
}

// Enemies per combat room: one early, sometimes two once the run heats up.
export function enemiesForRoom(run, rng, kind) {
  if (kind === "boss") return [makeEnemy(run, rng, { boss: true })];
  if (kind === "elite") return [makeEnemy(run, rng, { elite: true })];
  const list = [makeEnemy(run, rng, { elite: rng() < Math.min(0.35, 0.03 * run.depth) })];
  if (run.depth >= 4 && rng() < Math.min(0.6, 0.1 * (run.depth - 2))) list.push(makeEnemy(run, rng));
  return list;
}

/* ------------------------------------------------------------------ combat */

function critRoll(s, rng) {
  return rng() < s.crit;
}

// Player answered correctly: returns the hits to animate and mutates enemy/run.
export function heroStrike(run, enemy, rng) {
  const s = stats(run);
  run.streak += 1;
  run.stats.correct += 1;
  const lvl = Math.min(run.streak - 1, 4);
  let dmg = BASE_DAMAGE + s.dmgFlat + lvl * s.streakFlat;
  dmg += lvl * 4 * (1 + s.streakMult);
  dmg *= 1 + s.dmgPct;
  const interrupted = enemy.charging;
  if (interrupted) dmg *= 1.5;
  enemy.charging = false;

  const hits = [];
  const swing = (kind) => {
    const crit = critRoll(s, rng);
    let d = dmg * (crit ? 2 + s.critMult : 1);
    hits.push(applyHit(enemy, d, { crit, kind }));
  };
  swing("slash");
  if (rng() < s.double && enemy.hp > 0) swing("slash");
  if (s.thunder && run.streak % 3 === 0 && enemy.hp > 0) hits.push(applyHit(enemy, s.thunder, { kind: "thunder" }));
  if (s.burn) enemy.burn = Math.max(enemy.burn, s.burn);
  let healed = 0;
  if (s.healCorrect) healed = heal(run, s.healCorrect);
  return { hits, interrupted, healed };
}

export function applyHit(enemy, raw, { crit = false, kind = "slash" } = {}) {
  if (enemy.ward > 0) {
    enemy.ward -= 1;
    return { dmg: 0, crit, kind, blocked: true };
  }
  const taken = enemy.elite ? ELITES[enemy.elite].dmgTaken || 1 : 1;
  const dmg = Math.max(1, Math.round(raw * taken));
  enemy.hp = Math.max(0, enemy.hp - dmg);
  return { dmg, crit, kind, blocked: false };
}

// Player answered wrong: the enemy attacks.
export function enemyStrike(run, enemy, rng) {
  const s = stats(run);
  run.streak = 0;
  run.stats.wrong += 1;
  const heavy = enemy.charging;
  enemy.charging = false;
  const zap = s.static && enemy.hp > 0 ? applyHit(enemy, s.static, { kind: "static" }) : null;

  if (run.forgive > 0) {
    run.forgive -= 1;
    return { forgiven: true, zap, heavy };
  }
  if (rng() < s.dodge) return { dodged: true, zap, heavy };

  const e = enemy.elite ? ELITES[enemy.elite] : {};
  let raw = enemy.dmg * (1 + s.enemyDmg) * (e.dmgMult || 1) * (heavy ? 2 : 1);
  let dmg = Math.max(1, Math.round(raw) - s.armor);
  const absorbed = Math.min(run.shield, dmg);
  run.shield -= absorbed;
  dmg -= absorbed;
  run.hp = Math.max(0, run.hp - dmg);
  let leech = 0;
  if (e.lifesteal && enemy.hp > 0) {
    leech = Math.round((dmg + absorbed) * e.lifesteal);
    enemy.hp = Math.min(enemy.max, enemy.hp + leech);
  }
  return { dmg, absorbed, leech, zap, heavy };
}

// After each answer: burn ticks and bosses decide whether to wind up.
export function endTurn(enemy) {
  let burn = 0;
  if (enemy.burn && enemy.hp > 0) {
    burn = Math.min(enemy.hp, enemy.burn);
    enemy.hp -= burn;
  }
  enemy.turns += 1;
  if (enemy.boss && enemy.hp > 0 && enemy.turns % 4 === 3) enemy.charging = true;
  return { burn };
}

export function heal(run, amount) {
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + Math.max(0, Math.round(amount)));
  return run.hp - before;
}

export function tryRevive(run) {
  if (run.hp > 0) return null;
  if (run.items.phoenix > 0) {
    run.items.phoenix -= 1;
    if (!run.items.phoenix) delete run.items.phoenix;
    run.hp = Math.round(run.maxHp * 0.5);
    return "Phoenix Feather";
  }
  if (run.revives > 0) {
    run.revives -= 1;
    run.hp = Math.round(run.maxHp * 0.3);
    return "Death Defiance";
  }
  return null;
}

/* ------------------------------------------------------------------- rooms */

export function startRoom(run) {
  const s = stats(run);
  run.shield = s.shieldRoom;
  run.forgive = s.forgiveRoom;
}

export function killReward(run, enemy) {
  const s = stats(run);
  run.stats.kills += 1;
  let gold = enemy.boss ? 40 + 20 * run.floor : 6 + 0.8 * run.depth;
  if (enemy.elite) gold *= 2;
  gold = Math.round(gold * (1 + s.goldMult));
  run.gold += gold;
  const healed = s.healKill ? heal(run, s.healKill) : 0;
  return { gold, healed };
}

export function roomCleared(run) {
  const s = stats(run);
  run.room += 1;
  run.stats.rooms += 1;
  return s.noRoomHeal ? 0 : heal(run, s.healRoom);
}

export function floorCleared(run) {
  run.stats.bosses += 1;
  run.hints += 1;
  const healed = stats(run).noRoomHeal ? 0 : heal(run, run.maxHp * 0.25);
  run.floor += 1;
  run.room = 0;
  run.usedDoors = {};
  if (run.floor >= FLOOR_COUNT) {
    run.over = true;
    run.won = true;
  }
  return healed;
}

const RARITY_WEIGHTS = (run) => ({ common: 70, rare: 25 + run.depth, epic: 5 + run.depth * 0.6 });

export function rollDoors(run, rng) {
  if (run.room >= ROOMS_PER_FLOOR) return [{ kind: "boss" }];
  const weights = {
    boon: 30, item: 26, gold: 18,
    elite: run.depth >= 2 ? 12 : 0,
    shop: run.room >= 1 && !run.usedDoors.shop ? 14 : 0,
    spring: run.room >= 1 && !run.usedDoors.spring ? 9 : 0,
  };
  const count = rng() < 0.4 ? 3 : 2;
  const doors = [];
  while (doors.length < count) {
    const kind = weighted(weights, rng);
    weights[kind] = 0; // no duplicate door types
    doors.push(describeDoor(run, kind, rng));
    if (!Object.values(weights).some((w) => w > 0)) break;
  }
  return doors;
}

function describeDoor(run, kind, rng) {
  if (kind === "boon") return { kind, kami: pick(Object.keys(KAMI), rng) };
  if (kind === "item") return { kind, rarity: weighted({ common: 60, uncommon: 30, legendary: 4, cursed: 6 }, rng) };
  if (kind === "gold") return { kind, gold: Math.round((35 + 12 * run.floor) * (1 + stats(run).goldMult)) };
  if (kind === "elite") return { kind, rarity: rng() < 0.25 ? "legendary" : "uncommon" };
  return { kind };
}

export function rollBoons(run, rng, kami) {
  const ids = Object.keys(BOONS).filter((id) => BOONS[id].kami === kami);
  return ids.map((id) => {
    const rarity = weighted(RARITY_WEIGHTS(run), rng);
    return { id, rarity, value: BOONS[id].values[rarity], owned: !!run.boons[id] };
  });
}

export function takeBoon(run, offer) {
  const b = run.boons[offer.id] || { value: 0, level: 0, rarity: offer.rarity };
  b.value += offer.value;
  b.level += 1;
  b.rarity = offer.rarity;
  run.boons[offer.id] = b;
  if (BOONS[offer.id].stat === "hintGain") run.hints += offer.value;
}

export function rollItem(run, rng, rarity = null) {
  rarity ||= weighted(ITEM_WEIGHTS, rng);
  let pool = Object.keys(ITEMS).filter((id) => ITEMS[id].rarity === rarity);
  // Don't offer more Eyes than can help.
  if (stats(run).removeOptions >= CAPS.removeOptions) pool = pool.filter((id) => id !== "eye");
  return pick(pool.length ? pool : Object.keys(ITEMS).filter((id) => ITEMS[id].rarity === "common"), rng);
}

export function takeItem(run, id) {
  run.items[id] = (run.items[id] || 0) + 1;
  const def = ITEMS[id];
  if (def.stat === "hintGain") run.hints += def.per;
  if (def.extra?.maxHpMult) {
    run.maxHp = Math.max(20, Math.round(run.maxHp * (1 + def.extra.maxHpMult)));
    run.hp = Math.min(run.hp, run.maxHp);
  }
}

export function shopStock(run, rng) {
  const s = stats(run);
  const price = (base) => Math.max(1, Math.round(base * (1 + 0.25 * run.floor) * (1 - s.priceCut)));
  return [
    { kind: "heal", label: "Bowl of ramen", desc: `Heal ${Math.round(run.maxHp * 0.35)} HP.`, cost: price(30) },
    { kind: "hint", label: "Study scroll", desc: "+1 hint.", cost: price(22) },
    { kind: "item", id: rollItem(run, rng, "common"), cost: price(45) },
    { kind: "item", id: rollItem(run, rng, "uncommon"), cost: price(95) },
    { kind: "boon", kami: pick(Object.keys(KAMI), rng), label: "Shrine offering", cost: price(85) },
  ];
}

export function embersFor(run) {
  return run.stats.correct + run.stats.rooms * 3 + run.stats.bosses * 20 + (run.won ? 50 : 0);
}
