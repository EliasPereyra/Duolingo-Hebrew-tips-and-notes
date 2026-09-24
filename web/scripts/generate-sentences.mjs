/** 
 * Offline generator for the practice sentence bank.
* Usage:
*   pnpm sentences:generate                      top up every pool to --count sentences
*   pnpm sentences:generate --pool group-a,modals only these pools
*   pnpm sentences:generate --count 10           target of non-rejected sentences per pool
*   pnpm sentences:generate --status             print the review status and exit
**/
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";

import { EXCLUDED_LESSONS, resolvePool } from "../src/constants/practice-pools.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const LESSONS_DIR = join(root, "src", "content", "lessons");
const BANK_PATH = join(root, "src", "generated", "sentence-bank.json");
const MODEL = "claude-opus-5";
const DEFAULT_COUNT = 6;
const CONCURRENCY = 4;
const NIQQUD = /[\u0591-\u05C7]/g;
const HEBREW_SENTENCE = /^[\u05D0-\u05EA\u05F3\u05F4'"\s,?-]+$/;

const SYSTEM_PROMPT = `You write practice sentences for a free website that preserves the Tips & Notes of Duolingo's Hebrew course. Learners hear each sentence through text-to-speech, then pick it among similar options or fill in a missing word. A native speaker reviews every sentence before it is published, but learners trust what they see, so each one must be correct and natural.

Rules:
- Use only vocabulary that appears in the lesson material you are given, plus very common function words (pronouns, prepositions, את, של, ה-, ו-, ש-, יש, אין, זה, לא). If the material doesn't have enough words for natural sentences, return fewer sentences instead of inventing vocabulary.
- Get agreement right: gender and number between nouns, adjectives, verbs and numbers; the definite article on both a noun and its adjective; construct-state forms; שני/שתי (not שניים/שתיים) before a noun; את before a definite direct object.
- When the material teaches a grammatical structure, every sentence should practice that structure. When it is thematic vocabulary, combine words across the lessons.
- One sentence of 3 to 8 words. Hebrew letters only: no niqqud, no Latin characters, no final period (a question mark is fine). Use the spelling the lessons use.
- translit: lowercase, in the lessons' style, with an acute accent on the stressed syllable, e.g. "shlosha khatulím shkhorím yeshením".
- gloss_en and gloss_es: natural English and Spanish translations.
- source_words: the lesson words the sentence practices, spelled as in the material.
- source_lessons: slugs of the lessons those words come from.
- Don't repeat or lightly rephrase any sentence listed under existing_sentences, and keep your sentences varied.`;

const ResponseSchema = z.object({
  sentences: z.array(
    z.object({
      hebrew: z.string(),
      translit: z.string(),
      gloss_en: z.string(),
      gloss_es: z.string(),
      source_words: z.array(z.string()),
      source_lessons: z.array(z.string()),
    }),
  ),
});

function normalize(text) {
  return text.replace(NIQQUD, "").replace(/\s+/g, " ").trim();
}

function hashText(text) {
  return createHash("sha1").update(text).digest("hex").slice(0, 12);
}

function readBank() {
  return JSON.parse(readFileSync(BANK_PATH, "utf-8"));
}

function writeBank(bank) {
  const sorted = Object.fromEntries(Object.entries(bank).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BANK_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

function readLesson(slug) {
  return readFileSync(join(LESSONS_DIR, `${slug}.md`), "utf-8");
}

function collectPools(slugs) {
  const pools = new Map();
  for (const slug of slugs) {
    if (EXCLUDED_LESSONS.includes(slug)) continue;
    const { pool, borrowsFrom } = resolvePool(slug);
    pools.set(pool.id, { ...pool, borrowsFrom });
  }
  return pools;
}

function lessonBlocks(slugs, available) {
  return slugs
    .filter((slug) => available.has(slug))
    .map((slug) => `<lesson slug="${slug}">\n${readLesson(slug)}\n</lesson>`)
    .join("\n\n");
}

function buildPrompt(pool, count, existing, available) {
  const parts = [`Write ${count} new practice sentences for these lessons.`, lessonBlocks(pool.members, available)];

  if (pool.borrowsFrom) {
    parts.push(
      `<vocabulary_source>\nThematic lessons you may borrow nouns and adjectives from, only to build sentences that practice the lessons above.\n\n${lessonBlocks(pool.borrowsFrom.members, available)}\n</vocabulary_source>`,
    );
  }
  if (existing.length > 0) {
    parts.push(`<existing_sentences>\n${existing.map((sentence) => sentence.hebrew).join("\n")}\n</existing_sentences>`);
  }

  return parts.join("\n\n");
}

async function generateForPool(client, pool, count, existing, available) {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: "high", format: betaZodOutputFormat(ResponseSchema) },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(pool, count, existing, available) }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(`request declined (${response.stop_details?.category ?? "no category"})`);
  }
  if (!response.parsed_output) {
    throw new Error(`no parseable output (stop_reason: ${response.stop_reason})`);
  }

  const seen = new Set(existing.map((sentence) => normalize(sentence.hebrew)));
  const knownLessons = new Set([...pool.members, ...(pool.borrowsFrom?.members ?? [])]);
  const accepted = [];

  for (const sentence of response.parsed_output.sentences) {
    const hebrew = normalize(sentence.hebrew);
    const wordCount = hebrew.split(" ").length;
    if (!HEBREW_SENTENCE.test(hebrew) || wordCount < 2 || wordCount > 10 || seen.has(hebrew)) {
      console.warn(`  [${pool.id}] dropped: ${sentence.hebrew}`);
      continue;
    }
    seen.add(hebrew);
    accepted.push({
      id: hashText(hebrew),
      hebrew,
      translit: sentence.translit,
      gloss: { en: sentence.gloss_en, es: sentence.gloss_es },
      sourceWords: sentence.source_words,
      sourceLessons: sentence.source_lessons.filter((slug) => knownLessons.has(slug)),
      status: "pending",
      model: response.model,
    });
  }

  return accepted.slice(0, count);
}

function printStatus(bank, poolIds) {
  const totals = { pending: 0, approved: 0, rejected: 0 };
  for (const id of poolIds) {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    for (const sentence of bank[id] ?? []) counts[sentence.status]++;
    for (const key of Object.keys(totals)) totals[key] += counts[key];
    console.log(`${id.padEnd(36)} ${counts.approved} approved, ${counts.pending} pending, ${counts.rejected} rejected`);
  }
  console.log(`\nTotal: ${totals.approved} approved, ${totals.pending} pending, ${totals.rejected} rejected`);
}

async function main() {
  const { values } = parseArgs({
    options: {
      pool: { type: "string" },
      count: { type: "string", default: String(DEFAULT_COUNT) },
      status: { type: "boolean", default: false },
    },
  });

  const slugs = readdirSync(LESSONS_DIR)
    .filter((filename) => filename.endsWith(".md"))
    .map((filename) => filename.replace(/\.md$/, ""));
  const available = new Set(slugs);
  const pools = collectPools(slugs);
  const bank = readBank();

  if (values.status) {
    printStatus(bank, [...pools.keys()].sort());
    return;
  }

  const count = Number(values.count);
  if (!Number.isInteger(count) || count < 1) {
    console.error(`--count must be a positive integer, got "${values.count}"`);
    process.exit(1);
  }

  const requested = values.pool ? values.pool.split(",").map((id) => id.trim()) : [...pools.keys()];
  const unknown = requested.filter((id) => !pools.has(id));
  if (unknown.length > 0) {
    console.error(`Unknown pool(s): ${unknown.join(", ")}. Known pools: ${[...pools.keys()].sort().join(", ")}`);
    process.exit(1);
  }

  const jobs = requested
    .map((id) => {
      const existing = bank[id] ?? [];
      const missing = count - existing.filter((sentence) => sentence.status !== "rejected").length;
      return { pool: pools.get(id), existing, missing };
    })
    .filter((job) => job.missing > 0);

  if (jobs.length === 0) {
    console.log(`Every requested pool already has ${count} non-rejected sentences.`);
    return;
  }

  const client = new Anthropic();
  let generated = 0;
  let failed = 0;

  async function worker() {
    for (let job = jobs.shift(); job; job = jobs.shift()) {
      try {
        const sentences = await generateForPool(client, job.pool, job.missing, job.existing, available);
        const latest = readBank();
        latest[job.pool.id] = [...(latest[job.pool.id] ?? []), ...sentences];
        writeBank(latest);
        generated += sentences.length;
        console.log(`[${job.pool.id}] +${sentences.length} pending`);
      } catch (error) {
        failed++;
        const message = error instanceof Anthropic.APIError ? `${error.status} ${error.message}` : error.message;
        console.error(`[${job.pool.id}] failed: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  console.log(`\nDone. ${generated} new sentences to review in ${BANK_PATH}${failed ? `, ${failed} pool(s) failed` : ""}.`);
  if (failed) process.exitCode = 1;
}

main();
