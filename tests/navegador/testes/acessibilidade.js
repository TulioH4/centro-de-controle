setTimeout(async () => {
  const out = {semNome: {}, inputsSemRotulo: {}};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const nome = el => (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim() || (el.querySelector('img[alt]') || {}).alt;
  const visivel = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  const coleta = aba => {
    const b = [...document.querySelectorAll('button, [role="button"], a[href]')].filter(visivel).filter(el => !nome(el));
    if(b.length) out.semNome[aba] = b.slice(0, 6).map(el => el.outerHTML.slice(0, 110));
    const i = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea')].filter(visivel)
      .filter(el => !el.getAttribute('aria-label') && !el.getAttribute('title') && !(el.id && document.querySelector(`label[for="${el.id}"]`)) && !el.closest('label') && !el.getAttribute('placeholder'));
    if(i.length) out.inputsSemRotulo[aba] = i.slice(0, 6).map(el => el.outerHTML.slice(0, 110));
  };
  for(const t of TABS){ switchTab(t.id); await espera(150); coleta(t.id); }
  switchTab('horario'); abrirGrade(); await espera(100); coleta('grade'); fecharGrade();
  openModalHorario(); await espera(100); coleta('modalHorario'); closeModalHorario();
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2000);
