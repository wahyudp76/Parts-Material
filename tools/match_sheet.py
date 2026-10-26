#!/usr/bin/env python3
"""Match Bauer Rainstar E spare parts (from PDF) against internal material codes (XLSX Sheet1/Sheet2)."""
import json, re, openpyxl

RAW = 'work/parts_raw.json'
XLSX = 'sheet.xlsx'

wb = openpyxl.load_workbook(XLSX, data_only=True)
ws1 = wb['Sheet1']
MASTER = []   # code, text, abc, unit, price, loc, group
for r in ws1.iter_rows(min_row=2, values_only=True):
    if not r[0]:
        continue
    MASTER.append(dict(code=str(r[0]), text=str(r[1] or ''), abc=str(r[7] or '') or '-',
                       unit=str(r[2] or '') or '-', price=r[21], loc=str(r[11] or '') or str(r[10] or '') or '-',
                       mgroup=str(r[8] or '')))
NORM = [(m, re.sub(r'[^A-Z0-9]', '', m['text'].upper())) for m in MASTER]

def norm_digits(s):
    return re.sub(r'\D', '', s)

# ---------- rule helpers ----------
WASHER_NOM = {'8.4': 'M8', '9': 'M8', '10.5': 'M10', '11': 'M10', '13.5': 'M12', '14': 'M12',
              '17,5': 'M16', '17.5': 'M16', '22': 'M20', '26': 'M24', '8': 'M8', '10': 'M10',
              '12': 'M12', '16': 'M16', '20': 'M20'}
CHAIN_RS = {'1/2': 'RS40', '5/8': 'RS50', '3/4': 'RS60', '1': 'RS80'}

def find(pred, limit=6):
    return [m for m in MASTER if pred(m)][:limit]

def match_variant(partno, d):
    dl = d.lower()
    cands = []
    kind = None
    # 1) direct Bauer number reference inside internal long text
    pn = norm_digits(partno)
    if pn and len(pn) == 7:
        for m, nt in NORM:
            if pn in nt:
                cands.append(m)
        if cands:
            kind = 'bauer-ref'
            return kind, cands
    if partno == '*':
        return None, []
    # 2) hex bolt DIN 933/931/7984  M d x l
    mxb = re.search(r'DIN (933|931|7984)\s*-\s*M\s*(\d+)\s*x\s*(\d+)', d)
    if mxb:
        dd, ll = mxb.group(2), mxb.group(3)
        c = find(lambda m: m['text'].startswith('BAUT HEX') and
                 re.search(r';M' + dd + r'X' + ll + r'L', m['text']))
        c.sort(key=lambda m: ('STD' not in m['text'], 'FULL' not in m['text']))
        if c:
            return 'spec', c
    # 3) hex nut DIN 934 / 980  M d
    mxn = re.search(r'DIN (934|980)\s*-\s*M\s*(\d+)', d)
    if mxn:
        dd = mxn.group(2)
        c = find(lambda m: re.search(r'^(MUR|NUT-HEX|NUT HEX)', m['text']) and
                 re.search(r';M' + dd + r'(-|\b)', m['text']))
        if c:
            return 'spec', c
    # 4) spring washer DIN 127 - B d
    mxs = re.search(r'DIN 127\s*-\s*B\s*(\d+)', d)
    if mxs:
        dd = mxs.group(1)
        c = find(lambda m: m['text'].startswith('RING/WASHER PER') and (';M' + dd) in m['text'])
        if c:
            return 'spec', c
    # 5) flat washer DIN 126 / 440
    mxw = re.search(r'DIN (126|440)\s*-\s*R?\s*(\d+(?:[.,]\d+)?)', d)
    if mxw:
        nom = WASHER_NOM.get(mxw.group(2))
        if nom:
            c = find(lambda m: m['text'].startswith('RING/WASHER PLATE') and
                     re.search(r'[.;]' + nom + r'\b', m['text']))
            if c:
                return 'spec', c
    # 6) ball bearing  (Rillenkugellager 6204)
    mxb = re.search(r'(rillenkugellager|ball bearing)\s*(\d{4})', dl)
    if mxb:
        num = mxb.group(2)
        c = find(lambda m: re.search(r'BEARING-BALL;' + num + r'\b', m['text']))
        if c:
            return 'spec', c
    # 7) thrust bearing 512 xx
    mxt = re.search(r'Axial-Kugellager\s*(\d{3})\s?(\d{2})', d)
    if mxt:
        num = mxt.group(1) + mxt.group(2)
        c = find(lambda m: ('THRUST' in m['text']) and num in m['text'])
        if c:
            return 'spec', c
    # 8) pillow block UCP xxx
    mxp = re.search(r'(UCP\s?\d{3})', d)
    if mxp:
        num = mxp.group(1).replace(' ', '')
        c = find(lambda m: ('PILLOW' in m['text']) and (num in re.sub(r'\s', '', m['text'])))
        if c:
            return 'spec', c
    # 9) sprocket by size + teeth  (must run before chain rule)
    mxsp = re.search(r'sprocket wheel\s*(\d/\d|1)"\s*x\s*\d/\d"\s*,?\s*z\s*=\s*(\d+)', dl)
    if mxsp:
        rs = CHAIN_RS.get(mxsp.group(1))
        z = mxsp.group(2)
        c = find(lambda m: m['text'].startswith('SPROCKET') and rs in m['text'] and ('Z=' + z) in m['text'])
        return ('spec', c) if c else (None, [])
    # 10) roller chain by inch size
    mxc = re.search(r'(\d/\d|1)"\s*x\s*\d/', d)
    if mxc and ('chain' in dl or 'kette' in dl) and 'sprocket' not in dl and 'kettenrad' not in dl:
        rs = CHAIN_RS.get(mxc.group(1))
        if rs:
            c = find(lambda m: m['text'].startswith('ROLL.CHAIN') and (';' + rs) in m['text'])
            if c:
                return 'spec', c
    # 11) rotary shaft seal DIN 3760  A/AS 20x47x7
    mxse = re.search(r'DIN 3760\s*-\s*A?S?\s*(\d+)\s*x\s*(\d+)\s*x\s*(\d+)', d)
    if mxse:
        a, b, cc = mxse.groups()
        c = find(lambda m: ('SEAL-OIL' in m['text']) and
                 (re.search(a + r'[X-]' + b + r'[X-]' + cc, re.sub(r'\s', '', m['text']).upper())))
        if c:
            return 'spec', c
    return None, []

def main():
    data = json.load(open(RAW))
    n_match = n_cand = n_tot = 0
    for sec in data:
        for e in sec['entries']:
            for v in e['variants']:
                n_tot += 1
                vd = v.get('vdesc') or (e['desc_de'] + ' / ' + e['desc_en'])
                kind, cands = match_variant(v['partno'], vd)
                if kind == 'bauer-ref':
                    v['match'] = dict(kind=kind, code=cands[0]['code'])
                    n_match += 1
                elif cands:
                    v['match'] = dict(kind=kind, code=cands[0]['code'])
                    v['candidates'] = [c['code'] for c in cands]
                    n_match += 1
                else:
                    v['match'] = None
    # attach master info
    by_code = {m['code']: m for m in MASTER}
    for sec in data:
        for e in sec['entries']:
            for v in e['variants']:
                if v['match']:
                    info = by_code.get(v['match']['code'])
                    if info:
                        v['match'].update(text=info['text'], abc=info['abc'], unit=info['unit'],
                                          price=info['price'], loc=info['loc'])
                    v['candidate_info'] = [dict(code=c, text=by_code[c]['text'], abc=by_code[c]['abc'],
                                                unit=by_code[c]['unit'], price=by_code[c]['price'])
                                           for c in v.get('candidates', [])]
    json.dump(data, open('work/parts_matched.json', 'w'), indent=1, ensure_ascii=False)
    print(f'total variants {n_tot}, matched {n_match}')
    for sec in data:
        tot = sum(len(e['variants']) for e in sec['entries'])
        mt = sum(1 for e in sec['entries'] for v in e['variants'] if v['match'])
        print(f"  {sec['id']:12s} {mt:3d}/{tot:3d}")
    # show matched examples
    for sec in data:
        for e in sec['entries']:
            for v in e['variants']:
                if v['match']:
                    print('  e.g.', sec['id'], e['fig'], v['partno'], '->', v['match']['code'],
                          v['match']['kind'], '|', v['match'].get('text', '')[:60])
    # csv export
    import csv
    with open('parts-material/data/sparepart_mapping.csv', 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['section_de', 'section_en', 'fig', 'bauer_bestell_nr', 'description_de',
                    'description_en', 'qty_E1', 'qty_E2', 'qty_E3', 'qty_E4', 'qty_E5',
                    'internal_code', 'internal_text', 'abc_indicator', 'unit', 'moving_price',
                    'storage_loc', 'match_kind', 'candidates'])
        for sec in data:
            for e in sec['entries']:
                for v in e['variants']:
                    q = v['qty']
                    m = v['match'] or {}
                    w.writerow([sec['de'], sec['en'], e['fig'], v['partno'], e['desc_de'], e['desc_en'],
                                q.get('E1', q.get('ALL', '')), q.get('E2', q.get('ALL', '')),
                                q.get('E3', q.get('ALL', '')), q.get('E4', q.get('ALL', '')),
                                q.get('E5', q.get('ALL', '')), m.get('code', ''), m.get('text', ''),
                                m.get('abc', ''), m.get('unit', ''), m.get('price', ''),
                                m.get('loc', ''), m.get('kind', ''),
                                ';'.join(v.get('candidates', []))])
    print('csv written')

if __name__ == '__main__':
    main()
