const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/runtime/lazy-icon-masks.js','utf8');
test('guide artwork waits for consent and section proximity, and survives ticker clones', () => {
  const f = fixture({ allowed: false });
  try {
    const root = f.w.document.createElement('section');
    root.setAttribute('data-tdb-guide', '');
    root.innerHTML =
      '<div class="treatment-guide_intro-diamond"></div><span class="treatment-guide_cta-icon"><span data-guide-artwork="thumbprint"></span></span>';
    f.w.document.body.append(root);
    f.w.TDBLazyIconMasks.refresh();
    assert(!f.ios[0].nodes.has(root));
    f.permit(true);
    assert(f.ios[0].nodes.has(root));
    assert.equal(root.getAttribute('style'), null);
    f.ios[0].fn([{ target: root, isIntersecting: false }]);
    assert.equal(root.getAttribute('style'), null);
    f.ios[0].fn([{ target: root, isIntersecting: true }]);
    for (const key of ['intro', 'diamond', 'thumbprint', 'lotus', 'quotation', 'barn'])
      assert.match(
        root.style.getPropertyValue('--tdb-guide-' + key + '-artwork'),
        /^url\("https:\/\/cdn\.prod\.website-files\.com\/.+\.svg"\)$/,
      );
    assert.match(
      root.style.getPropertyValue('--tdb-guide-thumbprint-artwork'),
      /6aef3d06504a979ca9cd538b_tdb-thumbprint-small-1px/,
    );
    const before = root.getAttribute('style'),
      icon = root.querySelector('[data-guide-artwork]');
    icon.replaceWith(icon.cloneNode(true));
    f.w.TDBLazyIconMasks.refresh();
    assert.equal(root.getAttribute('style'), before);
    assert(!root.querySelector('[data-guide-artwork]').hasAttribute('style'));
    assert(!f.ios[0].nodes.has(root), 'the persistent section owns artwork, not each ticker clone');
  } finally {
    f.close();
  }
});

test('guide native mask URLs are guarded in both critical and shared CSS without changing layout', () => {
  const postcss = require('postcss');
  for (const file of ['dist/tdb-ui-critical.css', 'dist/tdb-ui.css']) {
    const rules = [];
    postcss.parse(fs.readFileSync(file, 'utf8')).walkRules((rule) => {
      if (
        rule.selector.includes(':root.w-mod-js') &&
        /treatment-guide_(intro-diamond|cta-icon)/.test(rule.selector)
      )
        rules.push(rule);
    });
    assert.equal(rules.length, 6, file);
    for (const rule of rules) {
      assert.deepEqual(
        rule.nodes.map((n) => n.prop),
        ['-webkit-mask-image', 'mask-image'],
      );
      for (const declaration of rule.nodes) {
        assert.doesNotMatch(declaration.value, /url\(/);
        assert.match(
          declaration.value,
          /var\(--tdb-guide-[a-z]+-artwork,linear-gradient\(transparent,transparent\)\)/,
        );
      }
    }
  }
});
function fixture({allowed=true,observer=true}={}) {
  const dom=new JSDOM('<div data-tdb-native-holder-icon="instagram"></div><div data-tdb-native-holder-icon="smile"></div><div data-tdb-native-holder-icon="reviews"></div><div data-tdb-lazy-mask="review"></div><div class="tdb-review-summary-star-direct"></div>',{runScripts:'outside-only'}),w=dom.window,nodes=[...w.document.querySelectorAll('div')],ios=[];
  let notify;
  w.TDBConsent={allows:()=>allowed,subscribe(fn){notify=fn;fn();return()=>{notify=null}}};
  if(observer)w.IntersectionObserver=class{constructor(fn,options){this.fn=fn;this.options=options;this.nodes=new Set();ios.push(this)}observe(n){this.nodes.add(n)}unobserve(n){this.nodes.delete(n)}disconnect(){this.nodes.clear()}};
  w.eval(source+';prepareLazyIconMasks()');
  return {w,nodes,ios,permit(value){allowed=value;notify?.()},close(){w.TDBLazyIconMasks.destroy();w.close()}};
}
test('native masks have no URL before proximity; only approaching icons get one',()=>{
  const f=fixture();try{assert.equal(f.ios[0].options.rootMargin,'400px');assert(f.nodes.every(n=>!n.style.maskImage));
    f.ios[0].fn([{target:f.nodes[0],isIntersecting:false}]);assert(!f.nodes[0].style.maskImage);
    f.ios[0].fn([{target:f.nodes[0],isIntersecting:true}]);assert.match(f.nodes[0].style.maskImage,/tdb-icon-instagram.svg/);assert(!f.nodes[1].style.maskImage);assert(!f.ios[0].nodes.has(f.nodes[0]));
    f.ios[0].fn(f.nodes.slice(1).map(target=>({target,isIntersecting:true})));assert.match(f.nodes[1].style.maskImage,/tdb-exceptional-diamond.svg/);assert.equal(f.nodes[2].style.maskImage,f.nodes[3].style.maskImage);assert.doesNotMatch(f.nodes[2].style.maskImage,/brand/);assert.match(f.nodes[4].style.maskImage,/tdb-review-star.svg/);
  }finally{f.close()}
});

test('native pseudo artwork waits for consent and proximity without changing geometry or adding DOM',()=>{
 const f=fixture({allowed:false});try{
  const kinds=['tranquil','parking','discreet','play','pause','spinner'];
  const nodes=kinds.map(kind=>{const n=f.w.document.createElement('div');n.dataset.tdbNativePseudoIcon=kind;n.className='native-art';f.w.document.body.append(n);return n});
  f.w.TDBLazyIconMasks.refresh();assert(nodes.every(n=>!f.ios[0].nodes.has(n)));
  f.permit(true);assert(nodes.every(n=>f.ios[0].nodes.has(n)));
  assert(nodes.every(n=>!n.style.getPropertyValue('--tdb-pseudo-artwork')));
  f.ios[0].fn([{target:nodes[0],isIntersecting:true}]);assert.match(nodes[0].style.getPropertyValue('--tdb-pseudo-artwork'),/tdb-tranquil-refined\.svg/);
  assert(nodes.slice(1).every(n=>!n.style.getPropertyValue('--tdb-pseudo-artwork')));
  f.permit(false);f.ios[0].fn(nodes.slice(1).map(target=>({target,isIntersecting:true})));
  assert(nodes.slice(1).every(n=>!n.style.getPropertyValue('--tdb-pseudo-artwork')));
  f.permit(true);for(let i=0;i<nodes.length;i++){assert.match(nodes[i].style.getPropertyValue('--tdb-pseudo-artwork'),new RegExp('tdb-(?:control-)?'+kinds[i]+'(?:-refined)?\\.svg'));assert.equal(nodes[i].childElementCount,0);assert.equal(nodes[i].className,'native-art');assert.equal(nodes[i].style.maskImage,'')}
  const unknown=f.w.document.createElement('div');unknown.dataset.tdbNativePseudoIcon='constructor';f.w.document.body.append(unknown);f.w.TDBLazyIconMasks.refresh();f.ios[0].fn([{target:unknown,isIntersecting:true}]);assert.equal(unknown.style.getPropertyValue('--tdb-pseudo-artwork'),'');
 }finally{f.close()}
});
test('permission and teardown gate queued observer work',()=>{
 const f=fixture({allowed:false});try{assert.equal(f.ios[0].nodes.size,0);f.permit(true);assert.equal(f.ios[0].nodes.size,5);f.permit(false);f.ios[0].fn([{target:f.nodes[0],isIntersecting:true}]);assert(!f.nodes[0].style.maskImage);f.permit(true);assert.match(f.nodes[0].style.maskImage,/instagram/);f.w.TDBLazyIconMasks.destroy();f.ios[0].fn([{target:f.nodes[1],isIntersecting:true}]);assert(!f.nodes[1].style.maskImage)}finally{f.close()}
});
test('browsers without IntersectionObserver retain decorative icons',()=>{
 const f=fixture({observer:false});try{assert(f.nodes.every(n=>n.style.maskImage.includes('.svg')))}finally{f.close()}
});

test('platform artwork stays inert until proximity and preserves colours as images/backgrounds',()=>{
 const f=fixture();try{
  const d=f.w.document;
  for(const platform of ['google','facebook','yell','doctify'])for(const tag of ['div','img']){
   const node=d.createElement(tag);node.dataset.tdbLazyPlatform=platform;d.body.append(node);f.w.TDBLazyIconMasks.refresh();
   assert(!node.hasAttribute('src'));assert(!node.style.backgroundImage);assert(f.ios[0].nodes.has(node));
   f.ios[0].fn([{target:node,isIntersecting:false}]);assert(!node.hasAttribute('src'));assert(!node.style.backgroundImage);
   f.ios[0].fn([{target:node,isIntersecting:true}]);assert.match(tag==='img'?node.src:node.style.backgroundImage,new RegExp('tdb-review-'+platform+(platform==='facebook'?'-cutout':'')+'\\.svg'));assert(!node.style.maskImage);
  }
 }finally{f.close()}
});

test('late icon observer never replaces the platform chosen by CMS hydration',()=>{
 const f=fixture();try{
  const d=f.w.document;
  for(const markup of ['','<img src="/facebook.svg">','Direct testimonial']){
   const node=d.createElement('span');node.className='tdb-quotes_source';node.innerHTML=markup;d.body.append(node);f.w.TDBLazyIconMasks.refresh();
   if(!markup){node.dataset.reviewPlatform='Facebook';node.style.backgroundImage='url("/facebook.svg")'}
   const before=node.outerHTML;f.ios[0].fn([{target:node,isIntersecting:true}]);assert.equal(node.outerHTML,before);
  }
  const fallback=d.createElement('span');fallback.className='tdb-quotes_source';d.body.append(fallback);f.w.TDBLazyIconMasks.refresh();f.ios[0].fn([{target:fallback,isIntersecting:true}]);assert.match(fallback.style.backgroundImage,/tdb-review-google.svg/);
 }finally{f.close()}
});

test('arrows are stylesheet-owned and excluded from the lazy mask observer',()=>{
 const f=fixture();try{for(const className of ['carousel-arrow-icon','icon-embed-xxsmall tdb-direct-arrow','tdb-arrow-asset','tdb-mask-icon is-arrow','tdb-announcement-arrow']){
 const node=f.w.document.createElement('span');node.className=className;f.w.document.body.append(node);f.w.TDBLazyIconMasks.refresh();assert(!f.ios[0].nodes.has(node));assert(!node.style.maskImage);
 }}finally{f.close()}
});

test('footer and speaker artwork wait for their own proximity and never fetch the combined sheet',()=>{
 const f=fixture();try{
  const speaker=f.w.document.createElement('button');speaker.setAttribute('data-tdb-compact-speaker','');
  const footer=f.w.document.createElement('a');footer.className='footer1_social-link tdb-footer-facebook';
  f.w.document.body.append(speaker,footer);f.w.TDBLazyIconMasks.refresh();
  assert.equal(speaker.style.getPropertyValue('--tdb-speaker-artwork'),'');assert.equal(footer.style.getPropertyValue('--tdb-footer-artwork'),'');
  f.ios[0].fn([{target:speaker,isIntersecting:true}]);
  assert.match(speaker.style.getPropertyValue('--tdb-speaker-artwork'),/tdb-control-speaker.svg/);
  assert.equal(footer.style.getPropertyValue('--tdb-footer-artwork'),'');
  f.ios[0].fn([{target:footer,isIntersecting:true}]);
  assert.match(footer.style.getPropertyValue('--tdb-footer-artwork'),/tdb-footer-facebook.svg/);
  assert.doesNotMatch(speaker.outerHTML+footer.outerHTML,/home-control-artwork/);
 }finally{f.close()}
});

test('consolidated decorative rows keep artwork deferred and do not create children',()=>{
 const f=fixture();try{
  const stars=f.w.document.createElement('div');stars.className='tdb-quote-decoration-stars tdb-summary-stars';
  const barns=f.w.document.createElement('div');barns.setAttribute('data-tdb-lazy-barns','');
  f.w.document.body.append(stars,barns);f.w.TDBLazyIconMasks.refresh();
  assert(f.ios[0].nodes.has(stars));assert(f.ios[0].nodes.has(barns));
  assert.equal(stars.style.maskImage,'');assert.equal(barns.style.getPropertyValue('--tdb-barns-artwork'),'');
  f.ios[0].fn([{target:stars,isIntersecting:true}]);
  assert.match(stars.style.maskImage,/tdb-review-star.svg/);
  assert.equal((stars.style.maskImage.match(/url\(/g)||[]).length,5);
  assert.equal(barns.style.getPropertyValue('--tdb-barns-artwork'),'');
  f.permit(false);f.ios[0].fn([{target:barns,isIntersecting:true}]);
  assert.equal(barns.style.getPropertyValue('--tdb-barns-artwork'),'');
  f.permit(true);
  assert.match(barns.style.getPropertyValue('--tdb-barns-artwork'),/tdb-barn-window-light.min.svg/);
  assert.equal(stars.childElementCount,0);assert.equal(barns.childElementCount,0);
  assert.equal(barns.style.maskImage,'');
 }finally{f.close()}
});

test('contact masks wait for proximity and reuse the exact footer social artwork',()=>{
 const f=fixture();try{
  for(const kind of ['email','phone','mobile','address','instagram','facebook']){
   const contact=f.w.document.createElement('a');contact.className='tdb-contact-item tdb-contact-'+kind;
   f.w.document.body.append(contact);f.w.TDBLazyIconMasks.refresh();
   assert.equal(contact.style.getPropertyValue('--tdb-contact-artwork'),'');
   f.ios[0].fn([{target:contact,isIntersecting:true}]);
   assert.match(contact.style.getPropertyValue('--tdb-contact-artwork'),new RegExp('tdb-(contact|footer)-'+kind+'\\.svg'));
   assert.equal(contact.childElementCount,0);
   if(['instagram','facebook'].includes(kind)){
    const footer=f.w.document.createElement('a');footer.className='footer1_social-link tdb-footer-'+kind;
    f.w.document.body.append(footer);f.w.TDBLazyIconMasks.refresh();f.ios[0].fn([{target:footer,isIntersecting:true}]);
    assert.equal(contact.style.getPropertyValue('--tdb-contact-artwork'),footer.style.getPropertyValue('--tdb-footer-artwork'));
   }
  }
 }finally{f.close()}
});

test('journey clock, distance and universal globe masks remain deferred and add no child DOM',()=>{
 const f=fixture();try{for(const kind of ['clock','distance','globe']){
  const node=f.w.document.createElement('span');node.dataset.tdbJourneyIcon=kind;f.w.document.body.append(node);f.w.TDBLazyIconMasks.refresh();
  assert.equal(node.style.getPropertyValue('--tdb-journey-icon'),'');
  f.ios[0].fn([{target:node,isIntersecting:true}]);
  assert.match(node.style.getPropertyValue('--tdb-journey-icon'),new RegExp('tdb-(clock-small-1px|journey-small-1px|globe)\\.svg'));
  assert.equal(node.childElementCount,0);
 }}finally{f.close()}
});

function serviceIcons(f) {
 const d=f.w.document,calculator=d.createElement('div');
 calculator.className='tdb-calculator-icon';calculator.setAttribute('data-calculator-icon','');
 const faqs=['price','clock','diamond','address'].map(kind=>{
  const n=d.createElement('div');n.className='tdb-service-faq-heading';n.dataset.tdbNativePseudoIcon=kind;return n;
 });
 d.body.append(calculator,...faqs);
 return [calculator,...faqs];
}

test('calculator and service FAQs release their exact native artwork only at consent and proximity',()=>{
 const f=fixture({allowed:false});try{
  const nodes=serviceIcons(f),properties=['--tdb-calculator-artwork',...Array(4).fill('--tdb-pseudo-artwork')];
  const artwork=()=>nodes.map((n,i)=>n.style.getPropertyValue(properties[i]));
  f.w.TDBLazyIconMasks.refresh();assert(nodes.every(n=>!f.ios[0].nodes.has(n)));
  f.permit(true);assert(nodes.every(n=>f.ios[0].nodes.has(n)));assert(artwork().every(x=>!x));
  f.ios[0].fn([{target:nodes[0],isIntersecting:false}]);assert(artwork().every(x=>!x));
  f.ios[0].fn([{target:nodes[0],isIntersecting:true}]);assert.match(artwork()[0],/6aeddc65306b47b79562b402_tdb-calculator-small-1px.svg/);assert(artwork().slice(1).every(x=>!x));
  f.permit(false);f.ios[0].fn(nodes.slice(1).map(target=>({target,isIntersecting:true})));assert(artwork().slice(1).every(x=>!x));
  f.permit(true);
  for(const [i,file] of ['6aeddc626c94d2870769382e_tdb-price-small-1px.svg','6aeddc636dd65bf4f700d266_tdb-clock-small-1px.svg','6aeddc640ce35bc2256782dc_tdb-diamond-small-1px.svg','6aeddc65afde554858c3126e_tdb-location-small-1px.svg'].entries())assert(artwork()[i+1].endsWith(file+'")'));
  assert(nodes.every(n=>n.childElementCount===0&&!n.style.width&&!n.style.height&&!n.style.maskImage));
  const location=f.w.document.createElement('div');location.className='tdb-location-icon';location.dataset.tdbNativePseudoIcon='address';f.w.document.body.append(location);f.w.TDBLazyIconMasks.refresh();f.ios[0].fn([{target:location,isIntersecting:true}]);assert.match(location.style.getPropertyValue('--tdb-pseudo-artwork'),/tdb-contact-address.svg/);
  const inline=f.w.document.createElement('span');inline.setAttribute('data-calculator-icon','');inline.innerHTML='<svg></svg>';f.w.document.body.append(inline);f.w.TDBLazyIconMasks.refresh();assert(!f.ios[0].nodes.has(inline),'legacy inline calculator SVGs are already request-free');
 }finally{f.close()}
});

test('service icons retain the no-observer fallback and discard removed or disposed targets',()=>{
 const fallback=fixture({observer:false});try{const nodes=serviceIcons(fallback);fallback.w.TDBLazyIconMasks.refresh();assert(nodes.every(n=>n.getAttribute('style').includes('.svg')))}finally{fallback.close()}
 const f=fixture();try{
  const [calculator,faq]=serviceIcons(f);f.w.TDBLazyIconMasks.refresh();calculator.remove();f.ios[0].fn([{target:calculator,isIntersecting:true}]);assert.equal(calculator.getAttribute('style'),null);
  f.w.TDBLazyIconMasks.destroy();f.ios[0].fn([{target:faq,isIntersecting:true}]);assert.equal(faq.getAttribute('style'),null);
 }finally{f.close()}
});

test('critical and shared CSS both suppress the initial native service icon URLs without owning geometry',()=>{
 const postcss=require('postcss');
 for(const file of ['dist/tdb-ui-critical.css','dist/tdb-ui.css']){
  const rules=[];postcss.parse(fs.readFileSync(file,'utf8')).walkRules(rule=>{if(rule.selector.includes('[data-calculator-icon]')||rule.selector.includes('.tdb-service-faq-heading[data-tdb-native-pseudo-icon]'))rules.push(rule)});
  assert.equal(rules.length,2,file);
  for(const rule of rules){
   assert.equal(rule.parent.type,'root');assert.match(rule.selector,/:root\.w-mod-js/, 'native icons remain available without JavaScript');
   assert.deepEqual(rule.nodes.map(n=>n.prop),['-webkit-mask-image','mask-image']);
   for(const declaration of rule.nodes){assert.doesNotMatch(declaration.value,/url\(/);assert.match(declaration.value,/var\(--tdb-(calculator|pseudo)-artwork,linear-gradient\(transparent,transparent\)\)/)}
  }
 }
});
