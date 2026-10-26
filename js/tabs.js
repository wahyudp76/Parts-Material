/* Pindah tab Bauer <-> Ebara */
(function () {
  function show(which) {
    const b = which === 'bauer', e = which === 'ebara', ir = which === 'irriland';
    document.getElementById('tabBauer').classList.toggle('on', b);
    document.getElementById('tabEbara').classList.toggle('on', e);
    document.getElementById('tabIrril').classList.toggle('on', ir);
    document.getElementById('viewBauer').style.display = b ? 'flex' : 'none';
    document.getElementById('topbar').style.display = b ? 'flex' : 'none';
    document.getElementById('viewEbara').classList.toggle('hidden', !e);
    document.getElementById('viewIrril').classList.toggle('hidden', !ir);
    if (e) { window.EB.init(); requestAnimationFrame(() => window.EB.resize()); }
    else if (ir) { window.IR.init(); requestAnimationFrame(() => window.IR.resize()); }
    else window.dispatchEvent(new Event('resize'));
  }
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('tabBauer').onclick = () => show('bauer');
    document.getElementById('tabEbara').onclick = () => show('ebara');
    document.getElementById('tabIrril').onclick = () => show('irriland');
  });
})();
