import test from "node:test";
import assert from "node:assert/strict";
import { advanceHold, advanceRepetition, bridgeZones, highKneeZones, jumpingJackZones, kneePushUpZones, lungeZones, plankValid, pushUpZones, sidePlankValid, squatZones } from "../src/lib/motionRules.ts";

test("push-up and squat count only after top, bottom, top", () => {
  for (const zones of [
    [pushUpZones(170, 175), pushUpZones(130, 175), pushUpZones(85, 175)],
    [squatZones(175, 170), squatZones(135, 135), squatZones(85, 95)],
  ]) {
    let state = { phase: "find", stable: 0 };
    let counted = 0;
    const feed = (zone) => { const next = advanceRepetition(state, zone.top, zone.bottom); state = next; counted += Number(next.counted); };
    feed(zones[0]); feed(zones[0]);
    feed(zones[1]); feed(zones[0]);
    assert.equal(counted, 0, "a shallow partial repetition must not count");
    feed(zones[2]); feed(zones[2]);
    assert.equal(counted, 0, "the bottom position alone must not count");
    feed(zones[0]); feed(zones[0]);
    assert.equal(counted, 1);
  }
});

test("push-up requires a straight body and plank requires supported form", () => {
  assert.equal(pushUpZones(85, 130).valid, false);
  assert.equal(plankValid(170, 170, 90), true);
  assert.equal(plankValid(135, 170, 90), false);
  assert.equal(plankValid(170, 130, 90), false);
  assert.equal(plankValid(170, 170, 165), false);
});

test("plank timer pauses on invalid form and ignores a long camera gap", () => {
  let state = { stable: 0, heldMs: 0, lastValidAt: null };
  let seconds = 0;
  const feed = (valid, now) => { const next = advanceHold(state, valid, now); state = next; seconds += next.seconds; };
  for (let now = 0; now <= 600; now += 100) feed(true, now);
  feed(false, 700);
  feed(true, 10000);
  assert.equal(seconds, 0);
  for (let now = 10100; now <= 10600; now += 100) feed(true, now);
  assert.equal(seconds, 1);
  feed(true, 20000);
  assert.equal(seconds, 1, "a frozen frame cannot add multiple seconds");
});

test("new repetition rules require a full return and valid body alignment", () => {
  assert.equal(kneePushUpZones(90, 125).valid, false);
  assert.equal(kneePushUpZones(90, 165).bottom, true);
  assert.equal(lungeZones(90, 0.3).bottom, true);
  assert.equal(lungeZones(90, 1.2).valid, false);
  assert.equal(bridgeZones(165, 0.15).top, true);
  assert.equal(bridgeZones(125, 0.01).bottom, true);
  assert.equal(jumpingJackZones(true, false, 0.5, 0.2).bottom, true);
  assert.equal(jumpingJackZones(false, true, 0.1, 0.2).top, true);
  assert.equal(highKneeZones(0.4, 0.42, 0.7).bottom, true);
  assert.equal(highKneeZones(0.66, 0.42, 0.86).top, true);
  assert.equal(sidePlankValid(165, 90), true);
  assert.equal(sidePlankValid(135, 90), false);
  let state = { phase: "find", stable: 0 };
  let counted = 0;
  const feed = (zones) => { const next = advanceRepetition(state, zones.top, zones.bottom); state = next; counted += Number(next.counted); };
  const down = bridgeZones(120, 0.01);
  const up = bridgeZones(165, 0.15);
  feed({ top: down.bottom, bottom: down.top }); feed({ top: down.bottom, bottom: down.top });
  feed({ top: up.bottom, bottom: up.top }); feed({ top: up.bottom, bottom: up.top });
  assert.equal(counted, 0);
  feed({ top: down.bottom, bottom: down.top }); feed({ top: down.bottom, bottom: down.top });
  assert.equal(counted, 1);
});
