import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const file = resolve('..', '..', 'dist', 'tdb-swiper-8.4.7.min.js');
const { size } = await stat(file);
const source = await readFile(file, 'utf8');

const failures = [];

if (!source.includes('window.Swiper')) {
  failures.push('The artifact does not expose window.Swiper.');
}

if (!source.includes('TDB custom Swiper 8.4.7-tdb.2')) {
  failures.push('The expected patched version banner is missing.');
}

if (!source.includes('CVE-2026-27212 backport')) {
  failures.push('The security backport marker is missing.');
}

if (size >= 130000) {
  failures.push(`The custom artifact is unexpectedly large: ${size} bytes.`);
}

if (source.includes('sourceMappingURL=')) {
  failures.push('The production artifact unexpectedly references a source map.');
}

if (source.includes("['__proto__','constructor','prototype'].indexOf") || source.includes('noExtend.indexOf')) {
  failures.push('The vulnerable Swiper key filter appears to remain in the artifact.');
}

if (failures.length) {
  throw new Error(failures.join('\n'));
}

console.log(`Patched artifact checks passed (${size.toLocaleString()} bytes).`);
