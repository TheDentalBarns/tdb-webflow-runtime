const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const code=fs.readFileSync('dist/tdb-dd-loader.js','utf8');
for(const navigation of ['reload','navigate']) test('DD loader memory before mount: '+navigation,async()=>{
 const dom=new JSDOM('<p data-tdb-dd-page>Remember me</p>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
 const w=dom.window;
 try {
  await new Promise(resolve=>w.addEventListener('load',resolve,{once:true}));
  w.performance.getEntriesByType=()=>[{type:navigation}];
  const node=w.document.querySelector('p');
  Object.defineProperty(w.document,'currentScript',{value:{src:'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@test/dist/tdb-dd-loader.js'}});
  w.eval(fs.readFileSync('src/shared/dd-memory.js','utf8'));
  w.TDBDDMemory.save([{owner:{},node,value:.45}]);delete w.TDBDDMemory;
  let mounts=0,loads=0;
  w.TDBModules={load:async()=>{loads++;assert.ok(w.TDBDDMemory,'memory exists before dependency loading')}};
  w.TDBMotion={ddRegion(){},ddText(nodes){mounts++;assert.equal(w.TDBDDMemory.take(nodes[0]),navigation==='reload');return {destroy(){}}}};
  w.eval(code);await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(node.style.opacity,navigation==='reload'?'0.45':'');assert.equal(mounts,1);assert.equal(loads,1);
  const memory=w.TDBDDMemory;w.eval(code);assert.equal(w.TDBDDMemory,memory);assert.equal(mounts,1);
  w.TDBDDFades.destroy();
 }finally {w.close()}
});
