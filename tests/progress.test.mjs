import test from "node:test";
import assert from "node:assert/strict";
import { countAnswer, goalMet, recordGoal, liveStreak, makeBackup, mergeProgress, applyBackup } from "../js/progress.js";

const DAY = 86400000;
const t0 = new Date(2026, 9, 16, 12).getTime(); // local noon

test("daily goal: clear what's due, or answer enough when nothing is due", () => {
  assert.ok(goalMet({ hadDue: true, dueLeft: 0, answeredToday: 5 }));
  assert.ok(!goalMet({ hadDue: true, dueLeft: 3, answeredToday: 40 }));
  assert.ok(!goalMet({ hadDue: false, dueLeft: 0, answeredToday: 3 }));
  assert.ok(goalMet({ hadDue: false, dueLeft: 0, answeredToday: 15 }));
});

test("answers are counted per day", () => {
  let today = countAnswer(null, t0);
  today = countAnswer(today, t0 + 1000);
  assert.equal(today.answered, 2);
  today = countAnswer(today, t0 + DAY);
  assert.equal(today.answered, 1);
});

test("streaks grow on consecutive days and break after a missed day", () => {
  let s = recordGoal(null, t0);
  s = recordGoal(s, t0 + 1000); // same day: no double count
  assert.equal(s.count, 1);
  s = recordGoal(s, t0 + DAY);
  s = recordGoal(s, t0 + 2 * DAY);
  assert.equal(s.count, 3);
  assert.equal(liveStreak(s, t0 + 3 * DAY), 3, "still alive the next day");
  assert.equal(liveStreak(s, t0 + 4 * DAY), 0, "broken after a full missed day");
  s = recordGoal(s, t0 + 4 * DAY);
  assert.equal(s.count, 1);
  assert.equal(s.best, 3);
});

test("backups round-trip and merge without losing practice", () => {
  const store = {
    "rb.eml": { a: { r: 2, w: 1, l: 1, days: ["2026-10-14"] }, b: { r: 1, w: 0, l: 1 } },
    "rb.streak": { count: 2, best: 4, last: "2026-10-15" },
    "rb.meta": { embers: 10, levels: { vitality: 1 } },
  };
  const read = (k) => store[k] ?? null;
  const backup = JSON.parse(JSON.stringify(makeBackup(read)));
  assert.equal(backup.app, "root-and-blade");
  const other = {
    "rb.eml": { a: { r: 5, w: 1, l: 1, days: ["2026-10-15", "2026-10-16"] }, c: { r: 1, w: 1, l: 0 } },
    "rb.streak": { count: 1, best: 1, last: "2026-10-10" },
    "rb.meta": { embers: 3, levels: { vitality: 3, keen: 1 } },
  };
  const out = applyBackup({ app: "root-and-blade", version: 1, data: other }, read);
  assert.equal(out["rb.eml"].a.r, 5);
  assert.deepEqual(out["rb.eml"].a.days, ["2026-10-14", "2026-10-15", "2026-10-16"]);
  assert.ok(out["rb.eml"].b && out["rb.eml"].c);
  assert.equal(out["rb.streak"].last, "2026-10-15", "keeps the more recent streak");
  assert.deepEqual(out["rb.meta"], { embers: 10, levels: { vitality: 3, keen: 1 } });
  assert.throws(() => applyBackup({ hello: 1 }, read));
  assert.deepEqual(mergeProgress({}, { z: { r: 1, w: 0 } }), { z: { r: 1, w: 0 } });
});

test("progress from before the chapter split moves to the new chapters", async () => {
  const { readFileSync } = await import("node:fs");
  const { CHAPTER_FILES, parseChapter } = await import("../js/study.js");
  const { migrateProgress } = await import("../js/progress.js");
  const chapters = CHAPTER_FILES.map((f) => parseChapter(readFileSync(new URL(`../data/eml/${f}.txt`, import.meta.url), "utf8"), f));
  const keys = new Set(chapters.flatMap((c) => c.entries.map((e) => e.key)));
  const old = {
    "4|term|femur": { r: 3, w: 0 },          // stays in skeletal
    "4|term|tendon": { r: 2, w: 1 },         // moved to muscles and tendons
    "4|term|biceps": { r: 1, w: 0 },         // renamed
    "5|term|aorta": { r: 4, w: 0 },          // heart: 5 -> 6
    "6|term|plasma": { r: 1, w: 0 },         // blood: 6 -> 7
    "7|term|trachea": { r: 1, w: 0 },        // lungs: 7 -> 8
    "2|term|cell": { r: 5, w: 0 },           // unchanged
  };
  const out = migrateProgress(old, chapters);
  assert.deepEqual(Object.keys(out).sort(), [
    "2|term|cell", "4|term|femur", "5|term|biceps brachii", "5|term|tendon", "6|term|aorta", "7|term|plasma", "8|term|trachea",
  ]);
  for (const k of Object.keys(out)) assert.ok(keys.has(k), `${k} is a real entry`);
});
