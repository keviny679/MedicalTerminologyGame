import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTER_FILES, parseChapter, buildLesson, makeClozeQuestion, gradeBrainDump, gradeTyped, StudyDeck, vocabulary } from "../js/study.js";
import * as DG from "../js/diagrams.js";

const chapters = CHAPTER_FILES.map((f) => parseChapter(readFileSync(new URL(`../data/eml/${f}.txt`, import.meta.url), "utf8"), f));
const all = chapters.flatMap((c) => c.entries);

test("every non-abbreviation section has a lesson linking several terms", () => {
  for (const ch of chapters) {
    for (const s of ch.sections) {
      if (/abbreviations/i.test(s.title)) continue;
      assert.ok(s.lesson, `${ch.file} "${s.title}" has no lesson`);
      assert.ok(s.lesson.terms.length >= 2, `${s.title}: too few linked terms`);
      for (const t of s.lesson.terms) assert.ok(ch.entries.includes(t.entry));
      assert.ok(!s.lesson.html.includes("[["), `${s.title}: unconverted markup`);
    }
  }
});

test("a lesson naming an unknown term is rejected", () => {
  const entries = [{ name: "dermis", def: "inner skin layer", key: "x" }];
  assert.throws(() => buildLesson("The [[dermis]] and [[hypodermis]].", entries, "f", "t"), /hypodermis/);
});

test("cloze questions blank the term and never give it away", () => {
  let n = 0;
  for (const e of all) {
    if (!e.clozes) continue;
    const q = makeClozeQuestion(e, () => 0);
    n++;
    assert.equal(q.mode, "typed");
    assert.match(q.prompt, /class="blank"/);
    const text = q.prompt.replace(/<[^>]+>/g, "").toLowerCase();
    assert.ok(!text.includes(q.answerText.toLowerCase()), `cloze for ${e.name} leaks "${q.answerText}"`);
    assert.notEqual(gradeTyped(q.answerText, q.accept), "wrong");
    assert.notEqual(gradeTyped(e.name.split(",")[0], q.accept), "wrong");
  }
  assert.ok(n > 600, `only ${n} entries have clozes`);
});

test("brain dump finds recalled terms, forgives typos, and lists the rest as missed", () => {
  const ch = chapters[2];
  const lesson = ch.sections[0].lesson;
  const vocab = vocabulary(all);
  const res = gradeBrainDump("epidermis\nkeratn, Melanin;  dermiss\nbanana", lesson, vocab);
  const got = res.recalled.map((t) => t.entry.name);
  assert.ok(got.includes("epidermis") && got.includes("keratin") && got.includes("melanin") && got.includes("dermis"));
  assert.equal(res.recalled.length + res.missed.length, lesson.terms.length);
  assert.equal(gradeBrainDump("", lesson, vocab).recalled.length, 0);
});

test("priming from a brain dump queues missed terms early without granting mastery", () => {
  const ch = chapters[2];
  const sec = ch.sections[0];
  const progress = {};
  let seed = 1;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const deck = new StudyDeck(sec.entries, all, DG, progress, rng, "mixed");
  const res = gradeBrainDump("epidermis, dermis", sec.lesson, deck.vocab);
  deck.primeFromBrainDump(res, Date.now());
  const p = progress[res.recalled[0].entry.key];
  assert.ok(p && p.r === 1 && !(p.days || []).length, "recalled terms are seen but not a mastery day");
  assert.equal(deck.unresolved.length, res.missed.length);
  const firstFew = [deck.next(), deck.next(), deck.next()];
  assert.ok(res.missed.some((t) => t.entry === firstFew[0].entry), "a missed term comes up first");
  assert.ok(!firstFew.some((q) => res.recalled.some((t) => t.entry === q.entry)), "just-recalled terms wait");
});
