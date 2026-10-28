const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/journey/journey.js', 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function fixture({ allowed = true, routeFlight, placeFlight, rich = false } = {}) {
  const resultMarkup = rich ? '<span data-tdb-journey-time><span data-tdb-journey-time-value>00</span><span data-tdb-journey-time-unit>min</span></span><span data-tdb-journey-detail><span data-tdb-journey-distance-value>00.0</span><span data-tdb-journey-distance-unit>miles</span></span><span data-tdb-journey-note>Native result placeholder</span>' : 'Native result placeholder';
  const dom = new JSDOM(`<div data-tdb-journey data-tdb-maps-key="test" data-tdb-map-id="map"><form><input name="origin"><button>Find</button></form><p data-tdb-journey-status>${resultMarkup}</p><a class="tdb-journey-directions" href="https://www.google.com/maps/dir/?api=1">Directions</a><div data-tdb-journey-map><p>Native map placeholder</p></div></div>`, { runScripts: 'outside-only', url: 'https://example.test/location', pretendToBeVisual: true });
  const w = dom.window, root = w.document.querySelector('[data-tdb-journey]');
  let notify, permission = allowed, prompt = 0;
  const calls = [], maps = [], lines = [], markers = [], infos = [], placesCalls = [];
  root.dataset.tdbMapsPlaceId='verified-business';
  const result = () => ({ routes: [{ path: [{ lat: 52.6, lng: -1.8 }], durationMillis: 780000, distanceMeters: 12000, createPolylines() { const line = { setOptions() {}, setMap(map) { this.map = map; } }; lines.push(line); return [line]; } }] });
  w.TDBConsent = { allows: () => permission, subscribe(fn) { notify = fn; fn(); return () => {}; } };
  w.openCookieSettingsPanel = () => { prompt++; };
  w.google = { maps: { event: { clearInstanceListeners() {} }, async importLibrary(kind) {
    if (kind === 'maps') return { InfoWindow: class {constructor(options){this.options=options;infos.push(this)}open(options){this.openOptions=options}close(){this.closed=true}}, Map: class { constructor(node,options) { this.options=options; maps.push(this); node.textContent = 'Google map'; } fitBounds() {this.fitted=true} getMapTypeId(){return this.type||this.options.mapTypeId} getZoom(){return this.zoom??this.options.zoom} setZoom(zoom){this.zoom=zoom} setMapTypeId(type){this.type=type} } };
    if (kind === 'marker') return { PinElement: class {}, AdvancedMarkerElement: class { constructor(opts) { Object.assign(this, opts);markers.push(this); } addListener(event,fn){assert.equal(event,'click');this.click=fn;return {remove(){}}} } };
    if (kind === 'places') return { Place: class {constructor({id}){this.id=id}async fetchFields(options){placesCalls.push(options);Object.assign(this,placeFlight?await placeFlight.promise:{displayName:'The Dental Barns',rating:4.8,userRatingCount:64})}} };
    if (kind === 'core') return { LatLngBounds: class { extend() {} } };
    if (kind === 'routes') return { Route: { computeRoutes(request) { calls.push(request); return routeFlight ? routeFlight.promise : Promise.resolve(result()); } } };
  } } };
  w.eval(source);
  return { w, root, calls, maps, lines, markers, infos, placesCalls, result, output: () => root.querySelector('[data-tdb-journey-status]').textContent,
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
  assert.equal(f.maps[0].type,'roadmap');
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
test('script transport finishing before Google initialization does not fail the first visit', async () => {
  const f = fixture({ allowed: false });
  const google = f.w.google; delete f.w.google;
  let requests = 0;
  f.w.TDBModules = { load() { requests++; return Promise.resolve(); } };
  f.permission(true); await tick();
  assert.equal(requests, 1); assert.equal(f.maps.length, 0);
  const pending = f.w.TDBJourney.submit(f.root, 'Tamworth');
  f.w.google = google; f.w.TDBJourneyGoogleReady(); await pending;
  assert.equal(requests, 1); assert.equal(f.maps.length, 1); assert.match(f.output(), /Around 13 minutes/);
  f.close();
});

test('map starts with local satellite imagery, has no map-type dropdown and retains shared spinners', async () => {
  const flight=deferred(), f=fixture({routeFlight:flight}); let tiles;
  f.w.google.maps.event.addListenerOnce=(_map,event,fn)=>{assert.equal(event,'tilesloaded');tiles=fn;return {remove(){}};};
  const canvas=f.root.querySelector('[data-tdb-journey-map]'), button=f.root.querySelector('button');
  assert.equal(canvas.dataset.tdbLoading,'true'); await tick();
  assert.equal(f.maps[0].options.mapTypeId,'satellite');assert.equal(f.maps[0].options.zoom,17);assert.equal(f.maps[0].options.tilt,0);assert.equal(f.maps[0].options.mapTypeControl,false);
  assert.equal(canvas.dataset.tdbLoading,'true'); tiles(); assert.equal(canvas.dataset.tdbLoading,undefined);
  const pending=f.w.TDBJourney.submit(f.root,'Tamworth'); await tick();
  assert.equal(button.dataset.tdbLoading,'true');
  flight.resolve(f.result()); await pending; assert.equal(button.dataset.tdbLoading,undefined);
  f.close();
});

test('clicking the accessible pin loads only Google business rating fields and reuses the response', async()=>{
 const f=fixture();await tick();assert.equal(f.placesCalls.length,0);assert.equal(f.markers[0].gmpClickable,true);
 await f.markers[0].click();assert.equal(f.placesCalls.length,1);assert.deepEqual([...f.placesCalls[0].fields],['displayName','rating','userRatingCount']);
 assert.match(f.infos[0].options.content.textContent,/The Dental Barns.*4.8 \/ 5 · 64 Google reviews/);
 assert.match(f.infos[0].options.content.querySelector('a').href,/query_place_id=verified-business/);
 await f.markers[0].click();assert.equal(f.placesCalls.length,1);assert.equal(f.infos[0].closed,true);
 f.close();
});

test('consent withdrawal closes the pin and suppresses a late Google rating response', async()=>{
 const flight=deferred(),f=fixture({placeFlight:flight});await tick();const pending=f.markers[0].click();await tick();
 f.permission(false);flight.resolve({displayName:'The Dental Barns',rating:5,userRatingCount:60});await pending;
 assert.equal(f.infos[0].closed,true);assert.doesNotMatch(f.infos[0].options.content.textContent,/60 Google reviews/);f.close();
});

test('native numbers roll through every intermediate value while units stay fixed and accessible values stay accurate', async () => {
  const f=fixture({rich:true}), updates=[], slots=[], timers=new Map(); let timerId=0;
  const output=f.root.querySelector('[data-tdb-journey-status]');
  output.getBoundingClientRect=()=>({top:100,bottom:200});
  f.w.TDBMotion={reduced:{matches:false},defaults:{ticker:400,tickerRapid:160}};
  f.w.TDBNativeTicker={mount(slot,options){const index=slots.length;assert.equal(options.durationKey,'tickerRapid');assert.equal(slot.textContent,index?'00.0':'00');slots.push(slot);return {update(value,direction,animate){updates.push({index,value,direction,animate});slot.textContent=value;},destroy(){}};}};
  f.w.setTimeout=(fn,ms)=>{assert([160,192].includes(ms));timers.set(++timerId,fn);return timerId;};
  f.w.clearTimeout=id=>timers.delete(id);
  const next=()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);fn();};
  await f.w.TDBJourney.submit(f.root,'Tamworth');
  assert.equal(slots.length,2); assert.deepEqual(updates.map(x=>x.value),['15','08.3']);
  assert(updates.every(x=>x.animate),'both zero placeholders must roll into the lead value');
  assert.match(output.getAttribute('aria-label'),/13 minutes.*7.5 miles/);
  next(); assert.deepEqual(updates.slice(2).map(x=>[x.value,x.direction,x.animate]),[['14',-1,true],['08.2',-1,true]]);
  assert.equal(output.querySelector('[data-tdb-journey-time-unit]').textContent,'min');
  assert.equal(output.querySelector('[data-tdb-journey-distance-unit]').textContent,'miles');
  while(timers.size)next();
  assert.deepEqual(updates.filter(x=>x.index===1&&x.animate).map(x=>x.value),['08.3','08.2','08.1','08.0','07.9','07.8','07.7','07.6','07.5']);
  assert.equal(slots[0].textContent,'13'); assert.equal(slots[1].textContent,'07.5');
  assert.equal(output.children.length,3);
  f.root.querySelector('input').dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.equal(output.getAttribute('aria-label'),null); assert.equal(output.children.length,3); assert.equal(slots[0].textContent,'00');
  assert.equal(output.querySelector('[data-tdb-journey-note]').textContent,'Native result placeholder'); f.close();
});

test('reduced motion shows actual time and distance without staging or ticker work', async () => {
  const f=fixture({rich:true}); f.w.TDBMotion={reduced:{matches:true}};
  f.w.TDBNativeTicker={mount(){throw Error('must not animate');}};
  await f.w.TDBJourney.submit(f.root,'Tamworth');
  assert.equal(f.root.querySelector('[data-tdb-journey-time-value]').textContent,'13');
  assert.equal(f.root.querySelector('[data-tdb-journey-distance-value]').textContent,'07.5'); f.close();
});

test('editing during a roll cancels the sequence and preserves the native metric structure', async () => {
  const f=fixture({rich:true}),timers=new Map();let id=0,destroyed=0;
  const output=f.root.querySelector('[data-tdb-journey-status]');output.getBoundingClientRect=()=>({top:100,bottom:200});
  f.w.TDBMotion={reduced:{matches:false},defaults:{ticker:400,tickerRapid:160}};
  f.w.TDBNativeTicker={mount(slot){return {update(value){slot.textContent=value},destroy(){destroyed++}}}};
  f.w.setTimeout=fn=>{timers.set(++id,fn);return id};f.w.clearTimeout=id=>timers.delete(id);
  await f.w.TDBJourney.submit(f.root,'Tamworth');assert.equal(timers.size,1);
  f.root.querySelector('input').dispatchEvent(new f.w.Event('input',{bubbles:true}));
  assert.equal(timers.size,0);assert.equal(destroyed,2);assert.equal(output.querySelector('[data-tdb-journey-time-value]').textContent,'00');
  assert.equal(output.querySelector('[data-tdb-journey-distance-unit]').textContent,'miles');f.close();
});

function cameraFixture(){
 const f=fixture(),timers=new Map(),fades=[];let id=0,destroyed=0;
 const canvas=f.root.querySelector('[data-tdb-journey-map]');canvas.getBoundingClientRect=()=>({top:100,bottom:500});
 f.w.TDBMotion={reduced:{matches:false},defaults:{base:400,fadeOut:120,fadeIn:350},fadeController(){return {to(node,value,duration){fades.push([value,duration])},destroy(){destroyed++}}}};
 f.w.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id};f.w.clearTimeout=id=>timers.delete(id);
 return Object.assign(f,{canvas,timers,fades,destroyed:()=>destroyed,async next(){const [id,{fn}]=timers.entries().next().value;timers.delete(id);fn();await tick();}});
}
test('route reveal pulls back the satellite view then softly reveals roads using shared motion timing',async()=>{
 const f=cameraFixture();const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();
 assert.equal(f.maps[0].zoom,15);assert.equal(f.maps[0].type,undefined);
 assert.equal([...f.timers.values()][0].ms,800);await f.next();
 assert.deepEqual(f.fades,[[0.7,120]]);await f.next();
 assert.equal(f.maps[0].type,'roadmap');assert.equal(f.maps[0].fitted,true);await f.next();
 assert.deepEqual(f.fades,[[0.7,120],[1,350]]);await f.next();await pending;
 assert.match(f.output(),/13 minutes/);assert.equal(f.timers.size,0);assert(f.destroyed()>0);f.close();
});
test('new input cancels an in-flight camera reveal and never shows a stale route result',async()=>{
 const f=cameraFixture();const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();
 f.root.querySelector('input').dispatchEvent(new f.w.Event('input',{bubbles:true}));await pending;
 assert.equal(f.timers.size,0);assert.equal(f.maps[0].type,undefined);assert.equal(f.output(),'Native result placeholder');f.close();
});
test('map interaction takes control from the reveal without discarding the calculated result',async()=>{
 const f=cameraFixture();const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();
 f.canvas.dispatchEvent(new f.w.Event('pointerdown'));await pending;
 assert.equal(f.timers.size,0);assert.equal(f.maps[0].type,undefined);assert.match(f.output(),/13 minutes/);f.close();
});
test('shared reduced motion bypasses the staged camera and missing native business identity keeps the useful link',async()=>{
 const f=cameraFixture();f.w.TDBMotion.reduced.matches=true;await f.w.TDBJourney.submit(f.root,'Tamworth');
 assert.equal(f.maps[0].zoom,undefined);assert.equal(f.maps[0].type,'roadmap');assert.equal(f.timers.size,0);assert.deepEqual(f.fades,[]);
 delete f.root.dataset.tdbMapsPlaceId;await f.markers[0].click();assert.equal(f.placesCalls.length,0);
 assert.match(f.infos[0].options.content.textContent,/Reviews are unavailable/);f.close();
});
