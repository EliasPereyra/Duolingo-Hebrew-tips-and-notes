import { defineConfig, fontProviders } from "astro/config";
import { unified } from "@astrojs/markdown-remark";
import rehypeExamples from "./src/rehype-plugins/rehype-examples.mjs";
import rehypeHebrew from "./src/rehype-plugins/rehype-hebrew.mjs";
import rehypeInlineColors from "./src/rehype-plugins/rehype-inline-colors.mjs";
import rehypeWrapTables from "./src/rehype-plugins/rehype-wrap-tables.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://duolingo-tips-and-notes.netlify.app",
  base: "/",
  i18n: {
    defaultLocale: "en",
    locales: ["en", "es"],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  markdown: {
    processor: unified({
      // rehypeHebrew runs last, once examples and tables are already marked up.
      rehypePlugins: [rehypeExamples, rehypeWrapTables, rehypeInlineColors, rehypeHebrew],
    }),
  },
  fonts: [
    {
      provider: fontProviders.local(),
      name: "Manrope",
      cssVariable: "--font-manrope",
      options: {
        variants: [
          {
            weight: 400,
            style: "normal",
            src: [
              "./src/assets/fonts/manrope/static/manrope-latin-400-normal.woff2",
              "./src/assets/fonts/manrope/static/manrope-latin-ext-400-normal.woff2",
            ],
          },
          {
            weight: 700,
            style: "normal",
            src: [
              "./src/assets/fonts/manrope/static/manrope-latin-700-normal.woff2",
              "./src/assets/fonts/manrope/static/manrope-latin-ext-700-normal.woff2",
            ],
          },
        ],
      },
    },
    {
      // Variable font (300-900) that covers both Hebrew and Latin; used for
      // headings and every Hebrew glyph on the site.
      provider: fontProviders.local(),
      name: "Frank Ruhl Libre",
      cssVariable: "--font-frank-ruhl",
      options: {
        variants: [
          {
            weight: "300 900",
            style: "normal",
            src: ["./src/assets/fonts/frank_ruhl_libre/frank-ruhl-libre-hebrew-wght-normal.woff2"],
            unicodeRange: ["U+0307-0308", "U+0590-05FF", "U+200C-2010", "U+20AA", "U+25CC", "U+FB1D-FB4F"],
          },
          {
            weight: "300 900",
            style: "normal",
            src: ["./src/assets/fonts/frank_ruhl_libre/frank-ruhl-libre-latin-wght-normal.woff2"],
            unicodeRange: [
              "U+0000-00FF",
              "U+0131",
              "U+0152-0153",
              "U+02BB-02BC",
              "U+02C6",
              "U+02DA",
              "U+02DC",
              "U+0304",
              "U+0308",
              "U+0329",
              "U+2000-206F",
              "U+20AC",
              "U+2122",
              "U+2191",
              "U+2193",
              "U+2212",
              "U+2215",
              "U+FEFF",
              "U+FFFD",
            ],
          },
          {
            weight: "300 900",
            style: "normal",
            src: ["./src/assets/fonts/frank_ruhl_libre/frank-ruhl-libre-latin-ext-wght-normal.woff2"],
            unicodeRange: [
              "U+0100-02BA",
              "U+02BD-02C5",
              "U+02C7-02CC",
              "U+02CE-02D7",
              "U+02DD-02FF",
              "U+1D00-1DBF",
              "U+1E00-1E9F",
              "U+1EF2-1EFF",
              "U+2020",
              "U+20A0-20AB",
              "U+20AD-20C0",
              "U+2113",
              "U+2C60-2C7F",
              "U+A720-A7FF",
            ],
          },
        ],
      },
    },
  ],
});
