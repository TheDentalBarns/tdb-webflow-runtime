(() => {
  const cmsNamesByCaseNumber = [
    '',
    'invisalign-composite-bonding-001',
    'composite-bonding-002',
    'invisalign-composite-bonding-003',
    'invisalign-composite-bonding-004',
    'composite-bonding-005',
    'invisalign-composite-bonding-006',
    'invisalign-composite-bonding-007',
    'invisalign-composite-bonding-008',
    'composite-bonding-009',
    'composite-bonding-010',
    'invisalign-composite-bonding-011',
    'invisalign-composite-bonding-012',
    'composite-bonding-013',
    'invisalign-composite-bonding-014',
    'invisalign-composite-bonding-015',
    'invisalign-composite-bonding-016',
    'composite-bonding-017',
    'invisalign-composite-bonding-018',
    'invisalign-porcelain-veneers-019',
    'composite-bonding-020',
    'composite-bonding-021',
    'composite-bonding-022',
    'porcelain-veneers-023',
    'clear-aligners-porcelain-veneers-024',
    'porcelain-veneers-crowns-025',
    'porcelain-veneers-026',
    'porcelain-veneers-crowns-027',
    'invisalign-composite-bonding-028',
    'composite-bonding-029',
    'composite-bonding-030',
  ];

  function applyCmsNames() {
    document.querySelectorAll('[data-tdb-smile-open]').forEach((card) => {
      const imageSource = card.querySelector('img')?.src || '';
      const caseNumberMatch = imageSource.match(/(?:-|_)(\d{3})(?:\.|_)/);
      const cmsName = caseNumberMatch && cmsNamesByCaseNumber[Number(caseNumberMatch[1])];

      if (!cmsName) return;

      card.querySelectorAll('[data-tdb-smile-title]').forEach((element) => {
        element.removeAttribute('data-tdb-smile-title');
      });

      const identifier = document.createElement('span');
      identifier.hidden = true;
      identifier.setAttribute('data-tdb-smile-title', 'true');
      identifier.textContent = cmsName;
      card.prepend(identifier);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyCmsNames);
  } else {
    applyCmsNames();
  }
})();

(() => {
  const storageKey = 'tdb_smile_intent_v2';

  function readState() {
    try {
      return JSON.parse(
        sessionStorage.getItem(storageKey) ||
          '{"items":[],"counts":{},"urls":{},"opens":0,"last":"","lastUrl":"","next":0,"prev":0}',
      );
    } catch {
      return {
        items: [],
        counts: {},
        urls: {},
        opens: 0,
        last: '',
        lastUrl: '',
        next: 0,
        prev: 0,
      };
    }
  }

  function writeState(state) {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Tracking must never interfere with the visitor journey.
    }
  }

  function setHiddenField(form, name, value) {
    let input = form.querySelector(`input[name="${name}"]`);

    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }

    input.value = value;
  }

  function getPath(link) {
    try {
      return new URL(link.href, location.href).pathname;
    } catch {
      return link.getAttribute('href') || '';
    }
  }

  function getCaseIdentifier(card) {
    const title = card.querySelector('[data-tdb-smile-title]');

    return (title?.textContent || '').replace(/\s+/g, ' ').trim() || getPath(card);
  }

  document.addEventListener(
    'click',
    (event) => {
      const state = readState();
      const card = event.target.closest('[data-tdb-smile-open]');
      const next = event.target.closest('[data-tdb-smile-next]');
      const previous = event.target.closest('[data-tdb-smile-prev]');

      if (card) {
        const identifier = getCaseIdentifier(card);
        const url = getPath(card);

        if (identifier) {
          state.opens += 1;
          state.last = identifier;
          state.lastUrl = url;
          state.urls[identifier] = url;
          state.counts[identifier] = (state.counts[identifier] || 0) + 1;

          if (!state.items.includes(identifier) && state.items.length < 50) {
            state.items.push(identifier);
          }
        }
      }

      if (next) state.next += 1;
      if (previous) state.prev += 1;

      if (card || next || previous) {
        writeState(state);
      }
    },
    true,
  );

  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;

      if (!(form instanceof HTMLFormElement)) return;

      const state = readState();
      const caseCounts = state.items.map((name) => [name, state.counts[name] || 0]);

      let mostOpened = '';
      let mostOpenedCount = 0;

      caseCounts.forEach(([name, count]) => {
        if (count > mostOpenedCount) {
          mostOpened = name;
          mostOpenedCount = count;
        }
      });

      setHiddenField(form, 'tdb_smile_cases', state.items.join(' | '));
      setHiddenField(form, 'tdb_smile_unique', String(state.items.length));
      setHiddenField(form, 'tdb_smile_opens', String(state.opens));
      setHiddenField(form, 'tdb_smile_last', state.last);
      setHiddenField(form, 'tdb_smile_last_url', state.lastUrl);
      setHiddenField(
        form,
        'tdb_smile_open_counts',
        caseCounts.map(([name, count]) => `${name}=${count}`).join(' | '),
      );
      setHiddenField(
        form,
        'tdb_smile_case_urls',
        state.items.map((name) => `${name}=${state.urls[name] || ''}`).join(' | '),
      );
      setHiddenField(form, 'tdb_smile_most_opened', mostOpened);
      setHiddenField(form, 'tdb_smile_most_opened_count', String(mostOpenedCount));
      setHiddenField(form, 'tdb_smile_next_clicks', String(state.next));
      setHiddenField(form, 'tdb_smile_prev_clicks', String(state.prev));
    },
    true,
  );
})();
