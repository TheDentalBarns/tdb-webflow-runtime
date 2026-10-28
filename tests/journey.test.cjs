const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync('src/journey/journey.js', 'utf8');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function fixture({ allowed = true, routeFlight, placeFlight, rich = false, options = false, clock } = {}) {
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
  if(options){
    root.insertAdjacentHTML('beforeend','<div data-tdb-journey-options><select data-tdb-journey-departure disabled><option value="now">Now</option><option value="later">Later</option><option value="appointment">I have an appointment</option></select><input type="datetime-local" data-tdb-journey-when disabled><input type="checkbox" data-tdb-journey-avoid disabled><button data-tdb-journey-update disabled>Update</button><button data-tdb-journey-arrive disabled><span data-tdb-journey-arrive-label>Arrive with confidence</span></button></div>');
    root.dataset.tdbJourneyParking='52.6295774,-1.801891';root.dataset.tdbJourneyWalkLabel='Under 1 min';
    root.setAttribute('data-tdb-journey-path-1','52.6296,-1.8019 52.63,-1.8018 52.6300414,-1.8014216');
    root.setAttribute('data-tdb-journey-path-2','52.6296,-1.8019 52.6299,-1.8018 52.6300414,-1.8014216');
    const original=w.google.maps.importLibrary;
    w.google.maps.importLibrary=async kind=>{
      const lib=await original(kind);
      if(kind==='maps')lib.Polyline=class{constructor(options){Object.assign(this,options);lines.push(this)}setMap(map){this.map=map}};
      return lib;
    };
  }
  if(clock){
    const NativeDate=w.Date;w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:[clock.now]))}static now(){return new NativeDate(clock.now).getTime()}};
    w.setTimeout=(fn,ms)=>{const id=++clock.id;clock.timers.set(id,{fn,ms});return id};w.clearTimeout=id=>clock.timers.delete(id);
  }
  w.eval(source);
  return { w, root, calls, maps, lines, markers, infos, placesCalls, result, output: () => root.querySelector('[data-tdb-journey-status]').textContent,
    permission(value) { permission = value; notify(); }, prompt: () => prompt,
    close() { w.TDBJourney.destroy(); dom.window.close(); } };
}
test('route appears in the embedded map; minimal fields, traffic-aware estimates, repeated searches deduplicate', async () => {
  const f = fixture();
  await f.w.TDBJourney.submit(f.root, 'Sutton Coldfield');
  assert.match(f.output(), /Around 13 minutes by car/);
  assert.match(f.output(), /with current traffic/);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].routingPreference, 'TRAFFIC_AWARE');
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
 assert.equal(f.infos[0].options.content.textContent,'(64)Google reviews');assert.match(f.infos[0].options.content.querySelector('[role=status]').getAttribute('aria-label'),/4.8 out of 5 from 64 Google reviews/);assert.equal(f.infos[0].options.content.querySelector('a img').getAttribute('alt'),'');assert.doesNotMatch(f.infos[0].options.content.textContent,/View on Google Maps|The Dental Barns/);
 assert.match(f.infos[0].options.content.querySelector('a').href,/query_place_id=verified-business/);
 await f.markers[0].click();assert.equal(f.placesCalls.length,1);assert.equal(f.infos[0].closed,true);
 f.close();
});

test('consent withdrawal closes the pin and suppresses a late Google rating response', async()=>{
 const flight=deferred(),f=fixture({placeFlight:flight});await tick();const pending=f.markers[0].click();await tick();
 f.permission(false);flight.resolve({displayName:'The Dental Barns',rating:5,userRatingCount:60});await pending;
 assert.equal(f.infos[0].closed,true);assert.doesNotMatch(f.infos[0].options.content.textContent,/60 Google reviews/);f.close();
});

test('journey supplies one continuous descending sequence from authored zero with fixed units and accurate accessible results', async () => {
 const f=fixture({rich:true}),sequences=[],slots=[];
 const output=f.root.querySelector('[data-tdb-journey-status]');output.getBoundingClientRect=()=>({top:100,bottom:200});
 f.w.TDBMotion={reduced:{matches:false}};
 f.w.TDBNativeTicker={mount(slot){const index=slots.length;assert.equal(slot.textContent,index?'00.0':'00');slots.push(slot);return {sequence(values,direction){sequences.push({values:[...values],direction});slot.textContent=values.at(-1)},settle(){},destroy(){}}}};
 await f.w.TDBJourney.submit(f.root,'Tamworth');
 assert.deepEqual(sequences,[{values:['15','14','13'],direction:-1},{values:['08.3','08.2','08.1','08.0','07.9','07.8','07.7','07.6','07.5'],direction:-1}]);
 assert.match(output.getAttribute('aria-label'),/13 minutes.*7.5 miles/);
 assert.equal(output.querySelector('[data-tdb-journey-time-unit]').textContent,'min');assert.equal(output.querySelector('[data-tdb-journey-distance-unit]').textContent,'miles');
 assert.equal(output.children.length,3);f.close();
});

test('reduced motion shows actual time and distance without staging or ticker work', async () => {
  const f=fixture({rich:true}); f.w.TDBMotion={reduced:{matches:true}};
  f.w.TDBNativeTicker={mount(){throw Error('must not animate');}};
  await f.w.TDBJourney.submit(f.root,'Tamworth');
  assert.equal(f.root.querySelector('[data-tdb-journey-time-value]').textContent,'13');
  assert.equal(f.root.querySelector('[data-tdb-journey-distance-value]').textContent,'07.5'); f.close();
});

test('editing during continuous travel cancels both shared tickers and preserves native metric structure', async()=>{
 const f=fixture({rich:true});let destroyed=0;
 const output=f.root.querySelector('[data-tdb-journey-status]');output.getBoundingClientRect=()=>({top:100,bottom:200});
 f.w.TDBMotion={reduced:{matches:false}};
 f.w.TDBNativeTicker={mount(){return {sequence(){},settle(){},destroy(){destroyed++}}}};
 await f.w.TDBJourney.submit(f.root,'Tamworth');
 f.root.querySelector('input').dispatchEvent(new f.w.Event('input',{bubbles:true}));
 assert.equal(destroyed,2);assert.equal(output.querySelector('[data-tdb-journey-time-value]').textContent,'00');assert.equal(output.querySelector('[data-tdb-journey-distance-unit]').textContent,'miles');f.close();
});

function cameraFixture(){
 const f=fixture(),timers=new Map(),frames=new Map(),fades=[],cameras=[],animations=[];let id=0,destroyed=0,progress=0;
 const canvas=f.root.querySelector('[data-tdb-journey-map]');canvas.getBoundingClientRect=()=>({top:100,bottom:500});
 Object.defineProperties(canvas,{clientWidth:{value:640},clientHeight:{value:500}});
 const projection={fromLatLngToPoint(p){return {x:(p.lng+180)/360*256,y:(90-p.lat)/180*256}},fromPointToLatLng(p){return {lat:90-p.y/256*180,lng:p.x/256*360-180}}};
 f.w.google.maps.Point=class{constructor(x,y){this.x=x;this.y=y}};
 const original=f.w.google.maps.importLibrary;
 f.w.google.maps.importLibrary=async kind=>{
   const lib=await original(kind);
   if(kind==='core')lib.LatLngBounds=class{extend(){}getSouthWest(){return {lat:52.6,lng:-1.8}}getNorthEast(){return {lat:52.64,lng:-1.5}}};
   if(kind==='maps')lib.Map=class extends lib.Map{
     getProjection(){return projection}getCenter(){return this.center||this.options.center}
     moveCamera(camera){this.center=camera.center;this.zoom=camera.zoom;cameras.push(camera)}
   };
   return lib;
 };
 f.w.KeyframeEffect=class{constructor(target,frames,options){assert.equal(target,null);this.options=options}getComputedTiming(){return {progress}}};
 f.w.Animation=class{constructor(effect){this.effect=effect;animations.push(this)}play(){}cancel(){this.cancelled=true}};
 f.w.requestAnimationFrame=fn=>{frames.set(++id,fn);return id};f.w.cancelAnimationFrame=id=>frames.delete(id);
 f.w.TDBMotion={reduced:{matches:false},defaults:{base:400,fadeOut:120,fadeIn:350,mapTravel:2000},easing:(_,fallback)=>fallback,fadeController(){return {to(node,value,duration){fades.push([value,duration])},destroy(){destroyed++}}}};
 f.w.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id};f.w.clearTimeout=id=>timers.delete(id);
 return Object.assign(f,{canvas,timers,frames,fades,cameras,animations,projection,destroyed:()=>destroyed,async frame(p){progress=p;const [id,fn]=frames.entries().next().value;frames.delete(id);fn();await tick()},async next(){const [id,{fn}]=timers.entries().next().value;timers.delete(id);fn();await tick();}});
}
test('camera centres and zooms throughout travel, fits the whole route and switches style without a final fit snap',async()=>{
 const f=cameraFixture();const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();
 assert.equal(f.maps[0].type,undefined);assert.equal(f.animations[0].effect.options.duration,2000);
 await f.frame(.25);await f.frame(.65);await f.frame(1);
 assert.equal(f.cameras.length,3);assert(f.cameras[0].center.lng>f.maps[0].options.center.lng);
 assert(f.cameras[1].center.lng>f.cameras[0].center.lng);assert(f.cameras[1].zoom<f.cameras[0].zoom);
 const last=f.cameras.at(-1);assert(Math.abs(last.center.lng-(-1.65))<1e-8);assert(Math.abs(last.center.lat-52.62)<1e-8);
 const offset=c=>Math.abs(f.projection.fromLatLngToPoint(c.center).x-f.projection.fromLatLngToPoint(f.maps[0].options.center).x)*2**c.zoom;
 const endOffset=offset(last);assert(Math.abs(offset(f.cameras[0])/endOffset-.25)<1e-8);assert(Math.abs(offset(f.cameras[1])/endOffset-.65)<1e-8);
 assert((.3/360*256)*2**last.zoom<=544.000001);assert((.04/180*256)*2**last.zoom<=404.000001);
 assert.equal(f.maps[0].fitted,undefined);assert.equal(f.frames.size,0);assert(f.animations[0].cancelled);
 assert.deepEqual(f.fades,[[0.7,120]]);await f.next();
 assert.equal(f.maps[0].type,'roadmap');assert.equal(f.maps[0].fitted,undefined);assert.equal(f.cameras.length,3);await f.next();
 assert.deepEqual(f.fades,[[0.7,120],[1,350]]);await f.next();await pending;
 assert.match(f.output(),/13 minutes/);assert.equal(f.timers.size,0);assert(f.destroyed()>0);f.close();
});
test('new input cancels an in-flight camera reveal and never shows a stale route result',async()=>{
 const f=cameraFixture();const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();
 f.root.querySelector('input').dispatchEvent(new f.w.Event('input',{bubbles:true}));await pending;
 assert.equal(f.frames.size,0);assert(f.animations[0].cancelled);assert.equal(f.timers.size,0);assert.equal(f.maps[0].type,undefined);assert.equal(f.output(),'Native result placeholder');f.close();
});
test('map interaction takes control from the reveal without discarding the calculated result',async()=>{
 const f=cameraFixture();const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();
 f.canvas.dispatchEvent(new f.w.Event('pointerdown'));await pending;
 assert.equal(f.frames.size,0);assert.equal(f.timers.size,0);assert.equal(f.maps[0].type,undefined);assert.match(f.output(),/13 minutes/);f.close();
});

test('reduced motion enabled during camera travel settles the route and releases the animation',async()=>{
 const f=cameraFixture();const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();await f.frame(.25);
 f.w.TDBMotion.reduced.matches=true;await f.frame(.3);await pending;
 assert.equal(f.frames.size,0);assert(f.animations[0].cancelled);assert.equal(f.maps[0].type,'roadmap');assert.equal(f.maps[0].fitted,true);assert.match(f.output(),/13 minutes/);f.close();
});

test('unavailable projection falls back to a correct static route rather than rejecting the result',async()=>{
 const f=cameraFixture();await tick();f.maps[0].getProjection=()=>undefined;
 await f.w.TDBJourney.submit(f.root,'Tamworth');assert.equal(f.animations.length,0);assert.equal(f.maps[0].fitted,true);assert.match(f.output(),/13 minutes/);f.close();
});
test('shared reduced motion bypasses the staged camera and missing native business identity keeps the useful link',async()=>{
 const f=cameraFixture();f.w.TDBMotion.reduced.matches=true;await f.w.TDBJourney.submit(f.root,'Tamworth');
 assert.equal(f.maps[0].zoom,undefined);assert.equal(f.maps[0].type,'roadmap');assert.equal(f.timers.size,0);assert.deepEqual(f.fades,[]);
 delete f.root.dataset.tdbMapsPlaceId;await f.markers[0].click();assert.equal(f.placesCalls.length,0);
 assert.match(f.infos[0].options.content.textContent,/Rating unavailable/);f.close();
});

test('leaving later resolves UK summer/winter time and request keys include road preferences',async()=>{
 const f=fixture({options:true});
 const later={later:true,when:'2027-07-15T10:00',avoid:true};
 await f.w.TDBJourney.submit(f.root,'Tamworth',later);
 assert.equal(f.calls[0].departureTime.toISOString(),'2027-07-15T09:00:00.000Z');
 assert.equal(f.calls[0].routeModifiers.avoidHighways,true);assert.match(f.output(),/2027-07-15.*10:00 UK time/);
 await f.w.TDBJourney.submit(f.root,'Tamworth',later);assert.equal(f.calls.length,1);
 await f.w.TDBJourney.submit(f.root,'Tamworth',{...later,when:'2027-12-15T10:00',avoid:false});
 assert.equal(f.calls[1].departureTime.toISOString(),'2027-12-15T10:00:00.000Z');assert.equal(f.calls[1].routeModifiers.avoidHighways,false);
 await f.w.TDBJourney.submit(f.root,'Tamworth',{later:false,when:'',avoid:false});assert.equal(f.calls[2].departureTime,undefined);f.close();
});
test('past, nonexistent and ambiguous UK departure times make no route request',async()=>{
 const f=fixture({options:true});
 for(const when of ['2020-01-01T10:00','2027-03-28T01:30','2027-10-31T01:30','2027-02-30T11:00','']){
  await f.w.TDBJourney.submit(f.root,'Tamworth',{later:true,when,avoid:false});
  assert.equal(f.calls.length,0);assert.match(f.output(),/future UK departure time/);
 }f.close();
});
test('native controls reserve the date slot and draft preferences preserve the submitted request',async()=>{
 const flight=deferred(),f=fixture({options:true,routeFlight:flight});
 const when=f.root.querySelector('[data-tdb-journey-when]'),select=f.root.querySelector('select');
 assert.equal(select.disabled,false);assert.equal(when.disabled,true);assert(when.value);
 const pending=f.w.TDBJourney.submit(f.root,'Tamworth');await tick();
 select.value='later';select.dispatchEvent(new f.w.Event('input',{bubbles:true}));
 assert.equal(when.disabled,false);assert.equal(when.required,true);
 flight.resolve(f.result());await pending;assert.equal(f.lines.length,1);assert.match(f.output(),/13 minutes/);assert.equal(f.calls[0].departureTime,undefined);f.close();
});
test('consent replay preserves the chosen departure and road preference',async()=>{
 const f=fixture({allowed:false,options:true});
 await f.w.TDBJourney.submit(f.root,'Tamworth',{later:true,when:'2027-07-15T10:00',avoid:true});
 f.permission(true);await tick();await tick();
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].routeModifiers.avoidHighways,true);assert.equal(f.calls[0].departureTime.toISOString(),'2027-07-15T09:00:00.000Z');f.close();
});
test('arrival reuses one map, restores the existing route without another API call and tears down overlays',async()=>{
 const f=fixture({options:true});await f.w.TDBJourney.submit(f.root,'Tamworth');
 const button=f.root.querySelector('[data-tdb-journey-arrive]');assert.equal(button.disabled,false);
 button.click();await tick();await tick();
 assert.equal(button.getAttribute('aria-pressed'),'true');assert.equal(f.maps.length,1);assert.equal(f.calls.length,1);assert.equal(f.maps[0].type,'satellite');
 assert.equal(f.markers.length,4);assert.equal(f.lines.length,5);assert.equal(f.lines[0].map,null);assert.match(button.textContent,/Back to my journey/);
 button.click();await tick();await tick();
 assert.equal(button.getAttribute('aria-pressed'),'false');assert.equal(f.maps[0].type,'roadmap');assert.equal(f.lines[0].map,f.maps[0]);assert.equal(f.calls.length,1);
 assert.equal(f.markers[1].map,null);assert.equal(f.lines[1].map,null);
 button.click();await tick();f.permission(false);assert.equal(button.disabled,true);assert.equal(f.markers.at(-1).map,null);f.close();
});

test('now shows only UK clock time; editing an incomplete later time never resets it',()=>{
 const f=fixture({options:true}),select=f.root.querySelector('select'),when=f.root.querySelector('[data-tdb-journey-when]');
 assert.equal(when.type,'text');assert.match(when.value,/^\d{2}:\d{2}$/);
 select.value='later';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));
 assert.equal(when.type,'datetime-local');assert.equal(when.disabled,false);
 when.value='';when.dispatchEvent(new f.w.Event('input',{bubbles:true}));assert.equal(when.value,'');
 when.value='2027-07-15T11:35';when.dispatchEvent(new f.w.Event('input',{bubbles:true}));assert.equal(when.value,'2027-07-15T11:35');
 select.value='now';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(when.disabled,true);assert.match(when.value,/^\d{2}:\d{2}$/);
 select.value='later';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(when.value,'2027-07-15T11:35');f.close();
});

test('both mobile arrival actions centre the reserved map and retain one route request',async()=>{
 const f=fixture({options:true});await f.w.TDBJourney.submit(f.root,'Tamworth');
 Object.defineProperty(f.w,'innerWidth',{value:390});Object.defineProperty(f.w,'innerHeight',{value:844});
 Object.defineProperty(f.w.document.documentElement,'scrollHeight',{value:10000});
 const canvas=f.root.querySelector('[data-tdb-journey-map]'),scrolls=[];
 canvas.getBoundingClientRect=()=>({top:-500,bottom:0,height:500});f.w.scrollY=4000;f.w.scrollTo=x=>scrolls.push(x.top);
 f.w.TDBMotion={reduced:{matches:true}};
 const button=f.root.querySelector('[data-tdb-journey-arrive]');
 button.click();await tick();await tick();assert.deepEqual(scrolls,[3328]);
 assert.equal(f.markers[2].content.textContent,'Under 1 min');assert.match(f.markers[2].title,/Walk/);
 button.click();await tick();await tick();assert.deepEqual(scrolls,[3328,3328]);assert.equal(f.calls.length,1);f.close();
});

test('mobile centring uses the shared travel profile and releases its frame on consent withdrawal',async()=>{
 const f=fixture({options:true});await tick();Object.defineProperty(f.w,'innerWidth',{value:390});
 Object.defineProperty(f.w.document.documentElement,'scrollHeight',{value:10000});
 const canvas=f.root.querySelector('[data-tdb-journey-map]');canvas.getBoundingClientRect=()=>({top:1000,bottom:1500,height:500});
 const frames=new Map();let seq=0,cancelled=false,options;
 f.w.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq};f.w.cancelAnimationFrame=id=>frames.delete(id);
 f.w.KeyframeEffect=class{constructor(_,__,o){options=o}getComputedTiming(){return {progress:.5}}};
 f.w.Animation=class{play(){}cancel(){cancelled=true}};f.w.scrollTo=()=>{};
 f.w.TDBMotion={profile:{vertical:()=>777},easing:()=> 'ease-in-out',reduced:{matches:false}};
 f.root.querySelector('[data-tdb-journey-arrive]').click();await tick();assert.equal(options.duration,777);assert.equal(options.easing,'ease-in-out');assert.equal(frames.size,1);
 f.permission(false);await tick();assert.equal(frames.size,0);assert(cancelled);assert.equal(f.markers.length,1);f.close();
});

test('road preference is applied only on update and never wipes the displayed journey while editing',async()=>{
 const f=fixture({options:true});await f.w.TDBJourney.submit(f.root,'Tamworth');
 const before=f.output(),line=f.lines[0],avoid=f.root.querySelector('[data-tdb-journey-avoid]');
 avoid.click();assert.equal(avoid.checked,true);assert.equal(f.output(),before);assert.equal(line.map,f.maps[0]);assert.equal(f.calls.length,1);
 await f.w.TDBJourney.submit(f.root,'Tamworth');assert.equal(f.calls.length,2);assert.equal(f.calls[1].routeModifiers.avoidHighways,true);f.close();
});

test('UK clock displays GMT/BST without an added hour and stops its minute wake-up when hidden or torn down',()=>{
 const clock={now:'2026-10-28T15:45:20Z',id:0,timers:new Map()},f=fixture({options:true,clock});
 const when=f.root.querySelector('[data-tdb-journey-when]');assert.equal(when.value,'15:45');assert.equal(clock.timers.size,1);
 const timer=[...clock.timers.values()][0];assert.equal(timer.ms,40000);clock.now='2026-10-28T15:46:00Z';timer.fn();assert.equal(when.value,'15:46');assert.equal(clock.timers.size,1);
 clock.now='2027-07-15T14:45:00Z';f.w.TDBJourney.refresh();assert.equal(when.value,'15:45');
 Object.defineProperty(f.w.document,'hidden',{value:true,configurable:true});f.w.document.dispatchEvent(new f.w.Event('visibilitychange'));assert.equal(clock.timers.size,0);
 Object.defineProperty(f.w.document,'hidden',{value:false,configurable:true});f.w.document.dispatchEvent(new f.w.Event('visibilitychange'));assert.equal(clock.timers.size,1);
 f.close();assert.equal(clock.timers.size,0);
});

test('arrival paths have contrasting outlines and owner-confirmed walking time without a walking API request',async()=>{
 const f=fixture({options:true});await tick();f.root.style.setProperty('--base-color-neutral--neutral-darker','#222');f.root.style.setProperty('--base-color-brand--orange-1','#f9f2e6');
 f.root.querySelector('[data-tdb-journey-arrive]').click();await tick();await tick();
 assert.equal(f.lines.length,4);assert.deepEqual(f.lines.map(l=>[l.strokeColor,l.strokeWeight,l.zIndex]),[['#222',8,1],['#f9f2e6',4,2],['#222',8,1],['#f9f2e6',4,2]]);
 assert.match(f.markers[2].title,/Under 1 min/);assert.equal(f.markers[2].content.textContent,'Under 1 min');assert.equal(f.calls.length,0);f.close();assert(f.lines.every(l=>l.map===null));
});

test('appointment mode preserves separate entered times and checks traffic at the estimated departure',async()=>{
 const f=fixture({options:true}),select=f.root.querySelector('select'),when=f.root.querySelector('[data-tdb-journey-when]');
 select.value='later';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));when.value='2027-07-15T09:00';
 select.value='appointment';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(when.value,'');assert.equal(when.getAttribute('aria-label'),'Appointment date and time (UK time)');when.value='2027-07-15T10:00';
 await f.w.TDBJourney.submit(f.root,'Tamworth');assert.equal(f.calls.length,2);assert.equal(f.calls[0].departureTime.toISOString(),'2027-07-15T08:45:00.000Z');assert.equal(f.calls[1].departureTime.toISOString(),'2027-07-15T08:32:00.000Z');assert.equal(f.calls[1].arrivalTime,undefined);
 assert.match(f.output(),/Leave by 09:32 · Arrive 09:45/);assert.match(f.output(),/15 min before your 10:00 appointment/);
 await f.w.TDBJourney.submit(f.root,'Tamworth');assert.equal(f.calls.length,2);
 select.value='later';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(when.value,'2027-07-15T09:00');
 select.value='appointment';select.dispatchEvent(new f.w.Event('change',{bubbles:true}));assert.equal(when.value,'2027-07-15T10:00');f.close();
});

test('appointment planning is bounded, conservative and handles crossing midnight',async()=>{
 const f=fixture({options:true}),original=f.w.google.maps.importLibrary;let n=0;
 f.w.google.maps.importLibrary=async kind=>{const lib=await original(kind);if(kind==='routes')lib.Route.computeRoutes=req=>{f.calls.push(req);const value=f.result();value.routes[0].durationMillis=(++n===1?40:45)*60000;return Promise.resolve(value)};return lib};
 await f.w.TDBJourney.submit(f.root,'Tamworth',{appointment:true,when:'2027-01-15T00:10',avoid:true});
 assert.equal(f.calls.length,2);assert.equal(f.calls[1].routeModifiers.avoidHighways,true);assert.match(f.output(),/Leave by 23:10 on 14 Jan · Arrive 23:55 on 14 Jan/);assert.match(f.output(),/00:10 appointment · 15 Jan/);f.close();
});

test('appointment planning rejects impossible clock times and warns when the early-arrival buffer cannot be met',async()=>{
 const clock={now:'2026-10-28T15:45:00Z',id:0,timers:new Map()},f=fixture({options:true,clock});
 await f.w.TDBJourney.submit(f.root,'Tamworth',{appointment:true,when:'2026-10-28T15:55'});assert.equal(f.calls.length,0);
 await f.w.TDBJourney.submit(f.root,'Tamworth',{appointment:true,when:'2027-03-28T01:30'});assert.equal(f.calls.length,0);
 await f.w.TDBJourney.submit(f.root,'Tamworth',{appointment:true,when:'2026-10-28T16:05'});assert.equal(f.calls.length,2);assert.match(f.output(),/Leave now · the 15-minute buffer may not be possible/);f.close();
});

test('changing origin during the first appointment request suppresses refinement and stale output',async()=>{
 const flight=deferred(),f=fixture({options:true,routeFlight:flight});const pending=f.w.TDBJourney.submit(f.root,'Tamworth',{appointment:true,when:'2027-07-15T10:00'});await tick();
 f.root.querySelector('input').dispatchEvent(new f.w.Event('input',{bubbles:true}));flight.resolve(f.result());await pending;assert.equal(f.calls.length,1);assert.equal(f.lines.length,0);assert.equal(f.output(),'Native result placeholder');f.close();
});

test('Update journey recentres even when the route is cached and restores it from arrival view',async()=>{
 const f=fixture({options:true});await f.w.TDBJourney.submit(f.root,'Tamworth');f.root.querySelector('[data-tdb-journey-arrive]').click();await tick();await tick();
 Object.defineProperty(f.w.document.documentElement,'scrollHeight',{value:10000});const canvas=f.root.querySelector('[data-tdb-journey-map]');canvas.getBoundingClientRect=()=>({top:-500,bottom:0,height:500});f.w.scrollY=4000;
 const scrolls=[];f.w.lenis={scrollTo(top){scrolls.push(top)}};f.w.TDBMotion={reduced:{matches:true}};
 await f.w.TDBJourney.submit(f.root,'Tamworth',{later:false,avoid:false,center:true});assert.equal(scrolls.length,1);assert.equal(f.calls.length,1);assert.equal(f.maps[0].type,'roadmap');assert.equal(f.markers[1].map,null);f.close();
});
