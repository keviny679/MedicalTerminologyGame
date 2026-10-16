// "Essentials of Medical Language" study mode: chapter files, question types and mastery.
// Pure logic (no DOM) so it can be unit-tested with Node.

export const CHAPTER_FILES = [
  "01-word-anatomy", "02-body-as-a-whole", "03-integumentary", "04-musculoskeletal",
  "05-cardiovascular",
];

const KIND = { P: "part", T: "term", A: "abbr" };

/*
  Chapter file format (one entry per line):
    # 3 | The Integumentary System
    ## Burns
    P derm/o, dermat/o = skin
    T epidermis = outermost layer of the skin | epi- + derm/o + -is | @skin.epidermis
    A SC = subcutaneous
  Optional fields after the definition are separated by " | ":
  a word-part breakdown, and/or "@diagram.region" for a picture.
*/
export function parseChapter(text, file = "") {
  const ch = { file, num: 0, title: "", sections: [], entries: [] };
  let section = null;
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("//")) return;
    const where = `${file}:${i + 1}`;
    if (line.startsWith("## ")) {
      section = { title: line.slice(3).trim(), entries: [] };
      ch.sections.push(section);
      return;
    }
    if (line.startsWith("# ")) {
      const [num, title] = line.slice(2).split("|").map((s) => s.trim());
      ch.num = Number(num);
      ch.title = title;
      return;
    }
    const m = line.match(/^([PTA])\s+(.+?)\s+=\s+(.+)$/);
    if (!m) throw new Error(`Can't parse ${where}: ${line}`);
    if (!section) throw new Error(`Entry before any section at ${where}`);
    const [def, ...extra] = m[3].split(" | ").map((s) => s.trim());
    const entry = {
      kind: KIND[m[1]],
      name: m[2].trim(),
      def,
      parts: extra.find((x) => !x.startsWith("@")) || null,
      img: (extra.find((x) => x.startsWith("@")) || "").slice(1) || null,
      section: section.title,
      chapter: ch.num,
    };
    entry.key = `${ch.num}|${entry.kind}|${entry.name}`;
    section.entries.push(entry);
    ch.entries.push(entry);
  });
  return ch;
}

/* --------------------------------------------------------------- questions */

const norm = (s) => s.toLowerCase().replace(/[^a-z0-9/ -]+/g, " ").replace(/\s+/g, " ").trim();
const STOP = new Set("a an the of or and to in on at by for with from as into its is be that which".split(" "));
const words = (s) => new Set(norm(s).split(" ").filter((w) => w && !STOP.has(w)));

// Two answer texts are too alike to be fair distractors for each other.
export function tooSimilar(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  const wa = words(a), wb = words(b);
  if (!wa.size || !wb.size) return false;
  let shared = 0;
  for (const w of wa) if (wb.has(w)) shared++;
  return shared / Math.min(wa.size, wb.size) >= 0.75 && Math.min(wa.size, wb.size) >= 2;
}

function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const KIND_LABEL = { part: "word part", term: "term", abbr: "abbreviation" };

export function questionTypes(entry, diagrams = {}) {
  if (entry.kind === "part") return ["part>def", "def>part"];
  if (entry.kind === "abbr") return ["abbr>def", "def>abbr"];
  const t = ["term>def", "def>term"];
  if (entry.parts) t.push("parts");
  if (entry.img && diagrams.DIAGRAMS?.[entry.img.split(".")[0]]) t.push("image");
  return t;
}

// Pick 3 distractor strings for `answer`, taken from `pool` via `field`.
function distractors(entry, answer, pools, field, rng, avoidDefOf = false) {
  const picked = [];
  for (const pool of pools) {
    for (const cand of shuffle(pool, rng)) {
      if (picked.length === 3) break;
      if (cand === entry || cand.name === entry.name) continue;
      const text = field(cand);
      if (!text || tooSimilar(text, answer)) continue;
      if (avoidDefOf && tooSimilar(cand.def, entry.def)) continue;
      if (picked.some((p) => tooSimilar(p, text))) continue;
      picked.push(text);
    }
  }
  return picked.length === 3 ? picked : null;
}

/*
  Build one question for `entry`. `pools` are lists of entries to draw distractors
  from, nearest first (same section, same chapter, whole book).
  Returns { prompt, options, answer, explain, image, entry, type, hint }.
*/
export function makeStudyQuestion(entry, pools, diagrams, rng = Math.random, type = null) {
  const types = questionTypes(entry, diagrams);
  type ||= types[Math.floor(rng() * types.length)];
  const sameKind = pools.map((p) => p.filter((e) => e.kind === entry.kind));
  let prompt, answer, others, image = null;
  const label = KIND_LABEL[entry.kind];

  if (type === "image") {
    const [d, region] = entry.img.split(".");
    const diagram = diagrams.DIAGRAMS[d];
    answer = diagrams.partLabel(d, region);
    others = shuffle(diagrams.otherLabels(d, region).filter((l) => !tooSimilar(l, answer)), rng).slice(0, 3);
    if (others.length < 3) return makeStudyQuestion(entry, pools, diagrams, rng, "term>def");
    prompt = `${diagram.ask || "Name the highlighted structure."}`;
    image = { diagram: d, region };
  } else if (type === "parts") {
    answer = entry.parts;
    others = distractors(entry, answer, pools.map((p) => p.filter((e) => e.parts)), (e) => e.parts, rng);
    prompt = `Which word parts build <b>${esc(entry.name)}</b>?`;
  } else if (type.endsWith(">def")) {
    answer = entry.def;
    others = distractors(entry, answer, sameKind, (e) => e.def, rng);
    prompt = `What does the ${label} <b>${esc(entry.name)}</b> mean?`;
    if (entry.img) image = { diagram: entry.img.split(".")[0], region: entry.img.split(".")[1], labelled: true };
  } else {
    answer = entry.name;
    others = distractors(entry, answer, sameKind, (e) => e.name, rng, true);
    prompt = `Which ${label} means: <i>${esc(entry.def)}</i>?`;
  }
  if (!others) {
    // Not enough look-alikes for this direction; fall back to the other one.
    const fallback = type.endsWith(">def") ? types[1] : types[0];
    if (fallback === type) return null;
    return makeStudyQuestion(entry, pools, diagrams, rng, fallback);
  }
  const options = shuffle([answer, ...others], rng);
  return {
    type, entry, prompt, image, options,
    answer: options.indexOf(answer),
    explain: `${entry.name}: ${entry.def}${entry.parts ? ` (${entry.parts})` : ""}`,
    hint: entry.parts && type !== "parts" ? `Word parts: ${entry.parts}` : null,
  };
}

/* ----------------------------------------------------------------- mastery */

export const isMastered = (p) => !!p && p.r >= 2 && p.l === 1;

export function chapterMastery(chapter, progress) {
  if (!chapter.entries.length) return 0;
  return chapter.entries.filter((e) => isMastered(progress[e.key])).length / chapter.entries.length;
}

// Chapter size drives run length: more material, more rooms.
export function roomsFor(entryCount) {
  return Math.max(3, Math.min(12, Math.round(entryCount / 20)));
}

// Weighted deck: unseen and often-missed entries come up more; recent ones rest.
export class StudyDeck {
  constructor(entries, allEntries, diagrams, progress, rng = Math.random) {
    this.entries = entries;
    this.all = allEntries;
    this.diagrams = diagrams;
    this.progress = progress;
    this.rng = rng;
    this.recent = [];
  }

  weight(e) {
    const p = this.progress[e.key];
    if (this.recent.includes(e.key)) return 0;
    if (!p) return 3;
    return Math.max(0.3, Math.min(6, 1 + p.w * 2 - p.r * 0.5 + (p.l === 0 ? 2 : 0)));
  }

  pickEntry() {
    const weights = this.entries.map((e) => this.weight(e));
    let total = weights.reduce((a, b) => a + b, 0);
    if (!total) { this.recent = []; return this.entries[Math.floor(this.rng() * this.entries.length)]; }
    let r = this.rng() * total;
    for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return this.entries[i];
    return this.entries[this.entries.length - 1];
  }

  next() {
    for (let tries = 0; tries < 30; tries++) {
      const e = this.pickEntry();
      const sameSection = this.all.filter((x) => x.chapter === e.chapter && x.section === e.section);
      const sameChapter = this.all.filter((x) => x.chapter === e.chapter);
      const q = makeStudyQuestion(e, [sameSection, sameChapter, this.all], this.diagrams, this.rng);
      if (!q) continue;
      this.recent.push(e.key);
      if (this.recent.length > Math.min(8, Math.floor(this.entries.length / 2))) this.recent.shift();
      return q;
    }
    throw new Error("Couldn't build a question for this chapter.");
  }

  record(entry, correct) {
    const p = this.progress[entry.key] || { r: 0, w: 0, l: 0 };
    if (correct) p.r += 1;
    else p.w += 1;
    p.l = correct ? 1 : 0;
    this.progress[entry.key] = p;
  }
}
