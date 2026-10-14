/* All first-party feature loaders share the registry shipped with consent. */
function loadScript(src, attribute) {
  return Promise.resolve()
    .then(() => {
      if (!window.TDBModules) throw Error('Shared module registry unavailable');
      return window.TDBModules.load(src, { attribute });
    })
    .then(() => document.querySelector(`script[${attribute}]`));
}
function loadScriptWithRecovery(src, attribute) {
  return loadScript(src, attribute).catch((error) => {
    // Preserve one retry for explicit request errors, not timeouts or bad exports.
    if (!/^Dependency unavailable:/.test(error.message)) throw error;
    return new Promise((resolve) => setTimeout(resolve, 250)).then(() =>
      loadScript(src, attribute),
    );
  });
}
