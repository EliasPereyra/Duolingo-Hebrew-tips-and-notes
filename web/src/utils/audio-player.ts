let currentAudio: HTMLAudioElement | null = null;

function playAudioFile(src: string) {
  currentAudio?.pause();
  currentAudio = new Audio(src);
  currentAudio.play();
}

export function initAudioPlayback() {
  document.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>(".tts-btn");
    if (!button || button.disabled) return;

    const audioSrc = button.dataset.audio;
    if (audioSrc) playAudioFile(audioSrc);
  });
}
