/* TDB Vimeo 1.2.0. Migrated from tdb-vimeo-js v1.0.1.
 * Hero, ambient and content share playback cancellation and page suspension.
 * Loaded and initialised by tdb-vimeo-loader.js after functionality consent.
 */
(() => {
  'use strict';
  if (window.TDBVimeo) return;
  let instance = null;
  function init() {
    if (instance) return instance;
    if (!window.CookieScript?.instance?.currentState()?.categories?.includes('functionality')) return null;
  const heroShells = Array.from(document.querySelectorAll('[data-vimeo-hero-shell]'));
  const ambientRoots = Array.from(document.querySelectorAll('[data-vimeo-ambient-init]'));
  const contentRoots = Array.from(
    document.querySelectorAll('[data-vimeo-player-init][data-vimeo-content-init]')
  );

  if (!heroShells.length && !ambientRoots.length && !contentRoots.length) return;

  let vimeoApiPromise = null;
  let vimeoConsentPoll = null;
  let pendingConsentHero = null;
  let pendingConsentContent = null;
  let heroObserver = null;
  let ambientObserver = null;
  let fallbackTicking = false;
  let refreshAllTimer = null;
  let pageHidden = false;
  let pendingContentPlayTimer = null;

  const playbackRegistry = new WeakMap();
  const revealRegistry = new WeakMap();
  const pageResumeRegistry = new Map();

  const coverResizeRegistry = new Map();
  let coverResizeTicking = false;
  let coverResizeBound = false;

  function setAttrIfChanged(el, name, value) {
    if (!el) return;
    const stringValue = String(value);
    if (el.getAttribute(name) !== stringValue) {
      el.setAttribute(name, stringValue);
    }
  }

  function setContentState(vimeoElement, state) {
    Object.keys(state).forEach(function (key) {
      setAttrIfChanged(vimeoElement, 'data-vimeo-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase()), state[key]);
    });
  }

  function isVisible(el) {
    if (!el) return false;

    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;

    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function hasFunctionalityConsent() {
    try {
      const consent =
        window.CookieScript &&
        window.CookieScript.instance &&
        window.CookieScript.instance.currentState
          ? window.CookieScript.instance.currentState()
          : null;

      return !!(
        consent &&
        Array.isArray(consent.categories) &&
        consent.categories.includes('functionality')
      );
    } catch (e) {
      return false;
    }
  }

  function getPlayback(playerRoot) {
    if (!playbackRegistry.has(playerRoot)) {
      playbackRegistry.set(playerRoot, { generation: 0, wanted: false, pausePromise: null });
    }
    return playbackRegistry.get(playerRoot);
  }

  function pageIsActive() {
    return !pageHidden && document.visibilityState !== 'hidden';
  }

  function inPlaybackArea(playerRoot, mode) {
    const target = mode === 'hero'
      ? playerRoot._heroShell
      : playerRoot.closest('.layout355_background-video-wrapper') || playerRoot;
    if (!target || !isVisible(playerRoot)) return false;
    const rect = target.getBoundingClientRect();
    const margin = mode === 'ambient' ? 250 : 0;
    return rect.bottom > -margin && rect.top < window.innerHeight + margin;
  }

  function canPlay(playerRoot, mode) {
    if (!getPlayback(playerRoot).wanted || !playerRoot.isConnected ||
        !pageIsActive() || !hasFunctionalityConsent()) return false;
    if (mode === 'content') return true;
    if (!inPlaybackArea(playerRoot, mode)) return false;
    if (mode === 'ambient') {
      return ensureAmbientState(playerRoot).inView &&
        playerRoot.getAttribute('data-vimeo-autoplay') === 'true';
    }
    return !ensureHeroState(playerRoot).pausedByUser;
  }

  function cancelPlayback(playerRoot) {
    const playback = getPlayback(playerRoot);
    playback.generation++;
    playback.wanted = false;
  }

  // A resumed play waits for the previous pause acknowledgement. This also
  // prevents a slow pause from stopping a newer scroll/visibility play request.
  function pausePlayer(playerRoot) {
    const playback = getPlayback(playerRoot);
    if (playback.pausePromise) return playback.pausePromise;
    const player = playerRoot._vimeoPlayer;
    if (!player) return Promise.resolve();
    const promise = Promise.resolve().then(function () {
      return player.pause();
    }).catch(function (err) {
      console.error('Vimeo pause failed:', err);
    }).finally(function () {
      if (playback.pausePromise === promise) playback.pausePromise = null;
    });
    playback.pausePromise = promise;
    return promise;
  }

  function acceptPlaybackEvent(playerRoot, mode) {
    if (canPlay(playerRoot, mode)) return true;
    pausePlayer(playerRoot);
    return false;
  }

  function acceptPauseEvent(playerRoot) {
    const playback = getPlayback(playerRoot);
    if (playback.pausePromise && playback.wanted) return false;
    cancelPlayback(playerRoot);
    return true;
  }

  async function requestPlayback(playerRoot, mode, prepare, update) {
    const playback = getPlayback(playerRoot);
    const generation = ++playback.generation;
    playback.wanted = true;
    const current = function () { return playback.generation === generation; };
    try {
      const player = await (mode === 'content'
        ? getOrCreateContentPlayer(playerRoot)
        : getOrCreateBackgroundPlayer(playerRoot, mode));
      if (!player) return;
      await playback.pausePromise;
      if (!current() || !canPlay(playerRoot, mode)) return;
      if (prepare) await prepare(player);
      if (!current() || !canPlay(playerRoot, mode)) return;
      await player.play();
      // A play already sent to the iframe can resolve after scroll, pause,
      // consent withdrawal or page suspension. Enforce the latest intent.
      if (!canPlay(playerRoot, mode)) await pausePlayer(playerRoot);
    } catch (err) {
      if (current()) {
        playback.wanted = false;
        console.error('Vimeo ' + mode + ' play failed:', err);
      }
    } finally {
      if (current()) {
        if (!canPlay(playerRoot, mode)) playback.wanted = false;
        update();
      }
    }
  }

  function openCookieSettingsFromVimeo() {
    if (typeof window.openCookieSettingsPanel === 'function') {
      window.openCookieSettingsPanel();
      return;
    }

    const link = document.getElementById('cookie-settings-link');
    if (link) {
      link.click();
      return;
    }

    const show =
      window.CookieScript &&
      window.CookieScript.instance &&
      window.CookieScript.instance.show;

    if (typeof show === 'function') {
      show.call(window.CookieScript.instance);
    }
  }

  function loadVimeoPlayerAPI() {
    if (window.Vimeo && window.Vimeo.Player) return Promise.resolve();
    if (vimeoApiPromise) return vimeoApiPromise;

    vimeoApiPromise = new Promise(function (resolve, reject) {
      const existing = document.querySelector(
        'script[src="https://player.vimeo.com/api/player.js"]'
      );

      const script = existing || document.createElement('script');
      let settled = false;
      let pollId = null;
      let timeoutId = null;

      function finish(fn, value) {
        if (settled) return;
        settled = true;

        if (pollId) clearInterval(pollId);
        if (timeoutId) clearTimeout(timeoutId);

        script.removeEventListener('load', handleLoad);
        script.removeEventListener('error', handleError);
        fn(value);
      }

      function handleLoad() {
        if (window.Vimeo && window.Vimeo.Player) {
          finish(resolve);
        }
      }

      function handleError(err) {
        if (settled) return;
        script.remove();
        vimeoApiPromise = null;
        finish(reject, err || new Error('Vimeo API failed to load'));
      }

      script.addEventListener('load', handleLoad, { once: true });
      script.addEventListener('error', handleError, { once: true });

      if (!existing) {
        script.src = 'https://player.vimeo.com/api/player.js';
        script.async = true;
        document.head.appendChild(script);
      }

      if (window.Vimeo && window.Vimeo.Player) {
        finish(resolve);
        return;
      }

      pollId = setInterval(function () {
        if (window.Vimeo && window.Vimeo.Player) {
          finish(resolve);
        }
      }, 100);

      timeoutId = setTimeout(function () {
        if (window.Vimeo && window.Vimeo.Player) {
          finish(resolve);
        } else {
          handleError(new Error('Vimeo API load timed out'));
        }
      }, 6000);
    });

    return vimeoApiPromise;
  }

  function buildBackgroundVimeoSrc(videoId) {
    const base = [
      'api=1',
      'background=1',
      'autopause=0',
      'controls=0',
      'autoplay=0',
      'loop=1',
      'muted=1',
      'playsinline=1',
      'dnt=1'
    ];

    return 'https://player.vimeo.com/video/' + videoId + '?' + base.join('&');
  }

  function buildContentVimeoSrc(videoId) {
    const base = [
      'api=1',
      'background=1',
      'controls=0',
      'autoplay=0',
      'loop=0',
      'muted=1',
      'playsinline=1',
      'dnt=1'
    ];

    return 'https://player.vimeo.com/video/' + videoId + '?' + base.join('&');
  }

  function getControlsLayer(shell) {
    return shell ? shell.querySelector('[data-vimeo-controls-layer]') : null;
  }

  function restartPulse(shell) {
    const layer = getControlsLayer(shell);
    const pulse = layer ? layer.querySelector('.vimeo-player__btn-pulse') : null;
    if (!pulse) return;

    pulse.style.animation = 'none';
    void pulse.offsetWidth;
    pulse.style.removeProperty('animation');
  }

  function getHeroCandidates(shell) {
    if (!shell) return [];

    const explicit = Array.from(
      shell.querySelectorAll(
        '[data-vimeo-player-init][data-vimeo-hero-init]:not([data-vimeo-ambient-init]):not([data-vimeo-content-init])'
      )
    );

    if (explicit.length) return explicit;

    return Array.from(
      shell.querySelectorAll(
        '[data-vimeo-player-init]:not([data-vimeo-ambient-init]):not([data-vimeo-content-init])'
      )
    );
  }

  function getVisibleHeroPlayer(shell) {
    const candidates = getHeroCandidates(shell);

    for (let i = 0; i < candidates.length; i++) {
      if (isVisible(candidates[i])) return candidates[i];
    }

    return null;
  }

  function ensureHeroState(playerRoot) {
    if (!playerRoot._heroState) {
      playerRoot._heroState = {
        ui: 'idle',
        buffering: false,
        started: false,
        pausedByUser: false,
        autoPaused: false,
        busy: false,
        revealQueued: false
      };

      setAttrIfChanged(playerRoot, 'data-vimeo-started', 'false');
      setAttrIfChanged(playerRoot, 'data-placeholder-hidden', 'false');
    }

    return playerRoot._heroState;
  }

  function ensureAmbientState(playerRoot) {
    if (!playerRoot._ambientState) {
      playerRoot._ambientState = {
        playing: false,
        started: false,
        autoPaused: false,
        busy: false,
        inView: false,
        revealQueued: false
      };

      setAttrIfChanged(playerRoot, 'data-ambient-started', 'false');
      setAttrIfChanged(playerRoot, 'data-placeholder-hidden', 'false');
    }

    return playerRoot._ambientState;
  }

  function ensureContentInitialState(vimeoElement) {
    if (vimeoElement.dataset.vimeoStateInit === 'true') return;
    vimeoElement.dataset.vimeoStateInit = 'true';

    setContentState(vimeoElement, {
      ready: false,
      loaded: false,
      loading: false,
      playing: false,
      activated: false,
      started: false,
      awaitingConsent: false
    });
  }

  function attachHeroToShell(playerRoot, shell) {
    if (!playerRoot || !shell) return;

    ensureHeroState(playerRoot);
    playerRoot._heroShell = shell;
    shell._activeHero = playerRoot;

    syncHeroShell(playerRoot);
  }

  function getResolvedHeroPlayer(shell) {
    if (!shell) return null;

    const active = shell._activeHero;
    if (active && active.isConnected && isVisible(active)) return active;

    const visible = getVisibleHeroPlayer(shell);
    if (visible) {
      const state = ensureHeroState(visible);
      if (active && active !== visible) {
        state.pausedByUser = ensureHeroState(active).pausedByUser;
        pauseHero(active, false);
      }
      shell._activeHero = visible;
      return visible;
    }

    return active && active.isConnected ? active : null;
  }

  function syncHeroShell(playerRoot) {
    if (!playerRoot || !playerRoot._heroShell) return;

    const shell = playerRoot._heroShell;
    const state = ensureHeroState(playerRoot);
    setAttrIfChanged(playerRoot, 'data-vimeo-started', state.started ? 'true' : 'false');
    if (shell._activeHero !== playerRoot) return;
    const prevPulse = shell.getAttribute('data-vimeo-pulse') === 'true';
    const nextPulse = state.ui === 'idle' || state.ui === 'paused';

    setAttrIfChanged(shell, 'data-vimeo-ui', state.ui);
    setAttrIfChanged(shell, 'data-vimeo-buffering', state.buffering ? 'true' : 'false');
    setAttrIfChanged(shell, 'data-vimeo-pulse', nextPulse ? 'true' : 'false');

    if (nextPulse && !prevPulse) {
      restartPulse(shell);
    }
  }

  function syncAmbientRoot(playerRoot) {
    if (!playerRoot) return;
    const state = ensureAmbientState(playerRoot);

    setAttrIfChanged(playerRoot, 'data-ambient-started', state.started ? 'true' : 'false');
  }

  function queuePlaceholderRemoval(playerRoot) {
    if (!playerRoot) return;

    if (playerRoot._placeholderHideTimer) {
      clearTimeout(playerRoot._placeholderHideTimer);
    }

    playerRoot._placeholderHideTimer = setTimeout(function () {
      setAttrIfChanged(playerRoot, 'data-placeholder-hidden', 'true');
    }, 520);
  }

  function clearBackgroundReveal(playerRoot) {
    const reveal = revealRegistry.get(playerRoot);
    if (!reveal) return;
    clearTimeout(reveal.timer);
    cancelAnimationFrame(reveal.frame);
    reveal.state.revealQueued = false;
    revealRegistry.delete(playerRoot);
  }

  function queueBackgroundReveal(playerRoot, mode, delay) {
    const state = mode === 'hero' ? ensureHeroState(playerRoot) : ensureAmbientState(playerRoot);
    if (state.started || state.revealQueued || !canPlay(playerRoot, mode)) return;
    state.revealQueued = true;
    const reveal = { state: state, timer: null, frame: null };
    revealRegistry.set(playerRoot, reveal);
    reveal.timer = setTimeout(function () {
      reveal.frame = requestAnimationFrame(function () {
        if (revealRegistry.get(playerRoot) !== reveal) return;
        clearBackgroundReveal(playerRoot);
        if (!canPlay(playerRoot, mode)) return;
        state.started = true;
        if (mode === 'hero') syncHeroShell(playerRoot);
        else syncAmbientRoot(playerRoot);
        queuePlaceholderRemoval(playerRoot);
      });
    }, delay || 120);
  }

  function scheduleCoverResizeRefresh() {
    if (coverResizeTicking) return;

    coverResizeTicking = true;

    requestAnimationFrame(function () {
      coverResizeTicking = false;

      coverResizeRegistry.forEach(function (adjustFn) {
        try {
          adjustFn();
        } catch (e) {}
      });
    });
  }

  function bindCoverResizeSystem() {
    if (coverResizeBound) return;
    coverResizeBound = true;

    window.addEventListener('resize', scheduleCoverResizeRefresh, { passive: true });
    window.addEventListener('orientationchange', scheduleCoverResizeRefresh, { passive: true });
  }

  function registerCoverResize(vimeoElement, adjustFn) {
    if (!vimeoElement || typeof adjustFn !== 'function') return;
    coverResizeRegistry.set(vimeoElement, adjustFn);
    bindCoverResizeSystem();
    scheduleCoverResizeRefresh();
  }

  async function getOrCreateBackgroundPlayer(playerRoot, mode) {
    if (playerRoot._vimeoPlayerPromise) return playerRoot._vimeoPlayerPromise;
    if (playerRoot._vimeoPlayer) return playerRoot._vimeoPlayer;

    const initPromise = (async function () {
      const videoId = playerRoot.getAttribute('data-vimeo-video-id');
      const iframe = playerRoot.querySelector('iframe');

      if (!videoId) throw new Error('Missing Vimeo video ID');
      if (!iframe) throw new Error('Missing Vimeo iframe');

      await loadVimeoPlayerAPI();
      if (!hasFunctionalityConsent()) throw new Error('Vimeo permission changed');
      if (!canPlay(playerRoot, mode)) return null;

      iframe.setAttribute(
        'allow',
        'autoplay; fullscreen; picture-in-picture; encrypted-media'
      );

      const src = buildBackgroundVimeoSrc(videoId);
      if (iframe.getAttribute('src') !== src) {
        iframe.setAttribute('src', src);
      }

      const player = new Vimeo.Player(iframe);
      await player.ready();

      playerRoot._vimeoPlayer = player;

      try {
        if (!playerRoot._vimeoMutedApplied) {
          if (typeof player.setMuted === 'function') {
            await player.setMuted(true);
          } else if (typeof player.setVolume === 'function') {
            await player.setVolume(0);
          }
          playerRoot._vimeoMutedApplied = true;
        }
      } catch (e) {}

      if (mode === 'hero') {
        bindHeroPlayerEvents(playerRoot, player);
      } else {
        bindAmbientPlayerEvents(playerRoot, player);
      }

      return player;
    })();

    playerRoot._vimeoPlayerPromise = initPromise;

    try {
      return await initPromise;
    } catch (err) {
      playerRoot._vimeoPlayer = null;
      throw err;
    } finally {
      if (playerRoot._vimeoPlayerPromise === initPromise) {
        playerRoot._vimeoPlayerPromise = null;
      }
    }
  }

  function bindHeroPlayerEvents(playerRoot, player) {
    if (playerRoot._heroEventsBound) return;
    playerRoot._heroEventsBound = true;

    function onTimeUpdate(data) {
      const state = ensureHeroState(playerRoot);

      if (
        !state.started &&
        data &&
        typeof data.seconds === 'number' &&
        data.seconds >= 0.12
      ) {
        queueBackgroundReveal(playerRoot, 'hero', 80);

        if (typeof player.off === 'function') {
          player.off('timeupdate', onTimeUpdate);
        }
      }
    }

    player.on('bufferstart', function () {
      if (!canPlay(playerRoot, 'hero')) return;
      const state = ensureHeroState(playerRoot);

      if (state.ui === 'playing') {
        state.buffering = true;
      } else {
        state.ui = 'loading';
        state.buffering = false;
      }

      syncHeroShell(playerRoot);
    });

    player.on('bufferend', function () {
      const state = ensureHeroState(playerRoot);
      state.buffering = false;
      syncHeroShell(playerRoot);
    });

    player.on('play', function () {
      if (!acceptPlaybackEvent(playerRoot, 'hero')) return;
      const state = ensureHeroState(playerRoot);

      state.ui = 'playing';
      state.buffering = false;
      state.autoPaused = false;

      syncHeroShell(playerRoot);
    });

    player.on('playing', function () {
      if (!acceptPlaybackEvent(playerRoot, 'hero')) return;
      const state = ensureHeroState(playerRoot);

      if (playerRoot._heroShell) {
        playerRoot._heroShell._activeHero = playerRoot;
      }

      state.ui = 'playing';
      state.buffering = false;

      syncHeroShell(playerRoot);
      queueBackgroundReveal(playerRoot, 'hero', 160);

      if (typeof player.off === 'function') {
        player.off('timeupdate', onTimeUpdate);
      }
    });

    player.on('timeupdate', onTimeUpdate);

    player.on('pause', function () {
      if (!acceptPauseEvent(playerRoot)) return;
      const state = ensureHeroState(playerRoot);

      clearBackgroundReveal(playerRoot);

      state.ui = state.started ? 'paused' : 'idle';
      state.buffering = false;
      state.busy = false;

      syncHeroShell(playerRoot);
    });

    player.on('error', function (err) {
      cancelPlayback(playerRoot);
      pageResumeRegistry.delete(playerRoot);
      const state = ensureHeroState(playerRoot);

      clearBackgroundReveal(playerRoot);
      console.error('Hero Vimeo error:', err);

      state.ui = state.started ? 'paused' : 'idle';
      state.buffering = false;
      state.busy = false;

      syncHeroShell(playerRoot);
    });
  }

  function bindAmbientPlayerEvents(playerRoot, player) {
    if (playerRoot._ambientEventsBound) return;
    playerRoot._ambientEventsBound = true;

    function onTimeUpdate(data) {
      const state = ensureAmbientState(playerRoot);

      if (
        !state.started &&
        data &&
        typeof data.seconds === 'number' &&
        data.seconds >= 0.12
      ) {
        queueBackgroundReveal(playerRoot, 'ambient', 80);

        if (typeof player.off === 'function') {
          player.off('timeupdate', onTimeUpdate);
        }
      }
    }

    player.on('play', function () {
      if (!acceptPlaybackEvent(playerRoot, 'ambient')) return;
      const state = ensureAmbientState(playerRoot);
      state.playing = true;
      syncAmbientRoot(playerRoot);
    });

    player.on('playing', function () {
      if (!acceptPlaybackEvent(playerRoot, 'ambient')) return;
      const state = ensureAmbientState(playerRoot);
      state.playing = true;

      syncAmbientRoot(playerRoot);
      queueBackgroundReveal(playerRoot, 'ambient', 160);

      if (typeof player.off === 'function') {
        player.off('timeupdate', onTimeUpdate);
      }
    });

    player.on('timeupdate', onTimeUpdate);

    player.on('pause', function () {
      if (!acceptPauseEvent(playerRoot)) return;
      const state = ensureAmbientState(playerRoot);
      clearBackgroundReveal(playerRoot);
      state.playing = false;
      state.busy = false;
      syncAmbientRoot(playerRoot);
    });

    player.on('error', function (err) {
      cancelPlayback(playerRoot);
      pageResumeRegistry.delete(playerRoot);
      const state = ensureAmbientState(playerRoot);
      clearBackgroundReveal(playerRoot);
      console.error('Ambient Vimeo error:', err);
      state.playing = false;
      state.busy = false;
      syncAmbientRoot(playerRoot);
    });
  }

  async function playHero(playerRoot, opts) {
    if (!playerRoot) return;
    const options = opts || {};
    const state = ensureHeroState(playerRoot);
    if (playerRoot._heroShell) attachHeroToShell(playerRoot, playerRoot._heroShell);
    if (state.busy) return;
    if (!hasFunctionalityConsent()) {
      if (options.manual) {
        pendingConsentHero = playerRoot;
        state.ui = 'awaiting-consent';
        state.buffering = false;
        syncHeroShell(playerRoot);
        openCookieSettingsFromVimeo();
      }
      return;
    }
    if (!pageIsActive()) {
      if (options.manual) pageResumeRegistry.set(playerRoot, 'hero');
      return;
    }
    if (!inPlaybackArea(playerRoot, 'hero')) return;
    state.ui = 'loading';
    state.buffering = false;
    state.busy = true;
    state.autoPaused = false;
    state.pausedByUser = false;
    syncHeroShell(playerRoot);
    return requestPlayback(playerRoot, 'hero', null, function () {
      state.busy = false;
      if (!getPlayback(playerRoot).wanted || state.ui === 'loading') {
        state.ui = state.started ? 'paused' : 'idle';
        state.buffering = false;
      }
      syncHeroShell(playerRoot);
    });
  }

  function pauseHero(playerRoot, pausedByUser) {
    if (!playerRoot) return;
    const state = ensureHeroState(playerRoot);
    cancelPlayback(playerRoot);
    clearBackgroundReveal(playerRoot);
    if (pausedByUser) {
      state.pausedByUser = true;
      pageResumeRegistry.delete(playerRoot);
      if (pendingConsentHero === playerRoot) pendingConsentHero = null;
    }
    state.autoPaused = !pausedByUser;
    state.busy = false;
    state.ui = state.started ? 'paused' : 'idle';
    state.buffering = false;
    syncHeroShell(playerRoot);
    return pausePlayer(playerRoot);
  }

  function playAmbient(playerRoot) {
    if (!playerRoot) return;
    const state = ensureAmbientState(playerRoot);
    if (state.busy || !pageIsActive() || !hasFunctionalityConsent() ||
        !state.inView || !inPlaybackArea(playerRoot, 'ambient')) return;
    state.busy = true;
    state.autoPaused = false;
    return requestPlayback(playerRoot, 'ambient', null, function () {
      state.busy = false;
    });
  }

  function pauseAmbient(playerRoot) {
    if (!playerRoot) return;
    const state = ensureAmbientState(playerRoot);
    cancelPlayback(playerRoot);
    clearBackgroundReveal(playerRoot);
    state.playing = false;
    state.busy = false;
    state.autoPaused = true;
    syncAmbientRoot(playerRoot);
    return pausePlayer(playerRoot);
  }

  function evaluateHeroShell(shell) {
    if (!shell) return;
    const playerRoot = getResolvedHeroPlayer(shell);
    if (!playerRoot) return;
    attachHeroToShell(playerRoot, shell);
    const state = ensureHeroState(playerRoot);
    if (!pageIsActive()) return;
    if (!shell._heroInView || !inPlaybackArea(playerRoot, 'hero')) {
      if (getPlayback(playerRoot).wanted || state.busy || state.ui === 'playing') {
        pauseHero(playerRoot, false);
      }
      return;
    }
    if (playerRoot.getAttribute('data-vimeo-autoplay') === 'true' &&
        hasFunctionalityConsent() && !state.pausedByUser) {
      if (state.ui !== 'playing' || state.autoPaused) playHero(playerRoot, { manual: false });
    }
  }

  function evaluateAmbientPlayer(playerRoot) {
    if (!playerRoot || !pageIsActive()) return;
    const state = ensureAmbientState(playerRoot);
    if (state.inView && inPlaybackArea(playerRoot, 'ambient') &&
        hasFunctionalityConsent() && playerRoot.getAttribute('data-vimeo-autoplay') === 'true') {
      if (!state.playing || state.autoPaused) playAmbient(playerRoot);
    } else if (getPlayback(playerRoot).wanted || state.busy || state.playing) {
      pauseAmbient(playerRoot);
    }
  }

  function syncAllVisibleHeroPlayers() {
    heroShells.forEach(function (shell) {
      const playerRoot = getResolvedHeroPlayer(shell);
      if (!playerRoot) return;
      attachHeroToShell(playerRoot, shell);
    });
  }

  function bindHeroShellControls(shell) {
    if (!shell) return;
    if (shell.dataset.vimeoControlsBound === 'true') return;

    shell.dataset.vimeoControlsBound = 'true';

    const controlsLayer = getControlsLayer(shell);
    if (!controlsLayer) return;

    const playBtn = controlsLayer.querySelector('[data-vimeo-control="play"]');
    const pauseBtn = controlsLayer.querySelector('[data-vimeo-control="pause"]');

    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        e.preventDefault();

        const activePlayer = getResolvedHeroPlayer(shell);
        if (!activePlayer) return;

        attachHeroToShell(activePlayer, shell);
        playHero(activePlayer, { manual: true });
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', function (e) {
        e.preventDefault();

        const activePlayer = getResolvedHeroPlayer(shell);
        if (!activePlayer) return;

        attachHeroToShell(activePlayer, shell);
        pauseHero(activePlayer, true);
      });
    }
  }

  function initHeroObserver() {
    if (!heroShells.length) return;

    if ('IntersectionObserver' in window) {
      if (heroObserver) return;

      heroObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            const shell = entry.target;
            shell._heroInView = entry.isIntersecting;
            evaluateHeroShell(shell);
          });
        },
        {
          threshold: 0.15
        }
      );

      heroShells.forEach(function (shell) {
        shell._heroInView = false;
        heroObserver.observe(shell);
      });

      return;
    }

    bindFallbackVisibility();
  }

  function initAmbientObserver() {
    if (!ambientRoots.length) return;

    if ('IntersectionObserver' in window) {
      if (ambientObserver) return;

      ambientObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            const playerRoot = entry.target.__ambientPlayerRoot || entry.target;
            if (!playerRoot) return;

            const state = ensureAmbientState(playerRoot);
            state.inView = entry.isIntersecting;
            evaluateAmbientPlayer(playerRoot);
          });
        },
        {
          rootMargin: '250px 0px',
          threshold: 0.15
        }
      );

      ambientRoots.forEach(function (playerRoot) {
        ensureAmbientState(playerRoot);

        const observeTarget =
          playerRoot.closest('.layout355_background-video-wrapper') || playerRoot;

        observeTarget.__ambientPlayerRoot = playerRoot;
        ambientObserver.observe(observeTarget);
      });

      return;
    }

    bindFallbackVisibility();
  }

  function bindFallbackVisibility() {
    if (bindFallbackVisibility._bound) return;
    bindFallbackVisibility._bound = true;

    function evaluateFallback() {
      if (fallbackTicking) return;

      fallbackTicking = true;

      requestAnimationFrame(function () {
        const vh = window.innerHeight || document.documentElement.clientHeight;

        fallbackTicking = false;

        heroShells.forEach(function (shell) {
          const rect = shell.getBoundingClientRect();
          shell._heroInView = rect.bottom > 0 && rect.top < vh;
          evaluateHeroShell(shell);
        });

        ambientRoots.forEach(function (playerRoot) {
          const target =
            playerRoot.closest('.layout355_background-video-wrapper') || playerRoot;
          const rect = target.getBoundingClientRect();
          const state = ensureAmbientState(playerRoot);

          state.inView = rect.bottom > -250 && rect.top < vh + 250;
          evaluateAmbientPlayer(playerRoot);
        });
      });
    }

    window.addEventListener('scroll', evaluateFallback, { passive: true });
    window.addEventListener('resize', evaluateFallback, { passive: true });
    window.addEventListener('orientationchange', evaluateFallback, { passive: true });

    evaluateFallback();
  }

  function forEachPlayer(callback) {
    heroShells.forEach(function (shell) {
      getHeroCandidates(shell).forEach(function (root) { callback(root, 'hero'); });
    });
    ambientRoots.forEach(function (root) { callback(root, 'ambient'); });
    contentRoots.forEach(function (root) { callback(root, 'content'); });
  }

  function pauseByMode(root, mode) {
    if (mode === 'hero') return pauseHero(root, false);
    if (mode === 'ambient') return pauseAmbient(root);
    return pauseContent(root, { automatic: true });
  }

  function handlePageVisibility() {
    if (!pageIsActive()) {
      forEachPlayer(function (root, mode) {
        if (!getPlayback(root).wanted) return;
        pageResumeRegistry.set(root, mode);
        pauseByMode(root, mode);
      });
      return;
    }
    // Refresh geometry before resuming; observers may have been suspended.
    heroShells.forEach(function (shell) {
      const root = getResolvedHeroPlayer(shell);
      shell._heroInView = !!root && inPlaybackArea(root, 'hero');
    });
    ambientRoots.forEach(function (root) {
      ensureAmbientState(root).inView = inPlaybackArea(root, 'ambient');
    });
    const pending = Array.from(pageResumeRegistry);
    pageResumeRegistry.clear();
    if (!hasFunctionalityConsent()) return;
    pending.forEach(function (entry) {
      const root = entry[0], mode = entry[1];
      if (!root.isConnected) return;
      if (mode === 'content') playContent(root);
      else if (mode === 'hero' && !ensureHeroState(root).pausedByUser) playHero(root);
    });
    refreshAll();
  }

  function resetHeroAndAmbientWhenNoConsent() {
    pendingConsentHero = null;
    clearPendingContentConsentRequest(true);
    pageResumeRegistry.clear();
    forEachPlayer(function (root, mode) {
      pauseByMode(root, mode);
      if (mode === 'hero') {
        const state = ensureHeroState(root);
        state.pausedByUser = false;
        state.autoPaused = false;
      } else if (mode === 'ambient') {
        ensureAmbientState(root).autoPaused = false;
      }
    });
  }

  function rememberPendingContentConsentRequest(vimeoElement) {
    if (pendingConsentContent && pendingConsentContent !== vimeoElement) {
      setContentState(pendingConsentContent, {
        awaitingConsent: false,
        loading: false,
        activated: false
      });
    }

    pendingConsentContent = vimeoElement;

    setContentState(vimeoElement, {
      activated: true,
      awaitingConsent: true,
      loading: true,
      playing: false
    });
  }

  function clearPendingContentConsentRequest(resetActivated) {
    clearTimeout(pendingContentPlayTimer);
    pendingContentPlayTimer = null;
    if (typeof resetActivated === 'undefined') resetActivated = true;
    if (!pendingConsentContent) return;

    const nextState = {
      awaitingConsent: false,
      loading: false
    };

    if (resetActivated) {
      nextState.activated = false;
    }

    setContentState(pendingConsentContent, nextState);
    pendingConsentContent = null;
  }

  async function getOrCreateContentPlayer(vimeoElement) {
    if (vimeoElement._vimeoPlayerPromise) return vimeoElement._vimeoPlayerPromise;
    if (vimeoElement._vimeoPlayer) return vimeoElement._vimeoPlayer;

    const initPromise = (async function () {
      const videoId = vimeoElement.getAttribute('data-vimeo-video-id');
      const iframe = vimeoElement.querySelector('iframe');

      if (!videoId) throw new Error('Missing Vimeo video ID');
      if (!iframe) throw new Error('Missing Vimeo iframe');

      await loadVimeoPlayerAPI();
      if (!hasFunctionalityConsent()) throw new Error('Vimeo permission changed');
      if (!canPlay(vimeoElement, 'content')) return null;

      iframe.setAttribute(
        'allow',
        'autoplay; fullscreen; picture-in-picture; encrypted-media'
      );

      const src = buildContentVimeoSrc(videoId);
      if (!iframe.getAttribute('src') || iframe.getAttribute('src') !== src) {
        iframe.setAttribute('src', src);
      }

      const player = new Vimeo.Player(iframe);
      await player.ready();

      vimeoElement._vimeoPlayer = player;
      setContentState(vimeoElement, { ready: true });

      if (vimeoElement.dataset.vimeoEventsBound !== 'true') {
        vimeoElement.dataset.vimeoEventsBound = 'true';

        player.on('loaded', function () {
          setContentState(vimeoElement, {
            loaded: true
          });
        });

        player.on('bufferstart', function () {
          if (!canPlay(vimeoElement, 'content')) return;
          setContentState(vimeoElement, {
            loading: true
          });
        });

        player.on('bufferend', function () {
          const isPlaying = vimeoElement.getAttribute('data-vimeo-playing') === 'true';
          if (!isPlaying) return;

          setContentState(vimeoElement, {
            loading: false
          });
        });

        player.on('play', function () {
          if (!acceptPlaybackEvent(vimeoElement, 'content')) return;
          setContentState(vimeoElement, {
            activated: true,
            playing: true,
            loaded: true,
            loading: false,
            started: true,
            awaitingConsent: false
          });

          if (pendingConsentContent === vimeoElement) {
            pendingConsentContent = null;
          }
        });

        player.on('pause', function () {
          if (!acceptPauseEvent(vimeoElement)) return;
          vimeoElement.dataset.vimeoBusy = 'false';
          setContentState(vimeoElement, {
            playing: false,
            loading: false,
            awaitingConsent: false
          });
        });

        player.on('playing', function () {
          acceptPlaybackEvent(vimeoElement, 'content');
        });

        player.on('ended', function () {
          cancelPlayback(vimeoElement);
          pageResumeRegistry.delete(vimeoElement);
          vimeoElement.dataset.vimeoBusy = 'false';
          setContentState(vimeoElement, {
            activated: false,
            playing: false,
            loading: false,
            awaitingConsent: false
          });
          player.setCurrentTime(0).catch(function () {});
        });

        player.on('error', function (err) {
          cancelPlayback(vimeoElement);
          pageResumeRegistry.delete(vimeoElement);
          vimeoElement.dataset.vimeoBusy = 'false';
          console.error('Content Vimeo player error:', err);
          setContentState(vimeoElement, {
            playing: false,
            loading: false,
            awaitingConsent: false
          });
        });
      }

      if (
        vimeoElement.getAttribute('data-vimeo-update-size') === 'true' &&
        vimeoElement.dataset.vimeoSizeInit !== 'true'
      ) {
        vimeoElement.dataset.vimeoSizeInit = 'true';

        player
          .getVideoWidth()
          .then(function (width) {
            player.getVideoHeight().then(function (height) {
              const beforeEl = vimeoElement.querySelector('.vimeo-player__before');
              if (beforeEl) {
                beforeEl.style.paddingTop = (height / width) * 100 + '%';
              }
            });
          })
          .catch(function (err) {
            console.error('Vimeo size update failed:', err);
          });
      }

      if (
        vimeoElement.getAttribute('data-vimeo-update-size') === 'cover' &&
        vimeoElement.dataset.vimeoCoverInit !== 'true'
      ) {
        vimeoElement.dataset.vimeoCoverInit = 'true';

        let videoAspectRatio = null;

        function adjustVideoSizing() {
          const iframeWrapper = vimeoElement.querySelector('.vimeo-player__iframe');
          if (!iframeWrapper || !videoAspectRatio) return;

          const width = vimeoElement.offsetWidth;
          const height = vimeoElement.offsetHeight;
          if (!width || !height) return;

          const containerRatio = height / width;

          if (containerRatio > videoAspectRatio) {
            const widthFactor = containerRatio / videoAspectRatio;
            iframeWrapper.style.width = widthFactor * 100 + '%';
            iframeWrapper.style.height = '100%';
          } else {
            const heightFactor = videoAspectRatio / containerRatio;
            iframeWrapper.style.height = heightFactor * 100 + '%';
            iframeWrapper.style.width = '100%';
          }
        }

        player
          .getVideoWidth()
          .then(function (width) {
            player.getVideoHeight().then(function (height) {
              videoAspectRatio = height / width;
              const beforeEl = vimeoElement.querySelector('.vimeo-player__before');
              if (beforeEl) beforeEl.style.paddingTop = '0%';
              adjustVideoSizing();
              registerCoverResize(vimeoElement, adjustVideoSizing);
            });
          })
          .catch(function (err) {
            console.error('Vimeo cover sizing failed:', err);
          });
      }

      return player;
    })();

    vimeoElement._vimeoPlayerPromise = initPromise;

    try {
      return await initPromise;
    } catch (err) {
      vimeoElement._vimeoPlayer = null;
      throw err;
    } finally {
      if (vimeoElement._vimeoPlayerPromise === initPromise) {
        vimeoElement._vimeoPlayerPromise = null;
      }
    }
  }

  function warmVimeoAPIForContentElement(vimeoElement) {
    if (vimeoElement.dataset.vimeoApiWarmed === 'true') return;
    vimeoElement.dataset.vimeoApiWarmed = 'true';

    if (!hasFunctionalityConsent()) return;

    loadVimeoPlayerAPI().catch(function (err) {
      console.error('Vimeo API warm-up failed:', err);
      vimeoElement.dataset.vimeoApiWarmed = 'false';
    });
  }

  function setupContentWarmup(vimeoElement) {
    if (vimeoElement.dataset.vimeoWarmupBound === 'true') return;
    vimeoElement.dataset.vimeoWarmupBound = 'true';

    const warm = function () {
      warmVimeoAPIForContentElement(vimeoElement);
    };

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              warm();
              observer.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '300px 0px',
          threshold: 0.01
        }
      );

      observer.observe(vimeoElement);
    }

    vimeoElement.addEventListener('pointerenter', warm, { once: true });
    vimeoElement.addEventListener('focusin', warm, { once: true });
    vimeoElement.addEventListener('touchstart', warm, {
      once: true,
      passive: true
    });
  }

  function playContent(vimeoElement) {
    if (vimeoElement.dataset.vimeoBusy === 'true') return;
    if (!hasFunctionalityConsent()) {
      rememberPendingContentConsentRequest(vimeoElement);
      openCookieSettingsFromVimeo();
      return;
    }
    if (!pageIsActive()) {
      pageResumeRegistry.set(vimeoElement, 'content');
      return;
    }
    vimeoElement.dataset.vimeoBusy = 'true';
    setContentState(vimeoElement, {
      activated: true,
      awaitingConsent: false,
      loading: true
    });
    return requestPlayback(vimeoElement, 'content', async function (player) {
      const muted = vimeoElement.getAttribute('data-vimeo-muted') === 'true';
      if (typeof player.setMuted === 'function') await player.setMuted(muted);
      else await player.setVolume(muted ? 0 : 1);
    }, function () {
      vimeoElement.dataset.vimeoBusy = 'false';
      setContentState(vimeoElement, { loading: false, awaitingConsent: false });
      if (!getPlayback(vimeoElement).wanted) setContentState(vimeoElement, { playing: false });
    });
  }

  function pauseContent(vimeoElement, opts) {
    cancelPlayback(vimeoElement);
    if (!opts || !opts.automatic) {
      pageResumeRegistry.delete(vimeoElement);
      if (pendingConsentContent === vimeoElement) clearPendingContentConsentRequest(true);
    }
    vimeoElement.dataset.vimeoBusy = 'false';
    setContentState(vimeoElement, { playing: false, loading: false, awaitingConsent: false });
    return pausePlayer(vimeoElement);
  }

  function tryAutoplayPendingContentConsentRequest() {
    if (!pendingConsentContent) return;

    const targetElement = pendingConsentContent;

    if (!targetElement.isConnected) return;

    setContentState(targetElement, {
      awaitingConsent: false,
      activated: true,
      loading: true
    });

    clearTimeout(pendingContentPlayTimer);
    pendingContentPlayTimer = setTimeout(function () {
      pendingContentPlayTimer = null;
      pendingConsentContent = null;
      playContent(targetElement);
    }, 80);
  }

  function bindSingleContentPlayer(vimeoElement) {
    if (vimeoElement.dataset.vimeoBound === 'true') return;
    vimeoElement.dataset.vimeoBound = 'true';

    const videoId = vimeoElement.getAttribute('data-vimeo-video-id');
    if (!videoId) return;

    ensureContentInitialState(vimeoElement);
    setupContentWarmup(vimeoElement);

    const playBtn = vimeoElement.querySelector('[data-vimeo-control="play"]');
    const pauseBtn = vimeoElement.querySelector('[data-vimeo-control="pause"]');

    if (playBtn) {
      playBtn.addEventListener('click', function (e) {
        e.preventDefault();
        playContent(vimeoElement);
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', function (e) {
        e.preventDefault();
        pauseContent(vimeoElement);
      });
    }
  }

  function bindAllContentPlayers() {
    if (!contentRoots.length) return;
    contentRoots.forEach(bindSingleContentPlayer);
  }

  function warmAllContentPlayers() {
    if (!contentRoots.length) return;
    contentRoots.forEach(function (root) {
      const rect = root.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0 && rect.bottom > -300 && rect.top < innerHeight + 300) {
        warmVimeoAPIForContentElement(root);
      }
    });
  }

  function refreshAll() {
    syncAllVisibleHeroPlayers();

    heroShells.forEach(function (shell) {
      evaluateHeroShell(shell);
    });

    ambientRoots.forEach(function (playerRoot) {
      evaluateAmbientPlayer(playerRoot);
    });

    scheduleCoverResizeRefresh();
  }

  function scheduleRefreshAll(delay) {
    if (refreshAllTimer) clearTimeout(refreshAllTimer);
    refreshAllTimer = setTimeout(function () {
      refreshAllTimer = null;
      refreshAll();
    }, delay || 120);
  }

  function handleConsentOutcome() {
    if (hasFunctionalityConsent()) {
      if (vimeoConsentPoll) {
        clearInterval(vimeoConsentPoll);
        vimeoConsentPoll = null;
      }

      syncAllVisibleHeroPlayers();
      warmAllContentPlayers();

      if (pendingConsentHero && pendingConsentHero.isConnected) {
        const targetHero = pendingConsentHero;
        pendingConsentHero = null;

        if (targetHero._heroShell) {
          attachHeroToShell(targetHero, targetHero._heroShell);
        }

        playHero(targetHero, { manual: false });
      }

      tryAutoplayPendingContentConsentRequest();
      refreshAll();
    } else {
      clearPendingContentConsentRequest(true);
      resetHeroAndAmbientWhenNoConsent();
    }
  }

  function start() {
    document.addEventListener('visibilitychange', handlePageVisibility);
    window.addEventListener('pagehide', function () {
      pageHidden = true;
      handlePageVisibility();
    });
    window.addEventListener('pageshow', function () {
      pageHidden = false;
      handlePageVisibility();
    });
    heroShells.forEach(function (shell) {
      bindHeroShellControls(shell);

      const playerRoot = getResolvedHeroPlayer(shell);
      if (!playerRoot) return;

      attachHeroToShell(playerRoot, shell);
    });

    bindAllContentPlayers();
    initHeroObserver();
    initAmbientObserver();

    if (hasFunctionalityConsent()) {
      warmAllContentPlayers();
    } else if (contentRoots.length && !vimeoConsentPoll) {
      vimeoConsentPoll = setInterval(function () {
        if (hasFunctionalityConsent()) {
          handleConsentOutcome();
        }
      }, 500);
    }

    window.addEventListener(
      'resize',
      function () {
        scheduleRefreshAll(120);
      },
      { passive: true }
    );

    window.addEventListener(
      'orientationchange',
      function () {
        scheduleRefreshAll(180);
      },
      { passive: true }
    );

    const delayedConsentCheck = function () {
      setTimeout(handleConsentOutcome, 80);
    };

    window.addEventListener('CookieScriptLoaded', delayedConsentCheck);
    window.addEventListener('CookieScriptAcceptAll', delayedConsentCheck);
    window.addEventListener('CookieScriptAccept', delayedConsentCheck);
    window.addEventListener('CookieScriptAcceptSelection', delayedConsentCheck);
    window.addEventListener('CookieScriptCategory-functionality', delayedConsentCheck);

    window.addEventListener('CookieScriptReject', function () {
      if (!hasFunctionalityConsent()) {
        clearPendingContentConsentRequest(true);
        resetHeroAndAmbientWhenNoConsent();
      }
    });

    window.addEventListener('CookieScriptClose', function () {
      if (!hasFunctionalityConsent()) {
        clearPendingContentConsentRequest(true);
        resetHeroAndAmbientWhenNoConsent();
      }
    });

    scheduleRefreshAll(150);
  }

  instance = Object.freeze({
    play(root) {
      if (root.matches('[data-vimeo-content-init]')) return playContent(root);
      const shell = root.closest('[data-vimeo-hero-shell]');
      const playerRoot = getResolvedHeroPlayer(shell);
      if (playerRoot) {
        attachHeroToShell(playerRoot, shell);
        return playHero(playerRoot, { manual: true });
      }
    }
  });
  start();
  return instance;
  }
  window.TDBVimeo = Object.freeze({version: '1.2.0', init, get initialised() { return !!instance; }});
})();
