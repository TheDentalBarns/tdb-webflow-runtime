const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseTeamQuotes, assignedPage, readFeed } = require('../src/team-quotes/team-quotes.js');
const quote = (id, page, rank, extra = {}) => ({ id, author: 'Speaker', text: id, page, rank, tags: [], ...extra });
test('explicit page is exclusive and takes precedence over routing tags', () => {
  const record = quote('a', '/first-visit/', 2, { tags: ['home'] });
  assert.equal(assignedPage(record), '/first-visit');
  assert.equal(chooseTeamQuotes([record], '/').length, 0);
  assert.equal(chooseTeamQuotes([record], '/first-visit/').length, 1);
});
test('recognised tag selects one page; general tags do not distribute a quote', () => {
  assert.equal(assignedPage(quote('a', '', 1, { tags: ['comfort', 'home', 'contact'] })), '/');
  assert.equal(assignedPage(quote('a', '', 1, { tags: ['comfort'] })), null);
});
test('ranking, maximum three, inactive records and missing attribution remain deterministic', () => {
  const records = [quote('four', '/', 4), quote('two', '/', 2), quote('one', '/', 1), quote('three', '/', 3), quote('paused', '/', .5, { active: false }), quote('anonymous', '/', .1, { author: '' })];
  assert.deepEqual(chooseTeamQuotes(records, '/').map(x => x.id), ['one', 'two', 'three']);
});
test('normalised duplicates cannot be repeated across pages', () => {
  const records = [quote('a', '/', 1, { text: 'Same  words' }), quote('b', '/contact', 2, { text: 'same words' })];
  assert.equal(chooseTeamQuotes(records, '/contact').length, 0);
});
test('empty page has no generic fallback', () => {
  assert.deepEqual(chooseTeamQuotes([quote('a', '/', 1)], '/services/facial-aesthetics'), []);
});
test('CMS parser tolerates nested quote paragraphs and formatted metadata', () => {
  const node = (tagName, textContent, insideQuote = false) => ({ tagName, textContent, closest: () => insideQuote ? {} : null });
  const nodes = [node('H3', 'Test quote'), node('BLOCKQUOTE', 'Approved text.'), node('P', 'Approved text.', true), node('P', 'Tags: home, comfort'), node('P', 'Page: /'), node('P', 'Rank: 2'), node('P', 'Active: no')];
  const item = { querySelector: selector => selector.includes('author') ? { textContent: ' David Drew ' } : selector.includes('role') ? { textContent: 'Owner & Co-Founder' } : { querySelectorAll: () => nodes } };
  const [record] = readFeed({ querySelectorAll: () => [item] });
  assert.equal(record.text, 'Approved text.'); assert.equal(record.rank, 2);
  assert.equal(record.active, false); assert.deepEqual(record.tags, ['home', 'comfort']);
  assert.equal(record.author, 'David Drew');
});
