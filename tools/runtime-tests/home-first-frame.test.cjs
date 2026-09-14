const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const css = fs.readFileSync(path.resolve(__dirname, '../../src/styles/tdb-home-first-frame.css'), 'utf8');

test('Home poster is visible before JS; marquee guard yields to the existing IX2 opacity', t => {
  const dom = new JSDOM(`<style>.hero-vimeo_background-video-wrapper{opacity:0}</style><style>${css}</style><div class="hero-vimeo_background-video-wrapper"></div><section class="section_logo-features"><div class="partner-banner-heading">Awards</div></section>`);
  t.after(() => dom.window.close());
  const w = dom.window, hero = w.document.querySelector('.hero-vimeo_background-video-wrapper');
  const heading = w.document.querySelector('.partner-banner-heading');
  assert.equal(w.getComputedStyle(hero).opacity, '1');
  assert.equal(w.getComputedStyle(heading).opacity, '0');
  heading.style.opacity = '.5';
  assert.equal(w.getComputedStyle(heading).opacity, '0.5');
  heading.style.opacity = '.1';
  assert.equal(w.getComputedStyle(heading).opacity, '0.1');
});
