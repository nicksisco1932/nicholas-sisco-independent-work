import process from 'node:process';

const configured = process.env.PUBLIC_SITE_URL?.trim();
if (!configured) throw new Error('Set the repository variable PUBLIC_SITE_URL to the selected production domain.');
const origin = new URL(configured);
if (origin.protocol !== 'https:' || origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('PUBLIC_SITE_URL must be an HTTPS origin with no path, query, or fragment.');
}
if (origin.hostname.endsWith('.github.io') || origin.hostname.endsWith('.workers.dev')) {
  throw new Error('Choose the permanent owner-controlled domain before production publication.');
}
