/* Project an audited Webflow CSS export into timing-only bindings. Never copies
 * layout, artwork, transition properties, keyframes or animation names.
 * Run explicitly when native motion is added/changed; ordinary builds use the
 * committed projection. Source exports remain outside this repository.
 */
const fs = require('node:fs');
const crypto = require('node:crypto');
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
  if (/^(?:inherit|initial|revert(?:-layer)?)$/.test(value.trim())) return null;
  const rows = [];
  for (const part of split(value, true)) {
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
    // A whole shorthand supplied by a variable can contain times, names and
    // comma-separated entries. Its duration cannot safely be guessed as zero.
    if (
      times.length > 2 ||
      tokens.some((t) => /^var\(/.test(t) && !times.includes(t) && t !== curve)
    )
      return null;
    rows.push({ duration: times[0] || '0s', delay: times[1] || '0s', curve: curve || 'ease' });
  }
  return {
    [type + '-duration']: rows.map((r) => r.duration).join(','),
    [type + '-delay']: rows.map((r) => r.delay).join(','),
    [type + '-timing-function']: rows.map((r) => r.curve).join(','),
  };
}
function selectorKeys(rule) {
  // :where() adds no specificity. A linked native variant still needs a guard
  // if its same-specificity base remains projected after the native stylesheet.
  return rule.selectors.map((selector) => {
    let start;
    while ((start = selector.indexOf(':where(')) !== -1) {
      let end = start + 7,
        depth = 1;
      for (; end < selector.length && depth; end++) {
        if (selector[end] === '(') depth++;
        else if (selector[end] === ')') depth--;
      }
      selector = selector.slice(0, start) + selector.slice(end);
    }
    return selector.trim();
  });
}
function project(source) {
  const tree = postcss.parse(source);
  tree.walkComments((n) => n.remove());
  tree.walkAtRules((n) => {
    if (!['media', 'supports', 'layer'].includes(n.name)) n.remove();
  });
  const records = [],
    projected = new Set();
  tree.walkRules((rule) => {
    const keys = selectorKeys(rule);
    for (const decl of [...rule.nodes]) {
      if (decl.type !== 'decl') {
        decl.remove();
        continue;
      }
      const name = decl.prop.replace(/^-webkit-/, '');
      const role = roleFor(rule.selector, decl.prop);
      let values;
      if (['transition', 'animation'].includes(name)) {
        values = shorthand(decl.value, name);
        if (!values) {
          records.push({ decl, keys, opaque: name });
          continue;
        }
      } else if (/^(?:transition|animation)-(?:duration|delay|timing-function)$/.test(name)) {
        values = { [name]: decl.value };
      } else {
        decl.remove();
        continue;
      }
      const inactive = /^(?:none|unset)$/.test(decl.value.trim());
      const fields = Object.entries(values).map(([prop, value]) => ({
        prop: decl.prop.startsWith('-webkit-') ? '-webkit-' + prop : prop,
        value: inactive ? value : linkValue(value, role),
        changed: !inactive && linkValue(value, role) !== value,
      }));
      const changed = fields.some((field) => field.changed);
      records.push({ decl, keys, fields, changed });
      if (changed)
        for (const field of fields) for (const key of keys) projected.add(key + '|' + field.prop);
    }
  });
  for (const { decl, keys, fields, changed, opaque } of records) {
    if (opaque) {
      const prefix = decl.prop.startsWith('-webkit-') ? '-webkit-' : '';
      if (
        keys.some((key) =>
          ['duration', 'delay', 'timing-function'].some((field) =>
            projected.has(key + '|' + prefix + opaque + '-' + field),
          ),
        )
      )
        throw Error('Opaque native timing shares a projected selector: ' + decl.parent.selector);
    } else {
      for (const field of fields)
        if (changed || keys.some((key) => projected.has(key + '|' + field.prop)))
          decl.cloneBefore({ prop: field.prop, value: field.value });
    }
    decl.remove();
  }
  tree.walkRules((rule) => {
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
  const provenance = JSON.parse(fs.readFileSync('config/native-motion-provenance.json', 'utf8'));
  if (inputs.length !== provenance.inputs.length)
    throw Error('Native CSS input inventory mismatch');
  const sources = inputs.map((file, index) => {
    const source = fs.readFileSync(file);
    if (
      crypto.createHash('sha256').update(source).digest('hex') !== provenance.inputs[index].sha256
    )
      throw Error('Update audited native CSS provenance before regenerating: ' + file);
    return source.toString('utf8');
  });
  const result =
    '/* Native Webflow motion bindings; audited inputs: config/native-motion-provenance.json.\n * Only timing/easing needing a profile link or cascade guard are projected.\n * Designer retains layout and state ownership. Regenerate after native timing changes.\n */\n' +
    project(sources.join('\n')) +
    '\n';
  fs.writeFileSync('src/styles/tdb-native-motion.css', result);
}
module.exports = { project, shorthand };
