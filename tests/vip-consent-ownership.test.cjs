/* Exercise both controllers together: the top dialog owns focus and input. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require(process.env.TDB_JSDOM || 'jsdom');
const read = file => fs.readFileSync(file, 'utf8');

for (const width of [390, 1440]) for (const legacy of [false, true]) {
  test(`consent owns focus/input over VIP at ${width}px (${legacy ? 'class fallback' : 'state API'})`, async () => {
    const dom = new JSDOM(`<a id="join" href="#VIP">Join</a><main id="background">Content</main>
      <div id="tdb-vip-drawer" data-tdb-vip-native="1">
        <a class="tdb-vip-drawer-handle"><span class="tdb-vip-drawer-label">VIP</span></a>
        <div class="tdb-vip-drawer-body"><input id="vip-name" aria-label="Name"></div>
      </div>${read('src/consent/banner.html')}`, {
      url:'https://dentalbarns.webflow.io/', runScripts:'outside-only', pretendToBeVisual:true,
    });
    const w = dom.window, timers = new Map();
    let now = 0, id = 0;
    w.setTimeout = (fn, delay=0) => {timers.set(++id,{fn,time:now+delay});return id;};
    w.clearTimeout = key => timers.delete(key);
    w.requestAnimationFrame = fn => w.setTimeout(fn,16);
    w.cancelAnimationFrame = w.clearTimeout;
    w.scrollTo = () => {};
    w.HTMLElement.prototype.scrollTo = () => {};
    w.lenis = {start(){},stop(){},resize(){}};
    w.matchMedia = query => ({matches:query.includes('max-width') ? width<=767 : query.includes('min-width') && width>=768,addEventListener(){}});
    Object.defineProperty(w,'innerWidth',{value:width});
    w.HTMLElement.prototype.getClientRects = () => [{width:100,height:40}];
    w.Element.prototype.getAnimations = () => [];
    w.Element.prototype.animate = () => ({cancel(){},finished:Promise.resolve()});
    const tick = async ms => {
      const end = now+ms;
      for (;;) {
        const next=[...timers].filter(([,t])=>t.time<=end).sort((a,b)=>a[1].time-b[1].time)[0];
        if(!next)break;
        now=next[1].time;timers.delete(next[0]);next[1].fn();await Promise.resolve();
      }
      now=end;await Promise.resolve();
    };
    try {
      w.document.cookie='CookieScriptConsent='+encodeURIComponent(JSON.stringify({action:'reject',categories:['strict']}))+'; Path=/';
      w.eval(read('dist/tdb-consent-startup.min.js'));
      w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
      w.eval(read('src/vip-drawer/vip-focus.js'));
      w.eval(read('dist/tdb-vip-drawer.js'));
      if(legacy)delete w.CookieScript.instance.isOpen;
      w.document.getElementById('join').click();await tick(40);
      assert.equal(w.TDBVIPDrawer.status().state,2);
      const name=w.document.getElementById('vip-name');name.focus();
      w.CookieScript.instance.show();await tick(45);
      const consent=w.document.getElementById('tdb-consent-root');
      assert(consent.contains(w.document.activeElement),'VIP must not reclaim consent focus');
      const reject=w.document.getElementById('cookiescript_reject');reject.focus();
      reject.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
      assert.equal(w.document.activeElement.id,'cookiescript_accept','consent retains its own Tab cycle');
      reject.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      assert.equal(w.TDBVIPDrawer.status().state,2,'Escape must not close the underlying VIP');
      reject.click();
      assert.equal(w.TDBVIPDrawer.status().state,2,'consent click must not become VIP outside-click');
      await tick(469);
      w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      assert.equal(w.TDBVIPDrawer.status().state,2,'closing consent still owns Escape');
      await tick(1);
      assert.equal(w.document.activeElement,name,'consent returns focus to the VIP field');
      w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
      assert.equal(w.TDBVIPDrawer.status().state,3,'VIP Escape resumes after consent has closed');
    } finally {dom.window.close();}
  });
}
