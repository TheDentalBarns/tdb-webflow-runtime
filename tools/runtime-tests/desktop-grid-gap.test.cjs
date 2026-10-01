const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(require('node:path').resolve(__dirname,'../../src/sliders/sliders.js'),'utf8');
const helpers=source.slice(source.indexOf('  function highlightGap('),source.indexOf('  function initHighlightSwiper('));
function fixture(t,width){
  const dom=new JSDOM('<html data-wf-page="677cf86df9952f978d94d8a9"><body><section class="section_smile-gallery"><div data-tdb-smile-slider style="column-gap:30px"></div></section><div class="parallax-swiper_component" style="column-gap:30px"></div><div class="other" style="column-gap:30px"></div></body></html>');
  t.after(()=>dom.window.close());
  const w={innerWidth:width};const context=vm.createContext({window:w,document:dom.window.document,PARALLAX_SELECTOR:'.parallax-swiper_component',matchMedia:()=>({matches:w.innerWidth>=992}),getComputedStyle:dom.window.getComputedStyle});
  vm.runInContext(helpers,context);
  return {context,w,doc:dom.window.document};
}
test('mobile and tablet retain their existing gaps despite desktop CSS values',t=>{
  for(const width of [390,767,768,991]){
    const {context:c,doc}=fixture(t,width),gallery=doc.querySelector('[data-tdb-smile-slider]');
    assert.equal(c.desktopGridGap(gallery,c.highlightGap(gallery)),width<768?width*.02:width===768?width*.05:20);
    assert.equal(c.desktopGridGap(doc.querySelector('.parallax-swiper_component'),0),0);
  }
});
test('only homepage gallery and parallax use the desktop reference gap',t=>{
  const {context:c,doc}=fixture(t,1600);
  assert.equal(c.desktopGridGap(doc.querySelector('[data-tdb-smile-slider]'),20),30);
  assert.equal(c.desktopGridGap(doc.querySelector('.parallax-swiper_component'),0),30);
  assert.equal(c.desktopGridGap(doc.querySelector('.other'),20),20);
  doc.documentElement.dataset.wfPage='other-page';
  assert.equal(c.desktopGridGap(doc.querySelector('[data-tdb-smile-slider]'),20),20);
});
test('resize refreshes rem-based gaps, restores mobile, and cleans up without moving slides',t=>{
  const {context:c,doc,w}=fixture(t,1600),node=doc.querySelector('.parallax-swiper_component');
  const events=new Map(),swiper={params:{spaceBetween:30},originalParams:{spaceBetween:30},on(names,fn){names.split(' ').forEach(n=>events.set(n,fn));},off(names){names.split(' ').forEach(n=>events.delete(n));}};
  c.bindGridGap(node,swiper,()=>0);
  node.style.columnGap='44px';events.get('beforeResize')();assert.equal(swiper.params.spaceBetween,44);
  w.innerWidth=390;events.get('breakpoint')();assert.equal(swiper.params.spaceBetween,0);assert.equal(swiper.originalParams.spaceBetween,0);
  w.innerWidth=1920;events.get('beforeResize')();assert.equal(swiper.params.spaceBetween,44);
  events.get('beforeDestroy')();assert.ok(!events.has('beforeResize'));assert.ok(!events.has('breakpoint'));
});
