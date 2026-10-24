/* One immutable motion profile, installed by the existing startup entry.
 * config/motion.json also generates the CSS tokens. No requests, observers,
 * computed-style reads or additional animation loop are needed here.
 */
(() => {
  'use strict';
  if (window.TDBMotionProfile) return;
  const config = __TDB_MOTION_PROFILE__;
  const { pace, character, distance } = config;
  const curves = Object.freeze(config.characters[character]);
  // Set the same generated tokens once at startup, so deferred CSS and early JS
  // cannot briefly use different profiles. There are no layout reads here.
  const rootStyle = document.documentElement.style;
  rootStyle.setProperty('--tdb-motion-pace', String(pace));
  for (const [role, curve] of Object.entries(curves))
    rootStyle.setProperty('--tdb-motion-ease-' + role, curve);
  const time = (milliseconds) => Math.round(milliseconds * pace);
  const easing = (role, original) => curves[role] || original;
  // Clamp the original distance curve BEFORE applying the overall pace.
  // Otherwise desktop caps silently prevent the website from slowing down.
  const horizontal = (width = innerWidth) =>
    time(
      matchMedia('(min-width:' + distance.desktopBreakpoint + 'px)').matches
        ? Math.round(
            Math.min(
              distance.maximum,
              Math.max(distance.desktopMin, distance.base * Math.sqrt(width / distance.reference)),
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
  window.TDBMotionProfile = Object.freeze({
    version: '1.0.0',
    pace,
    character,
    time,
    easing,
    horizontal,
    vertical,
    physics: Object.freeze(config.physics),
    // Time-warp released/automatic movement, preserving its travel distance.
    // Pointer positions, gesture thresholds and input sampling stay unscaled.
    elapsed: (milliseconds) => milliseconds / pace,
  });
})();
