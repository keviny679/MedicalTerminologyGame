// Original, hand-drawn schematic anatomy diagrams for the study mode.
// Region: { label, d (filled path) | line (stroked path), c: color, tip: [x,y], lab: [x,y] }
//   tip = the point a label's leader line touches, lab = where the label text sits.
// Group: { label, members: [regionIds], tip, lab } highlights several regions together.

// Mirror every "x,y" pair in an absolute path around x = W/2.
const mx = (d, W) => {
  if (/[aA]/.test(d)) throw new Error("mx() can't mirror arc commands");
  return mirrorPairs(d, W);
};
const mirrorPairs = (d, W) => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(W - x).toFixed(1)},${y}`);
const sym = (d, W) => `${d} ${mx(d, W)}`;

const BONE = "#e9e2cf", BONE2 = "#ddd3b8", BONE3 = "#cfc39f";

/* ===================================================================== SKULL */

const skullLateral = {
  crop: [46, 18, 214, 210],
  title: "Skull, lateral view (face to the left)",
  ask: "Name the highlighted part of the skull.",
  viewBox: "0 0 330 250",
  base:
    // orbit, nasal opening shadow, ear canal and teeth
    '<ellipse cx="86" cy="124" rx="17" ry="15" class="hole"/>',
  regions: {
    frontal: {
      label: "Frontal bone", c: "#f0a8c8",
      d: "M66,114 C56,80 78,38 130,28 C126,55 116,85 112,108 L106,118 L100,121 C96,112 88,108 80,108 C74,108 70,111 68,114 Z",
      tip: [92, 64], lab: [40, 52],
    },
    parietal: {
      label: "Parietal bone", c: "#8fe0e0",
      d: "M130,28 C174,22 210,36 226,64 L236,108 C216,100 188,96 162,98 C148,99 136,101 126,104 L112,108 C116,85 126,55 130,28 Z",
      tip: [184, 58], lab: [262, 30],
    },
    sphenoid: {
      label: "Sphenoid bone", c: "#9a8fd8",
      d: "M112,108 L126,104 C129,116 128,128 124,140 L108,142 C104,132 106,118 112,108 Z",
      tip: [116, 124], lab: [40, 96],
    },
    temporal: {
      label: "Temporal bone", c: "#f2c27a",
      d: "M126,104 C136,101 148,99 162,98 C188,96 216,100 236,108 L228,140 C222,150 216,160 208,166 L198,166 C190,160 180,158 172,158 L152,156 L152,150 L124,148 L124,140 C128,128 129,116 126,104 Z",
      tip: [200, 118], lab: [262, 150],
    },
    occipital: {
      label: "Occipital bone", c: "#8fd88f",
      d: "M226,64 C246,80 254,110 246,138 C240,156 228,170 212,178 L204,178 L208,166 C216,160 222,150 228,140 L236,108 Z",
      tip: [238, 110], lab: [262, 98],
    },
    mastoid: {
      label: "Mastoid process", c: "#e8ad5e",
      d: "M198,166 L208,166 L206,184 C204,190 198,190 196,184 Z",
      tip: [202, 178], lab: [262, 196],
    },
    meatus: {
      label: "External acoustic meatus", c: "#3a3322",
      d: "M174,140 C174,132 186,132 186,140 C186,148 174,148 174,140 Z",
      tip: [180, 140], lab: [262, 172],
    },
    zygomatic: {
      label: "Zygomatic bone", c: "#9fd8a8",
      d: "M100,121 L106,118 L112,128 L124,140 L124,148 L152,150 L152,156 L122,154 L108,156 C100,162 90,162 82,156 L80,146 C92,146 100,138 102,128 Z",
      tip: [100, 150], lab: [40, 196],
    },
    ethmoid: {
      label: "Ethmoid bone", c: "#7fd0a0",
      d: "M76,114 L84,112 L84,126 L76,128 Z",
      tip: [80, 120], lab: [40, 118],
    },
    lacrimal: {
      label: "Lacrimal bone", c: "#7fb8e0",
      d: "M70,118 L76,116 L76,130 L71,132 Z",
      tip: [73, 126], lab: [40, 140],
    },
    nasal: {
      label: "Nasal bone", c: "#ff7fa8",
      d: "M62,116 L68,114 L68,138 L54,144 C56,134 59,124 62,116 Z",
      tip: [62, 132], lab: [40, 162],
    },
    maxilla: {
      label: "Maxilla", c: "#c7b3e8",
      d: "M54,144 L68,138 L71,132 L76,142 L82,156 C90,162 100,162 108,156 L122,154 L124,170 L122,186 L64,190 C58,178 52,164 54,144 Z",
      tip: [94, 172], lab: [40, 218],
    },
    mandible: {
      label: "Mandible", c: "#f5b39a",
      d: "M62,198 L124,196 L136,176 L140,156 L148,170 L160,152 L170,150 L168,162 L162,196 C160,206 156,214 148,216 L104,220 C84,220 68,214 62,198 Z",
      tip: [110, 208], lab: [88, 240],
    },
    coronal: {
      label: "Coronal suture", line: "M130,28 C126,55 116,85 112,108", w: 3, c: "#5b4a3a",
      tip: [124, 60], lab: [150, 14],
    },
    squamous: {
      label: "Squamous suture", line: "M126,104 C136,101 148,99 162,98 C188,96 216,100 236,108", w: 3, c: "#5b4a3a",
      tip: [170, 98], lab: [262, 128],
    },
    lambdoid: {
      label: "Lambdoid suture", line: "M226,64 L236,108 L228,140", w: 3, c: "#5b4a3a",
      tip: [231, 84], lab: [262, 76],
    },
  },
  groups: {
    cranium: {
      label: "Cranium (cranial bones)", members: ["frontal", "parietal", "temporal", "occipital", "sphenoid", "ethmoid", "mastoid"],
      tip: [160, 40], lab: [200, 14],
    },
    facial: {
      label: "Facial bones", members: ["nasal", "lacrimal", "zygomatic", "maxilla", "mandible"],
      tip: [96, 182], lab: [40, 240],
    },
  },
  overlay:
    '<path d="M68,188 h52 M68,194 h52" class="detail"/>' +
    [70, 78, 86, 94, 102, 110, 118].map((x) => `<path d="M${x},186 v12" class="detail"/>`).join("") +
    '<circle cx="82" cy="208" r="2" class="hole"/>',
};

const skullAnterior = {
  crop: [72, 16, 186, 256],
  title: "Skull, anterior view",
  ask: "Name the highlighted bone.",
  viewBox: "0 0 330 290",
  base:
    '<ellipse cx="128" cy="140" rx="27" ry="25" class="hole"/><ellipse cx="202" cy="140" rx="27" ry="25" class="hole"/>' +
    '<path d="M154,162 C144,182 144,202 156,208 L174,208 C186,202 186,182 176,162 L165,168 Z" class="hole"/>',
  regions: {
    frontal: {
      label: "Frontal bone", c: "#f0a8c8",
      d: "M165,22 C117,22 87,56 85,104 L92,122 C102,110 122,106 140,112 L154,120 L165,121 L176,120 L190,112 C208,106 228,110 238,122 L245,104 C243,56 213,22 165,22 Z",
      tip: [165, 64], lab: [40, 52],
    },
    parietal: {
      label: "Parietal bone", c: "#8fe0e0",
      d: sym("M85,104 C86,74 98,48 120,32 C96,44 80,74 80,104 Z", 330),
      tip: [86, 80], lab: [40, 84],
    },
    temporal: {
      label: "Temporal bone", c: "#f2c27a",
      d: sym("M80,108 L88,124 L90,154 L78,154 C74,140 74,124 80,108 Z", 330),
      tip: [83, 138], lab: [40, 120],
    },
    sphenoid: {
      label: "Sphenoid bone", c: "#9a8fd8",
      d: sym("M110,130 L128,124 L132,146 L114,152 Z", 330),
      tip: [120, 138], lab: [290, 96],
    },
    ethmoid: {
      label: "Ethmoid bone", c: "#7fd0a0",
      d: `${sym("M140,128 L148,130 L148,150 L141,152 Z", 330)} M162,170 L168,170 L168,186 L162,186 Z`,
      tip: [146, 140], lab: [290, 118],
    },
    lacrimal: {
      label: "Lacrimal bone", c: "#7fb8e0",
      d: sym("M141,152 L148,150 L150,161 L143,163 Z", 330),
      tip: [146, 157], lab: [290, 140],
    },
    nasal: {
      label: "Nasal bone", c: "#ff7fa8",
      d: "M157,120 L173,120 L177,160 L165,165 L153,160 Z",
      tip: [165, 140], lab: [290, 162],
    },
    vomer: {
      label: "Vomer", c: "#8a7ad0",
      d: "M162,186 L168,186 L169,206 L161,206 Z",
      tip: [165, 198], lab: [290, 206],
    },
    concha: {
      label: "Inferior nasal concha", c: "#bfa5e0",
      d: sym("M150,190 C154,184 160,188 160,196 L151,198 Z", 330),
      tip: [154, 193], lab: [290, 184],
    },
    zygomatic: {
      label: "Zygomatic bone", c: "#9fd8a8",
      d: sym("M90,152 C94,168 104,172 118,170 L128,178 L114,190 L92,186 C84,178 84,162 90,152 Z", 330),
      tip: [100, 174], lab: [40, 168],
    },
    maxilla: {
      label: "Maxilla", c: "#c7b3e8",
      d: "M128,166 C136,170 144,166 150,164 L154,162 C144,182 144,202 156,208 L174,208 C186,202 186,182 176,162 L180,164 C186,166 194,170 202,166 L216,178 L212,198 L206,216 L124,216 L118,198 L114,190 Z",
      tip: [136, 196], lab: [40, 206],
    },
    mandible: {
      label: "Mandible", c: "#f5b39a",
      d: "M106,208 L120,228 L210,228 L224,208 L226,236 C216,256 192,266 165,266 C138,266 114,256 104,236 Z",
      tip: [165, 252], lab: [40, 250],
    },
  },
  groups: {
    cranium: {
      label: "Cranium (cranial bones)", members: ["frontal", "parietal", "temporal", "sphenoid", "ethmoid"],
      tip: [200, 50], lab: [290, 40],
    },
    facial: {
      label: "Facial bones", members: ["nasal", "lacrimal", "zygomatic", "maxilla", "mandible", "vomer", "concha"],
      tip: [196, 240], lab: [290, 250],
    },
  },
  overlay:
    '<path d="M126,216 h78 M126,228 h78" class="detail"/>' +
    [134, 144, 154, 165, 176, 186, 196].map((x) => `<path d="M${x},216 v12" class="detail"/>`).join("") +
    '<circle cx="132" cy="246" r="2.5" class="hole"/><circle cx="198" cy="246" r="2.5" class="hole"/>',
};

const skullInferior = {
  crop: [80, 6, 170, 260],
  title: "Skull, inferior view (from below, teeth at top)",
  ask: "Name the highlighted part of the skull base.",
  viewBox: "0 0 330 280",
  base:
    '<path d="M165,10 C235,10 255,100 245,170 C235,230 195,262 165,262 C135,262 95,230 85,170 C75,100 95,10 165,10 Z" class="base" style="fill:#d9cfb4"/>' +
    '<ellipse cx="155" cy="114" rx="9" ry="12" class="hole"/><ellipse cx="175" cy="114" rx="9" ry="12" class="hole"/>',
  regions: {
    maxilla: {
      label: "Maxilla (palatine process)", c: "#c7b3e8",
      d: "M119,96 C111,60 121,24 165,22 C209,24 219,60 211,96 L195,96 L195,84 L135,84 L135,96 Z",
      tip: [165, 60], lab: [40, 40],
    },
    palatine: {
      label: "Palatine bone", c: "#f2e27a",
      d: "M135,84 L195,84 L195,100 L135,100 Z",
      tip: [180, 92], lab: [290, 80],
    },
    vomer: {
      label: "Vomer", c: "#8a7ad0",
      d: "M162,100 L168,100 L169,126 L161,126 Z",
      tip: [165, 116], lab: [290, 112],
    },
    zygomatic: {
      label: "Zygomatic bone", c: "#9fd8a8",
      d: sym("M103,72 C93,88 91,104 95,118 L103,116 C101,104 103,92 111,80 Z", 330),
      tip: [98, 100], lab: [40, 96],
    },
    sphenoid: {
      label: "Sphenoid bone", c: "#9a8fd8",
      d: "M125,100 L135,100 L146,128 L184,128 L195,100 L205,100 L210,142 L120,142 Z",
      tip: [190, 134], lab: [290, 140],
    },
    temporal: {
      label: "Temporal bone", c: "#f2c27a",
      d: sym("M95,122 C88,150 92,178 104,196 L126,182 L120,142 L104,140 L103,120 Z", 330),
      tip: [108, 160], lab: [40, 150],
    },
    occipital: {
      label: "Occipital bone", c: "#8fd88f",
      d: "M104,196 C118,232 145,252 165,252 C185,252 212,232 226,196 L204,182 L210,142 L120,142 L126,182 Z",
      tip: [190, 232], lab: [290, 236],
    },
    magnum: {
      label: "Foramen magnum", c: "#2a2418",
      d: "M165,182 C181,182 183,222 165,224 C147,222 149,182 165,182 Z",
      tip: [165, 210], lab: [40, 236],
    },
    condyle: {
      label: "Occipital condyle", c: "#6fb86f",
      d: sym("M143,188 C139,196 141,208 147,212 L151,206 C149,200 149,194 151,188 Z", 330),
      tip: [182, 200], lab: [290, 196],
    },
  },
  overlay:
    [130, 140, 150, 160, 170, 180, 190, 200].map((x, i) => `<path d="M${x},${i === 0 || i === 7 ? 70 : 30 + Math.abs(i - 3.5) * 8} l1,6" class="detail"/>`).join("") +
    '<circle cx="110" cy="176" r="4" class="hole"/><circle cx="220" cy="176" r="4" class="hole"/>',
};

/* ================================================================== SKELETON */

// A long bone: shaft with knobby ends, from (x1,y1) to (x2,y2).
function longBone(x1, y1, x2, y2, w, end = w * 0.9) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
  const p = (x, y, k) => `${(x + nx * k).toFixed(1)},${(y + ny * k).toFixed(1)}`;
  const h = w / 2;
  return `M${p(x1, y1, h)} L${p(x2, y2, h)} L${p(x2, y2, -h)} L${p(x1, y1, -h)} Z ${circle(x1, y1, end)} ${circle(x2, y2, end)}`;
}

// Circle from absolute cubic curves (safe to mirror, unlike arc commands).
function circle(cx, cy, r) {
  const k = 0.5523 * r, f = (n) => n.toFixed(1);
  return `M${f(cx - r)},${f(cy)} C${f(cx - r)},${f(cy - k)} ${f(cx - k)},${f(cy - r)} ${f(cx)},${f(cy - r)} ` +
    `C${f(cx + k)},${f(cy - r)} ${f(cx + r)},${f(cy - k)} ${f(cx + r)},${f(cy)} ` +
    `C${f(cx + r)},${f(cy + k)} ${f(cx + k)},${f(cy + r)} ${f(cx)},${f(cy + r)} ` +
    `C${f(cx - k)},${f(cy + r)} ${f(cx - r)},${f(cy + k)} ${f(cx - r)},${f(cy)} Z`;
}
const SW = 240;
const fingers = (y0, len, xs) => xs.map((x, i) => longBone(x, y0, x - 1 + i * 0.3, y0 + len, 2.4, 1.6)).join(" ");
const skeleton = {
  crop: [38, 0, 164, 428],
  title: "Skeleton, anterior view",
  ask: "Name the highlighted bone or bone group.",
  viewBox: "0 0 240 430",
  solid: true,
  regions: {
    skull: {
      label: "Skull (cranium)", c: BONE,
      d: "M120,6 C142,6 150,24 149,38 C148,52 141,58 120,58 C99,58 92,52 91,38 C90,24 98,6 120,6 Z",
      tip: [120, 24], lab: [16, 20],
    },
    mandible: {
      label: "Mandible", c: BONE2,
      d: "M104,54 C110,66 130,66 136,54 L134,62 C128,72 112,72 106,62 Z",
      tip: [128, 64], lab: [224, 30],
    },
    clavicle: {
      label: "Clavicle", c: BONE2,
      d: sym(longBone(88, 88, 116, 82, 4, 3), SW),
      tip: [96, 86], lab: [16, 76],
    },
    scapula: {
      label: "Scapula", c: BONE3,
      d: sym("M72,90 L92,92 L90,130 Z", SW),
      tip: [80, 100], lab: [16, 100],
    },
    sternum: {
      label: "Sternum", c: BONE,
      d: "M114,88 L126,88 L125,140 L120,150 L115,140 Z",
      tip: [120, 116], lab: [224, 92],
    },
    ribs: {
      label: "Ribs", c: BONE2,
      d: [98, 108, 118, 128, 138, 148].map((y, i) => sym(`M114,${y} C${100 - i * 2},${y - 2} ${86 - i},${y + 4} ${84 - i * 0.5},${y + 14} L${88 - i * 0.5},${y + 15} C${90 - i},${y + 7} ${102 - i * 2},${y + 3} 114,${y + 4} Z`, SW)).join(" "),
      tip: [92, 124], lab: [16, 124],
    },
    spine: {
      label: "Vertebral column", c: BONE3,
      d: [156, 164, 172, 180, 188].map((y) => `M114,${y} h12 v6 h-12 Z`).join(" "),
      tip: [126, 176], lab: [224, 176],
    },
    pelvis: {
      label: "Pelvis (hip bones)", c: BONE,
      d: "M88,196 C94,186 110,192 120,202 C130,192 146,186 152,196 C158,212 150,232 138,238 L128,232 L120,240 L112,232 L102,238 C90,232 82,212 88,196 Z",
      tip: [100, 210], lab: [16, 206],
    },
    sacrum: {
      label: "Sacrum", c: BONE3,
      d: "M114,198 L126,198 L124,222 L120,228 L116,222 Z",
      tip: [120, 212], lab: [224, 204],
    },
    humerus: {
      label: "Humerus", c: BONE,
      d: sym(longBone(80, 96, 70, 164, 6, 5), SW),
      tip: [75, 130], lab: [16, 150],
    },
    radius: {
      label: "Radius", c: BONE2,
      d: sym(longBone(64, 172, 52, 232, 3.6, 3), SW),
      tip: [58, 204], lab: [16, 180],
    },
    ulna: {
      label: "Ulna", c: BONE3,
      d: sym(longBone(74, 172, 64, 236, 3.6, 3), SW),
      tip: [70, 204], lab: [224, 230],
    },
    carpals: {
      label: "Carpals", c: BONE3,
      d: sym("M48,238 L68,240 L66,250 L46,248 Z", SW),
      tip: [56, 244], lab: [16, 246],
    },
    metacarpals: {
      label: "Metacarpals", c: BONE2,
      d: sym(fingers(252, 14, [48, 53, 58, 63]), SW),
      tip: [56, 258], lab: [16, 268],
    },
    phalanges: {
      label: "Phalanges", c: BONE,
      d: sym(fingers(270, 16, [47, 52, 57, 62]), SW) + " " + sym(fingers(414, 8, [104, 108, 112]), SW),
      tip: [54, 280], lab: [16, 290],
    },
    femur: {
      label: "Femur", c: BONE,
      d: sym(longBone(104, 238, 98, 318, 8, 6.5), SW),
      tip: [101, 278], lab: [16, 312],
    },
    patella: {
      label: "Patella", c: BONE3,
      d: sym("M92,326 C92,318 106,318 106,326 C106,336 92,336 92,326 Z", SW),
      tip: [99, 327], lab: [224, 330],
    },
    tibia: {
      label: "Tibia", c: BONE2,
      d: sym(longBone(102, 340, 104, 398, 6, 4.5), SW),
      tip: [103, 368], lab: [224, 360],
    },
    fibula: {
      label: "Fibula", c: BONE3,
      d: sym(longBone(90, 342, 92, 400, 3, 2.5), SW),
      tip: [91, 368], lab: [16, 362],
    },
    tarsals: {
      label: "Tarsals", c: BONE3,
      d: sym("M88,402 L110,402 L112,412 L88,412 Z", SW),
      tip: [96, 407], lab: [16, 400],
    },
    metatarsals: {
      label: "Metatarsals", c: BONE2,
      d: sym("M102,412 L116,412 L116,418 L102,418 Z", SW),
      tip: [110, 415], lab: [224, 410],
    },
  },
  groups: {
    axial: { label: "Axial skeleton", members: ["skull", "mandible", "sternum", "ribs", "spine", "sacrum"], tip: [120, 140], lab: [224, 130] },
    appendicular: {
      label: "Appendicular skeleton",
      members: ["clavicle", "scapula", "pelvis", "humerus", "radius", "ulna", "carpals", "metacarpals", "phalanges", "femur", "patella", "tibia", "fibula", "tarsals", "metatarsals"],
      tip: [140, 280], lab: [224, 280],
    },
  },
};

/* ============================================================= SPINE + BONE */

function spine() {
  const regions = {};
  const groups = [
    ["cervical", "Cervical vertebrae (C1–C7)", 7, "#9fd8e8", 8, 18],
    ["thoracic", "Thoracic vertebrae (T1–T12)", 12, "#f2c27a", 10, 22],
    ["lumbar", "Lumbar vertebrae (L1–L5)", 5, "#c7b3e8", 13, 28],
  ];
  let y = 14;
  const xAt = (yy) => 110 + Math.sin((yy / 280) * Math.PI * 2.1 + 0.6) * 16;
  const discs = [];
  for (const [id, label, n, c, h, w] of groups) {
    const parts = [];
    const top = y;
    for (let k = 0; k < n; k++) {
      const x = xAt(y);
      parts.push(`M${(x - w / 2).toFixed(1)},${y} h${w} v${h} h-${w} Z M${(x + w / 2).toFixed(1)},${y + 2} l${w * 0.6},${h * 0.4} l-${w * 0.6},${h * 0.3} Z`);
      discs.push(`M${(x - w / 2 + 1).toFixed(1)},${y + h} h${w - 2} v2.5 h-${w - 2} Z`);
      y += h + 2.5;
    }
    regions[id] = { label, d: parts.join(" "), c, tip: [xAt((top + y) / 2) - w / 2, (top + y) / 2], lab: [24, (top + y) / 2] };
  }
  const sx = xAt(y);
  regions.disk = { label: "Intervertebral disk", d: discs.join(" "), c: "#6fa8d8", tip: [xAt(150) + 10, 150], lab: [200, 120] };
  regions.sacrum = { label: "Sacrum", d: `M${sx - 16},${y + 1} L${sx + 16},${y + 1} L${sx + 6},${y + 36} L${sx - 2},${y + 38} Z`, c: "#8fd88f", tip: [sx, y + 16], lab: [200, y + 14] };
  regions.coccyx = { label: "Coccyx", d: `M${sx - 1},${y + 40} L${sx + 6},${y + 39} L${sx + 4},${y + 52} L${sx + 1},${y + 53} Z`, c: "#f5b39a", tip: [sx + 3, y + 46], lab: [200, y + 50] };
  regions.spinous = {
    label: "Spinous process", line: `M${xAt(90) + 12},92 l14,6`, w: 3, c: "#5b4a3a",
    tip: [xAt(90) + 20, 96], lab: [200, 80],
  };
  return {
    crop: [70, 8, 104, Math.ceil(y + 50)],
    title: "Vertebral column, lateral view (front of body to the left)",
    ask: "Name the highlighted part of the spine.",
    viewBox: `0 0 260 ${Math.ceil(y + 64)}`,
    regions,
  };
}

const longBoneDiagram = {
  crop: [108, 0, 84, 330],
  title: "Structure of a long bone (cut lengthwise)",
  ask: "Name the highlighted part of the long bone.",
  viewBox: "0 0 300 330",
  regions: {
    proxShell: { label: "Compact bone (epiphysis)", c: "#e9e2cf", d: "M120,30 C120,8 180,8 180,30 L180,72 L168,92 L132,92 L120,72 Z" },
    proxSpongy: { label: "Spongy bone", c: "#e8b0a0", d: "M126,34 C126,18 174,18 174,34 L174,70 L164,86 L136,86 L126,70 Z", tip: [150, 50], lab: [242, 52] },
    shaftWall: { label: "Compact bone", c: "#e9e2cf", d: "M132,92 L142,92 L142,240 L132,240 Z M158,92 L168,92 L168,240 L158,240 Z", tip: [136, 160], lab: [30, 160] },
    medullary: { label: "Medullary cavity (yellow marrow)", c: "#f2d36b", d: "M142,92 L158,92 L158,240 L142,240 Z", tip: [150, 170], lab: [242, 170] },
    distShell: { label: "Compact bone (epiphysis)", c: "#e9e2cf", d: "M132,240 L168,240 L182,262 L182,300 C182,322 118,322 118,300 L118,262 Z" },
    distSpongy: { label: "Spongy bone", c: "#e8b0a0", d: "M137,246 L163,246 L176,264 L176,298 C176,314 124,314 124,298 L124,264 Z" },
    cartilage: {
      label: "Articular cartilage", c: "#8fe0e0",
      d: "M120,30 C120,4 180,4 180,30 L176,30 C176,12 124,12 124,30 Z M118,300 C118,326 182,326 182,300 L178,300 C178,318 122,318 122,300 Z",
      tip: [130, 16], lab: [30, 16],
    },
    plate: { label: "Epiphyseal line (growth plate)", line: "M126,74 L174,74 M124,262 L176,262", w: 2.5, c: "#5b4a3a", tip: [172, 74], lab: [242, 84] },
    periosteum: { label: "Periosteum", line: "M129,92 L129,240 M171,92 L171,240", w: 2.5, c: "#c96b72", tip: [171, 130], lab: [242, 128] },
  },
  groups: {
    proximal: { label: "Proximal epiphysis", members: ["proxShell", "proxSpongy"], tip: [122, 50], lab: [30, 52] },
    diaphysis: { label: "Diaphysis (shaft)", members: ["shaftWall", "medullary"], tip: [132, 200], lab: [30, 206] },
    distal: { label: "Distal epiphysis", members: ["distShell", "distSpongy"], tip: [122, 284], lab: [30, 286] },
    compact: { label: "Compact bone", members: ["proxShell", "shaftWall", "distShell"] },
    spongy: { label: "Spongy bone", members: ["proxSpongy", "distSpongy"] },
  },
  overlay:
    [[136, 40], [150, 30], [162, 44], [144, 60], [158, 66], [134, 274], [150, 290], [166, 280], [146, 300], [160, 268]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" class="detail" style="fill:#c96b7299"/>`).join(""),
};

function fractures() {
  const panels = [
    ["closed", "Closed (simple) fracture", "M0,0 L0,0"],
    ["open", "Open (compound) fracture"],
    ["comminuted", "Comminuted fracture"],
    ["greenstick", "Greenstick fracture"],
    ["spiral", "Spiral fracture"],
    ["compression", "Compression fracture"],
    ["displaced", "Displaced fracture"],
  ];
  const regions = {};
  const overlay = [];
  panels.forEach(([id, label], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 14 + col * 76, y = 14 + row * 140;
    const cx = x + 34;
    let d;
    if (id === "compression") {
      d = `M${cx - 18},${y + 20} h36 v16 h-36 Z M${cx - 18},${y + 46} h36 l-4,8 h-28 Z M${cx - 18},${y + 64} h36 v16 h-36 Z`;
    } else if (id === "displaced") {
      d = `M${cx - 6},${y + 6} h12 v52 l-12,4 Z M${cx + 2},${y + 64} l12,-4 v56 h-12 Z`;
    } else {
      d = `M${cx - 6},${y + 6} h12 v110 h-12 Z`;
    }
    regions[id] = { label, short: label.split(" ")[0], d, c: "#e9e2cf", tip: [cx, y + 60], lab: [cx, y + 132], center: true };
    if (id === "closed") overlay.push(`<path d="M${cx - 6},${y + 58} l12,6" class="crack"/>`);
    if (id === "open") overlay.push(`<path d="M${cx - 6},${y + 58} l12,6" class="crack"/><path d="M${cx - 22},${y + 40} q22,10 44,0" class="skinline"/><path d="M${cx + 2},${y + 30} l4,14" class="crack"/>`);
    if (id === "comminuted") overlay.push(`<path d="M${cx - 6},${y + 50} l12,4 M${cx - 6},${y + 62} l12,-3 M${cx - 6},${y + 74} l12,4 M${cx},${y + 52} l-2,22 M${cx + 3},${y + 54} l2,18" class="crack"/>`);
    if (id === "greenstick") overlay.push(`<path d="M${cx + 6},${y + 56} l-7,4 l7,4" class="crack"/>`);
    if (id === "spiral") overlay.push(`<path d="M${cx - 6},${y + 40} C${cx + 14},${y + 46} ${cx - 14},${y + 62} ${cx + 6},${y + 72} C${cx - 10},${y + 78} ${cx + 10},${y + 88} ${cx - 6},${y + 94}" class="crack"/>`);
  });
  return {
    title: "Types of fractures",
    ask: "Which type of fracture is highlighted?",
    viewBox: "0 0 320 300",
    regions,
    overlay: overlay.join(""),
  };
}

/* ===================================================================== JOINT */
const joint = {
  crop: [82, 0, 156, 300],
  title: "Synovial joint (knee, simplified front view)",
  ask: "Name the highlighted structure of the joint.",
  viewBox: "0 0 320 300",
  regions: {
    femur: { label: "Femur", c: "#e9e2cf", d: "M132,4 L188,4 L190,112 C210,118 214,140 200,150 L120,150 C106,140 110,118 130,112 Z", tip: [160, 96], lab: [24, 90] },
    tibia: { label: "Tibia", c: "#e9e2cf", d: "M118,172 L204,172 C206,186 196,192 186,196 L184,296 L136,296 L134,196 C124,192 116,186 118,172 Z", tip: [160, 240], lab: [24, 240] },
    fibula: { label: "Fibula", c: "#ddd3b8", d: "M196,198 L212,196 L210,296 L200,296 Z", tip: [205, 250], lab: [296, 262] },
    cartilage: {
      label: "Articular cartilage", c: "#8fe0e0",
      d: "M114,140 C120,152 200,152 206,140 L204,150 C198,158 122,158 116,150 Z M118,172 C124,166 196,166 204,172 L204,176 C196,170 124,170 118,176 Z",
      tip: [128, 152], lab: [24, 140],
    },
    meniscus: { label: "Meniscus", c: "#6fa8d8", d: sym("M112,160 L134,158 L132,166 L112,168 Z", 320), tip: [120, 163], lab: [24, 166] },
    cavity: { label: "Joint cavity (synovial fluid)", c: "#3f7fd0", d: "M134,158 C150,162 170,162 186,158 L186,166 C170,168 150,168 134,166 Z", tip: [160, 162], lab: [296, 162] },
    membrane: { label: "Synovial membrane", c: "#c77dff", d: sym("M104,132 C96,148 96,170 104,186 L108,186 C101,170 101,148 108,132 Z", 320), tip: [214, 160], lab: [296, 140] },
    capsule: { label: "Joint capsule", c: "#7f8cff", d: sym("M96,126 C86,146 86,172 96,192 L101,192 C92,172 92,146 101,126 Z", 320), tip: [228, 176], lab: [296, 190] },
    ligament: { label: "Collateral ligament", c: "#f2f0e6", d: sym("M100,120 L110,120 L114,206 L104,206 Z", 320), tip: [107, 196], lab: [24, 206] },
    acl: { label: "Cruciate ligament (ACL)", line: "M148,148 L172,172", w: 5, c: "#f2f0e6", tip: [160, 160], lab: [296, 116] },
    patella: { label: "Patella", c: "#ddd3b8", d: "M146,92 C146,78 174,78 174,92 C174,112 146,112 146,92 Z", tip: [168, 92], lab: [296, 80] },
    muscle: { label: "Skeletal muscle (quadriceps)", c: "#c96b72", d: sym("M108,4 L134,4 L138,64 C130,74 116,72 110,60 Z", 320), tip: [120, 30], lab: [24, 24] },
    tendon: { label: "Tendon (quadriceps tendon)", c: "#f2f0e6", d: "M132,62 L188,62 L174,84 L146,84 Z", tip: [168, 72], lab: [296, 52] },
    patlig: { label: "Patellar ligament", c: "#f2f0e6", d: "M150,110 L170,110 L166,190 L154,190 Z", tip: [160, 184], lab: [296, 220] },
    bursa: { label: "Bursa", c: "#f2c94c", d: "M176,104 C186,104 186,116 176,116 C170,116 170,104 176,104 Z", tip: [180, 110], lab: [296, 100] },
  },
};

/* ====================================================================== SKIN */

const skin = {
  crop: [16, 0, 238, 220],
  title: "Skin and its layers",
  ask: "Name the highlighted layer or structure.",
  viewBox: "0 0 320 230",
  base: '<rect x="20" y="186" width="230" height="30" class="base" style="fill:#a8545e"/><text x="24" y="210" class="lbl">muscle</text>',
  regions: {
    subcutaneous: { label: "Subcutaneous layer (hypodermis)", c: "#ead99a", d: "M20,136 L250,136 L250,186 L20,186 Z", tip: [40, 168], lab: [6, 196], left: true },
    dermis: {
      label: "Dermis", c: "#e8a8a0",
      d: "M20,52 C40,60 50,46 70,54 C90,62 100,46 120,54 C140,62 150,46 170,54 C190,62 200,46 220,54 L250,52 L250,136 L20,136 Z",
      tip: [40, 100], lab: [6, 92],
    },
    epidermis: {
      label: "Epidermis", c: "#f6cfae",
      d: "M20,28 L250,28 L250,52 L220,54 C200,46 190,62 170,54 C150,46 140,62 120,54 C100,46 90,62 70,54 C50,46 40,60 20,52 Z",
      tip: [40, 40], lab: [6, 40],
    },
    corneum: { label: "Stratum corneum (dead keratin cells)", line: "M20,30 L250,30", w: 3, c: "#d8b48a", tip: [60, 30], lab: [6, 26] },
    hair: { label: "Hair shaft", c: "#3a2a20", d: "M84,0 L90,0 L91,62 L85,62 Z", tip: [87, 14], lab: [6, 12], left: true },
    follicle: { label: "Hair follicle", c: "#b07a5a", d: "M80,62 L96,62 L98,126 C98,136 78,136 78,126 Z", tip: [80, 108], lab: [6, 112], left: true },
    sebaceous: { label: "Sebaceous (oil) gland", c: "#f2c94c", d: "M96,74 C114,68 118,90 102,94 L97,92 Z", tip: [108, 82], lab: [262, 66] },
    arrector: { label: "Arrector pili muscle", c: "#c96b72", d: "M96,104 L130,70 L135,74 L100,108 Z", tip: [120, 84], lab: [262, 88] },
    sweat: {
      label: "Sweat (sudoriferous) gland", c: "#5ab0ff",
      d: "M190,28 L195,28 L197,118 C216,116 218,138 199,138 C180,140 178,120 192,118 Z",
      tip: [198, 128], lab: [262, 136],
    },
    pore: { label: "Sweat pore", c: "#1a3a6a", d: "M188,24 L197,24 L196,30 L189,30 Z", tip: [192, 26], lab: [262, 4] },
    vessels: {
      label: "Blood vessels", line: "M20,124 C70,120 120,130 170,124 C200,120 230,126 250,122 M20,128 C70,126 120,136 170,130 C200,126 230,132 250,128", w: 2.5, c: "#c0303a",
      tip: [150, 127], lab: [6, 150], left: true,
    },
    nerve: {
      label: "Sensory nerve and receptor", line: "M230,136 L226,80 M226,80 l-4,-6 M226,80 l4,-6", w: 2, c: "#f2f0e6",
      tip: [226, 90], lab: [262, 152],
    },
    adipose: {
      label: "Adipose (fat) cells", c: "#f6ecbf",
      d: [40, 66, 120, 150, 210, 236].map((x, i) => `M${x - 9},${150 + (i % 2) * 14} a9,9 0 1,0 18,0 a9,9 0 1,0 -18,0 Z`).join(" "),
      tip: [120, 150], lab: [6, 178], left: true,
    },
  },
};

const burns = {
  title: "Burn depth",
  ask: "What depth of burn is highlighted?",
  viewBox: "0 0 320 200",
  base:
    '<rect x="70" y="20" width="240" height="22" class="base" style="fill:#f6cfae"/>' +
    '<rect x="70" y="42" width="240" height="70" class="base" style="fill:#e8a8a0"/>' +
    '<rect x="70" y="112" width="240" height="44" class="base" style="fill:#ead99a"/>' +
    '<rect x="70" y="156" width="240" height="34" class="base" style="fill:#a8545e"/>' +
    '<text x="66" y="35" class="lbl" text-anchor="end">Epidermis</text><text x="66" y="80" class="lbl" text-anchor="end">Dermis</text>' +
    '<text x="66" y="138" class="lbl" text-anchor="end">Fat</text><text x="66" y="176" class="lbl" text-anchor="end">Muscle/bone</text>',
  regions: {
    first: { label: "Superficial (first-degree) burn", c: "#ff8a6a", d: "M80,20 L130,20 L130,42 L80,42 Z" },
    second: { label: "Partial-thickness (second-degree) burn", c: "#e0503a", d: "M140,20 L190,20 L190,80 L140,80 Z M150,14 C150,4 170,4 170,14 Z" },
    third: { label: "Full-thickness (third-degree) burn", c: "#6a2418", d: "M200,20 L250,20 L250,118 L200,118 Z" },
    fourth: { label: "Fourth-degree burn (into muscle or bone)", c: "#241410", d: "M260,20 L310,20 L310,186 L260,186 Z" },
  },
  overlay:
    '<text x="105" y="198" class="lbl" text-anchor="middle">1st</text><text x="165" y="198" class="lbl" text-anchor="middle">2nd</text>' +
    '<text x="225" y="198" class="lbl" text-anchor="middle">3rd</text><text x="285" y="198" class="lbl" text-anchor="middle">4th</text>',
};

function lesions() {
  const kinds = [
    ["macule", "Macule (flat spot)", (x) => `M${x + 20},44 h28 v6 h-28 Z`, "#8a5a3a"],
    ["papule", "Papule (small solid bump)", (x) => `M${x + 22},44 C${x + 24},30 ${x + 44},30 ${x + 46},44 Z`, "#d07070"],
    ["nodule", "Nodule (deeper solid lump)", (x) => `M${x + 16},44 C${x + 18},26 ${x + 50},26 ${x + 52},44 C${x + 50},70 ${x + 18},70 ${x + 16},44 Z`, "#b85a5a"],
    ["vesicle", "Vesicle (small clear blister)", (x) => `M${x + 24},44 C${x + 26},30 ${x + 42},30 ${x + 44},44 Z`, "#bfe8f0"],
    ["bulla", "Bulla (large blister)", (x) => `M${x + 10},44 C${x + 14},20 ${x + 54},20 ${x + 58},44 Z`, "#bfe8f0"],
    ["pustule", "Pustule (pus-filled bump)", (x) => `M${x + 24},44 C${x + 26},30 ${x + 42},30 ${x + 44},44 Z`, "#f2e27a"],
    ["wheal", "Wheal (hive)", (x) => `M${x + 8},44 C${x + 16},34 ${x + 52},34 ${x + 60},44 Z`, "#f0a0a0"],
    ["ulcer", "Ulcer (open sore)", (x) => `M${x + 18},38 L${x + 50},38 C${x + 46},62 ${x + 22},62 ${x + 18},38 Z`, "#7a2a20"],
    ["fissure", "Fissure (crack)", (x) => `M${x + 32},38 L${x + 36},38 L${x + 35},66 Z`, "#3a1a10"],
  ];
  const regions = {};
  const base = [];
  kinds.forEach(([id, label, shape, c], i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = 10 + col * 104, y = row * 92;
    base.push(`<g transform="translate(0,${y})"><rect x="${x}" y="38" width="68" height="10" class="base" style="fill:#f6cfae"/><rect x="${x}" y="48" width="68" height="26" class="base" style="fill:#e8a8a0"/></g>`);
    regions[id] = { label, c, d: shape(x).replace(/(\d+(?:\.\d+)?),(\d+(?:\.\d+)?)/g, (m, a, b) => `${a},${+b + y}`).replace(/([hv])/g, "$1"), tip: [x + 34, y + 40], lab: [x + 34, y + 88], center: true, short: label.split(" (")[0] };
  });
  // fix relative h/v commands: only y in absolute pairs was shifted above, which is all we need
  return { title: "Types of skin lesions (side view)", ask: "Which type of skin lesion is shown highlighted?", viewBox: "0 0 320 280", base: base.join(""), regions };
}

/* ============================================================ BODY AS WHOLE */

const FIGURE_FRONT =
  '<circle cx="160" cy="34" r="16" class="figure"/>' +
  '<path d="M160,50 L160,58 M136,62 C150,56 170,56 184,62 L188,128 L176,130 L172,92 L170,150 L176,236 L164,236 L160,160 L156,236 L144,236 L150,150 L148,92 L144,130 L132,128 Z" class="figure"/>';

const planes = {
  crop: [84, 8, 172, 242],
  title: "Planes of the body",
  ask: "Name the highlighted plane.",
  viewBox: "0 0 320 250",
  overlay: FIGURE_FRONT,
  regions: {
    frontal: { label: "Frontal (coronal) plane", c: "#5ab0ff88", d: "M96,70 L224,50 L224,214 L96,234 Z" },
    sagittal: { label: "Sagittal plane", c: "#59d98e88", d: "M150,14 L182,36 L182,246 L150,224 Z" },
    transverse: { label: "Transverse (horizontal) plane", c: "#f2c94c88", d: "M90,132 L210,112 L250,140 L130,160 Z" },
  },
  extraLabels: ["Oblique plane"],
};

const quadrants = {
  crop: [78, 8, 164, 232],
  title: "Abdominal quadrants (patient's right is on your left)",
  ask: "Name the highlighted abdominal quadrant.",
  viewBox: "0 0 320 250",
  base:
    '<path d="M96,20 C120,12 200,12 224,20 L236,120 C240,170 232,206 214,234 L106,234 C88,206 80,170 84,120 Z" class="base"/>' +
    '<path d="M110,64 C130,92 190,92 210,64" class="detail"/><path d="M104,186 C120,176 140,182 150,206 M216,186 C200,176 180,182 170,206" class="detail"/>',
  regions: {
    ruq: { label: "Right upper quadrant (RUQ)", c: "#b3bcd8", d: "M98,30 L160,30 L160,120 L86,120 Z", tip: [124, 74], lab: [10, 60] },
    luq: { label: "Left upper quadrant (LUQ)", c: "#cfd5e8", d: "M160,30 L222,30 L234,120 L160,120 Z", tip: [196, 74], lab: [310, 60] },
    rlq: { label: "Right lower quadrant (RLQ)", c: "#cfd5e8", d: "M86,120 L160,120 L160,226 L110,226 C96,200 88,170 86,120 Z", tip: [124, 170], lab: [10, 200] },
    llq: { label: "Left lower quadrant (LLQ)", c: "#b3bcd8", d: "M160,120 L234,120 C232,170 224,200 210,226 L160,226 Z", tip: [196, 170], lab: [310, 200] },
  },
  overlay: '<circle cx="160" cy="120" r="4" class="hole"/><text x="70" y="16" class="lbl">R</text><text x="244" y="16" class="lbl">L</text>',
};

function nineRegions() {
  const xs = [90, 132, 188, 230], ys = [26, 88, 150, 226];
  const names = [
    ["rhypo", "Right hypochondriac region"], ["epigastric", "Epigastric region"], ["lhypo", "Left hypochondriac region"],
    ["rlumbar", "Right lumbar region"], ["umbilical", "Umbilical region"], ["llumbar", "Left lumbar region"],
    ["riliac", "Right iliac (inguinal) region"], ["hypogastric", "Hypogastric (pubic) region"], ["liliac", "Left iliac (inguinal) region"],
  ];
  const regions = {};
  names.forEach(([id, label], i) => {
    const r = Math.floor(i / 3), c = i % 3;
    const cx = (xs[c] + xs[c + 1]) / 2, cy = (ys[r] + ys[r + 1]) / 2;
    regions[id] = {
      label,
      d: `M${xs[c]},${ys[r]} L${xs[c + 1]},${ys[r]} L${xs[c + 1]},${ys[r + 1]} L${xs[c]},${ys[r + 1]} Z`,
      c: (r + c) % 2 ? "#b3bcd8" : "#cfd5e8",
      tip: [cx, cy],
      lab: c === 0 ? [10, cy] : c === 2 ? [310, cy] : [cx, r === 0 ? 14 : r === 2 ? 242 : cy],
      center: c === 1 && r !== 1,
    };
  });
  regions.umbilical.lab = [310, 128];
  return {
    crop: [84, 4, 152, 240],
    title: "Nine abdominal regions (patient's right is on your left)",
    ask: "Name the highlighted abdominal region.",
    viewBox: "0 0 320 250",
    base: '<path d="M96,20 C120,12 200,12 224,20 L236,120 C240,170 232,206 214,234 L106,234 C88,206 80,170 84,120 Z" class="base"/>',
    regions,
    overlay: '<path d="M110,64 C130,92 190,92 210,64" class="detail"/><circle cx="160" cy="120" r="4" class="hole"/>',
  };
}

const cavities = {
  crop: [92, 6, 120, 290],
  title: "Body cavities (side view, front to the left)",
  ask: "Name the highlighted body cavity or structure.",
  viewBox: "0 0 320 300",
  base:
    '<path d="M150,10 C186,10 196,44 188,70 L196,80 C206,92 204,120 206,150 C208,190 204,230 196,262 L180,292 L120,292 L110,262 C100,230 96,190 98,150 C100,110 104,90 116,80 L122,70 C110,44 120,10 150,10 Z" class="base"/>',
  regions: {
    cranial: { label: "Cranial cavity", c: "#c7b3e8", d: "M150,18 C176,18 184,40 178,60 L130,60 C122,40 128,18 150,18 Z", tip: [156, 40], lab: [20, 30] },
    spinal: { label: "Spinal (vertebral) cavity", c: "#9a8fd8", d: "M176,62 L184,62 L190,240 L182,240 Z", tip: [186, 150], lab: [300, 150] },
    thoracic: { label: "Thoracic cavity", c: "#8fe0e0", d: "M118,92 C130,84 166,84 174,92 L176,150 L114,150 Z", tip: [140, 120], lab: [20, 110] },
    diaphragm: { label: "Diaphragm", line: "M112,154 C130,140 160,140 178,154", w: 4, c: "#c96b72", tip: [146, 146], lab: [300, 120] },
    abdominal: { label: "Abdominal cavity", c: "#f2c27a", d: "M112,160 L178,160 L178,214 L110,214 Z", tip: [140, 186], lab: [20, 186] },
    pelvic: { label: "Pelvic cavity", c: "#8fd88f", d: "M110,218 L178,218 L172,256 C160,268 130,268 118,256 Z", tip: [144, 240], lab: [20, 250] },
  },
  groups: {
    dorsal: { label: "Dorsal (posterior) cavity", members: ["cranial", "spinal"], tip: [178, 70], lab: [300, 40] },
    ventral: { label: "Ventral (anterior) cavity", members: ["thoracic", "abdominal", "pelvic"], tip: [116, 200], lab: [300, 280] },
  },
};

const cell = {
  crop: [26, 14, 262, 212],
  title: "A typical animal cell",
  ask: "Name the highlighted part of the cell.",
  viewBox: "0 0 320 240",
  regions: {
    membrane: { label: "Cell membrane", line: "M160,20 C250,20 290,80 280,130 C270,190 220,222 150,220 C80,218 30,180 34,120 C38,60 80,20 160,20 Z", w: 4, c: "#c77dff", tip: [276, 100], lab: [300, 80] },
    cytoplasm: { label: "Cytoplasm", c: "#cfe8f0", d: "M160,22 C248,22 286,80 278,130 C268,188 220,218 150,218 C82,216 34,180 36,120 C40,62 82,22 160,22 Z", tip: [80, 180], lab: [20, 200] },
    nucleus: { label: "Nucleus", c: "#9a8fd8", d: "M150,80 C182,80 196,100 194,124 C192,150 170,162 146,160 C120,158 108,138 110,118 C112,96 126,80 150,80 Z", tip: [130, 110], lab: [20, 100] },
    nucleolus: { label: "Nucleolus", c: "#5a4aa0", d: "M160,112 a12,12 0 1,0 24,0 a12,12 0 1,0 -24,0 Z", tip: [172, 112], lab: [300, 120] },
    mitochondria: {
      label: "Mitochondria", c: "#f2a65a",
      d: "M214,70 C226,60 246,64 248,76 C250,88 230,94 218,88 C210,84 208,76 214,70 Z M70,128 C80,118 100,122 100,134 C100,146 80,148 72,142 C66,138 66,132 70,128 Z",
      tip: [232, 78], lab: [300, 40],
    },
    er: { label: "Endoplasmic reticulum", line: "M200,120 C214,130 216,146 206,156 C220,160 222,176 210,184 C224,190 222,200 214,206", w: 3, c: "#59a8d8", tip: [210, 160], lab: [300, 170] },
    golgi: { label: "Golgi apparatus", line: "M90,70 q14,-10 28,0 M88,78 q16,-10 32,0 M88,86 q16,-10 32,0", w: 3, c: "#d86a9a", tip: [104, 74], lab: [20, 40] },
    ribosome: {
      label: "Ribosomes", c: "#3a3a60",
      d: [[222, 140], [228, 168], [218, 196], [120, 184], [140, 196], [96, 160]].map(([x, y]) => `M${x - 2.5},${y} a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0 Z`).join(" "),
      tip: [130, 190], lab: [20, 230],
    },
  },
};

/* ===================================================================== HEART */

const heart = {
  crop: [50, 18, 206, 278],
  title: "Heart, frontal section (patient's right is on your left)",
  ask: "Name the highlighted part of the heart.",
  viewBox: "0 0 330 300",
  regions: {
    pericardium: { label: "Pericardium", line: "M84,110 C58,126 56,184 88,226 C118,266 172,286 192,278 C228,254 252,198 242,142 C234,108 204,92 172,96", w: 3, c: "#d8b0c0", tip: [62, 170], lab: [16, 186] },
    myocardium: {
      label: "Myocardium (heart muscle)", c: "#b8505a",
      d: "M96,116 C76,126 72,176 98,214 C126,252 172,270 188,264 C218,242 238,192 230,144 C224,114 200,100 174,104 C152,96 124,98 96,116 Z",
      tip: [214, 214], lab: [270, 236],
    },
    septum: { label: "Interventricular septum", c: "#a04650", d: "M150,190 L164,166 L168,204 L184,254 L174,256 L158,236 Z", tip: [168, 214], lab: [270, 266] },
    ra: { label: "Right atrium", c: "#6f8fe0", d: "M92,118 C80,136 80,166 98,180 L132,172 L130,124 C116,114 102,112 92,118 Z", tip: [108, 146], lab: [16, 126] },
    rv: { label: "Right ventricle", c: "#5a7ad0", d: "M104,190 L136,180 L152,194 L158,238 C142,238 116,218 104,190 Z", tip: [132, 210], lab: [16, 236] },
    la: { label: "Left atrium", c: "#e88a8a", d: "M154,112 C174,104 198,108 210,122 L206,154 L160,156 Z", tip: [186, 130], lab: [270, 96] },
    lv: { label: "Left ventricle", c: "#e07070", d: "M168,168 L210,164 C218,194 208,232 186,252 C178,238 172,204 168,168 Z", tip: [194, 200], lab: [270, 206] },
    svc: { label: "Superior vena cava", c: "#5a7fd8", d: "M90,24 L112,24 L112,118 L92,118 Z", tip: [100, 60], lab: [16, 50] },
    ivc: { label: "Inferior vena cava", c: "#5a7fd8", d: "M92,180 L112,176 L110,290 L90,290 Z", tip: [100, 270], lab: [16, 276] },
    aorta: {
      label: "Aorta", c: "#e0503a",
      d: "M142,150 L142,70 C142,30 204,24 226,52 L236,102 L220,106 L212,64 C200,48 166,48 164,74 L164,150 Z",
      tip: [190, 38], lab: [270, 30],
    },
    pulmonary: { label: "Pulmonary trunk", c: "#7f8cff", d: "M126,176 L124,100 C124,86 146,84 150,98 L150,176 Z", tip: [138, 112], lab: [16, 90] },
    pulmArteries: { label: "Pulmonary arteries", c: "#7f8cff", d: "M124,100 L76,92 L76,104 L124,112 Z M150,98 L198,86 L200,98 L150,110 Z", tip: [84, 98], lab: [16, 70] },
    pulmVeins: { label: "Pulmonary veins", c: "#e88a8a", d: "M208,120 L246,112 L248,122 L210,130 Z M206,138 L248,136 L248,146 L204,148 Z", tip: [240, 128], lab: [270, 136] },
    tricuspid: { label: "Tricuspid valve", line: "M104,184 L132,176", w: 4.5, c: "#f2c94c", tip: [118, 180], lab: [16, 206] },
    pulmValve: { label: "Pulmonary valve", line: "M126,170 L150,170", w: 4.5, c: "#f2c94c", tip: [138, 170], lab: [16, 156] },
    mitral: { label: "Mitral (bicuspid) valve", line: "M168,160 L206,158", w: 4.5, c: "#f2c94c", tip: [196, 159], lab: [270, 166] },
    aorticValve: { label: "Aortic valve", line: "M144,148 L162,148", w: 4.5, c: "#f2c94c", tip: [158, 148], lab: [270, 66] },
  },
  groups: {
    atria: { label: "Atria", members: ["ra", "la"] },
    ventricles: { label: "Ventricles", members: ["rv", "lv"] },
  },
};

const conduction = {
  crop: [54, 76, 188, 200],
  title: "Conduction system of the heart",
  ask: "Name the highlighted part of the conduction system.",
  viewBox: "0 0 320 280",
  base:
    '<path d="M86,96 C64,110 60,170 90,214 C120,256 168,272 186,266 C218,242 238,190 230,138 C224,104 198,90 170,94 C146,84 116,82 86,96 Z" class="base" style="fill:#c88088"/>' +
    '<path d="M150,120 L156,236 M96,160 L206,154" class="detail"/>',
  regions: {
    sa: { label: "Sinoatrial (SA) node — the pacemaker", c: "#ffd36b", d: "M96,100 a8,6 0 1,0 16,0 a8,6 0 1,0 -16,0 Z", tip: [104, 100], lab: [16, 80] },
    av: { label: "Atrioventricular (AV) node", c: "#ff9a3d", d: "M136,156 a7,6 0 1,0 14,0 a7,6 0 1,0 -14,0 Z", tip: [143, 156], lab: [16, 150] },
    his: { label: "Bundle of His", line: "M146,160 L154,182", w: 4, c: "#59d98e", tip: [150, 172], lab: [290, 120] },
    branches: { label: "Right and left bundle branches", line: "M154,182 L134,230 M154,182 L176,236", w: 3.5, c: "#5ab0ff", tip: [168, 214], lab: [290, 190] },
    purkinje: {
      label: "Purkinje fibers", line: "M134,230 C120,224 104,206 98,186 M134,230 C140,246 160,258 176,256 M176,236 C190,232 206,214 214,190 M176,236 C176,250 180,258 186,262",
      w: 2.5, c: "#c77dff", tip: [206, 210], lab: [290, 240],
    },
  },
  overlay: '<path d="M104,100 C116,120 130,140 140,154" class="detail" style="stroke-dasharray:3 3"/>',
};

const vessels = {
  title: "Blood vessels (cross sections)",
  ask: "Which type of blood vessel is highlighted?",
  viewBox: "0 0 320 160",
  regions: {
    artery: { label: "Artery (thick muscular wall)", c: "#e0503a", d: "M24,70 a36,36 0 1,0 72,0 a36,36 0 1,0 -72,0 Z M44,70 a16,16 0 1,1 32,0 a16,16 0 1,1 -32,0 Z", tip: [60, 70], lab: [60, 130], center: true, short: "Artery" },
    vein: { label: "Vein (thin wall, has valves)", c: "#5a7fd8", d: "M120,72 C120,40 196,40 196,72 C196,104 120,104 120,72 Z M128,72 C128,48 188,48 188,72 C188,96 128,96 128,72 Z", tip: [158, 72], lab: [158, 130], center: true, short: "Vein" },
    capillary: { label: "Capillary (one cell thick)", c: "#c77dff", d: "M240,72 a14,14 0 1,0 28,0 a14,14 0 1,0 -28,0 Z M243,72 a11,11 0 1,1 22,0 a11,11 0 1,1 -22,0 Z", tip: [254, 72], lab: [254, 130], center: true, short: "Capillary" },
  },
  extraLabels: ["Lymph vessel"],
  overlay: '<path d="M146,64 l12,10 l12,-10" class="detail"/>',
};

/* ===================================================== BLOOD, LYMPH, IMMUNE */

function bloodCells() {
  const kinds = [
    ["rbc", "Erythrocyte (red blood cell)", 22, "#d84848"],
    ["neutrophil", "Neutrophil", 22, "#eadcf2"],
    ["eosinophil", "Eosinophil", 22, "#f4c2b2"],
    ["basophil", "Basophil", 21, "#cfc2ea"],
    ["lymphocyte", "Lymphocyte", 17, "#cfdcf2"],
    ["monocyte", "Monocyte", 26, "#ddd6ec"],
    ["platelet", "Platelets (thrombocytes)", 0, "#c9a0e0"],
  ];
  const regions = {};
  const over = [];
  kinds.forEach(([id, label, r, c], i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = 40 + col * 76, y = 46 + row * 104;
    const d = id === "platelet"
      ? [[-12, -6, 5], [6, -10, 4], [12, 8, 5], [-6, 10, 4]].map(([dx, dy, rr]) => circle(x + dx, y + dy, rr)).join(" ")
      : circle(x, y, r);
    regions[id] = { label, short: label.split(" (")[0], d, c, tip: [x, y], lab: [x, y + 46], center: true };
    const nuc = "#5a3a8a";
    if (id === "rbc") over.push(`<path d="${circle(x, y, 9)}" style="fill:#f08a8a55"/>`);
    if (id === "neutrophil") over.push(`<path d="${circle(x - 8, y - 4, 6)} ${circle(x + 2, y + 4, 6)} ${circle(x + 10, y - 3, 5)}" style="fill:${nuc}"/>`);
    if (id === "eosinophil") {
      over.push(`<path d="${circle(x - 7, y, 7)} ${circle(x + 7, y, 7)}" style="fill:${nuc}"/>`);
      [[-14, -10], [12, -12], [-2, 14], [14, 10], [-14, 10], [0, -16]].forEach(([dx, dy]) => over.push(`<path d="${circle(x + dx, y + dy, 2.5)}" style="fill:#e0503a"/>`));
    }
    if (id === "basophil") {
      over.push(`<path d="${circle(x, y, 9)}" style="fill:${nuc}"/>`);
      [[-12, -8], [10, -12], [-4, 13], [13, 7], [-14, 6], [2, -15], [8, 2], [-6, -2]].forEach(([dx, dy]) => over.push(`<path d="${circle(x + dx, y + dy, 2.8)}" style="fill:#2a1a5a"/>`));
    }
    if (id === "lymphocyte") over.push(`<path d="${circle(x, y, 13)}" style="fill:${nuc}"/>`);
    if (id === "monocyte") over.push(`<path d="M${x - 14},${y - 6} C${x - 10},${y - 18} ${x + 14},${y - 18} ${x + 14},${y - 2} C${x + 14},${y + 12} ${x - 6},${y + 14} ${x - 4},${y + 2} C${x - 2},${y - 6} ${x - 14},${y + 6} ${x - 14},${y - 6} Z" style="fill:${nuc}"/>`);
  });
  return {
    title: "Formed elements of the blood",
    ask: "Which blood cell is highlighted?",
    viewBox: "0 0 320 220",
    regions,
    groups: { leukocytes: { label: "Leukocytes (white blood cells)", members: ["neutrophil", "eosinophil", "basophil", "lymphocyte", "monocyte"] } },
    overlay: over.join(""),
  };
}

const bloodTube = {
  title: "Blood sample after spinning (centrifuged)",
  ask: "Name the highlighted layer of the blood sample.",
  viewBox: "0 0 200 280",
  crop: [50, 0, 100, 280],
  base: '<path d="M80,10 L120,10 L120,240 C120,270 80,270 80,240 Z" class="base" style="fill:#e9ecff22"/>',
  regions: {
    plasma: { label: "Plasma (about 55%)", c: "#f2d36b", d: "M82,40 L118,40 L118,150 L82,150 Z", tip: [100, 90], lab: [190, 90] },
    buffy: { label: "Buffy coat (white cells and platelets)", c: "#f4f1e8", d: "M82,150 L118,150 L118,156 L82,156 Z", tip: [110, 153], lab: [190, 150] },
    rbcs: { label: "Red blood cells (hematocrit, about 45%)", c: "#c0303a", d: "M82,156 L118,156 L118,240 C118,266 82,266 82,240 Z", tip: [100, 210], lab: [190, 210] },
  },
  groups: { formed: { label: "Formed elements", members: ["buffy", "rbcs"], tip: [90, 200], lab: [10, 200] } },
  extraLabels: ["Serum"],
};

const BODY =
  '<path d="M150,18 C164,18 172,30 172,42 C172,56 164,64 150,64 C136,64 128,56 128,42 C128,30 136,18 150,18 Z ' +
  'M140,64 L160,64 L162,76 C186,78 202,84 206,96 L222,190 L208,194 L194,112 L192,206 L186,350 L162,350 L152,226 L148,226 L138,350 L114,350 ' +
  'L108,206 L106,112 L92,194 L78,190 L94,96 C98,84 114,78 138,76 Z" class="base" style="fill:#262c55"/>';

const lymphatic = {
  title: "Lymphatic system",
  ask: "Name the highlighted lymphatic structure.",
  viewBox: "0 0 300 360",
  crop: [70, 10, 160, 344],
  base: BODY,
  regions: {
    vessels: {
      label: "Lymph vessels", line: "M114,120 L100,186 M186,120 L200,186 M128,232 L124,340 M172,232 L176,340 M150,150 L132,224 M150,150 L168,224",
      w: 1.6, c: "#59d98e", tip: [124, 300], lab: [10, 300],
    },
    duct: { label: "Thoracic duct", line: "M150,216 L148,150 L146,92 L140,84", w: 3, c: "#2fae6e", tip: [148, 170], lab: [290, 170] },
    tonsils: { label: "Tonsils", d: `${circle(143, 54, 3)} ${circle(157, 54, 3)}`, c: "#f2a65a", tip: [157, 54], lab: [290, 40] },
    cervical: { label: "Cervical lymph nodes", d: [[138, 70], [134, 76], [162, 70], [166, 76]].map(([x, y]) => circle(x, y, 3)).join(" "), c: "#7fd06f", tip: [134, 76], lab: [10, 70] },
    thymus: { label: "Thymus", d: "M144,88 C140,98 142,108 150,110 C158,108 160,98 156,88 Z", c: "#f2c94c", tip: [150, 100], lab: [290, 96] },
    axillary: { label: "Axillary lymph nodes", d: [[112, 106], [116, 112], [188, 106], [184, 112]].map(([x, y]) => circle(x, y, 3.2)).join(" "), c: "#7fd06f", tip: [112, 106], lab: [10, 110] },
    spleen: { label: "Spleen", d: "M176,140 C186,136 194,146 190,160 C186,168 178,166 176,158 Z", c: "#a04a8a", tip: [186, 152], lab: [290, 140] },
    intestinal: { label: "Lymph nodes of the intestines", d: [[140, 176], [152, 182], [162, 174], [146, 192]].map(([x, y]) => circle(x, y, 2.6)).join(" "), c: "#7fd06f", tip: [152, 182], lab: [290, 206] },
    inguinal: { label: "Inguinal lymph nodes", d: [[128, 226], [134, 232], [172, 226], [166, 232]].map(([x, y]) => circle(x, y, 3.2)).join(" "), c: "#7fd06f", tip: [128, 226], lab: [10, 232] },
    marrow: { label: "Red bone marrow", line: "M124,262 L122,300 M176,262 L178,300", w: 3, c: "#d84848", tip: [123, 280], lab: [10, 270] },
  },
  groups: {
    nodes: { label: "Lymph nodes", members: ["cervical", "axillary", "inguinal", "intestinal"], tip: [116, 112], lab: [10, 150] },
  },
};

/* =============================================================== RESPIRATORY */

const respiratory = {
  title: "Respiratory system (patient's right is on your left)",
  ask: "Name the highlighted part of the respiratory system.",
  viewBox: "0 0 320 320",
  crop: [52, 8, 216, 304],
  base: '<path d="M126,64 C120,40 130,12 160,12 C190,12 200,40 194,64" class="detail" style="stroke:#8f97c9;stroke-dasharray:3 3"/>',
  regions: {
    rul: { label: "Right upper lobe", c: "#f0a8b8", d: "M146,150 C116,130 76,144 66,190 L68,200 L146,206 Z", tip: [100, 170], lab: [10, 150] },
    rml: { label: "Right middle lobe", c: "#e890a8", d: "M68,200 L146,206 L146,240 C120,236 92,240 72,250 C66,234 66,214 68,200 Z", tip: [96, 222], lab: [10, 214] },
    rll: { label: "Right lower lobe", c: "#d87898", d: "M72,250 C92,240 120,236 146,240 L146,290 C128,294 100,296 76,300 C66,284 64,266 72,250 Z", tip: [100, 270], lab: [10, 266] },
    lul: { label: "Left upper lobe", c: "#f0a8b8", d: "M174,150 C204,130 240,144 248,190 L250,212 C224,214 198,222 182,236 L174,232 Z", tip: [216, 180], lab: [310, 160] },
    lll: { label: "Left lower lobe", c: "#d87898", d: "M250,212 C256,250 252,282 238,300 C216,296 196,294 180,290 L180,270 C192,262 194,246 182,236 C198,222 224,214 250,212 Z", tip: [222, 260], lab: [310, 262] },
    nasal: { label: "Nasal cavity", c: "#8fe0e0", d: "M146,22 C154,18 168,20 172,30 L174,46 L148,50 C142,42 140,28 146,22 Z", tip: [160, 34], lab: [10, 30] },
    pharynx: { label: "Pharynx (throat)", c: "#7fb8e0", d: "M156,48 L172,46 L172,96 L158,98 Z", tip: [166, 72], lab: [310, 70] },
    larynx: { label: "Larynx (voice box)", c: "#9a8fd8", d: "M148,98 L172,98 L170,126 L150,126 Z", tip: [160, 112], lab: [10, 106] },
    epiglottis: { label: "Epiglottis", line: "M150,96 L162,88", w: 3, c: "#f2c94c", tip: [156, 92], lab: [310, 94] },
    trachea: { label: "Trachea (windpipe)", c: "#cfd5e8", d: "M152,126 L168,126 L168,190 L152,190 Z", tip: [160, 160], lab: [310, 126] },
    bronchi: { label: "Bronchi", c: "#e9e2cf", d: "M152,186 L158,192 L132,226 L124,220 Z M162,192 L168,186 L204,210 L198,218 Z", tip: [140, 206], lab: [10, 190] },
    bronchioles: {
      label: "Bronchioles", line: "M128,222 l-18,14 M128,222 l-4,26 M110,236 l-14,4 M110,236 l-2,14 M200,214 l18,12 M200,214 l4,26 M218,226 l14,0 M218,226 l2,14",
      w: 2, c: "#f4f1e8", tip: [218, 226], lab: [310, 214],
    },
    alveoli: { label: "Alveoli (air sacs)", d: [[94, 240], [99, 244], [94, 248], [106, 252], [110, 256], [105, 258]].map(([x, y]) => circle(x, y, 3)).join(" "), c: "#ffd0dc", tip: [100, 248], lab: [10, 240] },
    pleura: { label: "Pleura", line: "M148,146 C114,124 70,140 60,190 C52,240 56,284 72,304 M172,146 C206,124 250,140 260,190 C268,240 264,284 248,304", w: 2, c: "#c7c9ff", tip: [60, 190], lab: [10, 180] },
    diaphragm: { label: "Diaphragm", line: "M56,306 C100,286 130,298 160,302 C190,298 220,286 264,306", w: 4, c: "#c96b72", tip: [210, 292], lab: [310, 300] },
  },
  groups: {
    rightLung: { label: "Right lung (3 lobes)", members: ["rul", "rml", "rll"], tip: [80, 230], lab: [10, 290] },
    leftLung: { label: "Left lung (2 lobes)", members: ["lul", "lll"], tip: [240, 230], lab: [310, 240] },
    upper: { label: "Upper respiratory tract", members: ["nasal", "pharynx", "larynx"], tip: [150, 60], lab: [10, 56] },
    lower: { label: "Lower respiratory tract", members: ["trachea", "bronchi", "rul", "rml", "rll", "lul", "lll", "alveoli"], tip: [160, 176], lab: [310, 186] },
  },
  overlay: [134, 142, 150, 158, 166, 174, 182].map((y) => `<path d="M152,${y} h16" class="detail"/>`).join(""),
};

const alveolus = {
  crop: [0, 22, 300, 182],
  title: "Alveoli and gas exchange",
  ask: "Name the highlighted structure.",
  viewBox: "0 0 300 210",
  regions: {
    bronchiole: { label: "Terminal bronchiole", c: "#e9e2cf", d: "M10,98 L104,98 L104,118 L10,118 Z", tip: [50, 108], lab: [10, 150] },
    duct: { label: "Alveolar duct", c: "#d8cfb4", d: "M104,102 L136,94 L142,124 L104,114 Z", tip: [122, 110], lab: [10, 186] },
    alveoli: {
      label: "Alveoli", c: "#ffd0dc",
      d: [[168, 78], [204, 70], [234, 96], [228, 134], [196, 148], [164, 134], [196, 108]].map(([x, y]) => circle(x, y, 20)).join(" "),
      tip: [204, 70], lab: [290, 40],
    },
    capillaries: {
      label: "Pulmonary capillaries", line: "M150,50 C190,30 254,50 260,106 C266,160 214,176 166,166 M140,140 C150,170 210,184 248,160",
      w: 3.5, c: "#c77dff", tip: [258, 120], lab: [290, 130],
    },
  },
  overlay:
    '<text x="152" y="112" class="lbl" style="font-size:11px">O₂ →</text><text x="214" y="114" class="lbl" style="font-size:11px">← CO₂</text>' +
    '<text x="150" y="196" class="lbl">O₂ moves into the blood; CO₂ moves out to be exhaled</text>',
};

const airway = {
  title: "Head and neck, side view (face to the left)",
  ask: "Name the highlighted part of the airway.",
  viewBox: "0 0 300 300",
  crop: [50, 10, 200, 290],
  base:
    '<path d="M100,20 C80,30 74,60 76,76 L60,96 L76,104 L74,124 L84,132 L80,146 L90,170 L108,174 L110,292 L206,292 L204,200 C226,180 236,140 232,100 C228,40 190,18 150,16 C130,16 112,16 100,20 Z" class="base"/>',
  regions: {
    nasal: { label: "Nasal cavity", c: "#8fe0e0", d: "M86,70 L152,62 L156,98 L84,104 Z", tip: [118, 84], lab: [10, 70] },
    hardPalate: { label: "Hard palate", c: "#e9e2cf", d: "M84,104 L140,100 L140,107 L86,110 Z", tip: [110, 106], lab: [10, 106] },
    softPalate: { label: "Soft palate", c: "#f0a8b8", d: "M140,100 L158,104 L156,124 L148,118 L140,107 Z", tip: [150, 112], lab: [290, 112] },
    tongue: { label: "Tongue", c: "#d87070", d: "M92,118 C110,110 140,112 148,124 C152,146 140,164 120,166 L100,160 C94,148 90,130 92,118 Z", tip: [118, 140], lab: [10, 140] },
    nasopharynx: { label: "Nasopharynx", c: "#7fb8e0", d: "M156,62 L178,60 L178,104 L158,104 Z", tip: [168, 80], lab: [290, 70] },
    oropharynx: { label: "Oropharynx", c: "#6aa0d8", d: "M158,104 L178,104 L178,150 L156,150 Z", tip: [168, 128], lab: [290, 136] },
    laryngopharynx: { label: "Laryngopharynx", c: "#5a88c8", d: "M160,150 L178,150 L180,196 L164,196 Z", tip: [172, 176], lab: [290, 170] },
    epiglottis: { label: "Epiglottis", c: "#f2c94c", d: "M148,150 L158,140 L161,146 L154,160 Z", tip: [155, 150], lab: [10, 168] },
    larynx: { label: "Larynx (voice box)", c: "#9a8fd8", d: "M136,160 L158,160 L160,204 L138,204 Z", tip: [146, 186], lab: [10, 196] },
    cords: { label: "Vocal cords", line: "M138,184 L158,184", w: 3, c: "#f4f1e8", tip: [154, 184], lab: [10, 226] },
    trachea: { label: "Trachea", c: "#cfd5e8", d: "M138,204 L160,204 L160,290 L138,290 Z", tip: [148, 250], lab: [10, 262] },
    esophagus: { label: "Esophagus", c: "#e8b090", d: "M164,200 L182,200 L182,290 L164,290 Z", tip: [174, 250], lab: [290, 250] },
  },
  groups: {
    pharynx: { label: "Pharynx (throat)", members: ["nasopharynx", "oropharynx", "laryngopharynx"], tip: [178, 120], lab: [290, 100] },
  },
  overlay: [214, 226, 238, 250, 262, 274].map((y) => `<path d="M138,${y} h22" class="detail"/>`).join(""),
};

/* ================================================================== EXPORTS */

export const DIAGRAMS = {
  skullLateral, skullAnterior, skullInferior, skeleton, spine: spine(), longBone: longBoneDiagram,
  fractures: fractures(), joint, skin, burns, lesions: lesions(), planes, quadrants, regions: nineRegions(),
  cavities, cell, heart, conduction, vessels,
  bloodCells: bloodCells(), bloodTube, lymphatic, respiratory, alveolus, airway,
};

// Label of a region or group.
export function partLabel(name, id) {
  const d = DIAGRAMS[name];
  return d?.regions[id]?.label || d?.groups?.[id]?.label || null;
}

// Labels that could be confused with `id` (a group and its own members).
export function overlapping(name, id) {
  const d = DIAGRAMS[name];
  const out = new Set([id]);
  for (const [gid, g] of Object.entries(d.groups || {})) {
    if (gid === id) g.members.forEach((m) => out.add(m));
    if (g.members.includes(id)) out.add(gid);
  }
  return out;
}

// Every answer label in a diagram except those overlapping `id`.
export function otherLabels(name, id) {
  const d = DIAGRAMS[name];
  const skip = overlapping(name, id);
  const seen = new Set([partLabel(name, id)]);
  const labels = [];
  const add = (l) => { if (l && !seen.has(l)) { seen.add(l); labels.push(l); } };
  for (const [rid, r] of Object.entries(d.regions)) if (!skip.has(rid)) add(r.label);
  for (const [gid, g] of Object.entries(d.groups || {})) if (!skip.has(gid)) add(g.label);
  (d.extraLabels || []).forEach(add);
  return labels;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// SVG for a diagram. highlight: a region or group id.
// labels: "none" | "one" (only the highlighted part) | "all" (atlas style).
export function renderDiagram(name, highlight = null, { labels = "none" } = {}) {
  const d = DIAGRAMS[name];
  if (!d) return "";
  const lit = new Set();
  if (highlight) {
    lit.add(highlight);
    (d.groups?.[highlight]?.members || []).forEach((m) => lit.add(m));
  }
  const fills = [], outlines = [], strokes = [];
  for (const [id, r] of Object.entries(d.regions)) {
    const hl = lit.has(id) ? " hl" : "";
    const title = `<title>${esc(r.label)}</title>`;
    if (r.line) {
      strokes.push(`<path d="${r.line}" class="rbo" style="stroke-width:${r.w + 2}"/>`);
      strokes.push(`<path d="${r.line}" class="rb${hl}" style="stroke:${r.c};stroke-width:${r.w}">${title}</path>`);
    } else if (d.solid) {
      outlines.push(`<path d="${r.d}" class="solid-o"/>`);
      fills.push(`<path d="${r.d}" class="r solid${hl}" style="fill:${r.c}">${title}</path>`);
    } else {
      fills.push(`<path d="${r.d}" class="r${hl}" style="fill:${r.c}">${title}</path>`);
    }
  }
  const [, , VW, VH] = d.viewBox.split(" ").map(Number);
  const [cx0, cy0, W0, H0] = d.crop || [0, 0, VW, VH];
  const charW = 6; // generous so labels never touch the drawing, whichever font loads
  const want = [];
  const consider = (id, item, isGroup) => {
    if (!item.lab || labels === "none") return;
    if (labels === "one" && id !== highlight) return;
    if (isGroup && id !== highlight) return; // groups are labelled only when asked about
    want.push({ id, item, on: lit.has(id) || id === highlight });
  };
  for (const [id, r] of Object.entries(d.regions)) consider(id, r, false);
  for (const [id, g] of Object.entries(d.groups || {})) consider(id, g, true);
  // Side columns: labels left/right of the drawing, spaced so they never overlap.
  const cols = { L: [], R: [] };
  const centered = [];
  for (const w of want) {
    if (w.item.center) centered.push(w);
    else cols[w.item.lab[0] - cx0 < W0 / 2 ? "L" : "R"].push(w);
  }
  const width = (w) => w.item.label.length * charW * (w.on ? 1.2 : 1);
  const padL = cols.L.length ? Math.max(...cols.L.map(width)) + 16 : 0;
  const padR = cols.R.length ? Math.max(...cols.R.map(width)) + 16 : 0;
  const totalW = padL + W0 + padR;
  for (const side of ["L", "R"]) {
    const list = cols[side].sort((a, b) => a.item.lab[1] - b.item.lab[1]);
    let y = 0;
    for (const w of list) { w.y = Math.max(Math.min(Math.max(w.item.lab[1] - cy0, 10), H0 - 4), y + 13); y = w.y; }
    let over = y - (H0 - 4);
    for (let i = list.length - 1; i >= 0 && over > 0; i--) {
      const room = i > 0 ? list[i].y - list[i - 1].y - 13 : list[i].y - 10;
      list[i].y -= over;
      over = Math.max(0, -room + over > 0 ? over - Math.max(0, room) : 0);
    }
  }
  const items = [];
  const draw = (w, side) => {
    const [tx, ty] = (w.item.tip || w.item.lab);
    const tipX = tx - cx0 + padL;
    const tipY = ty - cy0;
    const on = w.on ? " on" : "";
    let x, anchor, fromX;
    if (side === "L") { x = 4; anchor = "start"; fromX = 4 + width(w) + 3; }
    else { x = totalW - 4; anchor = "end"; fromX = totalW - 4 - width(w) - 3; }
    items.push(`<path d="M${fromX.toFixed(1)},${w.y - 3} L${tipX},${tipY}" class="leader${on}"/><circle cx="${tipX}" cy="${tipY}" r="1.8" class="dot${on}"/>`);
    items.push(`<text x="${x}" y="${w.y}" text-anchor="${anchor}" class="tag${on}">${esc(w.item.label)}</text>`);
  };
  cols.L.forEach((w) => draw(w, "L"));
  cols.R.forEach((w) => draw(w, "R"));
  for (const w of centered) {
    const [lx, ly] = w.item.lab;
    items.push(`<text x="${lx - cx0 + padL}" y="${ly - cy0}" text-anchor="middle" class="tag${w.on ? " on" : ""}">${esc(w.item.short || w.item.label)}</text>`);
  }
  let caption = "";
  if (labels !== "none" && highlight) {
    const lab = partLabel(name, highlight);
    const item = d.regions[highlight] || d.groups?.[highlight];
    if (!item?.lab) caption = `<figcaption>${esc(lab)}</figcaption>`;
  }
  return `<figure class="dg"><svg viewBox="0 0 ${totalW.toFixed(0)} ${H0}" role="img" aria-label="${esc(d.title)}">` +
    `<g transform="translate(${(padL - cx0).toFixed(1)},${-cy0})">${d.base || ""}${outlines.join("")}${fills.join("")}${d.overlay || ""}${strokes.join("")}</g>${items.join("")}</svg>` +
    `<figcaption class="dg-title">${esc(d.title)}</figcaption>${caption}</figure>`;
}
