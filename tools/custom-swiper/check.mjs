import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const file = resolve('..', '..', 'dist', 'tdb-swiper-8.4.7.min.js');
const { size } = await stat(file);
const source = await readFile(file, 'utf8');

const failures = [];

if (!source.includes('window.Swiper')) {
  failures.push('The artifact does not expose window.Swiper.');
}

if (!source.includes('TDB custom Swiper 8.4.7')) {
  failures.push('The expected version banner is missing.');
}

if (size >= 130000) {
  failures.push(`The custom artifact is unexpectedly large: ${size} bytes.`);
}

if (source.includes('sourceMappingURL=')) {
  failures.push('The production artifact unexpectedly references a source map.');
}

if (failures.length) {
  throw new Error(failures.join('\n'));
}

console.log(`Artifact checks passed (${size.toLocaleString()} bytes).`);
