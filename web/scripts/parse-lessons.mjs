import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Use the lessons.ts slugs for clean URLs
const slugMap = {
  "Letters-1": "letters-1",
  "Letters-2": "letters-2",
  "Letters-3": "letters-3",
  "Common-Phrases": "common-phrases",
  "Basics": "basics",
  "There-is": "there-is-to-have",
  "Introduction-to-adjectives": "introduction-to-adjectives",
  "Food-1": "food-1",
  "Animals": "animals",
  "Plurals": "plurals",
  "Possessives-1": "possessives-1",
  "Adjectives1-basics": "adjectives-1-basics",
  "Direct-object": "direct-object",
  "Clothing": "clothing",
  "VerbsPresent1": "verbs-present-pa-al",
  "Colors": "colors",
  "Prepositions-1": "prepositions-1",
  "Numbers-1": "numbers-1",
  "Questions": "questions",
  "Determiners": "determiners",
  "Occupations": "occupations",
  "Conjunctions": "conjunctions",
  "Prepositions-2": "prepositions-2",
  "Possessives-2": "possessives-2",
  "VerbsPresent2": "verbs-present-pi-el",
  "Dates-and-Time": "dates-and-time",
  "Adjectives-2": "adjectives-2",
  "Adverbs": "adverbs",
  "Family": "family",
  "Home": "home-sweet-home",
  "Construct-state-1": "construct-state-1",
  "VerbsInfinitive": "infinitives-1",
  "VerbsPresent3": "verbs-present-hiph-il",
  "People": "people",
  "Numbers-2": "numbers-2",
  "Modal": "modals",
  "Education": "education",
  "Travel": "travel",
  "VerbsPastActive": "verbs-past-active-1",
  "Comparison": "comparison",
  "VerbsPresentReflexiveHitpael": "verbs-present-reflexive-hitpa-el",
  "Adjectives-3": "adjectives-3",
  "Imperative-1": "imperative-1",
  "Languages": "languages",
  "Emergency!": "emergency",
  "VerbsFutureActive": "verbs-future-active-1",
  "PassivePaulPualHufal": "passive-pa-ul-pu-al-and-huf-al",
  "Nifal-Construction": "nif-al-construction",
  "Nature": "nature",
  "Discussions-and-decisions": "discussions-and-decisions",
  "Imperative-2": "imperative-2",
  "VerbsPastActive2": "verbs-past-active-2",
  "VerbsPastNifal": "past-nif-al",
  "VerbsInfinitives2": "infinitives-2",
  "Contruct-State-2": "construct-state-2",
  "VerbsConditional": "the-conditional",
  "Medical": "medical",
  "Negative-Imperatives": "negative-imperatives",
  "NounsVerbalNouns": "verbal-nouns",
  "Music": "music",
  "Diminutives": "diminutives",
  "VerbsFutureNifal": "future-nif-al",
  "Formal": "formal",
  "Business": "business",
  "The-Outer-Space": "outer-space",
  "Jewish-Festivals": "jewish-festivals",
};

const headingRegex = /^# <a name="([^"]+)">([^<]+)<\/a>\n\n/gm;

function parseLessons(sourceFile, contentDir) {
  mkdirSync(contentDir, { recursive: true });

  const md = readFileSync(sourceFile, 'utf-8');

  let match;
  headingRegex.lastIndex = 0;

  while ((match = headingRegex.exec(md)) !== null) {
    const anchor = match[1];
    const title = match[2];
    const contentStart = headingRegex.lastIndex;

    const nextMatch = headingRegex.exec(md);
    const contentEnd = nextMatch ? nextMatch.index : md.length;

    let body = md.slice(contentStart, contentEnd).trim();

    body = body.replace(/\n---+\s*$/, '');
    body = body.replace(/\n\[(Content Table|Índice)\].*$/s, '');

    const slug = slugMap[anchor];
    if (!slug) {
      console.warn(`No slug mapping for anchor: ${anchor} (${sourceFile})`);
      continue;
    }

    const escapedTitle = title.replace(/"/g, '\\"');
    const content = `---
title: "${escapedTitle}"
---

${body}\n`;

    writeFileSync(join(contentDir, `${slug}.md`), content, 'utf-8');
    headingRegex.lastIndex = nextMatch ? nextMatch.index : md.length;
  }

  console.log(`Extracted lessons to ${contentDir}`);
}

parseLessons(join(root, '..', 'content', 'hebrew-tips-and-notes.md'), join(root, 'src', 'content', 'lessons'));
parseLessons(join(root, '..', 'content', 'hebrew-tips-and-notes.es.md'), join(root, 'src', 'content', 'lessons-es'));
