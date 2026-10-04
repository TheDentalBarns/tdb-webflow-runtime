/* TDB shared filters v1.0.1. Native Webflow UI; no CMS, query or slider dependencies. */
(() => {
'use strict';if(window.TDBFilters)return;
const instances=new WeakMap();let sequence=0;
function mount(panel,{toggle,backdrop=null,heading=null,badge=null,escapeRoot=panel,
 blockedControls=[],inertTargets=[],disclosures=[],onIntent,beforeClose,onChange,onError,onDisclosureChange,
 labels={open:'Open filters',close:'Close filters'},classes={}}={}){
 if(instances.has(panel))return instances.get(panel);
 if(!panel||!toggle)throw Error('Native filter panel and toggle required');
 const motion=window.TDBMotion;if(!motion)throw Error('Shared motion must load before filters');
 const names={closed:'is-closed',active:'is-filter-open',blocked:'is-filter-blocked',empty:'is-empty',collapsed:'is-collapsed',expanded:'is-expanded',...classes};
 const controller=new AbortController(),{signal}=controller,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let open=false,destroyed=false,animation=null,shadeAnimation=null,revision=0,closeFlight=null,count=0;
 // Capture native state so destroy/remount cannot accumulate IDs, ARIA or classes.
 const restorers=[];
 const remember=(node,attrs=[],classNames=[],inert=false)=>{
  if(!node)return;const attributes=attrs.map(key=>[key,node.getAttribute(key)]),states=classNames.map(key=>[key,node.classList.contains(key)]),wasInert=node.inert;
  restorers.push(()=>{for(const [key,value]of attributes){if(value===null)node.removeAttribute(key);else node.setAttribute(key,value);}for(const [key,value]of states)node.classList.toggle(key,value);if(inert)node.inert=wasInert;});
 };
 remember(panel,['id','aria-hidden'],[names.closed],true);remember(toggle,['aria-controls','aria-expanded','aria-label','aria-pressed'],[names.active]);remember(backdrop,[],[names.closed]);
 remember(badge,[],[names.empty]);const badgeText=badge?.textContent;
 const blocks=blockedControls.map(node=>({node,inert:node.inert,tabindex:node.getAttribute('tabindex'),disabled:node.getAttribute('aria-disabled')}));
 blocks.forEach(({node})=>remember(node,['tabindex','aria-disabled'],[names.blocked],true));
 const inertStates=inertTargets.map(node=>({node,inert:node.inert}));inertTargets.forEach(node=>remember(node,[],[],true));
 function block(value){
  for(const original of blocks){const {node}=original;node.classList.toggle(names.blocked,value);node.inert=value||original.inert;
   for(const [key,state]of [['tabindex',value?'-1':original.tabindex],['aria-disabled',value?'true':original.disabled]]){if(state===null)node.removeAttribute(key);else node.setAttribute(key,state);}}
  inertStates.forEach(({node,inert})=>{node.inert=value||inert;});
 }
 function setCount(value){count=Math.max(0,Math.trunc(Number(value)||0));if(badge){badge.textContent=String(count);badge.classList.toggle(names.empty,!count);}toggle.setAttribute('aria-label',(open?labels.close:labels.open)+(count?', '+count+' selected':''));}
 // Capture activation here; shared motion remains the only owner of SVG transforms.
 const icon=motion.filterToggle(toggle);
 function paint(value,immediate=false){
  const token=++revision,from=animation?getComputedStyle(panel).transform:value?'translateY(100%)':'translateY(0)';
  const shadeFrom=shadeAnimation&&backdrop?getComputedStyle(backdrop).opacity:value?0:1;
  animation?.cancel();shadeAnimation?.cancel();animation=shadeAnimation=null;
  const finish=()=>{if(token!==revision)return;if(!value){panel.classList.add(names.closed);backdrop?.classList.add(names.closed);}animation?.cancel();shadeAnimation?.cancel();animation=shadeAnimation=null;};
  const duration=immediate||reduced.matches?0:motion.duration(innerWidth);
  if(!duration){finish();return;}
  animation=panel.animate([{transform:from},{transform:value?'translateY(0)':'translateY(100%)'}],{duration,easing:'cubic-bezier(.4,0,.2,1)',fill:'both'});
  animation.finished.then(finish).catch(()=>{});
  if(backdrop){shadeAnimation=backdrop.animate([{opacity:shadeFrom},{opacity:value?1:0}],{duration:Math.min(duration,300),fill:'both'});shadeAnimation.finished.catch(()=>{});}
 }
 function set(value,immediate=false){
  if(destroyed)return;value=Boolean(value);if(open===value){if(immediate&&animation)paint(value,true);return;}
  open=value;closeFlight=null;icon.set(open,immediate);toggle.classList.toggle(names.active,open);toggle.setAttribute('aria-expanded',String(open));setCount(count);
  panel.setAttribute('aria-hidden',String(!open));panel.inert=!open;block(open);
  if(open){panel.classList.remove(names.closed);backdrop?.classList.remove(names.closed);heading?.focus({preventScroll:true});}
  else if(panel.contains(document.activeElement))toggle.focus({preventScroll:true});
  paint(open,immediate);onChange?.(open);
 }
 async function requestClose(reason='close'){
  if(destroyed||!open)return false;if(closeFlight)return closeFlight.promise;
  const flight={promise:null};closeFlight=flight;
  flight.promise=Promise.resolve().then(()=>destroyed||closeFlight!==flight?false:beforeClose?.({reason,signal})).then(result=>{
   if(destroyed||closeFlight!==flight||!open||result===false)return false;set(false);return true;
  }).catch(error=>{if(!destroyed&&closeFlight===flight)onError?.(error);return false;}).finally(()=>{if(closeFlight===flight)closeFlight=null;});return flight.promise;
 }
 const consume=event=>{event.preventDefault();event.stopImmediatePropagation();};
 for(const type of ['click','keydown'])toggle.addEventListener(type,event=>{
  if(type==='keydown'&&!['Enter',' '].includes(event.key))return;consume(event);if(toggle.getAttribute('aria-disabled')==='true')return;
  if(open)requestClose('toggle');else set(true);
 },{signal,capture:true});
 for(const event of ['pointerenter','focus','pointerdown'])toggle.addEventListener(event,()=>onIntent?.(),{signal,passive:true});
 // Consume the whole outside gesture, including the click arriving after closure.
 let outsidePointer=null,swallowClick=false;
 const outside=target=>!panel.contains(target)&&!toggle.contains(target);
 window.addEventListener('pointerdown',event=>{outsidePointer=null;swallowClick=false;if((open||animation)&&outside(event.target)){outsidePointer=event.pointerId;swallowClick=true;consume(event);requestClose('outside');}},{signal,capture:true,passive:false});
 window.addEventListener('pointerup',event=>{if(swallowClick&&event.pointerId===outsidePointer)consume(event);},{signal,capture:true,passive:false});
 window.addEventListener('pointercancel',event=>{if(event.pointerId===outsidePointer){outsidePointer=null;swallowClick=false;}},{signal,capture:true});
 const outsideClick=event=>{if(swallowClick||(open||animation)&&outside(event.target)){swallowClick=false;outsidePointer=null;consume(event);requestClose('outside');}};
 window.addEventListener('click',outsideClick,{signal,capture:true});window.addEventListener('auxclick',outsideClick,{signal,capture:true});
 escapeRoot.addEventListener('keydown',event=>{if(open&&event.key==='Escape'){consume(event);requestClose('escape');}},{signal,capture:true});
 panel.id||='tdb-filters-'+(++sequence);panel.inert=true;panel.setAttribute('aria-hidden','true');toggle.setAttribute('aria-controls',panel.id);toggle.setAttribute('aria-expanded','false');setCount(0);
 const entries=[];
 for(const {key,button,body,group=button?.parentElement,chevron=null}of disclosures){
  if(!button||!body||!group)continue;
  remember(button,['aria-controls','aria-expanded']);remember(body,['id','aria-hidden'],[names.collapsed],true);remember(group,[],[names.expanded]);const originalTurn=chevron?.style.transform;
  body.id||=panel.id+'-'+key;button.setAttribute('aria-controls',body.id);body.inert=true;
  const entry={open:false,animations:[],set(value,immediate=false){
   const changed=entry.open!==value;
   const running=entry.animations.some(a=>a.effect?.target===body),fromOpacity=running?getComputedStyle(body).opacity:0,fromTransform=running?getComputedStyle(body).transform:'translateY(-20px)';
   const fromSpace=getComputedStyle(group).paddingBottom,fromTurn=chevron?getComputedStyle(chevron).transform:'none';
   entry.animations.forEach(a=>a.cancel());entry.animations=[];entry.open=value;
   button.setAttribute('aria-expanded',String(value));body.setAttribute('aria-hidden',String(!value));body.inert=!value;
   body.classList.toggle(names.collapsed,!value);group.classList.toggle(names.expanded,value);
   if(chevron)chevron.style.transform='rotate('+(value?180:0)+'deg)';
   if(changed)onDisclosureChange?.();
   if(immediate||reduced.matches)return;
   const run=(node,frames,duration,easing)=>{const a=node.animate(frames,{duration,easing,fill:'both'});entry.animations.push(a);a.finished.then(()=>{a.cancel();const i=entry.animations.indexOf(a);if(i!==-1)entry.animations.splice(i,1);}).catch(()=>{});};
   // Native FAQ/pricing choreography. Spacer target comes from Webflow's state class.
   const outQuart='cubic-bezier(.165,.84,.44,1)';run(group,[{paddingBottom:fromSpace},{paddingBottom:getComputedStyle(group).paddingBottom}],300,outQuart);
   if(value){run(body,[{opacity:fromOpacity},{opacity:1}],300,'linear');run(body,[{transform:fromTransform},{transform:'translateY(0)'}],400,outQuart);}
   if(chevron)run(chevron,[{transform:fromTurn},{transform:chevron.style.transform}],400,'ease');
  },destroy(){entry.animations.forEach(a=>a.cancel());if(chevron){if(originalTurn)chevron.style.transform=originalTurn;else chevron.style.removeProperty('transform');}}};
  entries.push(entry);
  const activate=event=>{if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;event.preventDefault();if(button.getAttribute('aria-disabled')==='true')return;const value=!entry.open;entries.forEach(other=>{if(other!==entry&&other.open)other.set(false);});entry.set(value);};
  button.addEventListener('click',activate,{signal});button.addEventListener('keydown',activate,{signal});
 }
 reduced.addEventListener('change',()=>{if(animation)paint(open,true);entries.forEach(entry=>entry.set(entry.open,true));},{signal});
 const api=Object.freeze({set,requestClose,setCount,get isOpen(){return open;},
  get hasExpandedDisclosures(){return entries.some(entry=>entry.open);},
  collapseAll(immediate=false){if(!destroyed)entries.forEach(entry=>{if(entry.open)entry.set(false,immediate);});},
  reset(immediate=true){set(false,immediate);},destroy(){
  if(destroyed)return;set(false,true);destroyed=true;revision++;closeFlight=null;controller.abort();animation?.cancel();shadeAnimation?.cancel();entries.forEach(entry=>entry.destroy());icon.destroy();restorers.reverse().forEach(restore=>restore());if(badge)badge.textContent=badgeText;instances.delete(panel);
 }});instances.set(panel,api);return api;
}
window.TDBFilters=Object.freeze({version:'1.0.1',mount});
})();
