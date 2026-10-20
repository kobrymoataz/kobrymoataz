import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const index = path.join(dist, 'index.html');
if (!fs.existsSync(index)) throw new Error('dist/index.html missing');
const html = fs.readFileSync(index, 'utf8');
const prefix = '/kobrymoataz/';
if (!html.includes(prefix)) throw new Error('Vite base path is missing from the generated site');
let count = 0;
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
  const url = match[1];
  if (/^(?:https?:|data:|mailto:|#)/.test(url)) continue;
  if (!url.startsWith(prefix)) throw new Error(`Unexpected asset path: ${url}`);
  const local = path.join(dist, url.slice(prefix.length).split('?')[0]);
  if (!fs.existsSync(local)) throw new Error(`Broken asset link in built HTML: ${url}`);
  count++;
}
const assetsDir = path.join(dist, 'assets');
if (!fs.existsSync(assetsDir)) throw new Error('Vite did not output assets');
const output = fs.readdirSync(assetsDir);
if (!output.some(n => /portrait.*\.webp$/.test(n))) throw new Error('Bundled portrait asset missing');
if (!output.some(n => /\.css$/.test(n))) throw new Error('Bundled CSS asset missing');
if (!output.some(n => /\.js$/.test(n))) throw new Error('Bundled JavaScript asset missing');
console.log(`Production verification passed: ${count} entrypoint references, photo, CSS and JavaScript present.`);
