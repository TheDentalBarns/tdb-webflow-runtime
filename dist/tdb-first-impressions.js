/* Shared treatment motion: 400ms slide, 300ms neighbour fade, rapid arrows and one entry move. */
(function(){
  'use strict';
  const VERSION='1.1.0';
  const BADGE='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m12 1 2.7 2.1 3.4-.1 1 3.3 2.9 1.8-.9 3.3.9 3.3-2.9 1.8-1 3.3-3.4-.1L12 23l-2.7-2.1-3.4.1-1-3.3L2 15.9l.9-3.3L2 9.3l2.9-1.8 1-3.3 3.4.1Z"/><path d="m7.5 12 3 3 6-6" fill="none" stroke="#222" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const CLOCK='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="10" stroke="currentColor"/><path d="M12 5v7h6" stroke="currentColor"/></svg>';
  function element(tag,className,text){const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;}
  function cmsCards(){
    const feed=document.querySelector('[data-tdb-first-impressions-feed]');
    if(!feed)return [];
    return Array.from(feed.querySelectorAll('.w-dyn-item')).flatMap(item=>{
      const value=key=>item.querySelector('[data-fi-'+key+']')?.textContent.trim()||'';
      const source=item.querySelector('[data-fi-image]'),src=source?.getAttribute('src');
      const words=['word-one','word-two','word-three'].map(value),initials=value('initials');
      if(!src||!initials||words.some(word=>!word))return [];
      const card=element('figure','tdb-fi-card swiper-slide');card.dataset.fiSlug=value('slug');card.setAttribute('role','group');card.setAttribute('aria-roledescription','slide');
      const image=element('img','');image.src=src;image.width=1080;image.height=1440;image.loading='lazy';image.decoding='async';image.draggable=false;image.alt=value('image-description')||source.alt||initials+'’s handwritten first-visit card: '+words.join(', ')+'.';
      const caption=element('figcaption','tdb-fi-banner'),line=element('p','tdb-fi-words',words.join(' · '));
      const meta=element('div','tdb-fi-meta'),author=element('span','tdb-fi-initials',initials),verified=item.querySelector('[data-fi-verified]');
      if(verified&&!verified.hidden&&!verified.classList.contains('w-condition-invisible')&&getComputedStyle(verified).display!=='none'){
        const badge=element('span','tdb-fi-verified');badge.setAttribute('role','img');badge.setAttribute('aria-label','Verified patient');badge.innerHTML=BADGE;author.append(badge);
      }
      meta.append(author);
      const dateText=value('date'),date=dateText?new Date(dateText):null;
      if(date&&!Number.isNaN(date.getTime())){
        const time=element('time','tdb-fi-date');time.dateTime=date.toISOString().slice(0,10);time.innerHTML=CLOCK;time.append(document.createTextNode(new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date)));meta.append(time);
      }
      caption.append(line,meta);card.append(image,caption);return [card];
    });
  }
  function mount(root){
    if(root.dataset.fiMounted)return;
    const viewport=root.querySelector('.tdb-fi-viewport'),count=root.querySelector('.tdb-fi-count');
    const previous=root.querySelector('.swiper-btn-prev'),next=root.querySelector('.swiper-btn-next');
    if(!viewport)return;
    const originals=cmsCards();root.dataset.fiSource='cms';root.setAttribute('aria-busy','false');
    if(!originals.length){root.hidden=true;return;}
    viewport.replaceChildren();
    root.dataset.fiMounted=VERSION;
    if(location.hostname==='dentalbarns.webflow.io'&&new URLSearchParams(location.search).get('first-impressions-preview')==='mobile')root.dataset.fiPreview='mobile';
    const total=originals.length,cells=new Map();
    const index=i=>(i%total+total)%total;
    let active=0,stride=0,moving=null,drag=null,entryDone=false,entryTimer=0,entryObserver=null,inView=false;
    const interactionEvents=['pointerdown','keydown','focusin'];
    function mark(target){cells.forEach((node,i)=>node.classList.toggle('is-current',i===target));}
    function make(i){
      if(cells.has(i))return cells.get(i);
      const node=originals[index(i)].cloneNode(true);
      node.removeAttribute('id');node.querySelectorAll('[id]').forEach(n=>n.removeAttribute('id'));
      node.setAttribute('aria-label',(index(i)+1)+' of '+total);node.dataset.fiIndex=String(index(i));
      viewport.append(node);cells.set(i,node);return node;
    }
    function neighbours(from,to=from){
      const buffer=total>1?2:0;
      for(let i=Math.min(from,to)-buffer;i<=Math.max(from,to)+buffer;i++)make(i);
      cells.forEach((node,i)=>{if(i<Math.min(from,to)-buffer||i>Math.max(from,to)+buffer){node.remove();cells.delete(i);}});
    }
    function paint(){
      neighbours(active);cells.forEach((node,i)=>{node.style.transform='translate3d('+((i-active)*stride)+'px,0,0)';node.inert=i!==active;node.setAttribute('aria-hidden',String(i!==active));});
      mark(active);count.textContent=(index(active)+1)+' of '+total;root.dataset.fiActive=String(index(active)+1);
      previous.disabled=next.disabled=total<2;
    }
    function finish(){
      if(!moving)return;
      const m=moving;moving=null;m.animations.forEach(animation=>animation.cancel());active=m.target;paint();
    }
    function go(target,offset=0){
      finish();if(total<2||target===active&&!offset)return;
      neighbours(active,target);
      const duration=Math.max(120,Math.min(400,400*Math.abs((target-active)*stride-offset)/Math.max(1,stride)));
      const animations=[];
      cells.forEach((node,i)=>{node.inert=true;node.setAttribute('aria-hidden','true');animations.push(node.animate([{transform:'translate3d('+((i-active)*stride+offset)+'px,0,0)'},{transform:'translate3d('+((i-target)*stride)+'px,0,0)'}],{duration,easing:'ease',fill:'forwards'}));});
      mark(target);const current=moving={target,animations};
      Promise.all(animations.map(animation=>animation.finished.catch(()=>{}))).then(()=>{if(moving===current)finish();});
    }
    function move(direction){finish();go(active+direction);}
    function measure(){
      const sample=cells.values().next().value;
      if(!sample)return;
      const width=sample.getBoundingClientRect().width,raw=getComputedStyle(root).getPropertyValue('--fi-gap').trim();
      const gap=raw.endsWith('vw')?parseFloat(raw)*innerWidth/100:parseFloat(raw)||20;
      const nextStride=width+gap;if(Math.abs(nextStride-stride)<.1)return;
      finish();drag=null;stride=nextStride;paint();
    }
    function stopEntry(reason){
      if(entryDone)return;
      entryDone=true;clearTimeout(entryTimer);entryObserver?.disconnect();
      root.dataset.fiEntry=reason;interactionEvents.forEach(type=>root.removeEventListener(type,userEntry,true));document.removeEventListener('visibilitychange',entryVisibility);
    }
    function userEntry(){stopEntry('skipped-interaction');}
    function scheduleEntry(){
      clearTimeout(entryTimer);if(entryDone||!inView||document.hidden)return;
      entryTimer=setTimeout(()=>{
        if(entryDone||!inView||document.hidden)return;
        if(root.contains(document.activeElement)||moving||drag){stopEntry('skipped-interaction');return;}
        stopEntry('advanced');move(1);
      },160);
    }
    function entryVisibility(){if(document.hidden)clearTimeout(entryTimer);else scheduleEntry();}
    originals.forEach(node=>node.remove());neighbours(active);measure();paint();
    previous.addEventListener('click',()=>{stopEntry('skipped-interaction');move(-1);});
    next.addEventListener('click',()=>{stopEntry('skipped-interaction');move(1);});
    viewport.addEventListener('pointerdown',event=>{
      if(total<2||!event.isPrimary||event.button!==0)return;
      finish();drag={id:event.pointerId,x:event.clientX,y:event.clientY,dx:0,time:event.timeStamp,horizontal:false};
    });
    viewport.addEventListener('pointermove',event=>{
      const state=drag;if(!state||state.id!==event.pointerId)return;
      const dx=event.clientX-state.x,dy=event.clientY-state.y;
      if(!state.horizontal){if(Math.abs(dy)>12&&Math.abs(dy)>Math.abs(dx)){drag=null;return;}if(Math.abs(dx)<12||Math.abs(dx)<1.3*Math.abs(dy))return;state.horizontal=true;viewport.setPointerCapture(event.pointerId);}
      event.preventDefault();state.dx=Math.max(-stride,Math.min(stride,dx));
      cells.forEach((node,i)=>node.style.transform='translate3d('+((i-active)*stride+state.dx)+'px,0,0)');mark(active+Math.round(-state.dx/stride));
    },{passive:false});
    function end(event,cancelled){
      const state=drag;if(!state||state.id!==event.pointerId)return;drag=null;
      if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);
      if(!state.horizontal){if(!cancelled){const rect=viewport.getBoundingClientRect(),width=cells.get(active).getBoundingClientRect().width,centre=(rect.width-width)/2,x=event.clientX-rect.left;if(x<centre)go(active-1);else if(x>centre+width)go(active+1);}return;}
      const distance=Math.abs(state.dx),elapsed=Math.max(1,event.timeStamp-state.time);
      const commit=!cancelled&&(distance>Math.max(40,.13*stride)||distance>20&&distance/elapsed>.45);
      go(active+(commit?(state.dx<0?1:-1):0),state.dx);
    }
    viewport.addEventListener('pointerup',event=>end(event,false));viewport.addEventListener('pointercancel',event=>end(event,true));
    root.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();stopEntry('skipped-interaction');move(event.key==='ArrowRight'?1:-1);}});
    new ResizeObserver(measure).observe(viewport);
    root.dataset.fiEntry='pending';
    if(total>1&&'IntersectionObserver'in window){
      interactionEvents.forEach(type=>root.addEventListener(type,userEntry,{capture:true,passive:true}));document.addEventListener('visibilitychange',entryVisibility);
      entryObserver=new IntersectionObserver(entries=>{inView=entries.some(entry=>entry.isIntersecting&&entry.intersectionRatio>=.3);scheduleEntry();},{threshold:[0,.3]});entryObserver.observe(viewport);
    }else stopEntry('skipped-unavailable');
  }
  function start(){document.querySelectorAll('[data-tdb-first-impressions]').forEach(mount);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
