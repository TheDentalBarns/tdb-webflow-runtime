function updateNativeFooterDates() {
  const updated = new Date(document.lastModified);
  if (!Number.isFinite(updated.getTime())) return;
  const date = [String(updated.getDate()).padStart(2, '0'),
    String(updated.getMonth() + 1).padStart(2, '0'), updated.getFullYear()].join('/');
  document.querySelectorAll('[data-tdb-last-updated]').forEach(node => {
    if (node.textContent !== date) node.textContent = date;
  });
}
