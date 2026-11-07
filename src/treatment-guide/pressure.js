/* Circular indentation and rounded wedge edges, underneath the untouched dividers. */
(() => {
  'use strict';
  if (window.TDBTreatmentGuidePressure) return;
  let serial = 0;
  function create(svg) {
    const id = `tdb-guide-pressure-${++serial}`;
    const make = (tag, attrs, parent) => {
      const node = document.createElementNS(svg.namespaceURI, tag);
      for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
      parent?.append(node);
      return node;
    };
    const defs = make('defs', {}, svg);
    function gradient(name, colour, stops) {
      const node = make('radialGradient', { id: `${id}-${name}` }, defs);
      for (const [offset, opacity] of stops)
        make(
          'stop',
          {
            offset,
            'stop-opacity': opacity,
            ...(colour === 'white'
              ? { 'stop-color': 'white' }
              : { class: `treatment-guide_pressure-${colour}` }),
          },
          node,
        );
    }
    gradient('feather', 'light', [
      [0, 0],
      [0.25, 0],
      [0.42, 0.025],
      [0.59, 0.1],
      [0.77, 0.035],
      [1, 0],
    ]);
    gradient('well', 'core', [
      [0, 1],
      [0.25, 1],
      [0.36, 0.94],
      [0.46, 0.65],
      [0.56, 0.23],
      [0.68, 0.04],
      [0.82, 0],
      [1, 0],
    ]);
    gradient('rim', 'light', [
      [0, 0],
      [0.29, 0],
      [0.38, 0.02],
      [0.48, 0.14],
      [0.58, 0.62],
      [0.64, 0.86],
      [0.7, 0.55],
      [0.78, 0.2],
      [0.89, 0.035],
      [1, 0],
    ]);
    gradient('falloff', 'white', [
      [0, 1],
      [0.32, 0.94],
      [0.55, 0.68],
      [0.76, 0.28],
      [0.9, 0.06],
      [1, 0],
    ]);
    const clip = make('clipPath', { id: `${id}-clip` }, defs);
    make(
      'path',
      {
        'clip-rule': 'evenodd',
        d: 'M500 0A500 500 0 1 1 500 1000A500 500 0 1 1 500 0M500 360A140 140 0 1 0 500 640A140 140 0 1 0 500 360',
      },
      clip,
    );
    const mask = (name) =>
      make(
        'mask',
        {
          id: `${id}-${name}`,
          maskUnits: 'userSpaceOnUse',
          x: 0,
          y: 0,
          width: 1000,
          height: 1000,
          style: 'mask-type:alpha',
        },
        defs,
      );
    const moving = make('g', { class: 'treatment-guide_pressure-mask' }, mask('contact'));
    make('circle', { r: 242, fill: `url(#${id}-falloff)` }, moving);
    const layer = make('g', { 'clip-path': `url(#${id}-clip)` });
    const pressure = make('g', { class: 'treatment-guide_pressure' }, layer);
    const surface = make('g', {}, pressure);
    for (const [name, radius] of [
      ['feather', 316.8],
      ['well', 220],
      ['rim', 220],
    ])
      make('circle', { r: radius, fill: `url(#${id}-${name})` }, surface);
    const contact = make(
      'g',
      { class: 'treatment-guide_pressure-contact', mask: `url(#${id}-contact)` },
      layer,
    );
    for (const name of ['dark', 'light']) {
      const wedgeMask = mask(name);
      for (let i = 0; i < 5; i++)
        make(
          'image',
          {
            x: 200,
            y: 0,
            width: 600,
            height: 400,
            transform: `rotate(${i * 72} 500 500)`,
            href: window.TDBTreatmentGuidePressureMasks[name],
          },
          wedgeMask,
        );
      make(
        'rect',
        {
          width: 1000,
          height: 1000,
          class: `treatment-guide_pressure-edge-${name}`,
          mask: `url(#${id}-${name})`,
        },
        contact,
      );
    }
    return {
      layer,
      destroy() {
        layer.remove();
        defs.remove();
      },
      render(x, y, depth) {
        const translate = `translate(${x} ${y})`,
          scale = `scale(${0.8 + 0.2 * depth})`;
        pressure.setAttribute('transform', translate);
        surface.setAttribute('transform', scale);
        moving.setAttribute('transform', `${translate} ${scale}`);
        pressure.style.opacity = contact.style.opacity = depth.toFixed(4);
      },
    };
  }
  window.TDBTreatmentGuidePressure = Object.freeze({ create });
})();
