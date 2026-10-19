"""
Version anglaise du site Delphinium, générée à partir des pages françaises.
  python tools/build_pages.py   (appelle ce module à la fin)
- textes : dictionnaire tools/i18n/en.json  { "texte français exact": "English text" }
- liens  : chaque page française a son équivalent anglais (table PAGES)
- pages légales : fragments anglais dans tools/legal/en/
- ajoute le sélecteur FR · EN et les balises hreflang sur les deux versions
"""
import os, re, json, html

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, '..', 'site')
URL = 'https://delphinium.pro'
M = json.load(open(os.path.join(ROOT, 'i18n', 'en.json'), encoding='utf-8'))

# page française -> page anglaise
PAGES = [('/', '/en/'), ('/contact/', '/en/contact/'), ('/merci/', '/en/thank-you/'),
         ('/mentions-legales/', '/en/legal-notice/'), ('/confidentialite/', '/en/privacy/'), ('/cgv/', '/en/terms/'),
         ('/realisations/ashford/', '/en/projects/ashford/'), ('/404.html', '/en/404.html')]
PREFIX = [(fr, en) for fr, en in PAGES if fr != '/']


def file_of(path):
    return os.path.join(SITE, path.strip('/'), 'index.html') if path.endswith('/') else os.path.join(SITE, path.strip('/'))


def en_url(u):
    """Réécrit un lien interne vers sa version anglaise (les fichiers, images, etc. ne bougent pas)."""
    if not u.startswith('/') or u.startswith('//'):
        return u
    if u == '/':
        return '/en/'
    if u.startswith('/#'):
        return '/en/' + u[1:]
    if u.startswith('/realisations/corolle/'):
        return '/realisations/corolle/?lang=en'
    if u.startswith('/configurateur/'):
        return '/configurateur/?lang=en'
    for fr, en in PREFIX:
        if u.startswith(fr):
            return en + u[len(fr):]
    return u


def switch(fr, en, lang):
    cur = lambda l: ' aria-current="true"' if l == lang else ''
    lab = 'Langue' if lang == 'fr' else 'Language'
    return (f'<div class="lang-switch" role="navigation" aria-label="{lab}">'
            f'<a href="{fr}" lang="fr" hreflang="fr"{cur("fr")}>FR</a><span aria-hidden="true"></span>'
            f'<a href="{en}" lang="en" hreflang="en"{cur("en")}>EN</a></div>')


def hreflang(fr, en, index):
    if not index:
        return ''
    return (f'<link rel="alternate" hreflang="fr" href="{URL}{fr}">\n'
            f'<link rel="alternate" hreflang="en" href="{URL}{en}">\n'
            f'<link rel="alternate" hreflang="x-default" href="{URL}{fr}">\n')


def put_switch_and_alternates(s, fr, en, lang):
    s = re.sub(r'<div class="lang-switch"[^>]*>.*?</div>', switch(fr, en, lang), s, count=1, flags=re.S)
    s = re.sub(r'<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n', '', s)
    index = 'noindex' not in s
    return s.replace('</head>', hreflang(fr, en, index) + '</head>', 1)


SKIP = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>)', re.S)
missing = set()


def tr_text(seg):
    def text(m):
        raw = m.group(1)
        key = ' '.join(html.unescape(raw).split())
        if not key or (key not in M and not re.search(r'[A-Za-zÀ-ÿ]', key)):
            return m.group(0)
        if key in M:
            lead = raw[:len(raw) - len(raw.lstrip())]; trail = raw[len(raw.rstrip()):]
            return '>' + lead + html.escape(M[key], quote=False) + trail + '<'
        missing.add(key)
        return m.group(0)
    seg = re.sub(r'>([^<>]+)<', text, seg)

    def attr(m):
        name, val = m.group(1), m.group(2)
        key = html.unescape(val)
        if key in M:
            return f'{name}="{html.escape(M[key], quote=True)}"'
        if name in ('alt', 'aria-label', 'title', 'placeholder') and re.search(r'[a-zà-ÿ]{3}', key):
            missing.add(key)
        return m.group(0)
    seg = re.sub(r'\b(alt|aria-label|title|placeholder|content|value)="([^"]*)"', attr, seg)
    seg = re.sub(r'\b(href|action)="([^"]*)"', lambda m: f'{m.group(1)}="{en_url(m.group(2))}"', seg)
    return seg


def translate(s, fr, en):
    parts = SKIP.split(s)
    s = ''.join(p if SKIP.fullmatch(p) else tr_text(p) for p in parts)
    s = s.replace('<html lang="fr"', '<html lang="en"', 1).replace('name="langue" value="fr"', 'name="langue" value="en"')
    s = s.replace('content="fr_FR"', 'content="en_GB"')
    s = s.replace(f'<link rel="canonical" href="{URL}{fr}">', f'<link rel="canonical" href="{URL}{en}">')
    s = s.replace(f'<meta property="og:url" content="{URL}{fr}">', f'<meta property="og:url" content="{URL}{en}">')
    # données structurées de l'accueil
    s = s.replace('"inLanguage": "fr-FR"', '"inLanguage": "en-GB"')
    s = s.replace('"@id": "https://delphinium.pro/#page",\n  "url": "https://delphinium.pro/"', '"@id": "https://delphinium.pro/en/#page",\n  "url": "https://delphinium.pro/en/"')
    s = s.replace('"name": "Configurateurs 3D pour la bijouterie et le luxe"', '"name": "3D configurators for fine jewellery and luxury"')
    s = s.replace('"description": "Studio parisien de configurateurs 3D temps réel pour la bijouterie, l’horlogerie et le luxe."',
                  '"description": "Paris studio crafting real-time 3D configurators for fine jewellery, watchmaking and luxury houses."')
    return s


def build(legal_en=None):
    """legal_en : {'/mentions-legales/': fragment anglais, ...} injecté à la place de l'article français."""
    for fr, en in PAGES:
        src = file_of(fr)
        if not os.path.exists(src):
            continue
        s = open(src, encoding='utf-8').read()
        s = put_switch_and_alternates(s, fr, en, 'fr')
        open(src, 'w', encoding='utf-8').write(s)
        e = s
        if legal_en and fr in legal_en:
            e = re.sub(r'(<article class="legal-doc reveal">\n).*?(\n    </article>)', lambda m: m.group(1) + legal_en[fr] + m.group(2), e, count=1, flags=re.S)
        e = translate(e, fr, en)
        e = put_switch_and_alternates(e, fr, en, 'en')
        dst = file_of(en)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        open(dst, 'w', encoding='utf-8').write(e)
        print('EN', os.path.relpath(dst, SITE))
    if missing:
        print('\nTextes sans traduction (à ajouter dans tools/i18n/en.json) :')
        for k in sorted(missing):
            print('  -', k)
