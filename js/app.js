/* Bauer Rainstar E — interactive 3D spare-part explorer */
(function () {
'use strict';
const $ = s => document.querySelector(s);
const P = window.PARTS;
const MODELS = P.models;
let model = 'E3';

/* ---------------- group definitions (3D <-> sections) ---------------- */
const GROUPS = [
  { gid: 'fahrgestell', secs: ['fahrgestell'],  label: 'Rangka bawah',        en: 'Undercarriage' },
  { gid: 'stuetzfuss',  secs: ['stuetzfuss'],   label: 'Kaki penyangga',      en: 'Support leg' },
  { gid: 'drehgestell', secs: ['drehgestell'],  label: 'Meja putar',          en: 'Turntable' },
  { gid: 'haspel',      secs: ['haspel'],       label: 'Drum / haspel PE',    en: 'Reel' },
  { gid: 'antrieb',     secs: ['antrieb'],      label: 'Penggerak',           en: 'Drive' },
  { gid: 'getriebe',    secs: ['getriebe'],     label: 'Gearbox G 4',         en: 'Gearbox' },
  { gid: 'turbine',     secs: ['turbine60', 'turbine20'], label: 'Turbin',    en: 'Turbine TX 20 / TX 60' },
  { gid: 'regelung',    secs: ['regelung'],     label: 'Pengatur kecepatan',  en: 'Speed control' },
  { gid: 'wickel',      secs: ['wickel'],       label: 'Penggulung',          en: 'Winding mechanism' },
  { gid: 'abstuetzung', secs: ['abstuetzung'],  label: 'Penyangga hidrolis',  en: 'Hydr. supports' },
  { gid: 'radstativ',   secs: ['radstativ'],    label: 'Kereta roda / gun',   en: 'Wheel cart' },
  { gid: 'ecostar',     secs: ['ecostar'],      label: 'Kontrol ECOSTAR',     en: 'ECOSTAR 4200' },
];
const SEC = {}; P.sections.forEach(s => SEC[s.id] = s);
const gidOfSec = sid => GROUPS.find(g => g.secs.includes(sid)).gid;

/* flat index for search / all-table */
const FLAT = [];
P.sections.forEach(s => s.entries.forEach(e => e.variants.forEach((v, vi) => {
  FLAT.push({ sid: s.id, gid: gidOfSec(s.id), fig: e.fig, de: e.de, en: e.en, v, eidx: s.entries.indexOf(e), vi });
})));

const fmtRp = n => (n == null || isNaN(n)) ? '-' :
  'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 });
const qtyOf = v => v.qty[model] != null ? v.qty[model] : (v.qty.ALL != null ? v.qty.ALL : '–');

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg) {
  const t = $('#toast');
  t.innerHTML = msg; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3200);
}

/* ---------------- top bar: model pills ---------------- */
const pills = $('#modelPills');
function applyModel(m) {
  if (model === m) return;
  model = m;
  mScaleT = MSCALE[m]; wScaleT = WSCALE[m];
  [...pills.children].forEach(c => c.classList.toggle('on', c.textContent === m));
  refreshQty(true);
  toast(`Model aktif <b>${m}</b> — skala mesin 3D & kolom qty disesuaikan (konfigurasi ${m}).`);
}
MODELS.forEach(m => {
  const b = document.createElement('button');
  b.textContent = m; b.className = m === model ? 'on' : '';
  b.title = 'Tampilkan konfigurasi & kebutuhan sparepart model ' + m;
  b.onclick = () => applyModel(m);
  pills.appendChild(b);
});

/* ---------------- left list ---------------- */
const gl = $('#groupList');
GROUPS.forEach(g => {
  const sec = SEC[g.secs[0]];
  const n = g.secs.reduce((a, id) => a + SEC[id].entries.reduce((x, e) => x + e.variants.length, 0), 0);
  const li = document.createElement('li');
  li.dataset.gid = g.gid;
  li.innerHTML = `<span class="sw" style="background:#${sec.color.toString(16).padStart(6, '0')}"></span>
    <span class="nm">${g.label}<small>${g.en}</small></span><span class="cnt">${n}</span>`;
  li.onclick = () => selectGroup(g.gid, true);
  gl.appendChild(li);
});

/* ---------------- tabs ---------------- */
document.querySelectorAll('.tab').forEach(t => t.onclick = () => {
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x === t));
  ['breakdown', 'all', 'info'].forEach(n => $('#tab-' + n).classList.toggle('hidden', n !== t.dataset.tab));
  if (t.dataset.tab === 'all') renderAll();
});

/* ================= THREE.JS SCENE ================= */
const canvas = $('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdfe9f2);
scene.fog = new THREE.Fog(0xdfe9f2, 26, 60);
const camera = new THREE.PerspectiveCamera(45, 2, 0.1, 200);
camera.position.set(8.2, 4.3, -9.8);
const controls = new THREE.OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = .08;
controls.target.set(-0.7, 1.8, 0);
controls.maxPolarAngle = Math.PI * .52; controls.minDistance = 1.2; controls.maxDistance = 40;

scene.add(new THREE.HemisphereLight(0xffffff, 0x77808c, .95));
const sun = new THREE.DirectionalLight(0xfff1dc, .95);
sun.position.set(7, 12, 5); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: 1, far: 40 });
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(34, 48),
  new THREE.MeshStandardMaterial({ color: 0x71905c, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
const grid = new THREE.GridHelper(30, 30, 0x5d7a4b, 0x64814f);
grid.position.y = .01;
grid.material.transparent = true; grid.material.opacity = .35;
scene.add(grid);

/* ---------------- material / mesh helpers ---------------- */
function mat(color, metal = .55, rough = .45) {
  return new THREE.MeshStandardMaterial({ color, metalness: metal, roughness: rough });
}
const REG = {};   // gid -> {obj, dir, mats}
function group(gid) {
  if (!REG[gid]) {
    const obj = new THREE.Group(); obj.userData.gid = gid;
    REG[gid] = { obj, mats: [], dir: new THREE.Vector3() };
    scene.add(obj);
  }
  return REG[gid];
}
function add(gid, geo, color, x = 0, y = 0, z = 0, metal, rough) {
  const g = group(gid);
  const m = mat(color, metal, rough);
  g.mats.push(m);
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData.gid = gid;
  g.obj.add(mesh);
  return mesh;
}
const BOX = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CYL = (r1, r2, h, s = 24) => new THREE.CylinderGeometry(r1, r2, h, s);
const TOR = (r, t, s = 28) => new THREE.TorusGeometry(r, t, 10, s);

const WHEELS = [];
const C = {
  galv: 0x9aa0a6, dark: 0x5b6470, orange: 0xd94f1e, orange2: 0xe06020, black: 0x232323,
  silver: 0xcfd4d9, white: 0xf2f2f2, yellow: 0xf2b705, green: 0x7fb069, blue: 0x4f7cac,
  solar: 0x1b2a4a, red: 0xc8552e, rubber: 0x1a1a1c,
};

/* ---------------- build the machine ---------------- */
function buildMachine() {
  /* -- undercarriage -- */
  add('fahrgestell', BOX(4.4, .26, .12), C.galv, 0, .75, .72);
  add('fahrgestell', BOX(4.4, .26, .12), C.galv, 0, .75, -.72);
  [-1.9, -.7, .5, 1.7].forEach(x => add('fahrgestell', BOX(.14, .22, 1.5), C.galv, x, .74, 0));
  add('fahrgestell', BOX(1.7, .12, .12), C.galv, 2.85, .62, 0);
  const eye = add('fahrgestell', TOR(.12, .045), C.dark, 3.75, .62, 0); eye.rotation.y = Math.PI / 2;
  [-0.85, 0.45].forEach(x => {
    const ax = add('fahrgestell', CYL(.07, .07, 1.9, 12), C.dark, x, .48, 0); ax.rotation.x = Math.PI / 2;
    [.88, -.88].forEach(z => {
      const w = add('fahrgestell', CYL(.48, .48, .3, 28), C.rubber, x, .48, z); w.rotation.x = Math.PI / 2; WHEELS.push(w);
      const h = add('fahrgestell', CYL(.2, .2, .32, 20), C.silver, x, .48, z); h.rotation.x = Math.PI / 2; WHEELS.push(h);
    });
  });
  /* -- support legs -- */
  [.45, -.45].forEach(z => {
    add('stuetzfuss', CYL(.05, .05, .85, 14), C.yellow, 3.15, .55, z);
    add('stuetzfuss', BOX(.3, .06, .3), C.yellow, 3.15, .06, z);
    const cr = add('stuetzfuss', TOR(.12, .02, 16), C.dark, 3.15, 1.0, z); cr.rotation.x = Math.PI / 2;
  });
  /* -- turntable -- */
  const ring = add('drehgestell', TOR(.85, .09, 36), C.dark, 0, 1.02, 0); ring.rotation.x = Math.PI / 2;
  add('drehgestell', BOX(1.9, .12, 1.55), C.dark, 0, 1.12, 0);
  [.8, -.8].forEach(z => add('drehgestell', BOX(2.0, .55, .08), C.dark, 0, 1.42, z));
  /* -- reel / haspel -- */
  [ .88, -.88].forEach(x => {
    const f = add('haspel', CYL(1.18, 1.18, .09, 40), C.orange, x, 2.35, 0); f.rotation.z = Math.PI / 2;
    add('haspel', TOR(1.18, .05, 40), C.orange, x, 2.35, 0).rotation.y = Math.PI / 2;
  });
  const core = add('haspel', CYL(.3, .3, 1.8, 24), C.silver, 0, 2.35, 0); core.rotation.z = Math.PI / 2;
  const coil = add('haspel', CYL(.98, .98, 1.62, 48), C.black, 0, 2.35, 0, .1, .95); coil.rotation.z = Math.PI / 2;
  for (let i = 0; i < 5; i++)
    add('haspel', TOR(.99, .015, 48), 0x333333, -0.65 + i * .325, 2.35, 0, .1, .95).rotation.y = Math.PI / 2;
  const pipeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.95, 2.1, 0), new THREE.Vector3(-1.7, 1.2, 0),
    new THREE.Vector3(-2.6, .32, 0), new THREE.Vector3(-3.8, .3, 0), new THREE.Vector3(-4.7, 1.0, 0)]);
  add('haspel', new THREE.TubeGeometry(pipeCurve, 60, .05, 10), C.black, 0, 0, 0, .1, .9);
  /* -- drive -- */
  add('antrieb', BOX(1.35, 1.15, .06), C.orange2, -.9, 1.95, -1.02);
  const p1 = add('antrieb', CYL(.32, .32, .12, 24), C.silver, -.65, 2.35, -1.1); p1.rotation.x = Math.PI / 2;
  const p2 = add('antrieb', CYL(.17, .17, .12, 20), C.silver, -.95, 1.62, -1.1); p2.rotation.x = Math.PI / 2;
  const belt = add('antrieb', TOR(.3, .028), C.black, -.8, 1.98, -1.1); belt.scale.set(1, 1.55, 1); belt.rotation.z = .35;
  /* -- gearbox -- */
  add('getriebe', BOX(.8, .62, .5), C.orange2, -.95, 1.42, -.95, .4, .5);
  for (let i = 0; i < 3; i++) {
    const rib = add('getriebe', CYL(.28, .28, .04, 20), C.orange, -.95, 1.42, -.72 - i * .02, .4, .5);
    rib.rotation.x = Math.PI / 2; rib.visible = i === 0;
  }
  const gsh = add('getriebe', CYL(.05, .05, .5, 12), C.silver, -.95, 1.42, -.95); gsh.rotation.x = Math.PI / 2;
  add('getriebe', CYL(.05, .05, .06, 12), C.silver, -.7, 1.2, -.68, .3, .4).rotation.x = Math.PI / 2;
  /* -- turbine -- */
  const vol = add('turbine', CYL(.36, .36, .5, 28), C.silver, -1.85, 2.3, -.95); vol.rotation.x = Math.PI / 2;
  add('turbine', TOR(.34, .1, 28), C.silver, -1.85, 2.3, -.95);
  add('turbine', CYL(.12, .12, .8, 16), C.silver, -1.85, 2.95, -.95);
  add('turbine', CYL(.2, .2, .08, 20), C.silver, -1.85, 3.35, -.95);
  const outp = add('turbine', CYL(.11, .11, .9, 16), C.silver, -1.35, 2.3, -.95); outp.rotation.z = Math.PI / 2;
  /* -- speed control -- */
  add('regelung', BOX(.07, .07, 1.7), C.green, -2.45, 1.05, 0);
  [.7, -.7].forEach(z => add('regelung', BOX(.5, .05, .05), C.green, -2.2, 1.05, z));
  add('regelung', CYL(.035, .035, .5, 10), C.green, -1.95, 1.3, .55).rotation.z = .5;
  add('regelung', BOX(.55, .42, .04), C.green, -1.35, 3.0, -.95);
  /* -- winding mechanism -- */
  add('wickel', BOX(1.15, .85, .05), C.blue, -.55, 1.95, 1.02);
  const sp1 = add('wickel', CYL(.3, .3, .07, 22), C.dark, 0, 2.35, .95); sp1.rotation.x = Math.PI / 2;
  const sp2 = add('wickel', CYL(.18, .18, .07, 18), C.dark, -.95, 1.42, .95); sp2.rotation.x = Math.PI / 2;
  const ch = add('wickel', TOR(.28, .022), C.black, -.5, 1.9, .95); ch.scale.set(1, 1.9, 1); ch.rotation.z = .42;
  /* -- hydr. supports -- */
  [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
    const a = new THREE.Vector3(sx * 1.75, .95, sz * .72), b = new THREE.Vector3(sx * .95, 1.95, sz * .6);
    const dir = b.clone().sub(a), len = dir.length();
    const o = add('abstuetzung', CYL(.07, .07, len * .55, 12), C.galv, 0, 0, 0);
    const i2 = add('abstuetzung', CYL(.045, .045, len * .6, 12), C.silver, 0, 0, 0);
    const mid = a.clone().add(b).multiplyScalar(.5);
    [o, i2].forEach((m, k) => {
      m.position.copy(mid).addScaledVector(dir.clone().normalize(), k ? .12 : -.12);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    });
  });
  /* -- wheel cart -- */
  [.42, -.42].forEach(z => add('radstativ', BOX(1.5, .12, .1), C.red, -4.7, .62, z));
  add('radstativ', BOX(.12, .12, .95), C.red, -4.0, .62, 0);
  add('radstativ', BOX(.12, .12, .95), C.red, -5.4, .62, 0);
  [-4.0, -5.4].forEach(x => [.55, -.55].forEach(z => {
    const w = add('radstativ', CYL(.35, .35, .2, 22), C.rubber, x, .35, z); w.rotation.x = Math.PI / 2;
    add('radstativ', CYL(.14, .14, .22, 14), C.silver, x, .35, z).rotation.x = Math.PI / 2;
  }));
  add('radstativ', BOX(.09, 1.0, .09), C.red, -4.7, 1.15, 0);
  add('radstativ', BOX(.3, .22, .2), C.orange2, -4.7, 1.72, 0);
  const noz = add('radstativ', CYL(.02, .06, .3, 12), C.silver, -4.7, 1.95, 0);
  /* -- ecostar -- */
  add('ecostar', BOX(.44, .58, .16), C.white, .55, 2.85, .98, .1, .6);
  add('ecostar', BOX(.3, .2, .02), 0x20262c, .55, 2.95, 1.07, .1, .4);
  add('ecostar', CYL(.015, .015, .5, 8), C.silver, .55, 3.3, .98);
  const sol = add('ecostar', BOX(.62, .05, .42), C.solar, .55, 3.55, .98, .3, .35);
  sol.rotation.z = .35;
  add('ecostar', TOR(.05, .012, 12), C.silver, .55, 3.14, .98).rotation.x = Math.PI / 2;
}
buildMachine();
const machine = new THREE.Group();
scene.add(machine);
Object.values(REG).forEach(r => machine.add(r.obj));

/* per-model visual configuration (approximation): E1 terkecil -> E5 terbesar */
const MSCALE = { E1: .84, E2: .92, E3: 1, E4: 1.08, E5: 1.16 };
const WSCALE = { E1: .90, E2: .96, E3: 1, E4: 1.06, E5: 1.12 };
let mScaleT = 1, wScaleT = 1;

/* explode directions */
const DIRS = {
  fahrgestell: [0, -1, 0], stuetzfuss: [1.5, -.2, 0], drehgestell: [0, -.35, 0], haspel: [0, 1.1, 0],
  antrieb: [0, .1, -1.5], getriebe: [-.5, -.4, -1.2], turbine: [-1.2, .6, -.7], regelung: [-1.5, .2, 0],
  wickel: [0, .1, 1.5], abstuetzung: [0, .3, 1.1], radstativ: [-1.7, 0, 0], ecostar: [.7, 1.1, .7],
};
Object.entries(DIRS).forEach(([gid, d]) => group(gid).dir.set(...d).normalize());

/* ---------------- labels ---------------- */
const labels = [];
const LOFF = {
  fahrgestell: [0, -.15, 0], stuetzfuss: [.5, -.25, 0], drehgestell: [0, -.6, .9], haspel: [0, .5, 0],
  antrieb: [0, .55, -.6], getriebe: [0, -.4, -.8], turbine: [-.7, .7, -.3], regelung: [-.7, .35, .5],
  wickel: [0, .15, .8], abstuetzung: [.4, .05, .9], radstativ: [-.3, .6, 0], ecostar: [.3, .45, .3],
};
function makeLabel(gid, text) {
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d');
  ctx.font = '600 30px Segoe UI, sans-serif';
  const w = ctx.measureText(text).width + 36;
  cv.width = w; cv.height = 52;
  const c2 = cv.getContext('2d');
  c2.fillStyle = 'rgba(10,14,20,.82)'; c2.strokeStyle = '#ff6a2b'; c2.lineWidth = 3;
  c2.beginPath(); c2.roundRect(2, 2, w - 4, 48, 12); c2.fill(); c2.stroke();
  c2.font = '600 30px Segoe UI, sans-serif'; c2.fillStyle = '#fff'; c2.textBaseline = 'middle';
  c2.fillText(text, 18, 27);
  const tex = new THREE.CanvasTexture(cv);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  sp.scale.set(w / 150, 52 / 150, 1);
  sp.renderOrder = 999;
  const g = group(gid).obj;
  const bb = new THREE.Box3().setFromObject(g);
  const off = LOFF[gid] || [0, 0, 0];
  sp.position.set((bb.min.x + bb.max.x) / 2 + off[0], bb.max.y + .35 + off[1], (bb.min.z + bb.max.z) / 2 + off[2]);
  sp.userData.base = sp.scale.clone();
  g.add(sp); labels.push(sp);
  return sp;
}
GROUPS.forEach(g => makeLabel(g.gid, g.label));
let labelsOn = true;

/* ---------------- interaction ---------------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), _v3 = new THREE.Vector3();
let hoverGid = null, selGid = null, tween = null;
const allMeshes = [];
Object.values(REG).forEach(r => r.obj.traverse(o => { if (o.isMesh) allMeshes.push(o); }));

function setEmissive(gid, hex, inten) {
  group(gid).mats.forEach(m => { m.emissive = new THREE.Color(hex); m.emissiveIntensity = inten; });
}
function pick(ev) {
  const r = canvas.getBoundingClientRect();
  ptr.x = ((ev.clientX - r.left) / r.width) * 2 - 1;
  ptr.y = -((ev.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ptr, camera);
  const hit = ray.intersectObjects(allMeshes, false)[0];
  return hit ? hit.object.userData.gid : null;
}
let downXY = null;
canvas.addEventListener('pointerdown', e => downXY = [e.clientX, e.clientY]);
canvas.addEventListener('pointerup', e => {
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
  downXY = null;
  if (moved > 6) return;
  const gid = pick(e);
  if (gid) selectGroup(gid, true);
});
canvas.addEventListener('pointermove', e => {
  const gid = pick(e);
  const tip = $('#tooltip');
  if (gid !== hoverGid) {
    if (hoverGid && hoverGid !== selGid) setEmissive(hoverGid, 0x000000, 0);
    hoverGid = gid;
    if (gid && gid !== selGid) setEmissive(gid, 0xff6a2b, .18);
    canvas.style.cursor = gid ? 'pointer' : 'grab';
  }
  if (gid) {
    const g = GROUPS.find(x => x.gid === gid);
    tip.textContent = `${g.label} — ${g.en}`;
    tip.style.left = (e.clientX - $('#stage').getBoundingClientRect().left + 14) + 'px';
    tip.style.top = (e.clientY - $('#stage').getBoundingClientRect().top + 10) + 'px';
    tip.classList.remove('hidden');
  } else tip.classList.add('hidden');
});

function focusGroup(gid) {
  const g = group(gid).obj;
  const bb = new THREE.Box3().setFromObject(g);
  const c = bb.getCenter(new THREE.Vector3());
  const rad = bb.getSize(new THREE.Vector3()).length() / 2;
  const dir = camera.position.clone().sub(controls.target).normalize();
  const to = c.clone().addScaledVector(dir, Math.max(rad * 2.4, 2.2));
  tween = { t: 0, dur: .9, fp: camera.position.clone(), tp: to, ft: controls.target.clone(), tt: c };
}
const HOME = { p: new THREE.Vector3(8.2, 4.3, -9.8), t: new THREE.Vector3(-0.7, 1.8, 0) };
function selectGroup(gid, focus) {
  if (selGid) setEmissive(selGid, 0x000000, 0);
  selGid = gid;
  setEmissive(gid, 0xff6a2b, .3);
  [...gl.children].forEach(li => li.classList.toggle('on', li.dataset.gid === gid));
  const g = GROUPS.find(x => x.gid === gid);
  $('#crumb').innerHTML = `Part terpilih: <b>${g.label}</b> · ${g.en}`;
  $('#crumb').classList.remove('hidden');
  renderBreakdown(gid);
  document.querySelectorAll('.tab').forEach(x => x.classList.toggle('active', x.dataset.tab === 'breakdown'));
  ['breakdown', 'all', 'info'].forEach(n => $('#tab-' + n).classList.toggle('hidden', n !== 'breakdown'));
  if (focus) focusGroup(gid);
}

/* ---------------- stage controls ---------------- */
$('#zIn').onclick = () => camera.position.lerp(controls.target, .18);
$('#zOut').onclick = () => camera.position.sub(controls.target).multiplyScalar(1.22).add(controls.target);
$('#zReset').onclick = () => {
  tween = { t: 0, dur: .8, fp: camera.position.clone(), tp: HOME.p.clone(), ft: controls.target.clone(), tt: HOME.t.clone() };
  if (selGid) { setEmissive(selGid, 0x000000, 0); selGid = null; }
  [...gl.children].forEach(li => li.classList.remove('on'));
  $('#crumb').classList.add('hidden');
  $('#bdContent').classList.add('hidden'); $('#bdEmpty').classList.remove('hidden');
};
$('#rot').onclick = e => { controls.autoRotate = !controls.autoRotate; controls.autoRotateSpeed = 1.1; e.currentTarget.classList.toggle('off', !controls.autoRotate); };
$('#lbl').onclick = e => { labelsOn = !labelsOn; labels.forEach(l => l.visible = labelsOn); e.currentTarget.classList.toggle('off', !labelsOn); };
$('#foto').onclick = () => $('#fotoOverlay').classList.remove('hidden');
$('#fotoClose').onclick = () => $('#fotoOverlay').classList.add('hidden');
$('#explode').oninput = e => {
  const f = e.target.value / 100 * 1.9;
  Object.entries(REG).forEach(([gid, r]) => r.obj.position.copy(r.dir.clone().multiplyScalar(f)));
};

/* ---------------- breakdown panel ---------------- */
function codeChip(m) {
  if (!m) return `<span class="code no" title="Tidak ditemukan di master material — pesan memakai Bestell-Nr. Bauer">— tanpa kode internal</span>`;
  const abc = m.abc && m.abc !== '-' ? `<span class="abc ${m.abc}">${m.abc}</span>` : '';
  return `<span class="code ok" title="${(m.text || '').replace(/"/g, '&quot;')}">${m.code}${abc}</span>`;
}
function renderBreakdown(gid) {
  const g = GROUPS.find(x => x.gid === gid);
  $('#bdEmpty').classList.add('hidden');
  const box = $('#bdContent'); box.classList.remove('hidden');
  let html = '';
  g.secs.forEach(sid => {
    const s = SEC[sid];
    html += `<div class="sec-head"><span class="sw" style="background:#${s.color.toString(16).padStart(6, '0')}"></span>
      <div><h3>${s.de} <span class="muted">/ ${s.en}</span></h3><small>${s.ind} • katalog hal. ${s.pages.join(', ')}</small></div></div>`;
    if (s.diagrams.length) {
      html += `<div class="diagrams"><span class="cap">Exploded diagram resmi (klik untuk memperbesar):</span>` +
        s.diagrams.map(d => `<img src="${d}" loading="lazy" data-zoom="${d}">`).join('') + `</div>`;
    }
    html += `<table class="parts"><thead><tr><th class="fig">Fig</th><th>Bestell-Nr.</th><th>Deskripsi</th><th>Qty<br>${model}</th><th>Kode internal</th></tr></thead><tbody>`;
    s.entries.forEach((e, ei) => {
      e.variants.forEach((v, vi) => {
        const id = `${sid}-${ei}-${vi}`;
        html += `<tr class="vrow" data-det="${id}">
          <td class="fig">${e.fig}</td>
          <td><span class="pn ${v.pn === '*' ? 'star' : ''}">${v.pn === '*' ? '* set' : v.pn}</span></td>
          <td>${v.vd || e.en}<div class="muted" style="font-size:10.5px">${e.de}</div></td>
          <td class="qty">${qtyOf(v)}</td>
          <td>${codeChip(v.m)}</td></tr>
          <tr class="hidden" id="det-${id}"><td colspan="5"><div class="det"></div></td></tr>`;
      });
    });
    html += `</tbody></table>`;
  });
  box.innerHTML = html;
  box.querySelectorAll('tr.vrow').forEach(tr => tr.onclick = () => {
    const id = tr.dataset.det, d = $('#det-' + id);
    const open = d.classList.contains('hidden');
    box.querySelectorAll('tr[id^=det-]').forEach(x => x.classList.add('hidden'));
    if (open) {
      const p = id.split('-');
      const sid = p[0], ei = +p[1], vi = +p[2];
      const v = SEC[sid].entries[ei].variants[vi];
      d.querySelector('.det').innerHTML = detailHtml(v, SEC[sid].entries[ei]);
      d.classList.remove('hidden');
    }
  });
  box.querySelectorAll('img[data-zoom]').forEach(im => im.onclick = () => {
    $('#modalBody').innerHTML = `<img src="${im.dataset.zoom}">`;
    $('#modal').classList.remove('hidden');
  });
}
function detailHtml(v, e) {
  const m = v.m;
  const qm = MODELS.map(mm => `<span class="qm ${mm === model ? 'qon' : ''}">${mm}: ${v.qty[mm] != null ? v.qty[mm] : (v.qty.ALL != null ? v.qty.ALL : '–')}</span>`).join('');
  let h = `<b>${v.vd || e.en}</b> — Bestell-Nr. <span class="pn">${v.pn}</span>
    <div class="qrow">Qty per model: ${qm}</div>`;
  if (m) {
    h += `<div class="kv">
      <span>Kode internal</span><span><b>${m.code}</b> (${m.kind === 'bauer-ref' ? 'referensi nomor Bauer tertulis di spreadsheet' : 'cocok oleh spesifikasi/DIN'})</span>
      <span>Nama material</span><span>${m.text}</span>
      <span>ABC / satuan</span><span>${m.abc} • ${m.unit}</span>
      <span>Moving price</span><span>${fmtRp(m.price)}</span>
      <span>Lokasi simpan</span><span>${m.loc}</span></div>`;
    if (v.cands && v.cands.length) {
      h += `<div class="cand"><b>Kandidat lain:</b><ul style="padding-left:16px">` +
        v.cands.map(c => `<li>${c.code} <span class="abc ${c.abc}">${c.abc}</span> — ${c.text} <span class="muted">(${fmtRp(c.price)})</span></li>`).join('') + `</ul></div>`;
    }
  } else {
    h += `<p style="margin-top:6px">Part ini <b>tidak ditemukan</b> di master material spreadsheet.
      Pesan ke Bauer / supplier menggunakan <b>Bestell-Nr. ${v.pn}</b> (katalog 827 9909, fig. ${e.fig}).</p>`;
  }
  return h;
}
function refreshQty(flash) {
  if (selGid) renderBreakdown(selGid);
  if (!$('#tab-all').classList.contains('hidden')) renderAll();
  if (flash) {
    document.querySelectorAll('#bdContent .qty, #allTable .qty').forEach(td => {
      td.classList.remove('flash'); void td.offsetWidth; td.classList.add('flash');
    });
  }
}

/* ---------------- all-parts tab ---------------- */
const selSec = $('#allSection');
selSec.innerHTML = '<option value="">Semua section</option>' + GROUPS.map(g => `<option value="${g.gid}">${g.label}</option>`).join('');
function renderAll() {
  const q = $('#allFilter').value.trim().toLowerCase();
  const gs = selSec.value, st = $('#allStatus').value;
  const rows = FLAT.filter(f => {
    if (gs && f.gid !== gs) return false;
    if (st === 'match' && !f.v.m) return false;
    if (st === 'none' && f.v.m) return false;
    if (!q) return true;
    const hay = `${f.pn} ${f.de} ${f.en} ${f.v.pn} ${f.v.m ? f.v.m.code : ''} ${f.v.vd}`.toLowerCase();
    return hay.includes(q);
  });
  $('#allCount').textContent = rows.length + ' baris';
  const show = rows.slice(0, 500);
  $('#allTable').innerHTML = `<table class="parts"><thead><tr><th class="fig">Fig</th><th>Section</th><th>Bestell-Nr.</th><th>Deskripsi</th><th>Qty<br>${model}</th><th>Kode</th></tr></thead><tbody>` +
    show.map(f => `<tr class="vrow" data-gid="${f.gid}" data-sid="${f.sid}" data-fig="${f.fig}" data-pn="${f.v.pn}">
      <td class="fig">${f.fig}</td><td class="muted">${SEC[f.sid].de}</td>
      <td><span class="pn">${f.v.pn}</span></td><td>${f.v.vd || f.en}</td>
      <td class="qty">${qtyOf(f.v)}</td><td>${codeChip(f.v.m)}</td></tr>`).join('') +
    `</tbody></table>` + (rows.length > 500 ? `<p class="muted" style="padding:8px">…dan ${rows.length - 500} baris lain, persempit filter.</p>` : '');
  $('#allTable').querySelectorAll('tr.vrow').forEach(tr => tr.onclick = () => {
    selectGroup(tr.dataset.gid, true);
    setTimeout(() => {
      const row = [...document.querySelectorAll('#bdContent tr.vrow')]
        .find(r => r.querySelector('.pn') && r.querySelector('.pn').textContent.trim() === tr.dataset.pn);
      if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('flash'); }
    }, 250);
  });
}
$('#allFilter').oninput = renderAll; selSec.onchange = renderAll; $('#allStatus').onchange = renderAll;

/* ---------------- search ---------------- */
const sIn = $('#search'), sDrop = $('#searchDrop');
sIn.addEventListener('input', () => {
  const q = sIn.value.trim().toLowerCase();
  if (q.length < 2) { sDrop.classList.add('hidden'); return; }
  const qn = q.replace(/\s/g, '');
  const res = FLAT.filter(f => {
    const hay = `${f.v.pn.replace(/\s/g, '')} ${f.de} ${f.en} ${f.v.vd} ${f.v.m ? f.v.m.code + ' ' + f.v.m.text : ''}`.toLowerCase();
    return hay.replace(/\s/g, '').includes(qn);
  }).slice(0, 40);
  sDrop.innerHTML = res.length ? res.map((f, i) =>
    `<div class="srow" data-i="${i}"><b>${f.v.pn}</b> · ${f.v.vd || f.en}<div class="muted">${SEC[f.sid].de} fig.${f.fig} ${f.v.m ? '→ ' + f.v.m.code : ''}</div></div>`).join('')
    : '<div class="srow muted">Tidak ada hasil.</div>';
  sDrop.classList.remove('hidden');
  sDrop.querySelectorAll('.srow[data-i]').forEach(r => r.onclick = () => {
    const f = res[+r.dataset.i];
    sDrop.classList.add('hidden'); sIn.value = '';
    selectGroup(f.gid, true);
    setTimeout(() => {
      const row = [...document.querySelectorAll('#bdContent tr.vrow')]
        .find(x => x.querySelector('.pn') && x.querySelector('.pn').textContent.trim() === f.v.pn);
      if (row) { row.scrollIntoView({ block: 'center' }); row.classList.add('flash'); row.click(); }
    }, 300);
  });
});
document.addEventListener('click', e => { if (!e.target.closest('.searchwrap')) sDrop.classList.add('hidden'); });

/* ---------------- info tab ---------------- */
(function () {
  const matched = FLAT.filter(f => f.v.m);
  const ref = matched.filter(f => f.v.m.kind === 'bauer-ref');
  $('#infoBody').innerHTML = `
   <h3>Statistik pencocokan</h3>
   <div class="statgrid">
     <div class="stat"><b>${FLAT.length}</b>varian sparepart (katalog PDF)</div>
     <div class="stat"><b>${matched.length}</b>varian cocok ke kode internal</div>
     <div class="stat"><b>${ref.length}</b>rujukan nomor Bauer eksplisit</div>
     <div class="stat"><b>${P.stats.master}</b>material di master (Sheet1/2)</div>
   </div>
   <h3>Metode</h3>
   <ul>
     <li><b>Referensi langsung:</b> nomor Bestell Bauer yang tertulis di dalam long-text spreadsheet (mis. <span class="pn">SSPA0305227</span> “BAUER PULLEY ANTRIB;8277008”).</li>
     <li><b>Cocok spesifikasi:</b> part standar DIN/ISO (baut, mur, ring, bearing, rantai, seal) dicocokkan berdasarkan ukuran, mis. <i>hex. bolt DIN 933 – M16×40</i> → <span class="pn">BAUT HEX ST.8.8;M16X40L…</span>.</li>
     <li><b>Tanpa padanan:</b> part fabrikasi khusus Bauer (drum, frame, konsol, dll.) memang tidak ada di master material — gunakan Bestell-Nr. Bauer saat pemesanan.</li>
     <li>Indikator ABC, satuan, moving price &amp; lokasi diambil dari Sheet1; daftar kode dari Sheet2.</li>
   </ul>
   <h3>Rujukan Bauer yang ditemukan di spreadsheet</h3>
   <ul>${ref.map(f => `<li><span class="pn">${f.v.pn}</span> → <b>${f.v.m.code}</b> — ${f.v.m.text}</li>`).join('') || '<li>-</li>'}</ul>
   <h3>Sumber data</h3>
   <ul><li>${P.stats.source_pdf}</li><li>${P.stats.source_xlsx}</li></ul>
   <p class="muted" style="margin-top:10px">Gunakan tombol ⬇ CSV di atas untuk mengunduh seluruh tabel pencocokan.</p>`;
})();

/* ---------------- CSV export ---------------- */
$('#btnCsv').onclick = () => {
  const esc = x => `"${String(x == null ? '' : x).replace(/"/g, '""')}"`;
  const lines = [['section', 'fig', 'bauer_bestell_nr', 'description', 'qty_E1', 'qty_E2', 'qty_E3', 'qty_E4', 'qty_E5',
    'internal_code', 'internal_text', 'abc', 'unit', 'moving_price', 'storage_loc', 'match_kind', 'candidates'].join(',')];
  FLAT.forEach(f => {
    const q = f.v.qty, m = f.v.m || {};
    lines.push([esc(SEC[f.sid].de), f.fig, esc(f.v.pn), esc(f.v.vd || f.en),
      q.E1 || q.ALL || '', q.E2 || q.ALL || '', q.E3 || q.ALL || '', q.E4 || q.ALL || '', q.E5 || q.ALL || '',
      esc(m.code || ''), esc(m.text || ''), esc(m.abc || ''), esc(m.unit || ''), m.price == null ? '' : m.price,
      esc(m.loc || ''), esc(m.kind || ''), esc((f.v.cands || []).map(c => c.code).join(';'))].join(','));
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  a.download = 'sparepart_mapping_rainstarE.csv';
  a.click();
};

/* ---------------- modals ---------------- */
$('#modalClose').onclick = () => $('#modal').classList.add('hidden');
$('#modal').onclick = e => { if (e.target.id === 'modal') $('#modal').classList.add('hidden'); };
$('#btnHelp').onclick = () => $('#helpModal').classList.remove('hidden');
$('#helpClose').onclick = () => $('#helpModal').classList.add('hidden');

/* ---------------- loop ---------------- */
function resize() {
  const w = $('#stage').clientWidth, h = $('#stage').clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let last = performance.now();
function loop(now) {
  const dt = Math.min((now - last) / 1000, .1); last = now;
  if (tween) {
    tween.t += dt;
    const k = ease(Math.min(tween.t / tween.dur, 1));
    camera.position.lerpVectors(tween.fp, tween.tp, k);
    controls.target.lerpVectors(tween.ft, tween.tt, k);
    if (tween.t >= tween.dur) tween = null;
  }
  const ms = machine.scale.x + (mScaleT - machine.scale.x) * .14;
  machine.scale.setScalar(ms);
  WHEELS.forEach(w => {
    const s = w.scale.x + (wScaleT - w.scale.x) * .14;
    w.scale.set(s, 1, s);
  });
  labels.forEach(l => {
    const d = camera.position.distanceTo(l.getWorldPosition(_v3));
    const f = Math.min(Math.max(d / 11, .38), 1.25);
    l.scale.copy(l.userData.base).multiplyScalar(f);
  });
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
setTimeout(() => $('#loadOverlay').classList.add('hidden'), 350);

/* test/debug hook */
window.__APP = { select: selectGroup, focus: focusGroup, REG, camera, controls, FLAT, SEC,
  getModel: () => model, applyModel, machine };
})();
