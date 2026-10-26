#!/usr/bin/env python3
"""Generate js/parts-data.js (window.PARTS) from work/parts_matched.json."""
import json

data = json.load(open('work/parts_matched.json'))

GROUP3D = {
    'fahrgestell':  dict(color=0x8d939c, ind='Rangka bawah (undercarriage)'),
    'stuetzfuss':   dict(color=0xf2b705, ind='Kaki penyangga (support leg)'),
    'drehgestell':  dict(color=0x5b6470, ind='Meja putar (turntable)'),
    'haspel':       dict(color=0xd94f1e, ind='Drum/haspel + pipa PE (reel)'),
    'antrieb':      dict(color=0xe06020, ind='Penggerak (drive)'),
    'turbine60':    dict(color=0xb8c0c8, ind='Turbin TX 60'),
    'turbine20':    dict(color=0xb8c0c8, ind='Turbin TX 20'),
    'regelung':     dict(color=0x7fb069, ind='Pengatur kecepatan (speed control)'),
    'wickel':       dict(color=0x4f7cac, ind='Mekanisme penggulung (winding)'),
    'abstuetzung':  dict(color=0x9aa7b4, ind='Penyangga hidrolis'),
    'radstativ':    dict(color=0xc8552e, ind='Kereta roda / gun cart'),
    'getriebe':     dict(color=0xa8501e, ind='Gearbox G 4'),
    'ecostar':      dict(color=0xe8e8e8, ind='Kontrol ECOSTAR 4200'),
}

sections = []
n_match = 0
n_var = 0
for sec in data:
    g = GROUP3D[sec['id']]
    entries = []
    for e in sec['entries']:
        variants = []
        for v in e['variants']:
            n_var += 1
            m = v.get('match')
            mo = None
            if m:
                n_match += 1
                mo = dict(code=m['code'], kind=m['kind'], text=m.get('text', ''),
                          abc=m.get('abc', '-'), unit=m.get('unit', '-'),
                          price=m.get('price'), loc=m.get('loc', '-'))
            variants.append(dict(pn=v['partno'], qty=v['qty'], vd=v.get('vdesc', ''),
                                 m=mo, cands=v.get('candidate_info', [])))
        entries.append(dict(fig=e['fig'], de=e['desc_de'], en=e['desc_en'], variants=variants))
    diag = [f'assets/diagrams/{sec["id"]}_{i+1}.png' for i in range(len(sec['diagrams']))]
    sections.append(dict(id=sec['id'], de=sec['de'], en=sec['en'], ind=g['ind'],
                         color=g['color'], diagrams=diag,
                         pages=sec['pages'], entries=entries))

out = dict(models=['E1', 'E2', 'E3', 'E4', 'E5'], sections=sections,
           stats=dict(variants=n_var, matched=n_match,
                      master=2247, source_pdf='Bauer Rainstar E (E1-E5) Ersatzeilliste 827 9909, VI-2011',
                      source_xlsx='ABC INDIKATOR MATERIAL.XLSX (Sheet1 master + Sheet2 daftar kode)'))
js = 'window.PARTS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';'
open('parts-material/js/parts-data.js', 'w').write(js)
print('parts-data.js', len(js) // 1024, 'KB | variants', n_var, 'matched', n_match)
