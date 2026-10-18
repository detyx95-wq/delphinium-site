"""
Génère les pages secondaires du site Delphinium (dossier ../site).
  python tools/build_pages.py
Pages : contact (questionnaire Netlify Forms), merci, mentions légales,
confidentialité, CGV, 404. En-tête, pied de page, croquis et SEO partagés.
Les textes légaux sont dans tools/legal/*.html (fragments).
"""
import os, json, html

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(ROOT, '..', 'site')
URL = 'https://delphinium.pro'
OG = URL + '/assets/og/delphinium-og.jpg'

# Politique de sécurité des pages secondaires : uniquement des ressources du site lui-même
CSP = ("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; "
       "font-src 'self'; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; "
       "frame-src 'none'; manifest-src 'self'; upgrade-insecure-requests")

DEFS = '''<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <defs>
    <filter id="pencil" x="-15%" y="-25%" width="130%" height="150%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="1" seed="7"/><feDisplacementMap in="SourceGraphic" scale="1.1"/></filter>
    <symbol id="mk-diamond" viewBox="0 0 12 12"><path d="M6 1L11 6L6 11L1 6Z"/></symbol>
    <symbol id="mk-cross" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.6"/><path d="M6 1.4V10.6M1.4 6H10.6"/></symbol>
    <symbol id="bp-ring" viewBox="0 0 400 400">
      <g filter="url(#pencil)" stroke="#C4A97D" stroke-opacity=".55" stroke-width="1">
        <circle cx="200" cy="200" r="150" pathLength="1"/><circle cx="200" cy="200" r="118" pathLength="1"/>
        <path d="M200 20V380M20 200H380" pathLength="1" stroke-dasharray=".02 .012"/>
      </g>
      <g filter="url(#pencil)" stroke="#5B4ECC" stroke-opacity=".24" stroke-width="1">
        <circle cx="200" cy="200" r="166" pathLength="1"/>
        <path d="M50 392H350M50 384V400M350 384V400" pathLength="1"/><path d="M392 82V318M384 82H400M384 318H400" pathLength="1"/>
        <path d="M200 50L306 94L350 200" pathLength="1"/><rect x="182" y="34" width="36" height="32" pathLength="1"/>
      </g>
    </symbol>
  </defs>
</svg>'''

HEADER = '''<a class="skip" href="#contenu">Aller au contenu</a>
<header class="top">
  <a class="brandmark" href="/" aria-label="Delphinium Interactive — accueil" data-sketch>
    <span class="plate"><img src="/assets/brand/logo-delphinium-380.webp" srcset="/assets/brand/logo-delphinium-380.webp 380w, /assets/brand/logo-delphinium.webp 760w" sizes="(max-width:820px) 150px, 206px" width="760" height="236" alt="Delphinium — 3D Experience"></span>
  </a>
  <nav class="nav" aria-label="Navigation principale">
    <a href="/#studio">Studio</a>
    <a href="/#spire">Collection</a>
    <a href="/#roi">ROI</a>
    <a href="/#methode">Méthode</a>
    <a href="/#offres">Offres</a>
    <div class="lang-switch"></div>
    <a class="nav-cta" href="/contact/">Demander une démo</a>
  </nav>
</header>'''

FOOTER = '''<footer class="foot compact">
  <div class="foot-top">
    <div>
      <p class="invite">Parlons de votre catalogue.</p>
      <a class="btn light" href="/contact/"><span>Démarrer un projet</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
    </div>
    <ul class="foot-links">
      <li><a href="/">Accueil</a></li>
      <li><a href="/configurateur/">Configurateur Spire</a></li>
      <li><a href="/contact/">Contact</a></li>
    </ul>
  </div>
  <div class="legal"><span>© 2026 Delphinium Interactive · Paris</span><nav class="legal-links" aria-label="Informations légales"><a href="/mentions-legales/">Mentions légales</a><a href="/confidentialite/">Confidentialité</a><a href="/cgv/">CGV</a></nav></div>
  <p class="wordmark" aria-hidden="true">DELPHINIUM</p>
</footer>'''


def head(title, desc, path, index=True, extra='', csp=None):
    canon = URL + path
    robots = 'index, follow, max-image-preview:large' if index else 'noindex, follow'
    t, d = html.escape(title), html.escape(desc)
    return f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="{csp or CSP}">
<title>{t}</title>
<meta name="description" content="{d}">
<meta name="robots" content="{robots}">
{f'<link rel="canonical" href="{canon}">' if index else ''}
<meta name="theme-color" content="#F4F3FA">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Delphinium Interactive">
<meta property="og:locale" content="fr_FR">
<meta property="og:url" content="{canon}">
<meta property="og:title" content="{t}">
<meta property="og:description" content="{d}">
<meta property="og:image" content="{OG}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/brand/favicon.ico" sizes="any">
<link rel="icon" href="/assets/brand/favicon.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" href="/assets/fonts/cormorant-garamond-latin-500-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/jost-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/css/fonts.css">
<link rel="stylesheet" href="/css/site.css">
<link rel="stylesheet" href="/css/pages.css">
{extra}</head>'''


def page(path, title, desc, body, index=True, scripts=('/js/site.js',), extra='', footer=True, csp=None):
    out = head(title, desc, path, index, extra, csp) + '\n<body>\n' + DEFS + '\n' + HEADER + '\n<main id="contenu">\n' + body + '\n</main>\n'
    if footer:
        out += FOOTER + '\n'
    out += ''.join(f'<script type="module" src="{s}"></script>\n' for s in scripts) + '</body>\n</html>\n'
    target = os.path.join(SITE, path.strip('/'), 'index.html') if path.endswith('/') else os.path.join(SITE, path.strip('/'))
    os.makedirs(os.path.dirname(target), exist_ok=True)
    open(target, 'w', encoding='utf-8').write(out)
    print('écrit', os.path.relpath(target, SITE))


# ---------------------------------------------------------------- légal
LEGAL = [('/mentions-legales/', 'mentions-legales', 'Mentions légales — Delphinium Interactive',
          'Mentions légales du site delphinium.pro : éditeur Delphinium SAS, Paris, directeur de la publication, hébergeur Netlify, propriété intellectuelle et crédits.'),
         ('/confidentialite/', 'confidentialite', 'Politique de confidentialité — Delphinium Interactive',
          'Données personnelles et cookies sur delphinium.pro : aucun traceur publicitaire ni analytics, formulaire Netlify Forms, configurateur Vectary, vos droits RGPD.'),
         ('/cgv/', 'cgv', 'Conditions générales de vente — Delphinium Interactive',
          'Conditions générales de vente des prestations de configurateurs 3D Delphinium pour les professionnels : offres, devis, paiement, révisions, propriété intellectuelle.')]
NAV_NAMES = {'mentions-legales': 'Mentions légales', 'confidentialite': 'Confidentialité', 'cgv': 'Conditions générales de vente'}
for path, slug, title, desc in LEGAL:
    frag = open(os.path.join(ROOT, 'legal', slug + '.html'), encoding='utf-8').read()
    aside = '\n'.join(f'    <a href="/{k}/"{" aria-current=\"page\"" if k == slug else ""}>{v}</a>' for k, v in NAV_NAMES.items())
    body = f'''<div class="page sec">
  <svg class="blueprint bp-solo" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><use href="#bp-ring"/></svg>
  <div class="legal-page">
    <nav class="legal-aside" aria-label="Pages légales">
{aside}
    </nav>
    <article class="legal-doc reveal">
{frag}
    </article>
  </div>
</div>'''
    page(path, title, desc, body)

# ---------------------------------------------------------------- contact
SECTEURS = [('Bijouterie', 'bagues, colliers, joaillerie'), ('Horlogerie', 'montres, bracelets, cadrans'),
            ('Maroquinerie', 'sacs, petite maroquinerie'), ('Mode haut de gamme', 'prêt-à-porter, accessoires'),
            ('Cosmétique premium', 'flacons, coffrets'), ('Papeterie de luxe', 'stylos, écritoires'), ('Autre secteur', '')]
SOURCES = [('Recherche Google', ''), ('Instagram ou LinkedIn', ''), ('Bouche-à-oreille', 'un client, un partenaire'),
           ('Salon ou événement', ''), ('Autre', '')]

def choices(name, items):
    rows = []
    for i, (lab, sub) in enumerate(items):
        v = html.escape(lab)
        rows.append(f'''        <label class="choice"><input type="radio" name="{name}" value="{v}"{' required' if i == 0 else ''}><span class="mk" aria-hidden="true"></span><span class="lbl">{v}</span>{f'<span class="sub">{html.escape(sub)}</span>' if sub else ''}</label>''')
    return '\n'.join(rows)

contact_body = f'''<div class="page sec">
  <svg class="blueprint bp-solo bp-screen" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><use href="#bp-ring"/></svg>
  <div class="contact-page">
    <div class="contact-intro">
      <h1 class="reveal">Parlons de votre projet</h1>
      <p class="reveal">Trois questions, moins d’une minute. Nous revenons vers vous sous 24 heures avec une première proposition.</p>
      <div class="track reveal" aria-hidden="true">
        <svg viewBox="0 0 420 30" preserveAspectRatio="none">
          <path class="base" d="M0 14H420M0 7V21M210 7V21M420 7V21"/>
          <path class="fill" pathLength="1" d="M0 14H420"/>
        </svg>
        <ol><li class="on">Secteur</li><li>Découverte</li><li>Coordonnées</li></ol>
      </div>
      <p class="alt reveal">Vous préférez écrire directement ? <a href="mailto:contact@delphinium.pro">contact@delphinium.pro</a></p>
    </div>

    <form class="quiz glass reveal" name="contact" method="POST" action="/merci/" data-netlify="true" netlify-honeypot="bot-field" data-sketch novalidate>
      <input type="hidden" name="form-name" value="contact">
      <input type="hidden" name="langue" value="fr">
      <p class="hp" aria-hidden="true"><label>Ne pas remplir <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>

      <fieldset class="qstep on" data-step="0">
        <legend>Dans quel secteur êtes-vous ?</legend>
        <p class="hint-q">Pour vous montrer des exemples qui vous parlent.</p>
        <div class="choices">
{choices('secteur', SECTEURS)}
        </div>
        <div class="quiz-nav"><button type="button" class="back">Retour</button></div>
      </fieldset>

      <fieldset class="qstep" data-step="1">
        <legend>Comment nous avez-vous connus ?</legend>
        <p class="hint-q">Une seule réponse suffit.</p>
        <div class="choices">
{choices('source', SOURCES)}
        </div>
        <div class="quiz-nav"><button type="button" class="back">Retour</button></div>
      </fieldset>

      <fieldset class="qstep" data-step="2">
        <legend>Où pouvons-nous vous répondre ?</legend>
        <p class="hint-q">Par e-mail ou par téléphone, comme vous préférez.</p>
        <div class="seg" role="radiogroup" aria-label="Moyen de contact">
          <label><input type="radio" name="preference" value="E-mail" checked><span>Par e-mail</span></label>
          <label><input type="radio" name="preference" value="Téléphone"><span>Par téléphone</span></label>
        </div>
        <div class="field" data-for="mail"><label for="f-email">Adresse e-mail</label><input id="f-email" type="email" name="email" autocomplete="email" inputmode="email" maxlength="160" placeholder="prenom@maison.fr"></div>
        <div class="field hide" data-for="tel"><label for="f-tel">Numéro de téléphone</label><input id="f-tel" type="tel" name="telephone" autocomplete="tel" inputmode="tel" maxlength="30" placeholder="06 12 34 56 78"></div>
        <div class="field"><label for="f-maison">Votre maison <span class="opt">(facultatif)</span></label><input id="f-maison" type="text" name="maison" autocomplete="organization" maxlength="120"></div>
        <div class="field"><label for="f-msg">Votre projet en quelques mots <span class="opt">(facultatif)</span></label><textarea id="f-msg" name="message" maxlength="2000"></textarea></div>
        <p class="err" role="alert" aria-live="assertive"></p>
        <div class="quiz-nav">
          <button type="button" class="back">Retour</button>
          <button type="submit" class="btn"><span>Envoyer ma demande</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></button>
        </div>
        <p class="rgpd">Vos réponses servent uniquement à vous recontacter au sujet de votre projet. Elles sont conservées trois ans au plus après notre dernier échange, puis supprimées. Vous pouvez y accéder, les corriger ou les faire effacer à tout moment : voir notre <a href="/confidentialite/">politique de confidentialité</a>.</p>
      </fieldset>
    </form>
  </div>
</div>'''
page('/contact/', 'Contact — démarrer un projet de configurateur 3D | Delphinium',
     'Décrivez votre projet de configurateur 3D en trois questions : secteur, découverte, coordonnées. Réponse sous 24 heures par le studio Delphinium à Paris.',
     contact_body, scripts=('/js/site.js', '/js/contact.js'))

# ---------------------------------------------------------------- merci
DUST = '<div class="dust" aria-hidden="true">' + ''.join(
    f'<i style="left:{(i*37)%100}%;top:{20+(i*53)%70}%;--dx:{(i%5-2)*30}px;--dy:{-40-(i%4)*30}px;animation-delay:{(i%9)*.6}s"></i>' for i in range(28)) + '</div>'
page('/merci/', 'Merci — votre demande est bien arrivée | Delphinium',
     'Votre demande a bien été transmise au studio Delphinium. Nous revenons vers vous sous 24 heures.',
     f'''<div class="page sec solo">
  <svg class="blueprint bp-solo" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><use href="#bp-ring"/></svg>
  {DUST}
  <h1 class="big reveal">Merci, c’est noté.</h1>
  <p class="reveal">Votre demande est arrivée à l’atelier. Nous revenons vers vous sous 24 heures avec une première proposition.</p>
  <div class="actions reveal">
    <a class="btn" href="/configurateur/"><span>Essayer le configurateur</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
    <a class="btn ghost" href="/"><span>Retour à l’accueil</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
  </div>
</div>''', index=False, footer=False)

# ---------------------------------------------------------------- 404
page('/404.html', 'Page introuvable — Delphinium Interactive',
     'Cette page n’existe pas ou plus. Retrouvez la collection Spire et nos configurateurs 3D sur delphinium.pro.',
     f'''<div class="page sec solo">
  <svg class="blueprint bp-solo" viewBox="0 0 400 400" aria-hidden="true" focusable="false"><use href="#bp-ring"/></svg>
  {DUST}
  <p class="code reveal">Erreur 404</p>
  <h1 class="big reveal">Cette page s’est dématérialisée.</h1>
  <p class="reveal">Le lien est peut-être ancien, ou la page a changé d’adresse. La collection, elle, est toujours là.</p>
  <div class="actions reveal">
    <a class="btn" href="/"><span>Retour à l’accueil</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
    <a class="btn ghost" href="/configurateur/"><span>Ouvrir le configurateur</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
    <a class="btn ghost" href="/contact/"><span>Nous écrire</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
  </div>
</div>''', index=False, footer=False)

# ---------------------------------------------------------------- ancien configurateur : stylo Ashford
# Seule page (avec /configurateur/ et Corolle) autorisée à afficher Vectary
CSP_VECTARY = CSP.replace("frame-src 'none'", "frame-src https://app.vectary.com")
page('/realisations/ashford/', 'Stylo Ashford — configurateur 3D d’écritoire de luxe | Delphinium',
     'Le stylo plume Ashford et son écrin, présentés en 3D temps réel dans un bureau : une démonstration de configurateur 3D réalisée par le studio Delphinium.',
     '''<div class="page sec">
  <div class="realisation">
    <div class="realisation-intro">
      <p class="code reveal"><a href="/#anciens-titre">Configurateurs précédents</a></p>
      <h1 class="reveal">Stylo Ashford</h1>
      <p class="reveal">Un stylo plume en bois précieux et laiton, posé au-dessus de son écrin dans un bureau tamisé. Une de nos premières démonstrations, avant la collection Spire.</p>
      <ul class="facts reveal">
        <li>Rotation et zoom libres</li>
        <li>Scène complète : lumière, mobilier, matières</li>
        <li>Lecture sur ordinateur et mobile</li>
      </ul>
      <div class="actions reveal">
        <a class="btn" href="/contact/"><span>Un projet similaire ?</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
        <a class="btn ghost" href="/configurateur/"><span>Voir la collection Spire</span><svg viewBox="0 0 18 8" aria-hidden="true"><path d="M0 4H17M13.5 .5L17 4L13.5 7.5"/></svg></a>
      </div>
    </div>
    <figure class="viewer3d reveal" data-sketch>
      <iframe src="https://app.vectary.com/p/2yVn04SUkDqOO85BQ6W8dx" title="Scène 3D : stylo plume Ashford et son écrin"
              allow="fullscreen; xr-spatial-tracking" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"
              sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
      <figcaption>Faites glisser pour tourner, pincez ou faites défiler pour zoomer.</figcaption>
    </figure>
  </div>
</div>''', csp=CSP_VECTARY)

# ---------------------------------------------------------------- version anglaise (et sélecteur FR · EN partout)
import i18n_en
LEGAL_EN = {'/mentions-legales/': 'legal-notice', '/confidentialite/': 'privacy', '/cgv/': 'terms'}
i18n_en.build({fr: open(os.path.join(ROOT, 'legal', 'en', f + '.html'), encoding='utf-8').read() for fr, f in LEGAL_EN.items()})
