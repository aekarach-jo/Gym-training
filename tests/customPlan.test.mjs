import test from "node:test";
import assert from "node:assert/strict";
import { importData, initialData, validCustomPlan } from "../src/lib/storage.ts";

const customPlan = {
  name: "แผนฝึกของฉัน",
  trainingDays: [1, 3, 5],
  items: [
    { exerciseId: "squat", sets: 3, target: 15, rest: 60 },
    { exerciseId: "forward-lunge", sets: 4, target: 8, rest: 45 },
  ],
};

test("a saved custom plan keeps days, order, and set targets", () => {
  assert.equal(validCustomPlan(customPlan), true);
  const restored = importData({ ...initialData, activePlanId: "custom", customPlan });
  assert.deepEqual(restored?.customPlan, customPlan);
  assert.equal(restored?.activePlanId, "custom");
});

test("old backups load with their original plan and history", () => {
  const old = importData({ version: 2, entries: [{ id: "one", exerciseId: "squat", value: 12, source: "manual", at: "2026-09-28T10:00:00.000Z" }], challengeGoal: 12, activePlanId: "strength", weights: [], weightGoalKg: null });
  assert.equal(old?.version, 3);
  assert.equal(old?.activePlanId, "strength");
  assert.equal(old?.entries.length, 1);
  assert.equal(old?.customPlan, null);
});

test("invalid custom plans cannot be imported or activated", () => {
  const unevenSides = { ...customPlan, items: [{ exerciseId: "forward-lunge", sets: 3, target: 8, rest: 45 }] };
  assert.equal(validCustomPlan(unevenSides), false);
  assert.equal(importData({ ...initialData, activePlanId: "custom", customPlan: unevenSides }), null);
  assert.equal(importData({ ...initialData, activePlanId: "custom", customPlan: null })?.activePlanId, "starter");
});
