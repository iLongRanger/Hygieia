import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST_DIR = fileURLToPath(new URL('../dist/assets/', import.meta.url));
const KB = 1024;

const budgets = {
  entryJsGzipKb: 150,
  cssGzipKb: 100,
  chunkRawKb: 500,
};

function sizeKb(bytes) {
  return Math.round((bytes / KB) * 100) / 100;
}

function readAssets() {
  return readdirSync(DIST_DIR).map((name) => {
    const path = join(DIST_DIR, name);
    const rawBytes = statSync(path).size;
    const gzipBytes = gzipSync(readFileSync(path)).length;
    return {
      name,
      rawKb: sizeKb(rawBytes),
      gzipKb: sizeKb(gzipBytes),
    };
  });
}

function fail(message) {
  console.error(`Performance budget failed: ${message}`);
  process.exitCode = 1;
}

const assets = readAssets();
const jsAssets = assets.filter((asset) => asset.name.endsWith('.js'));
const cssAssets = assets.filter((asset) => asset.name.endsWith('.css'));
const entryJs = jsAssets.find((asset) => /^index-[\w-]+\.js$/.test(asset.name));
const entryCss = cssAssets.find((asset) =>
  /^index-[\w-]+\.css$/.test(asset.name)
);

if (!entryJs) {
  fail('entry JavaScript asset was not found');
} else if (entryJs.gzipKb > budgets.entryJsGzipKb) {
  fail(
    `entry JavaScript is ${entryJs.gzipKb} KB gzip, budget is ${budgets.entryJsGzipKb} KB`
  );
}

if (!entryCss) {
  fail('entry CSS asset was not found');
} else if (entryCss.gzipKb > budgets.cssGzipKb) {
  fail(
    `entry CSS is ${entryCss.gzipKb} KB gzip, budget is ${budgets.cssGzipKb} KB`
  );
}

for (const asset of jsAssets) {
  if (asset.rawKb > budgets.chunkRawKb) {
    fail(
      `${asset.name} is ${asset.rawKb} KB raw, budget is ${budgets.chunkRawKb} KB`
    );
  }
}

const largestChunks = [...jsAssets]
  .sort((a, b) => b.gzipKb - a.gzipKb)
  .slice(0, 8);

console.log('Performance budget summary');
console.table({
  entryJs: entryJs ?? null,
  entryCss: entryCss ?? null,
});
console.log('Largest JavaScript chunks by gzip size');
console.table(largestChunks);
