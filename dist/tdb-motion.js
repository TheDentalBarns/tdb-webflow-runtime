/* TDB shared motion v1.2.2: gentle DD startup with established carousel timing. */
(() => {
'use strict'; if(window.TDBMotion)return;
const bound=new WeakSet();
const defaults=Object.freeze({base:400,desktopMin:650,desktopMax:950,referenceWidth:375,fadeOut:120,fadeIn:350,entryDelay:100,ticker:400});
function duration(width=innerWidth){return matchMedia('(min-width:992px)').matches?Math.round(Math.min(defaults.desktopMax,Math.max(defaults.desktopMin,defaults.base*Math.sqrt(width/defaults.referenceWidth)))):defaults.base;}
function bindSwiper(e){if(bound.has(e))return;bound.add(e);const axis=e.isHorizontal()?"left":"top";const t=e.slideTo,n=e.loopFix,i=e.slidePrev;function r(){return[...e.slides].flatMap((e,t)=>{const n=e.getAttribute("data-swiper-slide-index")??String(t),i=e.getBoundingClientRect()[axis];return[...e.querySelectorAll("[data-swiper-parallax], [data-swiper-parallax-x], [data-swiper-parallax-y]")].map((e,t)=>({el:e,key:n,slot:t,x:i,transform:getComputedStyle(e).transform}))})}function s(t){const n=e.wrapperEl,i=getComputedStyle(n).transform;n.style.transitionDuration="0ms",n.style.transform=i,t.forEach(({el:e,transform:t})=>{e.style.transitionDuration="0ms",e.style.transform=t}),n.offsetWidth}e.slideTo=function(e=0,n=this.params.speed,i=!0,a,o){return n>0&&Number(e)!==this.activeIndex&&this.animating&&!this.params.preventInteractionOnTransition&&s(r()),t.call(this,e,n,i,a,o)},e.loopFix=function(){const e=this.animating,t=e?r():null,i=this.activeIndex,a=e?this.slides[i]?.getBoundingClientRect()[axis]:null;t&&s(t);const o=n.call(this);if(t&&this.activeIndex!==i){const e=this.slides[this.activeIndex]?.getBoundingClientRect()[axis];null!=a&&null!=e&&Math.abs(a-e)>.1&&this.setTranslate(this.getTranslate()+a-e),r().forEach(e=>{const n=t.filter(t=>t.key===e.key&&t.slot===e.slot).reduce((t,n)=>!t||Math.abs(n.x-e.x)<Math.abs(t.x-e.x)?n:t,null);n&&(e.el.style.transitionDuration="0ms",e.el.style.transform=n.transform)}),this.wrapperEl.offsetWidth}return o},e.slidePrev=function(e=this.params.speed,t=!0,n){return this.enabled?this.params.loop&&1===this.params.slidesPerGroup?(!this.animating||!this.params.loopPreventsSlide)&&(this.loopFix(),this.slideTo(this.activeIndex-1,e,t,n)):i.call(this,e,t,n):this},e.on("beforeDestroy",()=>{e.slideTo=t,e.loopFix=n,e.slidePrev=i})}
// The site's existing DD text effect: opacity follows viewport progress.
const ddNodes=new Map();let ddFrame=0,ddController=null,ddReduced=null;
function ddOpacity(progress){const p=Math.max(0,Math.min(1,progress));return p<.5?p:p<=.75?.5:.5-(p-.75)*1.6;}
function ddSchedule(){if(!ddFrame&&!document.hidden&&ddNodes.size)ddFrame=requestAnimationFrame(ddRender);}
function ddRender(){const time=performance.now();ddFrame=0;let moving=false;for(const [node,state] of ddNodes){if(ddReduced.matches){node.style.opacity=state.original;state.value=Number.parseFloat(getComputedStyle(node).opacity);state.startup=null;continue;}const target=ddOpacity((innerHeight-node.getBoundingClientRect().top)/innerHeight);if(state.startup){const startup=state.startup;startup.start??=time;const progress=Math.min(1,(time-startup.start)/250),eased=1-Math.pow(1-progress,3);state.value=startup.from+(target-startup.from)*eased;if(progress<1)moving=true;else state.startup=null;}else{state.value+=(target-state.value)*.5;if(Math.abs(target-state.value)<.001)state.value=target;else moving=true;}node.style.opacity=String(state.value);}if(moving)ddSchedule();}
function ddText(nodes){
 if(!ddController){ddController=new AbortController();const {signal}=ddController;ddReduced=matchMedia('(prefers-reduced-motion: reduce)');for(const event of ['scroll','resize'])window.addEventListener(event,ddSchedule,{signal,passive:true});document.addEventListener('visibilitychange',ddSchedule,{signal});ddReduced.addEventListener('change',ddSchedule,{signal});}
 const list=[...nodes];for(const node of list){const state=ddNodes.get(node);if(state){state.clients++;continue;}const original=node.style.opacity,value=Number.parseFloat(getComputedStyle(node).opacity);ddNodes.set(node,{original,value,clients:1,startup:ddReduced.matches?null:{from:value,start:null}});}
 ddSchedule();let destroyed=false;return{destroy(){if(destroyed)return;destroyed=true;for(const node of list){const state=ddNodes.get(node);if(state&&!--state.clients){node.style.opacity=state.original;ddNodes.delete(node);}}if(!ddNodes.size){cancelAnimationFrame(ddFrame);ddFrame=0;ddController.abort();ddController=null;ddReduced=null;}}};
}
// Review timing preserves the original drawer/card choreography.
const reviews=Object.freeze({fade:400,openDelay:500,nextDelay:100,previousDelay:140,cardDelay:60,initialDelay:100,easing:'ease'});
function fadeController(){
 const states=new Map();
 function to(node,target,milliseconds=reviews.fade){
  if(!node)return;const old=states.get(node);
  if(old?.target===target&&(milliseconds!==0||!old.animation))return;
  const from=Number.parseFloat(getComputedStyle(node).opacity)||0,original=old?old.original:node.style.opacity;
  old?.animation?.cancel();node.style.opacity=String(target);
  const state={target,original,animation:null};states.set(node,state);
  if(milliseconds>0&&Math.abs(from-target)>.001&&node.animate){
   const animation=node.animate([{opacity:from},{opacity:target}],{duration:milliseconds,easing:'ease-out'});state.animation=animation;
   animation.onfinish=()=>{if(states.get(node)===state)state.animation=null;};
  }
 }
 return Object.freeze({to,destroy(){states.forEach((state,node)=>{state.animation?.cancel();node.style.opacity=state.original;});states.clear();}});
}
window.TDBMotion=Object.freeze({version:'1.2.2',defaults,duration,bindSwiper,ddText,ddOpacity,reviews,fadeController});
})();
