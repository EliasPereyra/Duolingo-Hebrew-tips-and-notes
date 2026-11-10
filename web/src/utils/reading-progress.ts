// Lessons the reader has opened, kept in this browser only.
const STORAGE_KEY = "lessonsRead";

function readSet(): Set<string> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return new Set(Array.isArray(stored) ? stored : []);
  } catch {
    return new Set();
  }
}

/** Adds `is-read` to every element with a `data-lesson-id` the reader has opened. */
export function markReadLessons() {
  const read = readSet();
  document.querySelectorAll<HTMLElement>("[data-lesson-id]").forEach((element) => {
    element.classList.toggle("is-read", read.has(element.dataset.lessonId ?? ""));
  });
}

export function recordLessonRead(id: string) {
  if (!id) return;
  const read = readSet();
  if (!read.has(id)) {
    read.add(id);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...read]));
    } catch {
      // storage unavailable - progress just isn't remembered
    }
  }
  markReadLessons();
}
