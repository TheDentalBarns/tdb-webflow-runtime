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
// DD region ownership and nested scrolling are covered in shared-dd-motion.test.cjs.
