/* Project an audited Webflow CSS export into timing-only bindings. Never copies
 * layout, artwork, transition properties, keyframes or animation names.
 * Run explicitly when native motion is added/changed; ordinary builds use the
 * committed projection. Source exports remain outside this repository.
 */
const fs = require('node:fs');
const postcss = require('postcss');
const { linkValue, roleFor } = require('./motion-css.cjs');
function split(value, comma = false) {
  const parts = [];
  let depth = 0,
    start = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    else if (value[i] === ')') {
      depth--;
      // Minified CSS may omit whitespace after a function, e.g. var(--time,.4s)ease.
      if (!comma && !depth && i + 1 < value.length && !/[\s,]/.test(value[i + 1])) {
        parts.push(value.slice(start, i + 1).trim());
        start = i + 1;
      }
    } else if (!depth && (comma ? value[i] === ',' : /\s/.test(value[i]))) {
      if (value.slice(start, i).trim()) parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (value.slice(start).trim()) parts.push(value.slice(start).trim());
  return parts;
}
function shorthand(value, type) {
  const rows = split(value, true).map((part) => {
    const tokens = split(part),
      times = tokens.filter(
        (t) =>
          /^-?[\d.]+m?s$/.test(t) || /^var\(--.*(?:duration|delay)/.test(t) || /^calc\(/.test(t),
      );
    const curve = tokens.find(
      (t) =>
        /^(?:ease(?:-in-out|-in|-out)?|linear|step-start|step-end)$/.test(t) ||
        /^(?:cubic-bezier|linear|steps)\(/.test(t) ||
        /^var\(--.*(?:ease|easing)/.test(t),
    );
    return { duration: times[0] || '0s', delay: times[1] || '0s', curve: curve || 'ease' };
  });
  return {
    [type + '-duration']: rows.map((r) => r.duration).join(','),
    [type + '-delay']: rows.map((r) => r.delay).join(','),
    [type + '-timing-function']: rows.map((r) => r.curve).join(','),
  };
}
function project(source) {
  const tree = postcss.parse(source);
  tree.walkComments((n) => n.remove());
  tree.walkAtRules((n) => {
    if (!['media', 'supports', 'layer'].includes(n.name)) n.remove();
  });
  tree.walkRules((rule) => {
    for (const decl of [...rule.nodes]) {
      if (decl.type !== 'decl') {
        decl.remove();
        continue;
      }
      const name = decl.prop.replace(/^-webkit-/, '');
      const role = roleFor(rule.selector, decl.prop);
      if (['transition', 'animation'].includes(name)) {
        for (const [prop, value] of Object.entries(shorthand(decl.value, name)))
          decl.cloneBefore({ prop, value: linkValue(value, role) });
        decl.remove();
      } else if (/^(?:transition|animation)-(?:duration|delay|timing-function)$/.test(name))
        decl.value = linkValue(decl.value, role);
      else decl.remove();
    }
    if (!rule.nodes.length) rule.remove();
  });
  tree.walkAtRules((n) => {
    if (!n.nodes?.length) n.remove();
  });
  return tree.toString();
}
if (require.main === module) {
  const inputs = process.argv.slice(2);
  if (!inputs.length) throw Error('Pass audited native stylesheet file paths');
  const result =
    '/* Native Webflow motion bindings, audited 24 October 2026.\n * Only timing/easing are projected; Designer retains layout and state ownership.\n * Regenerate with tools/runtime-build/native-motion.cjs when native motion changes.\n */\n' +
    inputs.map((file) => project(fs.readFileSync(file, 'utf8'))).join('\n') +
    '\n';
  fs.writeFileSync('src/styles/tdb-native-motion.css', result);
}
module.exports = { project, shorthand };
