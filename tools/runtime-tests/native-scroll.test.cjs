const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('src/runtime/immediate-runtime-batch.js','utf8').split('  function loadScript')[0]+'})();';
function setup(mobile=true){
 const dom=new JSDOM('<header style="position:fixed"></header><a id="link" href="#section">Go</a><section id="section"></section><a id="vip" href="#VIP">VIP</a><section id="VIP"></section>',{url:'https://dentalbarns.webflow.io/',runScripts:'outside-only'});
 const w=dom.window,calls=[],removed=[];let restored=0,reduced=false;
 const media={matches:mobile,addEventListener(t,fn){this.change=fn;}};
 w.matchMedia=q=>q.includes('max-width')?media:{matches:reduced};
 w.Webflow={push:fn=>fn(),require:()=>({ready(){restored++;}}),env:()=>false};w.jQuery=()=>({off:name=>removed.push(name)});w.scrollTo=o=>calls.push(o);
 w.document.querySelector('header').getBoundingClientRect=()=>({height:80});
 for(const el of w.document.querySelectorAll('section')){el.getClientRects=()=>[1];el.getBoundingClientRect=()=>({top:2000,height:400});}w.eval(source);
 function click(id='link',opts={}){const e=new w.MouseEvent('click',{bubbles:true,cancelable:true,...opts});w.document.getElementById(id).dispatchEvent(e);return e;}
 return {w,calls,removed,media,click,restoreCount:()=>restored,reduce:()=>reduced=true};
}
test('native animation, header offset, history and keyboard focus',()=>{const s=setup();s.click();assert.deepEqual(s.removed,['click.wf-scroll']);assert.equal(s.calls[0].top,1920);assert.equal(s.calls[0].behavior,'smooth');assert.equal(s.w.location.hash,'#section');assert.equal(s.w.document.activeElement.id,'section');assert.equal(s.w.document.activeElement.hasAttribute('tabindex'),false);});
test('rapid presses retarget with no duplicate history',()=>{const s=setup();s.click();s.click();assert.equal(s.calls.length,2);assert.equal(s.w.history.length,2);});
test('reduced motion is instant',()=>{const s=setup();s.reduce();s.click();assert.equal(s.calls[0].behavior,'instant');});
test('desktop unchanged and breakpoint restores Webflow',()=>{const s=setup(false);s.click();assert.equal(s.calls.length,0);assert.equal(s.removed.length,0);s.media.matches=true;s.media.change();s.click();assert.equal(s.calls.length,1);s.media.matches=false;s.media.change();assert.equal(s.restoreCount(),1);});
test('VIP, tabs, modified, external and cancelled clicks excluded',()=>{const s=setup();s.click('vip');s.click('link',{ctrlKey:true});const a=s.w.document.getElementById('link');a.className='w-tab-link';s.click();a.className='';a.href='/location#section';s.click();a.href='#section';a.addEventListener('click',e=>e.preventDefault());s.click();assert.equal(s.calls.length,0);});
test('centred destination supported',()=>{const s=setup();s.w.document.getElementById('section').dataset.scroll='mid';s.click();assert.equal(s.calls[0].top,1776);});
