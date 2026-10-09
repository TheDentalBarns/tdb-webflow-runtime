/* TDB shared native drawer v1.1.0. Webflow owns markup and styles. */
(() => {
'use strict';if(window.TDBDrawer)return;
const instances=new WeakMap();let active=null;
function mount(root,{onOpen,onClose,hideChrome=false}={}){
 if(instances.has(root))return instances.get(root);
 const panel=root.querySelector('[data-tdb-drawer-panel]'),backdrop=root.querySelector('[data-tdb-drawer-backdrop]'),closeButton=root.querySelector('[data-tdb-drawer-close]');
 if(!panel||!closeButton)throw Error('Native drawer structure missing');
 const ctrl=new AbortController(),{signal}=ctrl,motion=window.TDBMotion.reduced;
 let state='closed',trigger,saved=[],releaseScroll,releaseChrome,animations=[],revision=0,touchPulse=null;
 root.hidden=true;root.classList.add('is-hidden');root.inert=true;
 const stop=()=>{animations.forEach(a=>a.cancel());animations=[];};
 const focusables=()=>[...panel.querySelectorAll('a[href],button,input,select,textarea,[tabindex="0"]')].filter(n=>!n.disabled&&!n.closest('[hidden],[inert]')&&n.getClientRects().length);
 function lock(){
  releaseScroll=window.TDBScrollLock.acquire({allow:()=>[panel]});
  let child=root;while(child.parentElement){for(const sibling of child.parentElement.children)if(sibling!==child&&!['SCRIPT','STYLE','LINK'].includes(sibling.tagName)){saved.push([sibling,sibling.inert]);sibling.inert=true;}child=child.parentElement;if(child===document.body)break;}
 }
 function unlock(){saved.forEach(([node,value])=>node.inert=value);saved=[];releaseScroll?.();releaseScroll=null;releaseChrome?.();releaseChrome=null;}
 async function transition(opening){
  const rev=++revision;
  if(!opening&&animations.length){
   // Reverse the existing timeline: cancelling would snap to the authored open pose.
   // At the start boundary, reverse()/play() auto-rewind to the end; finish at zero instead.
   animations.forEach(a=>{if(a.currentTime==null||a.currentTime===0){a.playbackRate=-1;a.finish();}else a.reverse();});
   await Promise.allSettled(animations.map(a=>a.finished));return rev===revision;
  }
  stop();const duration=motion.matches?0:window.TDBMotion.duration(innerWidth);
  const closed='translateX(100%)';
  if(duration&&panel.animate){animations=[panel.animate([{transform:opening?closed:'translate(0)'},{transform:opening?'translate(0)':closed}],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'})];if(backdrop)animations.push(backdrop.animate([{opacity:opening?0:1},{opacity:opening?1:0}],{duration:Math.min(duration,300),fill:'both'}));await Promise.allSettled(animations.map(a=>a.finished));}
  return rev===revision;
 }
 async function open(source){
  if(state!=='closed')return;active?.close(true);active=api;trigger=source;state='opening';root.hidden=false;root.classList.remove('is-hidden');root.inert=false;root.setAttribute('aria-hidden','false');trigger?.setAttribute('aria-expanded','true');lock();try{onOpen?.();if(hideChrome)releaseChrome=window.TDBSiteChrome.acquire();}catch(error){await close(true);throw error;}closeButton.focus({preventScroll:true});
  if(await transition(true)){stop();state='open';}
 }
 async function close(immediate=false){
  // A second backdrop/Escape dismiss must not restart the exit from fully open.
  // Immediate teardown may still cancel the exit, without repeating onClose.
  if(state==='closed'||(state==='closing'&&!immediate))return;
  if(state!=='closing'){state='closing';trigger?.setAttribute('aria-expanded','false');onClose?.();if(hideChrome)window.TDBSiteChrome.settleBackground();}
  if(immediate){revision++;stop();}else if(!await transition(false))return;
  touchPulse?.cancel();touchPulse=null;root.hidden=true;root.classList.add('is-hidden');root.inert=true;root.setAttribute('aria-hidden','true');stop();unlock();state='closed';if(active===api)active=null;if(trigger?.isConnected)trigger.focus({preventScroll:true});
 }
 // Match the existing VIP/announcement touch pulse without delaying drawer closure.
 function pulseClose(event){
  if(event.type!=='click'||event.detail===0||motion.matches||!closeButton.animate)return;
  if(event.pointerType!=='touch'&&!matchMedia('(hover:none) and (pointer:coarse)').matches)return;
  touchPulse?.cancel();
  const cream=getComputedStyle(document.documentElement).getPropertyValue('--base-color-brand--orange-1').trim()||'#f9f2e6';
  const animation=closeButton.animate([
   {boxShadow:'inset 0 0 0 2rem transparent',offset:0},
   {boxShadow:'inset 0 0 0 2rem color-mix(in srgb,'+cream+' 30%,transparent)',offset:.3},
   {boxShadow:'inset 0 0 0 2rem transparent',offset:1}
  ],{duration:600,easing:'ease-in-out'});
  touchPulse=animation;
  animation.finished.then(()=>{if(touchPulse===animation)touchPulse=null;}).catch(()=>{});
 }
 const activate=e=>{if(e.type==='keydown'&&!['Enter',' '].includes(e.key))return;e.preventDefault();if(state==='closed'||state==='closing')return;pulseClose(e);close();};
 closeButton.addEventListener('click',activate,{signal});closeButton.addEventListener('keydown',activate,{signal});backdrop?.addEventListener('click',()=>close(),{signal});
 root.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}if(e.key==='Tab'){const list=focusables(),first=list[0]||panel,last=list.at(-1)||panel;if(e.shiftKey&&(document.activeElement===first||document.activeElement===panel)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}},{signal});
 document.addEventListener('focusin',e=>{if(state!=='closed'&&state!=='closing'&&!root.contains(e.target))closeButton.focus({preventScroll:true});},{signal});
 motion.addEventListener('change',()=>{if(state==='opening'){revision++;stop();state='open';}else if(state==='closing')close(true);},{signal});
 const api=Object.freeze({open,close,get state(){return state;},destroy(){close(true);ctrl.abort();instances.delete(root);}});instances.set(root,api);return api;
}
window.TDBDrawer=Object.freeze({version:'1.1.0',mount});
})();
