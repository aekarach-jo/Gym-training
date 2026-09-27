import test from "node:test";
import assert from "node:assert/strict";
import { importData, initialData, validCustomPlan } from "../src/lib/storage.ts";

const customPlan = {
  id: "custom-test",
  name: "แผนฝึกของฉัน",
  trainingDays: [1, 3, 5],
  items: [
    { exerciseId: "squat", sets: 3, target: 15, rest: 60, note: "คุมจังหวะลง" },
    { exerciseId: "forward-lunge", sets: 4, target: 8, rest: 45 },
  ],
};

test("multiple saved plans keep order, notes, targets, and active selection", () => {
  assert.equal(validCustomPlan(customPlan), true);
  const copy = { ...customPlan, id: "custom-copy", name: "แผนที่สอง" };
  const restored = importData({ ...initialData, activePlanId: "custom-copy", customPlans: [customPlan, copy] });
  assert.deepEqual(restored?.customPlans, [customPlan, copy]);
  assert.equal(restored?.activePlanId, "custom-copy");
});

test("version 3 single plan migrates without losing sets or weight", () => {
  const { id: _id, ...legacyPlan } = customPlan;
  void _id;
  const restored = importData({ version: 3, entries: [], challengeGoal: 10, activePlanId: "custom", customPlan: legacyPlan, weights: [{ id: "weight", date: "2026-09-28", kg: 70 }], weightGoalKg: 68 });
  assert.equal(restored?.version, 4);
  assert.equal(restored?.activePlanId, "custom-legacy");
  assert.deepEqual(restored?.customPlans[0].items, legacyPlan.items);
  assert.equal(restored?.weights[0].kg, 70);
});

test("version 2 backups retain their original plan and history", () => {
  const old = importData({ version: 2, entries: [{ id: "one", exerciseId: "squat", value: 12, source: "manual", at: "2026-09-28T10:00:00.000Z" }], challengeGoal: 12, activePlanId: "strength", weights: [], weightGoalKg: null });
  assert.equal(old?.version, 4);
  assert.equal(old?.activePlanId, "strength");
  assert.equal(old?.entries.length, 1);
  assert.deepEqual(old?.customPlans, []);
});

test("invalid or duplicate plans cannot be imported", () => {
  const unevenSides = { ...customPlan, items: [{ exerciseId: "forward-lunge", sets: 3, target: 8, rest: 45 }] };
  assert.equal(validCustomPlan(unevenSides), false);
  assert.equal(importData({ ...initialData, customPlans: [unevenSides] }), null);
  assert.equal(importData({ ...initialData, customPlans: [customPlan, customPlan] }), null);
  assert.equal(importData({ ...initialData, activePlanId: "custom-missing" })?.activePlanId, "starter");
});
