const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');

test('quotation artwork scrolls in the active card and uses the overlay only between cards', () => {
  const dom = new JSDOM('<aside><b class="tdb-review-drawer_static-mark is-stationary"></b></aside><article><div class="tdb-review-drawer_mark-space"></div></article><article><div class="tdb-review-drawer_mark-space"></div></article>', { runScripts: 'outside-only' });
  const w = dom.window;
  try {
    w.eval(fs.readFileSync('src/reviews/native/quote-mark.js', 'utf8'));
    const overlay = w.document.querySelector('aside');
    const mark = overlay.firstElementChild;
    const slides = [...w.document.querySelectorAll('article')];
    const placement = w.TDBReviewQuoteMark.mount(mark, overlay);
    placement.attach(slides[0]);
    assert.equal(mark.parentElement, slides[0].firstElementChild);
    assert(mark.classList.contains('is-reading'));
    assert(!mark.classList.contains('is-stationary'));
    slides[0].scrollTop = 120;
    slides[0].dispatchEvent(new w.Event('scroll'));
    assert.equal(mark.style.translate, '', 'reading needs no asynchronous scroll correction');
    assert.equal(mark.parentElement, slides[0].firstElementChild);
    placement.park(120);
    assert.equal(mark.parentElement, overlay);
    assert.equal(mark.style.translate, '0px -120px');
    placement.attach(slides[1]);
    assert.equal(mark.parentElement, slides[1].firstElementChild);
    assert.equal(mark.style.translate, '');
    assert.equal(w.document.querySelectorAll('.tdb-review-drawer_static-mark').length, 1);
    placement.park(0);
    assert.equal(mark.style.translate, '');
    placement.destroy();
    assert.equal(mark.parentElement, overlay);
    assert(mark.classList.contains('is-stationary'));
    assert(!mark.classList.contains('is-reading'));
  } finally {
    w.close();
  }
});
