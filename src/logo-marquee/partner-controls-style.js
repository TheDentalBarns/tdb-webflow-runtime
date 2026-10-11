/* Install this consumer's state CSS before its controls can run. */
(()=>{if(document.querySelector('style[data-tdb-partner-controls]'))return;const style=document.createElement('style');style.setAttribute('data-tdb-partner-controls','');style.textContent=__TDB_PARTNER_CONTROLS_CSS__;document.head.append(style);})();
