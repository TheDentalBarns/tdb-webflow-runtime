/* Home's form is fetched only on open. Webflow remains the submission owner. */
(() => {
  'use strict';
  if (window.TDBVIPContent) return;
  const markup = __TDB_VIP_CONTENT__;
  const mounts = new WeakMap();

  function nativeForms() {
    return new Promise((resolve, reject) => {
      const deadline = Date.now() + 15000;
      function check() {
        const forms = window.Webflow?.require?.('forms');
        if (forms?.ready && window.jQuery) return resolve(forms);
        if (Date.now() >= deadline) return reject(new Error('Webflow forms unavailable'));
        setTimeout(check, 100);
      }
      check();
    });
  }

  async function prepare(drawer) {
    const body = drawer.querySelector('.tdb-vip-drawer-body');
    if (!body) throw new Error('VIP content mount missing');
    let form = body.querySelector('#vip-drawer-form');
    if (!form) {
      const template = document.createElement('template');
      template.innerHTML = markup;
      body.append(template.content);
      body.setAttribute('data-tdb-vip-content', '');
      form = body.querySelector('#vip-drawer-form');
      form.setAttribute('data-wf-page-id', document.documentElement.dataset.wfPage || '');
    }
    const forms = await nativeForms();
    const $ = window.jQuery;
    if (!$.data(form, '.w-form')?.handler) {
      // Webflow's ready() discovers inserted forms but also resets existing
      // submit buttons. Preserve the footer's pending/success state and values.
      const previous = [...document.querySelectorAll('.w-form form')]
        .filter((node) => node !== form)
        .map((node) => ({
          state: $.data(node, '.w-form'),
          success: $.data(node, '.w-form')?.success,
          buttons: [...node.querySelectorAll('[type="submit"]')].map((button) => ({
            button,
            disabled: button.disabled,
            value: button.value,
            loading: button.classList.contains('w-form-loading'),
          })),
        }));
      try {
        forms.ready();
      } finally {
        previous.forEach(({ state, success, buttons }) => {
          if (state) state.success = success;
          buttons.forEach(({ button, disabled, value, loading }) => {
            button.disabled = disabled;
            button.value = value;
            button.classList.toggle('w-form-loading', loading);
          });
        });
      }
      if (!$.data(form, '.w-form')?.handler) throw new Error('VIP form registration failed');
    }
    window.TDBVIPForm?.refresh();
    window.TDBForms?.refresh(body);
    drawer.setAttribute('data-tdb-vip-content-ready', '');
    return body;
  }

  function mount(drawer) {
    if (!mounts.has(drawer)) {
      const flight = prepare(drawer).catch((error) => {
        mounts.delete(drawer);
        throw error;
      });
      mounts.set(drawer, flight);
    }
    return mounts.get(drawer);
  }
  window.TDBVIPContent = Object.freeze({ mount });
})();
