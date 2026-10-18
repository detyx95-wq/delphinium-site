/* =====================================================================
   DELPHINIUM — comportements des sections (hors scène 3D)
   - contours « croquis » (repris du logo / CTA du configurateur) sur [data-sketch]
   - entrées décalées des éléments .reveal, tracé des dessins techniques
   - le nom du pied de page grandit à l'approche (mouvement signature)
   ===================================================================== */
document.documentElement.classList.add('js');

const SVGNS = 'http://www.w3.org/2000/svg';
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- contours croquis : traits qui débordent, cotes, losange et viseur ---------- */
const SKETCH = `
  <g class="s1" filter="url(#pencil)"><path d="M-7 .6L107 -.3"/><path d="M99.5 -12L100.2 113"/><path d="M106 99.4L-6 100.2"/><path d="M.3 112L-.4 -11"/></g>
  <g class="s2" filter="url(#pencil)"><path d="M-3 -2.6L104 -2"/><path d="M102.2 -7L101.6 107"/><path d="M104 102.8L-2 102.2"/><path d="M-2.3 106L-1.8 -6"/></g>
  <g class="dim"><path d="M0 116H100M0 112V120M100 112V120"/><path d="M-7 0V100M-10 0H-4M-10 100H-4"/></g>`;
function mark(cls, id){
  const s = document.createElementNS(SVGNS,'svg');
  s.setAttribute('class','mark '+cls); s.setAttribute('viewBox','0 0 12 12'); s.setAttribute('aria-hidden','true');
  const u = document.createElementNS(SVGNS,'use'); u.setAttribute('href', id); s.append(u);
  return s;
}
document.querySelectorAll('[data-sketch]').forEach(el => {
  const s = document.createElementNS(SVGNS,'svg');
  s.setAttribute('class','sketch'); s.setAttribute('viewBox','0 0 100 100');
  s.setAttribute('preserveAspectRatio','none'); s.setAttribute('aria-hidden','true');
  s.innerHTML = SKETCH;                                   // constante du fichier, aucune donnée externe
  el.append(s, mark('mark-tl','#mk-diamond'), mark('mark-br','#mk-cross'));
});

/* ---------- entrées : chaque section révèle ses éléments en cascade ---------- */
const io = new IntersectionObserver(entries => {
  for(const e of entries){
    if(!e.isIntersecting) continue;
    const el = e.target;
    if(el.classList.contains('sec')){
      el.classList.add('in');
      el.querySelectorAll('.reveal').forEach((r,i) => r.style.transitionDelay = RM ? '0s' : `${Math.min(i,8)*75}ms`);
    }else el.classList.add('in');
    io.unobserve(el);
  }
}, { rootMargin:'0px 0px -12% 0px', threshold:.08 });
document.querySelectorAll('.sec, .reveal, [data-sketch]').forEach(el => io.observe(el));
// filet de sécurité : si l'observateur ne répond pas (onglet en arrière-plan, navigateur ancien),
// tout ce qui est déjà à l'écran apparaît quand même : aucun contenu ne reste caché
const showVisible = () => document.querySelectorAll('.reveal:not(.in), .sec:not(.in), [data-sketch]:not(.in)').forEach(el => {
  if(el.getBoundingClientRect().top < innerHeight) el.classList.add('in');
});
setTimeout(showVisible, 1200);
addEventListener('scroll', () => setTimeout(showVisible, 400), { passive:true });
// le logo est toujours dessiné
document.querySelector('.brandmark')?.classList.add('in');

/* ---------- logo : retour en haut ---------- */
// sur l'accueil le logo remonte en haut ; ailleurs il ramène à l'accueil (lien normal)
document.querySelector('.brandmark')?.addEventListener('click', e => { if(location.pathname === '/'){ e.preventDefault(); scrollTo({top:0, behavior:RM?'auto':'smooth'}); } });

/* ---------- mouvement signature : le nom du pied de page prend sa pleine taille ---------- */
const foot = document.querySelector('.foot'), word = document.querySelector('.wordmark');
if(foot && word && !RM){
  let ticking = false;
  const upd = () => {
    ticking = false;
    const r = foot.getBoundingClientRect(), k = Math.min(1, Math.max(0, 1 - r.top / innerHeight));
    word.style.setProperty('--ws', (.94 + .06*k).toFixed(4));
  };
  addEventListener('scroll', () => { if(!ticking){ ticking = true; requestAnimationFrame(upd); } }, {passive:true});
  upd();
}
