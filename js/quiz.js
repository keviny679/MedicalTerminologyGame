// Pure quiz logic (no DOM) so it can be unit-tested with Node.

export const CHOICES = 4;

export function normMeaning(m) {
  return m.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

// "cardi(o)-, cordi-" -> ["cardi", "cordi"]
export function affixBases(label) {
  return label
    .split(/,\s*/)
    .map((a) => a.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z]/g, ""))
    .filter(Boolean);
}

export function affixKind(label) {
  const first = label.split(",")[0].trim();
  if (first.startsWith("-") && !first.endsWith("-")) return "suffix";
  if (first.endsWith("-") && !first.startsWith("-")) return "prefix / root";
  return "word part";
}

// Words too generic to tell two meanings apart.
const STOP = new Set(
  ("of or and the a an to in on at by for with from as into its it is be being " +
   "pertaining relating denoting denotes something used form forming indicating " +
   "condition process state having like").split(" ")
);

// Synonyms that would make two answer choices equally right.
const SYNONYMS = [
  "big large great huge giant enlarged enlargement long tall",
  "small little tiny minute short",
  "many much multiple several numerous excessive excess abundant",
  "few scanty deficient deficiency lack",
  "bad badly abnormal difficult faulty painful",
  "good well normal",
  "outside outer external out exterior outward",
  "inside inner internal within interior inward",
  "above over upon upper",
  "below under beneath lower",
  "before front forward anterior ahead",
  "after behind back posterior",
  "around surrounding about",
  "half partial partly",
  "not without lacking absence",
  "same equal alike",
  "new recent",
  "old ancient elderly",
  "red reddish",
  "white pale",
  "black dark",
  "heart cardiac",
  "kidney renal",
  "liver hepatic",
  "woman women female",
  "man men male",
  "child children infant",
  "tumor tumour mass swelling",
  "inflammation inflamed",
  "cut cutting incision excision removal",
];
const CANON = new Map();
SYNONYMS.forEach((group, i) => group.split(" ").forEach((w) => CANON.set(w, `syn${i}`)));

function stem(w) {
  return w.length > 4 ? w.replace(/(ies|es|s)$/, "") : w;
}

export function meaningKeys(meaning) {
  const keys = new Set();
  for (const w of normMeaning(meaning).split(" ")) {
    if (!w || STOP.has(w)) continue;
    keys.add(CANON.get(w) || CANON.get(stem(w)) || stem(w));
  }
  return keys;
}

export function meaningsOverlap(a, b) {
  const na = normMeaning(a), nb = normMeaning(b);
  if (na === nb) return true;
  const ka = meaningKeys(a), kb = meaningKeys(b);
  if (!ka.size || !kb.size) return false;
  for (const k of ka) if (kb.has(k)) return true;
  return false;
}

// Two terms conflict when one could reasonably be the answer to the other's
// question: overlapping meaning, or a shared affix spelling.
export function conflicts(a, b) {
  if (meaningsOverlap(a.meaning, b.meaning)) return true;
  const ba = new Set(affixBases(a.affix));
  return affixBases(b.affix).some((x) => ba.has(x));
}

// Every meaning Wikipedia gives for any spelling of this term's affix.
function allMeanings(term, pool) {
  const bases = new Set(affixBases(term.affix));
  return pool.filter((t) => affixBases(t.affix).some((x) => bases.has(x))).map((t) => t.meaning);
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeQuestion(term, pool, rng = Math.random) {
  const picked = [];
  const rightAnswers = allMeanings(term, pool);
  for (let tries = 0; tries < 400 && picked.length < CHOICES - 1; tries++) {
    const cand = pool[Math.floor(rng() * pool.length)];
    if (cand === term || conflicts(cand, term)) continue;
    if (rightAnswers.some((m) => meaningsOverlap(m, cand.meaning))) continue;
    if (picked.some((p) => conflicts(p, cand))) continue;
    picked.push(cand);
  }
  if (picked.length < CHOICES - 1) return null;
  const options = shuffle([term, ...picked], rng).map((t) => t.meaning);
  return {
    affix: term.affix,
    kind: affixKind(term.affix),
    options,
    answer: options.indexOf(term.meaning),
    examples: term.examples || [],
  };
}

// Deals terms in a shuffled order without repeats until the deck runs out.
export class Deck {
  constructor(terms, rng = Math.random) {
    this.terms = terms;
    this.rng = rng;
    this.order = [];
  }
  next() {
    for (let guard = 0; guard < this.terms.length * 2 + 10; guard++) {
      if (!this.order.length) this.order = shuffle(this.terms, this.rng);
      const q = makeQuestion(this.order.pop(), this.terms, this.rng);
      if (q) return q;
    }
    throw new Error("Not enough distinct terms to build a question.");
  }
}
