import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const inventory = {};

function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) walk(full);
    else if (item.name.endsWith('.html')) {
      const relative = path.relative(dist, full).replaceAll(path.sep, '/');
      const document = parse(fs.readFileSync(full, 'utf8'));
      const ids = new Set();
      const visit = (node) => {
        const id = node.attrs?.find((attribute) => attribute.name === 'id')?.value;
        if (id) ids.add(id);
        for (const child of node.childNodes ?? []) visit(child);
        if (node.content) visit(node.content);
      };
      visit(document);
      inventory[relative] = [...ids].sort();
    }
  }
}

if (!fs.existsSync(dist)) throw new Error('Build the site before capturing its route inventory.');
walk(dist);
if (process.argv.includes('--write')) {
  fs.writeFileSync(path.join(root, 'scripts/site-routes.json'), `${JSON.stringify(inventory, null, 2)}\n`);
  console.log(`Captured ${Object.keys(inventory).length} page routes and their fragment IDs.`);
} else {
  console.log(`Found ${Object.keys(inventory).length} pages. Pass --write to update the reviewed inventory.`);
}
