const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../../src/reviews/review-drawer.js'), 'utf8');
const section = (from, to) => source.slice(source.indexOf(from), source.indexOf(to));

test('review close holds the page lock for its width-based panel duration',()=>{
  for(const [width,expected] of [[390,400],[1440,784],[3840,950]]){
    const styles=new Map(),callbacks=[];let unlocked=false;
    const c=vm.createContext({window:{innerWidth:width},matchMedia:()=>({matches:width>=992}),
      overlay:{hidden:false,style:{setProperty:(key,value)=>styles.set(key,value)},classList:{remove(){},add(){},contains:()=>width>=768}},
      closing:false,vipTimer:0,closeTimer:0,drag:null,chrome:null,lock:null,sourceTrigger:null,dismissAnimations:[],
      clearTimeout(){},setTimeout(fn,ms){callbacks.push({fn,ms})},cancelSlide(){},hideQuoteText(){},rememberScroll(){},animateDismiss(){},releaseChrome(){},unlockPage(){unlocked=true},
      document:{querySelector:()=>null,querySelectorAll:()=>[]},scrollY:0,
    });
    vm.runInContext(section('  function carouselDuration','  function chooseReviews')+section('  function syncDrawerDuration','  async function open')+section('  function close(){','  // Embedded previews'),c);
    c.close();assert.equal(styles.get('--rv-duration'),expected+'ms');
    assert.equal(callbacks[0].ms,expected);assert.equal(unlocked,false);assert.equal(c.overlay.hidden,false);
    callbacks[0].fn();assert.equal(unlocked,true);assert.equal(c.overlay.hidden,true);
  }
});

function navigation(index = 0) {
  const context = vm.createContext({
    matchMedia: () => ({matches:false}), window: {}, document: { activeElement: null },
    position: {}, prev: {}, next: {}, closeBtn: { focus() {} },
    list: Array.from({ length: 5 }, (_,i) => ({id:String(i)})), index, transition: null, drag: null,
    closing: false, current: null,
  });
  vm.runInContext(`
    ${section('  function carouselDuration', '  function chooseReviews')}
    const track={children:[],append(node){this.children.push(node)}};
    const scrollPositions=new Map();
    const getComputedStyle=node=>({transform:String(node.x||0)});
    class DOMMatrixReadOnly{constructor(value){this.m41=Number(value)||0;}}
    function hideQuoteText(){}
    function makeSlide(record){return slide(record.id);}
    function slide(id) {
      return { dataset:{reviewId:id}, setAttribute(){}, contains: () => false, animate(frames,options) {
        let resolve;
        const finished = new Promise(done => resolve = done);
        return { finished, finish: resolve, cancel: resolve, frames, options };
      }};
    }
    current = slide(String(index));track.append(current);
    function setCurrent(value) { current = value;track.children=[value]; updatePosition(); }
    function beginSlide(direction) {
      if (transition || !list[index + direction]) return null;
      const to=slide(String(index+direction));to.x=direction*390;track.append(to);
      return transition = { from: current, to, direction,
        width: 390, offset: 0, animations: [], settling: false };
    }
    ${section('  function updatePosition', '  function cancelSlide')}
    ${section('  async function settle', '  function refresh')}
    updatePosition();
  `, context);
  return context;
}

async function finish(context) {
  const pending = context.transition;
  pending?.animations.forEach(animation => animation.finish());
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test('rapid forward presses update the fallback counter immediately and each advances once', async () => {
  const n = navigation();
  n.step(1);
  assert.equal(n.position.textContent, '2 / 5');
  assert.equal(n.prev.disabled, false);
  n.step(1);
  n.step(1);
  assert.equal(n.position.textContent, '4 / 5');
  await finish(n);
  assert.equal(n.index, 3);
  assert.equal(n.transition, null);
});

test('the first forward transition can be reversed immediately', async () => {
  const n = navigation();
  n.step(1);
  assert.equal(n.prev.disabled, false);
  n.step(-1);
  assert.equal(n.position.textContent, '1 / 5');
  assert.equal(n.prev.disabled, true);
  await finish(n);
  assert.equal(n.index, 0);
});

test('a rapid tap during a cancelled swipe does not commit that swipe', async () => {
  const n = navigation(1);
  n.beginSlide(1);
  n.settle(false);
  n.step(1);
  assert.equal(n.position.textContent, '3 / 5');
  await finish(n);
  assert.equal(n.index, 2);
});

test('last-review controls change at transition start and allow an immediate reverse', async () => {
  const n = navigation(3);
  n.step(1);
  assert.equal(n.next.disabled, true);
  n.step(-1);
  assert.equal(n.next.disabled, false);
  await finish(n);
  assert.equal(n.index, 3);
});

 test('an interrupted drawer transition keeps its rendered positions and uses page width timing',async()=>{
  const n=navigation();n.window.innerWidth=1440;n.matchMedia=()=>({matches:true});n.step(1);
  n.transition.from.x=-120;n.transition.to.x=270;n.step(1);
  assert.equal(n.index,0,'no forced completion before the retarget');
  assert.equal(n.transition.animations[0].frames[0].transform,'translate3d(-120px,0,0)');
  assert.equal(n.transition.animations[1].frames[0].transform,'translate3d(270px,0,0)');
  assert.equal(n.transition.animations[0].options.duration,784);
  await finish(n);assert.equal(n.index,2);
 });
