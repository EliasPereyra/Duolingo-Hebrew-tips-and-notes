# Duolingo Hebrew Tips & Notes

The complete Tips and Notes from Duolingo's Hebrew course, preserved here as a reference since Duolingo removed them from the platform.

## Contents

- [`content/hebrew-tips-and-notes.md`](./content/hebrew-tips-and-notes.md) — Full markdown with all lessons (~8,300 lines)
- [`web/`](./web/) — Astro application with individual lesson pages

## Local development (Astro)

```sh
cd web
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # outputs to web/dist/
pnpm preview    # preview the build
```

## Project structure

```
├── content/
│   └── hebrew-tips-and-notes.md    # Source of truth (all lessons in one file)
├── README.md
└── web/                            # Astro application
    ├── src/
    │   ├── content/lessons/        # Individual lesson files (Content Collections)
    │   ├── layouts/                # Layout component
    │   └── pages/                  # Index + dynamic lesson routes
    ├── scripts/                    # Extraction script (see below)
    ├── astro.config.mjs
    └── package.json
```

## How lessons are extracted

The script at [`web/scripts/parse-lessons.mjs`](./web/scripts/parse-lessons.mjs) reads `content/hebrew-tips-and-notes.md`, splits it by lesson headings (`# <a name="...">`), and generates individual markdown files under `web/src/content/lessons/` with frontmatter for Astro Content Collections.

Run it after updating the master file:

```sh
node web/scripts/parse-lessons.mjs
```

## GitHub Pages

The old static HTML version is still available at:

https://userscript17.github.io/Duolingo-Hebrew-tips-and-notes/index.html
