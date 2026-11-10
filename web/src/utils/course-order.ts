import { LESSON_ORDER } from "../constants/lesson-order";

const position = new Map(LESSON_ORDER.map((id, index) => [id, index]));

/** Returns a copy of the lessons sorted in course order; unknown ids go last. */
export function sortByCourseOrder<T extends { id: string }>(lessons: T[]): T[] {
  const indexOf = (id: string) => position.get(id) ?? Number.MAX_SAFE_INTEGER;
  return [...lessons].sort((a, b) => indexOf(a.id) - indexOf(b.id));
}
