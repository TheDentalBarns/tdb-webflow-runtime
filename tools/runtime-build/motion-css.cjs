/* Convert authored timing values to shared tokens without changing selectors,
 * properties, layout or the baseline curve. Used for the one-time migration
 * and native Designer property migration, not on each browser frame.
 */
function roleFor(selector, property = '') {
  if (/nav|drawer|vip|peek|announcement|backdrop/.test(selector + property)) return 'panel';
  if (/swiper-wrapper|parallax|track/.test(selector)) return 'travel';
  if (/fade|opacity|description|heading|loading|placeholder/.test(selector + property))
    return 'fade';
  return 'control';
}
function linkValue(value, role = 'control') {
  // Function-aware walk: do not wrap timings already supplied by the profile,
  // and never change a linear spinner/progress curve into a settling curve.
  function walk(text) {
    let result = '',
      pos = 0;
    const tokens =
      /([a-zA-Z_-][\w-]*)\(|(?<![\w-])(-?(?:\d*\.)?\d+)(ms|s)\b|(?<![\w-])(ease-in-out|ease-in|ease-out|ease)(?![\w-])/g;
    for (let m; (m = tokens.exec(text)); ) {
      result += text.slice(pos, m.index);
      if (m[1]) {
        let end = tokens.lastIndex,
          depth = 1;
        for (; end < text.length && depth; end++) {
          if (text[end] === '(') depth++;
          else if (text[end] === ')') depth--;
        }
        const entire = text.slice(m.index, end),
          inner = text.slice(tokens.lastIndex, end - 1);
        if (
          m[1] === 'url' ||
          (m[1] === 'calc' && /--tdb-(?:motion|fade|navigation|accordion)-pace/.test(inner)) ||
          (m[1] === 'var' && inner.startsWith('--tdb-motion-'))
        )
          result += entire;
        else if (m[1] === 'var') {
          const comma = inner.indexOf(',');
          result +=
            comma < 0
              ? entire
              : 'var(' + inner.slice(0, comma + 1) + walk(inner.slice(comma + 1)) + ')';
        } else if (m[1] === 'cubic-bezier' || m[1] === 'linear')
          result += `var(--tdb-motion-ease-${role},${entire})`;
        else result += m[1] + '(' + walk(inner) + ')';
        tokens.lastIndex = end;
      } else if (m[2]) {
        const milliseconds = Number(m[2]) * (m[3] === 's' ? 1000 : 1);
        // Zero and 1ms are discrete state changes, not visual movement.
        result +=
          Math.abs(milliseconds) > 1 ? `calc(${m[2]}${m[3]} * var(--tdb-motion-pace,1))` : m[0];
      } else result += `var(--tdb-motion-ease-${role},${m[4]})`;
      pos = tokens.lastIndex;
    }
    return result + text.slice(pos);
  }
  return walk(value);
}
function motionProperty(name) {
  return (
    /^(?:-webkit-)?(?:transition|animation)(?:-(?:duration|delay|timing-function))?$/.test(name) ||
    /^--tdb-.*(?:duration|delay|ease|fade-in|move-in|reveal-out|quint|quad|quart)$/.test(name)
  );
}
function linkCSS(source) {
  const css = require('postcss').parse(source);
  css.walkDecls((decl) => {
    if (motionProperty(decl.prop))
      decl.value = linkValue(decl.value, roleFor(decl.parent.selector || '', decl.prop));
  });
  return css.toString();
}
function fadeTransition(rule, value) {
  if (/navbar|tdb-nav|menu-icon|disclosure-item/.test(rule.selector)) return false;
  if (value !== undefined)
    return require('postcss')
      .list.comma(value)
      .every((v) => /^(opacity|visibility)\b/.test(v.trim()));
  const properties = rule.nodes.find((d) => d.type === 'decl' && d.prop === 'transition-property');
  if (properties)
    return properties.value.split(',').every((v) => /^(opacity|visibility)$/.test(v.trim()));
  const shorthand = rule.nodes.find((d) => d.type === 'decl' && d.prop === 'transition');
  return (
    !!shorthand &&
    require('postcss')
      .list.comma(shorthand.value)
      .every((v) => /^(opacity|visibility)\b/.test(v.trim()))
  );
}
module.exports = { linkCSS, linkValue, roleFor, motionProperty, fadeTransition };
