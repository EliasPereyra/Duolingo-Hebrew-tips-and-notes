/**
 * Wraps every run of Hebrew text in `<span lang="he">` so it can be styled
 * (font, size, color) independently from the surrounding English/Spanish text
 * and so screen readers switch to Hebrew pronunciation.
 *
 * A run is a sequence of Hebrew words, including the spaces and punctuation
 * between them, e.g. "דגים הם טעימים" becomes a single span.
 *
 * Note: no `dir` attribute is added on purpose. `dir` makes the element a
 * bidi isolate, which would reorder words that markdown splits across
 * elements (e.g. `**ה**כלב` -> <strong>ה</strong>כלב). Hebrew letters are
 * strongly RTL anyway, so the bidi algorithm already orders them correctly.
 */

const HEBREW_CHARS = "\u0590-\u05FF\uFB1D-\uFB4F";
const HEBREW_RUN = new RegExp(`[${HEBREW_CHARS}]+(?:[\\s'"׳״־,.?!-]+[${HEBREW_CHARS}]+)*`, "g");
const HAS_HEBREW = new RegExp(`[${HEBREW_CHARS}]`);
const HEBREW_ONLY_CELL = /<(td|th)([^>]*)>(\s*<span lang="he">[^<]*<\/span>\s*)<\/\1>/g;

const SKIP_TAGS = new Set(["button", "code", "pre", "script", "style", "title"]);

function splitText(value) {
  const nodes = [];
  let lastIndex = 0;

  for (const match of value.matchAll(HEBREW_RUN)) {
    if (match.index > lastIndex) {
      nodes.push({ type: "text", value: value.slice(lastIndex, match.index) });
    }
    nodes.push({
      type: "element",
      tagName: "span",
      properties: { lang: "he" },
      children: [{ type: "text", value: match[0] }],
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    nodes.push({ type: "text", value: value.slice(lastIndex) });
  }
  return nodes;
}

// Raw HTML (the lesson tables) arrives as opaque strings, so only the text
// between tags is rewritten, leaving tags and attributes untouched.
// The string is padded with ">" and "<" so text at its very start or end
// (a raw line can begin or end mid-cell) is matched too.
function wrapRawHtml(html) {
  const padded = `>${html}<`.replace(/>([^<]+)</g, (whole, text) => {
    if (!HAS_HEBREW.test(text)) return whole;
    return `>${text.replace(HEBREW_RUN, '<span lang="he">$&</span>')}<`;
  });
  // Cells holding only Hebrew get a class so they can be right-aligned.
  return padded.slice(1, -1).replace(HEBREW_ONLY_CELL, (_, tag, attrs, content) => {
    const withClass = /\sclass="/.test(attrs)
      ? attrs.replace(/\sclass="([^"]*)"/, ' class="$1 he-cell"')
      : `${attrs} class="he-cell"`;
    return `<${tag}${withClass}>${content}</${tag}>`;
  });
}

function isHebrewOnlyCell(node) {
  if (node.tagName !== "td" && node.tagName !== "th") return false;
  const content = node.children.filter((c) => !(c.type === "text" && c.value.trim() === ""));
  return content.length === 1 && content[0].type === "element" && content[0].properties?.lang === "he";
}

function walk(node) {
  if (!node.children) return;

  const result = [];
  for (const child of node.children) {
    if (child.type === "text" && HAS_HEBREW.test(child.value)) {
      result.push(...splitText(child.value));
      continue;
    }

    if (child.type === "raw" && HAS_HEBREW.test(child.value)) {
      result.push({ ...child, value: wrapRawHtml(child.value) });
      continue;
    }

    if (child.type === "element" && !SKIP_TAGS.has(child.tagName) && child.properties?.lang !== "he") {
      walk(child);
      if (isHebrewOnlyCell(child)) {
        child.properties = { ...child.properties, className: [...(child.properties.className ?? []), "he-cell"] };
      }
    }
    result.push(child);
  }
  node.children = wrapTransliterations(result);
}

/*
 * Transliterations: a short parenthetical right after Hebrew, e.g.
 * "הכלב הגדול (hakélev hagadól)" or "(**ha**kélev)" with bold inside.
 * Only letters, apostrophes, hyphens and spaces, at most 4 words, so glosses
 * like "(eight, masculine)" or "(literally - ...)" are left alone.
 */
const TRANSLIT = /^\([\p{L}\p{M}'’ʼ\-\s.]{2,}\)$/u;
const MAX_TRANSLIT_WORDS = 4;

function textOf(node) {
  if (node.type === "text") return node.value;
  return (node.children ?? []).map(textOf).join("");
}

const endsWithHebrew = (node) => new RegExp(`[${HEBREW_CHARS}]$`).test(textOf(node).trimEnd());

// Grammatical glosses that look like a transliteration but aren't one.
// Spanish glosses are accented too, so the common ones in the lessons are listed.
const GLOSS_WORDS = new RegExp(
  "(^|[\\s(])(" +
    "masculine|feminine|plural|singular|formal|informal|literally|male|female|m|f|pl|" +
    "masculino|femenino|literalmente|él|ella|tú|yo|de|final|principio|sílaba|país|pájaro|mío|mía" +
    ")(?=[\\s)]|$)",
  "i",
);

// The course marks stress with accents and splits syllables with apostrophes
// (itón, pa'al, be-yá'ar). Requiring one of them keeps English glosses such
// as "(dog)" from being styled as pronunciation; a few unaccented
// transliterations are missed, which is the safer error.
const TRANSLIT_MARK = /[áéíóúàèìòùâêîôû'’ʼ]/i;

function isTransliteration(text) {
  return (
    TRANSLIT.test(text) &&
    TRANSLIT_MARK.test(text) &&
    !HAS_HEBREW.test(text) &&
    !GLOSS_WORDS.test(text) &&
    text.trim().split(/\s+/).length <= MAX_TRANSLIT_WORDS
  );
}

function wrapTransliterations(children) {
  const out = [];
  for (let i = 0; i < children.length; i++) {
    const node = children[i];
    const previous = out[out.length - 1];
    const open = node.type === "text" ? node.value.match(/^(\s*)\(/) : null;

    if (!open || !previous || !endsWithHebrew(previous)) {
      out.push(node);
      continue;
    }

    // Find the sibling that holds the closing parenthesis.
    let end = -1;
    for (let j = i; j < children.length; j++) {
      const candidate = children[j];
      if (candidate.type === "text" && candidate.value.indexOf(")", j === i ? open[0].length : 0) !== -1) {
        end = j;
        break;
      }
      if (candidate.type !== "text" && candidate.type !== "element") break;
    }
    if (end === -1) {
      out.push(node);
      continue;
    }

    const first = node.value.slice(open[1].length);
    const closeIndex = children[end].value.indexOf(")", end === i ? open[0].length : 0);
    const inner =
      end === i
        ? [{ type: "text", value: first.slice(0, closeIndex - open[1].length + 1) }]
        : [
            { type: "text", value: first },
            ...children.slice(i + 1, end),
            { type: "text", value: children[end].value.slice(0, closeIndex + 1) },
          ];

    if (!isTransliteration(inner.map(textOf).join(""))) {
      out.push(node);
      continue;
    }

    const rest = children[end].value.slice(closeIndex + 1);
    if (open[1]) out.push({ type: "text", value: open[1] });
    out.push({ type: "element", tagName: "span", properties: { className: ["translit"] }, children: inner });
    if (rest) out.push({ type: "text", value: rest });
    i = end;
  }
  return out;
}

export default function rehypeHebrew() {
  return (tree) => {
    walk(tree);
  };
}
