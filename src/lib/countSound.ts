let countAudio: HTMLAudioElement | null = null;

export function playCountSound(): Promise<void> {
  if (typeof Audio === "undefined") return Promise.reject(new Error("Audio playback is unavailable"));
  // iOS Safari can treat short sounds as ambient audio and silence them when
  // the phone is in Silent Mode. Playback is supported from Safari 16.4 onward.
  const audioSession = typeof navigator === "undefined" ? undefined
    : (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (audioSession) {
    try { audioSession.type = "playback"; } catch { /* Older browsers still use the audio element. */ }
  }
  if (!countAudio) {
    countAudio = new Audio("/sounds/count-beep.wav");
    countAudio.preload = "auto";
  }
  countAudio.muted = false;
  countAudio.volume = 1;
  try { countAudio.currentTime = 0; } catch { /* Playback still works while metadata loads. */ }
  return countAudio.play();
}
