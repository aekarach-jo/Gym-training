export function playCountBeep(context: AudioContext) {
  const startAt = context.currentTime;
  const tone = context.createOscillator();
  const volume = context.createGain();
  tone.type = "sine";
  tone.frequency.setValueAtTime(880, startAt);
  tone.frequency.exponentialRampToValueAtTime(1046, startAt + 0.1);
  volume.gain.setValueAtTime(0.0001, startAt);
  volume.gain.exponentialRampToValueAtTime(0.38, startAt + 0.015);
  volume.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.23);
  tone.connect(volume);
  volume.connect(context.destination);
  tone.onended = () => { tone.disconnect(); volume.disconnect(); };
  tone.start(startAt);
  tone.stop(startAt + 0.24);
  // Starting the oscillator after user interaction can unlock a suspended
  // context. Resume as well so the scheduled sound is not silently skipped.
  if (context.state !== "running") void context.resume().catch(() => {});
}
