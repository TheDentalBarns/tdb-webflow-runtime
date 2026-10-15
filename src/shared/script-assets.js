/* All first-party feature loaders share the registry shipped with consent. */
function loadScript(src, attribute, recovery = false) {
  return Promise.resolve()
    .then(() => {
      if (!window.TDBModules) throw Error('Shared module registry unavailable');
      const modules = window.TDBModules;
      return (recovery && modules.loadWithRecovery ? modules.loadWithRecovery : modules.load)(src, {
        attribute,
      });
    })
    .then(() => document.querySelector(`script[${attribute}]`));
}
function loadScriptWithRecovery(src, attribute) {
  return loadScript(src, attribute, true);
}
