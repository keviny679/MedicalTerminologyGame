// Daily goal, streaks and progress backup (export/import). Pure logic.
import { dayKey } from "./study.js";

const DAY = 86400000;
export const GOAL_MIN_ANSWERS = 15; // when nothing is due, answering this many counts as studying today

// today: { day, answered } — reset when the day changes.
export function countAnswer(today, now = Date.now()) {
  const d = dayKey(now);
  if (!today || today.day !== d) today = { day: d, answered: 0 };
  today.answered += 1;
  return today;
}

// The daily goal: clear everything that is due, having studied at least a
// little; or, on a day with nothing due, answer GOAL_MIN_ANSWERS questions.
export function goalMet({ dueLeft, answeredToday, hadDue }) {
  if (hadDue) return dueLeft === 0 && answeredToday > 0;
  return answeredToday >= GOAL_MIN_ANSWERS;
}

// streak: { count, best, last } where last is the dayKey the goal was last met.
export function recordGoal(streak, now = Date.now()) {
  streak = { count: 0, best: 0, last: null, ...(streak || {}) };
  const today = dayKey(now);
  if (streak.last === today) return streak;
  streak.count = streak.last === dayKey(now - DAY) ? streak.count + 1 : 1;
  streak.best = Math.max(streak.best, streak.count);
  streak.last = today;
  return streak;
}

// The streak still counts if the goal was met today or yesterday.
export function liveStreak(streak, now = Date.now()) {
  if (!streak?.last) return 0;
  return streak.last === dayKey(now) || streak.last === dayKey(now - DAY) ? streak.count : 0;
}

/* ------------------------------------------------------------------ backup */

export const BACKUP_KEYS = ["rb.eml", "rb.streak", "rb.today", "rb.style", "rb.meta", "rb.best"];

export function makeBackup(read, now = new Date()) {
  const data = {};
  for (const k of BACKUP_KEYS) {
    const v = read(k);
    if (v !== null && v !== undefined) data[k] = v;
  }
  return { app: "root-and-blade", version: 1, exported: now.toISOString(), data };
}

// Combine two term-progress maps, keeping the more-practiced record of each term.
export function mergeProgress(a = {}, b = {}) {
  const out = { ...a };
  for (const [k, pb] of Object.entries(b)) {
    const pa = out[k];
    if (!pa) { out[k] = pb; continue; }
    const seen = (p) => (p.r || 0) + (p.w || 0);
    const keep = seen(pb) > seen(pa) ? { ...pb } : { ...pa };
    keep.days = [...new Set([...(pa.days || []), ...(pb.days || [])])].sort().slice(-6);
    out[k] = keep;
  }
  return out;
}

// Apply a backup on top of current data. Returns the new values to store.
export function applyBackup(backup, read) {
  if (!backup || backup.app !== "root-and-blade" || typeof backup.data !== "object") {
    throw new Error("That file isn't a Root & Blade progress backup.");
  }
  const d = backup.data;
  const out = {};
  if (d["rb.eml"]) out["rb.eml"] = mergeProgress(read("rb.eml") || {}, d["rb.eml"]);
  const sa = read("rb.streak"), sb = d["rb.streak"];
  if (sb) out["rb.streak"] = !sa?.last || (sb.last && sb.last >= sa.last) ? sb : sa;
  const ma = read("rb.meta"), mb = d["rb.meta"];
  if (mb) {
    const levels = { ...(ma?.levels || {}) };
    for (const [k, v] of Object.entries(mb.levels || {})) levels[k] = Math.max(levels[k] || 0, v);
    out["rb.meta"] = { embers: Math.max(ma?.embers || 0, mb.embers || 0), levels };
  }
  for (const k of ["rb.style", "rb.best", "rb.today"]) if (d[k] !== undefined && read(k) == null) out[k] = d[k];
  return out;
}
