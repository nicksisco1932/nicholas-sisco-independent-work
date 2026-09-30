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
  companion_resource: z.string().optional(),
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

const courseLessonSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.string(),
  maturity: z.string().optional(),
  week: z.number().int().positive(),
  stage: z.enum(['understand', 'apply', 'review']),
  lesson_id: z.string(),
  source_site_url: z.string().url(),
  tags: z.array(z.string()).default([]),
});

const courseGuideSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.string(),
  guide_type: z.enum(['orientation', 'program']),
  source_site_url: z.string().url(),
  printable: z.boolean().default(true),
  tags: z.array(z.string()).default([]),
});

const coursePathSchema = z.object({
  title: z.string(),
  description: z.string(),
  status: z.string(),
  weeks: z.number().int().positive(),
  source_site_url: z.string().url(),
  tags: z.array(z.string()).default([]),
});

const courseWeeks = defineCollection({
  type: 'content',
  schema: courseWeekSchema,
});

const courseLessons = defineCollection({
  type: 'content',
  schema: courseLessonSchema,
});

const courseResources = defineCollection({
  type: 'content',
  schema: resourceSchema,
});

const courseGuides = defineCollection({
  type: 'content',
  schema: courseGuideSchema,
});

const coursePaths = defineCollection({
  type: 'content',
  schema: coursePathSchema,
});

export const collections = {
  projects,
  notes,
  'course-weeks': courseWeeks,
  'course-lessons': courseLessons,
  'course-resources': courseResources,
  'course-guides': courseGuides,
  'course-paths': coursePaths,
};
