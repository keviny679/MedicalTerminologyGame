// Integer-only drawing helpers so every shape stays crisp pixel art (no anti-aliasing).

export function makeCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  return c;
}

export class Pen {
  constructor(g) {
    this.g = g;
  }
  rect(color, x, y, w = 1, h = 1) {
    this.g.fillStyle = color;
    this.g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }
  px(color, x, y) {
    this.rect(color, x, y, 1, 1);
  }
  ellipse(color, cx, cy, rx, ry) {
    cx = Math.round(cx);
    cy = Math.round(cy);
    this.g.fillStyle = color;
    for (let y = -ry; y <= ry; y++) {
      const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
      this.g.fillRect(cx - w, cy + y, w * 2 + 1, 1);
    }
  }
  circle(color, cx, cy, r) {
    this.ellipse(color, cx, cy, r, r);
  }
  // Scanline fill of a polygon given as [[x,y],...].
  poly(color, pts) {
    this.g.fillStyle = color;
    const ys = pts.map((p) => p[1]);
    const y0 = Math.floor(Math.min(...ys));
    const y1 = Math.ceil(Math.max(...ys));
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i];
        const [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= sy && by > sy) || (by <= sy && ay > sy)) {
          xs.push(ax + ((sy - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const a = Math.round(xs[i]);
        const b = Math.round(xs[i + 1]);
        if (b > a) this.g.fillRect(a, y, b - a, 1);
      }
    }
  }
  line(color, x0, y0, x1, y1, size = 1) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    this.g.fillStyle = color;
    for (;;) {
      this.g.fillRect(x0, y0, size, size);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
}

// Draw `src` onto g with a 1px outline of `color` around its opaque pixels.
const outlineScratch = makeCanvas(1, 1);
export function drawOutlined(g, src, x, y, color = "#0a0814", tint = null) {
  const s = outlineScratch;
  if (s.width !== src.width || s.height !== src.height) {
    s.width = src.width;
    s.height = src.height;
  }
  const sg = s.getContext("2d");
  sg.imageSmoothingEnabled = false;
  sg.globalCompositeOperation = "source-over";
  sg.clearRect(0, 0, s.width, s.height);
  sg.drawImage(src, 0, 0);
  sg.globalCompositeOperation = "source-in";
  sg.fillStyle = color;
  sg.fillRect(0, 0, s.width, s.height);
  x = Math.round(x);
  y = Math.round(y);
  for (const [ox, oy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) g.drawImage(s, x + ox, y + oy);
  g.drawImage(src, x, y);
  if (tint) {
    sg.globalCompositeOperation = "source-over";
    sg.clearRect(0, 0, s.width, s.height);
    sg.drawImage(src, 0, 0);
    sg.globalCompositeOperation = "source-in";
    sg.fillStyle = tint;
    sg.fillRect(0, 0, s.width, s.height);
    g.drawImage(s, x, y);
  }
}

// Tiny 3x5 font for floating damage numbers.
const DIGITS = {
  0: "111101101101111", 1: "010110010010111", 2: "111001111100111",
  3: "111001111001111", 4: "101101111001001", 5: "111100111001111",
  6: "111100111101111", 7: "111001010010010", 8: "111101111101111",
  9: "111101111001111", "-": "000000111000000", "+": "000010111010000",
};
export function drawNumber(pen, text, x, y, color, scale = 1) {
  let cx = Math.round(x - (text.length * 4 * scale) / 2);
  for (const ch of text) {
    const bits = DIGITS[ch];
    if (bits) {
      for (let i = 0; i < 15; i++) {
        if (bits[i] === "1") {
          const px = cx + (i % 3) * scale, py = Math.round(y) + Math.floor(i / 3) * scale;
          pen.rect("#0a0814", px + scale, py + scale, scale, scale);
          pen.rect(color, px, py, scale, scale);
        }
      }
    }
    cx += 4 * scale;
  }
}
