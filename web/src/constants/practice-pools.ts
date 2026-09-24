// Most lessons have too few Hebrew examples to sustain exercises on their own, so they
// share material with related lessons. Lesson lists hold lesson slugs.

export interface LessonPool {
  id: string;
  members: string[];
}

/** These lessons have no content at all, they never get a practice section. */
export const EXCLUDED_LESSONS = ["emergency", "jewish-festivals"];

/** Group A: thematic/vocabulary lessons */
export const GROUP_A: LessonPool = {
  id: "group-a",
  members: [
    "nature",
    "home-sweet-home",
    "family",
    "education",
    "discussions-and-decisions",
    "languages",
    "business",
    "music",
    "people",
    "animals",
    "occupations",
    "colors",
    "food-1",
    "medical",
    "outer-space",
  ],
};

/**
 * Group B: grammar lessons that pool with the rest of their grammar family, and borrow
 * vocabulary from Group A
 */
export const STRUCTURAL_POOLS: LessonPool[] = [
  {
    id: "adjectives",
    members: ["adjectives-1-basics", "adjectives-2", "adjectives-3", "introduction-to-adjectives"],
  },
  { id: "infinitives", members: ["infinitives-1", "infinitives-2"] },
  { id: "imperatives", members: ["imperative-1", "imperative-2", "negative-imperatives"] },
  { id: "construct-state", members: ["construct-state-1", "construct-state-2"] },
];

/**
 * Group B lessons with no grammar family. They are not paired with each other; they only
 * borrow vocabulary from Group A (used for distractors, never as questions).
 */
export const STANDALONE_LESSONS = ["adverbs", "comparison", "modals", "verbal-nouns"];

export function resolvePool(slug: string): { pool: LessonPool; borrowsFrom: LessonPool | null } {
  if (GROUP_A.members.includes(slug)) return { pool: GROUP_A, borrowsFrom: null };

  const family = STRUCTURAL_POOLS.find((pool) => pool.members.includes(slug));
  if (family) return { pool: family, borrowsFrom: GROUP_A };

  const ownPool = { id: slug, members: [slug] };
  if (STANDALONE_LESSONS.includes(slug)) return { pool: ownPool, borrowsFrom: GROUP_A };

  return { pool: ownPool, borrowsFrom: null };
}
