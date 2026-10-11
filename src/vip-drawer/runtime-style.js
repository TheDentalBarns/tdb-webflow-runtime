/* Install this consumer's state CSS before its controls can run. */
(()=>{if(document.querySelector('style[data-tdb-vip-shell-integration]'))return;const style=document.createElement('style');style.setAttribute('data-tdb-vip-shell-integration','');style.textContent=__TDB_VIP_RUNTIME_CSS__;document.head.append(style);})();
