/* One immutable motion profile, installed by the existing startup entry.
 * config/motion.json also generates the CSS tokens. No requests, observers,
 * computed-style reads or additional animation loop are needed here.
 */
(() => {
  'use strict';
  if (window.TDBMotionProfile) return;
  const config = __TDB_MOTION_PROFILE__;
  const { distance } = config;
  const physics = Object.freeze(config.physics);
  function createProfile({ pace, character }) {
    const curves = Object.freeze(config.characters[character]);
    const time = (milliseconds) => Math.round(milliseconds * pace);
    const easing = (role, original) => curves[role] || original;
    // Clamp distance before applying this family's independent pace.
    const horizontal = (width = innerWidth) =>
      time(
        matchMedia('(min-width:' + distance.desktopBreakpoint + 'px)').matches
          ? Math.round(
              Math.min(
                distance.maximum,
                Math.max(
                  distance.desktopMin,
                  distance.base * Math.sqrt(width / distance.reference),
                ),
              ),
            )
          : distance.base,
      );
    const vertical = (
      height = document.documentElement.clientHeight || innerHeight || distance.reference,
    ) =>
      time(
        Math.round(
          Math.min(
            distance.maximum,
            Math.max(distance.base, distance.base * Math.sqrt(height / distance.reference)),
          ),
        ),
      );
    return Object.freeze({
      pace,
      character,
      time,
      easing,
      horizontal,
      vertical,
      physics,
      elapsed: (milliseconds) => milliseconds / pace,
    });
  }
  const content = createProfile(config);
  const families = Object.freeze(
    Object.fromEntries(
      Object.entries(config.families || {}).map(([name, settings]) => [
        name,
        createProfile(settings),
      ]),
    ),
  );
  const forFamily = (name) => families[name] || content;
  // Set the same generated tokens once at startup, so deferred CSS and early JS
  // cannot briefly use different profiles. There are no layout reads here.
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--tdb-motion-pace', String(content.pace));
  for (const [role, curve] of Object.entries(config.characters[content.character]))
    if (role !== 'fade' || !families.fade)
      rootStyle.setProperty('--tdb-motion-ease-' + role, curve);
  for (const name of ['navigation', 'accordion', 'fade']) {
    const family = forFamily(name);
    rootStyle.setProperty('--tdb-' + name + '-pace', String(family.pace));
    for (const role of ['travel', 'panel', 'release', 'fade', 'control'])
      rootStyle.setProperty('--tdb-' + name + '-ease-' + role, family.easing(role, 'initial'));
  }
  if (families.fade)
    rootStyle.setProperty('--tdb-motion-ease-fade', families.fade.easing('fade', 'initial'));
  window.TDBMotionProfile = Object.freeze({
    version: '1.1.0',
    ...content,
    easing: (role, original) =>
      (role === 'fade' ? forFamily('fade') : content).easing(role, original),
    families,
    forFamily,
  });
})();
