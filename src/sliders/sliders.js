/* TDB legacy sliders facade v1.0.0. Feature implementations live in plugins. */
(() => {
'use strict';
if(window.TDBSliders)return;
window.TDBSliders=Object.freeze({version:'1.0.0',
 refresh:()=>window.TDBSliderLoader?.load(),
 activate:root=>window.TDBSwiper?.mount('parallax',root)
});
})();
