/* Definition-only: consent-released runtime starts each loader in its own turn. */
const TDBFeatureStartup = (() => {
  let flight;
  const done = new Set();
  const steps = [
    prepareLazyIconMasks,
    prepareBrevoConsent,
    prepareUSPDrawerLoader,
    preparePageBreakLoader,
    prepareHeroCampaignLoader,
    prepareAboutIntroLoader,
    prepareServiceProcessLoader,
    prepareTreatmentGuideLoader,
    prepareJourneyLoader,
    prepareFiveSensesLauncher,
    prepareReviewFeatureLoader,
    prepareReviewWidgetLoader,
    prepareInstagramFeatureLoader,
    prepareFirstImpressionsFeatureLoader,
    prepareSmileFeatureLoader,
    prepareBlogFeatureLoader,
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
    updateNativeFooterDates,
  ];
  function start(schedule, active = () => true) {
    if (flight) return flight;
    let incomplete = false;
    flight = (async () => {
      const failures = [];
      // Prepare the clinician's review excerpts before the shared review carousel starts.
      const profile = document.querySelector?.('[data-tdb-person-profile]');
      const profileAllowed = () => active() && window.TDBConsent?.allows();
      if (profile && profileAllowed()) {
        try {
          await schedule(
            () =>
              profileAllowed() &&
              window.TDBModules.load(new URL('tdb-person-profile.js', TDBRuntimeModuleRoot), {
                ready: () => Boolean(window.TDBPersonProfile),
              }),
          );
          if (profileAllowed()) window.TDBPersonProfile.mount(profile);
        } catch (error) {
          incomplete = true;
          failures.push({ feature: 'People profile', error });
          console.warn('[TDB runtime] Profile CMS selections unavailable.', error);
        }
      }
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
