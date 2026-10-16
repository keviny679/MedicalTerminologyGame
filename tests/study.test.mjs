import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CHAPTER_FILES, parseChapter, makeStudyQuestion, StudyDeck, chapterMastery, roomsFor, tooSimilar, questionTypes } from "../js/study.js";
import * as DG from "../js/diagrams.js";
const { DIAGRAMS } = DG;

const chapters = CHAPTER_FILES.map((f) => parseChapter(readFileSync(new URL(`../data/eml/${f}.txt`, import.meta.url), "utf8"), f));
const all = chapters.flatMap((c) => c.entries);
let seed = 11;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

test("every chapter parses with sections and enough entries", () => {
  chapters.forEach((c, i) => {
    assert.equal(c.num, i + 1, c.file);
    assert.ok(c.title, c.file);
    assert.ok(c.sections.length >= 4, `${c.file} sections`);
    assert.ok(c.entries.length >= 60, `${c.file} has ${c.entries.length}`);
    for (const s of c.sections) assert.ok(s.entries.length > 0, `${c.file} empty section ${s.title}`);
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
  for (let i = 0; i < 50; i++) {
    const q = deck.next();
    deck.record(q.entry, true);
    deck.record(q.entry, true);
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

test("diagram paths contain no malformed numbers", () => {
  for (const [name, d] of Object.entries(DIAGRAMS)) {
    for (const [id, r] of Object.entries(d.regions)) {
      const path = r.d || r.line;
      assert.ok(!/NaN|undefined/.test(path), `${name}.${id}`);
      assert.ok(!/a[\d.]+,[\d.]+ 0 \d{2,}/.test(path), `${name}.${id} has a broken arc`);
    }
  }
});
