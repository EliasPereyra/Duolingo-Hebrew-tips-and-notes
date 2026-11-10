const RATE_KEY = "audioRate";
const SLOW_RATE = 0.75;

let currentAudio: HTMLAudioElement | null = null;
let currentButton: HTMLButtonElement | null = null;

export function isSlowAudio(): boolean {
  try {
    return localStorage.getItem(RATE_KEY) === "slow";
  } catch {
    return false;
  }
}

export function setSlowAudio(slow: boolean) {
  try {
    localStorage.setItem(RATE_KEY, slow ? "slow" : "normal");
  } catch {
    // storage unavailable - the choice lasts for this page only
  }
  if (currentAudio) currentAudio.playbackRate = slow ? SLOW_RATE : 1;
}

function setPlaying(button: HTMLButtonElement | null, playing: boolean) {
  button?.classList.toggle("is-playing", playing);
}

/** Plays one file at a time; the optional button shows a "playing" state meanwhile. */
export function playAudioFile(src: string, button: HTMLButtonElement | null = null) {
  currentAudio?.pause();
  setPlaying(currentButton, false);

  const audio = new Audio(src);
  audio.playbackRate = isSlowAudio() ? SLOW_RATE : 1;
  currentAudio = audio;
  currentButton = button;
  setPlaying(button, true);

  const stop = () => setPlaying(button, false);
  audio.addEventListener("ended", stop);
  audio.addEventListener("pause", stop);
  audio.addEventListener("error", stop);
  audio.play().catch(stop);
}

export function initAudioPlayback() {
  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".tts-btn");
    if (!button || button.disabled) return;

    const audioSrc = button.dataset.audio;
    if (audioSrc) playAudioFile(audioSrc, button);
  });
}
