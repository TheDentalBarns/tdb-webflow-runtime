const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('article-only partners retain per-partner links without photos, headings or website CTA', async () => {
  const w = new JSDOM('<div id="host"></div>', { url: 'https://dentalbarns.webflow.io/blog', runScripts: 'outside-only' }).window;
  try {
    const asset = 'https://cdn.prod.website-files.com/67837ee85ee175873126e461/';
    w.fetch = async () => Response.json({version:1, feed:'partners', checkedAt:Date.now(), partners:[
      {id:'id-a',slug:'press-a',name:'Publisher A',body:'<p><a href="https://a.example/one">First article</a></p><p><a href="https://a.example/two">Second article</a></p>',logo:asset+'a.svg',image:asset+'a.svg',imageAlt:'A',link:'https://a.example/'},
      {id:'id-b',slug:'press-b',name:'Publisher B',body:'<p><a href="https://b.example/story" onclick="bad()">Another article</a></p><script>bad()</script>',logo:asset+'b.svg',image:asset+'b.svg',imageAlt:'B',link:'https://b.example/'},
      {id:'id-brand',slug:'brand',name:'Brand',body:'<p>Our partner <a href="https://brand.example/story">story</a></p>',logo:asset+'c.svg',image:asset+'c.webp',imageAlt:'C',link:'https://brand.example/'}
    ]});
    w.eval(fs.readFileSync('src/logo-marquee/partner-card.js','utf8'));
    const items=['id-a','id-b','id-brand'].map(id=>{const n=w.document.createElement('div');n.dataset.itemId=id;return n;});
    const prepared=await w.TDBPartnerCard.prepare(w.document.querySelector('#host'),items);
    const [a,b,brand]=prepared.sources;
    assert.deepEqual(Array.from(a.querySelectorAll('a'),n=>n.href),['https://a.example/one','https://a.example/two']);
    assert.deepEqual(Array.from(b.querySelectorAll('a'),n=>n.href),['https://b.example/story']);
    for(const n of [a,b]){
      assert.equal(n.querySelectorAll('img,.text-style-tagline-restored,[data-tdb-partner-link],script,[onclick]').length,0);
      assert.ok(n.querySelector('[data-tdb-partner-articles][data-tdb-partner-name]'));
      assert.ok(Array.from(n.querySelectorAll('a')).every(a=>a.target==='_blank'&&a.rel==='noopener noreferrer'));
    }
    assert.ok(brand.querySelector('img'));
    assert.equal(brand.querySelector('[data-tdb-partner-link]').href,'https://brand.example/');
  } finally { w.close(); }
});
