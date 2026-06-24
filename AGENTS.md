# AGENTS.md

## Project Overview

Static site built with Astro that preserves the Tips & Notes from the Duolingo Hebrew course. Content is stored as markdown files in an Astro content collection and rendered as individual lesson pages.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server at `localhost:4321` |
| `pnpm build` | Build to `dist/` |
| `pnpm preview` | Preview the production build |
| `pnpm check` | Run Astro type-checking (`astro check`) |
| `pnpm lint` | Lint with ESLint |
| `pnpm format` | Format with Prettier |
| `pnpm format:check` | Check formatting with Prettier |

## Tech Stack

- **Framework:** Astro 6 (pages + layouts as `.astro` files, no UI framework)
- **Language:** TypeScript (strict mode via `astro/tsconfigs/strict`)
- **Package Manager:** pnpm
- **Content:** Astro Content Collections with markdown files
- **Styling:** Scoped `<style>` tags inside `.astro` files
- **Build Output:** Fully static HTML (no client-side JS)

## Project Structure

```
web/
├── .github/
│   └── workflows/
│       └── ci.yml              # CI workflow (check + build)
├── .prettierrc                 # Prettier config
├── astro.config.mjs            # Astro config
├── eslint.config.mjs           # ESLint flat config
├── tsconfig.json               # TypeScript config (extends astro/tsconfigs/strict)

├── public/
│   └── favicon.svg
├── scripts/
│   └── parse-lessons.mjs     # Script to extract lessons from master markdown
└── src/
    ├── content.config.ts     # Content collections config (lessons collection)
    ├── content/lessons/      # 66 individual lesson markdown files
    ├── components/
    │   └── Sidebar.astro     # Navigation sidebar
    ├── layouts/
    │   └── Layout.astro      # Main layout (sidebar + content slot)
    └── pages/
        ├── index.astro       # Home page with lesson grid
        └── lessons/
            └── [slug].astro  # Dynamic lesson page
```

## Code Style Guidelines

### Astro Components
- Use `---` fences for the component script (frontmatter).
- Type props with `interface Props` and access via `Astro.props`.
- Use `await getCollection()` for querying content.
- Use `getStaticPaths()` for dynamic routes.
- Use `<slot />` for child content in layouts.

### CSS / Styling
- All styles go inside `<style>` tags in `.astro` files (no CSS modules, no external CSS files).
- Use Astro's built-in scoped styles by default (`<style>` without `is:global`).
- Use `<style is:global>` only in layouts for base resets and global rules.
- Follow BEM-like class naming for clarity (e.g., `.lesson-header`, `.lesson-content`). But avoid using very log BEM-like classes, to keep the code clear.
- Use CSS custom properties sparingly via `<style is:global>`.

### TypeScript
- Follow strict mode (no implicit `any`, strict null checks).
- Use `z.object()` from `astro:content` for content collection schemas.
- Prefer `const` over `let`.
- Use `interface` over `type` for object shapes (Astro convention).

### Content (Markdown)
- Frontmatter must include `title: string` (validated by content collection schema).
- File names are URL slugs (lowercase, kebab-case).
- Content is Hebrew language tips with tables, blockquotes, and headings.

### Naming Conventions
- **Files:** kebab-case (e.g., `index.astro`, `[slug].astro`)
- **Components:** PascalCase (e.g., `Layout.astro`, `Sidebar.astro`)
- **CSS classes:** kebab-case (e.g., `.lesson-list`, `.back-link`)
- **Content files:** kebab-case (auto-generated from lesson names)

### Imports
- Use relative imports for local files (e.g., `../components/Sidebar.astro`).
- Use `astro:content` for content collection APIs.
- No barrel files — import directly from source.

## Content Management

- Master content lives in `content/hebrew-tips-and-notes.md` (not in `web/`).
- Run `node scripts/parse-lessons.mjs` to regenerate lesson files from the master.
- The `lessons` content collection globs `src/content/lessons/*.md`.
- Each lesson markdown file has a single `title` frontmatter field.

## CI / Deployment

- CI runs on `main` branch via `.github/workflows/ci.yml`.
- Pipeline: `pnpm install --frozen-lockfile` → `pnpm check` → `pnpm build`.
- `site` and `base` are set in `astro.config.mjs` for GitHub Pages hosting at `/Duolingo-Hebrew-tips-and-notes`. If you serve from a different URL, update those values.
- The `dist/` folder is gitignored; the build artifact is ephemeral (not committed).
