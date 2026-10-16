// All game art is drawn procedurally at low resolution, then scaled up crisply.
import { makeCanvas, Pen } from "./pixel.js";

export const W = 240;
export const H = 135;
export const GROUND = 120; // y of the characters' feet

/* ------------------------------------------------------------------ heroes */

export const HEROES = {
  male: {
    name: "Ren",
    label: "Male",
    skin: "#f1c29a", skinShade: "#d39a72",
    hair: "#1d1a2e", hairHi: "#3a3557",
    top: "#3557a6", topShade: "#243d7a", trim: "#e8ecf5",
    pants: "#4a4f63", pantsShade: "#363a4b",
    belt: "#c9a24a", feet: "#3a2a20", sock: "#e8ecf5",
    long: false,
  },
  female: {
    name: "Aiko",
    label: "Female",
    skin: "#f6cfae", skinShade: "#dca582",
    hair: "#20162c", hairHi: "#453559",
    top: "#f1ecef", topShade: "#c9c0cf", trim: "#d23a4a",
    pants: "#c8323f", pantsShade: "#93222e",
    belt: "#d23a4a", feet: "#3a2a20", sock: "#f1ecef",
    long: true,
  },
};

// Hand positions and sword angles (degrees, 0 = facing right, + = downward).
const POSES = {
  rest: { hand: [17, 20], angle: -40 },
  raise: { hand: [12, 8], angle: -135 },
  slash: { hand: [21, 17], angle: 8 },
  up: { hand: [14, 6], angle: -90 },
  hurt: { hand: [15, 21], angle: 60 },
};

export const HERO_BOX = { w: 48, h: 40, ox: 12, oy: 6 }; // feet at oy + 31

export function drawHero(canvas, look, { pose = "rest", step = 0, breathe = 0, blink = false } = {}) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  const p = new Pen(g);
  const o = HERO_BOX;
  const X = (x) => o.ox + x;
  const Y = (y) => o.oy + y;
  const b = breathe; // 0 or 1: upper body bob

  // long hair behind the body
  if (look.long) {
    p.rect(look.hair, X(7), Y(6 + b), 4, 17);
    p.rect(look.hair, X(6), Y(14 + b), 2, 8);
    p.rect(look.hairHi, X(8), Y(9 + b), 1, 10);
  }

  // back arm (sleeve peeking behind torso)
  p.rect(look.topShade, X(8), Y(16 + b), 2, 6);
  p.rect(look.skinShade, X(8), Y(22 + b), 2, 1);

  // legs / hakama with walk cycle
  const s = step; // -1, 0, 1
  p.poly(look.pants, [[X(9), Y(22)], [X(16), Y(22)], [X(17 + s), Y(29)], [X(8 - s), Y(29)]]);
  p.rect(look.pantsShade, X(12), Y(23), 1, 6);
  p.rect(look.sock, X(9 - s), Y(29), 2, 2);
  p.rect(look.sock, X(14 + s), Y(29), 2, 2);
  p.rect(look.feet, X(9 - s), Y(31), 3, 1);
  p.rect(look.feet, X(14 + s), Y(31), 3, 1);

  // torso
  p.rect(look.top, X(9), Y(15 + b), 7, 8 - b);
  p.rect(look.topShade, X(9), Y(15 + b), 2, 8 - b);
  p.px(look.trim, X(12), Y(15 + b));
  p.px(look.trim, X(13), Y(16 + b));
  p.px(look.trim, X(14), Y(15 + b));
  p.rect(look.trim, X(15), Y(15 + b), 1, 7 - b);
  p.rect(look.belt, X(9), Y(21), 7, 2);

  // head
  p.rect(look.skin, X(11), Y(14 + b), 3, 1);
  p.rect(look.skin, X(9), Y(6 + b), 7, 8);
  p.rect(look.skinShade, X(9), Y(12 + b), 2, 2);
  if (blink || pose === "hurt") {
    p.rect("#2a1a1a", X(13), Y(10 + b), 2, 1);
  } else {
    p.rect("#1a1320", X(14), Y(9 + b), 1, 2);
    p.px("#ffffff", X(14), Y(9 + b));
    if (look.long) p.px("#1a1320", X(15), Y(9 + b));
  }
  p.px(look.long ? "#f08b98" : look.skinShade, X(14), Y(12 + b));

  // hair on top
  p.rect(look.hair, X(8), Y(4 + b), 9, 3);
  p.rect(look.hair, X(8), Y(6 + b), 3, look.long ? 3 : 5);
  p.rect(look.hair, X(13), Y(7 + b), 3, 1);
  p.rect(look.hairHi, X(10), Y(4 + b), 4, 1);
  if (look.long) {
    p.rect(look.hair, X(15), Y(7 + b), 1, 3); // side lock
    p.rect("#d23a4a", X(5), Y(4 + b), 3, 3); // ribbon bow
    p.px("#ff6b7a", X(6), Y(5 + b));
    p.px("#d23a4a", X(7), Y(7 + b));
  } else {
    p.px(look.hair, X(9), Y(3 + b));
    p.px(look.hair, X(12), Y(3 + b));
    p.px(look.hair, X(15), Y(3 + b));
    p.px(look.hair, X(16), Y(6 + b));
  }

  // front arm + sword
  const ps = POSES[pose] || POSES.rest;
  const [hx, hy] = ps.hand;
  p.line(look.top, X(13), Y(16 + b), X(hx), Y(hy + (pose === "rest" ? b : 0)), 2);
  p.rect(look.skin, X(hx), Y(hy + (pose === "rest" ? b : 0)), 2, 2);
  const a = (ps.angle * Math.PI) / 180;
  const sx = X(hx) + 1, sy = Y(hy) + 1 + (pose === "rest" ? b : 0);
  const at = (t) => [sx + Math.cos(a) * t, sy + Math.sin(a) * t];
  for (let t = -2; t <= 15; t++) {
    const [x, y] = at(t);
    const c = t < 1 ? "#3b2418" : t < 2 ? "#e0b84a" : t === 15 ? "#ffffff" : "#d6e2f0";
    p.px(c, x, y);
    if (t >= 2 && t < 14) {
      const [x2, y2] = [x + Math.round(-Math.sin(a)), y + Math.round(Math.cos(a))];
      p.px("#93a4bd", x2, y2);
    }
  }
}

/* ---------------------------------------------------------------- monsters */

export const MONSTER_BOX = 72; // square canvas, feet at bottom-center

const NORMAL = {
  lantern: { name: "Chochin-obake" },
  wisp: { name: "Hitodama" },
  umbrella: { name: "Kasa-obake" },
};
const BOSSES = {
  cat: { name: "Bakeneko" },
  oni: { name: "Oni" },
  fox: { name: "Kyubi Kitsune" },
  dragon: { name: "Ryujin" },
};
export const MONSTER_NAMES = { ...NORMAL, ...BOSSES };

// t: seconds since spawn (for idle animation)
export function drawMonster(canvas, type, t) {
  const g = canvas.getContext("2d");
  g.clearRect(0, 0, canvas.width, canvas.height);
  const p = new Pen(g);
  const S = MONSTER_BOX;
  const cx = S / 2;
  const foot = S - 2;
  const bob = Math.round(Math.sin(t * 3) * 1.5);
  const blink = t % 3.2 > 3.05;

  if (type === "lantern") {
    const y = foot - 16 + bob;
    p.ellipse("#ffcf7a", cx, y, 10, 12);
    p.ellipse("#fff0c2", cx + 2, y - 2, 6, 8);
    for (let r = -9; r <= 9; r += 3) p.rect("#d88a3a", cx - 10, y + r, 21, 1);
    p.rect("#2a1d2e", cx - 6, y - 14, 13, 3);
    p.rect("#2a1d2e", cx - 6, y + 12, 13, 3);
    p.rect("#2a1d2e", cx - 1, y - 18, 3, 4);
    // single big eye
    p.ellipse("#ffffff", cx - 3, y - 3, 3, blink ? 0 : 3);
    if (!blink) p.rect("#1a0f18", cx - 5, y - 4, 2, 3);
    // mouth + tongue
    p.rect("#5a1020", cx - 7, y + 4, 8, 2);
    const wag = Math.round(Math.sin(t * 5));
    p.rect("#e2455a", cx - 6 + wag, y + 6, 3, 6);
    p.px("#ff8a9a", cx - 5 + wag, y + 7);
  } else if (type === "wisp") {
    const y = foot - 22 + bob * 2;
    const f = Math.round(Math.sin(t * 9) * 2);
    p.poly("#4fb6ff", [[cx - 9, y], [cx + 9, y], [cx + 12 + f, y - 20], [cx + 3, y - 12], [cx - 1 - f, y - 24]]);
    p.circle("#4fb6ff", cx, y + 2, 10);
    p.circle("#a9e3ff", cx - 1, y + 3, 7);
    p.circle("#ffffff", cx - 2, y + 4, 4);
    if (!blink) {
      p.rect("#16304f", cx - 6, y + 1, 2, 3);
      p.rect("#16304f", cx, y + 1, 2, 3);
    }
    p.rect("#16304f", cx - 4, y + 7, 3, 1);
  } else if (type === "umbrella") {
    const hop = Math.abs(Math.round(Math.sin(t * 4) * 3));
    const y = foot - 30 - hop;
    p.poly("#7a3fb0", [[cx, y - 8], [cx + 15, y + 12], [cx - 15, y + 12]]);
    p.poly("#9c5bd6", [[cx, y - 8], [cx + 5, y + 12], [cx - 5, y + 12]]);
    for (const dx of [-10, 0, 10]) p.line("#4a2370", cx, y - 8, cx + dx, y + 12);
    p.rect("#4a2370", cx - 15, y + 12, 31, 2);
    p.ellipse("#ffffff", cx - 4, y + 4, 3, blink ? 0 : 3);
    if (!blink) p.rect("#140a1e", cx - 6, y + 3, 2, 3);
    p.rect("#e2455a", cx + 2, y + 9, 3, 7);
    // single leg with geta sandal
    p.rect("#d8b48a", cx - 1, y + 14, 2, 12 + hop);
    p.rect("#5a3a22", cx - 4, foot - 2, 8, 2);
    p.rect("#5a3a22", cx - 3, foot, 2, 2);
    p.rect("#5a3a22", cx + 1, foot, 2, 2);
  } else if (type === "cat") {
    const y = foot;
    // twin tails
    const sw = Math.sin(t * 2.5) * 4;
    p.line("#1b1626", cx + 12, y - 8, cx + 24 + sw, y - 26, 3);
    p.line("#1b1626", cx + 12, y - 8, cx + 28 - sw, y - 18, 3);
    p.circle("#a970ff", cx + 26 + sw, y - 28, 2 + Math.round(Math.abs(Math.sin(t * 6))));
    p.circle("#a970ff", cx + 30 - sw, y - 20, 2);
    p.ellipse("#1b1626", cx + 2, y - 12, 15, 12);
    p.ellipse("#2b2440", cx - 2, y - 10, 8, 9);
    const hy = y - 30 + bob;
    p.circle("#1b1626", cx - 6, hy, 11);
    p.poly("#1b1626", [[cx - 17, hy - 2], [cx - 15, hy - 18], [cx - 7, hy - 9]]);
    p.poly("#1b1626", [[cx - 2, hy - 9], [cx + 4, hy - 18], [cx + 5, hy - 1]]);
    p.poly("#e86a8a", [[cx - 14, hy - 5], [cx - 13, hy - 13], [cx - 10, hy - 8]]);
    if (!blink) {
      p.ellipse("#ffe14d", cx - 11, hy, 3, 3);
      p.ellipse("#ffe14d", cx - 2, hy, 3, 3);
      p.rect("#1b1626", cx - 11, hy - 2, 1, 5);
      p.rect("#1b1626", cx - 2, hy - 2, 1, 5);
    } else {
      p.rect("#ffe14d", cx - 13, hy, 5, 1);
      p.rect("#ffe14d", cx - 4, hy, 5, 1);
    }
    p.px("#e86a8a", cx - 7, hy + 4);
    p.rect("#ffffff", cx - 9, hy + 6, 1, 2);
    p.rect("#ffffff", cx - 5, hy + 6, 1, 2);
    for (const d of [-1, 1]) p.line("#8c84a6", cx - 7, hy + 5, cx - 7 - 9, hy + 4 + d * 2);
    p.rect("#1b1626", cx - 12, y - 4, 6, 4);
    p.rect("#1b1626", cx + 2, y - 4, 6, 4);
  } else if (type === "oni") {
    const y = foot;
    // kanabo club
    const sw = Math.round(Math.sin(t * 2) * 2);
    p.line("#5b5f6e", cx - 16, y - 34 + sw, cx - 26, y - 62 + sw, 5);
    for (let i = 0; i < 6; i++) p.px("#c9cbd6", cx - 18 - i * 2, y - 40 - i * 4 + sw);
    p.rect("#b2302e", cx - 8, y - 14, 6, 14);
    p.rect("#b2302e", cx + 3, y - 14, 6, 14);
    p.rect("#f2c94c", cx - 11, y - 22, 22, 9);
    for (let i = 0; i < 4; i++) p.rect("#1b1626", cx - 9 + i * 6, y - 22, 2, 9);
    p.ellipse("#d33b37", cx, y - 32, 14, 11);
    p.rect("#f05a52", cx - 6, y - 38, 4, 8);
    p.line("#d33b37", cx - 12, y - 34, cx - 17, y - 26 + sw, 4);
    p.line("#d33b37", cx + 12, y - 34, cx + 16, y - 22, 4);
    const hy = y - 50 + bob;
    p.ellipse("#d33b37", cx - 1, hy, 10, 10);
    p.poly("#f3ead2", [[cx - 9, hy - 6], [cx - 14, hy - 18], [cx - 5, hy - 9]]);
    p.poly("#f3ead2", [[cx + 3, hy - 9], [cx + 10, hy - 18], [cx + 7, hy - 5]]);
    p.rect("#1b1626", cx - 10, hy - 9, 20, 3);
    p.rect("#1b1626", cx - 11, hy - 10, 5, 8);
    if (!blink) {
      p.rect("#ffe14d", cx - 8, hy - 3, 4, 3);
      p.rect("#ffe14d", cx + 1, hy - 3, 4, 3);
      p.px("#1b1626", cx - 8, hy - 2);
      p.px("#1b1626", cx + 1, hy - 2);
    }
    p.rect("#5a1020", cx - 6, hy + 4, 11, 3);
    p.rect("#ffffff", cx - 6, hy + 4, 2, 2);
    p.rect("#ffffff", cx + 3, hy + 4, 2, 2);
  } else if (type === "fox") {
    const y = foot;
    for (let i = 0; i < 9; i++) {
      const a = (-30 + i * 14 + Math.sin(t * 2 + i) * 4) * (Math.PI / 180);
      const tx = cx + 10 + Math.cos(a - Math.PI / 2) * 22;
      const ty = y - 16 + Math.sin(a - Math.PI / 2) * 22;
      p.line("#f1ecf4", cx + 8, y - 14, tx, ty, 4);
      p.circle("#ffb4cf", tx, ty, 2);
    }
    p.ellipse("#f1ecf4", cx + 2, y - 12, 12, 12);
    p.ellipse("#ffffff", cx - 3, y - 12, 6, 9);
    const hy = y - 32 + bob;
    p.ellipse("#f1ecf4", cx - 4, hy, 9, 8);
    p.poly("#f1ecf4", [[cx - 13, hy + 1], [cx - 21, hy + 5], [cx - 11, hy + 6]]);
    p.poly("#f1ecf4", [[cx - 11, hy - 4], [cx - 12, hy - 16], [cx - 4, hy - 7]]);
    p.poly("#f1ecf4", [[cx - 1, hy - 7], [cx + 3, hy - 17], [cx + 4, hy - 3]]);
    p.poly("#e04a6a", [[cx - 10, hy - 6], [cx - 11, hy - 12], [cx - 7, hy - 7]]);
    p.px("#1b1626", cx - 21, hy + 5);
    if (!blink) {
      p.rect("#e04a6a", cx - 10, hy - 1, 3, 1);
      p.rect("#e04a6a", cx - 4, hy - 1, 3, 1);
      p.px("#1b1626", cx - 9, hy);
      p.px("#1b1626", cx - 3, hy);
    }
    p.rect("#e04a6a", cx - 5, hy - 5, 1, 2);
    p.rect("#f1ecf4", cx - 8, y - 4, 4, 4);
    p.rect("#f1ecf4", cx + 4, y - 4, 4, 4);
    // floating fox-fire
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + (i * Math.PI * 2) / 3;
      p.circle("#7fd9ff", cx + Math.cos(a) * 20, y - 30 + Math.sin(a) * 6, 2);
    }
  } else if (type === "dragon") {
    const segs = 11;
    for (let i = segs; i >= 0; i--) {
      const u = i / segs;
      const x = cx + 18 - u * 6 + Math.sin(t * 2 + u * 6) * 10 * (1 - u * 0.5);
      const y = foot - 4 - u * 46;
      const r = 8 - Math.round(u * 2);
      p.circle("#1f8a8a", x, y, r);
      p.circle("#36b5a8", x - 2, y - 1, r - 3);
      p.px("#bff3e4", x - 3, y - 2);
      if (i % 2 === 0) p.poly("#f2c94c", [[x + r - 1, y - 2], [x + r + 5, y - 5], [x + r - 1, y + 3]]);
    }
    const hx = cx - 4 + Math.round(Math.sin(t * 2) * 3), hy = foot - 54 + bob;
    p.ellipse("#1f8a8a", hx, hy, 12, 8);
    p.poly("#1f8a8a", [[hx - 10, hy - 3], [hx - 24, hy + 1], [hx - 22, hy + 6], [hx - 8, hy + 6]]);
    p.rect("#f3ead2", hx - 22, hy + 5, 12, 2);
    for (let i = 0; i < 4; i++) p.px("#ffffff", hx - 21 + i * 3, hy + 7);
    p.line("#f2c94c", hx + 2, hy - 6, hx + 12, hy - 18, 2);
    p.line("#f2c94c", hx + 7, hy - 5, hx + 18, hy - 13, 2);
    const wh = Math.sin(t * 3) * 3;
    p.line("#f2c94c", hx - 20, hy + 2, hx - 32, hy - 4 + wh);
    p.line("#f2c94c", hx - 18, hy + 4, hx - 30, hy + 10 - wh);
    if (!blink) {
      p.rect("#ff4d4d", hx - 7, hy - 3, 4, 3);
      p.px("#ffffff", hx - 7, hy - 3);
    }
    p.rect("#bff3e4", hx - 2, hy + 2, 8, 2);
    // pearl
    p.circle("#e8f4ff", hx - 30, hy + 18 + bob, 3);
    p.px("#ffffff", hx - 31, hy + 17 + bob);
  }
}

/* ------------------------------------------------------------------ floors */

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

function skyBands(p, colors, top, bottom) {
  const h = (bottom - top) / colors.length;
  colors.forEach((c, i) => p.rect(c, 0, Math.round(top + i * h), W, Math.ceil(h) + 1));
}

function stars(p, n, maxY, r, color = "#cdd8ff") {
  for (let i = 0; i < n; i++) p.px(color, Math.floor(r() * W), Math.floor(r() * maxY));
}

function lanternAlley(p, r) {
  skyBands(p, ["#070a1f", "#0b1030", "#101845", "#16215a", "#1d2b6b"], 0, 80);
  stars(p, 40, 60, r);
  p.circle("#e9eec8", 200, 20, 9);
  p.circle("#c7cfa6", 197, 18, 2);
  p.circle("#c7cfa6", 203, 23, 1);
  // far skyline
  for (let x = 0; x < W; x += 12 + Math.floor(r() * 10)) {
    const h = 15 + Math.floor(r() * 30);
    p.rect("#141d4a", x, 80 - h, 10 + Math.floor(r() * 8), h);
    for (let wy = 80 - h + 3; wy < 76; wy += 4) if (r() > 0.5) p.px("#5f7fd8", x + 2 + Math.floor(r() * 6), wy);
  }
  // neighbouring houses
  p.rect("#0f1638", 0, 76, W, 26);
  for (let x = 0; x < W; x += 6) p.rect("#151d45", x, 78, 3, 20);
  // shop building
  p.rect("#121838", 30, 50, 150, 70);
  p.poly("#1f2852", [[20, 52], [190, 52], [175, 38], [35, 38]]);
  for (let x = 36; x < 176; x += 4) p.rect("#2c3870", x, 40, 1, 12);
  p.rect("#0b0f26", 20, 52, 170, 3);
  // black cat on the roof
  p.rect("#05060f", 140, 32, 5, 6);
  p.rect("#05060f", 140, 30, 1, 2);
  p.rect("#05060f", 144, 30, 1, 2);
  p.line("#05060f", 145, 37, 149, 33);
  // shop windows (warm light)
  p.rect("#3a2b2a", 40, 62, 60, 40);
  p.rect("#f2a65a", 43, 66, 54, 30);
  p.rect("#ffd08a", 45, 68, 20, 12);
  for (let x = 43; x < 97; x += 9) p.rect("#c97b3a", x, 66, 1, 30);
  p.rect("#7a2a30", 38, 58, 64, 4);
  for (let x = 38; x < 102; x += 8) p.rect("#e8e2d8", x, 58, 4, 4);
  p.rect("#2a3a6a", 110, 64, 60, 38);
  p.rect("#4f6fb8", 114, 68, 52, 26);
  p.rect("#86a6e8", 116, 70, 18, 8);
  // kanji-ish sign
  p.rect("#d8d8e8", 116, 58, 46, 5);
  for (let x = 118; x < 160; x += 6) p.rect("#2a3a6a", x, 59, 3, 3);
  // street + reflections
  p.rect("#0c1230", 0, 102, W, 33);
  p.rect("#1a2450", 0, 102, W, 2);
  for (let i = 0; i < 18; i++) {
    const x = Math.floor(r() * W), y = 108 + Math.floor(r() * 24);
    p.rect(r() > 0.5 ? "#f2a65a" : "#3b55a8", x, y, 4 + Math.floor(r() * 8), 1);
  }
}
const LANTERNS_1 = [[50, 46], [70, 46], [90, 46]];

function toriiPath(p, r) {
  skyBands(p, ["#06110f", "#0a1a17", "#0f241f", "#143029", "#1a3b32"], 0, 90);
  stars(p, 25, 50, r, "#bde8d4");
  // forest silhouettes
  for (let x = -10; x < W; x += 14) {
    const h = 30 + Math.floor(r() * 25);
    p.poly("#0a1f1a", [[x, 95], [x + 10, 95 - h], [x + 20, 95]]);
  }
  p.rect("#0a1f1a", 0, 90, W, 10);
  // path receding to vanishing point
  p.poly("#2c3034", [[0, 135], [W, 135], [140, 92], [100, 92]]);
  p.poly("#3a3f45", [[30, 135], [210, 135], [132, 92], [108, 92]]);
  for (let y = 96; y < 135; y += 5) p.rect("#2c3034", 0, y, W, 1);
  p.rect("#0d201b", 0, 92, 100, 4);
  // torii gates: far to near
  const gates = [0.25, 0.4, 0.6, 0.85, 1.15];
  for (const s of gates) {
    const cx = 120;
    const base = 92 + 40 * (s - 0.25);
    const hw = Math.round(30 * s), h = Math.round(56 * s), post = Math.max(2, Math.round(4 * s));
    const red = s < 0.5 ? "#7a1c24" : "#c8323a";
    p.rect(red, cx - hw, base - h, post, h);
    p.rect(red, cx + hw - post, base - h, post, h);
    p.rect(red, cx - hw - 3 * s, base - h + 8 * s, hw * 2 + 6 * s, Math.max(1, 3 * s));
    p.rect("#1b1418", cx - hw - 6 * s, base - h - 2 * s, hw * 2 + 12 * s, Math.max(1, 4 * s));
    p.rect(red, cx - hw - 5 * s, base - h + 2 * s, hw * 2 + 10 * s, Math.max(1, 2 * s));
  }
  // stone lanterns
  for (const x of [22, 206]) {
    p.rect("#5c6168", x, 96, 12, 3);
    p.rect("#5c6168", x + 4, 99, 4, 14);
    p.rect("#6c7178", x + 1, 88, 10, 8);
    p.rect("#ffd36b", x + 3, 90, 6, 4);
    p.poly("#4a4f56", [[x - 2, 88], [x + 14, 88], [x + 6, 82]]);
    p.rect("#5c6168", x, 113, 12, 3);
  }
}

function sakuraTemple(p, r) {
  skyBands(p, ["#f7c9a8", "#f4b6a0", "#eba08f", "#d98a8a", "#c27a8a", "#a46e8c"], 0, 86);
  p.circle("#ff8a3d", 120, 42, 9);
  p.circle("#ffa25e", 118, 40, 5);
  // mountains
  p.poly("#a684a8", [[0, 86], [40, 52], [80, 74], [130, 48], [190, 70], [240, 56], [240, 86]]);
  p.poly("#8a6a96", [[0, 86], [30, 70], [70, 80], [150, 64], [210, 78], [240, 72], [240, 86]]);
  // pagodas
  const pagoda = (x, tiers, w) => {
    let y = 86;
    for (let i = 0; i < tiers; i++) {
      const tw = w - i * 3;
      p.rect("#3b2333", x - tw / 2 + 3, y - 6, tw - 6, 6);
      p.rect("#8a2f3a", x - tw / 2 + 4, y - 5, 2, 4);
      p.poly("#2a1826", [[x - tw / 2 - 3, y - 6], [x + tw / 2 + 3, y - 6], [x + tw / 2 - 3, y - 10], [x - tw / 2 + 3, y - 10]]);
      y -= 10;
    }
    p.rect("#2a1826", x - 1, y - 10, 2, 10);
  };
  pagoda(40, 5, 24);
  pagoda(200, 4, 22);
  // temple hall
  p.rect("#3b2333", 70, 74, 50, 12);
  for (let x = 72; x < 120; x += 6) p.rect("#8a2f3a", x, 76, 2, 10);
  p.poly("#2a1826", [[62, 75], [128, 75], [120, 66], [70, 66]]);
  // water with reflection stripes
  p.rect("#5b4a6e", 0, 86, W, 49);
  for (let y = 88; y < 135; y += 3) {
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * W);
      p.rect(r() > 0.6 ? "#f4b6a0" : "#7a6390", x, y, 6 + Math.floor(r() * 14), 1);
    }
  }
  p.rect("#ff8a3d", 116, 92, 8, 1);
  p.rect("#ff8a3d", 114, 96, 12, 1);
  // near shore + blossom branches
  p.rect("#3a2a3a", 0, 118, W, 17);
  p.rect("#4e3a4c", 0, 118, W, 2);
  const blossom = (x, y, n) => {
    for (let i = 0; i < n; i++) {
      const bx = x + Math.floor((r() - 0.5) * 30), by = y + Math.floor((r() - 0.5) * 14);
      p.circle(r() > 0.5 ? "#f7c1d4" : "#e98bb0", bx, by, 2 + Math.floor(r() * 3));
    }
  };
  p.line("#3b2430", 0, 8, 60, 16, 2);
  p.line("#3b2430", 60, 16, 90, 6, 2);
  p.line("#3b2430", W, 12, 180, 20, 2);
  blossom(30, 12, 10);
  blossom(80, 10, 8);
  blossom(205, 16, 10);
}

function moonWave(p, r) {
  skyBands(p, ["#050b1e", "#071028", "#0a1634", "#0e1f4a"], 0, 100);
  stars(p, 50, 90, r, "#9fb8ff");
  // great wave spiral around the moon
  const mx = 150, my = 40;
  const shades = ["#123e5c", "#1f6f8b", "#3fa7b5", "#8fe0d8", "#e8fff8"];
  for (let a = 0; a < Math.PI * 4.2; a += 0.012) {
    const rad = 14 + a * 6.5;
    const band = Math.min(4, Math.floor((Math.sin(a * 3) + 1) * 2.5));
    const thick = 4 + a * 1.4;
    for (let k = 0; k < thick; k++) {
      const rr = rad + k;
      const x = mx + Math.cos(a + 2.2) * rr * 1.25;
      const y = my + Math.sin(a + 2.2) * rr * 0.8;
      if (y < 108 && x > -5 && x < W + 5) {
        p.px(shades[Math.max(0, band - Math.floor(k / 6))], x, y);
      }
    }
  }
  // foam claws on the crest
  for (let i = 0; i < 40; i++) {
    const a = 2.2 + Math.PI * 3.3 + r() * 1.6;
    const rad = 14 + (a - 2.2) * 6.5;
    p.px("#ffffff", mx + Math.cos(a) * rad * 1.25, my + Math.sin(a) * rad * 0.8);
  }
  p.circle("#f4f1d0", mx, my, 9);
  p.circle("#c9d6b0", mx - 3, my - 2, 2);
  p.circle("#c9d6b0", mx + 3, my + 3, 2);
  p.px("#c9d6b0", mx + 4, my - 4);
  // rooftops in the foreground
  for (let x = -10; x < W; x += 34) {
    const y = 96 + Math.floor(r() * 6);
    p.poly("#0f2436", [[x, y + 6], [x + 36, y + 6], [x + 30, y - 4], [x + 6, y - 4]]);
    for (let lx = x + 4; lx < x + 34; lx += 3) p.px("#1d3b55", lx, y + 2);
  }
  p.rect("#0a1828", 0, 104, W, 31);
  p.rect("#173350", 0, 104, W, 2);
  for (let i = 0; i < 20; i++) p.rect("#1d3b55", Math.floor(r() * W), 108 + Math.floor(r() * 26), 6, 1);
}

export const FLOORS = [
  {
    name: "Lantern Alley", draw: lanternAlley, base: "#0c1230", seed: 11, particle: "rain",
    normals: ["lantern", "wisp", "umbrella"], boss: "cat", lanterns: LANTERNS_1,
  },
  { name: "Torii Path", draw: toriiPath, base: "#0d201b", seed: 23, particle: "fireflies", normals: ["wisp", "umbrella", "lantern"], boss: "oni" },
  { name: "Sakura Temple", draw: sakuraTemple, base: "#3a2a3a", seed: 37, particle: "petals", normals: ["umbrella", "lantern", "wisp"], boss: "fox" },
  { name: "Moonlit Wave", draw: moonWave, base: "#0a1828", seed: 53, particle: "spray", normals: ["wisp", "lantern", "umbrella"], boss: "dragon" },
];

const bgCache = new Map();
export function floorBackground(i) {
  if (!bgCache.has(i)) {
    const c = makeCanvas(W, H);
    const f = FLOORS[i];
    c.getContext("2d").fillStyle = f.base;
    c.getContext("2d").fillRect(0, 0, W, H);
    f.draw(new Pen(c.getContext("2d")), rng(f.seed));
    bgCache.set(i, c);
  }
  return bgCache.get(i);
}

// Animated overlay: lantern flicker and weather particles.
export function drawAmbient(p, floorIndex, t, parts) {
  const f = FLOORS[floorIndex];
  if (f.lanterns) {
    for (const [x, y] of f.lanterns) {
      const glow = Math.sin(t * 6 + x) > 0.6 ? "#ffe8a8" : "#ffd36b";
      p.rect("#2a1d2e", x + 2, y - 2, 2, 2);
      p.ellipse("#e2455a", x + 3, y + 4, 4, 5);
      p.rect(glow, x + 1, y + 2, 4, 4);
      p.rect("#2a1d2e", x, y + 9, 7, 1);
    }
  }
  for (const q of parts) {
    if (f.particle === "rain") p.rect("#8fb3ff", q.x, q.y, 1, 3);
    else if (f.particle === "fireflies") p.px(Math.sin(t * 4 + q.x) > 0 ? "#e8ff8a" : "#9fbf4a", q.x, q.y);
    else if (f.particle === "petals") p.rect(q.s > 0.5 ? "#f7c1d4" : "#e98bb0", q.x, q.y, 2, 1);
    else p.px(q.s > 0.5 ? "#e8fff8" : "#8fe0d8", q.x, q.y);
  }
}

export function stepParticles(parts, floorIndex, dt, t) {
  const kind = FLOORS[floorIndex].particle;
  const want = kind === "rain" ? 70 : kind === "spray" ? 40 : 28;
  while (parts.length < want) {
    parts.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() });
  }
  for (const q of parts) {
    if (kind === "rain") { q.x -= 20 * dt; q.y += 140 * dt; }
    else if (kind === "fireflies") { q.x += Math.sin(t + q.s * 10) * 8 * dt; q.y += Math.cos(t * 0.7 + q.s * 7) * 6 * dt; }
    else if (kind === "petals") { q.x -= (18 + q.s * 12) * dt; q.y += (10 + Math.sin(t * 2 + q.s * 9) * 8) * dt; }
    else { q.x += (10 + q.s * 20) * dt; q.y -= (4 + q.s * 6) * dt; }
    if (q.y > H) { q.y = -3; q.x = Math.random() * W; }
    if (q.y < -4) { q.y = H; }
    if (q.x < -4) q.x = W + 2;
    if (q.x > W + 4) q.x = -2;
  }
}
