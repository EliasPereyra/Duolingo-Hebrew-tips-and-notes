import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CUE_PATTERN = /^(for )?examples?:?$/i;
const HEBREW_RANGE = /[֐-׿]/g;
/**
 * Matches a maximal run of non-Hebrew content (may include interior spaces, e.g. an
 * English gloss like " - fish they (are) tasty) "), but only when it contains at least
 * one non-space character, so a lone space between two Hebrew words is left alone.
 */
const NON_HEBREW_RUN = /[^֐-׿]*[^֐-׿\s][^֐-׿]*/g;

const __dirname = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(__dirname, "..", "generated", "tts-manifest.json");
const audioManifest = existsSync(MANIFEST_PATH) ? JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) : {};

function getText(node) {
  if (node.type === "text") return node.value;
  if (!node.children) return "";
  
  return node.children.map(getText).join("");
}

// Like getText, but marks <br> line breaks so extractHebrew can turn them into a spoken pause
// instead of silently gluing two distinct example sentences together.
function getSpokenText(node) {
  if (node.type === "text") return node.value;
  if (node.type === "element" && node.tagName === "br") return "\n";
  if (!node.children) return "";

  return node.children.map(getSpokenText).join("");
}

function extractHebrew(text) {
  return text
    .replace(/\n/g, " . ")
    .replace(NON_HEBREW_RUN, ". ")
    .replace(/\s+/g, " ")
    .replace(/^\.\s*/, "")
    .replace(/\.\s*$/, "")
    .trim();
}

function markAsExample(node, isSpanish) {
  const className = node.properties?.className ?? [];
  node.properties = { ...node.properties, className: [...className, "example"] };

  const hebrewText = extractHebrew(getSpokenText(node));
  if (!hebrewText) return;

  const audioSrc = audioManifest[hebrewText];
  const unavailableLabel = isSpanish ? "Pronunciación no disponible" : "Pronunciation not available";

  node.children = [
    {
      type: "element",
      tagName: "button",
      properties: {
        type: "button",
        className: ["tts-btn"],
        "data-tts": hebrewText,
        ...(audioSrc
          ? { "data-audio": audioSrc, "aria-label": isSpanish ? "Reproducir pronunciación" : "Play pronunciation" }
          : { disabled: true, title: unavailableLabel, "aria-label": unavailableLabel }),
      },
      children: [],
    },
    ...node.children,
  ];
}

function isHeavyHebrew(text) {
  const nonSpace = text.replace(/\s/g, "");
  if (nonSpace.length === 0) return false;
  const hebrewCount = (text.match(HEBREW_RANGE) ?? []).length;
  return hebrewCount / nonSpace.length > 0.3;
}

function walk(node, isSpanish) {
  if (!node.children) return;

  let previousWasCue = false;
  for (const child of node.children) {
    if (child.type === "text" && child.value.trim() === "") {
      continue;
    }
    if (child.type === "element" && child.tagName === "p") {
      const text = getText(child).trim();
      if (previousWasCue) {
        markAsExample(child, isSpanish);
      } else if (isHeavyHebrew(text)) {
        markAsExample(child, isSpanish);
      }
      previousWasCue = CUE_PATTERN.test(text);
    } else {
      previousWasCue = false;
    }
    walk(child, isSpanish);
  }
}

export default function rehypeExamples() {
  return (tree, file) => {
    const path = file?.path ?? file?.history?.[0] ?? "";
    const isSpanish = /lessons-es[\\/]/.test(path);
    walk(tree, isSpanish);
  };
}
