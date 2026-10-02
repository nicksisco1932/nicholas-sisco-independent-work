import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Structured front matter for all long-form synthesis content.
// Every field is provenance-oriented: a future article must say what it is,
// how mature it is, which Notion sources it synthesizes, what evidence it
// rests on, and what remains unresolved.
const synthesisSchema = z.object({
  published: z.boolean().default(false),
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
  loader: glob({ pattern: '**/*.mdx', base: './src/content/projects' }),
  schema: synthesisSchema,
});

const notes = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/notes' }),
  schema: synthesisSchema,
});

const courseWeekSchema = z.object({
  published: z.boolean().default(false),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  maturity: z.string().optional(),
  week: z.number().int().positive(),
  companion_resource: z.string().optional(),
  source_site_url: z.url(),
  evidence_reviewed_through: z.coerce.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
});

const resourceSchema = z.object({
  published: z.boolean().default(false),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  resource_type: z.string(),
  source_site_url: z.url(),
  printable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

const courseLessonSchema = z.object({
  published: z.boolean().default(false),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  maturity: z.string().optional(),
  week: z.number().int().positive(),
  stage: z.enum(['understand', 'apply', 'review']),
  lesson_id: z.string(),
  source_site_url: z.url(),
  tags: z.array(z.string()).default([]),
});

const courseGuideSchema = z.object({
  published: z.boolean().default(false),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  guide_type: z.enum(['orientation', 'program']),
  source_site_url: z.url(),
  printable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

const coursePathSchema = z.object({
  published: z.boolean().default(false),
  title: z.string(),
  description: z.string(),
  status: z.string(),
  weeks: z.number().int().positive(),
  source_site_url: z.url(),
  tags: z.array(z.string()).default([]),
});

const courseWeeks = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/course-weeks' }),
  schema: courseWeekSchema,
});

const courseLessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/course-lessons' }),
  schema: courseLessonSchema,
});

const courseResources = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/course-resources' }),
  schema: resourceSchema,
});

const courseGuides = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/course-guides' }),
  schema: courseGuideSchema,
});

const coursePaths = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/course-paths' }),
  schema: coursePathSchema,
});

const atlasConceptSchema = z.object({
  published: z.boolean().default(false),
  title: z.string(),
  description: z.string(),
  kicker: z.string().optional(),
  lead: z.string().optional(),
  topics: z.array(z.string()).default([]),
  facts: z.record(z.string(), z.string()).default({}),
  source_site_url: z.url(),
});

const atlasUpdateSchema = z.object({
  published: z.boolean().default(false),
  title: z.string(),
  description: z.string(),
  kicker: z.string().optional(),
  lead: z.string().optional(),
  date: z.coerce.string().optional(),
  topics: z.array(z.string()).default([]),
  source_site_url: z.url(),
});

const atlasConcepts = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/atlas-concepts' }),
  schema: atlasConceptSchema,
});

const atlasUpdates = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/atlas-updates' }),
  schema: atlasUpdateSchema,
});

export const collections = {
  projects,
  notes,
  'course-weeks': courseWeeks,
  'course-lessons': courseLessons,
  'course-resources': courseResources,
  'course-guides': courseGuides,
  'course-paths': coursePaths,
  'atlas-concepts': atlasConcepts,
  'atlas-updates': atlasUpdates,
};

