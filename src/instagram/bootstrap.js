/* TDB Instagram staging bootstrap v0.5.2. Pin @RELEASE@ after committing. */
(() => {
  if (location.hostname !== 'dentalbarns.webflow.io') return;
  const widgets = ['d03f7f34-0953-4575-946c-bca5b6a21bed','9abfdbc1-5cc2-4de0-bf56-1093d967c2be','35374f05-af95-4b8c-9480-e091c19319c8','3cbfb5f1-fbeb-4c0c-b53c-6a91daa4aa04'];
  const mounts = [];
  widgets.forEach(id => document.querySelectorAll('.elfsight-app-' + id).forEach(node => {
    node.classList.remove('elfsight-app-' + id);
    node.removeAttribute('data-elfsight-app-lazy');
    node.dataset.tdbIgWidget = id;
    node.setAttribute('aria-busy', 'true');
    const status = document.createElement('span');
    status.className = 'tdb-ig-loading';
    status.textContent = 'From our Instagram';
    node.replaceChildren(status);
    mounts.push(node);
  }));
  if (!mounts.length) return;
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/gh/TheDentalBarns/tdb-webflow-runtime@@RELEASE@/dist/tdb-instagram-feed.js';
  script.dataset.tdbInstagramJs = '0.5.2';
  script.onerror = () => mounts.forEach(node => {
    node.removeAttribute('aria-busy');
    const link = document.createElement('a');
    link.href = 'https://www.instagram.com/thedentalbarns/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View our Instagram';
    node.replaceChildren(link);
  });
  document.head.append(script);
})();
