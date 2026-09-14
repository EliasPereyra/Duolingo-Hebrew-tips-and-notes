export interface LessonIconInfo {
  icon: string;
  color: string;
}

// First matching pattern wins. Ordered roughly grammar-topics first, then vocabulary topics.
const TOPIC_ICONS: Array<[RegExp, string]> = [
  [/^letters/i, "TextSelect"],
  [/^numbers/i, "Hashtag"],
  [/^verbs?:/i, "Bolt"],
  [/^(introduction to )?adjectives/i, "Sparkles"],
  [/^adverbs/i, "Wind"],
  [/^prepositions/i, "ArrowSwapHorizontal"],
  [/^possessives/i, "UserCircle"],
  [/^construct state/i, "Layers2"],
  [/^(negative )?imperative/i, "Command"],
  [/^infinitives/i, "Infinite"],
  [/nif'al/i, "Shuffle"],
  [/^passive/i, "Shield"],
  [/^plurals/i, "Copy"],
  [/^determiners/i, "Filter"],
  [/^diminutives/i, "Sparkle"],
  [/^direct object/i, "Target"],
  [/^modals/i, "Toggle"],
  [/^formal/i, "Suitcase2"],
  [/^comparison/i, "Scale"],
  [/^conjunctions/i, "Link"],
  [/^questions/i, "HelpCircle"],
  [/^the conditional/i, "Repeat"],
  [/^there is\/to have/i, "HelpCircle"],
  [/^verbal nouns/i, "NoteText"],
  [/^discussions/i, "MessageCircle"],
  [/^common phrases/i, "MessageSquare"],
  [/^basics/i, "InfoCircle"],
  [/^animals/i, "Paw"],
  [/^business/i, "Briefcase"],
  [/^clothing/i, "Tshirt"],
  [/^colors/i, "Palette"],
  [/^dates and time/i, "Calendar"],
  [/^education/i, "GraduationCap"],
  [/^emergency/i, "Siren"],
  [/^family/i, "Users"],
  [/^food/i, "ForkKnife"],
  [/^home sweet home/i, "House"],
  [/^jewish festivals/i, "Candle"],
  [/^languages/i, "Globe"],
  [/^medical/i, "HeartPulse"],
  [/^music/i, "MusicNote"],
  [/^nature/i, "Leaf"],
  [/^occupations/i, "Suitcase2"],
  [/^outer space/i, "Rocket"],
  [/^people/i, "Users2"],
  [/^travel/i, "Plane"],
];

const FALLBACK_ICON = "NoteText";

// Distinguishable against the dark sidebar background (#1a1d23).
const COLORS = ["#58a6ff", "#f78166", "#56d364", "#e3b341", "#d2a8ff", "#79c0ff"];

function matchIcon(title: string): string {
  for (const [pattern, icon] of TOPIC_ICONS) {
    if (pattern.test(title)) return icon;
  }
  return FALLBACK_ICON;
}

/**
 * Groups numbered/split lessons of the same topic together, e.g.
 * "Adjectives 1 - Basics", "Adjectives 2", "Adjectives 3" -> "Adjectives"
 * "Verbs: Present - Pa'al", "Verbs: Present - Pi'el" -> "Verbs: Present"
 */
function groupKey(title: string): string {
  return title
    .replace(/\s+-\s+.*$/, "")
    .replace(/\s*\d+$/, "")
    .replace(/!$/, "")
    .trim();
}

export function buildLessonIconMap(
  lessons: Array<{ id: string; data: { title: string } }>,
): Map<string, LessonIconInfo> {
  const counters = new Map<string, number>();
  const result = new Map<string, LessonIconInfo>();

  for (const lesson of lessons) {
    const title = lesson.data.title;
    const key = groupKey(title);
    const count = counters.get(key) ?? 0;
    counters.set(key, count + 1);

    result.set(lesson.id, {
      icon: matchIcon(title),
      color: COLORS[count % COLORS.length],
    });
  }

  return result;
}
