import test from "node:test";
import assert from "node:assert/strict";
import { playCountBeep } from "../src/lib/countSound.ts";

function fakeAudioContext(state) {
  const events = [];
  const tone = {
    frequency: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => {},
    disconnect: () => {},
    start: () => events.push("start"),
    stop: () => events.push("stop"),
  };
  const volume = {
    gain: {
      setValueAtTime: () => {},
      exponentialRampToValueAtTime: () => {},
    },
    connect: () => {},
    disconnect: () => {},
  };
  return {
    events,
    context: {
      currentTime: 10,
      state,
      destination: {},
      createOscillator: () => tone,
      createGain: () => volume,
      resume: () => { events.push("resume"); return Promise.resolve(); },
    },
  };
}

test("beep starts and resumes audio even when the browser suspended it", () => {
  const { context, events } = fakeAudioContext("suspended");
  playCountBeep(context);
  assert.deepEqual(events, ["start", "stop", "resume"]);
});

test("beep plays immediately when audio is already running", () => {
  const { context, events } = fakeAudioContext("running");
  playCountBeep(context);
  assert.deepEqual(events, ["start", "stop"]);
});
