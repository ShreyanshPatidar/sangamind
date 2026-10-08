"""One-off: bring every upstream DESIGN.md to the same machine-readable frontmatter.

- quotes unquoted `description:` values that break YAML
- adds a frontmatter block to prose-only files, built from their colour lists and type tables
  plus a hand-checked role map (which colour is the primary button, the canvas, the text)
"""
import re, sys, glob, os, yaml

LIB = sys.argv[1]

# Hand-checked from each file's Buttons / Colour sections.
ROLES = {
    'kraken':      dict(primary='kraken-purple', on_primary='white', ink='near-black', canvas='white', body='cool-gray', muted='silver-blue', hairline='border-gray', success='green'),
    'lamborghini': dict(primary='lamborghini-gold', on_primary='absolute-black', ink='pure-white', canvas='absolute-black', surface='charcoal', body='steel', muted='ash', hairline='graphite'),
    'lovable':     dict(primary='charcoal', on_primary='off-white', ink='charcoal', canvas='cream', surface='off-white', body='muted-gray', hairline='light-cream', focus='ring-blue'),
    'mastercard':  dict(primary='ink-black', on_primary='canvas-cream', ink='ink-black', canvas='canvas-cream', surface='lifted-cream', body='charcoal', muted='slate-gray', hairline='dust-taupe', accent='signal-orange', link='link-blue'),
    'runwayml':    dict(primary='pure-white', on_primary='runway-black', ink='pure-white', canvas='runway-black', surface='dark-surface', body='muted-gray', muted='cool-slate', hairline='border-dark'),
    'sanity':      dict(primary='sanity-red', on_primary='white', ink='pure-white', canvas='sanity-black', surface='dark-gray', body='silver', muted='medium-gray', hairline='medium-dark', accent='electric-blue', error='error-red', success='gpc-green', focus='focus-ring-blue'),
    'spotify':     dict(primary='spotify-green', on_primary='near-black', ink='white', canvas='near-black', surface='dark-surface', body='silver', muted='light-border', hairline='border-gray', error='negative-red', warning='warning-orange', link='announcement-blue'),
    'starbucks':   dict(primary='green-accent', on_primary='white', ink='text-black', canvas='neutral-warm', surface='white', body='text-black-soft', hairline='ceramic', accent='gold', error='red', brand='starbucks-green'),
    'tesla':       dict(primary='electric-blue', on_primary='pure-white', ink='carbon-dark', canvas='white-canvas', surface='light-ash', body='graphite', muted='pewter', hairline='pale-silver'),
    'theverge':    dict(primary='jelly-mint', on_primary='canvas-black', ink='primary-text', canvas='canvas-black', surface='surface-slate', body='secondary-text', hairline='image-frame', accent='verge-ultraviolet', focus='focus-ring', link='deep-link-blue'),
}
ROLE_KEYS = {'on_primary': 'on-primary', 'focus': 'focus-ring'}


def slug(s):
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def colours(text):
    out, sec = {}, ''
    for l in text.split('## 3.')[0].split('\n'):
        if l.startswith('###'):
            sec = slug(l.strip('# '))
        m = re.match(r'\s*-\s*\*\*(.+?)\*\*\s*\(`?(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))`?', l)
        if m:
            k = slug(m.group(1))
            if k in out:
                k = sec + '-' + k
            v = m.group(2)
            out[k] = v.lower() if v.startswith('#') else v.replace(' ', '')
    return out


def fonts(text):
    sec = re.search(r'### Font Famil[^\n]*\n(.*?)\n###', text, re.S)
    names = re.findall(r'`([^`,]+)', sec.group(1)) if sec else []
    return names or ['system-ui']


def type_scale(text, default_font):
    rows, hdr = {}, None
    for l in text.split('\n'):
        if not l.strip().startswith('|'):
            hdr = None
            continue
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if hdr is None:
            hdr = [slug(h) for h in c]
            continue
        if set(''.join(c)) <= set('-: '):
            continue
        col = {h: (c[i] if i < len(c) else '') for i, h in enumerate(hdr)}
        size = re.search(r'(\d+(?:\.\d+)?)px', col.get('size', ''))
        if 'role' not in col or not size:
            continue
        k = slug(re.sub(r'\(.*?\)', '', col['role']))
        if not k or k in rows:
            continue
        font = col.get('font', '').split(',')[0].strip('` ')
        if not font:
            named = re.search(r'([A-Z][\w-]+(?: [A-Z][\w-]+)*)', col.get('notes', ''))
            font = named.group(1) if named and named.group(1) in ' '.join(fonts_cache) else default_font
        e = {'fontFamily': font, 'fontSize': size.group(1) + 'px'}
        w = re.search(r'\d{3}', col.get('weight', ''))
        e['fontWeight'] = int(w.group(0)) if w else 400
        lh = col.get('line-height', '')
        px = re.search(r'\(~?([\d.]+)\)', lh) or re.match(r'\s*([\d.]+)(?![\d.]*\s*px)', lh)
        if px:
            e['lineHeight'] = float(px.group(1))
        else:
            lpx = re.match(r'\s*([\d.]+)px', lh)
            if lpx:
                e['lineHeight'] = round(float(lpx.group(1)) / float(size.group(1)), 2)
        ls = re.search(r'-?[\d.]+(px|em)', col.get('letter-spacing', ''))
        if ls:
            e['letterSpacing'] = ls.group(0)
        rows[k] = e
    return rows


def radii(text):
    m = re.search(r'Border Radius[^\n]*\n?(.*?)(\n## |\n### )', text, re.S)
    vals = set(re.findall(r'(\d+(?:\.\d+)?)px', m.group(0) if m else ''))
    vals = sorted({float(v) for v in vals})
    names = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl']
    out, small = {}, [v for v in vals if v < 100]
    for n, v in zip(names, small):
        out[n] = f'{v:g}px'
    if any(v >= 100 for v in vals) or '50%' in (m.group(0) if m else ''):
        out['full'] = '9999px'
    return out or {'md': '8px'}


def spacing(text):
    m = re.search(r'(Base unit|base unit)[^\n]*?(\d+)px', text)
    base = int(m.group(2)) if m else (4 if re.search(r'4px (base|grid)', text) else 8)
    steps = {'xxs': 0.5, 'xs': 1, 'sm': 1.5, 'md': 2, 'lg': 3, 'xl': 4, 'xxl': 6, 'section': 12}
    return {k: f'{int(base * v)}px' for k, v in steps.items()}


def add_frontmatter(path, name):
    global fonts_cache
    text = open(path, encoding='utf8').read()
    pal = colours(text)
    fonts_cache = fonts(text)
    desc = re.search(r'## 1\..*?\n\n(.+?)\n\n', text, re.S).group(1).strip()
    col = {}
    for role, key in ROLES[name].items():
        col[ROLE_KEYS.get(role, role)] = pal[key]
    for k, v in pal.items():
        col.setdefault(k, v)
    ts = type_scale(text, fonts_cache[0])
    fm = {
        'version': 'alpha',
        'name': f'{name}-design-analysis',
        'description': desc,
        'colors': col,
        'typography': ts,
        'rounded': radii(text),
        'spacing': spacing(text),
        'components': {},
        'normalized': 'frontmatter added by ui-design from this file\'s own prose; check against the prose below',
    }
    head = yaml.safe_dump(fm, sort_keys=False, allow_unicode=True, width=10000)
    open(path, 'w', encoding='utf8').write('---\n' + head + '---\n\n' + text)
    return len(col), len(ts)


def fix_yaml(path):
    text = open(path, encoding='utf8').read()
    _, fm, body = text.split('---', 2)
    lines = fm.split('\n')
    # a stray top-level key with a non-ASCII name (raycast has one) duplicates the description
    lines = [l for l in lines if l[:1].isascii()]
    for i, l in enumerate(lines):
        m = re.match(r'^(description):\s+(.*)$', l)
        if m and m.group(2) != '|' and not m.group(2).startswith(('"', "'", '>')):
            lines[i] = 'description: ' + '"' + m.group(2).replace('\\', '\\\\').replace('"', '\\"') + '"'
    fm = '\n'.join(lines)
    yaml.safe_load(fm)
    open(path, 'w', encoding='utf8').write('---' + fm + '---' + body)


fonts_cache = []
for d in sorted(os.listdir(LIB)):
    p = os.path.join(LIB, d, 'DESIGN.md')
    if not os.path.isfile(p):
        continue
    t = open(p, encoding='utf8').read()
    if not t.startswith('---'):
        print('prose ->', d, add_frontmatter(p, d))
        continue
    try:
        yaml.safe_load(t.split('---', 2)[1])
    except yaml.YAMLError:
        fix_yaml(p)
        print('fixed yaml ->', d)
