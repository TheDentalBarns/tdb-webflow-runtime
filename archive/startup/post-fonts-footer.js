/* Startup trial: defer these requests until DOM and fonts settle.
 * The inline tag retains the registry attributes for parsing-time page pins. */
(function () {
  'use strict';
  var config = document.currentScript;
  var started = false;
  function appendScripts() {
    if (started) return;
    started = true;
    [
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@240d05d5c038afba48151ae44d48f80ed9ece940/dist/tdb-consent.js',
      'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@1704f013937b3ebb406a6fed6f2338788fe4ded1/dist/tdb-navbar-loader.js',
    ].forEach(function (url, index) {
      var script = document.createElement('script');
      script.src = url;
      script.async = false;
      if (index === 0) {
        Array.prototype.forEach.call(config.attributes, function (attribute) {
          if (
            attribute.name.indexOf('data-') === 0 &&
            attribute.name !== 'data-tdb-post-fonts-loader'
          ) {
            script.setAttribute(attribute.name, attribute.value);
          }
        });
        script.setAttribute('data-cookie-script-js', '');
        script.setAttribute('data-tdb-consent-js', '');
      }
      document.body.appendChild(script);
    });
  }
  function afterFonts() {
    function nextTask() {
      setTimeout(appendScripts, 50);
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(nextTask);
    else nextTask();
  }
  function loadRuntime() {
    var fontsReady = document.fonts && document.fonts.ready;
    (fontsReady || Promise.resolve()).then(afterFonts, afterFonts);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadRuntime, { once: true });
  } else {
    loadRuntime();
  }
})();
