const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../src/instagram/native.js'), 'utf8');
const start = source.indexOf('  function readPosts(root) {');
const end = source.indexOf('\n  function fallback(', start);
const readPosts = new Function('hasMetric', 'location', source.slice(start,end)+'; return readPosts;')(
  n => Number.isSafeInteger(n) && n >= 0, {href:'https://dentalbarns.webflow.io/'});
const fixtures = require('./fixtures/instagram-native-metadata.json');

// Supply only the DOM reads the record parser consumes. These are contract
// tests using published CMS data, not layout or browser emulation tests.
function rootFor(records, mode) {
  const slides = records.map(record => ({
    matches: () => true,
    getAttribute: name => mode === 'legacy' ? null : record.attributes[name] ?? null,
    querySelector: selector => {
      if (selector === '.ig-native_photo') return {getAttribute: name => name === 'src' ? record.image : null};
      const name = /^\[data-ig-field="([^"]+)"\]$/.exec(selector)?.[1];
      return mode === 'attributes' || !(name in record.old) ? null : {
        textContent:record.old[name], getAttribute:key => key === 'href' ? record.old[name] : null
      };
    }
  }));
  return {querySelector:() => ({querySelector:() => ({children:slides})})};
}
const values = posts => posts.map(({slide,...data}) => data);

test('all 16 published CMS records parse identically with attributes only', () => {
  assert.equal(fixtures.length,16);
  assert.deepEqual(values(readPosts(rootFor(fixtures,'attributes'))),values(readPosts(rootFor(fixtures,'legacy'))));
});
test('intentional blanks override stale descendant fields; zero remains zero', () => {
  const record=structuredClone(fixtures[0]);
  record.attributes['data-ig-record-likes']='0';
  record.attributes['data-ig-record-comments']='';
  record.attributes['data-ig-record-shares']='';
  record.old.comments='21'; record.old.shares='9';
  const [post]=readPosts(rootFor([record],'mixed'));
  assert.equal(post.likes,0); assert.equal(post.comments,null); assert.equal(post.shares,null);
});
test('missing attributes retain compatibility with existing field markup', () => {
  const record=structuredClone(fixtures[1]);
  delete record.attributes['data-ig-record-date'];
  delete record.attributes['data-ig-record-likes'];
  const [post]=readPosts(rootFor([record],'mixed'));
  assert.equal(post.date,record.old.date);
  assert.equal(post.likes,Number(record.old.likes));
});
test('empty or invalid primary URLs remain errors instead of stale fallback', () => {
  for (const url of ['', 'https://example.com/post']) {
    const record=structuredClone(fixtures[0]);record.attributes['data-ig-record-url']=url;
    assert.throws(()=>readPosts(rootFor([record],'mixed')),/CMS item/);
  }
});
test('duplicate post URLs are still rejected', () => {
  assert.throws(()=>readPosts(rootFor([fixtures[0],fixtures[0]],'attributes')),/unique post link/);
});

test('CMS metadata attributes cannot match the stationary display selectors', () => {
  const displayHooks=['data-ig-date','data-ig-current','data-ig-total','data-ig-label','data-ig-metric','data-ig-post-link'];
  for (const record of fixtures) for (const hook of displayHooks) assert.equal(hook in record.attributes,false,hook);
});
