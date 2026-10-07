const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/shared/dd-memory.js'),'utf8');
const turn=()=>new Promise(r=>setImmediate(r));
function page(type='navigate',snapshot=null,width=1024){
 const dom=new JSDOM('<p data-tdb-dd-page="native" data-w-id="stable">Same copy</p><section data-tdb-team-quotes><p data-tdb-team-author-line>David</p></section>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'}),w=dom.window;
 w.innerWidth=width;w.performance.getEntriesByType=()=>[{type}];
 if(snapshot)w.sessionStorage.setItem('tdb:dd:v1:/',snapshot);
 w.eval(source);return {dom,w,node:w.document.querySelector('p')};
}
test('reload restores exact opacity before shared runtime and first navigation stays native opaque',()=>{
 const first=page();let saved;try{first.w.TDBDDMemory.save([{node:first.node,value:.37,owner:{root:null}}]);saved=first.w.sessionStorage.getItem('tdb:dd:v1:/');}finally{first.w.close();}
 for(const type of ['reload','back_forward','navigate']){const p=page(type,saved);try{assert.equal(p.node.style.opacity,type==='navigate'?'':'0.37');assert.equal(p.w.TDBDDMemory.take(p.node),type!=='navigate');}finally{p.w.close();}}
 const narrow=page('reload',saved,390);try{assert.equal(narrow.node.style.opacity,'');}finally{narrow.w.close();}
});
test('partial parser content restores only after identity matches; claimed nodes are not overwritten',async()=>{
 const p=page();try{p.w.TDBDDMemory.save([{node:p.node,value:0,owner:{root:null}}]);const saved=p.w.sessionStorage.getItem('tdb:dd:v1:/');const q=page('reload',saved);try{q.node.remove();const n=q.w.document.createElement('p');n.setAttribute('data-tdb-dd-page','native');n.setAttribute('data-w-id','stable');q.w.document.body.append(n);n.textContent='Same copy';await turn();assert.equal(q.w.TDBDDMemory.take(n),true);assert.equal(n.style.opacity,'0');n.style.opacity='.8';q.w.TDBDDMemory.take(n);assert.equal(n.style.opacity,'0.8');}finally{q.w.close();}}finally{p.w.close();}
});
test('quote entrances and local drawer state are excluded from reload memory',()=>{
 const p=page();try{const name=p.w.document.querySelector('[data-tdb-team-author-line]');p.w.TDBDDMemory.save([{node:name,value:0,owner:{root:null}},{node:p.node,value:.5,owner:{root:{}}}]);assert.deepEqual(JSON.parse(p.w.sessionStorage.getItem('tdb:dd:v1:/')).items,{});}finally{p.w.close();}
});
