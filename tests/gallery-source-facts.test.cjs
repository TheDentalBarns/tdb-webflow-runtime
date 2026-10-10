const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../src/sliders/gallery-presentation.js','utf8');
const body=source.slice(source.indexOf('  const values ='),source.indexOf('\n  function prepare'));
const read=vm.runInNewContext('const valueKeys=["price","duration","clinician"];'+body+'\nvalues');
const fixture=require('./fixtures/gallery-source-facts.json');
function slide(values,legacy=false){
  const keys=['price','duration','clinician'];
  return {querySelector(selector){
    const index=keys.findIndex(key=>selector==='[data-tdb-smile-source-fact="'+key+'"]');
    if(index<0||values[index]===undefined)return null;
    const textContent=values[index];
    return {textContent,querySelector(name){return legacy&&name==='.tdb-smile-source-value'?{textContent}:null;}};
  }};
}
test('all 33 published CMS facts survive flattened and legacy markup',()=>{
  assert.equal(fixture.length,11);
  for(const values of fixture)for(const legacy of [true,false])assert.deepEqual(Array.from(read(slide(values,legacy))),values);
});
test('blank, zero and missing facts preserve their presentation contract',()=>{
  assert.deepEqual(Array.from(read(slide(['  ','0',undefined]))),['','0','']);
  assert.deepEqual(Array.from(read(null)),['','','']);
});
test('legacy nested values remain authoritative when other text is present',()=>{
  const s={querySelector:()=>({textContent:'Label  Value ',querySelector:()=>({textContent:' Value '})})};
  assert.deepEqual(Array.from(read(s)),['Value','Value','Value']);
});
