(()=>{
  const VERSION='0.1.6';
  const mq=matchMedia('(min-width:768px)');
  const d=document.getElementById('tdb-vip-drawer');
  if(!d||d.dataset.tdbVipDesktopInit==='true')return;
  const h=d.querySelector('.tdb-vip-drawer-handle');
  const l=d.querySelector('.tdb-vip-drawer-label');
  const b=d.querySelector('.tdb-vip-drawer-body');
  if(!h||!l||!b)return;

  d.dataset.tdbVipDesktopInit='true';
  [d,b].forEach(x=>['','-touch','-wheel','-vertical'].forEach(s=>x.setAttribute('data-lenis-prevent'+s,'')));

  const html=document.documentElement;
  const fieldSel='input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="reset"]),textarea,select';
  const norm=s=>String(s||'').replace(/Â®|\u00ae/gi,'').replace(/\s+/g,' ').trim().toLowerCase();
  const isField=x=>!!(x&&x.matches&&x.matches(fieldSel));
  const isVipHash=()=>/^#vip/i.test(location.hash||'');
  const lenis=m=>{try{window.lenis&&window.lenis[m]&&window.lenis[m]()}catch(e){}};
  const U=120,D=140;
  const C={
    'composite-bonding':['Join the Composite Bonding waitlist',['Composite Bonding']],
    'teeth-whitening':['Join the Teeth Whitening waitlist',['Enlighten® Teeth Whitening','Teeth Whitening','Whitening']],
    'clear-aligners':['Join the Clear Aligners waitlist',['Clear Aligners','Clear Aligner']],
    invisalign:['Join the Invisalign® waitlist',['Invisalign®','Invisalign']],
    veneers:['Join the Veneers waitlist',['e.max® Porcelain Veneers','Porcelain Veneers','Veneers']]
  };
  const slug=Object.keys(C).find(k=>location.pathname.toLowerCase().includes(k));
  const T=slug&&{slug,label:C[slug][0],vals:C[slug][1]};

  h.removeAttribute('href');
  h.removeAttribute('data-vip-open');
  h.setAttribute('role','button');
  h.tabIndex=0;
  h.setAttribute('aria-expanded','false');
  l.textContent=T?T.label:'Join VIP';
  h.setAttribute('aria-label',T?T.label:'Join the VIP waitlist');
  if(T)d.dataset.treatment=T.slug;

  let st=0,up=0,dn=0,tick=0,near=0,tm=0,ly=Math.max(scrollY,html.scrollTop,0),routeY=Math.max(scrollY,html.scrollTop,0);
  const pageY=()=>Math.max(scrollY,html.scrollTop,0);

  function hideTitle(){
    d.querySelectorAll('.tdb-vip-drawer-body .vip-form_top,.tdb-vip-drawer-body .line-divider').forEach(x=>x.classList.add('tdb-vip-hidden-title'));
    d.querySelectorAll('.tdb-vip-drawer-body *').forEach(x=>{
      if(x.matches('input,select,textarea,button'))return;
      const t=norm(x.textContent);
      if(t.length<140&&/join\s+(our\s+|the\s+)?vip\s+waitlist/.test(t)){
        x.classList.add('tdb-vip-hidden-title');
        const top=x.closest('.vip-form_top,.text-style-tagline,.text-color-orange');
        if(top)top.classList.add('tdb-vip-hidden-title');
      }
    });
  }

  function fieldStates(){
    d.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),select,textarea').forEach(x=>{
      const f=()=>x.classList.toggle('is-filled',!!String(x.value||'').trim());
      f();
      if(!x.dataset.tdbDesktopFill){
        x.addEventListener('input',f);
        x.addEventListener('change',f);
        x.dataset.tdbDesktopFill='1';
      }
    });
  }

  function preselect(){
    if(!T)return;
    const s=d.querySelector('#Treatment-Of-Interest,select[name="Treatment-Of-Interest"],select[name="Treatment of Interest"],select[id*="Treatment"],select[name*="Treatment"]');
    if(!s)return;
    const vals=T.vals.map(norm);
    const o=[...s.options].find(o=>{
      const v=norm(o.value),t=norm(o.textContent);
      return vals.some(x=>v===x||t===x||v.includes(x)||t.includes(x));
    });
    if(o){
      s.value=o.value;
      s.classList.add('is-filled');
      s.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }

  function refresh(){hideTitle();fieldStates();preselect()}
  refresh();
  setTimeout(hideTitle,150);
  setTimeout(hideTitle,600);

  function render(){
    d.classList.toggle('is-peeking',st===1);
    d.classList.toggle('is-open',st===2);
    d.classList.toggle('is-closing',st===3);
    h.setAttribute('aria-expanded',st===2?'true':'false');
    html.classList.toggle('tdb-vip-desktop-open',st===2||st===3);
    html.classList.toggle('tdb-vip-menu-away',st===2||st===3);
  }

  function reset(){
    clearTimeout(tm);
    st=up=dn=0;
    d.classList.remove('is-peeking','is-open','is-closing');
    h.setAttribute('aria-expanded','false');
    html.classList.remove('tdb-vip-desktop-open','tdb-vip-menu-away');
    ly=routeY=pageY();
    lenis('start');
    lenis('resize');
  }

  function closeDrawer(){
    if(st===2){
      const a=document.activeElement;
      if(isField(a)&&d.contains(a))a.blur();
      st=3;
      render();
      tm=setTimeout(reset,540);
    }else reset();
  }

  d.addEventListener('transitionend',e=>{
    if(e.target===d&&e.propertyName==='transform'&&st===3)reset();
  });

  function peek(){
    if(st||near||!mq.matches)return;
    st=1;
    render();
  }

  function openDrawer(){
    if(!mq.matches)return;
    clearTimeout(tm);
    ly=pageY();
    st=2;
    d.scrollTop=0;
    render();
    lenis('stop');
    requestAnimationFrame(()=>requestAnimationFrame(()=>{refresh();d.scrollTop=0;}));
  }

  function restorePageY(y){
    try{
      if(window.lenis&&typeof window.lenis.scrollTo==='function')window.lenis.scrollTo(y,{immediate:true,force:true});
      else scrollTo(0,y);
    }catch(e){scrollTo(0,y)}
  }

  function routeVipHash(){
    if(!mq.matches||!isVipHash())return false;
    const y=routeY;
    try{history.replaceState(history.state,'',location.pathname+location.search)}catch(e){}
    restorePageY(y);
    ly=y;
    openDrawer();
    return true;
  }

  function scrollCheck(){
    if(!mq.matches||st===2||st===3){tick=0;return}
    const y=pageY(),delta=y-ly;
    if(delta>0){
      up=0;
      dn+=delta;
      if(dn>D&&st===1)reset();
    }else if(delta<0){
      dn=0;
      up+=Math.abs(delta);
      if(up>U&&y>innerHeight*.5&&st===0&&!near)peek();
    }
    if(y<=innerHeight*.5&&st!==0)reset();
    if(near&&st!==0)reset();
    ly=y;
    tick=0;
  }

  addEventListener('scroll',()=>{
    if(mq.matches&&!isVipHash()&&st!==2&&st!==3)routeY=pageY();
    if(!mq.matches||st===2||tick)return;
    tick=1;
    requestAnimationFrame(scrollCheck);
  },{passive:true});

  ['wheel','touchmove'].forEach(ev=>document.addEventListener(ev,e=>{
    if(st===2&&!d.contains(e.target))e.preventDefault();
  },{passive:false,capture:true}));

  document.addEventListener('click',e=>{
    const a=e.target.closest&&e.target.closest('a[href]');
    if(!a||d.contains(a)||!mq.matches)return;
    if(!/#vip/i.test(a.getAttribute('href')||''))return;
    e.preventDefault();
    e.stopPropagation();
    routeY=pageY();
    openDrawer();
  },true);

  addEventListener('hashchange',routeVipHash);

  document.addEventListener('click',e=>{
    const a=e.target.closest&&e.target.closest('#tdb-vip-drawer .tdb-vip-drawer-handle');
    if(!a||!mq.matches)return;
    e.preventDefault();
    e.stopPropagation();
    st===2?closeDrawer():openDrawer();
  },true);

  h.addEventListener('keydown',e=>{
    if(!mq.matches)return;
    if(e.key==='Enter'||e.key===' '){
      e.preventDefault();
      st===2?closeDrawer():openDrawer();
    }
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&st===2)closeDrawer();
  });

  const vip=[...document.querySelectorAll('#VIP')].find(x=>!d.contains(x));
  if(vip)new IntersectionObserver(([e])=>{
    near=e.isIntersecting;
    if(near&&st!==2&&st!==3&&st!==0)reset();
  },{rootMargin:'120px 0px'}).observe(vip);

  function sync(){
    if(mq.matches){
      h.removeAttribute('href');
      h.removeAttribute('data-vip-open');
      d.classList.add('is-ready');
      ly=routeY=pageY();
      refresh();
      requestAnimationFrame(routeVipHash);
    }else{
      reset();
      d.classList.remove('is-ready');
    }
  }
  mq.addEventListener?mq.addEventListener('change',sync):mq.addListener&&mq.addListener(sync);
  sync();

  window.TDBVIPDrawerDesktop=Object.freeze({
    version:VERSION,
    refresh,
    open:openDrawer,
    close:closeDrawer,
    reset,
    routeVipHash,
    status:()=>({state:st,desktop:mq.matches,treatment:T?T.slug:null})
  });
})();
