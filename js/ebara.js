/* Tab Pompa EBARA FSA: model 3D rakit + exploded view, part clickable,
   material brosur + kode internal spreadsheet. Three.js r128 (sama dgn tab Bauer). */
(function () {
  const D = window.EBARA;
  const P = {};                      // id -> {grp, base, dx, dy, def, meshes[]}
  let renderer, scene, cam, ctl, machine, ray, mouse;
  let exploded = 0, expTarget = 0, sealMode = 'mech', sel = null, inited = false, labels = [];

  const COL = {
    iron: 0x2a7f6f, ironD: 0x1f5f54, bronze: 0xb07830, ss: 0xc8ccd0, steel: 0x6f7680,
    dark: 0x2b3138, black: 0x1a1d21, rubber: 0x23262a, brass: 0xc9a83c, ceramic: 0xe8e4da,
    carbon: 0x33363a, blue: 0x2456a0, orange: 0xd4562a, base: 0x3a3f45, guard: 0xe0b020
  };
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: .55, metalness: .45 });

  function add(pid, spec, mat, x, y, z) {
    const geo = spec.g || spec;
    const m = new THREE.Mesh(geo, mat);
    if (spec.r === 'x') m.rotation.z = Math.PI / 2;
    if (spec.r === 'y') m.rotation.y = Math.PI / 2;
    m.position.set(x, y, z);
    m.userData.pid = pid; P[pid].grp.add(m); P[pid].meshes.push(m); return m;
  }
  const CYL = (a, b, h, s) => new THREE.CylinderGeometry(a, b, h, s || 20);
  const BOX = (x, y, z) => new THREE.BoxGeometry(x, y, z);
  const TOR = (r, t) => new THREE.TorusGeometry(r, t, 10, 28);
  const RX = g => ({ g, r: 'x' });   // poros sepanjang X
  const RY = g => ({ g, r: 'y' });   // cincin melingkari poros X

  function build() {
    D.parts.forEach(d => { P[d.id] = { grp: new THREE.Group(), base: new THREE.Vector3(), dx: d.dx || 0, dy: d.dy || 0, def: d, meshes: [] }; machine.add(P[d.id].grp); });

    /* baseplate */
    add('base', BOX(4.5, .1, 1.15), M(COL.base), .15, .05, 0);
    add('base', BOX(4.5, .14, .09), M(COL.base), .15, .16, .48);
    add('base', BOX(4.5, .14, .09), M(COL.base), .15, .16, -.48);

    /* casing volute + suction axial + discharge top centreline + kaki */
    add('casing', RY(CYL(.62, .62, .5, 32)), M(COL.iron), -1.05, 1.0, 0);
    add('casing', RY(TOR(.5, .15)), M(COL.iron), -1.05, 1.0, 0);
    add('casing', RX(CYL(.3, .35, .45, 24)), M(COL.iron), -1.5, 1.0, 0);
    add('casing', RX(CYL(.44, .44, .07, 28)), M(COL.ironD), -1.74, 1.0, 0);
    add('casing', CYL(.26, .26, .55, 20), M(COL.iron), -1.05, 1.62, 0);
    add('casing', CYL(.37, .37, .07, 24), M(COL.ironD), -1.05, 1.92, 0);
    [-.38, .38].forEach(z => add('casing', BOX(.16, .8, .5), M(COL.ironD), -1.05, .55, z));

    /* wear ring bronze */
    add('ring', RY(TOR(.4, .05)), M(COL.bronze), -.84, 1.0, 0);
    add('ring', RY(TOR(.34, .05)), M(COL.bronze), -1.26, 1.0, 0);

    /* impeller tertutup: 2 shroud + 6 vane + hub */
    add('imp', RY(CYL(.37, .37, .05, 28)), M(COL.bronze), -.95, 1.0, 0);
    add('imp', RY(CYL(.34, .2, .05, 28)), M(COL.bronze), -1.17, 1.0, 0);
    add('imp', RX(CYL(.13, .13, .34, 16)), M(COL.bronze), -1.05, 1.0, 0);
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, v = add('imp', BOX(.16, .2, .04), M(COL.bronze), -1.06, 1.0 + Math.cos(a) * .24, Math.sin(a) * .24);
      v.rotation.x = a; v.rotation.y = .5;
    }
    add('nut', RX(CYL(.07, .07, .14, 6)), M(COL.ss), -1.36, 1.0, 0);
    add('wash', RX(CYL(.11, .11, .03, 16)), M(COL.brass), -1.28, 1.0, 0);

    /* tutup casing + stub ruang seal */
    add('cover', RY(CYL(.58, .58, .14, 32)), M(COL.iron), -.72, 1.0, 0);
    add('cover', RX(CYL(.21, .21, .22, 20)), M(COL.iron), -.58, 1.0, 0);
    add('oring', RY(TOR(.5, .026)), M(COL.rubber), -.8, 1.0, 0);

    /* mechanical seal (standar) */
    add('seal', RX(CYL(.17, .17, .1, 20)), M(COL.rubber), -.56, 1.0, 0);      // bellows NBR
    add('seal', RX(CYL(.15, .15, .05, 20)), M(COL.ceramic), -.49, 1.0, 0);    // matting ring ceramic
    add('seal', RX(CYL(.13, .13, .06, 20)), M(COL.carbon), -.44, 1.0, 0);     // seal ring carbon
    add('seal', RY(TOR(.12, .014)), M(COL.ss), -.52, 1.0, 0);                 // coil spring
    add('seal', RX(CYL(.1, .1, .04, 16)), M(COL.ss), -.6, 1.0, 0);            // spring holder

    /* gland packing (opsional) */
    add('gland', RX(CYL(.2, .25, .1, 20)), M(COL.bronze), -.62, 1.0, 0);
    add('lantern', RY(TOR(.16, .03)), M(COL.bronze), -.55, 1.0, 0);
    [-.66, -.6, -.54, -.48].forEach(x => add('packing', RY(TOR(.15, .028)), M(COL.black), x, 1.0, 0));
    [.27, -.27].forEach(z => add('gbolt', RX(CYL(.02, .02, .34, 8)), M(COL.brass), -.6, 1.0, z));

    /* poros + pasak + deflector */
    add('shaft', RX(CYL(.06, .06, 2.2, 16)), M(COL.ss), -.25, 1.0, 0);
    add('shaft', RX(CYL(.075, .075, .35, 16)), M(COL.ss), -.95, 1.0, 0);
    add('key1', BOX(.13, .035, .05), M(COL.ss), -1.05, 1.07, 0);
    add('key2', BOX(.15, .035, .05), M(COL.ss), .86, 1.07, 0);
    add('defl', RY(TOR(.09, .026)), M(COL.rubber), .02, 1.0, 0);

    /* frame bearing */
    add('hous', RX(CYL(.2, .2, .82, 24)), M(COL.steel), .3, 1.0, 0);
    add('hous', RX(CYL(.24, .24, .1, 24)), M(COL.steel), -.08, 1.0, 0);
    add('plug', CYL(.03, .03, .09, 10), M(COL.dark), .3, 1.23, 0);
    add('bear', RY(TOR(.11, .05)), M(COL.ss), .1, 1.0, 0);
    add('bear', RY(TOR(.11, .05)), M(COL.ss), .5, 1.0, 0);
    add('bcov', RY(CYL(.23, .23, .09, 24)), M(COL.steel), .73, 1.0, 0);
    add('supp', BOX(.32, .8, .42), M(COL.dark), .3, .55, 0);
    add('supp', BOX(.55, .1, .6), M(COL.dark), .3, .17, 0);

    /* coupling + guard + motor */
    add('coup', RX(CYL(.14, .14, .17, 20)), M(COL.steel), .92, 1.0, 0);
    add('coup', RX(CYL(.14, .14, .17, 20)), M(COL.steel), 1.12, 1.0, 0);
    add('coup', RY(TOR(.1, .05)), M(COL.orange), 1.02, 1.0, 0);
    const gd = add('guard', BOX(.6, .44, .46), new THREE.MeshStandardMaterial({ color: COL.guard, transparent: true, opacity: .22, roughness: .6, metalness: .2 }), 1.02, 1.06, 0);
    add('motor', RX(CYL(.28, .28, .78, 26)), M(COL.blue), 1.62, 1.0, 0);
    add('motor', RX(CYL(.26, .28, .14, 26)), M(COL.dark), 2.06, 1.0, 0);
    add('motor', BOX(.24, .18, .26), M(COL.dark), 1.62, 1.34, 0);
    add('motor', BOX(.62, .62, .46), M(COL.blue), 1.62, .45, 0);
    add('motor', RX(CYL(.05, .05, .25, 12)), M(COL.ss), 1.18, 1.0, 0);
  }

  function label(txt) {
    const cv = document.createElement('canvas'); cv.width = 96; cv.height = 48;
    const g = cv.getContext('2d');
    g.fillStyle = '#000000b8'; if (g.roundRect) { g.beginPath(); g.roundRect(6, 6, 84, 36, 10); g.fill(); } else g.fillRect(6, 6, 84, 36);
    g.strokeStyle = '#ff6a2b'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#ffb020'; g.font = 'bold 26px Segoe UI'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(txt, 48, 25);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false }));
    sp.scale.set(.5, .25, 1); sp.visible = false; labels.push(sp); return sp;
  }

  function init() {
    if (inited) return; inited = true;
    const cv = document.getElementById('ebCanvas');
    renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0f14);
    cam = new THREE.PerspectiveCamera(45, 2, .05, 200);
    cam.position.set(3.4, 2.5, 4.2);
    ctl = new THREE.OrbitControls(cam, cv);
    ctl.target.set(.1, 1.0, 0); ctl.enableDamping = true; ctl.dampingFactor = .08;
    scene.add(new THREE.HemisphereLight(0xbfd6e8, 0x2a2620, .85));
    const dl = new THREE.DirectionalLight(0xffffff, .8); dl.position.set(4, 6, 3); scene.add(dl);
    const dl2 = new THREE.DirectionalLight(0x88aaff, .3); dl2.position.set(-5, 3, -4); scene.add(dl2);
    const gr = new THREE.GridHelper(14, 28, 0x2a3644, 0x1a222c); scene.add(gr);
    machine = new THREE.Group(); scene.add(machine);
    build();
    D.parts.forEach((d, i) => { const t = d.fig !== '—' ? d.fig : d.id.toUpperCase().slice(0, 4);
    const sp = label(t); sp.scale.set(.42, .21, 1); P[d.id].grp.add(sp); sp.position.set(0, .45 + (i % 4) * .3, 0); P[d.id].lab = sp; });
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
      const tip = document.getElementById('ebTip');
      if (hits.length) {
        const d = P[hits[0].object.userData.pid].def;
        tip.textContent = d.fig + ' · ' + d.ind; tip.style.left = (e.clientX - r.left + 12) + 'px';
        tip.style.top = (e.clientY - r.top + 10) + 'px'; tip.classList.remove('hidden');
        cv.style.cursor = 'pointer';
      } else { tip.classList.add('hidden'); cv.style.cursor = 'grab'; }
    });
    resize(); window.addEventListener('resize', resize);
    (function loop() { requestAnimationFrame(loop);
      exploded += (expTarget - exploded) * .08;
      D.parts.forEach(d => { const p = P[d.id];
        p.grp.position.set(p.dx * exploded, p.dy * exploded, 0);
        if (p.lab) p.lab.visible = exploded > .55;
        p.grp.visible = !d.seal || d.seal === sealMode;
      });
      ctl.update(); renderer.render(scene, cam);
    })();
  }

  function resize() {
    const st = document.getElementById('ebStage'); if (!st || !renderer) return;
    const w = st.clientWidth, h = st.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }

  function select(id) {
    sel = id;
    Object.values(P).forEach(p => p.meshes.forEach(m => m.material.emissive && m.material.emissive.setHex(0)));
    document.querySelectorAll('#ebLeft li').forEach(li => li.classList.toggle('on', li.dataset.id === id));
    if (id) P[id].meshes.forEach(m => m.material.emissive && m.material.emissive.setHex(0x7a2c0d));
    renderDetail(id);
  }

  function chip(code, txt) {
    return `<span class="code ok">${code}</span> <button class="cpy" data-c="${code}" title="salin">${txt ? txt.split(';')[0] : ''}</button>`;
  }

  function renderDetail(id) {
    const box = document.getElementById('ebDet');
    document.querySelectorAll('#ebRight .rtab').forEach(b => b.classList.toggle('on', b.dataset.t === 'det'));
    document.getElementById('ebDet').classList.remove('hidden'); document.getElementById('ebList').classList.add('hidden');
    if (!id) { box.innerHTML = `<div class="empty">Klik salah satu part pada model 3D (atau daftar kiri) untuk melihat material brosur & kode internal spreadsheet.</div>`; return; }
    const d = P[id].def;
    let h = `<h3><span class="fig">${d.fig}</span> ${d.ind}</h3>
      <p class="muted en">${d.en} · grup: ${(D.groups.find(g => g.id === d.g) || {}).ind}</p>
      <div class="kv"><b>Material (brosur)</b><span>${d.mat}</span></div>
      <div class="kv"><b>Qty</b><span>${d.qty}</span></div>`;
    if (d.code) h += `<div class="kv"><b>Kode internal</b><span>${chip(d.code, d.ctext)}<small class="ct">${d.ctext}</small></span></div>`;
    else h += `<div class="kv"><b>Kode internal</b><span class="muted">— tidak ada padanan langsung di spreadsheet</span></div>`;
    if (d.cands && d.cands.length) {
      h += `<p class="subh">Kandidat terdekat di spreadsheet</p><ul class="cands">` +
        d.cands.map(c => `<li>${chip(c[0], c[1])}<small class="ct">${c[1]}</small></li>`).join('') + `</ul>`;
    }
    if (d.subs) {
      h += `<p class="subh">Komponen ${d.fig} (sectional view)</p><table class="pt"><tr><th>No</th><th>Part</th><th>Material</th><th>Qty</th></tr>` +
        d.subs.map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td><td>${s[2]}</td><td>${s[3]}</td></tr>`).join('') + `</table>`;
    }
    h += `<p class="note">${D.meta.note}</p>`;
    box.innerHTML = h;
  }

  function renderList() {
    document.querySelectorAll('#ebRight .rtab').forEach(b => b.classList.toggle('on', b.dataset.t === 'list'));
    document.getElementById('ebDet').classList.add('hidden'); document.getElementById('ebList').classList.remove('hidden');
    const rows = D.parts.map(d => `<tr data-id="${d.id}">
      <td>${d.fig}</td><td>${d.ind}<small class="muted"> ${d.en}</small></td><td>${d.mat}</td><td>${d.qty}</td>
      <td>${d.code ? `<span class="code ok">${d.code}</span>` : '<span class="code no">—</span>'}</td></tr>`).join('');
    document.getElementById('ebList').innerHTML =
      `<table class="pt full"><tr><th>Fig</th><th>Part</th><th>Material brosur</th><th>Qty</th><th>Kode internal</th></tr>${rows}</table>
       <p class="note">Kode hijau = padanan langsung di Sheet2 spreadsheet. Klik baris untuk menyorot part di model.</p>`;
    document.querySelectorAll('#ebList tr[data-id]').forEach(tr => tr.onclick = () => select(tr.dataset.id));
  }

  function renderLeft() {
    const ul = document.getElementById('ebGroups');
    ul.innerHTML = D.groups.map(g => {
      const its = D.parts.filter(p => p.g === g.id);
      return `<li class="gh">${g.ind}<small>${g.en}</small></li>` + its.map(d =>
        `<li data-id="${d.id}"><span class="sw" style="background:${d.seal === 'gland' ? '#8a6d2f' : '#2a7f6f'}"></span><span class="nm">${d.fig} · ${d.ind}</span></li>`).join('');
    }).join('');
    document.querySelectorAll('#ebGroups li[data-id]').forEach(li => li.onclick = () => select(li.dataset.id));
  }

  window.EB = {
    init, resize, select,
    explode: v => { expTarget = v ? 1 : 0; },
    seal: m => { sealMode = m; document.getElementById('ebSealLabel').textContent = m === 'mech' ? 'Mechanical Seal (standar)' : 'Gland Packing (opsional)'; },
    zoom: f => { cam.position.sub(ctl.target).multiplyScalar(f).add(ctl.target); },
    reset: () => { cam.position.set(3.4, 2.5, 4.2); ctl.target.set(.1, 1.0, 0); },
    state: () => ({ exploded: expTarget, seal: sealMode, sel })
  };

  document.addEventListener('DOMContentLoaded', () => {
    renderLeft();
    document.getElementById('ebExplode').onclick = e => {
      const on = e.target.classList.toggle('on');
      e.target.textContent = on ? '🧩 Exploded: ON' : '🧩 Exploded: OFF';
      window.EB.explode(on);
    };
    document.getElementById('ebSeal').onclick = () => window.EB.seal(sealMode === 'mech' ? 'gland' : 'mech');
    document.getElementById('ebZin').onclick = () => window.EB.zoom(.82);
    document.getElementById('ebZout').onclick = () => window.EB.zoom(1.22);
    document.getElementById('ebReset').onclick = () => window.EB.reset();
    document.querySelectorAll('#ebRight .rtab').forEach(b => b.onclick = () => b.dataset.t === 'list' ? renderList() : renderDetail(sel));
    document.getElementById('ebList').addEventListener('click', e => {
      const b = e.target.closest('.cpy'); if (!b) return;
      navigator.clipboard && navigator.clipboard.writeText(b.dataset.c);
    });
    renderDetail(null);
  });
})();
