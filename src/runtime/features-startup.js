/* Definition-only: consent-released runtime starts each loader in its own turn. */
const TDBRuntimeModuleRoot = new URL('./', document.currentScript.src);
const TDBFeatureStartup = (() => {
  let flight;
  const done=new Set();
  const steps=[prepareBrevoConsent,prepareAttributionLoader,prepareFormsLoader,prepareCarouselArrowFeedback,prepareVIPFocus,prepareVIPDrawerLoader,prepareFloatingAnnouncement,
    prepareSliderLoader,prepareCarouselStyles,prepareTooltipLoader,
    prepareSliderFocusLoader,prepareSmoothScroll,updateNativeFooterDates];
  function start(schedule, active=()=>true) {
    if(flight)return flight;
    flight=(async()=>{
      for(const step of steps) {
        if(!active())return;
        if(done.has(step))continue;
        await schedule(()=>{if(active()){step();done.add(step);}});
      }
      if(!active())return;
      window.dispatchEvent(new Event('tdb:features-ready'));
    })().catch(error=>{flight=null;throw error;});
    return flight;
  }
  return Object.freeze({start});
})();
