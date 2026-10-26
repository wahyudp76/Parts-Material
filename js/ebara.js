/* Tab Pompa EBARA FSA: model 3D rakit + exploded view, part clickable,
   material brosur FS513CT-R0E + kode internal spreadsheet Sheet2.
   UI mengikuti template tab Bauer (panel kiri, stage ctl melayang, panel kanan 3 tab). */
(function () {
  const D = window.EBARA;
  const P = {};
  let renderer, scene, cam, ctl, machine, ray, mouse;
  let exploded = 0, expTarget = 0, sealMode = 'mech', labelsOn = false, sel = null, inited = false, toastT = null;

  const COL = {
    iron: 0x2a7f6f, ironD: 0x1f5f54, bronze: 0xb07830, ss: 0xc8ccd0, steel: 0x6f7680,
    dark: 0x2b3138, black: 0x1a1d21, rubber: 0x23262a, brass: 0xc9a83c, ceramic: 0xe8e4da,
    carbon: 0x33363a, blue: 0x2456a0, orange: 0xd4562a, base: 0x3a3f45, guard: 0xe0b020
  };
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .45 });
  const CYL = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || 20);
  const BOX = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const TOR = (r, t) => new THREE.TorusGeometry(r, t, 10, 28);
  const RX = g => ({ g, r: 'x' });
  const RY = g => ({ g, r: 'y' });

  function add(pid, spec, mat, x, y, z) {
    const geo = spec.g || spec;
    const m = new THREE.Mesh(geo, mat);
    if (spec.r === 'x') m.rotation.z = Math.PI / 2;
    if (spec.r === 'y') m.rotation.y = Math.PI / 2;
    m.position.set(x, y, z);
    m.userData.pid = pid; P[pid].grp.add(m); P[pid].meshes.push(m); return m;
  }

  function build() {
    D.parts.forEach(d => { P[d.id] = { grp: new THREE.Group(), dx: d.dx || 0, dy: d.dy || 0, def: d, meshes: [] }; machine.add(P[d.id].grp); });

    add('base', BOX(4.5, .1, 1.15), M(COL.base), .15, .05, 0);
    add('base', BOX(4.5, .14, .09), M(COL.base), .15, .16, .48);
    add('base', BOX(4.5, .14, .09), M(COL.base), .15, .16, -.48);

    add('casing', RY(CYL(.62, .62, .5, 32)), M(COL.iron), -1.05, 1.0, 0);
    add('casing', RY(TOR(.5, .15)), M(COL.iron), -1.05, 1.0, 0);
    add('casing', RX(CYL(.3, .35, .45, 24)), M(COL.iron), -1.5, 1.0, 0);
    add('casing', RX(CYL(.44, .44, .07, 28)), M(COL.ironD), -1.74, 1.0, 0);
    add('casing', CYL(.26, .26, .55, 20), M(COL.iron), -1.05, 1.62, 0);
    add('casing', CYL(.37, .37, .07, 24), M(COL.ironD), -1.05, 1.92, 0);
    [-.38, .38].forEach(z => add('casing', BOX(.16, .8, .5), M(COL.ironD), -1.05, .55, z));

    add('ring', RY(TOR(.4, .05)), M(COL.bronze), -.84, 1.0, 0);
    add('ring', RY(TOR(.34, .05)), M(COL.bronze), -1.26, 1.0, 0);

    add('imp', RY(CYL(.37, .37, .05, 28)), M(COL.bronze), -.95, 1.0, 0);
    add('imp', RY(CYL(.34, .2, .05, 28)), M(COL.bronze), -1.17, 1.0, 0);
    add('imp', RX(CYL(.13, .13, .34, 16)), M(COL.bronze), -1.05, 1.0, 0);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, v = add('imp', BOX(.16, .2, .04), M(COL.bronze), -1.06, 1.0 + Math.cos(a) * .24, Math.sin(a) * .24);
      v.rotation.x = a; v.rotation.y = .5;
    }
    add('nut', RX(CYL(.07, .07, .14, 6)), M(COL.ss), -1.36, 1.0, 0);
    add('wash', RX(CYL(.11, .11, .03, 16)), M(COL.brass), -1.28, 1.0, 0);

    add('cover', RY(CYL(.58, .58, .14, 32)), M(COL.iron), -.72, 1.0, 0);
    add('cover', RX(CYL(.21, .21, .22, 20)), M(COL.iron), -.58, 1.0, 0);
    add('oring', RY(TOR(.5, .026)), M(COL.rubber), -.8, 1.0, 0);

    add('seal', RX(CYL(.17, .17, .1, 20)), M(COL.rubber), -.56, 1.0, 0);
    add('seal', RX(CYL(.15, .15, .05, 20)), M(COL.ceramic), -.49, 1.0, 0);
    add('seal', RX(CYL(.13, .13, .06, 20)), M(COL.carbon), -.44, 1.0, 0);
    add('seal', RY(TOR(.12, .014)), M(COL.ss), -.52, 1.0, 0);
    add('seal', RX(CYL(.1, .1, .04, 16)), M(COL.ss), -.6, 1.0, 0);

    add('gland', RX(CYL(.2, .25, .1, 20)), M(COL.bronze), -.62, 1.0, 0);
    add('lantern', RY(TOR(.16, .03)), M(COL.bronze), -.55, 1.0, 0);
    [-.66, -.6, -.54, -.48].forEach(x => add('packing', RY(TOR(.15, .028)), M(COL.black), x, 1.0, 0));
    [.27, -.27].forEach(z => add('gbolt', RX(CYL(.02, .02, .34, 8)), M(COL.brass), -.6, 1.0, z));

    add('shaft', RX(CYL(.06, .06, 2.2, 16)), M(COL.ss), -.25, 1.0, 0);
    add('shaft', RX(CYL(.075, .075, .35, 16)), M(COL.ss), -.95, 1.0, 0);
    add('key1', BOX(.13, .035, .05), M(COL.ss), -1.05, 1.07, 0);
    add('key2', BOX(.15, .035, .05), M(COL.ss), .86, 1.07, 0);
    add('defl', RY(TOR(.09, .026)), M(COL.rubber), .02, 1.0, 0);

    add('hous', RX(CYL(.2, .2, .82, 24)), M(COL.steel), .3, 1.0, 0);
    add('hous', RX(CYL(.24, .24, .1, 24)), M(COL.steel), -.08, 1.0, 0);
    add('plug', CYL(.03, .03, .09, 10), M(COL.dark), .3, 1.23, 0);
    add('bear', RY(TOR(.11, .05)), M(COL.ss), .1, 1.0, 0);
    add('bear', RY(TOR(.11, .05)), M(COL.ss), .5, 1.0, 0);
    add('bcov', RY(CYL(.23, .23, .09, 24)), M(COL.steel), .73, 1.0, 0);
    add('supp', BOX(.32, .8, .42), M(COL.dark), .3, .55, 0);
    add('supp', BOX(.55, .1, .6), M(COL.dark), .3, .17, 0);

    add('coup', RX(CYL(.14, .14, .17, 20)), M(COL.steel), .92, 1.0, 0);
    add('coup', RX(CYL(.14, .14, .17, 20)), M(COL.steel), 1.12, 1.0, 0);
    add('coup', RY(TOR(.1, .05)), M(COL.orange), 1.02, 1.0, 0);
    add('guard', BOX(.6, .44, .46), new THREE.MeshStandardMaterial({ color: COL.guard, transparent: true, opacity: .22, roughness: .6, metalness: .2 }), 1.02, 1.06, 0);
    add('motor', RX(CYL(.28, .28, .78, 26)), M(COL.blue), 1.62, 1.0, 0);
    add('motor', RX(CYL(.26, .28, .14, 26)), M(COL.dark), 2.06, 1.0, 0);
    add('motor', BOX(.24, .18, .26), M(COL.dark), 1.62, 1.34, 0);
    add('motor', BOX(.62, .62, .46), M(COL.blue), 1.62, .45, 0);
    add('motor', RX(CYL(.05, .05, .25, 12)), M(COL.ss), 1.18, 1.0, 0);
  }

  function label(txt) {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 48;
    const g = cv.getContext('2d');
    g.fillStyle = '#000000b8';
    if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 84, 36, 10); g.fill(); } else g.fillRect(6, 6, 84, 36);
    g.strokeStyle = '#ff6a2b'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffb020'; g.font = 'bold 26px Segoe UI'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 48, 25);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
    sp.scale.set(.42, .21, 1); sp.visible = false; return sp;
  }

  const $ = id => document.getElementById(id);
  function toast(html) {
    const t = $('ebToast'); t.innerHTML = html; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  function init() {
    if (inited) return; inited = true;
    const cv = $('ebCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe9f2);
    scene.fog = new THREE.Fog(0xdfe9f2, 26, 60);
    cam = new THREE.PerspectiveCamera(45, 2, .05, 200);
    cam.position.set(3.4, 2.5, 4.2);
    ctl = new THREE.OrbitControls(cam, cv);
    ctl.target.set(.1, 1.0, 0); ctl.enableDamping = true; ctl.dampingFactor = .08;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x77808c, .95));
    const dl = new THREE.DirectionalLight(0xfff1dc, .95); dl.position.set(7, 12, 5); dl.castShadow = true;
    dl.shadow.mapSize.set(1024, 1024);
    Object.assign(dl.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 });
    scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x9db8d2, .35); dl2.position.set(-5, 3, -4); scene.add(dl2);
    const gnd = new THREE.Mesh(new THREE.CircleGeometry(34, 48), new THREE.MeshStandardMaterial({ color: 0x8f7350, roughness: 1 }));
    gnd.rotation.x = -Math.PI / 2; gnd.receiveShadow = true; scene.add(gnd);
    const grid = new THREE.GridHelper(30, 30, 0x7a6244, 0x6d573c);
    grid.position.y = .01; grid.material.transparent = true; grid.material.opacity = .35; scene.add(grid);
    machine = new THREE.Group(); scene.add(machine);
    build();
    D.parts.forEach((d, i) => {
      const t = d.fig !== '—' ? d.fig : d.id.toUpperCase().slice(0, 4);
      const sp = label(t); P[d.id].grp.add(sp); sp.position.set(0, .45 + (i % 4) * .3, 0); P[d.id].lab = sp;
    });
    machine.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    ray = new THREE.Raycaster(); mouse = new THREE.Vector2();
    let down = null;
    cv.addEventListener('pointerdown', e => down = [e.clientX, e.clientY]);
    cv.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, cam);
      const hits = ray.intersectObjects(machine.children, true).filter(h => h.object.userData.pid && h.object.visible);
      select(hits.length ? hits[0].object.userData.pid : null);
    });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, cam);
      const hits = ray.intersectObjects(machine.children, true).filter(h => h.object.userData.pid && h.object.visible);
      const tip = $('ebTip');
      if (hits.length) {
        const d = P[hits[0].object.userData.pid].def;
        tip.textContent = d.fig + ' · ' + d.ind;
        tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top + 10) + 'px';
        tip.classList.remove('hidden'); cv.style.cursor = 'pointer';
      } else { tip.classList.add('hidden'); cv.style.cursor = 'grab'; }
    });
    resize(); window.addEventListener('resize', resize);
    (function loop() {
      requestAnimationFrame(loop);
      exploded += (expTarget - exploded) * .08;
      D.parts.forEach(d => {
        const p = P[d.id];
        p.grp.position.set(p.dx * exploded, p.dy * exploded, 0);
        p.grp.visible = !d.seal || d.seal === sealMode;
        if (p.lab) p.lab.visible = labelsOn && exploded > .55 && p.grp.visible;
      });
      ctl.update(); renderer.render(scene, cam);
    })();
  }

  function resize() {
    const st = $('ebStage'); if (!st || !renderer) return;
    const w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }

  /* ---------- UI ---------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const chip = c => `<span class="code ok">${c}</span>`;

  function select(id) {
    sel = id;
    Object.values(P).forEach(p => p.meshes.forEach(m => m.material.emissive && m.material.emissive.setHex(0)));
    document.querySelectorAll('#ebGroups li[data-id]').forEach(li => li.classList.toggle('on', li.dataset.id === id));
    const cr = $('ebCrumb');
    if (id) {
      P[id].meshes.forEach(m => m.material.emissive && m.material.emissive.setHex(0x7a2c0d));
      const d = P[id].def;
      cr.innerHTML = `Part terpilih: <b>${d.fig} · ${esc(d.ind)}</b>`; cr.classList.remove('hidden');
    } else cr.classList.add('hidden');
    showTab('det'); renderDetail(id);
  }

  function showTab(t) {
    document.querySelectorAll('#ebRight .tab').forEach(b => b.classList.toggle('active', b.dataset.t === t));
    $('ebDet').classList.toggle('hidden', t !== 'det');
    $('ebList').classList.toggle('hidden', t !== 'list');
    $('ebInfo').classList.toggle('hidden', t !== 'info');
  }

  function renderDetail(id) {
    const box = $('ebDet');
    if (!id) {
      box.innerHTML = `<div class="empty"><p>🖱 <b>Klik salah satu part</b> pada model 3D (atau daftar di kiri) untuk melihat material brosur beserta kode material internalnya.</p><p class="muted">Scroll = zoom • drag = putar • klik kanan drag = geser.</p></div>`;
      return;
    }
    const d = P[id].def, g = D.groups.find(x => x.id === d.g) || {};
    let h = `<div class="sec-head"><span class="sw" style="background:${d.seal === 'gland' ? '#8a6d2f' : '#2a7f6f'}"></span>
      <div><h3>${d.fig !== '—' ? d.fig + ' · ' : ''}${esc(d.ind)}</h3><small>${esc(d.en)} · grup ${esc(g.ind || '')}</small></div></div>`;
    h += `<div class="drow"><b>Material brosur</b><span>${esc(d.mat)}</span></div>`;
    h += `<div class="drow"><b>Qty per unit</b><span>${d.qty}</span></div>`;
    h += d.code
      ? `<div class="drow"><b>Kode internal</b><span>${chip(d.code)}<span class="ct">${esc(d.ctext)}</span></span></div>`
      : `<div class="drow"><b>Kode internal</b><span class="muted">— tidak ada padanan langsung di Sheet2</span></div>`;
    if (d.cands && d.cands.length) {
      h += `<p class="subh">Kandidat terdekat di spreadsheet</p><ul class="cands">` +
        d.cands.map(c => `<li>${chip(c[0])}<span class="ct">${esc(c[1])}</span></li>`).join('') + `</ul>`;
    }
    if (d.subs) {
      h += `<p class="subh">Komponen ${d.fig} (sectional view brosur)</p>
        <table class="parts"><tr><th>No</th><th>Part</th><th>Material</th><th>Qty</th></tr>` +
        d.subs.map(s => `<tr><td>${s[0]}</td><td>${esc(s[1])}</td><td>${esc(s[2])}</td><td>${s[3]}</td></tr>`).join('') + `</table>`;
    }
    h += `<p class="notebox">${esc(D.meta.note)}<br>Sumber: ${esc(D.meta.doc)}.</p>`;
    box.innerHTML = h;
  }

  function renderList(filter) {
    const f = (filter || '').toLowerCase();
    const rows = D.parts.filter(d => !f || (d.fig + d.ind + d.en + d.mat + (d.code || '')).toLowerCase().includes(f));
    $('ebList').innerHTML = `<div class="allbar"><input id="ebFilter" type="search" placeholder="Filter nama / material / kode…" value="${esc(filter || '')}"></div>
      <table class="parts"><tr><th>Fig</th><th>Part</th><th>Material brosur</th><th>Qty</th><th>Kode internal</th></tr>
      ${rows.map(d => `<tr class="vrow" data-id="${d.id}"><td>${d.fig}</td><td>${esc(d.ind)}</td><td>${esc(d.mat)}</td><td>${d.qty}</td>
        <td>${d.code ? chip(d.code) : '<span class="code no">—</span>'}</td></tr>`).join('')}</table>
      <p class="notebox">Klik baris untuk menyorot part pada model 3D. Kode hijau = padanan langsung di Sheet2.</p>`;
    $('ebFilter').oninput = e => renderList(e.target.value);
    $('ebFilter').focus();
    document.querySelectorAll('#ebList tr[data-id]').forEach(tr => tr.onclick = () => select(tr.dataset.id));
  }

  function renderInfo() {
    const mt = D.parts.filter(d => d.code);
    $('ebInfo').innerHTML = `
      <div class="sec-head"><span class="sw" style="background:#2a7f6f"></span>
        <div><h3>Pencocokan material ↔ spreadsheet</h3><small>${mt.length} dari ${D.parts.length} part punya padanan langsung di Sheet2</small></div></div>
      <table class="parts"><tr><th>Fig</th><th>Part</th><th>Material</th><th>Kode internal</th></tr>
      ${mt.map(d => `<tr class="vrow" data-id="${d.id}"><td>${d.fig}</td><td>${esc(d.ind)}</td><td>${esc(d.mat.split('(')[0])}</td><td>${chip(d.code)}</td></tr>`).join('')}</table>
      <p class="subh">Part tanpa padanan langsung</p>
      <p class="notebox">${D.parts.filter(d => !d.code).map(d => d.fig + ' ' + d.ind).join(' · ')}.<br>
      Untuk part ini situs menampilkan <b>kandidat terdekat</b> (tipe/material setara) dari Sheet2, atau tanda "—" bila benar-benar tidak ada.</p>
      <p class="notebox">Sumber material: ${esc(D.meta.doc)}. Sumber kode: spreadsheet Sheet2 (kolom Material & Long Text).</p>`;
    document.querySelectorAll('#ebInfo tr[data-id]').forEach(tr => tr.onclick = () => select(tr.dataset.id));
  }

  function renderLeft() {
    $('ebGroups').innerHTML = D.groups.map(g => {
      const its = D.parts.filter(p => p.g === g.id);
      return `<li class="gh">${esc(g.ind)}<small>${esc(g.en)}</small></li>` + its.map(d =>
        `<li data-id="${d.id}"><span class="sw" style="background:${d.seal === 'gland' ? '#8a6d2f' : d.code ? '#2a7f6f' : '#5b6773'}"></span>
         <span class="nm">${d.fig} · ${esc(d.ind)}<small>${esc(d.mat.split('(')[0].split(';')[0])}</small></span></li>`).join('');
    }).join('');
    document.querySelectorAll('#ebGroups li[data-id]').forEach(li => li.onclick = () => select(li.dataset.id));
  }

  function setSeal(m) {
    sealMode = m;
    document.querySelectorAll('#ebSealPills button').forEach(b => b.classList.toggle('on', b.dataset.seal === m));
    toast(`Perapat poros: <b>${m === 'mech' ? 'Mechanical Seal (standar)' : 'Gland Packing (opsional)'}</b>`);
  }

  window.EB = {
    init, resize, select,
    explode: v => { expTarget = v ? 1 : 0; },
    labels: v => { labelsOn = !!v; },
    seal: setSeal,
    zoom: f => { cam.position.sub(ctl.target).multiplyScalar(f).add(ctl.target); },
    reset: () => { cam.position.set(3.4, 2.5, 4.2); ctl.target.set(.1, 1.0, 0); ctl.autoRotate = false; },
    state: () => ({ exploded: expTarget, seal: sealMode, sel, labels: labelsOn })
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderLeft(); renderInfo();
    $('ebZin').onclick = () => window.EB.zoom(.82);
    $('ebZout').onclick = () => window.EB.zoom(1.22);
    $('ebHome').onclick = () => window.EB.reset();
    $('ebSpin').onclick = e => { ctl.autoRotate = !ctl.autoRotate; ctl.autoRotateSpeed = 1.2; e.target.classList.toggle('on', ctl.autoRotate); };
    $('ebExplode').onclick = e => {
      const on = !e.target.classList.contains('on');
      e.target.classList.toggle('on', on); e.target.classList.toggle('off', !on);
      window.EB.explode(on);
      toast(on ? 'Exploded view <b>ON</b> — part melandai sepanjang poros (BPO)' : 'Exploded view <b>OFF</b> — pompa terakit');
    };
    $('ebLabels').onclick = e => {
      labelsOn = !labelsOn;
      e.target.classList.toggle('on', labelsOn); e.target.classList.toggle('off', !labelsOn);
      if (labelsOn && expTarget < .5) toast('Label fig muncul saat <b>exploded view ON</b>');
    };
    document.querySelectorAll('#ebSealPills button').forEach(b => b.onclick = () => setSeal(b.dataset.seal));
    document.querySelectorAll('#ebRight .tab').forEach(b => b.onclick = () => { showTab(b.dataset.t); if (b.dataset.t === 'list') renderList(''); if (b.dataset.t === 'info') renderInfo(); });
    $('ebCsv').onclick = () => {
      const rows = [['FIG', 'PART', 'MATERIAL BROSUR', 'QTY', 'KODE INTERNAL', 'DESKRIPSI KODE'],
        ...D.parts.map(d => [d.fig, d.ind, d.mat, d.qty, d.code || '', d.ctext || ''])];
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'ebara_fsa_material.csv'; a.click();
    };
  });
})();
