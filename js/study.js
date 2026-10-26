// "Essentials of Medical Language" study mode: chapter files, question types and mastery.
// Pure logic (no DOM) so it can be unit-tested with Node.

export const CHAPTER_FILES = [
  "01-word-anatomy", "02-body-as-a-whole", "03-integumentary", "04-skeletal", "05-muscles-tendons",
  "06-cardiovascular", "07-blood-lymph-immune", "08-respiratory", "09-digestive",
  "10-nervous-mental-health", "11-eye-ear", "12-endocrine", "13-urinary",
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
    if (line.startsWith("> ")) {
      if (!section) throw new Error(`Lesson text before any section at ${where}`);
      section.passage = `${section.passage || ""} ${line.slice(2).trim()}`.trim();
      return;
    }
    if (line.startsWith("@source ")) {
      if (!section) throw new Error(`Source reference before any section at ${where}`);
      const m = line.match(/^@source\s+(\d+)(?:-(\d+))?(?:\s+\|\s+(.+))?$/);
      if (!m) throw new Error(`Can't parse source reference at ${where}: ${line}`);
      section.source = {
        start: Number(m[1]),
        end: Number(m[2] || m[1]),
        label: (m[3] || `Textbook pp. ${m[1]}${m[2] ? `-${m[2]}` : ""}`).trim(),
      };
      return;
    }
    if (line.startsWith("## ")) {
      section = { title: line.slice(3).trim(), entries: [], passage: "" };
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
      source: section.source || null,
      chapter: ch.num,
    };
    entry.key = `${ch.num}|${entry.kind}|${entry.name}`;
    section.entries.push(entry);
    ch.entries.push(entry);
  });
  for (const sec of ch.sections) if (sec.passage) sec.lesson = buildLesson(sec.passage, ch.entries, file, sec.title);
  return ch;
}

/* ------------------------------------------------------------------ lessons */

// Lesson text marks key terms as [[term]] or [[shown text|entry name]].
const MARK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

// Links each marked term to its entry and turns every sentence that contains a
// term into fill-in-the-blank (cloze) material for that entry.
export function buildLesson(passage, entries, file = "", title = "") {
  const byName = new Map(entries.map((e) => [e.name.toLowerCase(), e]));
  const terms = [];
  const resolve = (shown, target) => {
    const e = byName.get((target || shown).trim().toLowerCase());
    if (!e) throw new Error(`Lesson "${title}" in ${file}: no entry named "${(target || shown).trim()}"`);
    return e;
  };
  for (const m of passage.matchAll(MARK)) {
    const entry = resolve(m[1], m[2]);
    if (!terms.some((t) => t.entry === entry)) terms.push({ shown: m[1].trim(), entry });
  }
  const sentences = passage.match(/[^.!?]+[.!?]+/g) || [passage];
  const lesson = { title, terms, sentences: [] };
  sentences.forEach((raw, si) => {
    const marks = [...raw.matchAll(MARK)];
    lesson.sentences.push(raw.trim().replace(MARK, (_, shown) => `<b>${esc(shown)}</b>`));
    marks.forEach((m) => {
      const entry = resolve(m[1], m[2]);
      entry.notes ||= [];
      if (!entry.notes.some((n) => n.lesson === lesson && n.i === si)) entry.notes.push({ lesson, i: si });
      // blank out this term; show any other marked terms as plain text
      let text = "";
      let last = 0;
      for (const o of marks) {
        text += raw.slice(last, o.index);
        text += o === m ? "\u0000" : o[1];
        last = o.index + o[0].length;
      }
      text += raw.slice(last);
      const [before, after] = text.trim().split("\u0000");
      const shown = m[1].trim();
      // skip a sentence that would give the answer away elsewhere in it
      if (`${before} ${after}`.toLowerCase().includes(shown.toLowerCase())) return;
      (entry.clozes ||= []).push({ before, after, shown });
    });
  });
  lesson.html = passage.replace(MARK, (_, shown) => `<b>${esc(shown)}</b>`);
  return lesson;
}

// What the lessons say about a term: the sentences that mention it, each with
// the sentence after it for context (at most three sentences). HTML.
export function lessonNotes(entry) {
  if (!entry?.notes?.length) return null;
  const out = [];
  for (const { lesson, i } of entry.notes.slice(0, 2)) {
    for (const j of [i, i + 1]) {
      const s = lesson.sentences[j];
      if (s && !out.some((o) => o.s === s) && out.length < 3) out.push({ s, title: lesson.title });
    }
  }
  return { title: out[0].title, html: out.map((o) => o.s).join(" "), source: entry.source || null };
}

// Expand terse table labels—especially abbreviations—into a useful teaching
// explanation by following the expanded name to its full term definition.
export function explainEntry(entry, entries = []) {
  if (!entry) return "";
  const target = entry.def.replace(/\s*\([^)]*\)\s*$/, "").trim().toLowerCase();
  const related = entry.kind === "abbr" && entries.find((candidate) =>
    candidate.kind === "term" && candidate !== entry &&
    (candidate.name.toLowerCase() === target || target.startsWith(`${candidate.name.toLowerCase()} `)));
  let text = `${entry.name} ${entry.kind === "abbr" ? "stands for" : "means"} ${entry.def}.`;
  if (related && related.def.toLowerCase() !== entry.def.toLowerCase()) text += ` ${related.name} is ${related.def}.`;
  else if (entry.parts) text += ` Word analysis: ${entry.parts}.`;
  return text;
}

// A hint that teaches: a lesson sentence about the term with the term blanked
// out. Avoids the sentence a fill-in-the-blank question is already showing.
export function lessonClue(entry, q = null, rng = Math.random) {
  const shownNow = q?.type === "cloze" ? q.prompt : "";
  const same = (c) => shownNow.includes(esc(c.before.trimEnd())) && shownNow.includes(esc(c.after.trimStart()));
  const options = (entry?.clozes || []).filter((c) => !shownNow || !same(c));
  if (!options.length) return null;
  const c = options[Math.floor(rng() * options.length)];
  const glue = /^[.,;:!?)]/.test(c.after) ? "" : " ";
  return `${c.before.trimEnd()} ______${glue}${c.after.trimStart()}`;
}

// Fill-in-the-blank from the lesson the student just read.
export function makeClozeQuestion(entry, rng = Math.random) {
  if (!entry.clozes?.length) return null;
  const c = entry.clozes[Math.floor(rng() * entry.clozes.length)];
  const accept = [...new Set([...acceptVariants(c.shown), ...acceptVariants(entry.name)])];
  return {
    mode: "typed", type: "cloze", entry,
    prompt: `Fill in the blank: <i>${esc(c.before.trimEnd())} <span class="blank">______</span>${/^[.,;:!?)]/.test(c.after) ? "" : " "}${esc(c.after.trimStart())}</i>`,
    image: null,
    accept,
    answerText: c.shown,
    explain: `${entry.name}: ${entry.def}`,
    hint: entry.parts ? `Word parts: ${entry.parts}` : null,
  };
}

// Free recall ("brain dump") after reading: which lesson terms did they write?
export function gradeBrainDump(text, lesson, vocab = null) {
  const pieces = text.split(/[\n,;]+/).map((p) => p.trim()).filter(Boolean);
  const recalled = [], missed = [];
  for (const t of lesson.terms) {
    const accept = [...new Set([...acceptVariants(t.shown), ...acceptVariants(t.entry.name)])];
    const hit = pieces.some((p) => gradeTyped(p, accept, vocab) !== "wrong");
    (hit ? recalled : missed).push(t);
  }
  return { recalled, missed };
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

/* ------------------------------------------------------------ typed recall */

// Every acceptable typed form of an answer like "cardi/o, cordi-" or
// "Sweat (sudoriferous) gland" or "ECG, EKG".
export function acceptVariants(text) {
  const out = new Set();
  const add = (t) => {
    const n = normAnswer(t);
    if (n) out.add(n);
  };
  const noParen = text.replace(/\s*\([^)]*\)/g, "").trim();
  const alts = [text, noParen];
  // "Frontal (coronal) plane" -> "coronal plane"; "Sweat (sudoriferous) gland" -> "sudoriferous gland"
  const m = text.match(/^(.*?)(\S+)\s*\(([^)]+)\)\s*(.*)$/);
  if (m) alts.push(`${m[1]}${m[3]} ${m[4]}`);
  const inner = text.match(/\(([^)]+)\)/);
  if (inner) alts.push(inner[1]);
  for (const a of alts) {
    for (const piece of a.split(/,\s*|\s+or\s+|;\s*/)) {
      add(piece);
      // combining forms: "cardi/o" also accepts "cardio" and "cardi"
      if (piece.includes("/")) {
        add(piece.replace("/", ""));
        add(piece.split("/")[0]);
      }
    }
    add(a);
  }
  return [...out];
}

export function normAnswer(s) {
  return s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, "");
}

export function editDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

// "exact" | "typo" (counts as right, with a spelling note) | "wrong".
// Medical words that differ by a letter or two often mean different things
// (ileum/ilium, -otomy/-ectomy), so only a single slip in a longer word is
// forgiven, and never when the input is itself another known term.
export function gradeTyped(input, accept, vocab = null) {
  const n = normAnswer(input);
  if (!n) return "wrong";
  if (accept.includes(n)) return "exact";
  if (vocab && vocab.has(n)) return "wrong";
  for (const a of accept) {
    if (a.length >= 6 && editDistance(n, a) <= 1) return "typo";
  }
  return "wrong";
}

// Every typed form of every entry, to stop a real term passing as a typo.
export function vocabulary(entries) {
  const v = new Set();
  for (const e of entries) acceptVariants(e.name).forEach((x) => v.add(x));
  return v;
}

const TYPED_LABEL = { part: "word part", term: "term", abbr: "abbreviation" };

// A fill-in question: the definition (or a highlighted picture) is shown, the
// student types the term.
// Some entries (plural rules like "-a to -ae") make poor fill-in answers.
export const canRecall = (e) => !/ to /.test(e.name) && e.name.length <= 40;

export function makeRecallQuestion(entry, allEntries, diagrams, rng = Math.random) {
  if (!canRecall(entry)) return null;
  if (entry.clozes?.length && rng() < 0.5) {
    const cloze = makeClozeQuestion(entry, rng);
    if (cloze) return cloze;
  }
  const canImage = entry.img && diagrams.DIAGRAMS?.[entry.img.split(".")[0]];
  if (canImage && rng() < 0.5) {
    const [d, region] = entry.img.split(".");
    const label = diagrams.partLabel(d, region);
    return {
      mode: "typed", type: "image-typed", entry,
      prompt: `${diagrams.DIAGRAMS[d].ask} <span class="kind">(type the name)</span>`,
      image: { diagram: d, region },
      accept: [...new Set([...acceptVariants(label), ...acceptVariants(entry.name)])],
      answerText: label,
      explain: `${entry.name}: ${entry.def}`,
      hint: entry.parts ? `Word parts: ${entry.parts}` : null,
    };
  }
  // Accept any entry of the same kind whose definition says the same thing.
  const twins = allEntries.filter((e) => e.kind === entry.kind && e.chapter === entry.chapter && tooSimilar(e.def, entry.def));
  const accept = new Set(acceptVariants(entry.name));
  for (const t of twins) acceptVariants(t.name).forEach((a) => accept.add(a));
  return {
    mode: "typed", type: "def>typed", entry,
    prompt: `Type the ${TYPED_LABEL[entry.kind]} that means: <i>${esc(entry.def)}</i>`,
    image: null,
    accept: [...accept],
    answerText: entry.name,
    explain: `${entry.name}: ${entry.def}${entry.parts ? ` (${entry.parts})` : ""}`,
    hint: entry.parts ? `Word parts: ${entry.parts}` : null,
  };
}

// Letter hint for typed questions: "g _ _ _ _ _ _ _ _ _ y (11 letters)"
export function letterHint(answer) {
  const first = answer.split(/,\s*/)[0];
  const letters = first.replace(/[^A-Za-z]/g, "");
  if (letters.length <= 2) return `Starts with “${first[0]}”`;
  const shown = first.split("").map((c, i) => (/[A-Za-z]/.test(c) && i > 1 && i < first.length - 1 ? "_" : c)).join(" ");
  return `${shown}  (${letters.length} letters)`;
}

/* ---------------------------------------------------- mastery and spacing */

// Successive relearning: a term is mastered once it has been typed correctly
// from memory on at least 3 different days, and the latest answer was right.
// (Recalling once in each of 3 sessions beats 3 times in one session by far.)
export const MASTERY_DAYS = 3;
export const isMastered = (p) => !!p && p.l === 1 && (p.days?.length || 0) >= MASTERY_DAYS;

// Local calendar day, e.g. "2026-10-16".
export function dayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function chapterMastery(chapter, progress) {
  if (!chapter.entries.length) return 0;
  return chapter.entries.filter((e) => isMastered(progress[e.key])).length / chapter.entries.length;
}

// Chapter size drives run length: more material, more rooms.
export function roomsFor(entryCount) {
  return Math.max(3, Math.min(12, Math.round(entryCount / 20)));
}

// A 50-question Midterm 1 practice set. Chapters 1-5 contribute four
// questions each; Chapters 6-8 contribute ten each, matching the instructor's
// stated extra emphasis on the material that has not yet been quizzed.
export function buildMidtermEntries(chapters, rng = Math.random) {
  const wanted = new Map([[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 10], [7, 10], [8, 10]]);
  const selected = [];
  const pickOne = (pool, used) => {
    const left = pool.filter((e) => !used.has(e.key));
    if (!left.length) return null;
    return left[Math.floor(rng() * left.length)];
  };
  for (const chapter of chapters.filter((c) => wanted.has(c.num))) {
    const count = wanted.get(chapter.num);
    const used = new Set();
    const categories = [
      (e) => e.kind === "part",
      (e) => e.kind === "abbr",
      (e) => !!e.img,
      (e) => /diagnostic|therapeutic|procedure|pharmacology/i.test(e.section),
      (e) => e.kind === "term",
    ];
    for (let i = 0; i < count; i++) {
      const preferred = chapter.entries.filter(categories[i % categories.length]);
      const entry = pickOne(preferred, used) || pickOne(chapter.entries, used);
      if (!entry) throw new Error(`Chapter ${chapter.num} has too few unique entries for Midterm 1`);
      used.add(entry.key);
      selected.push(entry);
    }
  }
  if (selected.length !== 50) throw new Error(`Midterm 1 requires 50 questions; built ${selected.length}`);
  return shuffle(selected, rng);
}

// A shorter study set for the content the student identified as highest
// priority. Five unique questions from each of Chapters 3-7 keeps the practice
// balanced instead of letting the largest chapter dominate.
export function buildMidtermFocusEntries(chapters, rng = Math.random) {
  const selected = [];
  const categories = [
    (e) => e.kind === "part",
    (e) => !!e.img,
    (e) => /disorder|injur|disease/i.test(e.section),
    (e) => /diagnostic|therapeutic|procedure|pharmacology/i.test(e.section),
    (e) => e.kind === "term" || e.kind === "abbr",
  ];
  for (const chapter of chapters.filter((c) => c.num >= 3 && c.num <= 7)) {
    const used = new Set();
    for (const category of categories) {
      const preferred = chapter.entries.filter((e) => category(e) && !used.has(e.key));
      const fallback = chapter.entries.filter((e) => !used.has(e.key));
      const pool = preferred.length ? preferred : fallback;
      if (!pool.length) throw new Error(`Chapter ${chapter.num} has too few terms for focused practice`);
      const entry = pool[Math.floor(rng() * pool.length)];
      used.add(entry.key);
      selected.push(entry);
    }
  }
  return selected.sort(() => rng() - 0.5);
}

const DAY = 24 * 60 * 60 * 1000;
// Review intervals in days for each successful recall in a row.
export const INTERVALS = [1, 3, 7, 14, 30, 60, 120];

// Update the spacing schedule after an answer. A typed recall moves a term up
// the ladder; a multiple-choice hit only schedules a near review; a miss
// sends it back to tomorrow.
export function schedule(p, correct, typed, now = Date.now(), { guess = false } = {}) {
  p.box ??= 0;
  if (!correct) {
    p.box = 0;
    p.due = now + DAY * 0.5;
  } else if (typed && !guess) {
    p.due = now + DAY * INTERVALS[Math.min(p.box, INTERVALS.length - 1)];
    p.box = Math.min(p.box + 1, INTERVALS.length - 1);
  } else {
    p.due = Math.min(p.due || Infinity, now + DAY);
  }
  return p;
}

export function dueEntries(entries, progress, now = Date.now()) {
  return entries
    .filter((e) => progress[e.key]?.due && progress[e.key].due <= now)
    .sort((a, b) => progress[a.key].due - progress[b.key].due);
}

export const STYLES = ["mixed", "typed", "mc"];
export const STYLE_LABEL = { mixed: "Mixed (recommended)", typed: "Typed recall only", mc: "Multiple choice only" };

// Weighted deck: unseen and often-missed entries come up more; recent ones rest.
export class StudyDeck {
  constructor(entries, allEntries, diagrams, progress, rng = Math.random, style = "mixed") {
    this.entries = entries;
    this.all = allEntries;
    this.diagrams = diagrams;
    this.progress = progress;
    this.rng = rng;
    this.style = style;
    this.recent = [];
    this._vocab = null;
    this.asked = 0;
    this.followUps = []; // { entry, at } -> ask again (typed) after a few questions
    this.missedNow = new Map(); // key -> entry, cleared once recalled again
    this.once = false; // review: ask each term once, then stop (misses go to relearning)
    this.used = new Set();
  }

  // In "once" mode, true when every term has been asked.
  get finished() {
    return this.once && this.used.size >= this.entries.length;
  }

  get vocab() {
    return (this._vocab ||= vocabulary(this.all));
  }

  weight(e) {
    const p = this.progress[e.key];
    if (this.recent.includes(e.key)) return 0;
    if (!p) return 3;
    const overdue = p.due && p.due <= Date.now() ? 3 : 0;
    return Math.max(0.3, Math.min(8, 1 + p.w * 2 - p.r * 0.5 + (p.l === 0 ? 2 : 0) + overdue));
  }

  pickEntry() {
    const weights = this.entries.map((e) => this.weight(e));
    let total = weights.reduce((a, b) => a + b, 0);
    if (!total) { this.recent = []; return this.entries[Math.floor(this.rng() * this.entries.length)]; }
    let r = this.rng() * total;
    for (let i = 0; i < weights.length; i++) if ((r -= weights[i]) < 0) return this.entries[i];
    return this.entries[this.entries.length - 1];
  }

  // Recognition first, then recall: in mixed style a term switches to typed
  // questions once it has been answered right at least once.
  wantsTyped(e) {
    if (this.style === "typed") return true;
    if (this.style === "mc") return false;
    const p = this.progress[e.key];
    return !!p && p.r >= 1 && this.rng() < 0.8;
  }

  // Seen it, now recall it: re-ask a term as a typed question a few
  // questions later, after a recognition hit, a guess or a miss.
  // A confident miss comes back soonest (that surprise is when it sticks).
  queueFollowUp(entry, correct, typed, { guess = false, confident = false } = {}) {
    if (this.style === "mc" && correct && !guess) return;
    if (correct && typed && !guess) return;
    if (this.followUps.some((f) => f.entry === entry)) return;
    const gap = !correct && confident ? 2 + Math.floor(this.rng() * 2)
      : correct ? 2 + Math.floor(this.rng() * 3) : 3 + Math.floor(this.rng() * 4);
    this.followUps.push({ entry, at: this.asked + gap });
  }

  // After a brain dump: what they recalled counts as seen and correct (but not
  // toward mastery: it was only just read); what they missed is queued to come
  // back early in the battle.
  primeFromBrainDump({ recalled, missed }, now = Date.now()) {
    for (const t of recalled) this.record(t.entry, true, false, now);
    const got = new Set(recalled.map((t) => t.entry));
    this.followUps = this.followUps.filter((f) => !got.has(f.entry)); // missed terms go first
    missed.forEach((t, i) => {
      this.missedNow.set(t.entry.key, t.entry);
      if (!this.followUps.some((f) => f.entry === t.entry)) this.followUps.push({ entry: t.entry, at: this.asked + 1 + i * 2 });
    });
  }

  // Terms missed this run that haven't been recalled correctly since.
  get unresolved() {
    return [...this.missedNow.values()];
  }

  recallFor(entry) {
    return (this.style !== "mc" && makeRecallQuestion(entry, this.all, this.diagrams, this.rng)) || this.mcQuestion(entry);
  }

  takeFollowUp() {
    const i = this.followUps.findIndex((f) => f.at <= this.asked);
    if (i < 0) return null;
    const [f] = this.followUps.splice(i, 1);
    if (this.style !== "mc") {
      const q = makeRecallQuestion(f.entry, this.all, this.diagrams, this.rng);
      if (q) return q;
    }
    return this.mcQuestion(f.entry);
  }

  mcQuestion(e) {
    const sameSection = this.all.filter((x) => x.chapter === e.chapter && x.section === e.section);
    const sameChapter = this.all.filter((x) => x.chapter === e.chapter);
    return makeStudyQuestion(e, [sameSection, sameChapter, this.all], this.diagrams, this.rng);
  }

  next() {
    this.asked += 1;
    if (this.once) {
      const left = this.entries.filter((e) => !this.used.has(e.key));
      for (const e of shuffle(left, this.rng)) {
        const q = (this.wantsTyped(e) && makeRecallQuestion(e, this.all, this.diagrams, this.rng)) || this.mcQuestion(e);
        this.used.add(e.key);
        if (q) return q;
      }
      this.once = false; // nothing left to ask: fall back to normal practice
    }
    const follow = this.takeFollowUp();
    if (follow) {
      this.recent.push(follow.entry.key);
      if (this.recent.length > Math.min(8, Math.floor(this.entries.length / 2))) this.recent.shift();
      return follow;
    }
    for (let tries = 0; tries < 30; tries++) {
      const e = this.pickEntry();
      let q = null;
      if (this.wantsTyped(e)) q = makeRecallQuestion(e, this.all, this.diagrams, this.rng);
      if (!q) q = this.mcQuestion(e);
      if (!q) continue;
      this.recent.push(e.key);
      if (this.recent.length > Math.min(8, Math.floor(this.entries.length / 2))) this.recent.shift();
      return q;
    }
    throw new Error("Couldn't build a question for this chapter.");
  }

  // opts.guess: the player marked the answer as a guess ("Unsure").
  record(entry, correct, typed = false, now = Date.now(), { guess = false } = {}) {
    const p = this.progress[entry.key] || { r: 0, w: 0, l: 0, t: 0 };
    const confident = !guess;
    if (correct) p.r += 1;
    else p.w += 1;
    if (!correct && confident) p.cw = (p.cw || 0) + 1; // confident errors
    if (correct && typed && !guess) {
      p.t = (p.t || 0) + 1;
      const today = dayKey(now);
      p.days = [...new Set([...(p.days || []), today])].slice(-6);
    }
    p.l = correct && !guess ? 1 : 0;
    schedule(p, correct, typed, now, { guess });
    this.progress[entry.key] = p;
    if (!correct) this.missedNow.set(entry.key, entry);
    else if (!guess) this.missedNow.delete(entry.key);
    this.queueFollowUp(entry, correct, typed, { guess, confident });
  }
}
