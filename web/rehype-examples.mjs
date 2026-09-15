const CUE_PATTERN = /^(for )?examples?:?$/i;
const HEBREW_RANGE = /[֐-׿]/g;

function getText(node) {
  if (node.type === "text") return node.value;
  if (!node.children) return "";
  return node.children.map(getText).join("");
}

function markAsExample(node) {
  const className = node.properties?.className ?? [];
  node.properties = { ...node.properties, className: [...className, "example"] };
}

function isHeavyHebrew(text) {
  const nonSpace = text.replace(/\s/g, "");
  if (nonSpace.length === 0) return false;
  const hebrewCount = (text.match(HEBREW_RANGE) ?? []).length;
  return hebrewCount / nonSpace.length > 0.3;
}

function walk(node) {
  if (!node.children) return;

  let previousWasCue = false;
  for (const child of node.children) {
    if (child.type === "text" && child.value.trim() === "") {
      continue;
    }
    if (child.type === "element" && child.tagName === "p") {
      const text = getText(child).trim();
      if (previousWasCue) {
        markAsExample(child);
      } else if (isHeavyHebrew(text)) {
        markAsExample(child);
      }
      previousWasCue = CUE_PATTERN.test(text);
    } else {
      previousWasCue = false;
    }
    walk(child);
  }
}

export default function rehypeExamples() {
  return (tree) => {
    walk(tree);
  };
}
