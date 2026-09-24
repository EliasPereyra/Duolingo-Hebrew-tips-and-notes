import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";

import rehypeExamples from "../src/rehype-plugins/rehype-examples.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const CONTENT_DIRS = ["src/content/lessons", "src/content/lessons-es"];
const AUDIO_DIR = join(root, "public", "audio", "he");
const MANIFEST_PATH = join(root, "src", "generated", "tts-manifest.json");
const SENTENCE_BANK_PATH = join(root, "src", "generated", "sentence-bank.json");
const PIPER_BIN = process.env.PIPER_BIN ?? join(root, ".tts-tools", "venv", "bin", "piper");
const VOICE_MODEL = process.env.PIPER_VOICE ?? join(root, ".tts-tools", "voices", "he_IL-saspeech-medium.onnx");

function hashText(text) {
  return createHash("sha1").update(text).digest("hex").slice(0, 12);
}

function collectAudioButtons(tree) {
  const texts = new Set();

  function walk(node) {
    if (node.type === "element" && node.tagName === "button") {
      const text = node.properties?.["data-tts"];
      if (typeof text === "string" && text.trim()) texts.add(text.trim());
    }
    node.children?.forEach(walk);
  }

  walk(tree);
  return texts;
}

async function extractHebrewExamples() {
  const processor = unified().use(remarkParse).use(remarkRehype).use(rehypeExamples);
  const allTexts = new Set();

  for (const dir of CONTENT_DIRS) {
    const dirPath = join(root, dir);
    if (!existsSync(dirPath)) continue;

    for (const filename of readdirSync(dirPath)) {
      if (!filename.endsWith(".md")) continue;
      const filePath = join(dirPath, filename);
      const markdown = readFileSync(filePath, "utf-8");
      const tree = processor.parse(markdown);
      const hastTree = await processor.run(tree, { path: filePath });
      for (const text of collectAudioButtons(hastTree)) {
        allTexts.add(text);
      }
    }
  }

  return allTexts;
}

// Reviewed practice sentences (see generate-sentences.mjs) need audio too; pending and
// rejected ones don't.
function collectApprovedSentences() {
  if (!existsSync(SENTENCE_BANK_PATH)) return [];
  const bank = JSON.parse(readFileSync(SENTENCE_BANK_PATH, "utf-8"));
  return Object.values(bank)
    .flat()
    .filter((sentence) => sentence.status === "approved")
    .map((sentence) => sentence.hebrew);
}

function generateAudio(text, outputPath) {
  const result = spawnSync(PIPER_BIN, ["--model", VOICE_MODEL, "--output_file", outputPath], {
    input: text,
    encoding: "utf-8",
  });

  if (result.status !== 0) {
    throw new Error(`piper failed for "${text}": ${result.stderr}`);
  }
}

async function main() {
  if (!existsSync(PIPER_BIN)) {
    console.error(`piper binary not found at ${PIPER_BIN}. See docs/audio-and-practice.md for setup.`);
    process.exit(1);
  }
  if (!existsSync(VOICE_MODEL)) {
    console.error(`voice model not found at ${VOICE_MODEL}. See docs/audio-and-practice.md for setup.`);
    process.exit(1);
  }

  mkdirSync(AUDIO_DIR, { recursive: true });
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });

  const texts = await extractHebrewExamples();
  for (const text of collectApprovedSentences()) texts.add(text);
  const manifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) : {};

  let generated = 0;
  let skipped = 0;

  for (const text of texts) {
    const id = hashText(text);
    const filename = `${id}.wav`;
    const outputPath = join(AUDIO_DIR, filename);

    if (existsSync(outputPath)) {
      skipped++;
    } else {
      generateAudio(text, outputPath);
      generated++;
      console.log(`generated ${filename}  ${text}`);
    }

    manifest[text] = `/audio/he/${filename}`;
  }

  for (const text of Object.keys(manifest)) {
    if (!texts.has(text)) delete manifest[text];
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");

  console.log(`\nDone. ${generated} generated, ${skipped} already existed, ${texts.size} total examples.`);
  console.log(`Manifest written to ${MANIFEST_PATH}`);
}

main();
