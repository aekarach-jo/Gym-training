import test from "node:test";
import assert from "node:assert/strict";
import { activityDays, exerciseTrend, personalBests, trainingStreak, weeklyTrainingDays } from "../src/lib/insights.ts";

const entry = (id, date, exerciseId, value) => ({ id, exerciseId, value, source: "manual", at: `${date}T12:00:00` });
const rows = [
  entry("one", "2026-09-26", "squat", 10),
  entry("two", "2026-09-27", "squat", 12),
  entry("three", "2026-09-27", "squat", 15),
  entry("four", "2026-09-28", "push-up", 8),
];

test("streak continues from yesterday and breaks across a missed day", () => {
  assert.equal(trainingStreak(rows, new Date(2026, 8, 28, 18)), 3);
  assert.equal(trainingStreak(rows.slice(0, 3), new Date(2026, 8, 28, 18)), 2);
  assert.equal(trainingStreak(rows, new Date(2026, 8, 30, 18)), 0);
});

test("weekly goal counts distinct days and calendar counts sets", () => {
  const week = weeklyTrainingDays(rows, new Date(2026, 8, 28, 18));
  assert.equal(week.filter((day) => day.trained).length, 1);
  const days = activityDays(rows, new Date(2026, 8, 28, 18), 3);
  assert.deepEqual(days.map((day) => day.sets), [1, 2, 1]);
});

test("records and trend use best completed set per exercise and day", () => {
  assert.equal(personalBests(rows).find((record) => record.exerciseId === "squat")?.best, 15);
  assert.deepEqual(exerciseTrend(rows, "squat").map((point) => point.best), [10, 15]);
});
