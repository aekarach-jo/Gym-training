import { exercises, type ExerciseId } from "./exercises.ts";
import type { SetEntry } from "./storage.ts";

export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayOf = (entry: SetEntry) => localDate(new Date(entry.at));
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export function trainingStreak(entries: SetEntry[], now = new Date()) {
  const dates = new Set(entries.map(dayOf));
  const cursor = startOfDay(now);
  if (!dates.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (dates.has(localDate(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

export function weeklyTrainingDays(entries: SetEntry[], now = new Date()) {
  const monday = startOfDay(now);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const days = new Set(entries.map(dayOf));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(date.getDate() + index);
    return { date: localDate(date), trained: days.has(localDate(date)), future: date > startOfDay(now) };
  });
}

export function activityDays(entries: SetEntry[], now = new Date(), count = 30) {
  const totals = new Map<string, number>();
  for (const entry of entries) totals.set(dayOf(entry), (totals.get(dayOf(entry)) ?? 0) + 1);
  const end = startOfDay(now);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(end);
    date.setDate(date.getDate() - count + 1 + index);
    const key = localDate(date);
    return { date: key, sets: totals.get(key) ?? 0 };
  });
}

export function personalBests(entries: SetEntry[]) {
  return exercises.map((exercise) => ({
    exerciseId: exercise.id,
    name: exercise.name,
    unit: exercise.unit,
    best: entries.filter((entry) => entry.exerciseId === exercise.id).reduce((max, entry) => Math.max(max, entry.value), 0),
  })).filter((record) => record.best > 0);
}

export function exerciseTrend(entries: SetEntry[], exerciseId: ExerciseId, count = 8) {
  const bestByDay = new Map<string, number>();
  for (const entry of entries) {
    if (entry.exerciseId !== exerciseId) continue;
    const day = dayOf(entry);
    bestByDay.set(day, Math.max(bestByDay.get(day) ?? 0, entry.value));
  }
  return [...bestByDay].sort(([a], [b]) => a.localeCompare(b)).slice(-count).map(([date, best]) => ({ date, best }));
}
