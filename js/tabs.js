/* Pindah tab Bauer <-> Ebara */
(function () {
  function show(which) {
    const b = which === 'bauer';
    document.getElementById('tabBauer').classList.toggle('on', b);
    document.getElementById('tabEbara').classList.toggle('on', !b);
    document.getElementById('viewBauer').style.display = b ? 'flex' : 'none';
    document.getElementById('viewEbara').classList.toggle('hidden', b);
    document.getElementById('topbar').style.display = b ? 'flex' : 'none';
    if (!b) { window.EB.init(); requestAnimationFrame(() => window.EB.resize()); }
    else window.dispatchEvent(new Event('resize'));
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tabBauer').onclick = () => show('bauer');
    document.getElementById('tabEbara').onclick = () => show('ebara');
  });
})();
