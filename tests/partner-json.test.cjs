const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
test('partner JSON keeps caller order, shares one request, and strips active rich-text content',async()=>{
 const w=new JSDOM('<div id="host"></div>',{url:'https://dentalbarns.webflow.io',runScripts:'outside-only'}).window;
 try{let calls=0;const asset='https://cdn.prod.website-files.com/67837ee85ee175873126e461/';
 w.fetch=async(url,opts)=>{calls++;assert.match(url,/workers\.dev\/tdb-content\/v1\/partners\.json$/);assert.equal(opts.credentials,'omit');return Response.json({version:1,feed:'partners',checkedAt:Date.now(),partners:[1,2].map(i=>({id:'id'+i,slug:'p'+i,name:'Partner '+i,body:'<p onclick="bad()">Safe <strong>copy</strong></p><script>bad()</script><img src="https://evil.invalid/x"><a href="javascript:bad()">link</a>',logo:asset+i+'.svg',image:asset+i+'.webp',imageAlt:'',variants:[],link:'https://example.com/'+i}))})};
 w.eval(fs.readFileSync('src/logo-marquee/partner-card.js','utf8'));
 const items=[2,1].map(i=>{const n=w.document.createElement('div');n.dataset.itemId='p'+i;return n});
 const result=await w.TDBPartnerCard.prepare(w.document.querySelector('#host'),items);
 assert.deepEqual(Array.from(result.sources,n=>n.querySelector('.text-style-tagline-restored').textContent),['Partner 2','Partner 1']);
 for(const source of result.sources){const body=source.querySelector('.tdb-partner-copy-body');assert.equal(body.querySelectorAll('script,img,[onclick],a[href]').length,0);assert.equal(body.querySelector('strong').textContent,'copy');}
 await w.TDBPartnerCard.prepare(w.document.querySelector('#host'),items);assert.equal(calls,1);
 }finally{w.close()}
});
