const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/journey/journey.js', 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function fixture({ allowed = true, routeFlight } = {}) {
  const dom = new JSDOM(`<div data-tdb-journey data-tdb-maps-key="test" data-tdb-map-id="map"><form><input name="origin"><button>Find</button></form><p data-tdb-journey-status>Native result placeholder</p><a class="tdb-journey-directions" href="https://www.google.com/maps/dir/?api=1">Directions</a><div data-tdb-journey-map><p>Native map placeholder</p></div></div>`, { runScripts: 'outside-only', url: 'https://example.test/location' });
  const w = dom.window, root = w.document.querySelector('[data-tdb-journey]');
  let notify, permission = allowed, prompt = 0;
  const calls = [], maps = [], lines = [];
  const result = () => ({ routes: [{ path: [{ lat: 52.6, lng: -1.8 }], durationMillis: 780000, distanceMeters: 12000, createPolylines() { const line = { setOptions() {}, setMap(map) { this.map = map; } }; lines.push(line); return [line]; } }] });
  w.TDBConsent = { allows: () => permission, subscribe(fn) { notify = fn; fn(); return () => {}; } };
  w.openCookieSettingsPanel = () => { prompt++; };
  w.google = { maps: { event: { clearInstanceListeners() {} }, async importLibrary(kind) {
    if (kind === 'maps') return { Map: class { constructor(node) { maps.push(this); node.textContent = 'Google map'; } fitBounds() {} } };
    if (kind === 'marker') return { PinElement: class {}, AdvancedMarkerElement: class { constructor(opts) { Object.assign(this, opts); } } };
    if (kind === 'core') return { LatLngBounds: class { extend() {} } };
    if (kind === 'routes') return { Route: { computeRoutes(request) { calls.push(request); return routeFlight ? routeFlight.promise : Promise.resolve(result()); } } };
  } } };
  w.eval(source);
  return { w, root, calls, maps, lines, result, output: () => root.querySelector('[data-tdb-journey-status]').textContent,
    permission(value) { permission = value; notify(); }, prompt: () => prompt,
    close() { w.TDBJourney.destroy(); dom.window.close(); } };
}
test('route appears in the embedded map; minimal fields, no live traffic, repeated searches deduplicate', async () => {
  const f = fixture();
  await f.w.TDBJourney.submit(f.root, 'Sutton Coldfield');
  assert.match(f.output(), /Around 13 minutes by car/);
  assert.match(f.output(), /without live traffic/);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].routingPreference, 'TRAFFIC_UNAWARE');
  assert.deepEqual([...f.calls[0].fields], ['path', 'durationMillis', 'distanceMeters']);
  assert.equal(f.lines[0].map, f.maps[0]);
  await f.w.TDBJourney.submit(f.root, 'Sutton Coldfield');
  assert.equal(f.calls.length, 1);
  f.close();
});
test('functional consent gates Google; the first search is retained through explicit consent', async () => {
  const f = fixture({ allowed: false });
  await f.w.TDBJourney.submit(f.root, 'Tamworth');
  assert.equal(f.maps.length, 0); assert.equal(f.calls.length, 0); assert.equal(f.prompt(), 1);
  f.permission(true); await tick(); await tick();
  assert.equal(f.calls.length, 1); assert.match(f.output(), /Tamworth/);
  f.permission(false);
  assert.match(f.root.querySelector('[data-tdb-journey-map]').textContent, /Native map placeholder/);
  assert.equal(f.lines[0].map, null);
  f.close();
});
test('typing a new origin invalidates an outstanding result and prevents duplicate inflight requests', async () => {
  const flight = deferred(), f = fixture({ routeFlight: flight });
  const pending = f.w.TDBJourney.submit(f.root, 'Lichfield'); await tick();
  const duplicate = f.w.TDBJourney.submit(f.root, 'Lichfield'); await duplicate;
  assert.equal(f.calls.length, 1);
  f.root.querySelector('input').dispatchEvent(new f.w.Event('input', { bubbles: true }));
  flight.resolve(f.result()); await pending;
  assert.equal(f.lines.length, 0); assert.equal(f.output(), 'Native result placeholder');
  f.close();
});
test('consent withdrawal suppresses a late response; failure retains a useful directions link', async () => {
  const flight = deferred(), f = fixture({ routeFlight: flight });
  const pending = f.w.TDBJourney.submit(f.root, 'Birmingham'); await tick();
  f.permission(false); flight.resolve(f.result()); await pending;
  assert.equal(f.lines.length, 0); assert.equal(f.output(), 'Native result placeholder'); f.close();
  const g = fixture({ routeFlight: { promise: Promise.resolve({ routes: [] }) } });
  await g.w.TDBJourney.submit(g.root, 'Unknown postcode');
  assert.match(g.output(), /could not calculate/);
  assert.match(g.root.querySelector('a').href, /origin=Unknown\+postcode/); g.close();
});
test('SDK requests do not start without functional consent', async () => {
  const f = fixture({ allowed: false }); delete f.w.google;
  let requests = 0; f.w.TDBModules = { load() { requests++; return Promise.reject(Error('offline')); } };
  await f.w.TDBJourney.submit(f.root, 'Tamworth'); assert.equal(requests, 0);
  f.permission(true); await tick(); assert.equal(requests, 1); assert.match(f.output(), /could not calculate/); f.close();
});
