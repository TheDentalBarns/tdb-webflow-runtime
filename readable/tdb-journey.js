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
  const visible = (node) => {
    const r = node.getBoundingClientRect();
    return !document.hidden && r.bottom > 0 && r.top < innerHeight;
  };
  function busy(node, active) {
    if (!node) return;
    if (active) {
      node.dataset.tdbLoading = 'true';
      node.setAttribute('aria-busy', 'true');
    } else {
      delete node.dataset.tdbLoading;
      node.removeAttribute('aria-busy');
    }
  }
  function clearTickers(owner) {
    owner.finish = null;
    owner.tickers.forEach((ticker) => ticker.destroy());
    owner.tickers = [];
  }
  function message(owner, note, title = '00', detail = '00.0') {
    clearTickers(owner);
    owner.output.removeAttribute('aria-label');
    if (owner.time && owner.detail && owner.note) {
      owner.time.removeAttribute('aria-hidden');
      owner.detail.removeAttribute('aria-hidden');
      owner.time.textContent = title;
      owner.detail.textContent = detail;
      owner.note.textContent = note;
    } else owner.output.textContent = note;
  }
  function showResult(owner, minutes, miles, origin) {
    const timeText = (n) => `${n} ${n === 1 ? 'minute' : 'minutes'}`;
    const mileText = (n) => `${n.toLocaleString('en-GB', { maximumFractionDigits: 1 })} miles`;
    const note = 'Estimated driving time, without live traffic.';
    if (!owner.time || !owner.detail || !owner.note) {
      message(
        owner,
        `Around ${timeText(minutes)} by car · ${mileText(miles)} from ${origin}. ${note}`,
      );
      return;
    }
    const timeNumber = (n) => String(n).padStart(2, '0');
    const distanceNumber = (n) => (n / 10).toFixed(1).padStart(4, '0');
    const distance = Math.round(miles * 10);
    message(owner, note);
    owner.output.setAttribute(
      'aria-label',
      `Around ${timeText(minutes)} by car, ${mileText(miles)} from ${origin}. ${note}`,
    );
    owner.time.setAttribute('aria-hidden', 'true');
    owner.detail.setAttribute('aria-hidden', 'true');
    if (
      !window.TDBNativeTicker ||
      !window.TDBMotion ||
      window.TDBMotion.reduced.matches ||
      !visible(owner.output)
    ) {
      owner.time.textContent = timeNumber(minutes);
      owner.detail.textContent = distanceNumber(distance);
      return;
    }
    const values = [
      {
        slot: owner.time,
        final: minutes,
        current: minutes + Math.min(8, Math.max(1, Math.ceil(minutes * 0.1))),
        format: timeNumber,
      },
      {
        slot: owner.detail,
        final: distance,
        current: distance + Math.min(8, Math.max(1, Math.ceil(distance * 0.1))),
        format: distanceNumber,
      },
    ];
    for (const value of values) {
      const ticker = window.TDBNativeTicker.mount(value.slot, {
        valueClass: 'tdb-journey-ticker-value',
        incomingClass: 'tdb-journey-ticker-incoming',
      });
      ticker.sequence(
        Array.from({ length: value.current - value.final + 1 }, (_, index) =>
          value.format(value.current - index),
        ),
        -1,
      );
      owner.tickers.push(ticker);
    }
    owner.finish = () => {
      owner.tickers.forEach((ticker) => ticker.settle());
      owner.finish = null;
    };
  }
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
          message(owner, 'The map is unavailable. Please open directions in Google Maps.');
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
    const link = root.querySelector('[data-tdb-journey-directions],.tdb-journey-directions');
    if (!form || !canvas || !output || !link) return null;
    const time = output.querySelector('[data-tdb-journey-time-value]');
    const detail = output.querySelector('[data-tdb-journey-distance-value]');
    const note = output.querySelector('[data-tdb-journey-note]');
    const initial = note?.textContent || output.textContent;
    const placeholder = [...canvas.childNodes];
    const controller = new AbortController();
    const owner = {
      root,
      form,
      canvas,
      output,
      link,
      initial,
      time,
      detail,
      note,
      tickers: [],
      finish: null,
      button: form.querySelector('button[type="submit"],button'),
      tiles: null,
      tileWait: null,
      placeholder,
      controller,
      map: null,
      marker: null,
      info: null,
      pinClick: null,
      placeFlight: null,
      camera: null,
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
        message(owner, initial);
        delete root.dataset.journeyState;
        link.href = directions('');
        form.removeAttribute('aria-busy');
        busy(owner.button, false);
      },
      { signal: controller.signal },
    );
    document.addEventListener(
      'visibilitychange',
      () => {
        if (document.hidden) {
          owner.finish?.(false);
          owner.camera?.cancel(true);
        }
      },
      { signal: controller.signal },
    );
    for (const name of ['pointerdown', 'keydown', 'wheel'])
      canvas.addEventListener(name, () => owner.camera?.cancel(), {
        signal: controller.signal,
        passive: true,
      });
    observer?.observe(root);
    return owner;
  }
  function clearRoute(owner) {
    owner.camera?.cancel();
    owner.lines.forEach((line) => line.setMap(null));
    owner.lines = [];
    owner.last = '';
  }
  function businessLink(id = '') {
    const url = new URL('https://www.google.com/maps/search/');
    url.search = new URLSearchParams({ api: '1', query: destinationAddress });
    if (id) url.searchParams.set('query_place_id', id);
    return url.href;
  }
  async function business(owner) {
    if (owner.placeFlight) return owner.placeFlight;
    const epoch = owner.generation;
    const valid = () => permitted() && epoch === owner.generation && owner.root.isConnected;
    owner.placeFlight = (async () => {
      const { Place } = await window.google.maps.importLibrary('places');
      if (!valid()) throw Error('cancelled');
      // The shared native component owns the verified business identity.
      const id = owner.root.dataset.tdbMapsPlaceId;
      if (!id || !valid()) throw Error('business-unavailable');
      const place = new Place({ id });
      await place.fetchFields({ fields: ['displayName', 'rating', 'userRatingCount'] });
      if (!valid()) throw Error('cancelled');
      return place;
    })().catch((error) => {
      if (epoch === owner.generation) owner.placeFlight = null;
      throw error;
    });
    return owner.placeFlight;
  }
  async function openBusiness(owner, InfoWindow) {
    if (!permitted() || !owner.map) return;
    const epoch = owner.generation;
    const card = document.createElement('div');
    card.className = 'tdb-journey-place';
    const stars = document.createElement('span');
    stars.className = 'tdb-journey-place-stars';
    stars.setAttribute('aria-hidden', 'true');
    stars.hidden = true;
    const rating = document.createElement('p');
    rating.className = 'tdb-journey-place-rating';
    rating.setAttribute('role', 'status');
    rating.setAttribute('aria-label', 'Loading Google review rating');
    const count = document.createElement('span');
    count.className = 'tdb-journey-place-count';
    count.textContent = '…';
    rating.append(stars, count);
    const link = document.createElement('a');
    link.textContent = 'Google reviews';
    const google = document.createElement('img');
    google.src =
      'https://cdn.prod.website-files.com/677cf86cf9952f978d94d80c/6ac7b972653444187f404ca8_tdb-review-google.svg';
    google.alt = '';
    google.width = google.height = 24;
    link.append(google);
    link.href = businessLink(owner.root.dataset.tdbMapsPlaceId);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('aria-label', 'Read The Dental Barns Google reviews (opens in a new tab)');
    card.append(rating, link);
    owner.info?.close();
    const info = new InfoWindow({
      content: card,
      ariaLabel: 'The Dental Barns · Google reviews',
      maxWidth: 260,
    });
    owner.info = info;
    info.open({ map: owner.map, anchor: owner.marker, shouldFocus: true });
    try {
      const place = await business(owner);
      if (!permitted() || epoch !== owner.generation || owner.info !== info) return;
      link.href = businessLink(place.id);
      if (
        Number.isFinite(place.rating) &&
        place.rating >= 0 &&
        place.rating <= 5 &&
        Number.isSafeInteger(place.userRatingCount)
      ) {
        stars.style.setProperty('--tdb-rating-fill', (place.rating / 5) * 100 + '%');
        stars.hidden = false;
        count.textContent = `(${place.userRatingCount.toLocaleString('en-GB')})`;
        rating.setAttribute(
          'aria-label',
          `Rated ${place.rating.toFixed(1)} out of 5 from ${place.userRatingCount.toLocaleString('en-GB')} Google reviews`,
        );
      } else {
        count.textContent = 'Rating unavailable';
        rating.setAttribute('aria-label', 'Google review rating unavailable');
      }
    } catch (_) {
      if (owner.info === info && epoch === owner.generation) {
        count.textContent = 'Rating unavailable';
        rating.setAttribute('aria-label', 'Google review rating unavailable');
      }
    }
  }
  async function map(owner) {
    if (owner.map) return owner.map;
    if (owner.loading) return owner.loading;
    const epoch = owner.generation;
    busy(owner.canvas, true);
    owner.root.dataset.journeyMap = 'loading';
    owner.loading = (async () => {
      await sdk(owner.root);
      if (!permitted() || !owner.root.isConnected || epoch !== owner.generation) return null;
      const [{ Map, InfoWindow }, { AdvancedMarkerElement, PinElement }] = await Promise.all([
        window.google.maps.importLibrary('maps'),
        window.google.maps.importLibrary('marker'),
      ]);
      if (!permitted() || !owner.root.isConnected || epoch !== owner.generation) return null;
      owner.canvas.replaceChildren();
      owner.map = new Map(owner.canvas, {
        center: destination,
        zoom: 17,
        mapTypeId: 'satellite',
        tilt: 0,
        isFractionalZoomEnabled: true,
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
        title: 'The Dental Barns — view Google rating and reviews',
        gmpClickable: true,
        content: pin,
      });
      owner.pinClick = owner.marker.addListener('click', () => openBusiness(owner, InfoWindow));
      owner.root.dataset.journeyMap = 'ready';
      const loaded = () => {
        if (epoch !== owner.generation) return;
        clearTimeout(owner.tileWait);
        busy(owner.canvas, false);
      };
      owner.tiles = window.google.maps.event?.addListenerOnce?.(owner.map, 'tilesloaded', loaded);
      if (owner.tiles) owner.tileWait = setTimeout(loaded, 20000);
      else loaded();
      return owner.map;
    })()
      .catch(() => {
        if (permitted() && owner.generation === epoch) {
          busy(owner.canvas, false);
          delete owner.root.dataset.journeyMap;
          message(owner, 'The map could not load. You can still open directions in Google Maps.');
        }
        throw Error('map-unavailable');
      })
      .finally(() => {
        owner.loading = null;
      });
    return owner.loading;
  }
  async function presentRoute(owner, instance, bounds, valid) {
    const motion = window.TDBMotion;
    const direct = () => {
      instance.setMapTypeId('roadmap');
      instance.fitBounds(bounds, 48);
    };
    owner.info?.close();
    const projection = instance.getProjection?.();
    const center = instance.getCenter?.();
    const zoom = instance.getZoom();
    const width = owner.canvas.clientWidth - 96;
    const height = owner.canvas.clientHeight - 96;
    if (
      !motion?.fadeController ||
      motion.reduced.matches ||
      !visible(owner.canvas) ||
      !projection ||
      !center ||
      !Number.isFinite(zoom) ||
      width <= 0 ||
      height <= 0 ||
      !window.KeyframeEffect ||
      !window.Animation ||
      !instance.moveCamera
    ) {
      direct();
      return;
    }
    const southwest = projection.fromLatLngToPoint(bounds.getSouthWest());
    const northeast = projection.fromLatLngToPoint(bounds.getNorthEast());
    const start = projection.fromLatLngToPoint(center);
    if (!southwest || !northeast || !start) {
      direct();
      return;
    }
    // Google world coordinates span 256 pixels at zoom zero. Fit the complete
    // route once, then travel to that camera; a final fitBounds can snap.
    const spanX = (northeast.x - southwest.x + 256) % 256;
    const spanY = Math.abs(southwest.y - northeast.y);
    const targetX = southwest.x + spanX / 2;
    const targetY = (southwest.y + northeast.y) / 2;
    const deltaX = ((targetX - start.x + 384) % 256) - 128;
    const targetZoom = Math.max(
      1,
      Math.min(
        17,
        Math.log2(width / Math.max(spanX, 0.000001)),
        Math.log2(height / Math.max(spanY, 0.000001)),
      ),
    );
    const move = (progress) => {
      const currentZoom = zoom + (targetZoom - zoom) * progress;
      // Keep the starting place moving steadily across the screen as we pull
      // back, instead of panning miles away while the camera is still close.
      const pan = progress * Math.min(1, 2 ** (targetZoom - currentZoom));
      instance.moveCamera({
        center: projection.fromPointToLatLng(
          new window.google.maps.Point(start.x + deltaX * pan, start.y + (targetY - start.y) * pan),
        ),
        zoom: currentZoom,
        tilt: 0,
        heading: 0,
      });
    };
    const fade = motion.fadeController();
    let cancelled = false,
      completeWait;
    const camera = {
      cancel(settle = false) {
        cancelled = true;
        completeWait?.();
        fade.destroy();
        if (settle && valid()) direct();
      },
    };
    owner.camera = camera;
    const active = () => !cancelled && valid() && !motion.reduced.matches && visible(owner.canvas);
    const settled = () => {
      if (active()) return false;
      if (!cancelled && valid()) direct();
      return true;
    };
    const wait = (duration, action) =>
      new Promise((resolve) => {
        let listener;
        const done = () => {
          clearTimeout(timer);
          listener?.remove();
          if (completeWait === done) completeWait = null;
          resolve();
        };
        const timer = setTimeout(done, duration);
        completeWait = done;
        if (action) listener = window.google.maps.event?.addListenerOnce?.(instance, 'idle', done);
        action?.();
      });
    try {
      // Use the native animation timeline for the central travel easing without
      // adding a visual element or a second tween library. The frame loop is
      // bounded and is released on completion, user input or consent teardown.
      await new Promise((resolve) => {
        const effect = new KeyframeEffect(null, [], {
          duration: motion.defaults.mapTravel,
          easing: motion.easing('travel', 'cubic-bezier(.3,0,.2,1)'),
          fill: 'both',
        });
        const animation = new Animation(effect, document.timeline);
        let frame;
        const done = () => {
          cancelAnimationFrame(frame);
          animation.cancel();
          if (completeWait === done) completeWait = null;
          resolve();
        };
        const step = () => {
          if (settled()) return done();
          const progress = effect.getComputedTiming().progress ?? 0;
          move(progress);
          if (progress >= 1) return done();
          frame = requestAnimationFrame(step);
        };
        completeWait = done;
        animation.play();
        frame = requestAnimationFrame(step);
      });
      if (settled()) return;
      fade.to(owner.canvas, 0.7, motion.defaults.fadeOut);
      await wait(motion.defaults.fadeOut);
      if (settled()) return;
      // Only the map style changes here: centre and zoom are already final.
      await wait(motion.defaults.base * 2, () => instance.setMapTypeId('roadmap'));
      if (settled()) return;
      fade.to(owner.canvas, 1, motion.defaults.fadeIn);
      await wait(motion.defaults.fadeIn);
    } finally {
      completeWait?.();
      fade.destroy();
      if (owner.camera === camera) owner.camera = null;
    }
  }
  async function submit(root, rawOrigin) {
    const owner = mount(root);
    if (!owner) return;
    const origin = String(rawOrigin).trim().replace(/\s+/g, ' ').slice(0, 120);
    if (origin.length < 2) {
      message(owner, 'Please enter your postcode or town.');
      owner.form.elements.namedItem('origin')?.focus();
      return;
    }
    if (owner.last === origin && Date.now() - owner.lastAt < 60000) return;
    if (owner.running === origin) return;
    owner.pending = origin;
    owner.link.href = directions(origin);
    if (!permitted()) {
      message(
        owner,
        'Enable functional cookies to see your journey here, or open directions in Google Maps.',
      );
      window.openCookieSettingsPanel?.();
      return;
    }
    owner.pending = '';
    const id = ++owner.request;
    owner.running = origin;
    clearRoute(owner);
    owner.form.setAttribute('aria-busy', 'true');
    busy(owner.button, true);
    message(owner, 'Finding your way to The Dental Barns…');
    root.dataset.journeyState = 'loading';
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
      await presentRoute(owner, instance, bounds, valid);
      if (!valid()) return;
      const minutes = Math.max(1, Math.round(route.durationMillis / 60000));
      const miles = Math.round((route.distanceMeters / 1609.344) * 10) / 10;
      showResult(owner, minutes, miles, origin);
      owner.last = origin;
      owner.lastAt = Date.now();
      root.dataset.journeyState = 'result';
    } catch (error) {
      if (!valid()) return;
      message(
        owner,
        error.message === 'ambiguous'
          ? 'Please enter a more specific postcode or town, or open directions in Google Maps.'
          : 'We could not calculate that journey. Try a full UK postcode or open directions in Google Maps.',
      );
      root.dataset.journeyState = 'error';
    } finally {
      if (owner.request === id) {
        owner.running = '';
        owner.form.removeAttribute('aria-busy');
        busy(owner.button, false);
      }
    }
  }
  function suspend(owner) {
    owner.request++;
    owner.generation++;
    owner.running = '';
    clearRoute(owner);
    clearTimeout(owner.tileWait);
    owner.tiles?.remove();
    owner.tiles = null;
    busy(owner.canvas, false);
    busy(owner.button, false);
    owner.info?.close();
    owner.pinClick?.remove();
    owner.info = owner.pinClick = owner.placeFlight = null;
    if (owner.marker) owner.marker.map = null;
    if (owner.map) window.google?.maps?.event?.clearInstanceListeners(owner.map);
    owner.marker = owner.map = null;
    owner.canvas.replaceChildren(...owner.placeholder);
    owner.form.removeAttribute('aria-busy');
    message(owner, owner.initial);
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
    version: '1.6.0',
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
