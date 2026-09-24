// Build-time only: derives the practice exercise data for every lesson from the same Hebrew
// examples (and audio) that rehype-examples already extracts for the pronunciation buttons.
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeExamples from "../rehype-plugins/rehype-examples.mjs";
import ttsManifest from "../generated/tts-manifest.json";
import sentenceBank from "../generated/sentence-bank.json";
import { EXCLUDED_LESSONS, resolvePool } from "../constants/practice-pools";

const MIN_QUESTIONS = 2;
const MIN_DISTRACTOR_PHRASES = 5;
const NIQQUD = /[\u0591-\u05C7]/g;
const INCORRECT_EXAMPLES = new Set([
  "אל עשה את זה",
  "הכלב שלי החדש",
  "זה מומלץ לא לעשות את זה",
  "אני רוצה שאני אתן לך את זה",
  "הסוס שלי. שלי הסוס",
  "אמא שלי חכמה. האמא שלי חכמה",
  "הדבר החשוב ביותר למשקיעים הנו הצוות",
  "עסקאות אלו הינן אטרקטיביות במיוחד",
]);

const audioManifest: Record<string, string> = ttsManifest;

type Locale = "en" | "es";

interface BankSentence {
  hebrew: string;
  translit: string;
  gloss: Record<Locale, string>;
  status: "pending" | "approved" | "rejected";
}

const bank = sentenceBank as Record<string, BankSentence[]>;

export interface PracticePhrase {
  hebrew: string;
  audio: string;
  translit?: string;
  gloss?: string;
}

export interface PracticeData {
  lessonPhrases: PracticePhrase[];
  poolPhrases: PracticePhrase[];
  /** Candidate wrong answers for listening exercises. */
  distractorPhrases: string[];
  /** Candidate wrong answers for cloze exercises. */
  distractorWords: string[];
}

interface LessonEntry {
  id: string;
  body?: string;
  filePath?: string;
}

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeExamples);

function normalize(text: string) {
  return text.replace(NIQQUD, "");
}

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function isUsablePhrase(hebrew: string) {
  return hebrew.split(/[\s.]+/).every((word) => normalize(word).length >= 2);
}

async function extractPhrases(lesson: LessonEntry) {
  const tree = (await processor.run(processor.parse(lesson.body ?? ""), {
    path: lesson.filePath,
  })) as HastNode;
  const phrases: PracticePhrase[] = [];

  function walk(node: HastNode) {
    const hebrew = node.properties?.["data-tts"];
    if (node.tagName === "button" && typeof hebrew === "string") {
      const audio = audioManifest[hebrew];
      if (audio && isUsablePhrase(hebrew) && !INCORRECT_EXAMPLES.has(hebrew)) phrases.push({ hebrew, audio });
    }
    node.children?.forEach(walk);
  }

  walk(tree);
  return uniqueBy(phrases, (phrase) => normalize(phrase.hebrew));
}

function bankPhrases(poolId: string, locale: Locale): PracticePhrase[] {
  return (bank[poolId] ?? []).flatMap((sentence) => {
    const audio = audioManifest[sentence.hebrew];
    if (sentence.status !== "approved" || !audio) return [];
    return [{ hebrew: sentence.hebrew, audio, translit: sentence.translit, gloss: sentence.gloss[locale] }];
  });
}

function toWords(phrases: string[]) {
  return uniqueBy(
    phrases.flatMap((phrase) => phrase.split(/[\s.]+/)).filter((word) => normalize(word).length >= 2),
    normalize,
  );
}

/** Builds the practice data for every lesson of a collection, keyed by lesson slug. */
export async function buildPracticeIndex(lessons: LessonEntry[], locale: Locale) {
  const phrasesBySlug = new Map<string, PracticePhrase[]>();
  for (const lesson of lessons) {
    phrasesBySlug.set(lesson.id, await extractPhrases(lesson));
  }

  const phrasesOf = (slugs: string[]) => slugs.flatMap((slug) => phrasesBySlug.get(slug) ?? []);
  const allPhrases = phrasesOf([...phrasesBySlug.keys()]).map((phrase) => phrase.hebrew);
  const index = new Map<string, PracticeData>();

  for (const lesson of lessons) {
    if (EXCLUDED_LESSONS.includes(lesson.id)) continue;

    const { pool, borrowsFrom } = resolvePool(lesson.id);
    const lessonPhrases = phrasesBySlug.get(lesson.id) ?? [];
    const lessonKeys = new Set(lessonPhrases.map((phrase) => normalize(phrase.hebrew)));
    const poolPhrases = uniqueBy(
      [...bankPhrases(pool.id, locale), ...phrasesOf(pool.members.filter((slug) => slug !== lesson.id))],
      (phrase) => normalize(phrase.hebrew),
    ).filter((phrase) => !lessonKeys.has(normalize(phrase.hebrew)));
    const borrowedPhrases = borrowsFrom
      ? [...bankPhrases(borrowsFrom.id, locale), ...phrasesOf(borrowsFrom.members)].map((phrase) => phrase.hebrew)
      : [];

    if (lessonPhrases.length + poolPhrases.length < MIN_QUESTIONS) continue;

    const ownPhrases = [...lessonPhrases, ...poolPhrases].map((phrase) => phrase.hebrew);
    let distractorPhrases = uniqueBy([...ownPhrases, ...borrowedPhrases], normalize);
    if (distractorPhrases.length < MIN_DISTRACTOR_PHRASES) {
      distractorPhrases = uniqueBy([...distractorPhrases, ...allPhrases], normalize);
    }

    index.set(lesson.id, {
      lessonPhrases,
      poolPhrases,
      distractorPhrases,
      distractorWords: toWords(distractorPhrases),
    });
  }

  return index;
}
