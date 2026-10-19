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

/* ---------- Collection : une photo cliquée s'agrandit, puis revient à sa place
   (clic n'importe où, défilement, Échap) ---------- */
(() => {
  const imgs = [...document.querySelectorAll('.wall .t img')];
  if(!imgs.length) return;
  let open = null;
  const fit = (w, h) => {                       // taille maximale à l'écran, proportions conservées
    const k = Math.min(innerWidth * .9 / w, innerHeight * .82 / h);
    return [w * k, h * k];
  };
  function close(){
    if(!open || open.closing) return;
    const o = open; o.closing = true;
    const r = o.src.getBoundingClientRect();
    o.img.style.transform = `translate(${r.left}px,${r.top}px) scale(${r.width / o.w})`;
    o.veil.classList.remove('on'); o.cap?.classList.remove('on');
    setTimeout(() => { o.img.remove(); o.veil.remove(); o.cap?.remove(); o.fig.classList.remove('zooming'); o.src.focus?.({ preventScroll:true }); }, RM ? 0 : 600);
    open = null;
    removeEventListener('scroll', close); removeEventListener('keydown', onKey);
  }
  const onKey = e => { if(e.key === 'Escape') close(); };
  function zoom(src){
    if(open) return close();
    const fig = src.closest('.t'), r = src.getBoundingClientRect();
    const ratio = src.naturalWidth / src.naturalHeight || r.width / r.height;
    const [W, H] = fit(ratio * 1000, 1000);
    const veil = document.createElement('div'); veil.className = 'zoom-veil';
    const img = document.createElement('img');
    img.className = 'zoom-img'; img.src = src.currentSrc || src.src; img.alt = src.alt;
    Object.assign(img.style, { left:'0px', top:'0px', width:W + 'px', height:H + 'px' });
    // départ : exactement sur la vignette (même cadrage), arrivée : centrée en grand
    img.style.transform = `translate(${r.left}px,${r.top}px) scale(${r.width / W})`;
    let cap = null;
    const caption = fig.querySelector('figcaption');
    if(caption){ cap = document.createElement('p'); cap.className = 'zoom-cap'; cap.textContent = [...caption.children].map(c => c.textContent.trim()).filter(Boolean).join(' · '); }
    document.body.append(veil, img); if(cap) document.body.append(cap);
    fig.classList.add('zooming');
    void img.offsetWidth;
    requestAnimationFrame(() => {
      img.style.transform = `translate(${(innerWidth - W) / 2}px,${(innerHeight - H) / 2}px) scale(1)`;
      veil.classList.add('on'); cap?.classList.add('on');
    });
    open = { src, fig, img, veil, cap, w:W };
    veil.addEventListener('click', close); img.addEventListener('click', close);
    setTimeout(() => { addEventListener('scroll', close, { passive:true }); }, 80);
    addEventListener('keydown', onKey);
  }
  imgs.forEach(im => {
    im.tabIndex = 0; im.setAttribute('role', 'button');
    im.setAttribute('aria-label', (document.documentElement.lang === 'en' ? 'Enlarge: ' : 'Agrandir : ') + im.alt);
    im.addEventListener('click', () => zoom(im));
    im.addEventListener('keydown', e => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); zoom(im); } });
  });
  addEventListener('wheel', () => open && close(), { passive:true });
  addEventListener('touchmove', () => open && close(), { passive:true });
})();
