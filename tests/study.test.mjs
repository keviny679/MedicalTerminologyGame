import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTER_FILES, parseChapter, makeStudyQuestion, StudyDeck, chapterMastery, roomsFor, tooSimilar, questionTypes, buildMidtermEntries, buildMidtermFocusEntries, explainEntry } from "../js/study.js";
import * as DG from "../js/diagrams.js";
const { DIAGRAMS } = DG;

const chapters = CHAPTER_FILES.map((f) => parseChapter(readFileSync(new URL(`../data/eml/${f}.txt`, import.meta.url), "utf8"), f));
const all = chapters.flatMap((c) => c.entries);
let seed = 11;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test("every chapter parses with sections and enough entries", () => {
  const expectedSections = [2, 5, 4, 4, 5, 4, 5, 5, 6, 7, 6, 3, 3];
  chapters.forEach((c, i) => {
    assert.equal(c.num, i + 1, c.file);
    assert.ok(c.title, c.file);
    assert.equal(c.sections.length, expectedSections[i], `${c.file} textbook section count`);
    assert.ok(c.entries.length >= 20, `${c.file} has ${c.entries.length}`);
    for (const s of c.sections) {
      assert.ok(s.entries.length > 0, `${c.file} empty section ${s.title}`);
      assert.ok(s.source?.start && s.source?.end, `${c.file} missing source for ${s.title}`);
    }
  });
});

test("entry keys are unique and definitions are present", () => {
  const keys = new Set();
  for (const e of all) {
    assert.ok(!keys.has(e.key), `duplicate ${e.key}`);
    keys.add(e.key);
    assert.ok(e.def.length > 1, e.key);
  }
});

test("every picture reference points at a real diagram region", () => {
  for (const e of all.filter((x) => x.img)) {
    const [d, r] = e.img.split(".");
    assert.ok(DIAGRAMS[d], `${e.key}: no diagram ${d}`);
    assert.ok(DG.partLabel(d, r), `${e.key}: no region or group ${r}`);
  }
});

test("every entry yields valid questions of every type", () => {
  for (const ch of chapters) {
    for (const e of ch.entries) {
      for (const type of questionTypes(e, DG)) {
        const sameSection = all.filter((x) => x.chapter === e.chapter && x.section === e.section);
        const q = makeStudyQuestion(e, [sameSection, ch.entries, all], DG, rng, type);
        assert.ok(q, `${e.key} ${type}`);
        assert.equal(q.options.length, 4, `${e.key} ${type}`);
        assert.equal(new Set(q.options).size, 4, `${e.key} ${type}: ${q.options}`);
        assert.ok(q.answer >= 0);
        q.options.forEach((o, i) => { if (i !== q.answer) assert.ok(!tooSimilar(o, q.options[q.answer]), `${e.key}: ${o}`); });
      }
    }
  }
});

test("deck favors missed entries and tracks mastery", () => {
  const ch = chapters[0];
  const progress = {};
  const deck = new StudyDeck(ch.entries, all, DG, progress, rng);
  const DAY = 86400000;
  for (let day = 0; day < 3; day++) {
    for (let i = 0; i < 50; i++) {
      const q = deck.next();
      deck.record(q.entry, true, true, Date.UTC(2026, 9, 10) + day * DAY);
    }
  }
  assert.ok(chapterMastery(ch, progress) > 0);
  const target = ch.entries[5];
  progress[target.key] = { r: 0, w: 5, l: 0 };
  assert.ok(deck.weight(target) > deck.weight(ch.entries.find((e) => progress[e.key]?.r >= 2)));
});

test("diagram questions never offer an overlapping answer", () => {
  const q = makeStudyQuestion(all.find((e) => e.img === "skullLateral.cranium"), [all], DG, rng, "image");
  assert.equal(q.options[q.answer], "Cranium (cranial bones)");
  for (const o of q.options) assert.ok(!/^(Frontal|Parietal|Temporal|Occipital|Sphenoid|Ethmoid) bone$/.test(o), o);
  const q2 = makeStudyQuestion(all.find((e) => e.img === "skullLateral.frontal"), [all], DG, rng, "image");
  assert.ok(!q2.options.includes("Cranium (cranial bones)"));
});

test("every diagram renders, labelled and highlighted", () => {
  for (const [name, d] of Object.entries(DIAGRAMS)) {
    for (const id of [...Object.keys(d.regions), ...Object.keys(d.groups || {})]) {
      const svg = DG.renderDiagram(name, id, { labels: "all" });
      assert.ok(svg.includes(" hl"), `${name}.${id} not highlighted`);
    }
  }
});

test("bigger chapters get longer runs", () => {
  assert.ok(roomsFor(150) > roomsFor(60));
  assert.equal(roomsFor(10), 3);
  assert.equal(roomsFor(1000), 12);
  console.log(chapters.map((c) => `ch${c.num}: ${c.entries.length} entries, ${c.sections.length} sections, ${roomsFor(c.entries.length)} rooms`).join("\n"));
});

test("Midterm 1 builds 50 unique questions with extra weight on Chapters 6-8", () => {
  let s = 91;
  const seeded = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const entries = buildMidtermEntries(chapters, seeded);
  assert.equal(entries.length, 50);
  assert.equal(new Set(entries.map((e) => e.key)).size, 50);
  const counts = Object.fromEntries(Array.from({ length: 8 }, (_, i) => [i + 1, entries.filter((e) => e.chapter === i + 1).length]));
  assert.deepEqual(counts, { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 10, 7: 10, 8: 10 });
  assert.ok(entries.some((e) => e.kind === "abbr"));
  assert.ok(entries.some((e) => e.kind === "part"));
  assert.ok(entries.some((e) => e.img));
  assert.ok(entries.some((e) => /diagnostic|therapeutic|procedure|pharmacology/i.test(e.section)));
});

test("focused Midterm practice balances Chapters 3-7", () => {
  let s = 131;
  const seeded = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const entries = buildMidtermFocusEntries(chapters, seeded);
  assert.equal(entries.length, 25);
  assert.equal(new Set(entries.map((e) => e.key)).size, 25);
  for (let chapter = 3; chapter <= 7; chapter++) {
    assert.equal(entries.filter((e) => e.chapter === chapter).length, 5);
  }
  assert.ok(entries.some((e) => e.kind === "part"));
  assert.ok(entries.some((e) => e.img));
  assert.ok(entries.some((e) => /diagnostic|therapeutic|procedure|pharmacology/i.test(e.section)));
});

test("feedback expands a terse abbreviation into the concept it names", () => {
  const cxr = chapters[7].entries.find((e) => e.name === "CXR");
  const explanation = explainEntry(cxr, all);
  assert.match(explanation, /stands for chest x-ray/i);
  assert.match(explanation, /image of the lungs, heart and chest bones/i);
});

test("diagram paths contain no malformed numbers", () => {
  for (const [name, d] of Object.entries(DIAGRAMS)) {
    for (const [id, r] of Object.entries(d.regions)) {
      const path = r.d || r.line;
      assert.ok(!/NaN|undefined/.test(path), `${name}.${id}`);
      assert.ok(!/a[\d.]+,[\d.]+ 0 \d{2,}/.test(path), `${name}.${id} has a broken arc`);
    }
  }
});

import { dayKey, vocabulary, acceptVariants, gradeTyped, makeRecallQuestion, schedule, dueEntries, isMastered, letterHint, INTERVALS } from "../js/study.js";

test("typed answers accept every reasonable form", () => {
  const v = acceptVariants("cardi/o, cordi-");
  for (const ok of ["cardi/o", "cardio", "cardi", "cordi-", "cordi"]) assert.equal(gradeTyped(ok, v), "exact", ok);
  assert.equal(gradeTyped("ECG", acceptVariants("ECG, EKG")), "exact");
  assert.equal(gradeTyped("ekg", acceptVariants("ECG, EKG")), "exact");
  const g = acceptVariants("Sweat (sudoriferous) gland");
  for (const ok of ["sweat gland", "sudoriferous gland", "Sweat (sudoriferous) gland"]) assert.equal(gradeTyped(ok, g), "exact", ok);
  assert.equal(gradeTyped("cranial bones", acceptVariants("Cranium (cranial bones)")), "exact");
  assert.equal(gradeTyped("cranium", acceptVariants("Cranium (cranial bones)")), "exact");
});

test("small typos pass with a note, wrong words fail", () => {
  const a = acceptVariants("gastrectomy");
  assert.equal(gradeTyped("gastrectomey", a), "typo");
  assert.equal(gradeTyped("gastrotomy", a), "wrong");
  assert.equal(gradeTyped("hypotension", acceptVariants("hypertension")), "wrong");
  const vocab = new Set(["ilium", "ileum"]);
  assert.equal(gradeTyped("ilium", acceptVariants("ileum"), vocab), "wrong"); // a real, different word
  assert.equal(gradeTyped("", a), "wrong");
  assert.equal(gradeTyped("MO", acceptVariants("MI")), "wrong"); // short answers must be exact
  assert.equal(gradeTyped("occipitl bone", acceptVariants("Occipital bone")), "typo");
});

test("recall questions accept synonyms with the same definition", () => {
  const ch = chapters[2];
  const e = ch.entries.find((x) => x.name === "derm/o, dermat/o");
  const q = makeRecallQuestion(e, all, DG, () => 0.9);
  assert.equal(q.mode, "typed");
  assert.equal(gradeTyped("dermat/o", q.accept), "exact");
  for (const x of all) {
    const rq = makeRecallQuestion(x, all, DG, rng);
    if (rq) assert.ok(rq.accept.length && rq.answerText, x.key);
  }
});

test("spacing: typed recalls stretch the interval, misses reset it", () => {
  const DAY = 86400000;
  const p = { r: 0, w: 0, l: 0, t: 0 };
  let now = 0;
  for (let i = 0; i < 4; i++) {
    schedule(p, true, true, now);
    assert.equal(p.due - now, INTERVALS[i] * DAY);
    now = p.due;
  }
  schedule(p, false, true, now);
  assert.equal(p.box, 0);
  assert.ok(p.due - now < DAY);
  const e = { key: "x" };
  assert.deepEqual(dueEntries([e], { x: p }, now + DAY), [e]);
  assert.deepEqual(dueEntries([e], { x: p }, now), []);
});

test("mastery needs a typed recall, not just recognition", () => {
  assert.ok(!isMastered({ r: 5, w: 0, l: 1, t: 0 }));
  assert.ok(!isMastered({ r: 3, w: 0, l: 1, t: 3, days: ["2026-10-16"] })); // 3 times in one day is not enough
  assert.ok(isMastered({ r: 3, w: 0, l: 1, t: 3, days: ["2026-10-14", "2026-10-15", "2026-10-16"] }));
  assert.ok(!isMastered({ r: 4, w: 1, l: 0, t: 3, days: ["2026-10-14", "2026-10-15", "2026-10-16"] }));
  assert.match(letterHint("gastrectomy"), /^g a _/);
});

test("decks in typed style ask typed questions when possible", () => {
  const ch = chapters[4];
  const deck = new StudyDeck(ch.entries, all, DG, {}, rng, "typed");
  for (let i = 0; i < 40; i++) assert.equal(deck.next().mode, "typed");
  const mc = new StudyDeck(ch.entries, all, DG, {}, rng, "mc");
  for (let i = 0; i < 40; i++) assert.notEqual(mc.next().mode, "typed");
});

test("mixed style on a brand-new chapter asks plenty of typed recall", () => {
  for (const [accuracy, minShare] of [[1, 0.35], [0.6, 0.35]]) {
    const deck = new StudyDeck(chapters[2].entries, all, DG, {}, rng, "mixed");
    let typed = 0;
    const N = 60;
    for (let i = 0; i < N; i++) {
      const q = deck.next();
      if (q.mode === "typed") typed++;
      deck.record(q.entry, rng() < accuracy, q.mode === "typed");
    }
    assert.ok(typed / N >= minShare, `only ${typed}/${N} typed at accuracy ${accuracy}`);
  }
});

test("a term answered by recognition is re-asked as typed a few questions later", () => {
  const deck = new StudyDeck(chapters[4].entries, all, DG, {}, rng, "mixed");
  const first = deck.next();
  assert.notEqual(first.mode, "typed");
  deck.record(first.entry, true, false);
  const later = [];
  for (let i = 0; i < 5; i++) {
    const q = deck.next();
    later.push(q);
    deck.record(q.entry, true, q.mode === "typed");
  }
  const again = later.find((q) => q.entry === first.entry);
  assert.ok(again, "term came back");
  if (/ to /.test(first.entry.name) === false && first.entry.name.length <= 40) assert.equal(again.mode, "typed");
});

test("guesses don't count as knowing; confident misses come back soonest", () => {
  const deck = new StudyDeck(chapters[1].entries, all, DG, {}, rng, "mixed");
  const e = chapters[1].entries[3];
  deck.record(e, true, true, Date.now(), { guess: true });
  const p = deck.progress[e.key];
  assert.equal(p.t, 0);
  assert.equal(p.l, 0);
  assert.ok(!p.days);
  assert.ok(p.due - Date.now() <= 86400000 + 1000, "a lucky guess isn't pushed out");
  assert.ok(deck.followUps.some((f) => f.entry === e), "a guessed term is re-asked");
  const f = chapters[1].entries[5];
  deck.record(f, false, true);
  assert.equal(deck.progress[f.key].cw, 1);
  const gap = deck.followUps.find((x) => x.entry === f).at - deck.asked;
  assert.ok(gap <= 3, `confident miss re-asked within 3, got ${gap}`);
});

test("missed terms stay unresolved until recalled correctly", () => {
  const deck = new StudyDeck(chapters[1].entries, all, DG, {}, rng, "mixed");
  const e = chapters[1].entries[7];
  deck.record(e, false, false);
  assert.deepEqual(deck.unresolved, [e]);
  deck.record(e, true, true, Date.now(), { guess: true });
  assert.deepEqual(deck.unresolved, [e], "a guess does not resolve it");
  deck.record(e, true, true);
  assert.deepEqual(deck.unresolved, []);
  assert.ok(deck.recallFor(e));
});
