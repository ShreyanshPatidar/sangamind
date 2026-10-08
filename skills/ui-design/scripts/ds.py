#!/usr/bin/env python
"""Design-system library tool for the ui-design skill.

  ds.py list   [--theme light|dark] [--category NAME] [--shape sharp|soft|round|pill] [--q TEXT]
  ds.py show   SLUG
  ds.py tokens (--from SLUG | --mix color=A,type=B,shape=C,space=D) [--brand HEX]
               [--format css|tailwind|json] [--themes both|native] [--out FILE]
  ds.py check  (--from SLUG | --mix ...) [--brand HEX]      contrast audit, both themes
  ds.py build                                               rebuild library/index.json + CATALOG.md

Everything it emits is a token file. Components consume the tokens; no value is ever pasted into a component.
"""
import argparse, colorsys, json, math, os, re, sys

import yaml

HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.path.join(HERE, '..', 'library')

CATEGORY = {
    'AI & models': 'claude cohere elevenlabs minimax mistral.ai ollama runwayml together.ai x.ai replicate lovable cursor composio voltagent',
    'Developer tools & infra': 'vercel supabase sentry posthog mongodb clickhouse hashicorp resend mintlify expo warp opencode.ai raycast sanity',
    'Productivity & SaaS': 'linear.app notion airtable miro figma framer webflow cal intercom slack zapier superhuman clay',
    'Fintech & payments': 'stripe wise revolut coinbase kraken binance mastercard',
    'Consumer & commerce': 'airbnb apple nike spotify starbucks shopify uber pinterest playstation nintendo-2001',
    'Big tech & hardware': 'meta dell-1996 hp ibm nvidia vodafone',
    'Automotive & luxury': 'bmw bmw-m bugatti ferrari lamborghini renault tesla spacex',
    'Editorial & media': 'theverge wired',
}
CATEGORY_OF = {s: c for c, v in CATEGORY.items() for s in v.split()}
# Systems whose own product is dense, working UI (tables, lists, settings), so their tokens
# transfer to dashboards and apps, not only to marketing pages.
PRODUCT_UI = set('linear.app notion airtable supabase sentry posthog vercel stripe mongodb clickhouse '
                 'hashicorp raycast warp cal intercom slack superhuman wise revolut coinbase kraken '
                 'binance figma miro zapier resend mintlify expo cursor opencode.ai ibm'.split())

# ---------------------------------------------------------------- colour maths

def parse_color(v):
    """'#abc', '#aabbcc', '#aabbccdd', 'rgb(..)', 'rgba(..)' -> (r, g, b, a) in 0..1, or None."""
    if not isinstance(v, str):
        return None
    v = v.strip().lower()
    m = re.fullmatch(r'#([0-9a-f]{3,8})', v)
    if m:
        h = m.group(1)
        if len(h) in (3, 4):
            h = ''.join(c * 2 for c in h)
        if len(h) not in (6, 8):
            return None
        r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
        a = int(h[6:8], 16) / 255 if len(h) == 8 else 1.0
        return r, g, b, a
    m = re.fullmatch(r'rgba?\(([^)]*)\)', v)
    if m:
        p = [x for x in re.split(r'[\s,/]+', m.group(1)) if x]
        if len(p) < 3:
            return None
        r, g, b = (float(x.rstrip('%')) / (100 if x.endswith('%') else 255) for x in p[:3])
        a = float(p[3].rstrip('%')) / (100 if p[3].endswith('%') else 1) if len(p) > 3 else 1.0
        return r, g, b, a
    return None


def over(fg, bg):
    """Composite a translucent colour on an opaque one."""
    a = fg[3]
    return tuple(fg[i] * a + bg[i] * (1 - a) for i in range(3)) + (1.0,)


def hexof(c):
    return '#' + ''.join(f'{round(max(0, min(1, x)) * 255):02x}' for x in c[:3])


def _lin(x):
    return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4


def _gam(x):
    return 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055


def luminance(c):
    r, g, b = (_lin(x) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def to_oklch(c):
    r, g, b = (_lin(x) for x in c[:3])
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (math.copysign(abs(x) ** (1 / 3), x) for x in (l, m, s))
    L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
    A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return L, math.hypot(A, B), math.degrees(math.atan2(B, A)) % 360


def from_oklch(L, C, H):
    for _ in range(40):  # shrink chroma until the colour fits in sRGB
        A, B = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
        l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
        m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
        s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
        rgb = (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
               -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
               -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)
        if all(-1e-4 <= x <= 1 + 1e-4 for x in rgb):
            return tuple(_gam(max(0, min(1, x))) for x in rgb) + (1.0,)
        C *= 0.9
    return tuple(_gam(max(0, min(1, x))) for x in rgb) + (1.0,)


def with_L(c, L):
    _, C, H = to_oklch(c)
    return from_oklch(L, C, H)


def nudge(fg, bg, target):
    """Move fg's lightness away from bg until contrast >= target. Returns (colour, changed)."""
    if contrast(fg, bg) >= target:
        return fg, False
    L, C, H = to_oklch(fg)
    lighter = to_oklch(bg)[0] < 0.6
    for _ in range(100):
        L = min(1, L + 0.01) if lighter else max(0, L - 0.01)
        c = from_oklch(L, C, H)
        if contrast(c, bg) >= target:
            return c, True
        if L in (0, 1):
            break
    return c, True


def hue_name(c):
    L, C, H = to_oklch(c)
    if C < 0.03:
        return 'black' if L < 0.25 else 'white' if L > 0.95 else 'neutral'
    for lim, n in ((20, 'pink'), (45, 'red'), (70, 'orange'), (100, 'amber'), (125, 'yellow'), (160, 'lime'),
                   (175, 'green'), (200, 'teal'), (230, 'cyan'), (255, 'blue'), (290, 'indigo'), (320, 'violet'),
                   (350, 'magenta'), (361, 'pink')):
        if H < lim:
            return n

# ---------------------------------------------------------------- library

def load(slug):
    p = os.path.join(LIB, slug + '.md')
    if not os.path.isfile(p):
        sys.exit(f'No system called "{slug}". Try: ds.py list')
    text = open(p, encoding='utf8').read()
    fm = yaml.safe_load(text.split('---', 2)[1])
    fm['_slug'] = slug
    fm['_text'] = text
    return fm


def slugs():
    return sorted(f[:-3] for f in os.listdir(LIB) if f.endswith('.md') and f != 'CATALOG.md')


def resolve(d, v, depth=0):
    """Follow '{colors.x}' style references."""
    if isinstance(v, str) and depth < 5:
        m = re.fullmatch(r'\{(\w+)\.([\w.-]+)\}', v.strip())
        if m:
            return resolve(d, (d.get(m.group(1)) or {}).get(m.group(2)), depth + 1)
    return v


def pick(d, section, names):
    sec = d.get(section) or {}
    for n in names:
        if n in sec:
            return n, resolve(d, sec[n])
    return None, None


COLOR_ROLES = {
    'canvas': ['canvas', 'background', 'surface-canvas', 'canvas-light', 'bg'],
    'surface': ['surface-card', 'surface-1', 'surface', 'card', 'surface-soft', 'canvas-soft', 'surface-elevated', 'surface-light'],
    'surface-raised': ['surface-2', 'surface-elevated', 'surface-strong', 'surface-soft', 'surface-card-elevated'],
    'ink': ['ink', 'text', 'foreground', 'ink-primary'],
    'ink-muted': ['body', 'ink-muted', 'muted', 'text-secondary', 'body-muted', 'mute', 'ink-secondary', 'slate', 'charcoal'],
    'ink-subtle': ['ink-subtle', 'muted-soft', 'mute', 'muted', 'ink-tertiary', 'stone', 'ash', 'steel'],
    'hairline': ['hairline', 'border', 'hairline-soft', 'divider', 'border-default'],
    'primary': ['primary'],
    'on-primary': ['on-primary'],
    'primary-hover': ['primary-hover', 'primary-active', 'primary-deep', 'primary-pressed', 'primary-dark'],
    'accent': ['accent', 'accent-blue', 'secondary', 'brand-secondary'],
    'link': ['link', 'link-blue', 'accent-link'],
    'focus': ['focus-ring', 'focus', 'primary-focus', 'ring'],
    'success': ['success', 'semantic-success', 'green', 'positive'],
    'warning': ['warning', 'semantic-warning', 'amber', 'caution'],
    'error': ['error', 'semantic-error', 'danger', 'negative', 'red', 'destructive'],
}
# Standard semantic fallbacks, used only when a system never defines the state.
STATE_DEFAULT = {'success': (0.62, 0.15, 150), 'warning': (0.75, 0.15, 75), 'error': (0.58, 0.20, 27)}


def colour_roles(d):
    out, src = {}, {}
    for role, names in COLOR_ROLES.items():
        k, v = pick(d, 'colors', names)
        c = parse_color(v)
        if c:
            out[role], src[role] = c, k
    canvas = out.get('canvas') or (1, 1, 1, 1)
    out['canvas'] = canvas = over(canvas, (1, 1, 1, 1))
    for r in list(out):
        if out[r][3] < 1:
            out[r] = over(out[r], canvas)
    dark = luminance(canvas) < 0.2
    ink = out.setdefault('ink', (1, 1, 1, 1) if dark else (0.07, 0.07, 0.08, 1))
    mix = lambda a, b, t: tuple(a[i] * (1 - t) + b[i] * t for i in range(3)) + (1.0,)
    out.setdefault('surface', mix(canvas, ink, 0.04))
    out.setdefault('surface-raised', mix(canvas, ink, 0.08))
    out.setdefault('ink-muted', mix(ink, canvas, 0.3))
    out.setdefault('ink-subtle', mix(ink, canvas, 0.5))
    out.setdefault('hairline', mix(canvas, ink, 0.12))
    out.setdefault('primary', ink)
    out.setdefault('on-primary', best_on(out['primary']))
    out.setdefault('primary-hover', with_L(out['primary'], to_oklch(out['primary'])[0] + (0.08 if dark else -0.08)))
    out.setdefault('accent', out['primary'])
    out.setdefault('link', out['primary'] if contrast(out['primary'], canvas) >= 4.5 else out['ink'])
    out.setdefault('focus', out['primary'])
    for s, lch in STATE_DEFAULT.items():
        if s not in out:
            out[s], src[s] = from_oklch(*lch), '(default)'
    return out, src, dark


def best_on(c):
    return max(((1, 1, 1, 1), (0.05, 0.05, 0.06, 1)), key=lambda x: contrast(x, c))


TYPE_ROLES = {
    'display': ['display-xxl', 'display-xl', 'hero-display', 'display', 'display-hero', 'hero-title', 'h1'],
    'h1': ['display-lg', 'heading-xl', 'section-heading', 'display-2', 'h1', 'heading-lg'],
    'h2': ['display-md', 'heading-lg', 'heading-md', 'sub-heading', 'h2', 'headline', 'section-title'],
    'h3': ['display-sm', 'heading-md', 'title-lg', 'card-title', 'heading-sm', 'h3', 'feature-title', 'title-md'],
    'body-lg': ['body-lg', 'body-large', 'lead', 'subhead', 'body-xl'],
    'body': ['body-md', 'body', 'body-text', 'body-ui', 'paragraph', 'body-paragraph'],
    'small': ['body-sm', 'small', 'body-small', 'caption-lg'],
    'caption': ['caption', 'caption-sm', 'micro', 'label', 'caption-label'],
    'button': ['button-md', 'button', 'button-label', 'button-standard', 'nav-link'],
    'code': ['code', 'code-body', 'mono', 'code-md'],
}


def px(v, default=None):
    m = re.search(r'-?[\d.]+', str(v)) if v is not None else None
    if not m:
        return default
    n = float(m.group(0))
    return n * 16 if 'rem' in str(v) or 'em' in str(v) and 'px' not in str(v) else n


def type_roles(d):
    ty = {k: resolve(d, v) for k, v in (d.get('typography') or {}).items() if isinstance(v, dict)}
    out = {}
    for role, names in TYPE_ROLES.items():
        for n in names:
            if n in ty:
                out[role] = ty[n]
                break
    sized = sorted(ty.values(), key=lambda e: -(px(e.get('fontSize'), 0) or 0))
    if sized:
        out.setdefault('display', sized[0])
        out.setdefault('body', min(sized, key=lambda e: abs((px(e.get('fontSize'), 16) or 16) - 16)))
    body = out.get('body', {'fontFamily': 'system-ui', 'fontSize': '16px'})
    out.setdefault('body', body)
    for r in ('h1', 'h2', 'h3'):
        out.setdefault(r, out.get('display', body))
    out.setdefault('body-lg', body)
    out.setdefault('small', body)
    out.setdefault('caption', out['small'])
    out.setdefault('button', body)
    return out


def font_families(d, tr):
    first = lambda e: str(e.get('fontFamily') or 'system-ui').split(',')[0].strip(" '\"") if e else None
    display, body = first(tr['display']), first(tr['body'])
    mono = first(tr['code']) if 'code' in tr else None
    subs = substitutes(d.get('_text', ''))
    return display, body, mono, subs


def substitutes(text):
    m = re.search(r'#+[^\n]*(Font Substitut|Substitute)[^\n]*\n(.*?)(\n## |\n### |\Z)', text, re.S)
    if not m:
        return []
    names = re.findall(r'\*\*([A-Z][\w .&-]{1,40}?)\*\*', m.group(2))
    return [n.strip() for n in names if not re.search(r'weight|size|track|spacing|line|note', n, re.I)][:3]


def generic(name):
    n = name.lower()
    if re.search(r'mono|code|courier|jetbrains|menlo|consol', n):
        return 'ui-monospace, monospace'
    if re.search(r'serif|georgia|times|garamond|tiempos|lander|playfair|charter|copernicus', n) and 'sans' not in n:
        return 'Georgia, serif'
    return 'system-ui, sans-serif'


def stack(name, subs):
    names = [name] + [s for s in subs if s.lower() != name.lower()]
    return ', '.join(f'"{n}"' if ' ' in n else n for n in names if n and n != 'system-ui') + ', ' + generic(name)


def shape_roles(d):
    r = {k: resolve(d, v) for k, v in (d.get('rounded') or {}).items()}
    vals = {k: px(v) for k, v in r.items() if px(v) is not None}
    small = sorted(v for v in vals.values() if v < 100)
    ctrl = px(r.get('md') or r.get('sm'), small[len(small) // 2] if small else 8)
    card = px(r.get('lg') or r.get('xl'), max(small) if small else 12)
    comp = (d.get('components') or {})
    btn = comp.get('button-primary') or comp.get('button') or {}
    b = px(resolve(d, btn.get('rounded')))
    pill_buttons = b is not None and b >= 100
    if b is not None and b < 100:
        ctrl = b
    return {'control': ctrl, 'card': card, 'pill': 9999, 'pill_buttons': pill_buttons}


def shape_name(s):
    c = s['control']
    return 'pill' if s['pill_buttons'] else 'sharp' if c <= 2 else 'soft' if c <= 6 else 'round'


def space_roles(d):
    sp = {k: px(resolve(d, v)) for k, v in (d.get('spacing') or {}).items()}
    sp = {k: v for k, v in sp.items() if v is not None}
    base = sp.get('xs') or 8
    base = 4 if base <= 5 else 8
    section = sp.get('section') or sp.get('xxxl') or sp.get('xxl') or base * 12
    return {'base': base, 'section': section}


def density(tr, sp):
    body = px(tr['body'].get('fontSize'), 16) or 16
    return 'dense' if body <= 14 or sp['section'] <= 48 else 'airy' if sp['section'] >= 96 else 'balanced'

# ---------------------------------------------------------------- theme building

def build(args):
    parts = {}
    if args.mix:
        for kv in args.mix.split(','):
            k, v = kv.split('=')
            parts[k.strip()] = v.strip()
    base = args.src or parts.get('color') or next(iter(parts.values()), None)
    if not base:
        sys.exit('Give --from SLUG or --mix color=A,type=B,shape=C,space=D')
    src = {k: load(parts.get(k, base)) for k in ('color', 'type', 'shape', 'space')}
    colors, where, dark = colour_roles(src['color'])
    if args.brand:
        b = parse_color(args.brand)
        if not b:
            sys.exit(f'Not a colour: {args.brand}')
        colors['primary'] = b
        colors['on-primary'] = best_on(b)
        colors['primary-hover'] = with_L(b, to_oklch(b)[0] + (0.08 if dark else -0.08))
        colors['focus'] = b
        where['primary'] = '--brand'
    tr = type_roles(src['type'])
    fam = font_families(src['type'], tr)
    return dict(parts={k: v['_slug'] for k, v in src.items()}, colors=colors, where=where, dark=dark,
                type=tr, fonts=fam, shape=shape_roles(src['shape']), space=space_roles(src['space']))


PAIRS = [  # fg, bg, minimum ratio, what it is
    ('ink', 'canvas', 7.0, 'body text'),
    ('ink', 'surface', 4.5, 'text on cards'),
    ('ink-muted', 'canvas', 4.5, 'secondary text'),
    ('ink-muted', 'surface', 4.5, 'secondary text on cards'),
    ('ink-subtle', 'canvas', 3.0, 'placeholder / large meta'),
    ('on-primary', 'primary', 4.5, 'button label'),
    ('primary', 'canvas', 3.0, 'button / accent against page'),
    ('link', 'canvas', 4.5, 'links'),
    ('focus', 'canvas', 3.0, 'focus ring'),
    ('hairline', 'canvas', 1.2, 'dividers (visible, not loud)'),
    ('success', 'canvas', 3.0, 'success icon/badge'),
    ('warning', 'canvas', 3.0, 'warning icon/badge'),
    ('error', 'canvas', 4.5, 'error text'),
]


def fix_contrast(colors):
    """Return a corrected copy plus a list of what changed."""
    c, notes = dict(colors), []
    for fg, bg, target, what in PAIRS:
        if fg == 'hairline':
            continue
        before = contrast(c[fg], c[bg])
        if before >= target:
            continue
        if fg == 'on-primary':
            c['on-primary'] = best_on(c['primary'])
            if contrast(c['on-primary'], c['primary']) < target:
                c['primary'], _ = nudge(c['primary'], c['on-primary'], target)
                notes.append(f'primary {hexof(colors["primary"])} -> {hexof(c["primary"])} so {what} reaches {target}:1')
            else:
                notes.append(f'on-primary -> {hexof(c["on-primary"])} ({what})')
            continue
        c[fg], _ = nudge(c[fg], c[bg], target)
        notes.append(f'{fg} {hexof(colors[fg])} -> {hexof(c[fg])} ({what} {before:.2f} -> {contrast(c[fg], c[bg]):.2f}:1)')
    return c, notes


def counterpart(colors, to_dark):
    """Derive the opposite theme: mirror neutral lightness in OKLCH, keep hues, keep the brand colour."""
    out = {}
    tgt = {'canvas': 0.16, 'surface': 0.2, 'surface-raised': 0.24, 'hairline': 0.3} if to_dark else \
          {'canvas': 0.99, 'surface': 0.97, 'surface-raised': 0.95, 'hairline': 0.9}
    ink_t = {'ink': 0.96, 'ink-muted': 0.8, 'ink-subtle': 0.66} if to_dark else \
            {'ink': 0.2, 'ink-muted': 0.42, 'ink-subtle': 0.56}
    for k, v in colors.items():
        L, C, H = to_oklch(v)
        if k in tgt:
            out[k] = from_oklch(tgt[k], min(C, 0.03), H)
        elif k in ink_t:
            out[k] = from_oklch(ink_t[k], min(C, 0.02), H)
        else:
            out[k] = v
    for k in ('primary', 'link', 'focus', 'accent', 'success', 'warning', 'error'):
        out[k], _ = nudge(out[k], out['canvas'], 4.5 if k in ('link', 'error') else 3.0)
    out['on-primary'] = best_on(out['primary'])
    out['primary-hover'] = with_L(out['primary'], to_oklch(out['primary'])[0] + (0.08 if to_dark else -0.08))
    return out


def themes(t, mode):
    native = 'dark' if t['dark'] else 'light'
    fixed, notes = fix_contrast(t['colors'])
    res = {native: (fixed, notes)}
    if mode == 'both':
        other = counterpart(fixed, to_dark=not t['dark'])
        res['light' if t['dark'] else 'dark'] = fix_contrast(other)
    return native, res

# ---------------------------------------------------------------- output

def fmt_len(v):
    return f'{v:g}px'


def type_vars(t, prefix):
    out = []
    for role, e in t['type'].items():
        fs = px(e.get('fontSize'), 16)
        out.append((f'{prefix}{role}', f'{fs / 16:g}rem'))
        lh = e.get('lineHeight')
        if lh is not None:
            lhn = px(lh)
            if lhn is not None and 'px' in str(lh):
                lhn = round(lhn / fs, 3)
            out.append((f'{prefix}{role}--line-height', f'{lhn:g}'))
        if e.get('fontWeight') is not None:
            out.append((f'{prefix}{role}--font-weight', str(e['fontWeight'])))
        ls = e.get('letterSpacing')
        if ls not in (None, 'normal', '0', 0):
            n = px(ls)
            if n is not None:
                out.append((f'{prefix}{role}--letter-spacing', f'{n / fs:.3f}em' if 'px' in str(ls) else str(ls)))
    return out


def emit(t, fmt, mode):
    native, res = themes(t, mode)
    display, body, mono, subs = t['fonts']
    fonts = {'display': stack(display, subs), 'body': stack(body, subs),
             'mono': stack(mono, []) if mono and mono != 'None' else 'ui-monospace, SFMono-Regular, Menlo, monospace'}
    sh, sp = t['shape'], t['space']
    static = [('--font-' + k, v) for k, v in fonts.items()]
    static += [('--radius-control', fmt_len(sh['control'])), ('--radius-card', fmt_len(sh['card'])),
               ('--radius-pill', '9999px'), ('--radius-button', '9999px' if sh['pill_buttons'] else fmt_len(sh['control']))]
    static += [('--spacing', f'{sp["base"] / 16 / (2 if sp["base"] == 8 else 1):g}rem'), ('--space-section', fmt_len(sp['section']))]
    static += type_vars(t, '--text-')
    header = (f'/* Tokens from the ui-design library: colour={t["parts"]["color"]}, type={t["parts"]["type"]}, '
              f'shape={t["parts"]["shape"]}, space={t["parts"]["space"]}. Generated by ds.py; edit the source, not the output. */')
    notes = [n for _, ns in res.values() for n in ns]
    if fmt == 'json':
        return json.dumps({'source': t['parts'], 'native': native,
                           'themes': {k: {r: hexof(c) for r, c in v[0].items()} for k, v in res.items()},
                           'static': dict(static), 'contrastFixes': notes}, indent=2)
    col = lambda cs: [(f'--color-{r}', hexof(c)) for r, c in cs.items()]
    block = lambda sel, pairs: sel + ' {\n' + ''.join(f'  {k}: {v};\n' for k, v in pairs) + '}\n'
    other = next((k for k in res if k != native), None)
    lines = [header]
    if notes:
        lines.append('/* Contrast fixes applied: ' + '; '.join(notes) + ' */')
    if fmt == 'tailwind':
        lines.append(block('@theme', col(res[native][0]) + static))
        if other:
            lines.append(block(f'[data-theme="{other}"]', col(res[other][0])))
            lines.append(f'@media (prefers-color-scheme: {other}) {{\n' +
                         block(f'  :root:not([data-theme="{native}"])', col(res[other][0])).replace('\n  -', '\n    -').rstrip('\n').replace('\n}', '\n  }') + '\n}\n')
    else:
        lines.append(block(':root', col(res[native][0]) + static))
        if other:
            lines.append(block(f':root[data-theme="{other}"]', col(res[other][0])))
            inner = block(f':root:not([data-theme="{native}"])', col(res[other][0]))
            lines.append(f'@media (prefers-color-scheme: {other}) {{\n' + ''.join('  ' + l + '\n' for l in inner.rstrip().split('\n')) + '}\n')
    return '\n'.join(lines)

# ---------------------------------------------------------------- summaries

def summary(slug):
    d = load(slug)
    colors, where, dark = colour_roles(d)
    tr = type_roles(d)
    display, body, mono, subs = font_families(d, tr)
    sh, sp = shape_roles(d), space_roles(d)
    worst = []
    for fg, bg, target, what in PAIRS:
        r = contrast(colors[fg], colors[bg])
        if r < target and fg != 'hairline':
            worst.append(f'{what} {r:.1f}:1 (<{target:g})')
    desc = d.get('description') or ''
    desc = re.sub(r'\s+', ' ', str(desc)).strip()
    return {
        'slug': slug, 'category': CATEGORY_OF.get(slug, 'Other'), 'theme': 'dark' if dark else 'light',
        'productUI': slug in PRODUCT_UI,
        'accent': hexof(colors['primary']), 'accentHue': hue_name(colors['primary']),
        'canvas': hexof(colors['canvas']), 'ink': hexof(colors['ink']),
        'displayFont': display, 'bodyFont': body, 'monoFont': mono, 'fontSubstitutes': subs,
        'shape': shape_name(sh), 'radiusControl': sh['control'], 'radiusCard': sh['card'], 'pillButtons': sh['pill_buttons'],
        'displaySize': px(tr['display'].get('fontSize'), 0), 'bodySize': px(tr['body'].get('fontSize'), 16),
        'spaceBase': sp['base'], 'section': sp['section'], 'density': density(tr, sp),
        'contrastIssues': worst, 'summary': desc[:260] + ('…' if len(desc) > 260 else ''),
        'derivedRoles': sorted(r for r in COLOR_ROLES if r not in where),
    }


def cmd_build(_):
    rows = [summary(s) for s in slugs()]
    json.dump(rows, open(os.path.join(LIB, 'index.json'), 'w', encoding='utf8'), indent=1, ensure_ascii=False)
    out = ['# Design-system catalog', '',
           f'{len(rows)} systems. Generated by `scripts/ds.py build` from the files in this folder; do not edit by hand.', '',
           'Columns: theme of the original site · accent colour · display / body font (open substitute in brackets) · '
           'shape (sharp ≤2px, soft ≤6px, round, pill buttons) · density · ✓ = its own product is dense working UI, so it transfers to dashboards. '
           'Contrast column lists pairs that fail WCAG in the original; `ds.py tokens` fixes them automatically.', '']
    for cat in list(CATEGORY) + ['Other']:
        rs = [r for r in rows if r['category'] == cat]
        if not rs:
            continue
        out += [f'## {cat}', '', '| System | Theme | Accent | Type | Shape | Density | App UI | Contrast | Feel |',
                '|---|---|---|---|---|---|---|---|---|']
        for r in rs:
            sub = f' ({r["fontSubstitutes"][0]})' if r['fontSubstitutes'] else ''
            ty = r['displayFont'] + sub + ('' if r['bodyFont'] == r['displayFont'] else ' / ' + r['bodyFont'])
            feel = r['summary'].split('. ')[0][:140].replace('|', '/')
            out.append(f'| `{r["slug"]}` | {r["theme"]} | `{r["accent"]}` {r["accentHue"]} | {ty} | {r["shape"]} | '
                       f'{r["density"]} | {"✓" if r["productUI"] else ""} | {len(r["contrastIssues"]) or "ok"} | {feel} |')
        out.append('')
    open(os.path.join(LIB, 'CATALOG.md'), 'w', encoding='utf8').write('\n'.join(out))
    print(f'Built index.json and CATALOG.md for {len(rows)} systems')


def cmd_list(a):
    p = os.path.join(LIB, 'index.json')
    rows = json.load(open(p, encoding='utf8')) if os.path.isfile(p) else [summary(s) for s in slugs()]
    q = (a.q or '').lower()
    for r in rows:
        if a.theme and r['theme'] != a.theme: continue
        if a.category and a.category.lower() not in r['category'].lower(): continue
        if a.shape and r['shape'] != a.shape: continue
        if a.app and not r['productUI']: continue
        if q and q not in json.dumps(r).lower(): continue
        print(f'{r["slug"]:<14} {r["theme"]:<5} {r["accent"]} {r["accentHue"]:<8} {r["shape"]:<5} {r["density"]:<8} '
              f'{"app " if r["productUI"] else "    "}{r["displayFont"][:22]:<22} {r["summary"][:70]}')


def cmd_show(a):
    print(json.dumps(summary(a.slug), indent=2, ensure_ascii=False))
    print(f'\nFull analysis: library/{a.slug}.md')


def cmd_tokens(a):
    t = build(a)
    s = emit(t, a.format, a.themes)
    if a.out:
        open(a.out, 'w', encoding='utf8').write(s)
        print(f'Wrote {a.out}')
    else:
        print(s)


def cmd_check(a):
    t = build(a)
    native, res = themes(t, 'both')
    raw = t['colors']
    print(f'Source: {t["parts"]}   native theme: {native}\n')
    print('Original values:')
    for fg, bg, target, what in PAIRS:
        r = contrast(raw[fg], raw[bg])
        mark = 'ok ' if r >= target else 'FAIL'
        print(f'  {mark} {r:5.2f}:1  need {target:g}  {fg} on {bg}  ({what})')
    for name, (cs, notes) in res.items():
        print(f'\n{name} theme after fixes:', 'no changes needed' if not notes else '')
        for n in notes:
            print('  -', n)


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    l = sub.add_parser('list'); l.add_argument('--theme'); l.add_argument('--category'); l.add_argument('--shape')
    l.add_argument('--q'); l.add_argument('--app', action='store_true', help='only systems whose tokens suit dense app UI')
    s = sub.add_parser('show'); s.add_argument('slug')
    for n in ('tokens', 'check'):
        p = sub.add_parser(n)
        p.add_argument('--from', dest='src'); p.add_argument('--mix'); p.add_argument('--brand')
        if n == 'tokens':
            p.add_argument('--format', default='css', choices=['css', 'tailwind', 'json'])
            p.add_argument('--themes', default='both', choices=['both', 'native'])
            p.add_argument('--out')
    sub.add_parser('build')
    a = ap.parse_args()
    {'list': cmd_list, 'show': cmd_show, 'tokens': cmd_tokens, 'check': cmd_check, 'build': cmd_build}[a.cmd](a)


if __name__ == '__main__':
    main()
