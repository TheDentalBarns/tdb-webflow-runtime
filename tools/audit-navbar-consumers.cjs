const {JSDOM}=require('jsdom');
const base='https://dentalbarns.webflow.io';
const paths=["/partner-content","/awards-component-review","/review-pages","/reviews","/review-content","/dental-cost-calculator","/five-senses-experience","/smile-gallery","/privacy-policy","/careers","/vip-west-end","/vip-sanctuary","/vip-smiles","/vip-awards","/vip-christmas","/vip-posh","/vip-inpractice","/vip","/search","/first-visit","/about-us","/contact","/blog","/dental-cost-lichfield","/location","/404","/401","/"];
(async()=>{
 const home=await (await fetch(base)).text();
 const d=new JSDOM(home).window.document;
 for(const a of d.querySelectorAll('a[href]')){const u=new URL(a.href,base);if(u.origin===base&&/^\/(services|treatments|areas|post)\//.test(u.pathname))paths.push(u.pathname);}
 const unique=[...new Set(paths)], rows=[];
 for(let i=0;i<unique.length;i+=4){
  rows.push(...await Promise.all(unique.slice(i,i+4).map(async path=>{
   const response=await fetch(base+path,{signal:AbortSignal.timeout(30000)});
   const dom=new JSDOM(await response.text());
   const hooks=[...dom.window.document.querySelectorAll('[fs-scrolldisable-element]')].map(n=>({tag:n.tagName,classes:n.className,hook:n.getAttribute('fs-scrolldisable-element'),native:n.hasAttribute('data-tdb-navbar-native')}));
   dom.window.close();return {path,status:response.status,hooks};
  })));
 }
 console.log('AUDIT '+JSON.stringify(rows));
 console.log('LEGACY '+JSON.stringify(rows.filter(r=>r.hooks.some(h=>h.hook!=='preserve'&&!h.native))));
})().catch(e=>{console.error(e);process.exitCode=1;});
