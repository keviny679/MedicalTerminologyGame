import { makeCanvas, Pen, drawOutlined, drawNumber } from "./pixel.js";
import {
  W, H, GROUND, HEROES, HERO_BOX, MONSTER_BOX, MONSTER_NAMES, FLOORS,
  drawHero, drawMonster, floorBackground, drawAmbient, stepParticles,
} from "./art.js";
import { Deck } from "./quiz.js";

/* ---------------------------------------------------------------- tuning */

const B = {
  heroMaxHp: 100,
  hintsPerFloor: 3,
  fightsPerFloor: 4, // 3 monsters + 1 boss
  heroDamage: (streak) => 20 + Math.min(streak - 1, 3) * 5,
  monsterHp: (floor, boss) => (boss ? 90 + floor * 25 : 35 + floor * 10),
  monsterDamage: (floor, boss) => (boss ? 18 + floor * 4 : 12 + floor * 3),
  healAfterMonster: 8,
  healAfterFloor: 30,
  points: { correct: 10, streak: 5, monster: 50, boss: 200 },
};
const HERO_X = 56;
const MON_X = 178;

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
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/* ------------------------------------------------------------------ sound */

const sound = {
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
  hurt() { this.beep([140, 90], 0.1, "square", 0.07); },
  win() { this.beep([523, 659, 784, 1046], 0.1); },
};

/* ------------------------------------------------------------------ state */

const S = {
  terms: [],
  deck: null,
  look: null,
  lookKey: null,
  floor: 0,
  fight: 0,
  hp: B.heroMaxHp,
  hints: B.hintsPerFloor,
  streak: 0,
  score: 0,
  q: null,
  hintUsed: false,
  busy: true,
  mode: "title", // title | select | battle | banner
  monster: null,
  hero: { x: HERO_X, anim: null, dead: false },
  effects: [],
  numbers: [],
  particles: [],
  shake: 0,
  now: 0,
};

/* ---------------------------------------------------------------- render */

const screen = $("screen");
const g = screen.getContext("2d");
g.imageSmoothingEnabled = false;
const pen = new Pen(g);
const heroCanvas = makeCanvas(HERO_BOX.w, HERO_BOX.h);
const monCanvas = makeCanvas(MONSTER_BOX, MONSTER_BOX);
const previewCanvases = [...document.querySelectorAll("[data-preview]")];

function animProgress(a) {
  return a ? Math.min(1, (S.now - a.t0) / a.dur) : 1;
}

function play(entity, kind, dur) {
  entity.anim = { kind, t0: S.now, dur };
  return sleep(dur);
}

function heroFrame() {
  const h = S.hero;
  const a = h.anim;
  const p = animProgress(a);
  const walkStep = [0, 1, 0, -1][Math.floor(S.now / 110) % 4];
  const breathe = Math.floor(S.now / 450) % 2;
  const blink = S.now % 3400 > 3250;
  let x = HERO_X, y = 0, pose = "rest", step = 0, tint = null, rot = 0, hidden = false;

  if (h.dead) {
    rot = 1;
  } else if (a && p < 1) {
    if (a.kind === "walkIn") {
      x = -20 + (HERO_X + 20) * p;
      step = walkStep;
    } else if (a.kind === "attack") {
      const reach = MON_X - 44;
      if (p < 0.35) { x = HERO_X + (reach - HERO_X) * (p / 0.35); pose = "raise"; step = walkStep; }
      else if (p < 0.6) { x = reach; pose = "slash"; }
      else { x = reach + (HERO_X - reach) * ((p - 0.6) / 0.4); step = walkStep; }
    } else if (a.kind === "hurt") {
      pose = "hurt";
      x = HERO_X - Math.round(Math.sin(p * Math.PI) * 6);
      tint = p < 0.3 ? "#ff3b4fb0" : null;
      hidden = p > 0.3 && Math.floor(S.now / 60) % 2 === 0;
    } else if (a.kind === "victory") {
      pose = "up";
      y = -Math.round(Math.sin(p * Math.PI) * 10);
    }
  } else if (a && a.kind === "victory") {
    pose = "up";
  }
  return { x, y, pose, step, breathe: pose === "rest" ? breathe : 0, blink, tint, rot, hidden };
}

function drawHeroOnScreen() {
  if (!S.look) return;
  const f = heroFrame();
  if (f.hidden) return;
  drawHero(heroCanvas, S.look, f);
  const fx = HERO_BOX.ox + 12, fy = HERO_BOX.oy + 31; // feet inside the box
  if (f.rot) {
    g.save();
    g.translate(Math.round(f.x), GROUND - 1);
    g.rotate(-Math.PI / 2);
    drawOutlined(g, heroCanvas, -fy + 2, -fx, "#0a0814", "#00000055");
    g.restore();
    return;
  }
  pen.ellipse("#00000066", f.x, GROUND, 10, 2);
  drawOutlined(g, heroCanvas, f.x - fx, GROUND - fy + f.y, "#0a0814", f.tint);
}

function drawMonsterOnScreen() {
  const m = S.monster;
  if (!m) return;
  const a = m.anim;
  const p = animProgress(a);
  let x = MON_X, tint = null, alpha = 1;
  if (a && p < 1) {
    if (a.kind === "enter") x = W + 40 - (W + 40 - MON_X) * (1 - (1 - p) ** 3);
    else if (a.kind === "attack") {
      const reach = HERO_X + 40;
      x = p < 0.5 ? MON_X - (MON_X - reach) * Math.sin((p / 0.5) * (Math.PI / 2)) : reach + (MON_X - reach) * ((p - 0.5) / 0.5);
    } else if (a.kind === "hurt") {
      x = MON_X + Math.round(Math.sin(p * 40) * 3 * (1 - p));
      tint = p < 0.4 ? "#ffffffd0" : null;
    } else if (a.kind === "die") {
      tint = "#ffffffd0";
      alpha = 1 - p;
    }
  } else if (a && a.kind === "die") {
    return;
  }
  drawMonster(monCanvas, m.type, (S.now - m.spawn) / 1000);
  const half = MONSTER_BOX / 2;
  pen.ellipse("#00000066", x, GROUND, m.boss ? 18 : 11, 2);
  g.save();
  g.globalAlpha = alpha;
  drawOutlined(g, monCanvas, x - half, GROUND - MONSTER_BOX + 2, "#0a0814", tint);
  g.restore();
}

function drawEffects() {
  S.effects = S.effects.filter((e) => S.now - e.t0 < e.dur);
  for (const e of S.effects) {
    const p = (S.now - e.t0) / e.dur;
    if (e.kind === "slash") {
      for (let i = 0; i < 26; i++) {
        const a = -2.2 + (i / 26) * 2.6 * Math.min(1, p * 2.5);
        const r = 24;
        const x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r;
        pen.rect(i % 3 ? "#e8fbff" : "#7fd9ff", x, y, 2, 2);
      }
    } else if (e.kind === "spark") {
      for (const s of e.bits) pen.rect(s.c, e.x + s.vx * p * 30, e.y + s.vy * p * 30 + p * p * 20, 1 + (p < 0.5), 1 + (p < 0.5));
    } else if (e.kind === "claw") {
      for (let k = 0; k < 3; k++) pen.line(p < 0.5 ? "#ffffff" : "#ff5c6c", e.x - 8 + k * 6, e.y - 10, e.x - 2 + k * 6, e.y + 10);
    }
  }
  S.numbers = S.numbers.filter((n) => S.now - n.t0 < 900);
  for (const n of S.numbers) {
    const p = (S.now - n.t0) / 900;
    drawNumber(pen, n.text, n.x, n.y - p * 16, n.color, 2);
  }
}

function sparks(x, y, colors) {
  const bits = Array.from({ length: 16 }, () => {
    const a = Math.random() * Math.PI * 2;
    return { vx: Math.cos(a), vy: Math.sin(a) - 0.4, c: colors[Math.floor(Math.random() * colors.length)] };
  });
  S.effects.push({ kind: "spark", x, y, bits, t0: S.now, dur: 600 });
}

let last = performance.now();
function frame(ts) {
  const dt = Math.min(0.05, (ts - last) / 1000);
  last = ts;
  S.now = ts;

  g.fillStyle = "#05060f";
  g.fillRect(0, 0, W, H);
  g.save();
  if (S.shake > 0) {
    S.shake -= dt;
    g.translate(Math.round((Math.random() - 0.5) * 4), Math.round((Math.random() - 0.5) * 3));
  }
  g.drawImage(floorBackground(S.floor), 0, 0);
  stepParticles(S.particles, S.floor, dt, ts / 1000);
  drawAmbient(pen, S.floor, ts / 1000, S.particles);
  if (S.mode !== "title" && S.mode !== "select") {
    drawMonsterOnScreen();
    drawHeroOnScreen();
    drawEffects();
  }
  g.restore();

  if (S.mode === "select") {
    for (const c of previewCanvases) {
      const look = HEROES[c.dataset.preview];
      drawHero(c, look, {
        pose: "rest", breathe: Math.floor(ts / 450) % 2, blink: ts % 3400 > 3250,
      });
    }
  }
  requestAnimationFrame(frame);
}

/* -------------------------------------------------------------------- HUD */

function updateHud() {
  $("heroName").textContent = S.look ? S.look.name : "";
  $("heroHp").style.width = `${(Math.max(0, S.hp) / B.heroMaxHp) * 100}%`;
  $("heroHpText").textContent = `${Math.max(0, S.hp)}/${B.heroMaxHp}`;
  const m = S.monster;
  $("monName").textContent = m ? m.name : "";
  $("monHp").style.width = m ? `${(Math.max(0, m.hp) / m.max) * 100}%` : "0%";
  $("monHpText").textContent = m ? `${Math.max(0, m.hp)}/${m.max}` : "";
  const fightLabel = S.fight >= B.fightsPerFloor - 1 ? "BOSS" : `${S.fight + 1}/${B.fightsPerFloor - 1}`;
  $("floorTag").textContent = `F${S.floor + 1} ${fightLabel}`;
  $("hintCount").textContent = S.hints;
  $("streak").textContent = S.streak;
  $("score").textContent = S.score;
}

function show(id, on = true) {
  $(id).hidden = !on;
}

function banner(title, sub, { button = null, alt = null } = {}) {
  S.mode = "banner";
  $("bannerTitle").textContent = title;
  $("bannerSub").textContent = sub;
  const b = $("bannerBtn"), a = $("bannerAlt");
  b.hidden = !button;
  a.hidden = !alt;
  show("bannerScreen");
  return new Promise((resolve) => {
    if (!button && !alt) {
      setTimeout(() => { show("bannerScreen", false); resolve("auto"); }, 1500);
      return;
    }
    const done = (which) => {
      b.onclick = a.onclick = null;
      show("bannerScreen", false);
      resolve(which);
    };
    if (button) { b.textContent = button; b.onclick = () => done("main"); setTimeout(() => b.focus(), 50); }
    if (alt) { a.textContent = alt; a.onclick = () => done("alt"); }
  });
}

/* ----------------------------------------------------------------- flow */

function bestText() {
  const best = store.get("rb.best", null);
  return best ? `Best: floor ${best.floor} · score ${best.score}` : "";
}

function saveBest() {
  const best = store.get("rb.best", { floor: 0, score: 0 });
  const floorReached = S.floor + 1;
  if (S.score > best.score || floorReached > best.floor) {
    store.set("rb.best", { floor: Math.max(best.floor, floorReached), score: Math.max(best.score, S.score) });
  }
}

async function startRun(lookKey) {
  S.lookKey = lookKey;
  S.look = HEROES[lookKey];
  S.floor = 0;
  S.hp = B.heroMaxHp;
  S.streak = 0;
  S.score = 0;
  S.hero = { x: HERO_X, anim: null, dead: false };
  S.deck = new Deck(S.terms);
  show("selectScreen", false);
  show("titleScreen", false);
  show("hud");
  await enterFloor();
}

async function enterFloor() {
  S.fight = 0;
  S.hints = B.hintsPerFloor;
  S.monster = null;
  S.particles = [];
  S.hero.anim = null;
  show("panel", false);
  updateHud();
  const f = FLOORS[S.floor];
  play(S.hero, "walkIn", 1400);
  await banner(`Floor ${S.floor + 1}`, f.name);
  S.mode = "battle";
  await sleep(150);
  await nextFight();
}

async function nextFight() {
  const f = FLOORS[S.floor];
  const boss = S.fight === B.fightsPerFloor - 1;
  const type = boss ? f.boss : f.normals[S.fight % f.normals.length];
  const max = B.monsterHp(S.floor, boss);
  S.monster = { type, name: MONSTER_NAMES[type].name, boss, hp: max, max, spawn: S.now, anim: null };
  updateHud();
  if (boss) sound.beep([196, 185, 175, 165], 0.15, "sawtooth", 0.05);
  await play(S.monster, "enter", 700);
  ask();
}

function ask() {
  S.q = S.deck.next();
  S.hintUsed = false;
  const q = S.q;
  $("prompt").innerHTML =
    `What does <span class="affix">${esc(q.affix)}</span> mean? <span class="kind">(${q.kind})</span>`;
  const box = $("choices");
  box.innerHTML = "";
  q.options.forEach((opt, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "choice";
    b.innerHTML = `<span class="key">${i + 1}</span><span>${esc(opt)}</span>`;
    b.onclick = () => answer(i);
    box.appendChild(b);
  });
  $("hintText").textContent = "";
  $("feedback").textContent = "";
  $("feedback").className = "feedback";
  show("continueBtn", false);
  S.busy = false;
  refreshHintButton();
  show("panel");
  updateHud();
}

function refreshHintButton() {
  const b = $("hintBtn");
  const has = S.q && S.q.examples.length > 0;
  if (S.hintUsed) {
    b.disabled = true;
    b.textContent = "Hint used";
  } else if (!has) {
    b.disabled = true;
    b.textContent = "No hint";
    $("hintText").textContent = "Wikipedia lists no example word for this one.";
  } else {
    b.disabled = S.hints <= 0 || S.busy;
    b.textContent = S.hints > 0 ? `Hint (${S.hints})` : "No hints left";
  }
}

function useHint() {
  if (S.busy || S.hintUsed || !S.q || !S.q.examples.length || S.hints <= 0) return;
  S.hints--;
  S.hintUsed = true;
  $("hintText").textContent = `Example word: ${S.q.examples[0]}`;
  sound.beep([880], 0.06, "triangle");
  refreshHintButton();
  updateHud();
}

async function answer(i) {
  if (S.busy || S.mode !== "battle" || !S.q) return;
  S.busy = true;
  const q = S.q;
  const buttons = [...$("choices").children];
  buttons.forEach((b) => (b.disabled = true));
  $("hintBtn").disabled = true;
  buttons[q.answer].classList.add("right");
  const fb = $("feedback");

  if (i === q.answer) {
    S.streak++;
    const dmg = B.heroDamage(S.streak);
    S.score += B.points.correct + (S.streak > 1 ? B.points.streak * Math.min(S.streak - 1, 5) : 0);
    fb.className = "feedback good";
    fb.textContent = S.streak > 1 ? `Correct! ${S.streak} in a row.` : "Correct!";
    sound.right();
    await heroAttack(dmg);
    if (S.monster.hp <= 0) await monsterDefeated();
    else ask();
  } else {
    buttons[i].classList.add("wrong");
    S.streak = 0;
    fb.className = "feedback bad";
    fb.innerHTML = `Not quite. <b>${esc(q.affix)}</b> means “${esc(q.options[q.answer])}”.`;
    sound.wrong();
    updateHud();
    await monsterAttack(B.monsterDamage(S.floor, S.monster.boss));
    if (S.hp <= 0) return gameOver();
    show("continueBtn");
    $("continueBtn").focus();
  }
}

async function heroAttack(dmg) {
  const run = play(S.hero, "attack", 800);
  await sleep(330);
  const m = S.monster;
  sound.slash();
  S.effects.push({ kind: "slash", x: MON_X, y: GROUND - (m.boss ? 34 : 22), t0: S.now, dur: 260 });
  sparks(MON_X, GROUND - (m.boss ? 34 : 22), ["#ffffff", "#ffd36b", "#7fd9ff"]);
  m.hp = Math.max(0, m.hp - dmg);
  S.numbers.push({ text: `-${dmg}`, x: MON_X, y: GROUND - (m.boss ? 70 : 50), color: "#ffd36b", t0: S.now });
  play(m, "hurt", 400);
  S.shake = 0.12;
  updateHud();
  await run;
}

async function monsterAttack(dmg) {
  const m = S.monster;
  const run = play(m, "attack", 700);
  await sleep(330);
  S.hp = Math.max(0, S.hp - dmg);
  sound.hurt();
  S.effects.push({ kind: "claw", x: HERO_X, y: GROUND - 18, t0: S.now, dur: 300 });
  sparks(HERO_X, GROUND - 18, ["#ff5c6c", "#ffffff"]);
  S.numbers.push({ text: `-${dmg}`, x: HERO_X, y: GROUND - 46, color: "#ff5c6c", t0: S.now });
  play(S.hero, "hurt", 600);
  S.shake = 0.25;
  updateHud();
  await run;
}

async function monsterDefeated() {
  const m = S.monster;
  sparks(MON_X, GROUND - 20, ["#ffffff", "#ffd36b", "#a970ff", "#7fd9ff"]);
  await play(m, "die", 700);
  S.score += m.boss ? B.points.boss : B.points.monster;
  S.monster = null;
  S.fight++;
  if (S.fight >= B.fightsPerFloor) return floorCleared();
  const heal = Math.min(B.healAfterMonster, B.heroMaxHp - S.hp);
  if (heal > 0) {
    S.hp += heal;
    S.numbers.push({ text: `+${heal}`, x: HERO_X, y: GROUND - 46, color: "#59d98e", t0: S.now });
  }
  updateHud();
  await sleep(350);
  await nextFight();
}

async function floorCleared() {
  show("panel", false);
  sound.win();
  await play(S.hero, "victory", 700);
  saveBest();
  if (S.floor === FLOORS.length - 1) {
    S.floor = FLOORS.length - 1;
    saveBest();
    const again = await banner("You conquered the dungeon!", `Final score ${S.score}. ${bestText()}`, {
      button: "Play again", alt: "Change hero",
    });
    return again === "main" ? startRun(S.lookKey) : toSelect();
  }
  const heal = Math.min(B.healAfterFloor, B.heroMaxHp - S.hp);
  S.hp += heal;
  updateHud();
  const healText = heal > 0 ? `+${heal} HP` : "HP full";
  await banner(`Floor ${S.floor + 1} cleared!`, `${healText} · hints refilled · score ${S.score}`, { button: "Next floor" });
  S.floor++;
  await enterFloor();
}

async function gameOver() {
  S.hero.dead = true;
  show("continueBtn", false);
  saveBest();
  await sleep(900);
  show("panel", false);
  const choice = await banner("You fell…", `Reached floor ${S.floor + 1} · score ${S.score}. ${bestText()}`, {
    button: "Try again", alt: "Change hero",
  });
  return choice === "main" ? startRun(S.lookKey) : toSelect();
}

function toSelect() {
  S.mode = "select";
  S.monster = null;
  show("hud", false);
  show("panel", false);
  show("titleScreen", false);
  show("selectScreen");
  document.querySelector(".hero-card")?.focus();
}

/* ----------------------------------------------------------------- input */

$("startBtn").onclick = toSelect;
for (const card of document.querySelectorAll(".hero-card")) {
  card.onclick = () => startRun(card.dataset.hero);
}
$("hintBtn").onclick = useHint;
$("continueBtn").onclick = () => {
  if (S.mode === "battle" && S.hp > 0 && !$("continueBtn").hidden) ask();
};
const mute = $("muteBtn");
mute.classList.toggle("off", !sound.on);
mute.onclick = () => {
  sound.on = !sound.on;
  store.set("rb.sound", sound.on);
  mute.classList.toggle("off", !sound.on);
};

document.addEventListener("keydown", (e) => {
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  if (S.mode !== "battle") return;
  if (/^[1-4]$/.test(e.key) && !S.busy) {
    e.preventDefault();
    answer(Number(e.key) - 1);
  } else if (e.key.toLowerCase() === "h") {
    useHint();
  } else if ((e.key === "Enter" || e.key === " ") && !$("continueBtn").hidden) {
    e.preventDefault();
    $("continueBtn").click();
  }
});

/* ------------------------------------------------------------------ boot */

async function boot() {
  requestAnimationFrame(frame);
  $("bestText").textContent = bestText();
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
