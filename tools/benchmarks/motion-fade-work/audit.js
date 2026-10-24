const ddCount = Number(new URLSearchParams(location.search).get('dd'));
const host = document.querySelector('main'),
  options = [],
  texts = [];
for (let i = 0; i < 16; i++) {
  const s = document.createElement('section');
  s.innerHTML =
    '<div class="crop"><div class="photo"></div><div class="photo"></div><div class="photo"></div><div class="shade" data-tdb-parallax-fade="0"></div></div>';
  host.append(s);
  if (i < 9)
    options.push({
      wrapper: s,
      selector: '.photo',
      frame: '.crop',
      ...(i >= 3 && i <= 5 ? { restingScale: '--tdb-photo-scale' } : {}),
    });
  else {
    s.setAttribute('data-tdb-page-break', '');
    s.setAttribute('data-tdb-parallax-fade-start', '.5');
    s.setAttribute('data-tdb-parallax-fade-end', '.85');
    s.querySelector('.photo').setAttribute('data-tdb-page-break-image', '');
    options.push(s);
  }
}
for (let i = 0; i < ddCount; i++) {
  const p = document.createElement('p');
  p.className = 'caption';
  p.textContent = 'A calm, considered experience';
  host.children[Math.min(15, Math.floor(i / 3))].append(p);
  texts.push(p);
}
const nativeRAF = requestAnimationFrame.bind(window),
  nativeCancel = cancelAnimationFrame.bind(window);
let recording = false,
  phase = '',
  metrics = {},
  writesStarted = false,
  seenRects = new Set(),
  inside = false;
const mutations = new MutationObserver(() => {});
mutations.observe(host, { attributes: true, attributeFilter: ['style'], subtree: true });
function drainWrites() {
  const records = mutations.takeRecords();
  if (recording && inside && records.length) {
    metrics[phase].styleWrites += records.length;
    writesStarted = true;
  }
}
function empty() {
  return {
    callbacks: 0,
    rectReads: 0,
    offscreenRectReads: 0,
    computedStyles: 0,
    clientRects: 0,
    styleWrites: 0,
    readAfterWrite: 0,
    duplicateRectReads: 0,
    times: [],
  };
}
function count(key) {
  if (recording) metrics[phase][key]++;
}
window.requestAnimationFrame = (cb) =>
  nativeRAF((time) => {
    if (!recording) return cb(time);
    mutations.takeRecords();
    inside = true;
    writesStarted = false;
    seenRects = new Set();
    const started = performance.now();
    try {
      cb(time);
    } finally {
      drainWrites();
      metrics[phase].times.push(performance.now() - started);
      metrics[phase].callbacks++;
      inside = false;
    }
  });
window.cancelAnimationFrame = nativeCancel;
const nativeRect = Element.prototype.getBoundingClientRect;
Element.prototype.getBoundingClientRect = function () {
  if (recording && inside) drainWrites();
  const rect = nativeRect.call(this);
  if (recording && inside) {
    count('rectReads');
    if (rect.bottom <= 0 || rect.top >= innerHeight) count('offscreenRectReads');
    if (seenRects.has(this)) count('duplicateRectReads');
    seenRects.add(this);
    if (writesStarted) count('readAfterWrite');
  }
  return rect;
};
const nativeClient = Element.prototype.getClientRects;
Element.prototype.getClientRects = function () {
  if (recording && inside) {
    drainWrites();
    count('clientRects');
    if (writesStarted) count('readAfterWrite');
  }
  return nativeClient.call(this);
};
const nativeStyle = getComputedStyle.bind(window);
window.getComputedStyle = function (...args) {
  if (recording && inside) {
    drainWrites();
    count('computedStyles');
    if (writesStarted) count('readAfterWrite');
  }
  return nativeStyle(...args);
};
const nextFrame = () => new Promise((resolve) => nativeRAF(resolve));
async function frames(n, work) {
  for (let i = 0; i < n; i++) {
    if (work) work(i);
    await nextFrame();
  }
}
function begin(name) {
  phase = name;
  metrics[name] = empty();
  recording = true;
}
function summary(m) {
  const sorted = m.times.toSorted((a, b) => a - b),
    total = sorted.reduce((a, b) => a + b, 0);
  const { times, ...rest } = m;
  return {
    ...rest,
    callbackMs: Number(total.toFixed(3)),
    meanMs: Number((total / (sorted.length || 1)).toFixed(3)),
    p95Ms: Number((sorted[Math.floor(sorted.length * 0.95)] || 0).toFixed(3)),
    maxMs: Number((sorted.at(-1) || 0).toFixed(3)),
  };
}
async function startAudit() {
  try {
    const owner = TDBMotion.pageBreaks(options),
      dd = ddCount ? TDBMotion.ddText(texts) : null;
    const trace = [],
      snapshot = () =>
        trace.push({
          opacity: texts.map((n) => n.style.opacity),
          position: owner.status().map((s) => s.y),
        });
    await frames(8);
    begin('initialIdle');
    await frames(60);
    begin('scroll');
    const max = document.documentElement.scrollHeight - innerHeight;
    await frames(180, (i) => {
      snapshot();
      dispatchEvent(new Event('wheel'));
      scrollTo(0, (max * (i + 1)) / 180);
    });
    begin('settling');
    await frames(30, snapshot);
    begin('settledIdle');
    await frames(60);
    recording = false;
    dispatchEvent(new Event('pagehide'));
    begin('suspended');
    await frames(30, (i) => {
      scrollTo(0, max - i * 20);
      dispatchEvent(new Event('scroll'));
    });
    recording = false;
    dispatchEvent(new Event('pageshow'));
    await frames(8);
    const state = owner.status(),
      horizontalPreserved = [...document.querySelectorAll('.photo')].every(
        (n) => n.style.transform === '' || !options.slice(0, 9).some((o) => o.wrapper.contains(n)),
      );
    owner.destroy();
    dd?.destroy();
    await frames(2);
    begin('destroyed');
    await frames(30, (i) => {
      dispatchEvent(new Event('wheel'));
      scrollTo(0, i * 20);
    });
    recording = false;
    parent.postMessage(
      {
        type: 'result',
        result: {
          version: new URLSearchParams(location.search).get('version'),
          width: innerWidth,
          height: innerHeight,
          parallax: 16,
          dd: ddCount,
          trace,
          metrics: Object.fromEntries(
            Object.entries(metrics).map(([key, value]) => [key, summary(value)]),
          ),
          finitePositions: state.every((s) => Number.isFinite(s.y)),
          horizontalPreserved,
        },
      },
      location.origin,
    );
  } catch (error) {
    parent.postMessage(
      { type: 'result', result: { error: String(error), stack: error.stack } },
      location.origin,
    );
  }
}
