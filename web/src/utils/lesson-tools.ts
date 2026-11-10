import { isSlowAudio, setSlowAudio } from "./audio-player";

const NIQQUD_KEY = "showNiqqud";
// Vowel points and cantillation marks; keeps maqaf (U+05BE) and punctuation.
const NIQQUD = /[֑-ׇֽֿׁׂׅׄ]/g;

// Original text of every Hebrew text node, so niqqud can be restored.
const originals = new WeakMap<Text, string>();

function hebrewTextNodes(): Text[] {
  const nodes: Text[] = [];
  document.querySelectorAll(".lesson-content [lang='he']").forEach((element) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  });
  return nodes;
}

function applyNiqqud(show: boolean) {
  for (const node of hebrewTextNodes()) {
    if (!originals.has(node)) originals.set(node, node.data);
    const original = originals.get(node) ?? node.data;
    node.data = show ? original : original.replace(NIQQUD, "");
  }
}

function readNiqqudPreference(): boolean {
  try {
    return localStorage.getItem(NIQQUD_KEY) !== "hidden";
  } catch {
    return true;
  }
}

function initNiqqudToggle() {
  const toggle = document.getElementById("niqqud-toggle");
  if (!toggle) return;

  const update = (show: boolean) => {
    toggle.setAttribute("aria-pressed", String(show));
    applyNiqqud(show);
  };

  update(readNiqqudPreference());

  toggle.addEventListener("click", () => {
    const show = toggle.getAttribute("aria-pressed") !== "true";
    try {
      localStorage.setItem(NIQQUD_KEY, show ? "shown" : "hidden");
    } catch {
      // storage unavailable - applies to this page only
    }
    update(show);
  });
}

function initSlowAudioToggle() {
  const toggle = document.getElementById("slow-audio-toggle");
  if (!toggle) return;

  // Only offer it when the page actually has something to play.
  toggle.hidden = !document.querySelector(".tts-btn[data-audio], [data-play]");
  toggle.setAttribute("aria-pressed", String(isSlowAudio()));

  toggle.addEventListener("click", () => {
    const slow = toggle.getAttribute("aria-pressed") !== "true";
    setSlowAudio(slow);
    toggle.setAttribute("aria-pressed", String(slow));
  });
}

// Wide tables scroll sideways on small screens; fade the edge that hides content.
function initTableOverflow() {
  const update = (wrapper: HTMLElement) => {
    const overflow = wrapper.scrollWidth - wrapper.clientWidth;
    wrapper.classList.toggle("has-overflow", overflow > 1);
    wrapper.classList.toggle("at-end", wrapper.scrollLeft >= overflow - 1);
  };

  const observer = new ResizeObserver((entries) => entries.forEach((entry) => update(entry.target as HTMLElement)));
  document.querySelectorAll<HTMLElement>(".lesson-content .table-wrapper").forEach((wrapper) => {
    update(wrapper);
    wrapper.addEventListener("scroll", () => update(wrapper), { passive: true });
    observer.observe(wrapper);
  });
  document.addEventListener("astro:before-swap", () => observer.disconnect(), { once: true });
}

export function initLessonTools() {
  initNiqqudToggle();
  initSlowAudioToggle();
  initTableOverflow();
}
