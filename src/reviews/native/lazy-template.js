/* First-open review shell. HTML is snapshotted from the native Designer master.
 * No CMS records are embedded here; the existing CMS runtime still owns content.
 * This file is requested only by an explicit drawer preparation/open request.
 */
(() => {
    'use strict';
    if (window.TDBReviewDrawerTemplate) return;
    const html = __TDB_REVIEW_DRAWER_HTML__;
    window.TDBReviewDrawerTemplate = Object.freeze({
        version: '1.0.0',
        mount(host) {
            const existing = document.querySelector('[data-tdb-reviews]');
            if (existing) return existing;
            if (!host?.isConnected) throw Error('Review drawer mount point unavailable');
            const template = document.createElement('template');
            template.innerHTML = html;
            const shell = template.content.firstElementChild;
            if (!shell?.querySelector('[data-tdb-reviews]')) throw Error('Review drawer template invalid');
            shell.hidden = true;
            shell.inert = true;
            host.append(shell);
            return shell.querySelector('[data-tdb-reviews]');
        }
    });
})();
