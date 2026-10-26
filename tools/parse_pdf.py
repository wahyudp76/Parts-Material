#!/usr/bin/env python3
"""Parse Bauer Rainstar E spare-part tables from the PDF into structured JSON."""
import pymupdf, json, re, sys

PDF = 'uploads/PARTBAUERRAINSTAR_E1-E5[0]_20180319022552.014_X.pdf'

SECTIONS = [
    # (table pages, diagram pages, id, de, en, ind)
    ([2],       [1],        'fahrgestell',  'Fahrgestell',        'Undercarriage',      'Rangka bawah / sasis'),
    ([4],       [3],        'stuetzfuss',    'Stützfuß',           'Support leg',        'Kaki penyangga'),
    ([6],       [5],        'drehgestell',  'Drehgestell',        'Turntable',          'Meja putar'),
    ([8, 9],    [7, 10],    'haspel',       'Haspel',             'Reel',               'Drum / haspel selang'),
    ([11, 12],  [13],       'antrieb',      'Antrieb',            'Drive',              'Penggerak / transmisi'),
    ([14],      [15],       'turbine60',    'Turbine TX 60',      'Turbine TX 60',      'Turbin TX 60'),
    ([16],      [17],       'turbine20',    'Turbine TX 20',      'Turbine TX 20',      'Turbin TX 20'),
    ([18],      [19],       'regelung',     'Regelung',           'Speed control',      'Pengatur kecepatan'),
    ([20, 21],  [22],       'wickel',       'Wickelvorrichtung',  'Winding mechanism',  'Mekanisme penggulung'),
    ([23, 24],  [25],       'abstuetzung',  'Abstützung hydr.',   'Hydr. supports',     'Penyangga hidrolis'),
    ([26],      [27],       'radstativ',    'Radstativ',          'Wheel cart',         'Kereta roda (gun cart)'),
    ([28, 29],  [],         'getriebe',     'Getriebe G 4',       'Gearbox G 4',        'Gearbox G 4'),
    ([31],      [30],       'ecostar',      'ECOSTAR 4200 (3000)','ECOSTAR 4200 (3000)','Kontrol ECOSTAR'),
]

QX = [(385, 412, 'E1'), (412, 445, 'E2'), (445, 477, 'E3'), (477, 510, 'E4'), (510, 560, 'E5')]

# per-page column overrides: (fig_max_x, partno_x_range, desc_x_range, qty buckets)
OVERRIDE = {
    31: dict(figx=70, pn=(70, 120), desc=(120, 500),
             qx=[(500, 575, 'ALL')]),
}

def rows_of(page):
    rows = {}
    for w in page.get_text('words'):
        key = round(w[1] / 6)
        rows.setdefault(key, []).append(w)
    out = []
    for k in sorted(rows):
        toks = sorted(rows[k], key=lambda t: t[0])
        out.append(toks)
    return out

def is_int(s):
    return re.fullmatch(r'\d{1,3}', s or '') is not None

def parse_page(page, pno):
    ov = OVERRIDE.get(pno, {})
    figx = ov.get('figx', 95)
    pnx = ov.get('pn', (95, 140))
    descx = ov.get('desc', (140, 380))
    qx = ov.get('qx', QX)
    entries = []
    cur = None
    started = False
    for toks in rows_of(page):
        if not toks:
            continue
        txt = ' '.join(t[4] for t in toks)
        if not started:
            if 'pieces' in txt:
                started = True
            continue
        if txt.startswith('ERSATZTEILISTE') or 'nur im Set' in txt:
            continue
        first = toks[0]
        fig = None
        if first[0] < figx and is_int(first[4]):
            fig = int(first[4])
        # partno tokens
        pn_toks = [t for t in toks if pnx[0] <= t[0] < pnx[1]]
        partno = None
        if pn_toks:
            if pn_toks[0][4] == '*':
                partno = '*'
            else:
                digits = [t[4] for t in pn_toks if re.fullmatch(r'\d{3,7}', t[4])]
                if digits:
                    if len(digits) == 2 and len(digits[0]) == 3:
                        partno = digits[0] + ' ' + digits[1]
                    else:
                        partno = ' '.join(digits)
        desc_toks = [t for t in toks if descx[0] <= t[0] < descx[1]]
        desc = ' '.join(t[4] for t in desc_toks).strip()
        qty = {}
        for t in toks:
            if t[0] >= qx[0][0]:
                for a, b, m in qx:
                    if a <= t[0] < b:
                        qty.setdefault(m, [])
                        qty[m].append(t[4])
        qty = {m: ' '.join(v) for m, v in qty.items()}
        if fig is not None:
            cur = {'fig': fig, 'desc': desc, 'variants': []}
            entries.append(cur)
            if partno:
                cur['variants'].append({'partno': partno, 'qty': qty, 'vdesc': desc})
            else:
                cur['_pending_qty'] = qty
        else:
            if cur is None:
                continue
            if partno:
                q = qty or cur.pop('_pending_qty', {})
                cur['variants'].append({'partno': partno, 'qty': q, 'vdesc': desc})
            elif desc and not cur['desc']:
                cur['desc'] = desc
            elif desc and cur['desc'] and not cur['variants']:
                cur['desc'] = (cur['desc'] + ' ' + desc).strip()
    for e in entries:
        e.pop('_pending_qty', None)
    return entries

def split_desc(d):
    # 'Kugellenkkranz / ball race' -> (de, en)
    if ' / ' in d:
        de, en = d.split(' / ', 1)
        return de.strip(), en.strip()
    return d.strip(), d.strip()

def main():
    doc = pymupdf.open(PDF)
    data = []
    for pages, diagrams, sid, de, en, ind in SECTIONS:
        sec = {'id': sid, 'de': de, 'en': en, 'id_ind': ind,
               'pages': pages, 'diagrams': diagrams, 'entries': []}
        for pi in pages:
            for e in parse_page(doc[pi], pi):
                d, e2 = split_desc(e['desc'])
                e['desc_de'], e['desc_en'] = d, e2
                sec['entries'].append(e)
        data.append(sec)
    json.dump(data, open('work/parts_raw.json', 'w'), indent=1, ensure_ascii=False)
    tot = sum(len(s['entries']) for s in data)
    var = sum(len(v['variants']) for s in data for v in s['entries'])
    print('sections', len(data), 'fig-entries', tot, 'partno-variants', var)
    for s in data:
        print(f"  {s['id']:12s} {len(s['entries']):3d} entries")

if __name__ == '__main__':
    main()
