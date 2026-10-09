// First in the footer bundle: capture before VIP focus/inert state or any
// subsequent footer initializer changes markup, styles or visibility.
const TDBFooterInitialScrollY = Math.max(window.scrollY ?? document.documentElement.scrollTop ?? 0, 0);
