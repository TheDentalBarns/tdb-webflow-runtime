const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const { css, readProfile } = require('../tools/runtime-build/motion-profile.cjs');
const { linkValue } = require('../tools/runtime-build/motion-css.cjs');
const read = file => fs.readFileSync(file, 'utf8');
function fixture(pace = 1, character = 'current', width = 390, height = 844) {
  const dom = new JSDOM('<div id="panel"></div>', {runScripts:'outside-only'}), w = dom.window;
  Object.defineProperties(w, {innerWidth:{value:width},innerHeight:{value:height}});
  w.matchMedia = query => ({matches: query.includes('min-width:992px') && width >= 992,addEventListener(){}});
  const config = {...readProfile(),pace,character};
  const source = read('src/shared/motion-profile.js').replace('__TDB_MOTION_PROFILE__', JSON.stringify(config));
  w.eval(source);
  w.eval(read('src/shared/motion.js'));
  w.eval(read('src/shared/panel-motion.js'));
  return {w, config, source, close:()=>w.close()};
}
test('baseline and slower profiles preserve width/height curves and scale caps once', () => {
  for (const pace of [1,1.25,1.5]) for (const width of [390,768,991,992,1440,2560]) {
    const f = fixture(pace,'current',width);
    try {
      const expected = width < 992 ? 400 : Math.round(Math.min(950,Math.max(650,400*Math.sqrt(width/375))));
      assert.equal(f.w.TDBMotion.duration(width), Math.round(expected*pace));
      assert.equal(f.w.TDBMotion.defaults.fadeOut,Math.round(120*pace));
      assert.equal(f.w.TDBMotion.defaults.fadeIn,Math.round(350*pace));
      assert.equal(f.w.TDBMotion.defaults.tickerRapid,Math.round(160*pace));
      assert.equal(f.w.TDBMotion.reviews.fade,Math.round(400*pace));
      assert.equal(f.w.TDBMotion.carousel.previousDelay,Math.round(140*pace));
      for(const height of [320,375,768,844,1200,2400]) {
        const expectedHeight = Math.round(Math.min(950,Math.max(400,400*Math.sqrt(height/375))));
        assert.equal(f.w.TDBPanelMotion.duration(height),Math.round(expectedHeight*pace));
      }
    } finally {f.close();}
  }
});
test('vertical close cleanup follows its measured cycle and profile remains immutable', () => {
  const f=fixture(1.5);
  try {
    const panel=f.w.document.getElementById('panel'), cycle=f.w.TDBPanelMotion.bind(panel,'--test');
    assert.equal(panel.style.getPropertyValue('--test-duration'),'900ms');
    assert.equal(cycle.cleanup,950);
    const first=f.w.TDBMotionProfile;
    f.w.eval(f.source.replace('"pace":1.5','"pace":1'));
    assert.equal(f.w.TDBMotionProfile,first);
    assert(Object.isFrozen(first));
    assert.equal(first.elapsed(150),100,'released travel follows the same path over a longer interval');
    assert.equal(first.physics.coast,4.2);
  }finally{f.close();}
});
test('one character selection supplies matching JS and CSS easing without changing current curves',()=>{
  const current=fixture(),soft=fixture(1.25,'soft');
  try {
    assert.equal(current.w.TDBMotionProfile.easing('travel','ease'),'ease');
    assert.equal(current.w.TDBMotionProfile.easing('release','cubic-bezier(.22,.61,.36,1)'),'cubic-bezier(.22,.61,.36,1)');
    assert.equal(soft.w.TDBMotion.reviews.easing,soft.config.characters.soft.travel);
    assert.equal(soft.w.TDBPanelMotion.easing,soft.config.characters.soft.panel);
    const generated=css(soft.config);
    assert(generated.includes('--tdb-motion-pace: 1.25;'));
    for(const [role,curve] of Object.entries(soft.config.characters.soft))
      assert(generated.includes(`--tdb-motion-ease-${role}: ${curve};`));
    assert(!css(current.config).includes('--tdb-motion-ease-'));
  }finally{current.close();soft.close();}
});
test('CSS migration preserves measured duration variables, discrete changes and linear progress',()=>{
  const value='transform var(--tdb-parallax-duration,.4s) ease, opacity .12s ease-out .12s, visibility 0s linear 0s';
  const linked=linkValue(value,'travel');
  assert(linked.includes('var(--tdb-parallax-duration,calc(.4s * var(--tdb-motion-pace,1)))'));
  assert(!linked.includes('calc(var(--tdb-parallax-duration'),'measured durations must not be scaled twice');
  assert(linked.includes('visibility 0s linear 0s'));
  assert.equal(linkValue(linked,'travel'),linked,'migration is idempotent');
  assert.equal(linkValue('overflow 1ms allow-discrete'),'overflow 1ms allow-discrete');
  assert.equal(linkValue('var(--tdb-peek-ease)'), 'var(--tdb-peek-ease)');
  assert(linkValue('var(--tdb-peek-ease,ease-out)').startsWith('var(--tdb-peek-ease,var('));
});

test('native projection handles minified adjacent functions and copies only timing properties',()=>{
  const {project}=require('../tools/runtime-build/native-motion.cjs');
  const postcss=require('postcss');
  const output=project('@media(max-width:767px){.card::after{color:red;transition:opacity var(--tdb-parallax-duration,.4s)ease,transform .5s cubic-bezier(.4,0,.2,1);animation:spin 1s linear .12s infinite}}');
  const tree=postcss.parse(output), declarations={};
  tree.walkDecls(d=>{assert(/^(transition|animation)-(duration|delay|timing-function)$/.test(d.prop));declarations[d.prop]=d.value;});
  assert.equal(declarations['transition-duration'],'var(--tdb-parallax-duration,calc(.4s * var(--tdb-motion-pace,1))),calc(.5s * var(--tdb-motion-pace,1))');
  assert.equal(declarations['animation-timing-function'],'linear');
  assert(output.includes('@media(max-width:767px)'));
  assert(!output.includes('color:'));
});

test('startup publishes matching CSS tokens before deferred styles arrive',()=>{
  const f=fixture(1.25,'soft');
  try{
    assert.equal(f.w.document.documentElement.style.getPropertyValue('--tdb-motion-pace'),'1.25');
    assert.equal(f.w.document.documentElement.style.getPropertyValue('--tdb-motion-ease-panel'),f.config.characters.soft.panel);
  }finally{f.close();}
});
test('profile generation is tied to the existing startup entry and generated CSS',()=>{
  const targets=require('../tools/runtime-build/targets.cjs');
  assert(targets['dist/tdb-start.min.js'].includes('src/shared/motion-profile.js'));
  assert.equal(read('src/styles/tdb-motion-profile.css').replace(/\r\n/g,'\n'),css());
  assert(!read('src/shared/motion-profile.js').includes('getComputedStyle('));
  assert(!read('src/shared/motion-profile.js').includes('requestAnimationFrame('));
});
