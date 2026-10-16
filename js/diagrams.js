// Hand-drawn schematic anatomy diagrams (original artwork) used by the study mode.
// Each diagram has named regions; a question highlights one and asks for its name.
// Region shapes: { label, d } filled path, or { label, bone: "M.. L..", w } thick stroke.

const mirror = (pts, W) => pts.map(([x, y]) => [W - x, y]);
const line = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
const both = (pts, W) => `${line(pts)} ${line(mirror(pts, W))}`;

/* ------------------------------------------------------------------- skull */
const skull = {
  title: "Skull, lateral view (facing left)",
  ask: "Name the highlighted bone of the skull.",
  viewBox: "0 0 220 175",
  regions: {
    frontal: { label: "Frontal bone", d: "M44,96 C38,62 58,26 100,17 L112,17 C106,40 101,62 98,84 L74,92 Z", c: "#cfd5e8" },
    parietal: { label: "Parietal bone", d: "M112,17 C144,17 170,30 183,55 L151,75 C131,69 112,72 98,84 C101,62 106,40 112,17 Z", c: "#bfc7e0" },
    occipital: { label: "Occipital bone", d: "M183,55 C197,76 196,103 181,127 L161,116 C159,101 156,86 151,75 Z", c: "#cfd5e8" },
    temporal: { label: "Temporal bone", d: "M98,84 C112,72 131,69 151,75 C156,86 159,101 161,116 L131,119 C118,113 106,109 99,101 Z", c: "#b3bcd8" },
    sphenoid: { label: "Sphenoid bone", d: "M80,94 L98,84 L99,101 L89,109 Z", c: "#a8b2d0" },
    zygomatic: { label: "Zygomatic bone", d: "M56,108 L80,104 L89,109 L113,111 L112,118 L84,120 L61,122 Z", c: "#bfc7e0" },
    nasal: { label: "Nasal bone", d: "M41,95 L50,97 L45,113 L35,110 Z", c: "#b3bcd8" },
    maxilla: { label: "Maxilla", d: "M35,111 L45,114 L61,122 L84,120 L89,139 L46,145 C40,135 36,124 35,111 Z", c: "#cfd5e8" },
    mandible: { label: "Mandible", d: "M47,149 L91,144 L99,128 L109,119 L119,122 L112,150 C102,166 64,170 47,159 Z", c: "#bfc7e0" },
  },
  overlay:
    '<circle cx="66" cy="94" r="11" class="hole"/><circle cx="141" cy="105" r="4" class="hole"/>' +
    '<path d="M50,143 L88,139 M52,150 L90,146" class="detail"/>',
};

/* ---------------------------------------------------------------- skeleton */
const SW = 160;
const skeleton = {
  title: "Skeleton, anterior view",
  ask: "Name the highlighted bone or bone group.",
  viewBox: "0 0 160 300",
  regions: {
    cranium: { label: "Cranium", d: "M80,4 C96,4 99,18 98,26 C97,34 92,38 80,38 C68,38 63,34 62,26 C61,18 64,4 80,4 Z", c: "#cfd5e8" },
    mandible: { label: "Mandible", d: "M68,34 C72,44 88,44 92,34 L90,40 C86,48 74,48 70,40 Z", c: "#bfc7e0" },
    clavicle: { label: "Clavicle", bone: both([[60, 58], [77, 54]], SW), w: 4 },
    sternum: { label: "Sternum", d: "M76,57 L84,57 L83,96 L80,101 L77,96 Z", c: "#cfd5e8" },
    ribs: { label: "Ribs", bone: [66, 72, 80, 88].map((y) => both([[76, y - 8], [64, y - 6], [58, y + 2], [62, y + 8]], SW)).join(" "), w: 3, open: true },
    vertebrae: { label: "Vertebral column", bone: "M80,104 L80,140", w: 7, dash: "5 2" },
    pelvis: { label: "Pelvis", d: "M58,140 C64,134 74,140 80,146 C86,140 96,134 102,140 C106,152 100,166 90,170 L80,164 L70,170 C60,166 54,152 58,140 Z", c: "#bfc7e0" },
    humerus: { label: "Humerus", bone: both([[56, 62], [48, 112]], SW), w: 6 },
    radius: { label: "Radius", bone: both([[46, 118], [36, 162]], SW), w: 3.5 },
    ulna: { label: "Ulna", bone: both([[51, 118], [44, 164]], SW), w: 3.5 },
    carpals: { label: "Carpals", d: `M32,166 L46,166 L45,174 L31,174 Z M128,166 L114,166 L115,174 L129,174 Z`, c: "#a8b2d0" },
    metacarpals: { label: "Metacarpals", bone: [31, 35, 39, 43].map((x) => both([[x + 1, 176], [x - 1, 188]], SW)).join(" "), w: 2.5 },
    phalanges: {
      label: "Phalanges",
      bone: [31, 35, 39, 43].map((x) => both([[x - 1, 191], [x - 2, 201]], SW)).join(" ") + " " +
        [62, 66, 70, 74].map((x) => both([[x, 291], [x, 296]], SW)).join(" "),
      w: 2.5,
    },
    femur: { label: "Femur", bone: both([[68, 166], [64, 224]], SW), w: 7 },
    patella: { label: "Patella", d: "M60,226 C60,220 70,220 70,226 C70,233 60,233 60,226 Z M100,226 C100,220 90,220 90,226 C90,233 100,233 100,226 Z", c: "#a8b2d0" },
    tibia: { label: "Tibia", bone: both([[67, 236], [67, 278]], SW), w: 5.5 },
    fibula: { label: "Fibula", bone: both([[59, 238], [60, 278]], SW), w: 2.5 },
    tarsals: { label: "Tarsals", d: "M57,280 L72,280 L73,287 L56,287 Z M103,280 L88,280 L87,287 L104,287 Z", c: "#a8b2d0" },
    metatarsals: { label: "Metatarsals", bone: [62, 66, 70, 74].map((x) => both([[x - 1, 288], [x, 290]], SW)).join(" "), w: 2.5 },
  },
};

/* -------------------------------------------------------- vertebral column */
function spine() {
  const regions = {};
  const groups = [
    ["cervical", "Cervical vertebrae", 7, "#cfd5e8"],
    ["thoracic", "Thoracic vertebrae", 12, "#b3bcd8"],
    ["lumbar", "Lumbar vertebrae", 5, "#cfd5e8"],
  ];
  let y = 12, i = 0;
  const xAt = (yy) => 70 + Math.sin((yy / 260) * Math.PI * 2.1 + 0.6) * 14;
  for (const [id, label, n, c] of groups) {
    const parts = [];
    const h = id === "cervical" ? 8 : id === "thoracic" ? 10 : 13;
    const w = id === "cervical" ? 16 : id === "thoracic" ? 20 : 26;
    for (let k = 0; k < n; k++, i++) {
      const x = xAt(y);
      parts.push(`M${(x - w / 2).toFixed(1)},${y} h${w} v${h - 2} h-${w} Z`);
      y += h + 1.5;
    }
    regions[id] = { label, d: parts.join(" "), c };
  }
  const sx = xAt(y);
  regions.sacrum = { label: "Sacrum", d: `M${sx - 15},${y + 1} L${sx + 15},${y + 1} L${sx + 6},${y + 34} L${sx - 2},${y + 36} Z`, c: "#b3bcd8" };
  regions.coccyx = { label: "Coccyx", d: `M${sx - 1},${y + 38} L${sx + 6},${y + 37} L${sx + 4},${y + 48} L${sx + 1},${y + 49} Z`, c: "#a8b2d0" };
  return {
    title: "Vertebral column, lateral view",
    ask: "Name the highlighted section of the spine.",
    viewBox: `0 0 140 ${Math.ceil(y + 56)}`,
    regions,
  };
}

/* ------------------------------------------------------------------- joint */
const joint = {
  title: "Synovial joint (knee-style), simplified",
  ask: "Name the highlighted structure of the joint.",
  viewBox: "0 0 200 200",
  regions: {
    bone: { label: "Bone", d: "M70,4 L130,4 L130,78 C130,96 70,96 70,78 Z M70,192 L130,192 L130,124 C130,108 70,108 70,124 Z", c: "#cfd5e8" },
    cartilage: { label: "Articular cartilage", d: "M70,80 C70,98 130,98 130,80 L130,86 C130,104 70,104 70,86 Z M70,122 C70,106 130,106 130,122 L130,116 C130,100 70,100 70,116 Z", c: "#8fe0d8" },
    fluid: { label: "Joint cavity (synovial fluid)", d: "M72,96 C80,104 120,104 128,96 L128,106 C120,100 80,100 72,106 Z", c: "#5ab0ff" },
    membrane: { label: "Synovial membrane", d: "M64,84 C60,92 60,110 64,118 L68,118 C65,108 65,94 68,84 Z M136,84 C140,92 140,110 136,118 L132,118 C135,108 135,94 132,84 Z", c: "#c77dff" },
    capsule: { label: "Joint capsule", d: "M56,80 C50,92 50,112 56,124 L62,124 C57,112 57,92 62,80 Z", c: "#7f8cff" },
    ligament: { label: "Ligament", d: "M138,70 L148,72 L146,132 L136,132 Z", c: "#e8e2d0" },
    muscle: { label: "Skeletal muscle", d: "M22,8 C32,2 54,2 60,8 L58,66 C50,74 32,74 24,66 Z", c: "#c96b72" },
    tendon: { label: "Tendon", d: "M38,70 L46,70 L72,142 L66,146 Z", c: "#e8e2d0" },
  },
  overlay: '<path d="M30,20 L52,60 M36,14 L56,52" class="detail"/>',
};

/* -------------------------------------------------------------------- skin */
const SKIN_BASE =
  '<rect x="0" y="138" width="220" height="22" class="base" style="fill:#7a3b46"/>' +
  "";
const FAT = [20, 45, 95, 120, 175, 200].map((x) => `<circle cx="${x}" cy="${116 + (x % 3) * 4}" r="9" class="detail" style="fill:#f4e6b0"/>`).join("");
const skin = {
  title: "Skin and its layers",
  ask: "Name the highlighted layer or structure.",
  viewBox: "0 0 220 160",
  base: SKIN_BASE,
  regions: {
    subcutaneous: { label: "Subcutaneous layer (hypodermis)", d: "M0,98 L220,98 L220,138 L0,138 Z", c: "#e9d79a" },
    dermis: { label: "Dermis", d: "M0,34 C20,40 30,30 50,36 C70,42 80,30 100,36 C120,42 130,30 150,36 C170,42 180,30 200,36 L220,34 L220,98 L0,98 Z", c: "#e8a8a0" },
    epidermis: { label: "Epidermis", d: "M0,18 L220,18 L220,34 L200,36 C180,30 170,42 150,36 C130,30 120,42 100,36 C80,30 70,42 50,36 C30,30 20,40 0,34 Z", c: "#f6cfae" },
    hair: { label: "Hair shaft", d: "M58,0 L63,0 L64,40 L59,40 Z", c: "#3a2a20" },
    follicle: { label: "Hair follicle", d: "M55,40 L68,40 L70,96 C70,104 54,104 54,96 Z", c: "#b07a5a" },
    sebaceous: { label: "Sebaceous (oil) gland", d: "M70,52 C84,48 88,64 76,68 L70,66 Z", c: "#f2c94c" },
    arrector: { label: "Arrector pili muscle", d: "M68,78 L96,50 L100,54 L72,82 Z", c: "#c96b72" },
    sweat: { label: "Sweat (sudoriferous) gland", d: "M150,18 L154,18 L156,84 C172,82 174,100 158,100 C142,102 140,86 152,84 Z", c: "#5ab0ff" },
  },
  overlay: FAT + '<path d="M120,70 C130,66 136,74 146,70 M10,80 C20,76 30,84 40,80" class="detail" style="stroke:#a33"/>',
};

const burns = {
  title: "Burn depth",
  ask: "What depth of burn is highlighted?",
  viewBox: "0 0 220 160",
  base:
    '<rect x="0" y="18" width="220" height="16" class="base" style="fill:#f6cfae"/>' +
    '<rect x="0" y="34" width="220" height="64" class="base" style="fill:#e8a8a0"/>' +
    '<rect x="0" y="98" width="220" height="40" class="base" style="fill:#e9d79a"/>' +
    '<rect x="0" y="138" width="220" height="22" class="base" style="fill:#c96b72"/>' +
    '<text x="2" y="30" class="lbl">epidermis</text><text x="2" y="70" class="lbl">dermis</text>' +
    '<text x="2" y="122" class="lbl">fat</text><text x="2" y="152" class="lbl">muscle</text>',
  regions: {
    first: { label: "Superficial (first-degree) burn", d: "M62,18 L96,18 L96,34 L62,34 Z", c: "#ff8a6a" },
    second: { label: "Partial-thickness (second-degree) burn", d: "M102,18 L136,18 L136,70 L102,70 Z", c: "#e0503a" },
    third: { label: "Full-thickness (third-degree) burn", d: "M142,18 L176,18 L176,104 L142,104 Z", c: "#7a2a20" },
    fourth: { label: "Fourth-degree burn (into muscle or bone)", d: "M182,18 L216,18 L216,156 L182,156 Z", c: "#2a1a18" },
  },
};

/* -------------------------------------------------------------- body plans */
const planes = {
  title: "Planes of the body",
  ask: "Name the highlighted plane.",
  viewBox: "0 0 200 220",
  regions: {
    frontal: { label: "Frontal (coronal) plane", d: "M40,60 L150,40 L150,170 L40,190 Z", c: "#5ab0ff" },
    sagittal: { label: "Sagittal plane", d: "M92,20 L122,40 L122,200 L92,180 Z", c: "#59d98e" },
    transverse: { label: "Transverse (horizontal) plane", d: "M30,112 L140,92 L180,120 L70,140 Z", c: "#f2c94c" },
  },
  extraLabels: ["Oblique plane"],
  overlay:
    '<circle cx="100" cy="38" r="12" class="figure"/><path d="M100,50 L100,130 M100,64 L76,104 M100,64 L124,104 M100,130 L84,190 M100,130 L116,190" class="figure-line"/>',
};

const quadrants = {
  title: "Abdominal quadrants (patient's right is on your left)",
  ask: "Name the highlighted abdominal quadrant.",
  viewBox: "0 0 180 200",
  base: '<path d="M30,20 C30,10 150,10 150,20 L160,170 C120,196 60,196 20,170 Z" class="base"/>',
  regions: {
    ruq: { label: "Right upper quadrant (RUQ)", d: "M30,28 L90,28 L90,100 L25,100 Z", c: "#b3bcd8" },
    luq: { label: "Left upper quadrant (LUQ)", d: "M90,28 L150,28 L155,100 L90,100 Z", c: "#cfd5e8" },
    rlq: { label: "Right lower quadrant (RLQ)", d: "M25,100 L90,100 L90,180 C60,178 40,172 22,164 Z", c: "#cfd5e8" },
    llq: { label: "Left lower quadrant (LLQ)", d: "M90,100 L155,100 L158,164 C140,172 120,178 90,180 Z", c: "#b3bcd8" },
  },
  overlay: '<circle cx="90" cy="100" r="3" class="hole"/><text x="6" y="16" class="lbl">R</text><text x="166" y="16" class="lbl">L</text>',
};

function nineRegions() {
  const xs = [24, 66, 114, 156], ys = [24, 76, 124, 182];
  const names = [
    ["rhypo", "Right hypochondriac region"], ["epigastric", "Epigastric region"], ["lhypo", "Left hypochondriac region"],
    ["rlumbar", "Right lumbar region"], ["umbilical", "Umbilical region"], ["llumbar", "Left lumbar region"],
    ["riliac", "Right iliac (inguinal) region"], ["hypogastric", "Hypogastric (pubic) region"], ["liliac", "Left iliac (inguinal) region"],
  ];
  const regions = {};
  names.forEach(([id, label], i) => {
    const r = Math.floor(i / 3), c = i % 3;
    regions[id] = {
      label,
      d: `M${xs[c]},${ys[r]} L${xs[c + 1]},${ys[r]} L${xs[c + 1]},${ys[r + 1]} L${xs[c]},${ys[r + 1]} Z`,
      c: (r + c) % 2 ? "#b3bcd8" : "#cfd5e8",
    };
  });
  return {
    title: "Nine abdominal regions (patient's right is on your left)",
    ask: "Name the highlighted abdominal region.",
    viewBox: "0 0 180 200",
    regions,
    overlay: '<circle cx="90" cy="100" r="3" class="hole"/><text x="6" y="16" class="lbl">R</text><text x="166" y="16" class="lbl">L</text>',
  };
}

/* ------------------------------------------------------------------- heart */
const heart = {
  title: "Heart, frontal section (patient's right is on your left)",
  ask: "Name the highlighted part of the heart.",
  viewBox: "0 0 200 210",
  regions: {
    svc: { label: "Superior vena cava", d: "M48,8 L66,8 L66,62 L48,62 Z", c: "#5a7fd8" },
    ivc: { label: "Inferior vena cava", d: "M48,128 L66,128 L66,204 L48,204 Z", c: "#5a7fd8" },
    aorta: { label: "Aorta", d: "M84,70 L84,30 C84,6 140,6 150,26 L168,40 L158,48 L142,32 C134,22 106,22 104,34 L104,70 Z", c: "#e0503a" },
    pulmonary: { label: "Pulmonary trunk", d: "M108,74 L112,46 C114,38 132,36 138,46 L150,54 L144,62 L130,54 C126,52 124,56 124,62 L122,76 Z", c: "#7f8cff" },
    ra: { label: "Right atrium", d: "M40,62 C40,50 74,48 82,62 L84,104 L44,112 C36,100 36,76 40,62 Z", c: "#7f9be0" },
    la: { label: "Left atrium", d: "M118,70 C126,56 160,58 164,72 C168,86 162,98 156,104 L120,104 Z", c: "#e88a8a" },
    rv: { label: "Right ventricle", d: "M46,116 L94,108 L96,186 C78,178 56,156 46,116 Z", c: "#6a8ad6" },
    lv: { label: "Left ventricle", d: "M104,108 L156,108 C164,136 150,176 100,198 L104,190 Z", c: "#e07070" },
    septum: { label: "Interventricular septum", d: "M94,108 L104,108 L104,190 L98,196 L96,186 Z", c: "#c9a0a0" },
    tricuspid: { label: "Tricuspid valve", d: "M52,110 L86,104 L88,110 L54,116 Z", c: "#f2c94c" },
    mitral: { label: "Mitral (bicuspid) valve", d: "M120,102 L154,102 L154,108 L120,108 Z", c: "#f2c94c" },
  },
};

export const DIAGRAMS = { skull, skeleton, spine: spine(), joint, skin, burns, planes, quadrants, regions: nineRegions(), heart };

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

// SVG markup for a diagram with one region highlighted.
export function renderDiagram(name, highlight = null, { caption = false } = {}) {
  const d = DIAGRAMS[name];
  if (!d) return "";
  const parts = [];
  for (const [id, r] of Object.entries(d.regions)) {
    const hl = id === highlight ? " hl" : "";
    if (r.bone) {
      const dash = r.dash ? ` stroke-dasharray="${r.dash}"` : "";
      parts.push(`<path d="${r.bone}" class="rbo" style="stroke-width:${r.w + 2}"${dash}/>`);
      parts.push(`<path d="${r.bone}" class="rb${hl}" style="stroke-width:${r.w}"${dash}><title>${esc(r.label)}</title></path>`);
    } else {
      parts.push(`<path d="${r.d}" class="r${hl}" style="fill:${r.c || "#cfd5e8"}"><title>${esc(r.label)}</title></path>`);
    }
  }
  const label = caption && highlight ? `<figcaption>${esc(d.regions[highlight].label)}</figcaption>` : "";
  return `<figure class="dg"><svg viewBox="${d.viewBox}" role="img" aria-label="${esc(d.title)}">` +
    `${d.base || ""}${parts.join("")}${d.overlay || ""}</svg><figcaption class="dg-title">${esc(d.title)}</figcaption>${label}</figure>`;
}
