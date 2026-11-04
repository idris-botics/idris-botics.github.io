// Light by default. Dark only if the visitor chose it, or has not chosen and their system is dark. Runs before first paint (no flash).
(function () {
  var t = null;
  try { t = localStorage.getItem('theme'); } catch (e) { /* storage can be blocked */ }
  if (t !== 'light' && t !== 'dark') t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  var m = document.createElement('meta'); m.name = 'theme-color'; m.content = t === 'dark' ? '#14161a' : '#f4f2ee'; document.head.appendChild(m);
})();
