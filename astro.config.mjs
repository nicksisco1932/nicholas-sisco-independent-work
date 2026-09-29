import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// `site` is the final GitHub Pages URL (used for sitemap, robots.txt,
// canonical/OG meta). `base` is the project subpath — all internal links are
// written base-aware so the site works both locally and on Pages.
export default defineConfig({
  site: 'https://nicksisco1932.github.io/nicholas-sisco-independent-work/',
  base: '/nicholas-sisco-independent-work',
  // `format: 'file'` emits /literature.html, /odgs.html, etc. — preserving the
  // legacy URL style of the previous site (see README "URL preservation").
  build: { format: 'file' },
  integrations: [
    mdx(),
    // Append .html to sitemap URLs so they match the emitted files.
    sitemap({
      serialize(item) {
        if (!item.url.endsWith('/') && !/\.[a-z0-9]+$/i.test(item.url)) {
          item.url += '.html';
        }
        return item;
      },
    }),
  ],
});
