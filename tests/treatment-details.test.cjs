const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

function fixture() {
  const dom = new JSDOM(
    `<div data-tdb-treatment-layout>
    <div data-tdb-treatment data-tdb-treatment-postage></div>
    <section data-tdb-treatment-details><div class="tdb-treatment-viewport"><div class="tdb-treatment-wrapper">
    ${[0, 1, 2].map((i) => `<article id="item-${i}"><h3 class="tdb-treatment-title">Treatment ${i}</h3><div data-tdb-service-copy><p>Description ${i}</p><a href="/treatments/${i}">Read more</a></div></article>`).join('')}
    </div></div></section></div>`,
    { runScripts: 'outside-only' },
  );
  const w = dom.window,
    d = w.document;
  w.Element.prototype.animate = function (frames) {
    this.dataset.opacity = frames.at(-1).opacity;
    return { cancel() {} };
  };
  d.querySelector('.tdb-treatment-viewport').getBoundingClientRect = () => ({ left: 30 });
  w.eval(fs.readFileSync('src/sliders/treatment-details.js', 'utf8'));
  const root = d.querySelector('[data-tdb-treatment]');
  const original = [...d.querySelector('.tdb-treatment-wrapper').children];
  function slide(value, left, width, duplicate = false, active = false) {
    const node = d.createElement('div');
    node.className =
      (duplicate ? 'swiper-slide-duplicate ' : '') + (active ? 'swiper-slide-active' : '');
    node.innerHTML = '<div data-tdb-service-copy class="is-visible"></div>';
    node.getBoundingClientRect = () => ({ left, right: left + width, width });
    return { value, node };
  }
  const slides = [
    slide(2, -220, 230, true),
    slide(0, 30, 500, false, true),
    slide(1, 550, 230),
    slide(2, 800, 230),
    slide(0, 1050, 500, true),
  ];
  return { dom, w, d, root, original, slides, api: w.TDBTreatmentDetails.prepare(root) };
}

test('text mirrors rendered widths and translation without changing native content/height', () => {
  const f = fixture();
  try {
    f.api.paint(f.slides);
    const track = f.d.querySelector('.tdb-treatment-wrapper');
    assert.equal(track.style.transform, 'translate3d(-250px,0,0)');
    assert.deepEqual(
      [...track.children].map((n) => n.dataset.tdbDetailIndex),
      ['2', '0', '1', '2', '0'],
    );
    assert.equal(track.children[1], f.original[0]);
    assert.equal(track.children[1].style.width, '500px');
    assert.equal(track.children[1].style.marginRight, '20px');
    assert.equal(track.children[1].style.height, '');
    assert.equal(track.children[1].getAttribute('aria-hidden'), 'false');
    assert.equal(track.children[0].getAttribute('aria-hidden'), 'true');
    assert.equal(track.children[0].id, '');
    assert.equal(track.children[1].querySelector('h3').dataset.opacity, '1');
    assert.equal(track.children[0].querySelector('h3').dataset.opacity, '0.5');
    assert.equal(track.children[1].querySelector('a').getAttribute('href'), '/treatments/0');
  } finally {
    f.dom.window.close();
  }
});
test('copy mirrors the shared fade state and loop rebuild restores original nodes on disposal', () => {
  const f = fixture();
  try {
    f.api.paint(f.slides);
    f.slides[1].node.querySelector('[data-tdb-service-copy]').className =
      'is-moving is-entry-pending';
    f.api.paint(f.slides);
    const copy = f.original[0].querySelector('[data-tdb-service-copy]');
    assert.equal(copy.classList.contains('is-visible'), false);
    assert.equal(copy.classList.contains('is-moving'), true);
    assert.equal(copy.classList.contains('is-entry-pending'), true);
    f.api.paint(f.slides.slice(1, 4));
    assert.equal(f.d.querySelector('.tdb-treatment-wrapper').children.length, 3);
    f.api.dispose();
    f.api.dispose();
    assert.deepEqual([...f.d.querySelector('.tdb-treatment-wrapper').children], f.original);
    assert.equal(f.original[0].style.width, '');
    assert.equal(f.original[0].hasAttribute('aria-hidden'), false);
  } finally {
    f.dom.window.close();
  }
});

test('deduplicated image cards still drive visible detail copy during movement and entry', () => {
  const f = fixture();
  try {
    for (const slide of f.slides) {
      const state = slide.node.firstElementChild;
      state.removeAttribute('data-tdb-service-copy');
      state.setAttribute('data-tdb-copy-state', '');
      state.className = 'is-visible is-moving is-entry-pending';
    }
    f.api.paint(f.slides);
    const copy = f.original[0].querySelector('[data-tdb-service-copy]');
    for (const name of ['is-visible', 'is-moving', 'is-entry-pending']) {
      assert(copy.classList.contains(name));
    }
    f.slides[1].node.firstElementChild.className = 'is-visible';
    f.api.paint(f.slides);
    assert(copy.classList.contains('is-visible'));
    assert(!copy.classList.contains('is-moving'));
    assert(!copy.classList.contains('is-entry-pending'));
  } finally {
    f.dom.window.close();
  }
});

test('unchanged progress samples do not invalidate every detail row again', () => {
  const f = fixture();
  try {
    f.api.paint(f.slides);
    const observer = new f.w.MutationObserver(() => {});
    observer.observe(f.d.querySelector('.tdb-treatment-wrapper'), {
      subtree: true,
      attributes: true,
    });
    f.api.paint(f.slides);
    f.api.paint(f.slides);
    assert.equal(
      observer.takeRecords().length,
      0,
      'stationary geometry and state produce no writes',
    );
    observer.disconnect();
  } finally {
    f.dom.window.close();
  }
});

test('progress and detail rows share one rendered measurement per slide before style writes', () => {
  const f=fixture();
  try {
    const {w,d,root,slides}=f;
    const viewport=d.createElement('div'), track=d.createElement('div'), progress=d.createElement('div');
    viewport.className='swiper'; track.className='swiper-wrapper'; viewport.append(track);
    progress.setAttribute('data-tdb-native-progress',''); progress.innerHTML='<span></span><span></span>';
    root.append(viewport,progress);
    for(const slide of slides) {slide.node.classList.add('swiper-slide');slide.node.dataset.swiperSlideIndex=String(slide.value);track.append(slide.node);}
    let paint;
    w.TDBRenderedProgress={observe(options){paint=options.paint;return {schedule(){},pause(){},destroy(){}};}};
    w.IntersectionObserver=class {observe(){}disconnect(){}};
    w.ResizeObserver=class {observe(){}disconnect(){}};
    viewport.getBoundingClientRect=()=>({left:30,width:500,bottom:600});
    progress.getBoundingClientRect=()=>({width:500});
    w.eval(fs.readFileSync('src/sliders/parallax-progress.js','utf8'));
    w.TDBParallaxProgress.refresh(); paint();
    const observer=new w.MutationObserver(()=>{});
    observer.observe(root.closest('[data-tdb-treatment-layout]'),{subtree:true,attributes:true});
    let readsAfterWrites=0;
    const counts=new Map();
    const nodes=[viewport,d.querySelector('.tdb-treatment-viewport'),...slides.map(s=>s.node)];
    for(const node of nodes) {
      const rect=node.getBoundingClientRect.bind(node);
      node.getBoundingClientRect=()=>{
        if(observer.takeRecords().length) readsAfterWrites++;
        counts.set(node,(counts.get(node)||0)+1);
        const box=rect();return {...box,left:box.left-15,right:box.right-15};
      };
    }
    paint();
    assert.equal(readsAfterWrites,0);
    for(const node of nodes) assert.equal(counts.get(node),1,'geometry is sampled only once');
    assert.match(progress.firstElementChild.style.transform,/translateX/);
    assert.equal(d.querySelector('.tdb-treatment-wrapper').style.transform,'translate3d(-250px,0,0)');
    observer.disconnect();
  } finally {f.dom.window.close();}
});

test('heading emphasis preserves native light and dark colours', () => {
  for (const colour of ['rgb(0, 0, 0)', 'rgb(255, 255, 255)']) {
    const f = fixture();
    try {
      const headings = f.original.map((row) => row.querySelector('h3'));
      headings.forEach((heading) => {
        heading.style.color = colour;
      });
      f.api.paint(f.slides);
      f.slides[1].node.classList.remove('swiper-slide-active');
      f.slides[2].node.classList.add('swiper-slide-active');
      f.api.paint(f.slides);
      assert.equal(headings[0].dataset.opacity, '0.5');
      assert.equal(headings[1].dataset.opacity, '1');
      headings.forEach((heading) => assert.equal(heading.style.color, colour));
      f.api.dispose();
      headings.forEach((heading) => assert.equal(heading.style.color, colour));
    } finally {
      f.dom.window.close();
    }
  }
});
