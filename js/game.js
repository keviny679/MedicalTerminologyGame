import { makeCanvas, Pen, drawOutlined, drawNumber } from "./pixel.js";
import {
  W, H, GROUND, HEROES, HERO_BOX, MONSTER_BOX, MONSTER_NAMES,
  drawHero, drawMonster, floorBackground, drawAmbient, stepParticles,
} from "./art.js";
import { Deck } from "./quiz.js";
import { BOONS, ITEMS, KAMI, ELITES, META, RARITY, DOOR_INFO, metaCost } from "./content.js";
import {
  newRun, stats, enemiesForRoom, makeEnemy, heroStrike, enemyStrike, endTurn, startRoom, killReward,
  roomCleared, floorCleared, rollDoors, rollBoons, takeBoon, rollItem, takeItem, shopStock,
  tryRevive, heal, embersFor, ROOMS_PER_FLOOR, FLOOR_COUNT,
} from "./run.js";
import { FLOORS } from "./art.js";
import { Music } from "./music.js";
import {
  CHAPTER_FILES, parseChapter, StudyDeck, chapterMastery, roomsFor, gradeTyped, letterHint, dueEntries,
  STYLES, STYLE_LABEL, isMastered, MASTERY_DAYS, gradeBrainDump, lessonNotes, lessonClue,
} from "./study.js";
import { countAnswer, goalMet, recordGoal, liveStreak, makeBackup, applyBackup, GOAL_MIN_ANSWERS, migrateProgress, PROGRESS_VERSION } from "./progress.js";
import * as DG from "./diagrams.js";
const { renderDiagram, DIAGRAMS } = DG;

const HERO_X = 56;
const MON_X = 178;
const rng = Math.random;

/* --------------------------------------------------------------- helpers */

const $ = (id) => document.getElementById(id);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const store = {
  get(k, d) {
    try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode etc. */ }
  },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const show = (id, on = true) => { $(id).hidden = !on; };

/* ------------------------------------------------------------------ sound */

const sfx = {
  ctx: null,
  on: store.get("rb.sound", true),
  beep(freqs, dur = 0.08, type = "square", vol = 0.06) {
    if (!this.on) return;
    try {
      this.ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      let t = this.ctx.currentTime;
      for (const f of freqs) {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.ctx.destination);
        o.start(t);
        o.stop(t + dur);
        t += dur * 0.9;
      }
    } catch { /* audio unavailable */ }
  },
  right() { this.beep([660, 880, 1320], 0.07); },
  wrong() { this.beep([220, 160], 0.12, "sawtooth", 0.05); },
  slash() { this.beep([1200, 600], 0.05, "triangle", 0.08); },
  crit() { this.beep([1500, 900, 1800], 0.05, "square", 0.07); },
  hurt() { this.beep([140, 90], 0.1, "square", 0.07); },
  block() { this.beep([400, 400], 0.05, "triangle", 0.06); },
  coin() { this.beep([988, 1319], 0.06, "square", 0.04); },
  win() { this.beep([523, 659, 784, 1046], 0.1); },
  boon() { this.beep([523, 784, 1046, 1568], 0.08, "triangle", 0.07); },
};
const music = new Music();

/* ------------------------------------------------------------------ state */

const META_KEY = "rb.meta";
const EML_KEY = "rb.eml";
const S = {
  terms: [],
  deck: null,
  run: null,
  look: null,
  meta: store.get(META_KEY, { embers: 0, levels: {} }),
  mode: "title", // title | select | battle
  enemy: null,
  roomEnemies: 0,
  roomIndex: 0,
  hero: { anim: null, dead: false },
  effects: [],
  numbers: [],
  particles: [],
  shake: 0,
  now: 0,
  q: null,
  pending: null, // resolver for the current question / continue / choice
  nextMode: "run",
  chapters: null, // study mode chapters, loaded on demand
  progress: store.get(EML_KEY, {}),
  studyDeck: null,
};
if (location.search.includes("debug")) window.__rb = S; // for automated play-tests

/* ---------------------------------------------------------------- render */

const screen = $("screen");
const g = screen.getContext("2d");
g.imageSmoothingEnabled = false;
const pen = new Pen(g);
const heroCanvas = makeCanvas(HERO_BOX.w, HERO_BOX.h);
const monCanvas = makeCanvas(MONSTER_BOX, MONSTER_BOX);
const previewCanvases = [...document.querySelectorAll("[data-preview]")];

const progress = (a) => (a ? Math.min(1, (S.now - a.t0) / a.dur) : 1);
function play(entity, kind, dur) {
  entity.anim = { kind, t0: S.now, dur };
  return sleep(dur);
}

function heroFrame() {
  const h = S.hero, a = h.anim, p = progress(a);
  const walkStep = [0, 1, 0, -1][Math.floor(S.now / 110) % 4];
  const breathe = Math.floor(S.now / 450) % 2;
  const blink = S.now % 3400 > 3250;
  let x = HERO_X, y = 0, pose = "rest", step = 0, tint = null, hidden = false;
  if (a && p < 1) {
    if (a.kind === "walkIn") { x = -20 + (HERO_X + 20) * p; step = walkStep; }
    else if (a.kind === "attack") {
      const reach = MON_X - 44;
      if (p < 0.35) { x = HERO_X + (reach - HERO_X) * (p / 0.35); pose = "raise"; step = walkStep; }
      else if (p < 0.6) { x = reach; pose = "slash"; }
      else { x = reach + (HERO_X - reach) * ((p - 0.6) / 0.4); step = walkStep; }
    } else if (a.kind === "hurt") {
      pose = "hurt";
      x = HERO_X - Math.round(Math.sin(p * Math.PI) * 6);
      tint = p < 0.3 ? "#ff3b4fb0" : null;
      hidden = p > 0.3 && Math.floor(S.now / 60) % 2 === 0;
    } else if (a.kind === "dodge") {
      x = HERO_X - Math.round(Math.sin(p * Math.PI) * 14);
      y = -Math.round(Math.sin(p * Math.PI) * 6);
      tint = "#c7c9ff66";
    } else if (a.kind === "victory") { pose = "up"; y = -Math.round(Math.sin(p * Math.PI) * 10); }
    else if (a.kind === "revive") { pose = "up"; tint = p < 0.6 ? "#ffd36bb0" : null; }
  } else if (a && (a.kind === "victory" || a.kind === "revive")) pose = "up";
  return { x, y, pose, step, breathe: pose === "rest" ? breathe : 0, blink, tint, hidden };
}

function drawHeroOnScreen() {
  if (!S.look) return;
  const fx = HERO_BOX.ox + 12, fy = HERO_BOX.oy + 31;
  if (S.hero.dead) {
    drawHero(heroCanvas, S.look, { pose: "hurt" });
    g.save();
    g.translate(HERO_X, GROUND - 1);
    g.rotate(-Math.PI / 2);
    drawOutlined(g, heroCanvas, -fy + 2, -fx, "#0a0814", "#00000055");
    g.restore();
    return;
  }
  const f = heroFrame();
  if (f.hidden) return;
  drawHero(heroCanvas, S.look, f);
  pen.ellipse("#00000066", f.x, GROUND, 10, 2);
  if (S.run && S.run.shield > 0) pen.ellipse("#7fd9ff33", f.x, GROUND - 16, 13, 18);
  drawOutlined(g, heroCanvas, f.x - fx, GROUND - fy + f.y, "#0a0814", f.tint);
}

function drawMonsterOnScreen() {
  const m = S.enemy;
  if (!m) return;
  const a = m.anim, p = progress(a);
  let x = MON_X, tint = null, alpha = 1;
  if (a && p < 1) {
    if (a.kind === "enter") x = W + 40 - (W + 40 - MON_X) * (1 - (1 - p) ** 3);
    else if (a.kind === "attack") {
      const reach = HERO_X + 40;
      x = p < 0.5 ? MON_X - (MON_X - reach) * Math.sin((p / 0.5) * (Math.PI / 2)) : reach + (MON_X - reach) * ((p - 0.5) / 0.5);
    } else if (a.kind === "hurt") {
      x = MON_X + Math.round(Math.sin(p * 40) * 3 * (1 - p));
      tint = p < 0.4 ? "#ffffffd0" : null;
    } else if (a.kind === "die") { tint = "#ffffffd0"; alpha = 1 - p; }
  } else if (a && a.kind === "die") return;
  if (!tint && m.charging) tint = Math.floor(S.now / 120) % 2 ? "#ff3b4f70" : null;
  if (!tint && m.burn) tint = Math.floor(S.now / 200) % 3 === 0 ? "#ff8a3d55" : null;
  drawMonster(monCanvas, m.type, (S.now - m.spawn) / 1000);
  const half = MONSTER_BOX / 2;
  pen.ellipse("#00000066", x, GROUND, m.boss ? 18 : 11, 2);
  if (m.elite) pen.ellipse(ELITES[m.elite].color + "40", x, GROUND - 18, 20, 24);
  g.save();
  g.globalAlpha = alpha;
  const outline = m.elite ? ELITES[m.elite].color : m.charging ? "#ff3b4f" : "#0a0814";
  drawOutlined(g, monCanvas, x - half, GROUND - MONSTER_BOX + 2, outline, tint);
  g.restore();
  if (m.burn && Math.random() < 0.3) {
    S.effects.push({ kind: "ember", x: x - 8 + Math.random() * 16, y: GROUND - 10 - Math.random() * 20, t0: S.now, dur: 500 });
  }
}

function drawEffects() {
  S.effects = S.effects.filter((e) => S.now - e.t0 < e.dur);
  for (const e of S.effects) {
    const p = (S.now - e.t0) / e.dur;
    if (e.kind === "slash") {
      const color = e.crit ? "#ffd36b" : "#e8fbff";
      for (let i = 0; i < 26; i++) {
        const a = -2.2 + (i / 26) * 2.6 * Math.min(1, p * 2.5);
        pen.rect(i % 3 ? color : "#7fd9ff", e.x + Math.cos(a) * 24, e.y + Math.sin(a) * 24, e.crit ? 3 : 2, e.crit ? 3 : 2);
      }
    } else if (e.kind === "spark") {
      for (const s of e.bits) pen.rect(s.c, e.x + s.vx * p * 30, e.y + s.vy * p * 30 + p * p * 20, 1 + (p < 0.5), 1 + (p < 0.5));
    } else if (e.kind === "claw") {
      for (let k = 0; k < 3; k++) pen.line(p < 0.5 ? "#ffffff" : "#ff5c6c", e.x - 8 + k * 6, e.y - 10, e.x - 2 + k * 6, e.y + 10);
    } else if (e.kind === "bolt") {
      let x = e.x, y = 0;
      while (y < e.y) {
        const nx = x + Math.round((Math.random() - 0.5) * 10), ny = y + 8;
        pen.line(p < 0.5 ? "#ffffff" : "#c77dff", x, y, nx, ny, 2);
        x = nx; y = ny;
      }
    } else if (e.kind === "ember") {
      pen.px(p < 0.5 ? "#ffd36b" : "#ff5c3d", e.x, e.y - p * 12);
    } else if (e.kind === "ring") {
      pen.ellipse(e.color, e.x, e.y, Math.round(6 + p * 20), Math.round(6 + p * 20));
      pen.ellipse("#00000000", e.x, e.y, 1, 1);
    }
  }
  S.numbers = S.numbers.filter((n) => S.now - n.t0 < 900);
  for (const n of S.numbers) {
    const p = (S.now - n.t0) / 900;
    drawNumber(pen, n.text, n.x, n.y - p * 16, n.color, n.big ? 3 : 2);
  }
}

function sparks(x, y, colors, n = 16) {
  const bits = Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2;
    return { vx: Math.cos(a), vy: Math.sin(a) - 0.4, c: colors[Math.floor(Math.random() * colors.length)] };
  });
  S.effects.push({ kind: "spark", x, y, bits, t0: S.now, dur: 600 });
}
const floatNum = (text, x, y, color, big = false) => S.numbers.push({ text, x, y, color, big, t0: S.now });

let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  S.now = ts;
  const floor = S.run ? Math.min(S.run.floor, FLOOR_COUNT - 1) : 0;
  g.fillStyle = "#05060f";
  g.fillRect(0, 0, W, H);
  g.save();
  if (S.shake > 0) {
    S.shake -= dt;
    g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
  }
  g.drawImage(floorBackground(floor), 0, 0);
  stepParticles(S.particles, floor, dt, ts / 1000);
  drawAmbient(pen, floor, ts / 1000, S.particles);
  if (S.mode === "battle") {
    drawMonsterOnScreen();
    drawHeroOnScreen();
    drawEffects();
  }
  g.restore();
  if (S.mode === "select") {
    for (const c of previewCanvases) {
      drawHero(c, HEROES[c.dataset.preview], { pose: "rest", breathe: Math.floor(ts / 450) % 2, blink: ts % 3400 > 3250 });
    }
  }
  requestAnimationFrame(frame);
}

/* -------------------------------------------------------------------- HUD */

function enemyName(m) {
  const base = MONSTER_NAMES[m.type].name;
  return m.elite ? `${ELITES[m.elite].name} ${base}` : base;
}

function updateHud() {
  const R = S.run;
  if (!R) return;
  $("heroName").textContent = S.look.name;
  $("heroHp").style.width = `${(R.hp / R.maxHp) * 100}%`;
  $("heroHpText").textContent = `${R.hp}/${R.maxHp}`;
  $("shieldText").textContent = R.shield > 0 ? `+${R.shield} shield` : "";
  const m = S.enemy;
  $("monHud").style.visibility = m ? "visible" : "hidden";
  if (m) {
    $("monName").textContent = enemyName(m) + (S.roomEnemies > 1 ? ` (${S.roomIndex + 1}/${S.roomEnemies})` : "");
    $("monHp").style.width = `${(m.hp / m.max) * 100}%`;
    const bits = [`${m.hp}/${m.max}`, `hits ${m.dmg}`];
    if (m.ward) bits.push(`ward ×${m.ward}`);
    if (m.burn) bits.push(`burning ${m.burn}`);
    $("monInfo").innerHTML = esc(bits.join(" · ")) + (m.charging ? ' <span class="warn">⚠ WINDING UP</span>' : "");
  }
  if (R.study) {
    const total = R.study.rooms;
    const d = S.studyDeck;
    $("floorTag").textContent = R.study.chapter.num
      ? `Ch${R.study.chapter.num} ${R.room + 1 >= total ? "BOSS" : `${R.room + 1}/${total}`}`
      : `Review ${Math.min(d.used.size, d.entries.length)}/${d.entries.length}`;
  } else {
    const roomLabel = R.room >= ROOMS_PER_FLOOR ? "BOSS" : `${Math.min(R.room + 1, ROOMS_PER_FLOOR)}/${ROOMS_PER_FLOOR}`;
    $("floorTag").textContent = `F${Math.min(R.floor + 1, FLOOR_COUNT)} ${roomLabel}`;
  }
  $("gold").textContent = R.gold;
  $("goldStat").hidden = $("rerollStat").hidden = !!R.study;
  $("hintCount").textContent = R.hints;
  $("streak").textContent = R.streak;
  $("rerolls").textContent = R.rerolls;
  renderInventory();
}

function renderInventory() {
  const R = S.run;
  const box = $("inventory");
  box.innerHTML = "";
  const chip = (label, color, info) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip";
    b.style.setProperty("--c", color);
    b.innerHTML = label;
    b.onclick = () => { $("invInfo").textContent = info; };
    box.appendChild(b);
  };
  for (const [id, b] of Object.entries(R.boons)) {
    const def = BOONS[id], k = KAMI[def.kami];
    chip(`<b>✦</b> ${esc(def.name)}${b.level > 1 ? ` ${b.level}` : ""}`, k.color,
      `${def.name} (${k.name}, ${RARITY[b.rarity].name}): ${def.desc(+b.value.toFixed(2))}`);
  }
  for (const [id, n] of Object.entries(R.items)) {
    const def = ITEMS[id];
    chip(`<b>◆</b> ${esc(def.name)}${n > 1 ? ` ×${n}` : ""}`, RARITY[def.rarity].color,
      `${def.name} (${RARITY[def.rarity].name}${n > 1 ? `, ×${n}` : ""}): ${def.desc}`);
  }
}

function banner(title, sub = "", ms = 1500) {
  $("bannerTitle").textContent = title;
  $("bannerSub").textContent = sub;
  show("bannerScreen");
  return sleep(ms).then(() => show("bannerScreen", false));
}

/* ---------------------------------------------------------- choice panel */

// Show cards + buttons in the panel and resolve with the picked value.
function choose({ title, sub = "", cards = [], buttons = [], keep = false }) {
  show("quizView", false);
  show("choiceView");
  $("choiceTitle").textContent = title;
  $("choiceSub").innerHTML = sub;
  const box = $("cards");
  box.innerHTML = "";
  const btns = $("choiceButtons");
  btns.innerHTML = "";
  music.duck(true);
  return new Promise((resolve) => {
    const done = (v) => {
      if (!keep) music.duck(false);
      resolve(v);
    };
    for (const c of cards) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "card";
      if (c.color) b.style.setProperty("--c", c.color);
      b.innerHTML = c.html;
      b.disabled = !!c.disabled;
      b.onclick = () => done(c.value);
      box.appendChild(b);
    }
    for (const bt of buttons) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = `btn small${bt.ghost ? " ghost" : ""}`;
      b.textContent = bt.label;
      b.disabled = !!bt.disabled;
      b.onclick = () => done(bt.value);
      btns.appendChild(b);
    }
    (box.querySelector("button:not(:disabled)") || btns.querySelector("button"))?.focus();
  });
}

const cardHtml = ({ icon = "", name, tag = "", body = "", cost = null }) =>
  `${icon ? `<span class="icon">${icon}</span>` : ""}<span class="name">${esc(name)}</span>` +
  `${tag ? `<span class="tag">${tag}</span>` : ""}${body ? `<span>${body}</span>` : ""}` +
  `${cost !== null ? `<span class="cost">${cost} mon</span>` : ""}`;

function doorCard(d) {
  const info = DOOR_INFO[d.kind];
  let detail = "", color = "#ffd36b";
  if (d.kind === "boon") { detail = `${KAMI[d.kami].name}, ${KAMI[d.kami].title}`; color = KAMI[d.kami].color; }
  else if (d.kind === "item") { detail = `${RARITY[d.rarity].name} relic`; color = RARITY[d.rarity].color; }
  else if (d.kind === "gold") detail = `${d.gold} mon`;
  else if (d.kind === "elite") { detail = `Tougher foe · ${RARITY[d.rarity].name} relic`; color = "#ff5c6c"; }
  else if (d.kind === "shop") detail = "Spend mon (no fight)";
  else if (d.kind === "spring") detail = "Heal 40% HP (no fight)";
  else if (d.kind === "boss") { detail = `${MONSTER_NAMES[FLOORS[S.run.floor].boss].name} awaits`; color = "#ff5c6c"; }
  return { html: cardHtml({ icon: info.icon, name: info.label, body: esc(detail) }), color, value: d };
}

/* ----------------------------------------------------------------- rewards */

async function boonReward(kami, title = null) {
  const R = S.run;
  let offers = rollBoons(R, rng, kami);
  for (;;) {
    const k = KAMI[kami];
    const pickd = await choose({
      title: title || `${k.name} offers a blessing`,
      sub: `<span style="color:${k.color}">${esc(k.title)}</span>. Choose one.`,
      cards: offers.map((o) => {
        const def = BOONS[o.id];
        const lvl = R.boons[o.id] ? `Level up → ${R.boons[o.id].level + 1}` : "New";
        return {
          color: RARITY[o.rarity].color,
          html: cardHtml({ icon: "✦", name: def.name, tag: `${RARITY[o.rarity].name} · ${lvl}`, body: esc(def.desc(o.value)) }),
          value: o,
        };
      }),
      buttons: R.rerolls > 0 ? [{ label: `Reroll (${R.rerolls})`, value: "reroll", ghost: true }] : [],
    });
    if (pickd === "reroll") {
      R.rerolls -= 1;
      offers = rollBoons(R, rng, kami);
      updateHud();
      continue;
    }
    takeBoon(R, pickd);
    sfx.boon();
    S.effects.push({ kind: "ring", x: HERO_X, y: GROUND - 16, color: k.color + "66", t0: S.now, dur: 600 });
    updateHud();
    return;
  }
}

async function itemReward(rarity, title = "You found a relic") {
  const R = S.run;
  const id = rollItem(R, rng, rarity);
  const def = ITEMS[id];
  const have = R.items[id] ? ` (you have ${R.items[id]})` : "";
  const cursed = def.rarity === "cursed";
  const pickd = await choose({
    title,
    sub: cursed ? "A cursed relic. Power at a price; you may leave it." : "Relics stack. More copies, stronger effect.",
    cards: [{
      color: RARITY[def.rarity].color,
      html: cardHtml({ icon: "◆", name: def.name, tag: RARITY[def.rarity].name + have, body: esc(def.desc) }),
      value: "take",
    }],
    buttons: [{ label: "Take", value: "take" }, ...(cursed ? [{ label: "Leave it", value: "leave", ghost: true }] : [])],
  });
  if (pickd === "take") {
    takeItem(R, id);
    sfx.coin();
  }
  updateHud();
}

async function shopRoom() {
  const R = S.run;
  R.usedDoors.shop = true;
  const stock = shopStock(R, rng);
  const sold = new Set();
  for (;;) {
    updateHud();
    const cards = stock.map((s, i) => {
      let name, body, color = "#ffd36b", icon = "⚖";
      if (s.kind === "item") { const d = ITEMS[s.id]; name = d.name; body = d.desc; color = RARITY[d.rarity].color; icon = "◆"; }
      else if (s.kind === "boon") { name = s.label; body = `A blessing from ${KAMI[s.kami].name}.`; color = KAMI[s.kami].color; icon = "✦"; }
      else { name = s.label; body = s.desc; icon = s.kind === "heal" ? "♨" : "✎"; }
      const soldOut = sold.has(i);
      return {
        color, value: i, disabled: soldOut || R.gold < s.cost,
        html: cardHtml({ icon, name, body: esc(soldOut ? "Sold" : body), cost: soldOut ? null : s.cost }),
      };
    });
    const pickd = await choose({
      title: "A wandering merchant",
      sub: `“Knowledge is costly, traveler.” You have <b>${R.gold}</b> mon.`,
      cards,
      buttons: [{ label: "Leave", value: "leave" }],
      keep: true,
    });
    if (pickd === "leave") { music.duck(false); return; }
    const s = stock[pickd];
    if (R.gold < s.cost || sold.has(pickd)) continue;
    R.gold -= s.cost;
    sold.add(pickd);
    sfx.coin();
    if (s.kind === "heal") heal(R, R.maxHp * 0.35);
    else if (s.kind === "hint") R.hints += 1;
    else if (s.kind === "item") takeItem(R, s.id);
    else if (s.kind === "boon") await boonReward(s.kami);
  }
}

/* ------------------------------------------------------------------ battle */

function askQuestion(enemy, preset = null) {
  const R = S.run;
  const st = stats(R);
  S.q = preset || S.deck.next();
  S.unsure = false;
  const ub = $("unsureBtn");
  ub.hidden = !S.run?.study;
  ub.classList.remove("on");
  ub.setAttribute("aria-pressed", "false");
  S.q.removed = new Set();
  S.q.hintUsed = false;
  const q = S.q;
  // Eye of Ryujin crosses out wrong answers up front.
  if (q.options) {
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer).sort(() => rng() - 0.5);
    for (let i = 0; i < st.removeOptions; i++) q.removed.add(wrong[i]);
  }

  show("choiceView", false);
  show("quizView");
  $("prompt").innerHTML = q.prompt ||
    `What does <span class="affix">${esc(q.affix)}</span> mean? <span class="kind">(${q.kind})</span>`;
  $("quizImage").innerHTML = q.image ? renderDiagram(q.image.diagram, q.image.region, { labels: q.image.labelled ? "one" : "none" }) : "";
  const box = $("choices");
  box.innerHTML = "";
  const typed = q.mode === "typed";
  show("choices", !typed);
  show("typedForm", typed);
  show("mcIdkBtn", !typed && !!R.study);
  if (typed) {
    const input = $("typedInput");
    input.value = "";
    input.disabled = false;
    input.className = "";
    $("typedForm").querySelectorAll("button").forEach((b) => (b.disabled = false));
    setTimeout(() => input.focus(), 30);
  }
  (q.options || []).forEach((opt, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice" + (q.removed.has(i) ? " struck" : "");
    b.disabled = q.removed.has(i);
    b.innerHTML = `<span class="key">${i + 1}</span><span>${esc(opt)}</span>`;
    b.onclick = () => resolvePending(i);
    box.appendChild(b);
  });
  $("hintText").textContent = enemy.charging ? "⚠ The boss is winding up! Answer right to stagger it, wrong and it hits twice as hard." : "";
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  show("continueBtn", false);
  const answered = new Promise((resolve) => { S.pending = { type: "answer", resolve }; });
  refreshHintButton();
  updateHud();
  return answered;
}

function resolvePending(value, type = "answer") {
  const p = S.pending;
  if (!p || p.type !== type) return;
  if (type === "answer" && S.q && S.q.mode !== "typed" && S.q.removed.has(value)) return;
  S.pending = null;
  p.resolve(value);
}

function refreshHintButton() {
  const b = $("hintBtn");
  const q = S.q, R = S.run;
  const answering = S.pending && S.pending.type === "answer";
  if (!q) return;
  if (q.hintUsed) { b.disabled = true; b.textContent = "Hint used"; }
  else if (R.study) {
    b.disabled = R.hints <= 0 || !answering;
    const what = q.mode === "typed" ? "Letter hint" : "50/50 hint";
    b.textContent = R.hints > 0 ? `${what} (${R.hints})` : "No hints left";
  } else if (!q.examples.length && !stats(R).hintRemoves) {
    b.disabled = true;
    b.textContent = "No hint";
    if (!$("hintText").textContent) $("hintText").textContent = "Wikipedia lists no example word for this one.";
  } else {
    b.disabled = R.hints <= 0 || !answering;
    b.textContent = R.hints > 0 ? `Hint (${R.hints})` : "No hints left";
  }
}

function useHint() {
  const q = S.q, R = S.run;
  if (!q || q.hintUsed || !S.pending || S.pending.type !== "answer" || R.hints <= 0) return;
  if (q.mode === "typed") {
    R.hints -= 1;
    q.hintUsed = true;
    $("hintText").innerHTML = [esc(letterHint(q.answerText)), q.hint && esc(q.hint), clueHtml(q)].filter(Boolean).join(" · ");
    sfx.beep([880], 0.06, "triangle");
    refreshHintButton();
    updateHud();
    $("typedInput").focus();
    return;
  }
  const removes = R.study ? 2 : stats(R).hintRemoves;
  if (!R.study && !q.examples.length && !removes) return;
  R.hints -= 1;
  q.hintUsed = true;
  const parts = [];
  if (q.examples?.length) parts.push(`Example word: ${q.examples[0]}`);
  if (R.study && q.hint) parts.push(q.hint);
  let crossed = 0;
  for (let n = 0; n < removes; n++) {
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer && !q.removed.has(i));
    if (wrong.length <= 1) break;
    const i = wrong[Math.floor(rng() * wrong.length)];
    q.removed.add(i);
    const btn = $("choices").children[i];
    btn.classList.add("struck");
    btn.disabled = true;
    crossed++;
  }
  if (crossed) parts.push(R.study ? `${crossed} wrong answers crossed out.` : "Inari crossed out a wrong answer.");
  $("hintText").innerHTML = [...parts.map(esc), R.study && clueHtml(q)].filter(Boolean).join(" · ");
  sfx.beep([880], 0.06, "triangle");
  refreshHintButton();
  updateHud();
}

// Study hint: a sentence from the lesson about this term, with the term blanked.
function clueHtml(q) {
  const clue = q.entry && lessonClue(q.entry, q, rng);
  return clue ? `<span class="clue">📖 From the lesson: “${esc(clue)}”</span>` : "";
}

// After a miss, a guess or a hint: what the lesson says about the term.
function notesHtml(entry) {
  const n = lessonNotes(entry);
  return n ? `<span class="lesson-note"><span class="kind">📖 From the lesson “${esc(n.title)}”:</span> ${n.html}</span>` : "";
}

async function animateHeroHits(enemy, res) {
  const run = play(S.hero, "attack", 800);
  await sleep(330);
  const y = GROUND - (enemy.boss ? 34 : 22);
  let off = 0;
  for (const h of res.hits) {
    if (h.kind === "thunder") {
      await sleep(120);
      S.effects.push({ kind: "bolt", x: MON_X, y, t0: S.now, dur: 300 });
      sfx.beep([200, 1600, 300], 0.05, "sawtooth", 0.07);
    } else {
      if (off) await sleep(160);
      S.effects.push({ kind: "slash", x: MON_X, y, crit: h.crit, t0: S.now, dur: 260 });
      h.crit ? sfx.crit() : sfx.slash();
    }
    if (h.blocked) { sfx.block(); floatNum("0", MON_X, y - 26 - off, "#7fd9ff"); }
    else {
      sparks(MON_X, y, h.crit ? ["#ffd36b", "#ffffff", "#ff8a3d"] : ["#ffffff", "#ffd36b", "#7fd9ff"]);
      floatNum(`-${h.dmg}`, MON_X + off, y - 26 - off, h.kind === "thunder" ? "#c77dff" : h.crit ? "#ff8a3d" : "#ffd36b", h.crit);
    }
    play(enemy, "hurt", 400);
    S.shake = h.crit ? 0.2 : 0.12;
    off += 8;
    updateHud();
  }
  if (res.healed) floatNum(`+${res.healed}`, HERO_X, GROUND - 46, "#59d98e");
  await run;
}

async function animateEnemyHit(enemy, res) {
  if (res.zap) {
    S.effects.push({ kind: "bolt", x: MON_X, y: GROUND - 22, t0: S.now, dur: 250 });
    floatNum(`-${res.zap.dmg}`, MON_X, GROUND - 50, "#c77dff");
    updateHud();
  }
  const run = play(enemy, "attack", 700);
  await sleep(330);
  if (res.forgiven) {
    sfx.block();
    S.effects.push({ kind: "ring", x: HERO_X, y: GROUND - 16, color: "#ffd36b66", t0: S.now, dur: 500 });
  } else if (res.dodged) {
    sfx.beep([700, 1000], 0.05, "triangle");
    play(S.hero, "dodge", 450);
  } else {
    sfx.hurt();
    S.effects.push({ kind: "claw", x: HERO_X, y: GROUND - 18, t0: S.now, dur: 300 });
    sparks(HERO_X, GROUND - 18, ["#ff5c6c", "#ffffff"]);
    if (res.absorbed) floatNum(`-${res.absorbed}`, HERO_X - 10, GROUND - 56, "#7fd9ff");
    if (res.dmg) floatNum(`-${res.dmg}`, HERO_X, GROUND - 46, "#ff5c6c", res.heavy);
    if (res.leech) floatNum(`+${res.leech}`, MON_X, GROUND - 50, "#59d98e");
    play(S.hero, "hurt", 600);
    S.shake = res.heavy ? 0.4 : 0.25;
  }
  updateHud();
  await run;
}

// Returns true if the enemy dies, false if the hero dies for good.
async function fight(enemy) {
  const R = S.run;
  enemy.spawn = S.now;
  enemy.anim = null;
  S.enemy = enemy;
  updateHud();
  if (enemy.boss) sfx.beep([196, 185, 175, 165], 0.15, "sawtooth", 0.05);
  await play(enemy, "enter", 700);
  while (enemy.hp > 0) {
    const choice = await askQuestion(enemy);
    const q = S.q;
    const typed = q.mode === "typed";
    const grade = typed ? (choice === null ? "wrong" : gradeTyped(choice, q.accept, S.studyDeck.vocab)) : null;
    const correct = typed ? grade !== "wrong" : choice === q.answer;
    const buttons = [...$("choices").children];
    buttons.forEach((b) => (b.disabled = true));
    $("hintBtn").disabled = true;
    show("mcIdkBtn", false);
    if (typed) {
      $("typedInput").disabled = true;
      $("typedForm").querySelectorAll("button").forEach((b) => (b.disabled = true));
      $("typedInput").classList.add(correct ? "right" : "wrong");
    } else {
      buttons[q.answer].classList.add("right");
    }
    const fb = $("feedback");
    const notes = [];

    const guess = S.unsure || q.hintUsed || choice === null; // not answered from memory alone
    if (R.study) {
      S.studyDeck.record(q.entry, correct, typed, Date.now(), { guess });
      store.set(EML_KEY, S.progress);
      store.set(TODAY_KEY, countAnswer(store.get(TODAY_KEY, null)));
      if (typed && correct) R.stats.recalled = (R.stats.recalled || 0) + 1;
      if (q.image) $("quizImage").innerHTML = renderDiagram(q.image.diagram, q.image.region, { labels: "all" });
    }
    if (correct) {
      sfx.right();
      const res = heroStrike(R, enemy, rng, typed ? 1.5 : 1);
      fb.className = "feedback good";
      notes.push(R.streak > 1 ? `Correct! ${R.streak} in a row.` : "Correct!");
      if (typed) notes.push("Recall strike: +50% damage!");
      if (R.study && guess) notes.push(S.unsure ? "Marked as a guess, so it'll come back soon." : "You used a hint, so it'll come back soon.");
      if (grade === "typo") notes.push(`(Check your spelling: “${q.answerText}”.)`);
      if (res.interrupted) notes.push("You staggered it!");
      if (res.hits.some((h) => h.crit)) notes.push("Critical!");
      if (res.hits.filter((h) => h.kind === "slash").length > 1) notes.push("Double strike!");
      if (res.hits.some((h) => h.blocked)) notes.push("Its ward absorbed the blow.");
      fb.textContent = notes.join(" ");
      if (typed && q.entry) fb.innerHTML += `<br><span class="explain"><b>${esc(q.entry.name)}</b>: ${esc(q.entry.def)}</span>`;
      if (R.study && guess) fb.innerHTML += notesHtml(q.entry);
      await animateHeroHits(enemy, res);
    } else {
      sfx.wrong();
      if (!typed && choice !== null) buttons[choice].classList.add("wrong");
      const missedName = q.entry ? q.entry.name : q.affix;
      if (!R.missed.some((m) => m.affix === missedName)) {
        R.missed.push({ affix: missedName, meaning: q.entry ? q.entry.def : q.options[q.answer] });
      }
      const res = enemyStrike(R, enemy, rng);
      fb.className = R.study && !guess ? "feedback bad surprise" : "feedback bad";
      let what = res.forgiven ? " Your charm shielded you." : res.dodged ? " You dodged!" : res.heavy ? " A crushing blow!" : "";
      const note = q.entry && `<b>${esc(q.entry.name)}</b>: ${esc(q.entry.def)}${q.entry.parts ? ` (${esc(q.entry.parts)})` : ""}.`;
      const def = `${esc(q.entry?.def || "")}${q.entry?.parts ? ` (${esc(q.entry.parts)})` : ""}`;
      if (R.study && !guess) what += " You felt sure, so take a close look; it's coming back in a moment.";
      fb.innerHTML = typed
        ? `${choice === null ? "Here it is:" : `Not quite (you typed “${esc(choice)}”).`} <b>${esc(q.answerText)}</b>: ${def}.${esc(what)}`
        : q.entry
        ? (q.options[q.answer] === q.entry.def ? `${choice === null ? "Here it is:" : "Not quite."} ${note}` : `${choice === null ? "Here it is:" : "Not quite."} The answer is “${esc(q.options[q.answer])}”.<br>${note}`) + esc(what)
        : `Not quite. <b>${esc(q.affix)}</b> means “${esc(q.options[q.answer])}”.${esc(what)}`;
      if (R.study) fb.innerHTML += notesHtml(q.entry);
      await animateEnemyHit(enemy, res);
    }

    if (enemy.hp > 0) {
      const t = endTurn(enemy);
      if (t.burn) { floatNum(`-${t.burn}`, MON_X, GROUND - 44, "#ff8a3d"); updateHud(); }
    }

    if (R.hp <= 0) {
      const saved = tryRevive(R);
      if (!saved) {
        S.hero.dead = true;
        sfx.hurt();
        updateHud();
        await sleep(1100);
        return false;
      }
      sfx.boon();
      await play(S.hero, "revive", 700);
      fb.textContent += ` ${saved} revived you!`;
      updateHud();
    }

    if (!correct && enemy.hp > 0) {
      show("continueBtn");
      $("continueBtn").focus();
      await new Promise((resolve) => { S.pending = { type: "continue", resolve }; });
      show("continueBtn", false);
    } else {
      await sleep(350);
    }
    // review: once every due term has been asked, the fight is over
    if (R.study && S.studyDeck.finished && enemy.hp > 0) {
      enemy.hp = 0;
      updateHud();
    }
  }
  // enemy defeated
  sparks(MON_X, GROUND - 20, ["#ffffff", "#ffd36b", "#a970ff", "#7fd9ff"], 24);
  const reward = killReward(R, enemy);
  floatNum(`+${reward.gold}`, MON_X, GROUND - 40, "#ffd36b");
  sfx.coin();
  if (reward.healed) floatNum(`+${reward.healed}`, HERO_X, GROUND - 46, "#59d98e");
  await play(enemy, "die", 700);
  S.enemy = null;
  updateHud();
  return true;
}

/* -------------------------------------------------------------------- flow */

async function playRoom(door) {
  const R = S.run;
  if (door.kind === "shop") { await shopRoom(); roomCleared(R); return true; }
  if (door.kind === "spring") {
    R.usedDoors.spring = true;
    const healed = heal(R, R.maxHp * 0.4);
    sfx.boon();
    floatNum(`+${healed}`, HERO_X, GROUND - 46, "#59d98e", true);
    roomCleared(R);
    updateHud();
    await choose({ title: "A hidden hot spring", sub: `Steam curls into the night air. You recover <b>${healed}</b> HP.`, buttons: [{ label: "Continue", value: 1 }] });
    return true;
  }
  const kind = door.kind === "boss" ? "boss" : door.kind === "elite" ? "elite" : "normal";
  const foes = enemiesForRoom(R, rng, kind);
  R.depth += 1;
  startRoom(R);
  S.roomEnemies = foes.length;
  for (let i = 0; i < foes.length; i++) {
    S.roomIndex = i;
    if (!(await fight(foes[i]))) return false;
  }
  if (door.kind !== "boss") {
    const healed = roomCleared(R);
    if (healed) floatNum(`+${healed}`, HERO_X, GROUND - 46, "#59d98e");
  }
  updateHud();
  if (door.kind === "boon") await boonReward(door.kami);
  else if (door.kind === "item") await itemReward(door.rarity);
  else if (door.kind === "elite") await itemReward(door.rarity, "The elite dropped a relic");
  else if (door.kind === "gold") {
    const gold = Math.round(door.gold);
    R.gold += gold;
    sfx.coin();
    floatNum(`+${gold}`, HERO_X, GROUND - 50, "#ffd36b", true);
    updateHud();
  }
  return true;
}

async function chooseDoor() {
  const R = S.run;
  let doors = rollDoors(R, rng);
  for (;;) {
    const pickd = await choose({
      title: doors[0].kind === "boss" ? "The guardian's gate" : "Choose your path",
      sub: doors[0].kind === "boss" ? "The air grows heavy. Rest is over." : "Each door shows its reward for clearing the room beyond.",
      cards: doors.map(doorCard),
      buttons: R.rerolls > 0 && doors[0].kind !== "boss" ? [{ label: `Reroll doors (${R.rerolls})`, value: "reroll", ghost: true }] : [],
    });
    if (pickd === "reroll") { R.rerolls -= 1; doors = rollDoors(R, rng); updateHud(); continue; }
    return pickd;
  }
}

async function floorIntro() {
  const R = S.run;
  S.particles = [];
  S.hero.anim = null;
  S.hero.dead = false;
  show("quizView", false);
  show("choiceView", false);
  updateHud();
  play(S.hero, "walkIn", 1400);
  await banner(`Floor ${R.floor + 1}`, FLOORS[R.floor].name);
}

async function startRun(lookKey) {
  music.start();
  S.look = HEROES[lookKey];
  S.run = newRun(S.meta.levels, lookKey);
  S.deck = new Deck(S.terms);
  S.enemy = null;
  S.effects = [];
  S.numbers = [];
  S.mode = "battle";
  show("selectScreen", false);
  show("titleScreen", false);
  show("hud");
  show("panel");
  show("statsRow");
  $("invInfo").textContent = "";
  await floorIntro();
  await boonReward(Object.keys(KAMI)[Math.floor(rng() * 5)], "A kami answers your call");
  let door = { kind: "fight" };
  for (;;) {
    const alive = await playRoom(door);
    if (!alive) return endRun();
    if (door.kind === "boss") {
      sfx.win();
      await play(S.hero, "victory", 700);
      const healed = floorCleared(S.run);
      updateHud();
      if (S.run.over) return endRun();
      await choose({
        title: `Floor ${S.run.floor} cleared!`,
        sub: `+${healed} HP · +1 hint. The path climbs on…`,
        buttons: [{ label: "Onward", value: 1 }],
      });
      await floorIntro();
      door = { kind: "fight" };
      continue;
    }
    door = await chooseDoor();
  }
}

async function endRun() {
  const R = S.run;
  R.over = true;
  const embers = embersFor(R);
  S.meta.embers += embers;
  store.set(META_KEY, S.meta);
  const best = store.get("rb.best", { floor: 0, rooms: 0 });
  const floorReached = Math.min(R.floor + 1, FLOOR_COUNT);
  if (floorReached > best.floor || R.stats.rooms > best.rooms) {
    store.set("rb.best", { floor: Math.max(best.floor, floorReached), rooms: Math.max(best.rooms, R.stats.rooms) });
  }
  const acc = R.stats.correct + R.stats.wrong ? Math.round((R.stats.correct / (R.stats.correct + R.stats.wrong)) * 100) : 0;
  const review = R.missed.slice(-16).map((m) => `<li><b>${esc(m.affix)}</b> ${esc(m.meaning)}</li>`).join("");
  show("hud", false);
  const pickd = await choose({
    title: R.won ? "You conquered the dungeon!" : `You fell on floor ${floorReached}`,
    sub:
      `Rooms ${R.stats.rooms} · foes ${R.stats.kills} · accuracy ${acc}% · <b style="color:#ffd36b">+${embers} Spirit Embers</b> (total ${S.meta.embers})` +
      (review ? `<br><br>Word parts to review:</p><ul class="review">${review}</ul><p>` : ""),
    buttons: [
      { label: "Run again", value: "again" },
      { label: "Shrine", value: "shrine", ghost: true },
      { label: "Change hero", value: "hero", ghost: true },
    ],
  });
  if (pickd === "again") return startRun(R.lookKey);
  if (pickd === "shrine") { await shrine(); return toTitle(); }
  return toSelect();
}

async function shrine() {
  S.mode = "title";
  show("panel");
  show("statsRow", false);
  $("inventory").innerHTML = "";
  $("invInfo").textContent = "";
  for (;;) {
    const L = S.meta.levels;
    const cards = Object.entries(META).map(([id, m]) => {
      const lvl = L[id] || 0;
      const maxed = lvl >= m.max;
      const cost = maxed ? null : metaCost(id, lvl);
      return {
        value: id,
        color: maxed ? "#59d98e" : "#ffd36b",
        disabled: maxed || S.meta.embers < cost,
        html: cardHtml({ icon: "🔥", name: m.name, tag: `Level ${lvl}/${m.max}`, body: esc(m.desc), cost }),
      };
    });
    const pickd = await choose({
      title: "Shrine of Memory",
      sub: `Spirit Embers carry over between runs. You have <b style="color:#ffd36b">${S.meta.embers}</b>.`,
      cards,
      buttons: [{ label: "Back", value: "back" }],
    });
    if (pickd === "back") return;
    const lvl = L[pickd] || 0;
    const cost = metaCost(pickd, lvl);
    if (S.meta.embers < cost || lvl >= META[pickd].max) continue;
    S.meta.embers -= cost;
    L[pickd] = lvl + 1;
    store.set(META_KEY, S.meta);
    sfx.boon();
  }
}

/* ------------------------------------------------- study mode (EML book) */

function exportProgress() {
  const backup = makeBackup((k) => store.get(k, null));
  const blob = new Blob([JSON.stringify(backup, null, 1)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `root-and-blade-progress-${dayKeyNow()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function importProgress() {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      try {
        const backup = JSON.parse(await file.text());
        // a backup from before the chapter split: move its terms to the new chapters first
        if (backup?.data?.["rb.eml"] && (backup.data["rb.emlv"] || 1) < PROGRESS_VERSION) {
          backup.data["rb.eml"] = migrateProgress(backup.data["rb.eml"], await loadChapters());
          backup.data["rb.emlv"] = PROGRESS_VERSION;
        }
        const out = applyBackup(backup, (k) => store.get(k, null));
        for (const [k, v] of Object.entries(out)) store.set(k, v);
        S.progress = store.get(EML_KEY, {});
        resolve(`Progress imported: ${Object.keys(S.progress).length} terms tracked. Review dates and streak were merged with this device.`);
      } catch (err) {
        resolve(`Couldn't import: ${err.message}`);
      }
    };
    input.click();
  });
}

async function loadChapters() {
  if (S.chapters) return S.chapters;
  const texts = await Promise.all(CHAPTER_FILES.map(async (f) => {
    const res = await fetch(`data/eml/${f}.txt`, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${f}: HTTP ${res.status}`);
    return parseChapter(await res.text(), f);
  }));
  S.chapters = texts;
  if ((store.get("rb.emlv", 1) || 1) < PROGRESS_VERSION) {
    S.progress = migrateProgress(S.progress, texts);
    store.set(EML_KEY, S.progress);
    store.set("rb.emlv", PROGRESS_VERSION);
  }
  return texts;
}

const pctText = (x) => `${Math.round(x * 100)}%`;
const STYLE_KEY = "rb.style";
const TODAY_KEY = "rb.today";
const STREAK_KEY = "rb.streak";
const HAD_DUE_KEY = "rb.hadDue";
const dayKeyNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const studyStyle = () => (STYLES.includes(store.get(STYLE_KEY, "mixed")) ? store.get(STYLE_KEY, "mixed") : "mixed");

function nextReviewText() {
  const all = (S.chapters || []).flatMap((c) => c.entries);
  const now = Date.now(), day = 86400000;
  const today = all.filter((e) => S.progress[e.key]?.due <= now + day).length;
  const week = all.filter((e) => S.progress[e.key]?.due <= now + 7 * day).length;
  return `Coming back for review: ${today} within a day, ${week} within a week. Come back tomorrow to lock them in.`;
}

async function updateDueBadge() {
  try {
    const chapters = await loadChapters();
    const due = dueEntries(chapters.flatMap((c) => c.entries), S.progress).length;
    if (due) store.set(HAD_DUE_KEY, dayKeyNow());
    const streak = liveStreak(store.get(STREAK_KEY, null));
    const bits = [due ? `${due} due` : "", streak ? `🔥${streak}` : ""].filter(Boolean).join(" · ");
    $("studyBtn").textContent = bits ? `Essentials of Medical Language (${bits})` : "Essentials of Medical Language";
  } catch { /* badge is optional */ }
}
const seenShare = (entries) => entries.filter((e) => S.progress[e.key]).length / Math.max(1, entries.length);

async function studyMenu(lookKey) {
  S.look = HEROES[lookKey];
  S.lookKey = lookKey;
  S.mode = "title";
  show("selectScreen", false);
  show("titleScreen", false);
  show("panel");
  show("statsRow", false);
  $("inventory").innerHTML = "";
  $("invInfo").textContent = "";
  let chapters;
  try {
    chapters = await loadChapters();
  } catch (err) {
    await choose({ title: "Couldn't load the chapters", sub: esc(err.message), buttons: [{ label: "Back", value: 1 }] });
    return toTitle();
  }
  for (;;) {
    const allEntries = chapters.flatMap((c) => c.entries);
    const due = dueEntries(allEntries, S.progress);
    const reviewCard = due.length
      ? [{
          value: "review", color: "#59d98e",
          html: cardHtml({ icon: "⟳", name: "Daily review", tag: `${due.length} term${due.length > 1 ? "s" : ""} due today`, body: "Typed recall of terms that are due, from every chapter. Do this first!" }),
        }]
      : [];
    const ch = await choose({
      title: "Essentials of Medical Language",
      sub: `Choose a chapter. Terms you get right come back for review after 1, 3, 7, 14 and 30 days; misses come back tomorrow. ` +
        `A term counts as mastered once you've typed it correctly from memory on ${MASTERY_DAYS} different days. ` +
        `<br>Question style: <b>${STYLE_LABEL[studyStyle()]}</b> · 🔥 Streak: <b>${liveStreak(store.get(STREAK_KEY, null))}</b> day(s)` +
        `<br><span class="kind">Tip: tap “Unsure” before answering when you're guessing, so a lucky guess isn't counted as known.</span>`,
      cards: reviewCard.concat(chapters.map((c) => ({
        value: c,
        color: chapterMastery(c, S.progress) >= 0.8 ? "#59d98e" : "#ffd36b",
        html: cardHtml({
          icon: String(c.num), name: c.title,
          tag: `${c.entries.length} terms · ${c.sections.length} sections · ${roomsFor(c.entries.length)} rooms`,
          body: `Seen ${pctText(seenShare(c.entries))} · mastered ${pctText(chapterMastery(c, S.progress))}` +
            (dueEntries(c.entries, S.progress).length ? ` · ${dueEntries(c.entries, S.progress).length} due` : ""),
        }),
      }))),
      buttons: [
        { label: "Change question style", value: "style", ghost: true },
        { label: "Export progress", value: "export", ghost: true },
        { label: "Import progress", value: "import", ghost: true },
        { label: "Diagram atlas", value: "atlas" },
        { label: "Back", value: "back", ghost: true },
      ],
    });
    if (ch === "back") return toTitle();
    if (ch === "export") { exportProgress(); continue; }
    if (ch === "import") {
      const msg = await importProgress();
      if (msg) await choose({ title: "Import", sub: esc(msg), buttons: [{ label: "OK", value: 1 }] });
      continue;
    }
    if (ch === "style") {
      const i = STYLES.indexOf(studyStyle());
      store.set(STYLE_KEY, STYLES[(i + 1) % STYLES.length]);
      continue;
    }
    if (ch === "review") {
      const list = dueEntries(allEntries, S.progress).slice(0, 60);
      return startStudy({ num: 0, title: "Daily review", entries: list, sections: [] }, null);
    }
    if (ch === "atlas") { await atlas(); continue; }
    const section = await choose({
      title: `Chapter ${ch.num}: ${ch.title}`,
      sub: "Study the whole chapter, or pick a section to read its lesson, recall it, then battle.",
      cards: [
        { value: null, color: "#ffd36b", html: cardHtml({ icon: "★", name: "Whole chapter", tag: `${ch.entries.length} terms`, body: "Every section mixed together." }) },
        ...ch.sections.map((sec, i) => {
          const m = sec.entries.filter((e) => S.progress[e.key]?.r >= 2 && S.progress[e.key]?.l === 1).length / sec.entries.length;
          return {
            value: sec, color: m >= 0.8 ? "#59d98e" : "#5ab0ff",
            html: cardHtml({ icon: `${ch.num}.${i + 1}`, name: sec.title, tag: `${sec.entries.length} terms${sec.lesson ? " · 📖 lesson" : ""}`, body: `Seen ${pctText(seenShare(sec.entries))} · mastered ${pctText(m)}` }),
          };
        }),
      ],
      buttons: [{ label: "Back", value: "back", ghost: true }],
    });
    if (section === "back") continue;
    return startStudy(ch, section);
  }
}

// Browse every diagram fully labelled.
async function atlas() {
  for (;;) {
    const name = await choose({
      title: "Diagram atlas",
      sub: "Fully labelled diagrams for studying. In battles, a highlighted part is asked about without labels.",
      cards: Object.entries(DIAGRAMS).map(([id, d]) => ({ value: id, color: "#5ab0ff", html: cardHtml({ icon: "◈", name: d.title }) })),
      buttons: [{ label: "Back", value: "back", ghost: true }],
    });
    if (name === "back") return;
    const d = DIAGRAMS[name];
    const parts = [...Object.entries(d.regions), ...Object.entries(d.groups || {})].filter(([, r]) => r.label);
    let current = null;
    for (;;) {
      const pick = await choose({
        title: d.title,
        sub: `${renderDiagram(name, current, { labels: "all" })}<p class="choice-sub">Tap a name to highlight it.</p>`,
        cards: [],
        buttons: [
          ...parts.map(([id, r]) => ({ label: r.short || r.label, value: id, ghost: id !== current })),
          { label: "All diagrams", value: "back" },
        ],
      });
      if (pick === "back") break;
      current = pick === current ? null : pick;
    }
  }
}

async function startStudy(chapter, section) {
  const entries = section ? section.entries : chapter.entries;
  const all = S.chapters.flatMap((c) => c.entries);
  const style = chapter.num ? studyStyle() : studyStyle() === "mc" ? "mc" : "typed";
  S.studyDeck = new StudyDeck(entries, all, DG, S.progress, Math.random, style);
  S.deck = S.studyDeck;
  if (section?.lesson) await lessonPhase(section, S.studyDeck);
  const review = !chapter.num; // each due term once, then relearn the misses
  S.studyDeck.once = review;
  const R = newRun({}, S.lookKey);
  R.study = { chapter, section, rooms: roomsFor(entries.length) };
  R.floor = chapter.num ? (chapter.num - 1) % FLOOR_COUNT : FLOOR_COUNT - 1; // background and foes
  R.hints = 3 + Math.floor(R.study.rooms / 3);
  S.run = R;
  S.enemy = null;
  S.effects = [];
  S.numbers = [];
  S.mode = "battle";
  S.hero.dead = false;
  S.hero.anim = null;
  show("hud");
  show("panel");
  show("statsRow");
  $("inventory").innerHTML = "";
  S.particles = [];
  updateHud();
  play(S.hero, "walkIn", 1400);
  await banner(chapter.num ? `Chapter ${chapter.num}` : "Daily review", section ? section.title : chapter.num ? chapter.title : `${entries.length} terms due`);
  const before = chapterMastery(chapter, S.progress);
  for (let room = 0; review ? !S.studyDeck.finished : room < R.study.rooms; room++) {
    R.room = room;
    const boss = !review && room === R.study.rooms - 1;
    const foe = makeEnemy(R, rng, { boss }); // calm mode: no elites or extra foes
    R.depth += 1;
    startRoom(R);
    S.roomEnemies = 1;
    S.roomIndex = 0;
    if (!(await fight(foe))) return endStudy(false, before);
    const healed = heal(R, 12);
    if (healed) floatNum(`+${healed}`, HERO_X, GROUND - 46, "#59d98e");
    R.stats.rooms += 1;
    updateHud();
    await sleep(500);
  }
  sfx.win();
  await play(S.hero, "victory", 700);
  await relearnRound();
  return endStudy(true, before);
}

// The diagram most of a section's entries point to, if any.
function lessonDiagram(section) {
  const count = new Map();
  for (const e of section.entries) {
    const d = e.img?.split(".")[0];
    if (d && DIAGRAMS[d]) count.set(d, (count.get(d) || 0) + 1);
  }
  const best = [...count.entries()].sort((a, b) => b[1] - a[1])[0];
  return best && best[1] >= 2 ? best[0] : null;
}

// Read a short lesson, write down every key term remembered (free recall),
// see what was missed, then battle with fill-in-the-blanks from the lesson.
async function lessonPhase(section, deck) {
  const { lesson } = section;
  const dg = lessonDiagram(section);
  const read = await choose({
    title: `Lesson: ${section.title}`,
    sub: `<span class="kind">Read carefully. Afterwards you'll write down every key term you can remember.</span>` +
      `<span class="lesson">${lesson.html}</span>` +
      (dg ? renderDiagram(dg, null, { labels: "all" }) : ""),
    buttons: [
      { label: "I've read it — test me", value: "dump" },
      { label: "Skip to battle", value: "skip", ghost: true },
    ],
  });
  if (read === "skip") return;
  const n = lesson.terms.length;
  const asked = choose({
    title: "Brain dump",
    sub: `Without looking back, write every <b>key term</b> from the lesson you can remember ` +
      `(${n} were in bold). One per line or separated by commas. Spelling counts, but small typos are forgiven.` +
      `<textarea id="dumpBox" class="dump" rows="7" autocapitalize="off" spellcheck="false" ` +
      `aria-label="Terms you remember" placeholder="epidermis&#10;keratin&#10;…"></textarea>`,
    buttons: [
      { label: "Check my list", value: "check" },
      { label: "I can't remember any", value: "none", ghost: true },
    ],
  });
  $("dumpBox")?.focus();
  const go = await asked;
  const text = go === "check" ? $("dumpBox")?.value || "" : "";
  const res = gradeBrainDump(text, lesson, deck.vocab);
  deck.primeFromBrainDump(res);
  store.set(EML_KEY, S.progress);
  const row = (t) => `<li><b>${esc(t.shown)}</b> ${esc(t.entry.def)}</li>`;
  await choose({
    title: `You recalled ${res.recalled.length} of ${n}`,
    sub: (res.recalled.length ? `Recalled: ${res.recalled.map((t) => `<b>${esc(t.shown)}</b>`).join(", ")}<br>` : "") +
      (res.missed.length
        ? `Missed — read these again; they'll come up first in battle:</p><ul class="review">${res.missed.map(row).join("")}</ul><p>`
        : "Every term recalled!"),
    buttons: [{ label: "To battle ⚔", value: 1 }],
  });
}

// Before leaving, every term missed this run must be recalled once more.
async function relearnRound() {
  const deck = S.studyDeck;
  if (!deck.unresolved.length) return;
  S.enemy = null;
  updateHud();
  await banner("Relearning", `Recall the ${deck.unresolved.length} term${deck.unresolved.length > 1 ? "s" : ""} you missed before you go`, 1500);
  const tries = new Map();
  while (deck.unresolved.length) {
    const entry = deck.unresolved.find((e) => (tries.get(e.key) || 0) < 3);
    if (!entry) break;
    tries.set(entry.key, (tries.get(entry.key) || 0) + 1);
    const choice = await askQuestion({ charging: false }, deck.recallFor(entry));
    const q = S.q;
    const typed = q.mode === "typed";
    const correct = typed ? choice !== null && gradeTyped(choice, q.accept, deck.vocab) !== "wrong" : choice === q.answer;
    deck.record(entry, correct, typed, Date.now(), { guess: S.unsure || choice === null });
    store.set(EML_KEY, S.progress);
    store.set(TODAY_KEY, countAnswer(store.get(TODAY_KEY, null)));
    $("hintBtn").disabled = true;
    show("mcIdkBtn", false);
    if (typed) { $("typedInput").disabled = true; $("typedInput").classList.add(correct ? "right" : "wrong"); }
    else { [...$("choices").children].forEach((b, i) => { b.disabled = true; if (i === q.answer) b.classList.add("right"); else if (i === choice) b.classList.add("wrong"); }); }
    if (q.image) $("quizImage").innerHTML = renderDiagram(q.image.diagram, q.image.region, { labels: "all" });
    const fb = $("feedback");
    if (correct) {
      sfx.right();
      fb.className = "feedback good";
      fb.textContent = `Got it! ${deck.unresolved.length ? `${deck.unresolved.length} left.` : "All relearned."}`;
      await sleep(700);
    } else {
      sfx.wrong();
      fb.className = "feedback bad";
      fb.innerHTML = `The answer: <b>${esc(q.answerText || q.options[q.answer])}</b>. ${esc(entry.def)}. It'll come up again.${notesHtml(entry)}`;
      show("continueBtn");
      $("continueBtn").focus();
      await new Promise((resolve) => { S.pending = { type: "continue", resolve }; });
      show("continueBtn", false);
    }
  }
}

// Daily goal and streak, checked at the end of each study run.
function dailyStatus() {
  const all = (S.chapters || []).flatMap((c) => c.entries);
  const dueLeft = dueEntries(all, S.progress).length;
  const today = store.get(TODAY_KEY, null);
  const answeredToday = today?.day === dayKeyNow() ? today.answered : 0;
  const hadDue = dueLeft > 0 || store.get(HAD_DUE_KEY, null) === dayKeyNow();
  const met = goalMet({ dueLeft, answeredToday, hadDue });
  let streak = store.get(STREAK_KEY, null);
  if (met) { streak = recordGoal(streak); store.set(STREAK_KEY, streak); }
  return { dueLeft, answeredToday, hadDue, met, streak: liveStreak(streak), best: streak?.best || 0 };
}

async function endStudy(won, before) {
  const R = S.run;
  const ch = R.study.chapter;
  const after = chapterMastery(ch, S.progress);
  store.set(EML_KEY, S.progress);
  const day = dailyStatus();
  const goalLine = day.met
    ? `🔥 Daily goal done! Streak: <b>${day.streak} day${day.streak === 1 ? "" : "s"}</b> (best ${day.best}).`
    : day.hadDue
      ? `Daily goal: ${day.dueLeft} review${day.dueLeft === 1 ? "" : "s"} still due today. Clear them to keep your streak.`
      : `Daily goal: ${day.answeredToday}/${GOAL_MIN_ANSWERS} answers today.`;
  const acc = R.stats.correct + R.stats.wrong ? Math.round((R.stats.correct / (R.stats.correct + R.stats.wrong)) * 100) : 0;
  const review = R.missed.slice(-20).map((m) => `<li><b>${esc(m.affix)}</b> ${esc(m.meaning)}</li>`).join("");
  show("hud", false);
  const pickd = await choose({
    title: won ? (ch.num ? `Chapter ${ch.num} complete!` : "Review complete!") : "You need a rest…",
    sub:
      `Accuracy ${acc}% · ${R.stats.correct} correct · <b>${R.stats.recalled || 0} recalled by typing</b> · ` +
      `seen ${pctText(seenShare(ch.entries))} · mastered ${pctText(before)} → <b style="color:#59d98e">${pctText(after)}</b>` +
      `<br>${nextReviewText()}<br>${goalLine}` +
      (review ? `<br><br>Review these:</p><ul class="review">${review}</ul><p>` : ""),
    buttons: [
      { label: "Study again", value: "again" },
      { label: "Choose chapter", value: "chapters", ghost: true },
      { label: "Title", value: "title", ghost: true },
    ],
  });
  if (pickd === "again") {
    if (!ch.num) return studyMenu(S.lookKey);
    return startStudy(ch, R.study.section);
  }
  if (pickd === "chapters") return studyMenu(S.lookKey);
  return toTitle();
}

function toTitle() {
  updateDueBadge();
  S.mode = "title";
  S.run = null;
  show("panel", false);
  show("hud", false);
  show("selectScreen", false);
  show("titleScreen");
  $("bestText").textContent = bestText();
}

function toSelect() {
  S.mode = "select";
  S.run = null;
  S.enemy = null;
  show("hud", false);
  show("panel", false);
  show("titleScreen", false);
  show("selectScreen");
  document.querySelector(".hero-card")?.focus();
}

function bestText() {
  const best = store.get("rb.best", null);
  const embers = S.meta.embers ? `Spirit Embers: ${S.meta.embers}` : "";
  return [best && best.floor ? `Best: floor ${best.floor}, ${best.rooms} rooms` : "", embers].filter(Boolean).join(" · ");
}

/* ----------------------------------------------------------------- input */

$("startBtn").onclick = () => { music.start(); S.nextMode = "run"; toSelect(); };
$("shrineBtn").onclick = async () => {
  music.start();
  show("titleScreen", false);
  await shrine();
  toTitle();
};
for (const card of document.querySelectorAll(".hero-card")) {
  card.onclick = () => (S.nextMode === "study" ? studyMenu(card.dataset.hero) : startRun(card.dataset.hero));
}
$("studyBtn").onclick = () => { music.start(); S.nextMode = "study"; toSelect(); };
$("hintBtn").onclick = useHint;
// Tap any diagram to see it full screen; tap again (or Esc) to close.
document.addEventListener("click", (e) => {
  const zoom = $("zoom");
  if (!zoom.hidden) { zoom.hidden = true; zoom.innerHTML = ""; return; }
  const fig = e.target.closest?.(".panel .dg");
  if (!fig) return;
  zoom.innerHTML = fig.outerHTML;
  zoom.hidden = false;
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !$("zoom").hidden) { $("zoom").hidden = true; $("zoom").innerHTML = ""; }
});
$("typedForm").onsubmit = (e) => {
  e.preventDefault();
  const v = $("typedInput").value.trim();
  if (/^(\?+|idk|i don'?t know|dunno|pass)$/i.test(v)) resolvePending(null); // typed "I don't know"
  else if (v) resolvePending(v);
};
// Phones: keep the question and answer box above the on-screen keyboard.
$("typedInput").addEventListener("focus", () => {
  if (!matchMedia("(pointer: coarse)").matches) return;
  setTimeout(() => $("prompt").scrollIntoView({ block: "start", behavior: "smooth" }), 300);
});

// Fullscreen: the real thing where the browser allows it, otherwise (iPhone) a
// compact layout that drops the footer and fits the game to the screen.
const fullApi = document.fullscreenEnabled || document.webkitFullscreenEnabled;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement) || document.body.classList.contains("compact");
// Size the game and the UI to the screen: side by side when wide, stacked when tall.
function fitFull() {
  const b = document.body;
  if (!b.classList.contains("full")) return;
  const w = innerWidth, h = innerHeight;
  const wide = w > h * 1.9; // phones on their side: game and questions side by side
  b.classList.toggle("wide", wide);
  const stageW = wide ? Math.min(w * 0.58, (h - 12) * 16 / 9) : Math.min(w - 12, h * (w > h ? 0.5 : 0.48) * 16 / 9);
  // scale the questions up, but keep them inside the space left under the game
  const ui = wide ? Math.min(1.6, Math.max(1, Math.min((w - stageW) / 380, h / 380)))
    : Math.min(2, Math.max(1, Math.min(stageW / 720, (h - stageW * 9 / 16 - 16) / 380)));
  b.style.setProperty("--stageW", `${Math.round(stageW)}px`);
  b.style.setProperty("--uiZoom", ui.toFixed(2));
  b.style.setProperty("--hudZoom", Math.min(2.2, Math.max(1, stageW / 720)).toFixed(2));
}
addEventListener("resize", fitFull);
function syncFull() {
  const on = isFull();
  document.body.classList.toggle("full", on);
  fitFull();
  $("fullBtn").textContent = on ? "✕" : "⛶";
  $("fullBtn").setAttribute("aria-label", on ? "Exit fullscreen" : "Fullscreen");
}
$("fullBtn").onclick = async () => {
  const el = document.documentElement;
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (document.body.classList.contains("compact")) {
      document.body.classList.remove("compact");
    } else if (fullApi) {
      await (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: "hide" });
    } else {
      document.body.classList.add("compact");
    }
  } catch {
    document.body.classList.toggle("compact");
  }
  syncFull();
};
document.addEventListener("fullscreenchange", syncFull);
document.addEventListener("webkitfullscreenchange", syncFull);
// launched from the home screen: already full screen
if (matchMedia("(display-mode: fullscreen), (display-mode: standalone)").matches || navigator.standalone) {
  document.body.classList.add("full");
  $("fullBtn").hidden = true;
  fitFull();
}
$("dontKnowBtn").onclick = () => resolvePending(null);
$("mcIdkBtn").onclick = () => resolvePending(null);
$("unsureBtn").onclick = () => {
  if (S.pending?.type !== "answer") return;
  S.unsure = !S.unsure;
  $("unsureBtn").classList.toggle("on", S.unsure);
  $("unsureBtn").setAttribute("aria-pressed", String(S.unsure));
  if (S.q?.mode === "typed") $("typedInput").focus();
};
$("continueBtn").onclick = () => resolvePending(null, "continue");

// sound menu
const soundBtn = $("soundBtn");
soundBtn.onclick = () => {
  const open = $("soundMenu").hidden;
  show("soundMenu", open);
  soundBtn.setAttribute("aria-expanded", String(open));
};
$("musicOn").checked = music.on;
$("musicOn").onchange = () => music.toggle();
$("musicVol").value = music.volume;
$("musicVol").oninput = (e) => music.setVolume(+e.target.value);
$("skipBtn").onclick = () => { music.start(); music.next(); };
$("sfxOn").checked = sfx.on;
$("sfxOn").onchange = (e) => { sfx.on = e.target.checked; store.set("rb.sound", sfx.on); };
music.onchange = () => {
  $("musicOn").checked = music.on;
  $("nowPlaying").textContent = !music.available
    ? "No music yet. Add tracks to the audio/ folder."
    : music.current ? `♪ ${music.current.title}` : `${music.tracks.length} track(s) ready`;
  $("skipBtn").disabled = !music.available;
  soundBtn.classList.toggle("off", !music.on && !sfx.on);
};

document.addEventListener("keydown", (e) => {
  const answering = S.pending?.type === "answer";
  const typedQ = answering && S.q?.mode === "typed";
  // Shortcuts that work while typing an answer: Esc = I don't know,
  // Alt+H = hint, Alt+U = unsure (e.code, since Option+letter types a symbol on a Mac).
  if (answering && e.altKey && !e.ctrlKey && !e.metaKey && (e.code === "KeyH" || e.code === "KeyU")) {
    e.preventDefault();
    if (e.code === "KeyH") useHint();
    else if (S.run?.study) $("unsureBtn").click();
    return;
  }
  if (typedQ && e.key === "Escape" && $("zoom").hidden) {
    e.preventDefault();
    resolvePending(null);
    return;
  }
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA") return;
  // Typing anywhere during a typed question goes into the answer box.
  if (typedQ && !$("typedInput").disabled && (e.key.length === 1 || e.key === "Backspace")) {
    $("typedInput").focus();
    return;
  }
  if (S.pending?.type === "answer" && /^[1-4]$/.test(e.key)) {
    e.preventDefault();
    resolvePending(Number(e.key) - 1);
  } else if (S.pending?.type === "answer" && S.run?.study && (e.key === "0" || e.key === "?")) {
    e.preventDefault();
    resolvePending(null);
  } else if (S.pending?.type === "answer" && e.key.toLowerCase() === "u" && S.run?.study) {
    $("unsureBtn").click();
  } else if (S.pending?.type === "answer" && e.key.toLowerCase() === "h") {
    useHint();
  } else if (S.pending?.type === "continue" && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    resolvePending(null, "continue");
  }
});

/* ------------------------------------------------------------------ boot */

async function boot() {
  requestAnimationFrame(frame);
  $("bestText").textContent = bestText();
  $("studyBtn").disabled = false; // study mode has its own data
  updateDueBadge();
  music.init();
  const status = $("loadStatus");
  try {
    const res = await fetch("data/terms.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    S.terms = data.terms.filter((t) => t.affix && t.meaning);
    if (S.terms.length < 8) throw new Error("too few terms");
    new Deck(S.terms).next(); // sanity check that questions can be built
    status.textContent = `${S.terms.length} prefixes, suffixes and roots loaded.`;
    $("startBtn").disabled = false;
    $("startBtn").focus();
  } catch (err) {
    status.classList.add("error");
    status.textContent =
      `Couldn't load the term list (${err.message}). Running locally? ` +
      "Generate it with: python scripts/build_terms.py";
  }
}
boot();
