import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import process from 'node:process';

// Local builds default to the legacy GitHub Pages URL. Production settings
// are supplied explicitly so canonical metadata and internal links agree.
const site = process.env.PUBLIC_SITE_URL?.trim()
  || 'https://nicksisco1932.github.io/nicholas-sisco-independent-work/';
const base = process.env.PUBLIC_SITE_BASE?.trim()
  || '/nicholas-sisco-independent-work';

export default defineConfig({
  site,
  base,
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
