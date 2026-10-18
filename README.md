# Delphinium Interactive — site delphinium.pro

## Lancer en local

Depuis ce dossier (racine du dépôt) :

```
node tools/serveur-site.mjs
```

puis ouvrir http://localhost:5180. Le serveur imite Netlify : URLs propres, page 404, en-têtes de `_headers`, et l'envoi du formulaire redirige vers `/merci/` sans rien enregistrer.

## Mise en ligne (Netlify)

- **Dossier publié : `site/`** (fixé par `netlify.toml`). `tools/` et `docs/` ne sont pas publiés.
- Formulaire : Netlify détecte le formulaire `contact` au déploiement (attribut `data-netlify`). Les réponses arrivent dans Netlify > Forms, comme avant (même nom de formulaire que l'ancien site). Penser à activer la notification par e-mail.
- Domaine : `delphinium.pro` en HTTPS. Après la mise en ligne, déclarer le site et `sitemap.xml` dans Google Search Console et Bing Webmaster Tools.

## Arborescence publiée (`site/`)

| Chemin | Rôle |
| --- | --- |
| `index.html` | Accueil : scène 3D au scroll, Studio, collection Spire, ROI sourcé, méthode, offres, contact, configurateurs précédents |
| `configurateur/` | Configurateur Spire (Vectary). `?piece=bague\|bracelet\|collier` ouvre la pièce choisie |
| `contact/` · `merci/` | Questionnaire en 3 étapes (Netlify Forms) et page de remerciement |
| `mentions-legales/` · `confidentialite/` · `cgv/` | Pages légales |
| `realisations/corolle/` | Ancien configurateur Bague Corolle |
| `404.html` | Page d'erreur |
| `css/` · `js/` | Styles et scripts (`experience.js` = scène 3D, `site.js` = sections, `contact.js` = questionnaire) |
| `vendor/three/` | Three.js 0.169 auto-hébergé (licence MIT) |
| `assets/` | Modèles 3D, textures, HDRI, rendus, polices (OFL), logo, image de partage |
| `_headers` · `_redirects` | En-têtes de sécurité et de cache, redirections des anciennes adresses |
| `robots.txt` · `sitemap.xml` · `site.webmanifest` · `llms.txt` | Référencement |

## Outils (non publiés, `tools/`)

- Rapport d'audit performance / accessibilité / navigateurs : `docs/AUDIT-site.md` (local uniquement, exclu du dépôt).

- `build_pages.py` : régénère contact, merci, pages légales et 404 (en-tête et pied de page communs). Les textes légaux sont dans `tools/legal/`.
- `og/og.html` : source de l'image de partage (`assets/og/delphinium-og.jpg`).
- `serveur-site.mjs` : serveur local.

## Version anglaise

- Générée automatiquement sous `site/en/` par `python tools/build_pages.py` (qui appelle `tools/i18n_en.py`) à partir des pages françaises : **ne jamais modifier `site/en/` à la main**.
- Textes : `tools/i18n/en.json` (« texte français exact » → traduction). Après une modification du texte français, relancer le script : il liste les textes sans traduction à ajouter.
- Pages légales anglaises : `tools/legal/en/` (la version française prévaut).
- Correspondance des adresses : `/contact/` ↔ `/en/contact/`, `/merci/` ↔ `/en/thank-you/`, `/mentions-legales/` ↔ `/en/legal-notice/`, `/confidentialite/` ↔ `/en/privacy/`, `/cgv/` ↔ `/en/terms/`, `/realisations/ashford/` ↔ `/en/projects/ashford/`. Le configurateur est commun (`?lang=en`).

## Sécurité

- Chaque page déclare sa propre politique de sécurité (CSP) dans son `<head>`. Le configurateur et la page Corolle autorisent leurs scripts par empreinte sha256 : **après toute modification d'un script intégré, recalculer l'empreinte**, sinon le navigateur le bloque.
- Aucun service tiers sur le site vitrine (polices et Three.js auto-hébergés, pas d'analytics). Seuls le configurateur et la page Corolle chargent Vectary.

## À compléter avant la mise en ligne

- Faire relire les pages légales par un juriste (voir les points listés lors de leur rédaction).
