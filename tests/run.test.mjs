import test from "node:test";
import assert from "node:assert/strict";
import {
  newRun, stats, makeEnemy, heroStrike, enemyStrike, endTurn, startRoom, roomCleared,
  floorCleared, rollDoors, rollBoons, takeBoon, takeItem, rollItem, tryRevive, killReward,
  embersFor, enemiesForRoom, ROOMS_PER_FLOOR, BASE_DAMAGE,
} from "../js/run.js";
import { BOONS, ITEMS } from "../js/content.js";

const seq = (...vals) => { let i = 0; return () => vals[i++ % vals.length]; };
const seeded = (seed = 1) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const noLuck = () => 0.99; // never crit, double, dodge

test("new run applies shrine upgrades", () => {
  const r = newRun({ vitality: 2, scholar: 1, fate: 3, defiance: 1, keen: 1 });
  assert.equal(r.maxHp, 120);
  assert.equal(r.hp, 120);
  assert.equal(r.hints, 4);
  assert.equal(r.rerolls, 3);
  assert.equal(r.revives, 1);
  assert.ok(Math.abs(stats(r).crit - 0.09) < 1e-9);
});

test("base hit, streak bonus and boons/items stack", () => {
  const r = newRun();
  const e = makeEnemy(r, noLuck);
  e.hp = e.max = 1000;
  assert.equal(heroStrike(r, e, noLuck).hits[0].dmg, BASE_DAMAGE);
  assert.equal(heroStrike(r, e, noLuck).hits[0].dmg, BASE_DAMAGE + 4); // streak 2
  r.streak = 0;
  takeItem(r, "whetstone");
  takeItem(r, "whetstone");
  takeBoon(r, { id: "radiant", rarity: "common", value: 0.15 });
  takeBoon(r, { id: "radiant", rarity: "rare", value: 0.25 }); // levels up
  assert.equal(r.boons.radiant.level, 2);
  assert.equal(heroStrike(r, e, noLuck).hits[0].dmg, Math.round((BASE_DAMAGE + 6) * 1.4));
});

test("crit, double strike and thunder", () => {
  const r = newRun();
  takeBoon(r, { id: "gale", rarity: "epic", value: 0.22 });
  takeBoon(r, { id: "thunderclap", rarity: "common", value: 15 });
  const e = makeEnemy(r, noLuck);
  e.hp = e.max = 1000;
  r.streak = 2; // this answer makes streak 3 -> thunder
  const res = heroStrike(r, e, seq(0.0, 0.1, 0.5)); // crit, double, no crit
  assert.equal(res.hits.length, 3);
  assert.ok(res.hits[0].crit);
  assert.equal(res.hits[2].kind, "thunder");
  assert.equal(res.hits[2].dmg, 15);
});

test("elite modifiers: warded blocks, armored reduces, vampiric heals", () => {
  const r = newRun();
  const e = makeEnemy(r, noLuck, { elite: true });
  e.elite = "warded"; e.ward = 2; e.hp = e.max = 500;
  heroStrike(r, e, noLuck);
  const res = heroStrike(r, e, noLuck);
  assert.ok(res.hits[0].blocked);
  assert.equal(e.hp, 500);
  e.ward = 0; e.elite = "armored"; r.streak = 0;
  heroStrike(r, e, noLuck);
  assert.equal(e.hp, 500 - Math.round(BASE_DAMAGE * 0.7));
  e.elite = "vampiric"; e.hp = 100;
  const hit = enemyStrike(r, e, noLuck);
  assert.equal(e.hp, 100 + Math.round(hit.dmg * 0.5));
});

test("defenses: forgive, dodge, shield, armor", () => {
  const r = newRun();
  takeItem(r, "omamori");
  takeBoon(r, { id: "ward", rarity: "common", value: 8 });
  takeItem(r, "talisman");
  startRoom(r);
  assert.equal(r.shield, 8);
  const e = makeEnemy(r, noLuck);
  e.dmg = 20;
  assert.ok(enemyStrike(r, e, noLuck).forgiven);
  assert.equal(r.hp, 100);
  const hit = enemyStrike(r, e, noLuck);
  assert.equal(hit.absorbed, 8);
  assert.equal(hit.dmg, 20 - 2 - 8);
  takeItem(r, "leaf");
  assert.ok(enemyStrike(r, e, seq(0.01)).dodged);
});

test("bosses wind up every 4th turn; correct answer interrupts, wrong doubles", () => {
  const r = newRun();
  const boss = makeEnemy(r, noLuck, { boss: true });
  boss.hp = boss.max = 1000;
  for (let i = 0; i < 3; i++) endTurn(boss);
  assert.ok(boss.charging);
  const res = heroStrike(r, boss, noLuck);
  assert.ok(res.interrupted);
  assert.equal(res.hits[0].dmg, Math.round(BASE_DAMAGE * 1.5));
  boss.charging = true;
  const hit = enemyStrike(r, boss, noLuck);
  assert.ok(hit.heavy);
  assert.equal(hit.dmg, boss.dmg * 2);
});

test("burn ticks after each answer", () => {
  const r = newRun();
  takeBoon(r, { id: "sunburn", rarity: "rare", value: 5 });
  const e = makeEnemy(r, noLuck);
  e.hp = e.max = 100;
  heroStrike(r, e, noLuck);
  assert.equal(endTurn(e).burn, 5);
  assert.equal(e.hp, 100 - BASE_DAMAGE - 5);
});

test("cursed items carry their drawback", () => {
  const r = newRun();
  takeItem(r, "glass");
  assert.equal(r.maxHp, 50);
  assert.ok(r.hp <= 50);
  takeItem(r, "onimask");
  assert.ok(Math.abs(stats(r).enemyDmg - 0.4) < 1e-9);
  takeItem(r, "hungry");
  r.hp = 10;
  assert.equal(roomCleared(r), 0);
});

test("revive order: phoenix first, then death defiance", () => {
  const r = newRun({ defiance: 1 });
  takeItem(r, "phoenix");
  r.hp = 0;
  assert.equal(tryRevive(r), "Phoenix Feather");
  assert.equal(r.hp, 50);
  r.hp = 0;
  assert.equal(tryRevive(r), "Death Defiance");
  r.hp = 0;
  assert.equal(tryRevive(r), null);
});

test("doors: no duplicates, boss after the last room, shop once per floor", () => {
  const rng = seeded(5);
  const r = newRun();
  for (let i = 0; i < 300; i++) {
    r.room = 1 + (i % (ROOMS_PER_FLOOR - 1));
    r.depth = i % 12;
    const doors = rollDoors(r, rng);
    assert.ok(doors.length >= 2 && doors.length <= 3);
    assert.equal(new Set(doors.map((d) => d.kind)).size, doors.length);
  }
  r.usedDoors.shop = true;
  for (let i = 0; i < 100; i++) assert.ok(!rollDoors(r, rng).some((d) => d.kind === "shop"));
  r.room = ROOMS_PER_FLOOR;
  assert.deepEqual(rollDoors(r, rng), [{ kind: "boss" }]);
});

test("boon offers come from one kami and Fox Wisdom grants hints", () => {
  const r = newRun();
  const offers = rollBoons(r, seeded(3), "inari");
  assert.equal(offers.length, 3);
  assert.ok(offers.every((o) => BOONS[o.id].kami === "inari"));
  const hints = r.hints;
  takeBoon(r, { id: "wisdom", rarity: "rare", value: 2 });
  assert.equal(r.hints, hints + 2);
  assert.equal(stats(r).hintRemoves, 1);
});

test("items roll from the requested rarity and eye caps at 2", () => {
  const r = newRun();
  const rng = seeded(9);
  for (let i = 0; i < 50; i++) assert.equal(ITEMS[rollItem(r, rng, "uncommon")].rarity, "uncommon");
  takeItem(r, "eye");
  takeItem(r, "eye");
  for (let i = 0; i < 50; i++) assert.notEqual(rollItem(r, rng, "legendary"), "eye");
});

test("scaling, rewards and embers", () => {
  const r = newRun();
  const early = makeEnemy(r, noLuck);
  r.depth = 10;
  const late = makeEnemy(r, noLuck);
  assert.ok(late.max > early.max * 2 && late.dmg > early.dmg);
  const e = enemiesForRoom(r, seeded(2), "elite")[0];
  assert.ok(e.elite);
  assert.ok(killReward(r, e).gold > 0);
  roomCleared(r);
  for (let f = 0; f < 4; f++) floorCleared(r);
  assert.ok(r.won && r.over);
  assert.equal(embersFor(r), r.stats.correct + 3 + 80 + 50);
});
