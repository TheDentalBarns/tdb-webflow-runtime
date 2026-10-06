const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

test('OS reduced motion leaves drawer, filter panel and both icon morphs animated', async () => {
  const dom = new JSDOM(`<button id="opener">Reviews</button><main data-tdb-drawer>
    <div data-tdb-drawer-backdrop></div><section data-tdb-drawer-panel>
    <button data-tdb-drawer-close>Close reviews</button><button id="filter">
    <svg viewBox="0 0 24 24"><line data-tdb-filter-line="top" x1="2" x2="22" y1="6" y2="6" style="transform:none"/>
    <line data-tdb-filter-line="middle" x1="6" x2="18" y1="12" y2="12" style="transform:none"/>
    <line data-tdb-filter-line="bottom" x1="9" x2="15" y1="18" y2="18" style="transform:none"/></svg></button>
    <section id="filters" class="is-closed"><h2 tabindex="-1">Filters</h2></section></section></main>`,
    {url:'https://dentalbarns.webflow.io/', runScripts:'outside-only', pretendToBeVisual:true});
  const w = dom.window, animations = [];
  const nativeMatchMedia = query => ({matches:query.includes('prefers-reduced-motion') || query.includes('min-width'), addEventListener(){}, removeEventListener(){}});
  w.matchMedia = nativeMatchMedia;
  w.DOMMatrix = class {constructor(){this.a=1;}};
  const svg = w.document.querySelector('svg');
  Object.defineProperty(svg, 'viewBox', {value:{baseVal:{x:0,y:0,width:24,height:24}}});
  w.Element.prototype.animate = function(frames, timing) {
    const animation = {finished:Promise.resolve(), cancel(){}, effect:{target:this, getTiming:()=>timing, getKeyframes:()=>frames}};
    animations.push(animation);return animation;
  };
  try {
    for (const name of ['motion-policy','motion','drawer','filters']) w.eval(read('dist/tdb-'+name+'.js'));
    assert.equal(w.matchMedia, nativeMatchMedia, 'do not spoof the browser preference');
    assert.equal(w.matchMedia('(prefers-reduced-motion: reduce)').matches, true);
    assert.equal(w.TDBMotion.reduced.matches, false);
    assert.equal(w.document.documentElement.dataset.tdbMotion, 'full');
    const root=w.document.querySelector('[data-tdb-drawer]'), panel=root.querySelector('[data-tdb-drawer-panel]');
    const drawer=w.TDBDrawer.mount(root);
    await drawer.open(w.document.querySelector('#opener'));
    assert.equal(drawer.state,'open');
    await drawer.close();
    assert.equal(drawer.state,'closed');
    const drawerMoves=animations.filter(a=>a.effect.target===panel);
    assert.equal(drawerMoves.length,2);
    assert(drawerMoves.every(a=>a.effect.getTiming().duration>=650));
    const filterPanel=w.document.querySelector('#filters'), toggle=w.document.querySelector('#filter');
    const filters=w.TDBFilters.mount(filterPanel,{toggle,heading:filterPanel.querySelector('h2')});
    toggle.click();assert.equal(filters.isOpen,true);
    await filters.requestClose();assert.equal(filters.isOpen,false);
    const panelMoves=animations.filter(a=>a.effect.target===filterPanel);
    assert.equal(panelMoves.length,2);
    assert(panelMoves.every(a=>a.effect.getTiming().duration>=650));
    const morphs=animations.filter(a=>a.effect.target.hasAttribute('data-tdb-filter-line'));
    assert.equal(morphs.length,6);
    assert(morphs.every(a=>a.effect.getTiming().duration===300));
    filters.destroy();drawer.destroy();
  } finally {w.close();}
});

test('full-motion loading CSS explicitly keeps the shared spinner rotating', () => {
  const css=read('dist/tdb-ui.css');
  assert.match(css,/html\[data-tdb-motion='full'\][^{]+data-tdb-loading-indicator[^}]+animation: tdbControlSpin 1s linear infinite !important/);
  assert.doesNotMatch(css, /prefers-reduced-motion/);
});
