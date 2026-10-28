/* Google owns map tiles and routing; Webflow owns the form and reserved geometry. */
(() => {
  'use strict';
  if (window.TDBJourney) return;
  const destination = { lat: 52.6300414, lng: -1.8014216 };
  const destinationAddress = 'The Dental Barns, Blackbrook Barns, Lichfield WS14 0PS, UK';
  const owners = new Map();
  const lifecycle = new AbortController();
  let sdkFlight,
    authFailed = false,
    disposed = false,
    unsubscribe;
  const permitted = () => !disposed && Boolean(window.TDBConsent?.allows('functionality'));
  const colour = (root, token) => getComputedStyle(root).getPropertyValue(token).trim();
  const nearby = (node) => {
    const r = node.getBoundingClientRect();
    return r.bottom > -400 && r.top < window.innerHeight + 400;
  };
  function sdk(root) {
    if (!permitted()) return Promise.reject(Error('permission'));
    if (authFailed) return Promise.reject(Error('map-unavailable'));
    if (window.google?.maps?.importLibrary) return Promise.resolve();
    if (sdkFlight) return sdkFlight;
    const key = root.dataset.tdbMapsKey;
    if (!key || !root.dataset.tdbMapId) return Promise.reject(Error('configuration'));
    const url = new URL('https://maps.googleapis.com/maps/api/js');
    url.search = new URLSearchParams({
      key,
      v: 'quarterly',
      loading: 'async',
      language: 'en-GB',
      region: 'GB',
      callback: 'TDBJourneyGoogleReady',
    });
    let timeout;
    const initialized = new Promise((resolve, reject) => {
      window.TDBJourneyGoogleReady = resolve;
      const previous = window.gm_authFailure;
      window.gm_authFailure = () => {
        authFailed = true;
        reject(Error('map-unavailable'));
        for (const owner of owners.values()) {
          suspend(owner);
          owner.output.textContent =
            'The map is unavailable. Please open directions in Google Maps.';
        }
        previous?.();
      };
      timeout = setTimeout(() => reject(Error('map-timeout')), 20000);
    });
    // With loading=async, script load precedes Google's initialization callback.
    // Transport readiness and API readiness are deliberately separate.
    sdkFlight = Promise.all([
      window.TDBModules.load(url, { attribute: 'data-tdb-google-maps' }),
      initialized,
    ])
      .catch(() => {
        sdkFlight = null;
        throw Error('map-unavailable');
      })
      .finally(() => clearTimeout(timeout));
    return sdkFlight;
  }
  function directions(origin) {
    const url = new URL('https://www.google.com/maps/dir/');
    url.search = new URLSearchParams({
      api: '1',
      destination: destinationAddress,
      travelmode: 'driving',
    });
    if (origin) url.searchParams.set('origin', origin);
    return url.href;
  }
  function mount(root) {
    if (owners.has(root)) return owners.get(root);
    const form = root.querySelector('form');
    const canvas = root.querySelector('[data-tdb-journey-map]');
    const output = root.querySelector('[data-tdb-journey-status]');
    const link = root.querySelector('.tdb-journey-directions');
    if (!form || !canvas || !output || !link) return null;
    const initial = output.textContent;
    const placeholder = [...canvas.childNodes];
    const controller = new AbortController();
    const owner = {
      root,
      form,
      canvas,
      output,
      link,
      initial,
      placeholder,
      controller,
      map: null,
      marker: null,
      lines: [],
      pending: '',
      request: 0,
      generation: 0,
      running: '',
      loading: null,
      last: '',
      lastAt: 0,
      seen: false,
    };
    owners.set(root, owner);
    form.addEventListener(
      'submit',
      (event) => {
        event.preventDefault();
        submit(root, form.elements.namedItem('origin')?.value || '');
      },
      { signal: controller.signal },
    );
    form.addEventListener(
      'input',
      () => {
        owner.request++;
        owner.pending = '';
        owner.running = '';
        clearRoute(owner);
        output.textContent = initial;
        link.href = directions('');
        form.removeAttribute('aria-busy');
      },
      { signal: controller.signal },
    );
    observer?.observe(root);
    return owner;
  }
  function clearRoute(owner) {
    owner.lines.forEach((line) => line.setMap(null));
    owner.lines = [];
    owner.last = '';
  }
  async function map(owner) {
    if (owner.map) return owner.map;
    if (owner.loading) return owner.loading;
    const epoch = owner.generation;
    owner.loading = (async () => {
      await sdk(owner.root);
      if (!permitted() || !owner.root.isConnected || epoch !== owner.generation) return null;
      const [{ Map }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
        window.google.maps.importLibrary('maps'),
        window.google.maps.importLibrary('marker'),
      ]);
      if (!permitted() || !owner.root.isConnected || epoch !== owner.generation) return null;
      owner.canvas.replaceChildren();
      owner.map = new Map(owner.canvas, {
        center: destination,
        zoom: 12,
        mapId: owner.root.dataset.tdbMapId,
        colorScheme: 'LIGHT',
        gestureHandling: 'cooperative',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        clickableIcons: false,
        keyboardShortcuts: true,
      });
      const cream = colour(owner.root, '--base-color-brand--orange-1');
      const pin = new PinElement({
        background: colour(owner.root, '--base-color-neutral--neutral-darker'),
        borderColor: cream,
        glyphColor: cream,
        scale: 1.15,
      });
      owner.marker = new AdvancedMarkerElement({
        map: owner.map,
        position: destination,
        title: 'The Dental Barns — free parking',
        content: pin,
      });
      owner.root.dataset.journeyMap = 'ready';
      return owner.map;
    })()
      .catch(() => {
        if (permitted() && owner.generation === epoch)
          owner.output.textContent =
            'The map could not load. You can still open directions in Google Maps.';
        throw Error('map-unavailable');
      })
      .finally(() => {
        owner.loading = null;
      });
    return owner.loading;
  }
  async function submit(root, rawOrigin) {
    const owner = mount(root);
    if (!owner) return;
    const origin = String(rawOrigin).trim().replace(/\s+/g, ' ').slice(0, 120);
    if (origin.length < 2) {
      owner.output.textContent = 'Please enter your postcode or town.';
      owner.form.elements.namedItem('origin')?.focus();
      return;
    }
    if (owner.last === origin && Date.now() - owner.lastAt < 60000) return;
    if (owner.running === origin) return;
    owner.pending = origin;
    owner.link.href = directions(origin);
    if (!permitted()) {
      owner.output.textContent =
        'Enable functional cookies to see your journey here, or open directions in Google Maps.';
      window.openCookieSettingsPanel?.();
      return;
    }
    owner.pending = '';
    const id = ++owner.request;
    owner.running = origin;
    clearRoute(owner);
    owner.form.setAttribute('aria-busy', 'true');
    owner.output.textContent = 'Finding your way to The Dental Barns…';
    const valid = () => permitted() && root.isConnected && owner.request === id;
    try {
      const instance = await map(owner);
      if (!instance || !valid()) return;
      const { Route } = await window.google.maps.importLibrary('routes');
      if (!valid()) return;
      const result = await Route.computeRoutes({
        origin: origin + ', UK',
        destination: destinationAddress,
        travelMode: 'DRIVING',
        routingPreference: 'TRAFFIC_UNAWARE',
        language: 'en-GB',
        region: 'uk',
        fields: ['path', 'durationMillis', 'distanceMeters'],
      });
      if (!valid()) return;
      const route = result.routes?.[0];
      if (!route?.path?.length || !Number.isFinite(route.durationMillis)) throw Error('no-route');
      if (result.geocodingResults?.origin?.partialMatch) throw Error('ambiguous');
      const { LatLngBounds } = await window.google.maps.importLibrary('core');
      if (!valid()) return;
      owner.lines = route.createPolylines();
      owner.lines.forEach((line) => {
        line.setOptions({
          strokeColor: colour(root, '--base-color-neutral--neutral-dark'),
          strokeOpacity: 1,
          strokeWeight: 5,
        });
        line.setMap(instance);
      });
      const bounds = new LatLngBounds();
      route.path.forEach((point) => bounds.extend(point));
      instance.fitBounds(bounds, 48);
      const minutes = Math.max(1, Math.round(route.durationMillis / 60000));
      const miles = (route.distanceMeters / 1609.344).toLocaleString('en-GB', {
        maximumFractionDigits: 1,
      });
      owner.output.textContent = `Around ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} by car · ${miles} miles from ${origin}. An estimate without live traffic; check Google Maps before you travel.`;
      owner.last = origin;
      owner.lastAt = Date.now();
      root.dataset.journeyState = 'result';
    } catch (error) {
      if (!valid()) return;
      owner.output.textContent =
        error.message === 'ambiguous'
          ? 'Please enter a more specific postcode or town, or open directions in Google Maps.'
          : 'We could not calculate that journey. Try a full UK postcode or open directions in Google Maps.';
      root.dataset.journeyState = 'error';
    } finally {
      if (owner.request === id) {
        owner.running = '';
        owner.form.removeAttribute('aria-busy');
      }
    }
  }
  function suspend(owner) {
    owner.request++;
    owner.generation++;
    owner.running = '';
    clearRoute(owner);
    if (owner.marker) owner.marker.map = null;
    if (owner.map) window.google?.maps?.event?.clearInstanceListeners(owner.map);
    owner.marker = owner.map = null;
    owner.canvas.replaceChildren(...owner.placeholder);
    owner.form.removeAttribute('aria-busy');
    owner.output.textContent = owner.initial;
    owner.link.href = directions('');
    delete owner.root.dataset.journeyMap;
    delete owner.root.dataset.journeyState;
  }
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const owner = owners.get(entry.target);
              if (owner && entry.isIntersecting) {
                owner.seen = true;
                if (permitted()) map(owner).catch(() => {});
              }
            }
          },
          { rootMargin: '400px' },
        )
      : null;
  function refresh() {
    if (disposed) return;
    document.querySelectorAll('[data-tdb-journey]').forEach(mount);
    for (const [root, owner] of owners) {
      if (!root.isConnected) {
        suspend(owner);
        owner.controller.abort();
        observer?.unobserve(root);
        owners.delete(root);
        continue;
      }
      if (!permitted()) {
        if (owner.map || owner.loading) suspend(owner);
        continue;
      }
      if (owner.pending) submit(root, owner.pending);
      else if (owner.seen || nearby(root)) map(owner).catch(() => {});
    }
  }
  window.TDBJourney = Object.freeze({
    version: '1.0.0',
    refresh,
    submit,
    owns: (root) => owners.has(root),
    destroy() {
      disposed = true;
      lifecycle.abort();
      unsubscribe?.();
      observer?.disconnect();
      for (const owner of owners.values()) {
        owner.pending = '';
        suspend(owner);
        owner.controller.abort();
      }
      owners.clear();
    },
  });
  window.addEventListener('pageshow', refresh, { signal: lifecycle.signal });
  window.addEventListener('online', refresh, { signal: lifecycle.signal });
  unsubscribe = window.TDBConsent?.subscribe(refresh);
  if (!unsubscribe) refresh();
})();
