const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../dist/tdb-review-summary-card.js'),'utf8');
test('summary click and keyboard open the adjacent featured review without the generic handler',async t=>{
 const dom=new JSDOM('<section><div class="button is-review" data-tdb-review-updated="1" aria-label="Read 84 patient reviews">4.94 (84)</div><div data-tdb-power-snippet data-tdb-review-ready="1"><figure data-tdb-review-open="hannah"></figure></div></section>',{runScripts:'outside-only'});
 t.after(()=>dom.window.close());const w=dom.window, badge=w.document.querySelector('.button');const opened=[];let generic=0;
 badge.addEventListener('click',()=>generic++);badge.addEventListener('keydown',()=>generic++);
 w.TDBPowerSnippets={loadDrawer:async()=>({open:(trigger,id)=>opened.push({trigger,id})})};
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));badge.click();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(generic,0);assert.equal(opened[0].trigger,badge);assert.equal(opened[0].id,'hannah');
 w.document.querySelector('figure').dataset.tdbReviewOpen='location-review';
 badge.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(opened[1].id,'location-review');assert.equal(generic,0);assert.equal(badge.hasAttribute('aria-busy'),false);
});
