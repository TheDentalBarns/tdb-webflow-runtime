const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../src/navbar/nav-surfaces.js'), 'utf8');
function fixture(width = 390, transparent = true) {
  let changes = 0, sync;
  function element(names = []) {
    const classes = new Set(names);
    return {classes, classList:{contains:n=>classes.has(n),toggle(n,on){changes++;on?classes.add(n):classes.delete(n);}},setAttribute(){}};
  }
  const root=element(),nav=element(),glass=element(),menu=element(),button=element(),toggle=element();
  nav.getAttribute=()=>transparent?'true':null;
  nav.querySelector=s=>({'.tdb-nav-bar-glass':glass,'.navbar10_menu':menu,'.w-nav-button':button}[s] || (s==='.w-dropdown-toggle.w--open' && toggle.classes.has('w--open') ? toggle : null));
  nav.querySelectorAll=()=>[toggle];
  const mobile={matches:width<=767,addEventListener(){}},desktop={matches:width>=992,addEventListener(){}};
  vm.runInNewContext(source,{document:{documentElement:root,querySelector:()=>nav},matchMedia:s=>s.includes('max')?mobile:desktop,MutationObserver:class{constructor(fn){sync=fn}observe(){}}});
  return {root,nav,glass,menu,button,toggle,mobile,desktop,sync:()=>sync(),changes:()=>changes};
}
test('mobile clear, peek, open, close and top clear-cycle preserve surface states',()=>{
  const f=fixture();f.root.classes.add('tdb-nav-at-top');f.sync();
  assert.equal(f.glass.classes.size,0);assert(f.menu.classes.has('is-menu-clear'));
  f.root.classes.clear();f.nav.classes.add('is-trans');f.sync();assert(f.glass.classes.has('is-nav-frosted'));
  f.button.classes.add('w--open');f.sync();assert(f.glass.classes.has('is-nav-solid'));assert(f.menu.classes.has('is-menu-solid'));
  f.button.classes.clear();f.sync();assert(f.glass.classes.has('is-nav-frosted'));assert(f.menu.classes.has('is-menu-frosted'));
  f.root.classes.add('tdb-nav-clear-cycle');f.button.classes.add('w--open');f.sync();assert.equal(f.glass.classes.size,0);assert(f.menu.classes.has('is-menu-solid'));
});
test('desktop uses mobile frosting and solid opening while tablet retains native appearance',()=>{
  const f=fixture(1440);assert.equal(f.glass.classes.size,0);
  f.nav.classes.add('is-trans');f.sync();assert(f.glass.classes.has('is-nav-frosted'));
  f.toggle.classes.add('w--open');f.sync();assert(f.glass.classes.has('is-nav-solid'));
  f.toggle.classes.clear();f.sync();assert(f.glass.classes.has('is-nav-frosted'));
  f.nav.classes.clear();f.sync();assert.equal(f.glass.classes.size,0);
  f.desktop.matches=false;f.sync();assert.equal(f.glass.classes.size,0);assert.equal(f.menu.classes.size,0);
});
test('base desktop and mobile preserve distinct defaults and repeated notifications do not write styles',()=>{
  const f=fixture(1440,false);assert(f.glass.classes.has('is-nav-frosted'));
  const n=f.changes();f.sync();f.sync();assert.equal(f.changes(),n);
  f.desktop.matches=false;f.mobile.matches=true;f.sync();assert.equal(f.glass.classes.size,0);
  f.button.classes.add('w--open');f.sync();assert(f.glass.classes.has('is-nav-solid'));
});
