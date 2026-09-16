import {mkdir,copyFile,readFile,writeFile} from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
await mkdir(new URL('dist/',root),{recursive:true});
for(const [from,to] of [
  ['src/five-senses/loader.js','dist/tdb-five-senses-loader.js'],
  ['src/styles/tdb-five-senses.css','dist/tdb-five-senses.css']
])await copyFile(new URL(from,root),new URL(to,root));
const scenes=await readFile(new URL('src/five-senses/scene-renderer.js',root),'utf8');
const main=(await readFile(new URL('src/five-senses/five-senses.js',root),'utf8')).replace(/^import \{SceneRenderer\} from '\.\/scene-renderer\.js';\n/,'');
await writeFile(new URL('dist/tdb-five-senses.js',root),scenes+'\n'+main);
console.log('Built the isolated Five Senses runtime.');
