/**
 * The source lessons color some table words with inline `style="color:blue"`
 * or `style="color:green"`. Fixed colors ignore the theme (blue is unreadable
 * on the dark palette), so they are swapped for classes backed by design
 * tokens (.mark-blue / .mark-green, styled in lesson.css).
 */

const INLINE_COLOR = /^\s*color:\s*(blue|green)\s*;?\s*$/i;
const RAW_INLINE_COLOR = /\sstyle="\s*color:\s*(blue|green)\s*;?\s*"/gi;

function walk(node) {
  if (!node.children) return;

  for (const child of node.children) {
    if (child.type === "raw" && typeof child.value === "string") {
      child.value = child.value.replace(RAW_INLINE_COLOR, (_, color) => ` class="mark-${color.toLowerCase()}"`);
      continue;
    }

    if (child.type === "element") {
      const match = typeof child.properties?.style === "string" && child.properties.style.match(INLINE_COLOR);
      if (match) {
        const { style: _style, ...rest } = child.properties;
        child.properties = { ...rest, className: [...(rest.className ?? []), `mark-${match[1].toLowerCase()}`] };
      }
      walk(child);
    }
  }
}

export default function rehypeInlineColors() {
  return (tree) => {
    walk(tree);
  };
}
