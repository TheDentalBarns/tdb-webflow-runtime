const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function setup({count=88,plain=false,reduced=false}={}){
 const dom=new JSDOM(`<section><span data-tdb-review-count="${count}" ${plain?'data-tdb-count-format="plain"':''}><span class="review-number_value">${plain?'84':'(84)'}</span></span></section>`,{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window;
 let visible;const animations=[];
 w.IntersectionObserver=class{constructor(fn){visible=fn;}observe(){}disconnect(){}};
 w.TDBMotion={reduced:{matches:reduced,addEventListener(){},removeEventListener(){}},defaults:{ticker:400},ddText:()=>({destroy(){}})};
 w.Element.prototype.animate=function(){animations.push(this.textContent);return{cancel(){}}};
 for(const file of ['src/shared/native-ticker.js','src/reviews/native/introduction.js'])w.eval(fs.readFileSync(file,'utf8'));
 const root=w.document.querySelector('section'),value=()=>root.querySelector('.review-number_value').textContent;
 return{w,root,value,animations,show:()=>visible([{isIntersecting:true,intersectionRatio:1}]),close:()=>w.close()};
}
test('live total seeds 87 to 88, preserves formatting and never rewinds on remount',async()=>{
 for(const plain of [true,false]){const e=setup({plain}),format=n=>plain?String(n):`(${n})`;try{
 let mounted=e.w.TDBReviewIntroduction.mount(e.root,{prepare:async()=>{}});assert.equal(e.value(),format(87));e.show();assert.equal(e.animations.length,0);await Promise.resolve();assert.deepEqual(e.animations,[format(87),format(88)]);mounted.destroy();assert.equal(e.value(),format(88));mounted=e.w.TDBReviewIntroduction.mount(e.root,{prepare:async()=>{}});assert.equal(e.value(),format(88));mounted.destroy();
 }finally{e.close();}}
});
test('zero counts never become negative and reduced motion shows the actual total immediately',()=>{
 for(const options of [{count:0},{count:88,reduced:true}]){const e=setup(options);try{const mounted=e.w.TDBReviewIntroduction.mount(e.root);assert.equal(e.value(),`(${options.count})`);e.show();assert.equal(e.animations.length,0);mounted.destroy();}finally{e.close();}}
});

test('current native total remains a readable fallback and still progresses once after enhancement',()=>{
 const e=setup({count:90});try{
  e.root.querySelector('.review-number_value').textContent='(90)';
  assert.equal(e.value(),'(90)');
  let mounted=e.w.TDBReviewIntroduction.mount(e.root);
  assert.equal(e.value(),'(89)');e.show();mounted.destroy();
  assert.equal(e.value(),'(90)');
  mounted=e.w.TDBReviewIntroduction.mount(e.root);
  assert.equal(e.value(),'(90)');mounted.destroy();
 }finally{e.close();}
});
