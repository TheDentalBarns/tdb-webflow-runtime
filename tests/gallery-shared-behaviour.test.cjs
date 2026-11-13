const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=name=>fs.readFileSync(path.join(__dirname,'../src/shared/'+name+'.js'),'utf8');
test('outside dismissal consumes the entire closing gesture and releases listeners on teardown',()=>{
 const dom=new JSDOM('<aside><button id="inside">Filter</button></aside><button id="outside">Open case</button>',{runScripts:'outside-only'}),w=dom.window;
 try{
  w.eval(source('filters'));const abort=new w.AbortController(),panel=w.document.querySelector('aside'),outside=w.document.querySelector('#outside');let active=true,closes=0,opens=0;
  outside.addEventListener('click',()=>opens++);
  w.TDBFilters.dismissOutside({contains:node=>panel.contains(node),isActive:()=>active,onDismiss:()=>{active=false;closes++;},signal:abort.signal});
  const pointer=type=>{const e=new w.Event(type,{bubbles:true,cancelable:true});Object.defineProperty(e,'pointerId',{value:7});return e;};
  outside.dispatchEvent(pointer('pointerdown'));assert.equal(closes,1);outside.dispatchEvent(pointer('pointerup'));outside.click();assert.equal(opens,0);
  outside.click();assert.equal(opens,1);active=true;panel.querySelector('button').click();assert.equal(active,true);
  abort.abort();outside.click();assert.equal(opens,2);assert.equal(active,true);
 }finally{w.close();}
});
test('a native filter without initial state classes hides its shade until opened and restores on teardown', () => {
 const dom=new JSDOM('<button>Filter</button><div id="shade"></div><aside>Options</aside>',{runScripts:'outside-only'}),w=dom.window;
 try {
  const reduced=new w.EventTarget();reduced.matches=true;
  w.TDBMotion={reduced,filterToggle:()=>({set(){},destroy(){}})};
  w.eval(source('filters'));
  const panel=w.document.querySelector('aside'),backdrop=w.document.querySelector('#shade');
  const filters=w.TDBFilters.mount(panel,{toggle:w.document.querySelector('button'),backdrop});
  assert.equal(panel.classList.contains('is-closed'),true);
  assert.equal(backdrop.classList.contains('is-closed'),true);
  filters.set(true);
  assert.equal(backdrop.classList.contains('is-closed'),false);
  filters.set(false);
  assert.equal(backdrop.classList.contains('is-closed'),true);
  filters.destroy();
  assert.equal(panel.classList.contains('is-closed'),false);
  assert.equal(backdrop.classList.contains('is-closed'),false);
 } finally {w.close();}
});

test('embedded and modal accordions share 20px spacing and travel without sharing state', async () => {
 const dom = new JSDOM('<style>.group{padding-bottom:0}.group.is-expanded{padding-bottom:20px}</style><section id="embed"><div class="group"><button aria-expanded="false">Treatments</button><div class="options is-collapsed">Options</div><i></i></div></section><section id="modal"><div class="group"><button aria-expanded="false">Treatments</button><div class="options is-collapsed">Options</div><i></i></div></section>', {runScripts:'outside-only'}), w=dom.window;
 try {
  const reduced=new w.EventTarget();reduced.matches=false;w.TDBMotion={reduced};const animations=[];
  w.HTMLElement.prototype.animate=function(frames,options){animations.push({node:this,frames,options});return {finished:Promise.resolve(),cancel(){}};};
  w.eval(source('filters'));
  const mount=(id)=>{const root=w.document.querySelector(id),group=root.querySelector('.group');return w.TDBFilters.mountDisclosures(root,{disclosures:[{key:'treatment',group,button:group.querySelector('button'),body:group.querySelector('.options'),chevron:group.querySelector('i')}]});};
  const embedded=mount('#embed'),modal=mount('#modal');
  w.document.querySelector('#embed button').click();
  assert.equal(embedded.hasExpandedDisclosures,true);assert.equal(modal.hasExpandedDisclosures,false);
  const padding=animations.find(a=>a.frames[1].paddingBottom);assert.equal(padding.frames[1].paddingBottom,'20px');assert.equal(padding.options.duration,300);
  const travel=animations.find(a=>a.frames[0].transform==='translateY(-20px)');assert.equal(travel.options.duration,400);
  assert.equal(w.document.querySelector('#embed .options').inert,false);
  const count=animations.length;reduced.matches=true;reduced.dispatchEvent(new w.Event('change'));embedded.collapseAll();assert.equal(animations.length,count);
  embedded.destroy();modal.destroy();w.document.querySelector('#embed button').click();assert.equal(w.document.querySelector('#embed button').getAttribute('aria-expanded'),'false');
 } finally {w.close();}
});
