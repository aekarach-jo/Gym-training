import test from "node:test";
import assert from "node:assert/strict";
import {
  advanceCameraRepetition, advanceHighKnees, advanceHold, bridgeZones,
  highKneeZones, initialCameraRepState, initialHighKneeState,
  jumpingJackZones, lungeZones, pauseCameraRepetition, pauseHighKnees,
  plankValid, relativeBridgeLift, sidePlankValid, squatZones,
} from "../src/lib/motionRules.ts";

const repetitionCases = [
  { name: "สควอต", start: () => squatZones(170, 165), middle: () => squatZones(137, 145), far: () => squatZones(100, 115) },
  { name: "ลันจ์", start: () => lungeZones(165, 0.2), middle: () => lungeZones(135, 0.2), far: () => lungeZones(95, 0.2) },
  { name: "สะพานยกสะโพก", start: () => bridgeZones(120, 0.01), middle: () => bridgeZones(140, 0.06), far: () => bridgeZones(160, 0.12), reverse: true },
  { name: "กระโดดตบ", start: () => jumpingJackZones(false, true, 0.12, 0.2), middle: () => jumpingJackZones(false, false, 0.23, 0.2), far: () => jumpingJackZones(true, false, 0.36, 0.2) },
];

for (const exercise of repetitionCases) {
  test(`${exercise.name} counts ten complete cycles across a brief lost frame`, () => {
    let state = initialCameraRepState;
    let now = 0;
    let count = 0;
    const feed = (zones) => {
      now += 110;
      const next = advanceCameraRepetition(state, exercise.reverse ? zones.bottom : zones.top, exercise.reverse ? zones.top : zones.bottom, now);
      state = next;
      count += Number(next.counted);
    };
    feed(exercise.start());
    for (let rep = 0; rep < 10; rep++) {
      feed(exercise.middle());
      feed(exercise.far());
      now += 110;
      state = pauseCameraRepetition(state, now);
      feed(exercise.middle());
      feed(exercise.start());
    }
    assert.equal(count, 10);
    feed(exercise.middle());
    feed(exercise.start());
    assert.equal(count, 10, "a shallow movement must not count");
  });
}

test("long camera loss discards an incomplete repetition", () => {
  let state = advanceCameraRepetition(initialCameraRepState, true, false, 0);
  state = advanceCameraRepetition(state, false, true, 100);
  state = pauseCameraRepetition(state, 900);
  state = advanceCameraRepetition(state, true, false, 1000);
  assert.equal(state.counted, false);
});

test("ยกเข่าสูง counts the first lift and then alternates legs", () => {
  let state = initialHighKneeState;
  let count = 0;
  let now = 0;
  const ground = highKneeZones(0.64, 0.38, 0.88);
  const raised = highKneeZones(0.40, 0.38, 0.64);
  const feed = (left, right) => {
    now += 110;
    const next = advanceHighKnees(state, left, right, now);
    state = next;
    count += Number(next.counted);
  };
  feed(ground, ground);
  for (let rep = 0; rep < 10; rep++) {
    feed(rep % 2 === 0 ? raised : ground, rep % 2 === 0 ? ground : raised);
    state = pauseHighKnees(state, now + 40);
    feed(ground, ground);
  }
  assert.equal(count, 10);
  feed(ground, raised);
  feed(ground, ground);
  assert.equal(count, 10, "raising the same leg twice must not count again");
});

test("ยกเข่าสูง can switch legs in the same frame and works when farther from camera", () => {
  const ground = highKneeZones(0.58, 0.45, 0.70);
  const raised = highKneeZones(0.46, 0.45, 0.58);
  assert.equal(ground.top, true);
  assert.equal(raised.bottom, true);
  let state = advanceHighKnees(initialHighKneeState, ground, ground, 0);
  state = advanceHighKnees(state, raised, ground, 100);
  state = advanceHighKnees(state, ground, raised, 200);
  assert.equal(state.counted, true);
  assert.equal(state.activeLeg, "right");
  state = advanceHighKnees(state, ground, ground, 300);
  assert.equal(state.counted, true);
});

test("สะพานยกสะโพก uses body-relative height at different camera distances", () => {
  const close = relativeBridgeLift({ x: 0.2, y: 0.6 }, { x: 0.4, y: 0.52 }, { x: 0.7, y: 0.58 });
  const far = relativeBridgeLift({ x: 0.35, y: 0.55 }, { x: 0.45, y: 0.51 }, { x: 0.6, y: 0.54 });
  assert.ok(Math.abs(close - far) < 0.03);
  assert.equal(bridgeZones(160, close).top, true);
  assert.equal(bridgeZones(160, far).top, true);
});

test("แพลงก์ทั้งสองแบบ pause during bad form without adding the hidden interval", () => {
  assert.equal(plankValid(165, 165, 90), true);
  assert.equal(sidePlankValid(160, 90), true);
  assert.equal(plankValid(130, 165, 90), false);
  assert.equal(sidePlankValid(130, 90), false);
  let state = { stable: 0, heldMs: 0, lastValidAt: null, lastGoodAt: null };
  let seconds = 0;
  for (let now = 0; now <= 600; now += 100) {
    const next = advanceHold(state, true, now);
    state = next;
    seconds += next.seconds;
  }
  state = advanceHold(state, false, 700);
  state = advanceHold(state, true, 800);
  assert.equal(seconds, 0);
  assert.ok(state.heldMs < 700, "the hidden interval is not credited");
  state = advanceHold(state, false, 1000);
  state = advanceHold(state, true, 3000);
  assert.equal(state.stable, 1, "a long gap requires a fresh stable pose");
});
