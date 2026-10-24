import { access, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const candidates = [
  resolve('node_modules/swiper/shared/utils.js'),
  resolve('node_modules/swiper/src/shared/utils.js'),
];

const vulnerableDeclarationPattern =
  /\s*const\s+noExtend\s*=\s*\[\s*['"]__proto__['"]\s*,\s*['"]constructor['"]\s*,\s*['"]prototype['"]\s*\]\s*;\s*/;

const vulnerableFilterPattern =
  /const\s+keysArray\s*=\s*Object\.keys\(Object\(nextSource\)\)\.filter\(\s*\(?\s*key\s*\)?\s*=>\s*noExtend\.indexOf\(key\)\s*<\s*0\s*\)\s*;/;

const patchedFilter = [
  'const keysArray = Object.keys(Object(nextSource)).filter(',
  "        (key) => key !== '__proto__' && key !== 'constructor' && key !== 'prototype',",
  '      );',
].join('\n');

const patchedFilterPattern =
  /key\s*!==\s*['"]__proto__['"]\s*&&\s*key\s*!==\s*['"]constructor['"]\s*&&\s*key\s*!==\s*['"]prototype['"]/;

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

if (!patchedFilterPattern.test(patched)) {
  if (!vulnerableFilterPattern.test(patched)) {
    const extendIndex = patched.indexOf('function extend');
    const diagnostic = extendIndex >= 0
      ? patched.slice(extendIndex, extendIndex + 1200)
      : patched.slice(0, 1200);

    throw new Error(
      `Could not find the vulnerable Swiper 8 filter in ${target}.\n` +
      `Diagnostic excerpt:\n${diagnostic}`,
    );
  }

  patched = patched.replace(vulnerableDeclarationPattern, '\n');
  patched = patched.replace(vulnerableFilterPattern, patchedFilter);
}

if (!patchedFilterPattern.test(patched)) {
  throw new Error('The direct protected-key comparisons were not applied.');
}

if (/noExtend\s*\.\s*indexOf\s*\(\s*key\s*\)/.test(patched)) {
  throw new Error('The vulnerable Array#indexOf key filter is still present.');
}

await writeFile(target, patched, 'utf8');
await writeFile(resolve('.patched-swiper-utils-path'), `${target}\n`, 'utf8');

console.log(`Applied CVE-2026-27212 backport to ${target}`);

// Preserve all loop images and external freeze/correction transforms. Comparing
// the live inline value avoids redundant clamped writes without a stale cache.
const parallaxTarget = resolve(target, '../../modules/parallax/parallax.js');
const parallaxOriginal = await readFile(parallaxTarget, 'utf8');
const repeatedTransform = '$el.transform(`translate3d(${x}, ${y}, 0px)`);';
const guardedTransform = [
  'const transform = `translate3d(${x}, ${y}, 0px)`;',
  '      if ($el[0].style.transform !== transform) $el.transform(transform);',
].join('\n');
let parallaxPatched = parallaxOriginal;
if (!parallaxPatched.includes(guardedTransform)) {
  if (parallaxPatched.split(repeatedTransform).length !== 2) {
    throw new Error(`Unexpected Swiper Parallax transform in ${parallaxTarget}.`);
  }
  parallaxPatched = parallaxPatched.replace(repeatedTransform, guardedTransform);
}
await writeFile(parallaxTarget, parallaxPatched, 'utf8');
console.log(`Applied unchanged parallax transform guard to ${parallaxTarget}`);
