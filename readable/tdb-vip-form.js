(() => {
  'use strict';

  if (window.TDBForms) return;
  const VERSION = '0.2.0';
  const VALIDATED_FORM_SELECTOR = 'form[ms-code-submit-form]';
  const BOUND_ATTRIBUTE = 'data-tdb-forms-bound';
  const PLACEHOLDER_SELECT_SELECTOR = [
    '#Treatment-Of-Interest',
    'select[name="Treatment-Of-Interest"]',
    'select[name="Treatment Of Interest"]',
  ].join(',');
  const PHONE_SELECTOR = 'input[name="phone" i], input[name^="phone" i]';

  function groupHasCheckedField(form, field) {
    if (!field.name) return field.checked;

    return (
      Array.from(form.elements).some(
        (candidate) =>
          candidate !== field &&
          candidate.type === field.type &&
          candidate.name === field.name &&
          candidate.checked,
      ) || field.checked
    );
  }

  function requiredFieldsAreComplete(form) {
    const requiredFields = Array.from(
      form.querySelectorAll('input[required], select[required], textarea[required]'),
    ).filter((field) => !field.disabled);

    const checkedGroups = new Set();

    for (const field of requiredFields) {
      if (field.type === 'checkbox' || field.type === 'radio') {
        const groupKey = `${field.type}:${field.name || field.id || 'unnamed'}`;
        if (checkedGroups.has(groupKey)) continue;
        checkedGroups.add(groupKey);

        if (!groupHasCheckedField(form, field)) return false;
        continue;
      }

      if (String(field.value ?? '').trim() === '') return false;
    }

    return true;
  }

  function updateSubmitState(form) {
    if (!form.matches(VALIDATED_FORM_SELECTOR)) return;

    const submitButton = form.querySelector('input[type="submit"], button[type="submit"]');

    if (!submitButton) return;

    const enabled = requiredFieldsAreComplete(form);
    submitButton.classList.toggle('submit-enabled', enabled);
    submitButton.disabled = !enabled;
  }

  function updateSelectPlaceholder(select) {
    select.classList.toggle('placeholder', select.value === '');
  }

  function bindPlaceholderSelects(form) {
    form.querySelectorAll(PLACEHOLDER_SELECT_SELECTOR).forEach((select) => {
      updateSelectPlaceholder(select);

      if (select.dataset.tdbPlaceholderBound === 'true') return;
      select.dataset.tdbPlaceholderBound = 'true';
      select.addEventListener('change', () => updateSelectPlaceholder(select));
    });
  }

  function normaliseUkMobile(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');

    if (/^00447\d{9}$/.test(digits)) return `+44${digits.slice(4)}`;
    if (/^4407\d{9}$/.test(digits)) return `+44${digits.slice(3)}`;
    if (/^07\d{9}$/.test(digits)) return `+44${digits.slice(1)}`;
    if (/^7\d{9}$/.test(digits)) return `+44${digits}`;
    if (/^447\d{9}$/.test(digits)) return `+${digits}`;

    return value;
  }

  function normalisePhoneFields(form) {
    form.querySelectorAll(PHONE_SELECTOR).forEach((phoneInput) => {
      phoneInput.value = normaliseUkMobile(phoneInput.value);
    });
  }

  function bindForm(form) {
    if (!(form instanceof HTMLFormElement)) return;

    bindPlaceholderSelects(form);
    updateSubmitState(form);

    if (form.getAttribute(BOUND_ATTRIBUTE) === 'true') return;
    form.setAttribute(BOUND_ATTRIBUTE, 'true');

    if (form.matches(VALIDATED_FORM_SELECTOR)) {
      form.addEventListener('input', () => updateSubmitState(form));
      form.addEventListener('change', (event) => {
        if (event.target?.matches?.(PLACEHOLDER_SELECT_SELECTOR)) {
          updateSelectPlaceholder(event.target);
        }
        updateSubmitState(form);
      });
    }

    form.addEventListener(
      'submit',
      () => {
        normalisePhoneFields(form);
        updateSubmitState(form);
      },
      true,
    );
    form.addEventListener('reset', (event) =>
      queueMicrotask(() => {
        if (!event.defaultPrevented) {
          bindPlaceholderSelects(form);
          updateSubmitState(form);
        }
      }),
    );
  }

  function refresh(root = document) {
    if (root instanceof Element) {
      const parentForm = root.closest('form');
      if (parentForm) bindForm(parentForm);
    }

    if (root instanceof HTMLFormElement) bindForm(root);
    root.querySelectorAll?.('form').forEach(bindForm);
  }

  function start() {
    refresh();

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) refresh(node);
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    window.TDBForms = Object.freeze({
      version: VERSION,
      refresh,
    });
    window.addEventListener('pageshow', () => refresh());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();

/* Shared VIP form behaviour v1.2.0. Designer owns markup and all visual states.
 * Reuses TDBForms for validation/phone handling and Webflow for submission.
 * Original form IDs, field names, option values and attribution are preserved.
 */
(() => {
  'use strict';
  if (window.TDBVIPForm) return;
  const SELECT =
    'select[name="Treatment-Of-Interest"],select[name="Treatment of Interest"],select[name="Treatment Of Interest"]';
  const FORMS = '#email-form, #vip-drawer-form';
  const SHARE = '[data-tdb-vip-share]';
  const seen = new WeakSet(),
    tracked = new WeakSet();
  const successObservers = new WeakSet();
  const path = location.pathname.toLowerCase().replace(/\/$/, '');
  const acquisition =
    /^\/vip\/(?:become-a-patient|instagram|x|pinterest|youtube|facebook|google|tiktok)$/.test(path);
  const allowed = [
    'Cosmetic Dentistry',
    'Restorative Dentistry',
    'Signature Assessment',
    'Smile Design',
    'Nervous Patient Care',
    'Invisalign',
    'Composite Bonding',
    'Veneers',
    'Whitening',
  ];
  const requested = new URLSearchParams(location.search).get('interest');

  function pageInterest() {
    if (['/first-visit', '/fast-track', '/signature-assessment'].includes(path))
      return 'Signature Assessment';
    if (!/^\/(services|treatments|areas|pricing)\//.test(path)) return '';
    const routes = [
      [/signature-assessment|fast-track|smile-assessment/, 'Signature Assessment'],
      [/smile-design/, 'Smile Design'],
      [/nervous/, 'Nervous Patient Care'],
      [/invisalign|clear-aligners/, 'Invisalign'],
      [/composite-bonding/, 'Composite Bonding'],
      [/veneers/, 'Veneers'],
      [/whitening/, 'Whitening'],
      [/general-dentistry|restorative/, 'Restorative Dentistry'],
      [/cosmetic/, 'Cosmetic Dentistry'],
    ];
    return routes.find(([pattern]) => pattern.test(path))?.[1] || '';
  }
  let preferred = allowed.includes(requested) ? requested : pageInterest();

  // Retain the original controls: native option editing is not exposed by MCP.
  // This is the existing compatibility mapping, including submitted values.
  function prepareOptions(select) {
    const previous = select.value;
    const assessmentValue = (value) => /^(Fast Track|Signature Assessment(?:\s*✦)?)$/.test(value);
    const assessment = [...select.options].find((o) => assessmentValue(o.value));
    if (assessment) {
      assessment.textContent = 'Signature Assessment ✦';
      assessment.value = 'Signature Assessment';
      if (select.options[1] !== assessment)
        select.insertBefore(assessment, select.options[1] || null);
    }
    let design = [...select.options].find((o) => o.value === 'Smile Design');
    if (!design) {
      design = new Option('Smile Design', 'Smile Design');
      select.append(design);
    }
    const unsure = [...select.options].find((o) => /not sure|don.t know/i.test(o.textContent));
    if (unsure && select.lastElementChild !== unsure) select.append(unsure);
    select.value = assessmentValue(previous) ? 'Signature Assessment' : previous;
  }

  function updateIntro(select) {
    const wrapper =
      select.closest('.vip-form_wrapper') ||
      select.closest('.tdb-vip-drawer-body') ||
      select.closest('section');
    const intro = wrapper?.querySelector('[data-tdb-vip-intro]');
    if (!intro) return;
    if (acquisition) {
      const copy =
        'Your access to exclusive appointment releases and bespoke care at The Dental Barns, including Signature Assessment ✦ appointments and Smile Design consultations with Dr Keely.';
      if (intro.textContent !== copy) intro.textContent = copy;
      const title = wrapper.querySelector('.vip-form_top .text-style-tagline');
      if (title && title.textContent !== 'Join our VIP Waitlist')
        title.textContent = 'Join our VIP Waitlist';
      wrapper.querySelectorAll('input[type="submit"]').forEach((button) => {
        if (button.value !== 'Reserve my place') button.value = 'Reserve my place';
        if (button.defaultValue !== 'Reserve my place') button.defaultValue = 'Reserve my place';
      });
      return;
    }
    const value = select.value;
    const treatments = {
      Veneers: 'porcelain veneers',
      'Composite Bonding': 'composite bonding',
      Invisalign: 'Invisalign',
      Whitening: 'teeth whitening',
      'Cosmetic Dentistry': 'cosmetic dentistry',
      'Restorative Dentistry': 'restorative dental care',
    };
    const local = /sutton-coldfield/.test(path)
      ? ' near Sutton Coldfield'
      : /tamworth/.test(path)
        ? ' near Tamworth'
        : '';
    const access =
      'Join The Dental Barns VIP for private access to a Signature Assessment ✦ with Dr Keely.';
    let copy = 'Access Signature Assessment ✦ and Smile Design appointments at The Dental Barns.';
    if (value === 'Smile Design')
      copy =
        'Prefer to start with a conversation? Join the Smile Design Waitlist. Limited appointments are released from time to time, with booking links shared exclusively with our waitlist.';
    else if (treatments[value]) copy = 'Considering ' + treatments[value] + local + '? ' + access;
    else if (value === 'Nervous Patient Care')
      copy =
        'Feeling nervous about dental care? ' +
        access +
        ' We will take time to understand your concerns.';
    else if (value === 'Signature Assessment') copy = access;
    else if (/not sure|don.t know/i.test(value))
      copy = 'You do not need to know which treatment you need. ' + access;
    if (intro.textContent !== copy) intro.textContent = copy;
  }

  function render(select) {
    select.classList.toggle('is-filled', !!select.value);
    select.classList.toggle('placeholder', !select.value);
    updateIntro(select);
  }

  function initialise(select) {
    prepareOptions(select);
    if (
      !select.value &&
      !window.TDBFormsLoader?.wasEdited(select) &&
      preferred &&
      [...select.options].some((option) => option.value === preferred)
    )
      select.value = preferred;
    render(select);
  }

  const drawerLabel = acquisition
    ? 'Reserve my place'
    : /\/services\/smile-design$/.test(path)
      ? 'Join the Smile Design Waitlist'
      : /\/services\/(?:fast-track|signature-assessment)$/.test(path)
        ? 'View Available Appointments'
        : /\/(?:treatments|areas|pricing)\//.test(path) &&
            /veneers|bonding|invisalign|clear-aligners|whitening/.test(path)
          ? 'Start with a Signature Assessment ✦'
          : 'Join VIP';
  function updateDrawerLabel() {
    const drawer = document.getElementById('tdb-vip-drawer');
    const text = drawer?.querySelector('.tdb-vip-drawer-label');
    const handle = drawer?.querySelector('.tdb-vip-drawer-handle');
    if (text && text.textContent !== drawerLabel) text.textContent = drawerLabel;
    if (handle && handle.getAttribute('aria-label') !== drawerLabel)
      handle.setAttribute('aria-label', drawerLabel);
  }

  function checkSuccess(wrapper) {
    // Skip geometry when tracking cannot run or this form already sent its lead.
    if (tracked.has(wrapper) || !wrapper.querySelector(FORMS)) return;
    const success = wrapper.querySelector('.w-form-done');
    if (!success || success.hidden || success.style.display === 'none') return;
    if (getComputedStyle(success).display === 'none' || !success.getClientRects().length) return;
    tracked.add(wrapper);
    // Match the existing Meta owner. A lingering fbq global is not consent.
    if (!window.TDBConsent?.allows('performance') || typeof window.fbq !== 'function') return;
    window.fbq('trackSingle', '1326762815429148', 'Lead');
  }

  function fieldStates(root = document) {
    root
      .querySelectorAll(
        '#vip-drawer-form input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),#vip-drawer-form textarea',
      )
      .forEach((field) => {
        field.classList.toggle('is-filled', Boolean(String(field.value || '').trim()));
      });
  }
  document.addEventListener('input', (event) => {
    if (event.target.closest?.('#vip-drawer-form')) fieldStates();
  });
  document.addEventListener('change', (event) => {
    if (event.target.closest?.('#vip-drawer-form')) fieldStates();
  });
  document.addEventListener('reset', (event) => {
    if (event.target.matches?.(FORMS))
      queueMicrotask(() => {
        if (event.defaultPrevented) return;
        // Native reset owns values; rendering must not reapply page suggestions.
        event.target.querySelectorAll(SELECT).forEach(render);
        fieldStates();
        window.TDBForms?.refresh(event.target);
      });
  });
  window.addEventListener('pageshow', () => {
    document.querySelectorAll(SELECT).forEach(render);
    fieldStates();
    window.TDBForms?.refresh();
  });

  function scan(root) {
    const selector = SELECT + ',' + FORMS;
    const candidates = [
      ...(root.matches?.(selector) ? [root] : []),
      ...root.querySelectorAll(selector),
    ];
    const selects = candidates.filter((node) => node.matches(SELECT));
    selects.forEach((select) => {
      if (seen.has(select)) return;
      seen.add(select);
      initialise(select);
    });
    const forms = candidates.filter((node) => node.matches(FORMS));
    forms.forEach((form) => {
      const wrapper = form.closest('.w-form'),
        success = wrapper?.querySelector('.w-form-done');
      if (!success || successObservers.has(success)) return;
      successObservers.add(success);
      new MutationObserver(() => checkSuccess(wrapper)).observe(success, {
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden'],
      });
      checkSuccess(wrapper);
    });
  }

  async function share() {
    const data = {
      title: 'The Dental Barns',
      text: "I've just joined the VIP Waitlist at The Dental Barns for cosmetic and restorative dental care.",
      url: 'https://www.thedentalbarns.co.uk',
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch (error) {
        if (error.name !== 'AbortError') console.error('Share failed:', error);
      }
    } else {
      window.open(
        'https://www.facebook.com/sharer/sharer.php?u=' +
          encodeURIComponent(data.url) +
          '&quote=' +
          encodeURIComponent(data.text),
        '_blank',
        'noopener,noreferrer',
      );
    }
  }

  document.addEventListener(
    'change',
    (event) => {
      const select = event.target;
      if (!select.matches?.(SELECT)) return;
      render(select);
    },
    true,
  );
  document.addEventListener('focusin', (event) => {
    if (event.target.matches?.(SELECT)) render(event.target);
  });
  document.addEventListener('click', (event) => {
    if (!event.target.closest?.(SHARE)) return;
    event.preventDefault();
    share();
  });
  document.addEventListener('keydown', (event) => {
    const trigger = event.target.closest?.(SHARE);
    if (
      !trigger ||
      event.defaultPrevented ||
      ![' ', 'Enter'].includes(event.key) ||
      trigger.tagName === 'BUTTON' ||
      (trigger.matches('a[href]') && event.key === 'Enter')
    )
      return;
    event.preventDefault();
    if (!event.repeat) trigger.click();
  });

  window.TDBVIPInterest = Object.freeze({
    fromCalculator(value) {
      preferred = value === 'Smile Design' ? 'Smile Design' : 'Signature Assessment';
      document.querySelectorAll(SELECT).forEach((select) => {
        if ([...select.options].some((option) => option.value === preferred))
          select.value = preferred;
        render(select);
      });
      window.TDBForms?.refresh();
    },
  });
  window.TDBVIPForm = Object.freeze({
    version: '1.2.0',
    refresh: () => {
      scan(document);
      document.querySelectorAll(SELECT).forEach(render);
      fieldStates();
      updateDrawerLabel();
    },
  });
  function start() {
    scan(document);
    fieldStates();
    updateDrawerLabel();
    // Existing multiline-copy compatibility; appearance remains in native classes.
    document.querySelectorAll('p,div').forEach((el) => {
      if (
        !el.children.length &&
        /\n\s*\n/.test(el.textContent) &&
        /Signature Assessment|Smile Design/.test(el.textContent)
      )
        el.setAttribute('data-tdb-copy-paragraphs', 'true');
    });
    new MutationObserver((records) => {
      let drawerChanged = false;
      for (const record of records) {
        if (record.target.closest?.('#tdb-vip-drawer')) drawerChanged = true;
        for (const node of record.addedNodes)
          if (node.nodeType === 1) {
            scan(node);
            if (node.id === 'tdb-vip-drawer' || node.querySelector('#tdb-vip-drawer'))
              drawerChanged = true;
          }
      }
      if (drawerChanged) updateDrawerLabel();
    }).observe(document.body, { childList: true, subtree: true });
    window.TDBForms?.refresh();
  }
  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
