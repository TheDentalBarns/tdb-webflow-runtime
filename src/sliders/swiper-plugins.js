/* TDB carousel plugin controller v1.0.0. Bundled into our custom Swiper build. */
// This file is inserted inside TDBSwiper's closure by the custom-engine build.
const plugins = new Map();
const pluginInstances = new WeakMap();
const observedRoots = new WeakMap();

function create(viewport, options, {bind = true} = {}) {
  const existing = viewport.swiper;
  if (existing && !existing.destroyed) {
    if (bind) bindSwiper(existing);
    return existing;
  }
  const swiper = new window.Swiper(viewport, options);
  if (bind) bindSwiper(swiper);
  viewport.setAttribute?.('data-tdb-swiper-runtime', '1.3.0');
  return swiper;
}

function register(name, plugin) {
  if (!name || typeof plugin?.mount !== 'function') throw Error('Invalid carousel plugin');
  const previous = plugins.get(name);
  if (previous && previous !== plugin) throw Error('Carousel plugin already registered: ' + name);
  plugins.set(name, plugin);
  return plugin;
}

function mount(name, root, ...args) {
  if (!root) return;
  const plugin = plugins.get(name);
  if (!plugin) throw Error('Carousel plugin unavailable: ' + name);
  let instances = pluginInstances.get(root);
  const current = instances?.get(name);
  if (current && !current.destroyed) return current;
  const mounted = plugin.mount(root, ...args);
  if (!mounted) return mounted;
  if (!instances) pluginInstances.set(root, instances = new Map());
  let instance = mounted;
  const release = () => {
    if (instances.get(name) !== instance) return;
    instances.delete(name);
    observedRoots.get(root)?.disconnect();
    observedRoots.delete(root);
    root.removeAttribute?.('data-tdb-slider-observed');
    root.removeAttribute?.('data-tdb-slider-init');
    root.removeAttribute?.('data-tdb-slider-type');
    root.removeAttribute?.('data-tdb-carousel-plugin');
  };
  if (typeof mounted.on === 'function') mounted.on('beforeDestroy', release);
  else if (typeof mounted.destroy === 'function') {
    // Native feature APIs can be frozen. Keep their public methods intact and
    // own cleanup in a facade, without mutating the feature's returned object.
    instance = Object.freeze({...mounted, destroy(...destroyArgs) {
      try { return mounted.destroy(...destroyArgs); }
      finally { release(); }
    }});
  }
  instances.set(name, instance);
  root.setAttribute?.('data-tdb-carousel-plugin', name);
  return instance;
}

function observe(name, root) {
  const plugin = plugins.get(name);
  if (!plugin || !root || observedRoots.has(root) || root.querySelector('.swiper')?.swiper) return;
  root.setAttribute('data-tdb-slider-observed', 'true');
  plugin.beforeObserve?.(root);
  if (!('IntersectionObserver' in window)) { mount(name, root); return; }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    if (root.isConnected) mount(name, root);
  }, {rootMargin: '100px'});
  observedRoots.set(root, observer);
  observer.observe(root);
}

function refresh(name, root = document) {
  const plugin = plugins.get(name);
  if (!plugin?.selector) return;
  if (root instanceof Element && root.matches(plugin.selector)) observe(name, root);
  root.querySelectorAll?.(plugin.selector).forEach(node => observe(name, node));
}

function prune() { plugins.forEach(plugin => plugin.prune?.()); }
