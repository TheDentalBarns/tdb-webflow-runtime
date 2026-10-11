/* Install this consumer's state CSS before its controls can run. */
(()=>{if(document.querySelector('style[data-tdb-native-control-css]'))return;const style=document.createElement('style');style.setAttribute('data-tdb-native-control-css','');style.textContent=__TDB_NATIVE_FOUNDATION_CSS__;document.head.append(style);})();
