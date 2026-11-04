const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/calculator/core.js');
const records = Object.fromEntries(
  Object.entries(C.IDS).map(([key, id]) => [
    id,
    C.recordFromFields({
      record: id,
      label: key,
      price:
        '£' +
        ({ assessment: 450, design: 225, bonding: 395, hygiene: 195, aligners: 4195 }[key] || 100),
      ...(key === 'aligners' ? { hygiene: true } : {}),
    }),
  ]),
);
const treatment = () => ({
  ...C.newState(),
  categories: ['cosmetic'],
  selected: { bonding: { qty: 2, tier: null } },
});

test('both starting routes retain the same full assessment cost and charge hygiene once', () => {
  const state = treatment();
  const signature = C.estimate(records, state);
  state.assessment = 'design';
  const design = C.estimate(records, state);
  assert.equal(signature.min, 124000);
  assert.equal(design.min, signature.min);
  assert.equal(design.assessment, 'design');
  assert.equal(design.assessmentLine.min, 22500);
  assert.equal(design.assessmentLine.label, 'Smile Design');
  assert.equal(design.lines.find((line) => line.key === 'checkup').min, 22500);
  assert.equal(C.finance(design, 0, 12).minimumDeposit, 45000);
  state.hygiene = true;
  assert.equal(C.estimate(records, state).min, 143500);
  state.categories = ['restorative'];
  state.selected = { fillings: { qty: 1, tier: null } };
  assert.equal(C.estimate(records, state).lines.filter((l) => l.key === 'hygiene').length, 1);
});

test('appointment-only estimates exclude retained treatments and hygiene without erasing choices', () => {
  const state = { ...treatment(), assessmentOnly: true, assessment: 'design', hygiene: true };
  const design = C.estimate(records, state);
  assert.equal(design.min, 22500);
  assert.equal(design.selected.length, 0);
  assert.equal(design.lines.length, 1);
  assert.equal(C.duration(records, design, '2026-12-18'), '60 minutes');
  assert.equal(design.state.selected.bonding.qty, 2);
  state.assessment = 'signature';
  const signature = C.estimate(records, state);
  assert.equal(signature.min, 45000);
  assert.equal(C.duration(records, signature, '2026-12-18'), '90 minutes');
  state.assessmentOnly = false;
  assert.equal(C.estimate(records, state).min, 143500);
});

test('Smile Design starts exactly six calendar weeks after live assessment availability', () => {
  const signature = C.estimate(records, treatment());
  const design = C.estimate(records, { ...treatment(), assessment: 'design' });
  const live = '2026-12-18';
  assert.equal(C.assessmentStart(signature, live), live);
  assert.equal(C.assessmentStart(design, live), '2027-01-29');
  assert.equal(C.assessmentStart(design, '2028-02-01'), '2028-03-14');
  const first = C.completionTimeline(records, signature, C.assessmentStart(signature, live));
  const second = C.completionTimeline(records, design, C.assessmentStart(design, live));
  assert.equal((C.parseDate(second.finishMin) - C.parseDate(first.finishMin)) / 86400000, 49);
  assert.equal((C.parseDate(second.finishMax) - C.parseDate(first.finishMax)) / 86400000, 56);
  assert.equal(first.checkup, null);
  assert.deepEqual(second.checkup, { startMin: '2027-02-05', startMax: '2027-02-12' });
  assert.deepEqual(second.preparation, {
    startMin: '2027-02-05',
    startMax: '2027-02-12',
    endMin: '2027-02-19',
    endMax: '2027-02-26',
  });
  assert.equal(C.duration(records, signature, live), '4 weeks');
  assert.equal(C.duration(records, design, live), '11–12 weeks');
  const earlier = C.completionTimeline(
    records,
    design,
    C.assessmentStart(design, live),
    0,
    first.finishMin,
  );
  assert.equal(earlier.tooSoon, true);
  assert.equal(earlier.finishMin, second.finishMin);
  const delayed = C.completionTimeline(records, design, C.assessmentStart(design, live), 21);
  assert.equal((C.parseDate(delayed.checkup.startMin) - C.parseDate(delayed.start)) / 86400000, 7);
  const target = C.iso(C.addDays(C.parseDate(second.finishMin), 30));
  const later = C.completionTimeline(records, design, C.assessmentStart(design, live), 0, target);
  assert.equal(later.finishMin, target);
  assert.equal((C.parseDate(later.checkup.startMax) - C.parseDate(later.start)) / 86400000, 14);
});

test('included aligner hygiene stays free and appointment-only state survives normalization', () => {
  const state = { ...treatment(), selected: { aligners: { qty: 1, tier: null } }, hygiene: true };
  const e = C.estimate(records, state);
  assert.equal(e.lines.find((l) => l.key === 'hygiene').min, 0);
  assert.equal(e.lines.filter((l) => l.key === 'hygiene').length, 1);
  assert.equal(
    C.normaliseState({ ...state, assessment: 'design', assessmentOnly: true }).assessmentOnly,
    true,
  );
  assert.equal(
    C.normaliseState({ ...state, assessment: 'none', assessmentOnly: true }).assessmentOnly,
    false,
  );
});
