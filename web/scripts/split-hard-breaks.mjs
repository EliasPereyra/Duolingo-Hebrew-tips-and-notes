import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const CONTENT_DIRS = ["src/content/lessons", "src/content/lessons-es"];

const HARD_BREAK = /[ \t]{2,}$/;

function splitFile(filePath) {
  const original = readFileSync(filePath, "utf-8");
  const lines = original.split("\n");
  const out = [];
  let inTable = false;
  let changed = 0;

  for (const line of lines) {
    if (/^\s*<table>/i.test(line)) inTable = true;
    if (/^\s*<\/table>/i.test(line)) inTable = false;

    if (!inTable && HARD_BREAK.test(line)) {
      out.push(line.replace(HARD_BREAK, ""));
      out.push("");
      changed++;
    } else {
      out.push(line);
    }
  }

  if (changed > 0) {
    writeFileSync(filePath, out.join("\n"));
  }
  return changed;
}

let totalFiles = 0;
let totalBreaks = 0;

for (const dir of CONTENT_DIRS) {
  const dirPath = join(root, dir);
  for (const filename of readdirSync(dirPath)) {
    if (!filename.endsWith(".md")) continue;

    const filePath = join(dirPath, filename);
    const changed = splitFile(filePath);
    
    if (changed > 0) {
      console.log(`${dir}/${filename}: ${changed} hard break(s) split`);
      totalFiles++;
      totalBreaks += changed;
    }
  }
}

console.log(`\nDone. ${totalBreaks} hard breaks split across ${totalFiles} files.`);
