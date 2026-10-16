import { makeCanvas, Pen, drawOutlined, drawNumber } from "./pixel.js";
import {
  W, H, GROUND, HEROES, HERO_BOX, MONSTER_BOX, MONSTER_NAMES,
  drawHero, drawMonster, floorBackground, drawAmbient, stepParticles,
} from "./art.js";
import { Deck } from "./quiz.js";
import { BOONS, ITEMS, KAMI, ELITES, META, RARITY, DOOR_INFO, metaCost } from "./content.js";
import {
  newRun, stats, enemiesForRoom, heroStrike, enemyStrike, endTurn, startRoom, killReward,
  roomCleared, floorCleared, rollDoors, rollBoons, takeBoon, rollItem, takeItem, shopStock,
  tryRevive, heal, embersFor, ROOMS_PER_FLOOR, FLOOR_COUNT,
} from "./run.js";
import { FLOORS } from "./art.js";
import { Music } from "./music.js";

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
};

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
  const roomLabel = R.room >= ROOMS_PER_FLOOR ? "BOSS" : `${Math.min(R.room + 1, ROOMS_PER_FLOOR)}/${ROOMS_PER_FLOOR}`;
  $("floorTag").textContent = `F${Math.min(R.floor + 1, FLOOR_COUNT)} ${roomLabel}`;
  $("gold").textContent = R.gold;
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

function askQuestion(enemy) {
  const R = S.run;
  const st = stats(R);
  S.q = S.deck.next();
  S.q.removed = new Set();
  S.q.hintUsed = false;
  const q = S.q;
  // Eye of Ryujin crosses out wrong answers up front.
  const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer).sort(() => rng() - 0.5);
  for (let i = 0; i < st.removeOptions; i++) q.removed.add(wrong[i]);

  show("choiceView", false);
  show("quizView");
  $("prompt").innerHTML =
    `What does <span class="affix">${esc(q.affix)}</span> mean? <span class="kind">(${q.kind})</span>`;
  const box = $("choices");
  box.innerHTML = "";
  q.options.forEach((opt, i) => {
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
  if (type === "answer" && S.q && S.q.removed.has(value)) return;
  S.pending = null;
  p.resolve(value);
}

function refreshHintButton() {
  const b = $("hintBtn");
  const q = S.q, R = S.run;
  const answering = S.pending && S.pending.type === "answer";
  if (!q) return;
  if (q.hintUsed) { b.disabled = true; b.textContent = "Hint used"; }
  else if (!q.examples.length && !stats(R).hintRemoves) {
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
  const removes = stats(R).hintRemoves;
  if (!q.examples.length && !removes) return;
  R.hints -= 1;
  q.hintUsed = true;
  const parts = [];
  if (q.examples.length) parts.push(`Example word: ${q.examples[0]}`);
  if (removes) {
    const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer && !q.removed.has(i));
    if (wrong.length > 1) {
      const i = wrong[Math.floor(rng() * wrong.length)];
      q.removed.add(i);
      const btn = $("choices").children[i];
      btn.classList.add("struck");
      btn.disabled = true;
      parts.push("Inari crossed out a wrong answer.");
    }
  }
  $("hintText").textContent = parts.join(" · ");
  sfx.beep([880], 0.06, "triangle");
  refreshHintButton();
  updateHud();
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
    const buttons = [...$("choices").children];
    buttons.forEach((b) => (b.disabled = true));
    $("hintBtn").disabled = true;
    buttons[q.answer].classList.add("right");
    const fb = $("feedback");
    const notes = [];

    if (choice === q.answer) {
      sfx.right();
      const res = heroStrike(R, enemy, rng);
      fb.className = "feedback good";
      notes.push(R.streak > 1 ? `Correct! ${R.streak} in a row.` : "Correct!");
      if (res.interrupted) notes.push("You staggered it!");
      if (res.hits.some((h) => h.crit)) notes.push("Critical!");
      if (res.hits.filter((h) => h.kind === "slash").length > 1) notes.push("Double strike!");
      if (res.hits.some((h) => h.blocked)) notes.push("Its ward absorbed the blow.");
      fb.textContent = notes.join(" ");
      await animateHeroHits(enemy, res);
    } else {
      sfx.wrong();
      buttons[choice].classList.add("wrong");
      if (!R.missed.some((m) => m.affix === q.affix)) R.missed.push({ affix: q.affix, meaning: q.options[q.answer] });
      const res = enemyStrike(R, enemy, rng);
      fb.className = "feedback bad";
      let what = res.forgiven ? " Your charm shielded you." : res.dodged ? " You dodged!" : res.heavy ? " A crushing blow!" : "";
      fb.innerHTML = `Not quite. <b>${esc(q.affix)}</b> means “${esc(q.options[q.answer])}”.${esc(what)}`;
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

    if (choice !== q.answer && enemy.hp > 0) {
      show("continueBtn");
      $("continueBtn").focus();
      await new Promise((resolve) => { S.pending = { type: "continue", resolve }; });
      show("continueBtn", false);
    } else {
      await sleep(350);
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

function toTitle() {
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

$("startBtn").onclick = () => { music.start(); toSelect(); };
$("shrineBtn").onclick = async () => {
  music.start();
  show("titleScreen", false);
  await shrine();
  toTitle();
};
for (const card of document.querySelectorAll(".hero-card")) card.onclick = () => startRun(card.dataset.hero);
$("hintBtn").onclick = useHint;
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
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const tag = document.activeElement?.tagName;
  if (tag === "INPUT") return;
  if (S.pending?.type === "answer" && /^[1-4]$/.test(e.key)) {
    e.preventDefault();
    resolvePending(Number(e.key) - 1);
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
