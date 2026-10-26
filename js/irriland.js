/* Tab IRRILAND hose travel irrigator: model 3D rakit (+ posisi cart operasi/transport),
   exploded view, part clickable, material manual Silver series + kode internal Sheet2.
   UI mengikuti template tab Bauer/Ebara. */
(function () {
  const D = window.IRR;
  const P = {};
  let renderer, scene, cam, ctl, machine, cartPivot, ray, mouse;
  let exploded = 0, expTarget = 0, boom = 'op', boomAng = 0, labelsOn = false, sel = null, inited = false, toastT = null;

  const COL = {
    galv: 0xb9c2ca, galvD: 0x8d979f, black: 0x1c1f22, rubber: 0x26292c, silver: 0xd6dce1,
    dark: 0x3a4046, steel: 0x79828a, red: 0xb03028, blue: 0x2e6da4, brass: 0xc9a83c,
    hose: 0x212427, alu: 0xcfd6db, chain: 0x4a4f54
  };
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .5, metalness: .5 });
  const CYL = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || 20);
  const BOX = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const TOR = (r, t) => new THREE.TorusGeometry(r, t, 10, 28);
  const RZ = g => ({ g, r: 'z' });   // poros sepanjang Z (as drum)
  const RX = g => ({ g, r: 'x' });   // poros sepanjang X

  function add(pid, spec, mat, x, y, z) {
    const geo = spec.g || spec;
    const m = new THREE.Mesh(geo, mat);
    if (spec.r === 'z') m.rotation.x = Math.PI / 2;
    if (spec.r === 'x') m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    m.userData.pid = pid; P[pid].grp.add(m); P[pid].meshes.push(m); return m;
  }

  function build() {
    D.parts.forEach(d => {
      P[d.id] = { grp: new THREE.Group(), def: d, meshes: [] };
      (d.cart ? cartPivot : machine).add(P[d.id].grp);
    });

    /* chassis + axle + roda */
    add('chassis', BOX(3.2, .12, .9), M(COL.galvD), -.2, .5, 0);
    add('chassis', BOX(3.2, .1, .08), M(COL.galv), -.2, .62, .42);
    add('chassis', BOX(3.2, .1, .08), M(COL.galv), -.2, .62, -.42);
    add('chassis', RZ(CYL(.06, .06, 1.5, 12)), M(COL.steel), -.2, .5, 0);
    [.78, -.78].forEach(z => {
      add('wheel', RZ(CYL(.5, .5, .26, 26)), M(COL.rubber), -.2, .5, z);
      add('wheel', RZ(CYL(.3, .3, .28, 20)), M(COL.silver), -.2, .5, z);
    });
    add('turntable', CYL(.55, .55, .1, 28), M(COL.steel), -.2, .72, 0);
    add('chassis', BOX(1.5, .3, .7), M(COL.galv), -.2, .82, 0);

    /* drawbar + kaki angkur + jack */
    add('drawbar', BOX(1.15, .09, .09), M(COL.galv), -2.15, .52, .2).rotation.y = .35;
    add('drawbar', BOX(1.15, .09, .09), M(COL.galv), -2.15, .52, -.2).rotation.y = -.35;
    const eye = add('drawbar', TOR(.09, .035), M(COL.dark), -2.72, .5, 0); eye.rotation.y = Math.PI / 2;
    [.34, -.34].forEach(z => {
      add('drawbar', BOX(.07, .85, .07), M(COL.galv), -2.32, .5, z);
      add('drawbar', CYL(.17, .19, .035, 20), M(COL.galvD), -2.32, .06, z);
    });
    add('drawbar', TOR(.09, .02), M(COL.dark), -2.32, .95, .34);   // crank jack

    /* drum: flange ribbed + tube + coil PE + crown gear */
    [-.58, .58].forEach((z, i) => {
      const pid = i ? 'flangeB' : 'flangeA';
      add(pid, RZ(CYL(1.15, 1.15, .06, 40)), M(COL.galv), -.2, 1.95, z);
      for (let k = 0; k < 12; k++) {
        const a = k * Math.PI / 6;
        const rib = add(pid, BOX(.07, 1.02, .04), M(COL.silver), -.2 + Math.cos(a) * .55, 1.95 + Math.sin(a) * .55, z + (i ? .045 : -.045));
        rib.rotation.z = a - Math.PI / 2;
      }
    });
    add('drum', RZ(CYL(.35, .35, 1.1, 24)), M(COL.galv), -.2, 1.95, 0);
    add('drum', RZ(CYL(.95, .95, 1.0, 32)), M(COL.hose), -.2, 1.95, 0);
    [-.4, -.13, .13, .4].forEach(z => add('drum', TOR(.965, .022), M(COL.black), -.2, 1.95, z));
    add('crown', TOR(.82, .05), M(COL.steel), -.2, 1.95, .66);
    for (let k = 0; k < 28; k++) {
      const a = k * Math.PI / 14;
      const t = add('crown', BOX(.06, .09, .06), M(COL.steel), -.2 + Math.cos(a) * .82, 1.95 + Math.sin(a) * .82, .66);
      t.rotation.z = a - Math.PI / 2;
    }

    /* jalur air tengah: elbow, seal, packing, o-ring, lip seal, hub can */
    add('elbow', RZ(CYL(.12, .12, .35, 16)), M(COL.galv), -.2, 1.95, .78);
    add('elbow', CYL(.12, .12, 1.2, 16), M(COL.galv), -.2, 1.35, .92);
    add('elbow', CYL(.2, .2, .05, 20), M(COL.galvD), -.2, .76, .92);
    add('seal', RZ(CYL(.14, .14, .08, 18)), M(COL.dark), -.2, 1.95, .68);
    add('packing', RZ(TOR(.13, .03)), M(COL.silver), -.2, 1.95, .62);
    add('oring', RZ(TOR(.15, .025)), M(COL.black), -.2, 1.95, .56);
    add('lipseal', RZ(TOR(.17, .03)), M(COL.rubber), -.2, 1.95, .5);
    add('hubcan', RZ(CYL(.3, .3, .38, 26)), M(COL.alu), -.2, 1.95, -.74);
    add('hubcan', RZ(CYL(.33, .33, .1, 26)), M(COL.black), -.2, 1.95, -.66);

    /* shield sisi -Z */
    const shp = new THREE.Shape();
    shp.moveTo(-1.15, .78); shp.lineTo(1.15, .78); shp.lineTo(.72, 1.98); shp.lineTo(-.72, 1.98); shp.closePath();
    add('shield', new THREE.ExtrudeGeometry(shp, { depth: .05, bevelEnabled: false }), M(COL.galv), -.2, 0, -.72);

    /* drive: turbin miring, gearbox+pinion, handwheel, dog, gauge, comp, nipple, hydhose, handpump */
    const tb = add('turbine', CYL(.15, .15, .62, 20), M(COL.alu), -1.0, 1.32, .8);
    tb.rotation.z = .75;
    add('turbine', TOR(.155, .025), M(COL.red), -1.0, 1.32, .8).rotation.set(Math.PI / 2, 0, .75);
    add('turbine', RZ(CYL(.15, .15, .06, 18)), M(COL.dark), -1.2, 1.08, .8);
    add('turbine', BOX(.05, .6, .03), M(COL.black), -1.02, .85, .8).rotation.z = .25;
    add('turbine', BOX(.34, .1, .3), M(COL.galvD), -1.0, 1.02, .68);
    add('gearbox', BOX(.42, .4, .3), M(COL.dark), -.5, .95, .72);
    add('gearbox', BOX(.3, .3, .2), M(COL.dark), -.2, .8, .68);
    add('gearbox', RZ(CYL(.13, .13, .12, 16)), M(COL.steel), -.2, .66, .68);
    add('handwheel', RZ(CYL(.15, .15, .04, 20)), M(COL.red), -.75, .95, .95);
    add('handwheel', BOX(.03, .12, .03), M(COL.dark), -.75, .95, 1.03);
    add('dog', BOX(.1, .22, .06), M(COL.steel), .62, 2.62, .64);
    add('gauge', RZ(CYL(.08, .08, .04, 18)), M(COL.silver), -.95, 1.72, -.75);
    add('comp', BOX(1.3, .035, .035), M(COL.steel), .35, 1.0, .6).rotation.z = .06;
    for (let k = 0; k < 8; k++) add('nipple', CYL(.015, .015, .05, 8), M(COL.brass), -1.1 + k * .26, 1.92, -.75);
    add('hydhose', CYL(.03, .03, .9, 10), M(COL.black), .6, .8, .6).rotation.z = 1.2;
    add('handpump', BOX(.22, .3, .18), M(COL.red), -1.35, .85, .55);
    add('handpump', CYL(.02, .02, .3, 8), M(COL.dark), -1.35, 1.1, .55).rotation.z = .5;

    /* sprinkler cart (pivot): truss, roda, gun, lift, chain */
    add('cartframe', BOX(1.7, .07, .07), M(COL.galv), 2.3, 1.05, .5).rotation.z = .22;
    add('cartframe', BOX(1.7, .07, .07), M(COL.galv), 2.3, 1.05, -.5).rotation.z = .22;
    add('cartframe', BOX(.07, .07, 1.05), M(COL.galv), 1.7, .9, 0);
    add('cartframe', BOX(.07, .07, 1.05), M(COL.galv), 2.95, 1.25, 0);
    add('cartframe', BOX(.08, .8, .08), M(COL.galv), 2.55, .55, .5);
    add('cartframe', BOX(.08, .8, .08), M(COL.galv), 2.55, .55, -.5);
    [.68, -.68].forEach(z => {
      add('cartwheel', RZ(CYL(.3, .3, .18, 24)), M(COL.rubber), 2.55, .3, z);
      add('cartwheel', RZ(CYL(.17, .17, .19, 18)), M(COL.silver), 2.55, .3, z);
    });
    add('gun', CYL(.06, .06, .95, 14), M(COL.alu), 3.05, 1.55, 0).rotation.z = -.18;
    add('gun', CYL(.09, .09, .22, 14), M(COL.alu), 3.13, 2.02, 0);
    add('gun', CYL(.05, .04, .75, 12), M(COL.alu), 2.98, 2.42, 0).rotation.z = .55;
    add('gun', BOX(.3, .02, .12), M(COL.silver), 2.76, 2.75, 0).rotation.z = .55;
    add('lift', BOX(1.1, .06, .06), M(COL.steel), 1.35, .68, .38).rotation.z = .12;
    add('lift', BOX(1.1, .06, .06), M(COL.steel), 1.35, .68, -.38).rotation.z = .12;
    [[.3], [-.3]].forEach(([z]) => {
      const a = new THREE.Vector3(-.5, 3.35, z), b = new THREE.Vector3(1.9, 1.15, z * 1.8);
      const dir = b.clone().sub(a);
      const ch = add('chain', CYL(.014, .014, dir.length(), 6), M(COL.chain), 0, 0, 0);
      ch.position.copy(a.clone().add(b).multiplyScalar(.5));
      ch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    });
    /* guide fork / level wind di atas drum + selang ke cart */
    add('fork', BOX(.07, 2.7, .07), M(COL.galv), -.85, 1.95, .42).rotation.z = -.3;
    add('fork', BOX(.07, 2.7, .07), M(COL.galv), -.85, 1.95, -.42).rotation.z = -.3;
    add('fork', BOX(.55, .09, .95), M(COL.galv), -.5, 3.32, 0);
    add('fork', BOX(.06, .45, .06), M(COL.galv), -.5, 3.55, .25);
    add('fork', BOX(.06, .45, .06), M(COL.galv), -.5, 3.55, -.25);
    add('fork', BOX(.12, .1, .62), M(COL.galv), -.5, 3.78, 0);
    add('qcoupl', CYL(.05, .05, 2.5, 12), M(COL.hose), .46, 2.7, 0).rotation.z = -.77;
    add('qcoupl', CYL(.07, .07, .16, 12), M(COL.alu), 1.35, 1.75, 0).rotation.z = -1.0;
    add('qcoupl', CYL(.05, .05, 1.7, 12), M(COL.hose), 2.15, 1.9, 0).rotation.z = 1.45;
  }

  function label(txt) {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 48;
    const g = cv.getContext('2d');
    g.fillStyle = '#000000b8';
    if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 84, 36, 10); g.fill(); } else g.fillRect(6, 6, 84, 36);
    g.strokeStyle = '#37b26c'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#bfe8cf'; g.font = 'bold 24px Segoe UI'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 48, 25);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
    sp.scale.set(.42, .21, 1); sp.visible = false; return sp;
  }

  const $ = id => document.getElementById(id);
  function toast(html) {
    const t = $('irToast'); t.innerHTML = html; t.classList.remove('hidden');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.add('hidden'), 2600);
  }

  const HINGE = new THREE.Vector3(1.45, .85, 0);
  function init() {
    if (inited) return; inited = true;
    const cv = $('irCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene(); scene.background = new THREE.Color(0xdfe9f2);
    scene.fog = new THREE.Fog(0xdfe9f2, 26, 60);
    cam = new THREE.PerspectiveCamera(45, 2, .05, 300);
    cam.position.set(5.6, 3.5, 6.6);
    ctl = new THREE.OrbitControls(cam, cv);
    ctl.target.set(.3, 1.6, 0); ctl.enableDamping = true; ctl.dampingFactor = .08;
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
    cartPivot = new THREE.Group(); cartPivot.position.copy(HINGE); machine.add(cartPivot);
    build();
    D.parts.forEach((d, i) => {
      const t = d.fig !== '—' ? 'P' + d.fig : d.id.toUpperCase().slice(0, 4);
      const sp = label(t); P[d.id].grp.add(sp); sp.position.set(0, .5 + (i % 4) * .3, 0); P[d.id].lab = sp;
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
      const hits = ray.intersectObjects(machine.children, true).filter(h => h.object.userData.pid);
      select(hits.length ? hits[0].object.userData.pid : null);
    });
    cv.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, cam);
      const hits = ray.intersectObjects(machine.children, true).filter(h => h.object.userData.pid);
      const tip = $('irTip');
      if (hits.length) {
        const d = P[hits[0].object.userData.pid].def;
        tip.textContent = (d.fig !== '—' ? 'pos ' + d.fig + ' · ' : '') + d.ind;
        tip.style.left = (e.clientX - r.left + 12) + 'px'; tip.style.top = (e.clientY - r.top + 10) + 'px';
        tip.classList.remove('hidden'); cv.style.cursor = 'pointer';
      } else { tip.classList.add('hidden'); cv.style.cursor = 'grab'; }
    });
    resize(); window.addEventListener('resize', resize);
    (function loop() {
      requestAnimationFrame(loop);
      exploded += (expTarget - exploded) * .08;
      boomAng += ((boom === 'tr' ? 1.25 : 0) - boomAng) * .07;
      cartPivot.rotation.z = boomAng;
      D.parts.forEach(d => {
        const p = P[d.id];
        p.grp.position.set((d.dx || 0) * exploded, (d.dy || 0) * exploded, (d.dz || 0) * exploded);
        if (p.lab) p.lab.visible = labelsOn && exploded > .55;
      });
      ctl.update(); renderer.render(scene, cam);
    })();
  }

  function resize() {
    const st = $('irStage'); if (!st || !renderer) return;
    const w = st.clientWidth, h = st.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }

  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const chip = c => `<span class="code ok">${c}</span>`;

  function select(id) {
    sel = id;
    Object.values(P).forEach(p => p.meshes.forEach(m => m.material.emissive && m.material.emissive.setHex(0)));
    document.querySelectorAll('#irGroups li[data-id]').forEach(li => li.classList.toggle('on', li.dataset.id === id));
    const cr = $('irCrumb');
    if (id) {
      P[id].meshes.forEach(m => m.material.emissive && m.material.emissive.setHex(0x1d5c33));
      const d = P[id].def;
      cr.innerHTML = `Part terpilih: <b>${d.fig !== '—' ? 'pos ' + d.fig + ' · ' : ''}${esc(d.ind)}</b>`;
      cr.classList.remove('hidden');
    } else cr.classList.add('hidden');
    showTab('det'); renderDetail(id);
  }

  function showTab(t) {
    document.querySelectorAll('#irRight .tab').forEach(b => b.classList.toggle('active', b.dataset.t === t));
    $('irDet').classList.toggle('hidden', t !== 'det');
    $('irList').classList.toggle('hidden', t !== 'list');
    $('irInfo').classList.toggle('hidden', t !== 'info');
  }

  function renderDetail(id) {
    const box = $('irDet');
    if (!id) {
      box.innerHTML = `<div class="empty"><p>🖱 <b>Klik salah satu part</b> pada model 3D (atau daftar di kiri) untuk melihat material manual beserta kode material internalnya.</p><p class="muted">Scroll = zoom • drag = putar • klik kanan drag = geser.</p></div>`;
      return;
    }
    const d = P[id].def, g = D.groups.find(x => x.id === d.g) || {};
    let h = `<div class="sec-head"><span class="sw" style="background:${d.code ? '#37b26c' : '#5b6773'}"></span>
      <div><h3>${d.fig !== '—' ? 'pos ' + d.fig + ' · ' : ''}${esc(d.ind)}</h3><small>${esc(d.en)} · grup ${esc(g.ind || '')}</small></div></div>`;
    h += `<div class="drow"><b>Material manual</b><span>${esc(d.mat)}</span></div>`;
    h += `<div class="drow"><b>Qty per unit</b><span>${d.qty}</span></div>`;
    h += d.code
      ? `<div class="drow"><b>Kode internal</b><span>${chip(d.code)}<span class="ct">${esc(d.ctext)}</span></span></div>`
      : `<div class="drow"><b>Kode internal</b><span class="muted">— tidak ada padanan langsung di Sheet2</span></div>`;
    if (d.cands && d.cands.length) {
      h += `<p class="subh">Kandidat terdekat di spreadsheet</p><ul class="cands">` +
        d.cands.map(c => `<li>${chip(c[0])}<span class="ct">${esc(c[1])}</span></li>`).join('') + `</ul>`;
    }
    h += `<p class="notebox">${esc(D.meta.note)}<br>Sumber posisi part: ${esc(D.meta.doc)}.</p>`;
    box.innerHTML = h;
  }

  function renderList(filter) {
    const f = (filter || '').toLowerCase();
    const rows = D.parts.filter(d => !f || (d.fig + d.ind + d.en + d.mat + (d.code || '')).toLowerCase().includes(f));
    $('irList').innerHTML = `<div class="allbar"><input id="irFilter" type="search" placeholder="Filter nama / material / kode…" value="${esc(filter || '')}"></div>
      <table class="parts"><tr><th>Pos</th><th>Part</th><th>Material manual</th><th>Qty</th><th>Kode internal</th></tr>
      ${rows.map(d => `<tr class="vrow" data-id="${d.id}"><td>${d.fig}</td><td>${esc(d.ind)}</td><td>${esc(d.mat)}</td><td>${d.qty}</td>
        <td>${d.code ? chip(d.code) : '<span class="code no">—</span>'}</td></tr>`).join('')}</table>
      <p class="notebox">Klik baris untuk menyorot part pada model 3D. Kode hijau = padanan langsung di Sheet2.</p>`;
    $('irFilter').oninput = e => renderList(e.target.value);
    document.querySelectorAll('#irList tr[data-id]').forEach(tr => tr.onclick = () => select(tr.dataset.id));
  }

  function renderInfo() {
    const mt = D.parts.filter(d => d.code);
    $('irInfo').innerHTML = `
      <div class="sec-head"><span class="sw" style="background:#37b26c"></span>
        <div><h3>Pencocokan material ↔ spreadsheet</h3><small>${mt.length} dari ${D.parts.length} part punya padanan langsung di Sheet2</small></div></div>
      <table class="parts"><tr><th>Pos</th><th>Part</th><th>Kode internal</th></tr>
      ${mt.map(d => `<tr class="vrow" data-id="${d.id}"><td>${d.fig}</td><td>${esc(d.ind)}</td><td>${chip(d.code)}</td></tr>`).join('')}</table>
      <p class="notebox">Kode berawalan IRRILAND/FIG. di spreadsheet (mis. SSPA0305408, SSPA0305409, SSPA0305432, SFMS0102456, SSPA0323712, SSPA0324467) menjadi padanan utama; part lain memakai kandidat setara atau tanda "—".<br>Sumber: ${esc(D.meta.doc)} + spreadsheet Sheet2.</p>`;
    document.querySelectorAll('#irInfo tr[data-id]').forEach(tr => tr.onclick = () => select(tr.dataset.id));
  }

  function renderLeft() {
    $('irGroups').innerHTML = D.groups.map(g => {
      const its = D.parts.filter(p => p.g === g.id);
      return `<li class="gh">${esc(g.ind)}<small>${esc(g.en)}</small></li>` + its.map(d =>
        `<li data-id="${d.id}"><span class="sw" style="background:${d.code ? '#37b26c' : '#5b6773'}"></span>
         <span class="nm">${d.fig !== '—' ? 'P' + d.fig + ' · ' : ''}${esc(d.ind)}<small>${esc(d.mat.split('(')[0].split(';')[0])}</small></span></li>`).join('');
    }).join('');
    document.querySelectorAll('#irGroups li[data-id]').forEach(li => li.onclick = () => select(li.dataset.id));
  }

  window.IR = {
    init, resize, select,
    explode: v => { expTarget = v ? 1 : 0; },
    labels: v => { labelsOn = !!v; },
    boom: m => { boom = m; document.querySelectorAll('#irBoomPills button').forEach(b => b.classList.toggle('on', b.dataset.boom === m)); },
    zoom: f => { cam.position.sub(ctl.target).multiplyScalar(f).add(ctl.target); },
    reset: () => { cam.position.set(5.6, 3.5, 6.6); ctl.target.set(.3, 1.6, 0); ctl.autoRotate = false; },
    state: () => ({ exploded: expTarget, boom, sel, labels: labelsOn })
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderLeft(); renderInfo();
    $('irZin').onclick = () => window.IR.zoom(.82);
    $('irZout').onclick = () => window.IR.zoom(1.22);
    $('irHome').onclick = () => window.IR.reset();
    $('irSpin').onclick = e => { ctl.autoRotate = !ctl.autoRotate; ctl.autoRotateSpeed = 1.2; e.target.classList.toggle('on', ctl.autoRotate); };
    $('irExplode').onclick = e => {
      const on = !e.target.classList.contains('on');
      e.target.classList.toggle('on', on); e.target.classList.toggle('off', !on);
      window.IR.explode(on);
      toast(on ? 'Exploded view <b>ON</b> — part terpisah sesuai grup' : 'Exploded view <b>OFF</b> — unit terakit');
    };
    $('irLabels').onclick = e => {
      labelsOn = !labelsOn;
      e.target.classList.toggle('on', labelsOn); e.target.classList.toggle('off', !labelsOn);
      if (labelsOn && expTarget < .5) toast('Label posisi manual muncul saat <b>exploded view ON</b>');
    };
    document.querySelectorAll('#irBoomPills button').forEach(b => b.onclick = () => {
      window.IR.boom(b.dataset.boom);
      toast(b.dataset.boom === 'tr' ? 'Sprinkler cart <b>dilipat</b> (posisi transport)' : 'Sprinkler cart <b>operasi</b> (terentang)');
    });
    document.querySelectorAll('#irRight .tab').forEach(b => b.onclick = () => { showTab(b.dataset.t); if (b.dataset.t === 'list') renderList(''); if (b.dataset.t === 'info') renderInfo(); });
    $('irCsv').onclick = () => {
      const rows = [['POS', 'PART', 'MATERIAL MANUAL', 'QTY', 'KODE INTERNAL', 'DESKRIPSI KODE'],
        ...D.parts.map(d => [d.fig, d.ind, d.mat, d.qty, d.code || '', d.ctext || ''])];
      const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      a.download = 'irriland_material.csv'; a.click();
    };
  });
})();
