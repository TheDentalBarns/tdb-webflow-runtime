/* Capture interactions only after consent releases runtime, while feature loaders start. */
(() => {
  if (window.TDBRuntimePageState) return;
  const y = Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
  const state = {initialY:y, hadInteraction:false,
    vipScrollSeed:{lastY:y,up:0,down:0,peek:false}, vipIntent:null};
  window.TDBRuntimePageState = state;
  const events = new AbortController();
  const options = {capture:true, passive:true, signal:events.signal};
  const remember = () => {state.hadInteraction=true;};
  for (const type of ['pointerdown','keydown','touchstart']) document.addEventListener(type,remember,options);
  window.addEventListener('scroll', () => {
    state.hadInteraction=true;
    const seed=state.vipScrollSeed;
    const y=Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0,0);
    const delta=y-seed.lastY;
    if (delta>0) {seed.up=0;seed.down+=delta;if(seed.down>140)seed.peek=false;}
    else if(delta<0) {seed.down=0;seed.up-=delta;if(seed.up>120&&y>innerHeight*.5)seed.peek=true;}
    if(y<=innerHeight*.5)seed.peek=false;
    seed.lastY=y;
  },{passive:true,signal:events.signal});
  function intent(event) {
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    const uspZone=event.target.closest?.('[data-tdb-usp-trigger-zone]');
    const uspTrigger=uspZone?.closest('[data-tdb-usp]')&&uspZone.querySelector('[data-tdb-usp-launch]');
    if(uspTrigger&&!window.TDBUSPDrawerLoader) {
      event.preventDefault();event.stopImmediatePropagation();
      prepareUSPDrawerLoader();
      if(!event.repeat)window.TDBUSPDrawerLoader.open(uspTrigger);
      return;
    }
    if(window.TDBVIPDrawerLoader||window.TDBVIPDrawer)return;
    if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;
    const target=event.target.closest?.('#tdb-vip-drawer .tdb-vip-drawer-handle,a[href*="#vip" i],[href*="#vip" i],[data-vip-open]');
    if(!target||!document.getElementById('tdb-vip-drawer'))return;
    event.preventDefault();event.stopImmediatePropagation();state.vipIntent=target;
  }
  document.addEventListener('click',intent,{capture:true,signal:events.signal});
  document.addEventListener('keydown',intent,{capture:true,signal:events.signal});
  window.addEventListener('tdb:features-ready',()=>{
    events.abort();
    const trigger=state.vipIntent;state.vipIntent=null;
    if(trigger)window.TDBVIPDrawerLoader?.open(trigger);
  },{once:true});
})();
