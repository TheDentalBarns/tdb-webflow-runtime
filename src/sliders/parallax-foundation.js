/* Compatibility API retained for existing slider loaders and pinned plugins. */
(() => {
  if (window.TDBParallax) return;
  const presentation = window.TDBParallaxPresentation;
  const controls = window.TDBParallaxControls;
  function refresh(root = document) {
    if (root instanceof Element && root.matches('.parallax-swiper_component')) controls.prepare(root);
    root.querySelectorAll?.('.parallax-swiper_component').forEach(node => controls.prepare(node));
    window.TDBParallaxProgress?.refresh(root);
  }
  window.TDBParallax=Object.freeze({version:'1.4.0',refresh,prepare:controls.prepare,
    bind:presentation.bind,setMoving:presentation.setMoving,setEntry:presentation.setEntry});
})();
