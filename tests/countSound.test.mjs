import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { playCountSound } from "../src/lib/countSound.ts";

test("count sound is a valid nonempty WAV asset", async () => {
  const sound = await readFile(new URL("../public/sounds/count-beep.wav", import.meta.url));
  assert.equal(sound.toString("ascii", 0, 4), "RIFF");
  assert.equal(sound.toString("ascii", 8, 12), "WAVE");
  assert.ok(sound.length > 10000);
  assert.ok(sound.subarray(44).some((sample) => sample !== 0));
});

test("count and preview reuse the same browser audio element", async () => {
  const originalAudio = globalThis.Audio;
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const instances = [];
  const audioSession = { type: "ambient" };
  class FakeAudio {
    constructor(src) { this.src = src; this.currentTime = 5; this.playCount = 0; instances.push(this); }
    play() { this.playCount += 1; return Promise.resolve(); }
  }
  globalThis.Audio = FakeAudio;
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { audioSession } });
  try {
    await playCountSound();
    await playCountSound();
    assert.equal(audioSession.type, "playback");
    assert.equal(instances.length, 1);
    assert.equal(instances[0].src, "/sounds/count-beep.wav");
    assert.equal(instances[0].playCount, 2);
    assert.equal(instances[0].currentTime, 0);
  } finally {
    globalThis.Audio = originalAudio;
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete globalThis.navigator;
  }
});
