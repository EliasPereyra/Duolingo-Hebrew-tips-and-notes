import { defineConfig, fontProviders } from "astro/config";
import rehypeExamples from "./src/rehype-plugins/rehype-examples.mjs";
import rehypeWrapTables from "./src/rehype-plugins/rehype-wrap-tables.mjs";

// https://astro.build/config
export default defineConfig({
  base: "/",
  markdown: {
    rehypePlugins: [rehypeExamples, rehypeWrapTables],
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
      provider: fontProviders.local(),
      name: "David Libre",
      cssVariable: "--font-david-libre",
      options: {
        variants: [
          {
            weight: 400,
            style: "normal",
            src: ["./src/assets/fonts/david_libre/davidlibre-regular.woff2"],
          },
          {
            weight: 700,
            style: "normal",
            src: ["./src/assets/fonts/david_libre/davidlibre-bold.woff2"],
          },
        ],
      },
    },
  ],
});
