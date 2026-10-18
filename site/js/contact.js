/* =====================================================================
   DELPHINIUM — questionnaire de contact (Netlify Forms)
   Sans script : les trois questions s'affichent à la suite, le formulaire
   s'envoie normalement. Avec script : une question à la fois, passage
   automatique dès qu'un choix est fait, cote d'avancement redessinée.
   ===================================================================== */
const form = document.querySelector('form.quiz');
if(form){
  const steps = [...form.querySelectorAll('.qstep')];
  const track = document.querySelector('.track');
  const labels = track ? [...track.querySelectorAll('li')] : [];
  const err = form.querySelector('.err');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const EN = document.documentElement.lang === 'en';
  let cur = 0, busy = false;
  // valeurs des deux boutons e-mail / téléphone (traduites dans la version anglaise)
  const [PREF_MAIL, PREF_TEL] = [...form.querySelectorAll('input[name=preference]')].map(i => i.value);

  function setTrack(i){
    track?.style.setProperty('--k', (i / (steps.length - 1)).toFixed(3));
    labels.forEach((l, j) => l.classList.toggle('on', j <= i));
  }
  function go(i){
    if(busy || i === cur || i < 0 || i >= steps.length) return;
    busy = true;
    const from = steps[cur], to = steps[i];
    from.classList.add('out');
    form.classList.remove('redraw'); void form.offsetWidth; form.classList.add('redraw');   // le cadre croquis se retrace
    setTimeout(() => {
      from.classList.remove('on', 'out');
      to.classList.add('on');
      cur = i; setTrack(i); busy = false;
      (to.querySelector('input:checked') || to.querySelector('input:not([type=hidden]), textarea'))?.focus({ preventScroll:true });
    }, RM ? 0 : 340);
  }

  // un choix dans les deux premières questions fait avancer (clic, toucher, Espace),
  // sauf s'il vient des flèches du clavier : on parcourt alors les options sans quitter la question (WCAG 3.2.2)
  let arrowNav = false;
  form.addEventListener('change', e => {
    const t = e.target, byArrow = arrowNav; arrowNav = false;
    if(t.type === 'radio' && !byArrow && (t.name === 'secteur' || t.name === 'source')) setTimeout(() => go(cur + 1), RM ? 0 : 260);
    if(t.name === 'preference') togglePref();
  });
  // clavier : Entrée ou Espace sur un choix déjà sélectionné avance aussi
  form.addEventListener('keydown', e => {
    arrowNav = e.target.type === 'radio' && e.key.startsWith('Arrow');
    if((e.key === 'Enter' || e.key === ' ') && e.target.type === 'radio' && e.target.checked && e.target.name !== 'preference'){ e.preventDefault(); go(cur + 1); }
  });
  form.querySelectorAll('.back').forEach(b => b.addEventListener('click', () => go(cur - 1)));

  // e-mail ou téléphone : un seul champ visible et exigé
  function togglePref(focus=true){
    const key = form.querySelector('input[name=preference]:checked')?.value === PREF_TEL ? 'tel' : 'mail';
    form.querySelectorAll('.field[data-for]').forEach(f => {
      const on = f.dataset.for === key, input = f.querySelector('input');
      f.classList.toggle('hide', !on); input.disabled = !on;
      if(on && focus) input.focus({ preventScroll:true });
    });
    err.textContent = '';
  }

  form.addEventListener('submit', e => {
    if(!form.secteur.value){ e.preventDefault(); go(0); return; }
    if(!form.source.value){ e.preventDefault(); go(1); return; }
    const pref = form.querySelector('input[name=preference]:checked')?.value;
    const email = form.email, tel = form.telephone;
    let msg = '';
    if(pref === PREF_MAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim())) msg = EN ? 'Please enter a valid email address.' : 'Indiquez une adresse e-mail valide.';
    if(pref === PREF_TEL && tel.value.replace(/[^\d+]/g,'').length < 9) msg = EN ? 'Please enter a valid phone number.' : 'Indiquez un numéro de téléphone valide.';
    if(msg){ e.preventDefault(); err.textContent = msg; (pref === PREF_MAIL ? email : tel).focus(); return; }
    form.querySelector('button[type=submit]').setAttribute('aria-busy', 'true');
  });

  document.documentElement.classList.add('js');
  togglePref(false); setTrack(0);
}
