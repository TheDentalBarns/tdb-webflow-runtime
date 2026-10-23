const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('compact pulse owners remain visible and interactive during all control states',()=>{
 const dom=new JSDOM('<style>'+fs.readFileSync('src/styles/tdb-control-effects.css','utf8')+'</style><section><button data-tdb-pulse="true" data-tdb-compact-pulse><span data-tdb-loading-content>Arrow</span></button></section>');
 try {const w=dom.window,button=w.document.querySelector('button'),section=button.parentElement;
 for(const target of [button,section])for(const name of ['aria-busy','aria-expanded','data-tdb-loading']){
  target.setAttribute(name,'true');assert.equal(w.getComputedStyle(button).opacity,'1');assert.equal(w.getComputedStyle(button).pointerEvents,'auto');target.removeAttribute(name);
 }
 button.setAttribute('data-tdb-pulse','false');assert.equal(w.getComputedStyle(button).opacity,'1');assert.equal(w.getComputedStyle(button).pointerEvents,'auto');
 }finally{dom.window.close()}
});

