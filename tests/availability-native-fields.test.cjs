const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync(__dirname+'/../src/shared/availability.js','utf8');
const fixture=require('./fixtures/availability-native-fields.json');
const start=src.indexOf('  const fields'),end=src.indexOf('  function entry');
const context={Intl,Date,Map,Error};
const functions=src.slice(src.indexOf('  const format ='),src.indexOf('  function entry'));
const fields=src.match(/const fields\s*=\s*(\[[\s\S]*?\]);/)[1];
const parse=vm.runInNewContext('const formats=new Map();const fields='+fields+';'+functions+';parse',context);
function row(values,attributes){return{hasAttribute:n=>attributes&&Object.hasOwn(values,n.slice(12)),getAttribute:n=>values[n.slice(12)],querySelectorAll:s=>{const key=s.match(/"([^"]+)"/)[1];return Object.hasOwn(values,key)?[{textContent:values[key]}]:[]}};}
test('native attributes and legacy text yield identical appointment settings',()=>{const legacy=JSON.stringify(parse(row(fixture,false),'active'));assert.equal(JSON.stringify(parse(row(fixture,true),'active')),legacy);assert.equal(JSON.parse(legacy).nextSlot,'2026-10-28T13:40:00.000Z');});
test('empty dates remain empty and a missing field is rejected',()=>{assert.equal(parse(row(fixture,true),'active').deadline,null);const incomplete={...fixture};delete incomplete['signature-heading'];assert.throws(()=>parse(row(incomplete,true),'active'),/Incomplete/);});
test('summer UK time and invalid clocks retain validation',()=>{let values={...fixture,'next-signature-slot':'July 10, 2026','next-signature-uk-time':'13:40'};assert.equal(parse(row(values,true),'active').nextSlot,'2026-07-10T12:40:00.000Z');values['next-signature-uk-time']='25:00';assert.throws(()=>parse(row(values,true),'active'),/Invalid appointment date/);});
