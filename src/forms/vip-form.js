/* Shared VIP form behaviour. Designer owns markup and all visual states.
 * Reuses TDBForms for validation/phone handling and Webflow for submission.
 * Original form IDs, field names, option values and attribution are preserved.
 */
(() => {
  'use strict';
  if (window.TDBVIPForm) return;
  const SELECT = 'select[name="Treatment-Of-Interest"],select[name="Treatment of Interest"],select[name="Treatment Of Interest"]';
  const FORMS = '#email-form, #vip-drawer-form';
  const SHARE = '[data-tdb-vip-share]';
  const seen = new WeakSet(), manual = new WeakMap(), tracked = new WeakSet();
  const successObservers = new WeakSet();
  const path = location.pathname.toLowerCase().replace(/\/$/, '');
  const acquisition = /^\/vip\/(?:become-a-patient|instagram|x|pinterest|youtube|facebook|google|tiktok)$/.test(path);
  const allowed = ['Cosmetic Dentistry','Restorative Dentistry','Signature Assessment','Smile Design','Nervous Patient Care','Invisalign','Composite Bonding','Veneers','Whitening'];
  const requested = new URLSearchParams(location.search).get('interest');

  function pageInterest() {
    if (['/first-visit','/fast-track','/signature-assessment'].includes(path)) return 'Signature Assessment';
    if (!/^\/(services|treatments|areas|pricing)\//.test(path)) return '';
    const routes = [
      [/signature-assessment|fast-track|smile-assessment/, 'Signature Assessment'],
      [/smile-design/, 'Smile Design'], [/nervous/, 'Nervous Patient Care'],
      [/invisalign|clear-aligners/, 'Invisalign'], [/composite-bonding/, 'Composite Bonding'],
      [/veneers/, 'Veneers'], [/whitening/, 'Whitening'],
      [/general-dentistry|restorative/, 'Restorative Dentistry'], [/cosmetic/, 'Cosmetic Dentistry']
    ];
    return routes.find(([pattern]) => pattern.test(path))?.[1] || '';
  }
  let preferred = allowed.includes(requested) ? requested : pageInterest();

  // Retain the original controls: native option editing is not exposed by MCP.
  // This is the existing compatibility mapping, including submitted values.
  function prepareOptions(select) {
    const previous = select.value;
    const assessment = [...select.options].find(o => /^(Fast Track|Signature Assessment)$/.test(o.value));
    if (!assessment) return;
    assessment.textContent = 'Signature Assessment ✦';
    assessment.value = 'Signature Assessment';
    let design = [...select.options].find(o => o.value === 'Smile Design');
    if (!design) { design = new Option('Smile Design', 'Smile Design'); select.append(design); }
    if (select.options[1] !== assessment) select.insertBefore(assessment, select.options[1] || null);
    const unsure = [...select.options].find(o => /not sure|don.t know/i.test(o.textContent));
    if (unsure && select.lastElementChild !== unsure) select.append(unsure);
    select.value = previous === 'Fast Track' ? 'Signature Assessment' : previous;
  }

  function updateIntro(select) {
    const wrapper = select.closest('.vip-form_wrapper') || select.closest('.tdb-vip-drawer-body') || select.closest('section');
    const intro = wrapper?.querySelector('[data-tdb-vip-intro]');
    if (!intro) return;
    if (acquisition) {
      const copy = 'Your access to exclusive appointment releases and bespoke care at The Dental Barns, including Signature Assessment ✦ appointments and Smile Design consultations with Dr Keely.';
      if (intro.textContent !== copy) intro.textContent = copy;
      const title = wrapper.querySelector('.vip-form_top .text-style-tagline');
      if (title && title.textContent !== 'Join our VIP Waitlist') title.textContent = 'Join our VIP Waitlist';
      wrapper.querySelectorAll('input[type="submit"]').forEach(button => {
        if (button.value !== 'Reserve my place') button.value = 'Reserve my place';
        if (button.defaultValue !== 'Reserve my place') button.defaultValue = 'Reserve my place';
      });
      return;
    }
    const value = select.value;
    const treatments = {'Veneers':'porcelain veneers','Composite Bonding':'composite bonding','Invisalign':'Invisalign','Whitening':'teeth whitening','Cosmetic Dentistry':'cosmetic dentistry','Restorative Dentistry':'restorative dental care'};
    const local = /sutton-coldfield/.test(path) ? ' near Sutton Coldfield' : /tamworth/.test(path) ? ' near Tamworth' : '';
    const access = 'Join The Dental Barns VIP for private access to a Signature Assessment ✦ with Dr Keely.';
    let copy = 'Access Signature Assessment ✦ and Smile Design appointments at The Dental Barns.';
    if (value === 'Smile Design') copy = 'Prefer to start with a conversation? Join the Smile Design Waitlist. Limited appointments are released from time to time, with booking links shared exclusively with our waitlist.';
    else if (treatments[value]) copy = 'Considering ' + treatments[value] + local + '? ' + access;
    else if (value === 'Nervous Patient Care') copy = 'Feeling nervous about dental care? ' + access + ' We will take time to understand your concerns.';
    else if (value === 'Signature Assessment') copy = access;
    else if (/not sure|don.t know/i.test(value)) copy = 'You do not need to know which treatment you need. ' + access;
    if (intro.textContent !== copy) intro.textContent = copy;
  }

  function apply(select) {
    const value = manual.has(select) ? manual.get(select) : preferred;
    if ((value || manual.has(select)) && [...select.options].some(o => o.value === value)) select.value = value;
    select.classList.toggle('is-filled', !!select.value);
    select.classList.toggle('placeholder', !select.value);
    updateIntro(select);
  }

  const drawerLabel = acquisition ? 'Reserve my place' : /\/services\/smile-design$/.test(path) ? 'Join the Smile Design Waitlist' : /\/services\/(?:fast-track|signature-assessment)$/.test(path) ? 'View Available Appointments' : /\/(?:treatments|areas|pricing)\//.test(path) && /veneers|bonding|invisalign|clear-aligners|whitening/.test(path) ? 'Start with a Signature Assessment ✦' : 'Join VIP';
  function updateDrawerLabel() {
    const drawer = document.getElementById('tdb-vip-drawer');
    const text = drawer?.querySelector('.tdb-vip-drawer-label');
    const handle = drawer?.querySelector('.tdb-vip-drawer-handle');
    if (text && text.textContent !== drawerLabel) text.textContent = drawerLabel;
    if (handle && handle.getAttribute('aria-label') !== drawerLabel) handle.setAttribute('aria-label', drawerLabel);
  }

  function checkSuccess(wrapper) {
    const success = wrapper.querySelector('.w-form-done');
    if (!wrapper.querySelector(FORMS) || !success || getComputedStyle(success).display === 'none' || !success.getClientRects().length || tracked.has(wrapper) || typeof window.fbq !== 'function') return;
    tracked.add(wrapper);
    window.fbq('trackSingle', '1326762815429148', 'Lead');
  }

  function fieldStates(root = document) {
    root.querySelectorAll('#vip-drawer-form input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]),#vip-drawer-form textarea').forEach(field => {
      field.classList.toggle('is-filled', Boolean(String(field.value || '').trim()));
    });
  }
  document.addEventListener('input', event => {
    if (event.target.closest?.('#vip-drawer-form')) fieldStates();
  });
  document.addEventListener('change', event => {
    if (event.target.closest?.('#vip-drawer-form')) fieldStates();
  });
  document.addEventListener('reset', event => {
    if (event.target.matches?.(FORMS)) queueMicrotask(() => fieldStates());
  });
  window.addEventListener('pageshow', () => fieldStates());

  function scan(root) {
    const selects = root.matches?.(SELECT) ? [root] : [...root.querySelectorAll(SELECT)];
    selects.forEach(select => {
      if (seen.has(select)) return;
      seen.add(select); prepareOptions(select); apply(select);
    });
    const forms = root.matches?.(FORMS) ? [root] : [...root.querySelectorAll(FORMS)];
    forms.forEach(form => {
      const wrapper = form.closest('.w-form'), success = wrapper?.querySelector('.w-form-done');
      if (!success || successObservers.has(success)) return;
      successObservers.add(success);
      new MutationObserver(() => checkSuccess(wrapper)).observe(success, {attributes:true, attributeFilter:['class','style','hidden']});
      checkSuccess(wrapper);
    });
  }

  async function share() {
    const data = {title:'The Dental Barns', text:"I've just joined the VIP Waitlist at The Dental Barns for cosmetic and restorative dental care.", url:'https://www.thedentalbarns.co.uk'};
    if (navigator.share) {
      try { await navigator.share(data); } catch (error) { if (error.name !== 'AbortError') console.error('Share failed:', error); }
    } else {
      window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(data.url) + '&quote=' + encodeURIComponent(data.text), '_blank', 'noopener,noreferrer');
    }
  }

  document.addEventListener('change', event => {
    const select = event.target;
    if (!select.matches?.(SELECT)) return;
    if (event.isTrusted) manual.set(select, select.value);
    apply(select);
  }, true);
  document.addEventListener('focusin', event => {
    if (event.target.matches?.(SELECT)) apply(event.target);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest?.(SHARE)) return;
    event.preventDefault(); share();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== ' ' || !event.target.matches?.(SHARE) || event.target.tagName === 'BUTTON') return;
    event.preventDefault(); event.target.click();
  });

  window.TDBVIPInterest = Object.freeze({
    fromCalculator(value) {
      preferred = value === 'Smile Design' ? 'Smile Design' : 'Signature Assessment';
      document.querySelectorAll(SELECT).forEach(apply);
      window.TDBForms?.refresh();
    }
  });
  window.TDBVIPForm = Object.freeze({version:'1.1.0', refresh:() => {scan(document); fieldStates(); updateDrawerLabel();}});
  function start() {
    scan(document); fieldStates(); updateDrawerLabel();
    // Existing multiline-copy compatibility; appearance remains in native classes.
    document.querySelectorAll('p,div').forEach(el => {
      if (!el.children.length && /\n\s*\n/.test(el.textContent) && /Signature Assessment|Smile Design/.test(el.textContent)) el.setAttribute('data-tdb-copy-paragraphs','true');
    });
    new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) scan(node);
      updateDrawerLabel();
    }).observe(document.body, {childList:true, subtree:true});
    window.TDBForms?.refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true}); else start();
})();
