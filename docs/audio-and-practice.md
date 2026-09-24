# Audio and practice exercises

The site stays fully static: audio and practice sentences are generated **offline**, committed to the repo, and the build only reads them. Nothing calls an external service at runtime.

## What each piece is

| Piece | What it does | Where |
|---|---|---|
| Pronunciation audio | Example paragraphs in a lesson get a play button with Hebrew audio. | `web/src/rehype-plugins/rehype-examples.mjs` extracts the Hebrew; audio lives in `web/public/audio/he/`, indexed by `web/src/generated/tts-manifest.json` |
| Practice panel | Listening and fill-in-the-blank exercises next to each lesson (below it on small screens). | `web/src/components/Practice.astro`, `web/src/utils/practice.ts` (browser), `web/src/utils/practice-data.ts` (build) |
| Lesson pools | Most lessons have few examples, so related lessons share material. | `web/src/constants/practice-pools.ts` |
| Sentence bank | Extra practice sentences, reviewed by hand before they're published. | `web/src/generated/sentence-bank.json` |

A practice session mixes the lesson's own examples (asked first) with approved bank sentences and examples from the rest of its pool. Examples that a lesson shows as *incorrect* Hebrew are listed in `INCORRECT_EXAMPLES` (`practice-data.ts`) so they're never asked.

## Generating audio

Audio is made locally with [Piper](https://github.com/OHF-Voice/piper1-gpl), an offline text-to-speech engine. One-time setup, from `web/`:

```sh
python3 -m venv .tts-tools/venv
.tts-tools/venv/bin/pip install piper-tts
.tts-tools/venv/bin/python -m piper.download_voices --download-dir .tts-tools/voices he_IL-saspeech-medium
```

Then generate the audio:

```sh
pnpm tts:generate
```

It creates audio only for texts that don't have it yet: lesson examples and **approved** bank sentences. `.tts-tools/` is gitignored. Set `PIPER_BIN` or `PIPER_VOICE` to use a different install or voice.

## Generating practice sentences

Candidates are appended to `sentence-bank.json` with `"status": "pending"`. There are two ways to get them.

**With the Anthropic API (`pnpm sentences:generate`).** `web/scripts/generate-sentences.mjs` uses the official Anthropic SDK ([`@anthropic-ai/sdk`](https://www.npmjs.com/package/@anthropic-ai/sdk), a dev dependency only this script uses) to ask Claude for sentences, pool by pool. It sends the lesson markdown along with rules to use only the lessons' vocabulary and keep the grammar correct, and it drops candidates that break basic checks. It needs an API key **with credits**:

```sh
echo "ANTHROPIC_API_KEY=sk-ant-..." > web/.env   # gitignored

pnpm sentences:generate                       # top up every pool to 6 sentences
pnpm sentences:generate --pool group-a,modals # only some pools
pnpm sentences:generate --count 10            # raise the target per pool
pnpm sentences:generate --status              # review progress (no API call)
```

**Without API credits.** Ask an AI coding assistant (for example Claude Code) to write pending entries straight into the JSON. Point it at this file and at `SYSTEM_PROMPT` in `generate-sentences.mjs`, which holds the rules. The current bank was made this way.

Each entry looks like this:

```json
{
  "id": "a1b2c3d4e5f6",
  "hebrew": "יש לי שני עיתונים",
  "translit": "yesh li shnei itoním",
  "gloss": { "en": "I have two newspapers.", "es": "Tengo dos periódicos." },
  "sourceWords": ["עיתונים"],
  "sourceLessons": ["plurals"],
  "status": "pending",
  "model": "claude-opus-5"
}
```

## Reviewing and publishing sentences

1. In `sentence-bank.json`, change each `"pending"` to `"approved"` or `"rejected"`. Fix `hebrew`, `translit` or `gloss` first if needed. Keep rejected entries: the generator skips them next time.
2. Run `pnpm tts:generate` so the approved sentences get audio.
3. Run `pnpm build`. Only approved sentences that have audio show up in the practice panel.

## Common changes

- **Add or move a lesson between pools:** `practice-pools.ts`.
- **Hide practice for a lesson:** add it to `EXCLUDED_LESSONS` in the same file.
- **Change the UI text (EN/ES):** `web/src/constants/practice-labels.ts`.
