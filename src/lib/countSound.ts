let countAudio: HTMLAudioElement | null = null;

export function playCountSound(): Promise<void> {
  if (typeof Audio === "undefined") return Promise.reject(new Error("Audio playback is unavailable"));
  if (!countAudio) {
    countAudio = new Audio("/sounds/count-beep.wav");
    countAudio.preload = "auto";
  }
  countAudio.muted = false;
  countAudio.volume = 1;
  try { countAudio.currentTime = 0; } catch { /* Playback still works while metadata loads. */ }
  return countAudio.play();
}
