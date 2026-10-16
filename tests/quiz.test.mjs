// Run with: node --test tests/
import test from "node:test";
import assert from "node:assert/strict";
import { affixBases, affixKind, conflicts, makeQuestion, Deck, CHOICES } from "../js/quiz.js";

const T = (affix, meaning, examples = []) => ({ affix, meaning, examples });
const terms = [
  T("cardi(o)-", "heart", ["cardiology"]),
  T("cordi-", "heart"),
  T("-itis", "inflammation", ["tonsillitis"]),
  T("hepat-", "liver", ["hepatitis"]),
  T("-logy", "study of", ["biology"]),
  T("a-, an-", "not, without", ["apathy"]),
  T("-ectomy", "surgical removal", ["appendectomy"]),
  T("cardio-", "of the heart"),
  T("dent(i)-", "tooth"),
  T("oste(o)-", "bone", ["osteoporosis"]),
];

test("affix helpers", () => {
  assert.deepEqual(affixBases("cardi(o)-, cordi-"), ["cardi", "cordi"]);
  assert.equal(affixKind("-itis"), "suffix");
  assert.equal(affixKind("hepat-"), "prefix / root");
});

test("conflicting meanings and shared affixes are detected", () => {
  assert.ok(conflicts(terms[0], terms[1])); // same meaning
  assert.ok(conflicts(terms[0], terms[7])); // "heart" inside "of the heart"
  assert.ok(conflicts(T("cardi(o)-", "x"), T("cardi-", "y"))); // same spelling
  assert.ok(!conflicts(terms[2], terms[3]));
});

test("every question has 4 unique, non-conflicting options with one answer", () => {
  let seed = 7;
  const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const deck = new Deck(terms, rng);
  for (let i = 0; i < 200; i++) {
    const q = deck.next();
    assert.equal(q.options.length, CHOICES);
    assert.equal(new Set(q.options).size, CHOICES);
    const right = terms.find((t) => t.affix === q.affix);
    assert.equal(q.options[q.answer], right.meaning);
    for (const [i2, opt] of q.options.entries()) {
      if (i2 === q.answer) continue;
      assert.ok(!conflicts(right, T("zz-", opt)), `${opt} conflicts with ${right.meaning}`);
    }
  }
});

test("returns null when too few distinct terms exist", () => {
  assert.equal(makeQuestion(terms[0], terms.slice(0, 3)), null);
});
