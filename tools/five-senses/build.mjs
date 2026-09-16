import {mkdir,copyFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
await mkdir(new URL('dist/',root),{recursive:true});
for(const [from,to] of [
  ['src/five-senses/five-senses.js','dist/tdb-five-senses.js'],
  ['src/five-senses/loader.js','dist/tdb-five-senses-loader.js'],
  ['src/styles/tdb-five-senses.css','dist/tdb-five-senses.css']
])await copyFile(new URL(from,root),new URL(to,root));
console.log('Built the isolated Five Senses runtime.');
