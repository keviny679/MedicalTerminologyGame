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

// Two terms conflict when one could reasonably be the answer to the other's
// question: same or overlapping meaning, or a shared affix spelling.
export function conflicts(a, b) {
  const ma = ` ${normMeaning(a.meaning)} `;
  const mb = ` ${normMeaning(b.meaning)} `;
  if (ma === mb || ma.includes(mb) || mb.includes(ma)) return true;
  const ba = new Set(affixBases(a.affix));
  return affixBases(b.affix).some((x) => ba.has(x));
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
  for (let tries = 0; tries < 400 && picked.length < CHOICES - 1; tries++) {
    const cand = pool[Math.floor(rng() * pool.length)];
    if (cand === term || conflicts(cand, term)) continue;
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
