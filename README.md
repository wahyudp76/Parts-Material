# Parts-Material — Bauer Rainstar E Interactive Spare-Part Explorer

Website interaktif yang menampilkan **sketsa 3D Bauer Rainstar E (E1–E5) traveller irrigator**
(dibuat ulang secara prosedural dengan Three.js berdasarkan katalog PDF
*Ersatzeilliste / List of Spare Parts 827 9909, VI-2011*), lengkap dengan:

- **Zoom in/out & orbit** (scroll / drag / tombol ＋ －), auto-rotate, dan **exploded view** (slider 💥).
- **12 part utama yang bisa diklik** (drum/haspel, turbin, gearbox, penggerak, meja putar, rangka bawah,
  kaki penyangga, pengatur kecepatan, mekanisme penggulung, penyangga hidrolis, kereta roda/gun cart,
  kontrol ECOSTAR). Saat part diklik, kamera **zoom ke part tsb** dan panel kanan menampilkan
  **breakdown sparepart** (fig., Bestell-Nr. Bauer, deskripsi DE/EN, qty per model E1–E5).
- **Pencocokan kode material internal** dari spreadsheet *ABC INDIKATOR MATERIAL* (Sheet1 = master
  material + indikator ABC/satuan/moving price/lokasi, Sheet2 = daftar kode):
  - chip **hijau** = kode internal ditemukan (referensi nomor Bauer eksplisit di long-text, atau
    cocok spesifikasi DIN/ISO untuk part standar: baut, ring, bearing, rantai, seal, pillow block);
    klik baris untuk melihat nama material, indikator **ABC**, satuan, **moving price**, lokasi simpan,
    dan kandidat alternatif;
  - chip **abu-abu** = tidak ada di master material → pesan memakai **Bestell-Nr. Bauer**.
- **Exploded diagram resmi** dari PDF untuk tiap section (bisa diperbesar).
- Tab **Semua sparepart**: tabel lengkap 703 varian part, bisa difilter per section/status & dicari.
- **Pencarian global** (nama part, Bestell-Nr., maupun kode internal mis. `SSPA0102053`).
- Ekspor **CSV** hasil pencocokan (tombol ⬇ CSV) — salinan statis juga tersedia di
  `data/sparepart_mapping.csv`.
- Tombol 📷 menampilkan foto katalog asli sebagai pembanding sketsa 3D.

## Menjalankan lokal

Website ini statis murni (tanpa build step):

```bash
cd parts-material
python3 -m http.server 8080     # lalu buka http://localhost:8080
```

(three.js r128 + OrbitControls sudah di-vendor di `js/`, tidak butuh CDN/internet.)

## Struktur

```
index.html            aplikasi single-page
css/style.css         tema gelap UI
js/three.min.js       three.js r128 (vendor)
js/OrbitControls.js   kontrol orbit (vendor)
js/parts-data.js      data hasil parse PDF + pencocokan spreadsheet (window.PARTS)
js/app.js             scene 3D prosedural + seluruh UI
assets/diagrams/      exploded diagram resmi per section (render dari PDF)
assets/cover.jpg      foto sampul katalog (pembanding)
data/sparepart_mapping.csv   tabel pencocokan lengkap (statis)
tools/                skrip pipeline data (butuh input PDF & XLSX):
  parse_pdf.py   -> work/parts_raw.json      (ekstrak tabel PDF per section)
  match_sheet.py -> work/parts_matched.json  (cocokkan ke kode internal XLSX)
  gen_data.py    -> js/parts-data.js
```

## Memperbarui data

1. Letakkan PDF katalog & `ABC INDIKATOR MATERIAL.XLSX` di samping folder `tools/`.
2. `python3 tools/parse_pdf.py && python3 tools/match_sheet.py && python3 tools/gen_data.py`
3. Refresh browser.

## Sumber data

- PDF: *PARTBAUER RAINSTAR E1–E5 — Ersatzteilliste 827 9909 (VI-2011)*, Röhren- und Pumpenwerk BAUER Ges.m.b.H.
- Spreadsheet: *ABC INDIKATOR MATERIAL* (Sheet1 & Sheet2).

## Tab 2 — Pompa EBARA FSA (end suction volute pump, 50 Hz)
- Model 3D rakit + **exploded view** (tombol 🧩) dengan label nomor fig brosur.
- Sumber geometri & material: brosur EBARA FSA 50 Hz (FS513CT-R0E), *sectional view* hal. 4
  (001 Casing, 011 Casing Cover, 021 Impeller, 031 Shaft, 048/050 nut+washer, 051 Bearing Housing,
  053 Bearing Cover, 056 Ball Bearing, 085 Lantern Ring, 091 Gland, 093 Deflector, 095 Bearing Support,
  107 Casing Ring, 110 Gland Bolt, 111 Mechanical Seal + sub-komponen 111-1..6, 119 Gland Packing, 206 Plug, G O-Ring).
- Toggle jenis perapat: **Mechanical Seal (standar)** ↔ **Gland Packing (opsional)**.
- Klik part → panel material brosur + **kode internal spreadsheet (Sheet2)**:
  padanan langsung: 001→SSPA0109900, 021→SSPA0106997, 031→SSPA0107540, 051→SSPA0106998,
  111→SSPA0110441, 119→SSPA0112950; part lain diberi kandidat terdekat atau tanda "—".
- File: `js/ebara-data.js` (data part+material+kode), `js/ebara.js` (scene/exploded/picking),
  `js/tabs.js` (pindah tab Bauer ↔ Ebara).

## Tab 3 — IRRILAND Hose Travel Irrigator (Silver series)
- Model 3D rakit + **exploded view** + posisi **cart operasi / transport** (pill di topbar, meniru foto manual).
- Sumber posisi part: manual Irriland Silver series 2018-02-01 (pict/pos 1–59): pos 1 turbin+by-pass,
  pos 9 rod disengagement, pos 10 nipple grease, pos 12 safety dog, pos 14/24 hand wheel PTO,
  pos 15 pressure gauge, pos 16 central elbow, pos 19/20 O-ring & nylon packing, pos 25 seal mekanikal,
  pos 26 double lip seal, pos 27/29 quick coupling, pos 30/32 gearbox 3-speed, pos 35 kaki angkur,
  pos 55/56 kompensasi kecepatan, pos 58 guide fork.
- Kode internal spreadsheet (Sheet2) padanan langsung: SFMS0102456 (nipple M8), SSPA0305376 (ball-steel
  turbin Bondioli), SSPA0305408 (O-ring packing), SSPA0305409 (nylon packing), SSPA0305432 (seal 16 mm),
  SSPA0323712 (selang hidrolik 3/8"), SSPA0324467 (hand pump hidrolik).
- File: `js/irriland-data.js`, `js/irriland.js`; tab switching di `js/tabs.js` (3 view).
