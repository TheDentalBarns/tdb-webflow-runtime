/* Definition-only: consent-released runtime starts each loader in its own turn. */
const TDBFeatureStartup = (() => {
  let flight;
  const done = new Set();
  const steps = [
    prepareLazyIconMasks,
    prepareBrevoConsent,
    prepareUSPDrawerLoader,
    preparePageBreakLoader,
    prepareJourneyLoader,
    prepareFiveSensesLauncher,
    prepareReviewFeatureLoader,
    prepareReviewWidgetLoader,
    prepareInstagramFeatureLoader,
    prepareSmileFeatureLoader,
    prepareAttributionLoader,
    prepareFormsLoader,
    prepareCarouselArrowFeedback,
    prepareVIPFocus,
    prepareVIPDrawerLoader,
    prepareFloatingAnnouncement,
    prepareSliderLoader,
    prepareCarouselStyles,
    prepareTooltipLoader,
    prepareSliderFocusLoader,
    prepareSmoothScroll,
    updateNativeFooterDates,
  ];
  function start(schedule, active = () => true) {
    if (flight) return flight;
    let incomplete = false;
    flight = (async () => {
      const failures = [];
      for (const step of steps) {
        if (!active()) {
          incomplete = true;
          return;
        }
        if (done.has(step)) continue;
        await schedule(() => {
          if (!active()) {
            incomplete = true;
            return;
          }
          try {
            step();
            done.add(step);
          } catch (error) {
            incomplete = true;
            failures.push({ feature: step.name, error });
            console.warn('[TDB runtime] Feature initialization failed:', step.name, error);
          }
        });
      }
      if (!active()) {
        incomplete = true;
        return;
      }
      // Healthy features can settle captured input even if a sibling failed.
      // Failed steps remain retryable; completed owners never initialise twice.
      window.dispatchEvent(new CustomEvent('tdb:features-ready', { detail: { failures } }));
      return { failures };
    })()
      .catch((error) => {
        incomplete = true;
        throw error;
      })
      .finally(() => {
        if (incomplete) flight = null;
      });
    return flight;
  }
  return Object.freeze({ start });
})();
