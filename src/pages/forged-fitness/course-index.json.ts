/* Generates /forged-fitness/course-index.json at build time.
 * The course interactivity script fetches this to know the lesson list,
 * per-lesson content versions (for progress invalidation), and paths.
 */
import { getCollection } from 'astro:content';
import { createHash } from 'node:crypto';
import { isPublished } from '../../lib/publication.mjs';

export async function GET() {
  const lessons = await getCollection('course-lessons', isPublished);
  const paths = await getCollection('course-paths', isPublished);
  const stageOrder = { understand: 0, apply: 1, review: 2 };
  const sorted = [...lessons].sort(
    (a, b) => a.data.week - b.data.week || stageOrder[a.data.stage] - stageOrder[b.data.stage]
  );
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL.slice(0, -1)
    : import.meta.env.BASE_URL;

  const index = {
    schemaVersion: 1,
    lessons: sorted.map((l) => ({
      id: l.data.lesson_id,
      title: l.data.title,
      week: l.data.week,
      stage: l.data.stage,
      url: `${base}/forged-fitness/lessons/${l.id.replace(/\.mdx$/, '')}.html`,
      version: createHash('sha1').update(l.body).digest('hex').slice(0, 16),
    })),
    paths: paths.map((p) => ({
      id: p.id.replace(/\.mdx$/, ''),
      title: p.data.title,
      weeks: p.data.weeks,
    })),
  };

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
