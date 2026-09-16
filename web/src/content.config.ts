import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const lessons = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/lessons" }),
  schema: z.object({
    title: z.string(),
  }),
});

const lessonsEs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "src/content/lessons-es" }),
  schema: z.object({
    title: z.string(),
  }),
});

export const collections = { lessons, lessonsEs };
