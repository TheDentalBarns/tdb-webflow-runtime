const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.resolve(__dirname,'../../src/smile-gallery/home-smile-gallery.js'),'utf8');
function fixture(t,page='677cf86df9952f978d94d8a9'){
 const dom=new JSDOM('<html data-wf-page="'+page+'"><body><section class="section_smile-gallery"><div class="testimonial15_slide-content"><div class="testimonial15_content-right">Old introduction</div><div class="testimonial15_client-image-wrapper"><div data-tdb-smile-slider><div class="swiper"><a class="layout423_card smile" data-tdb-smile-open>CMS case</a></div><button class="slider-arrow">Next</button></div></div><div class="testimonial15_content-right">Old treatment copy</div></div></section></body></html>',{runScripts:'outside-only'});
 t.after(()=>dom.window.close());return dom.window;
}
test('homepage becomes introduction, unchanged CMS gallery, one standard gallery link',t=>{
 const w=fixture(t),doc=w.document,slider=doc.querySelector('[data-tdb-smile-slider]'),card=slider.querySelector('a'),before=slider.outerHTML;
 w.eval(source);doc.dispatchEvent(new w.Event('DOMContentLoaded'));
 const layout=doc.querySelector('.testimonial15_slide-content');assert.equal(layout.children.length,3);
 assert.equal(layout.children[0].querySelector('h2').textContent,'See what’s possible for your smile.');
 assert.equal(layout.children[0].querySelector('p').textContent,'Explore real patient transformations, with treatment details, time and costs alongside each case.');
 assert.equal(slider.outerHTML,before);assert.equal(slider.querySelector('a'),card);
 assert.equal(layout.children[2].querySelectorAll('a').length,1);assert.equal(layout.children[2].querySelector('a').getAttribute('href'),'/smile-gallery');assert.ok(layout.children[2].querySelector('.button.is-icon.is-secondary'));
 w.eval(source);doc.dispatchEvent(new w.Event('DOMContentLoaded'));assert.equal(doc.querySelectorAll('.tdb-home-smile-link').length,1);
});
test('the shared gallery on other pages is untouched',t=>{
 const w=fixture(t,'another-page'),before=w.document.body.innerHTML;w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));assert.equal(w.document.body.innerHTML,before);
});
