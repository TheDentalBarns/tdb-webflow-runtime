import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const candidates = [
  resolve('node_modules/swiper/shared/utils.js'),
  resolve('node_modules/swiper/src/shared/utils.js'),
];

const vulnerableDeclaration = "  const noExtend = ['__proto__', 'constructor', 'prototype'];\n";
const vulnerableFilter =
  '      const keysArray = Object.keys(Object(nextSource)).filter((key) => noExtend.indexOf(key) < 0);';
const patchedFilter = [
  '      const keysArray = Object.keys(Object(nextSource)).filter(',
  "        (key) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype',",
  '      );',
].join('\n');

let target;
for (const candidate of candidates) {
  try {
    await access(candidate);
    target = candidate;
    break;
  } catch {
    // Try the next known Swiper 8 package layout.
  }
}

if (!target) {
  throw new Error('Could not locate Swiper 8 shared/utils.js in node_modules.');
}

const original = await readFile(target, 'utf8');
let patched = original;

if (patched.includes(vulnerableDeclaration)) {
  patched = patched.replace(vulnerableDeclaration, '');
}

if (patched.includes(vulnerableFilter)) {
  patched = patched.replace(vulnerableFilter, patchedFilter);
}

if (!patched.includes(patchedFilter)) {
  throw new Error('The expected Swiper 8 extend() implementation was not found or patched.');
}

if (patched.includes('noExtend.indexOf(key)')) {
  throw new Error('The vulnerable Array#indexOf key filter is still present.');
}

await writeFile(target, patched, 'utf8');
await writeFile(resolve('.patched-swiper-utils-path'), `${target}\n`, 'utf8');

console.log(`Applied CVE-2026-27212 backport to ${target}`);
