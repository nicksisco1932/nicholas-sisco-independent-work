import { defineCollection, z } from 'astro:content';

// Structured front matter for all long-form synthesis content.
// Every field is provenance-oriented: a future article must say what it is,
// how mature it is, which Notion sources it synthesizes, what evidence it
// rests on, and what remains unresolved.
const synthesisSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.string(),
  maturity: z.string().optional(),
  date: z.coerce.string(),
  last_updated: z.coerce.string().optional(),
  source_notion_pages: z.array(z.string()).default([]),
  evidence_reviewed_through: z.coerce.string().nullable().optional(),
  unresolved_questions: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

const projects = defineCollection({
  type: 'content',
  schema: synthesisSchema,
});

const notes = defineCollection({
  type: 'content',
  schema: synthesisSchema,
});

const courseWeekSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.string(),
  maturity: z.string().optional(),
  week: z.number().int().positive(),
  source_site_url: z.string().url(),
  evidence_reviewed_through: z.coerce.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

const resourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.string(),
  resource_type: z.string(),
  source_site_url: z.string().url(),
  printable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

const courseWeeks = defineCollection({
  type: 'content',
  schema: courseWeekSchema,
});

const courseResources = defineCollection({
  type: 'content',
  schema: resourceSchema,
});

export const collections = {
  projects,
  notes,
  'course-weeks': courseWeeks,
  'course-resources': courseResources,
};
