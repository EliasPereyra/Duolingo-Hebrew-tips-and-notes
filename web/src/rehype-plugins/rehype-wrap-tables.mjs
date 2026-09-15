const TABLE_OPEN = /^\s*<table(?=[ >])/i;
const TABLE_CLOSE = /<\/table>\s*$/i;

// Astro's markdown pipeline keeps raw HTML blocks (like the <table> elements
// embedded in the lesson markdown) as one opaque "raw" text node per line,
// interspersed with plain "\n" text nodes, instead of parsed hast elements.
// So instead of matching a <table> element, we splice wrapper raw nodes
// around the raw nodes that open/close a table.
function wrapTables(node) {
  if (!node.children) return;

  const result = [];
  for (const child of node.children) {
    wrapTables(child);

    if (child.type === "element" && child.tagName === "table") {
      result.push({
        type: "element",
        tagName: "div",
        properties: { className: ["table-wrapper"] },
        children: [child],
      });
      continue;
    }

    if (child.type === "raw" && typeof child.value === "string" && TABLE_OPEN.test(child.value)) {
      result.push({ type: "raw", value: '<div class="table-wrapper">' });
      result.push(child);
      if (TABLE_CLOSE.test(child.value)) {
        result.push({ type: "raw", value: "</div>" });
      }
      continue;
    }

    if (child.type === "raw" && typeof child.value === "string" && TABLE_CLOSE.test(child.value)) {
      result.push(child);
      result.push({ type: "raw", value: "</div>" });
      continue;
    }

    result.push(child);
  }
  node.children = result;
}

export default function rehypeWrapTables() {
  return (tree) => {
    wrapTables(tree);
  };
}
