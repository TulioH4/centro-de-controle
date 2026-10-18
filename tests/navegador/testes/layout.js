setTimeout(async () => {
  const out = {w: innerWidth, tabs: {}, modais: {}};
  const largos = () => {
    const W = document.documentElement.clientWidth, r = [];
    document.querySelectorAll('body *').forEach(el => {
      const b = el.getBoundingClientRect();
      if(!b.width || getComputedStyle(el).visibility === 'hidden') return;
      if(b.right > W + 2 || b.left < -2){
        // dentro de um contêiner com rolagem lateral é permitido
        let p = el.parentElement, ok = false;
        while(p && p !== document.body){ const o = getComputedStyle(p).overflowX; if(o === 'auto' || o === 'scroll' || o === 'hidden'){ ok = true; break; } p = p.parentElement; }
        if(!ok) r.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + '.' + [...el.classList].join('.')) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      }
    });
    return r.slice(0, 8);
  };
  const espera = ms => new Promise(r => setTimeout(r, ms));
  for(const t of TABS){
    try{ switchTab(t.id); await espera(150); out.tabs[t.id] = {scrollW: document.documentElement.scrollWidth, largos: largos()}; }
    catch(e){ out.tabs[t.id] = 'ERR ' + e.message; }
  }
  const modal = async (nome, abrir, fechar) => {
    try{ abrir(); await espera(200); out.modais[nome] = {largos: largos()}; fechar(); await espera(50); }
    catch(e){ out.modais[nome] = 'ERR ' + e.message; }
  };
  await modal('horario', () => openModalHorario(), () => closeModalHorario());
  await modal('agenda', () => abrirModalAgenda(), () => fecharModalAgenda());
  for(const passo of [1, 2, 3]) await modal('semestre' + passo, () => { abrirFimSemestre(); SEM.passo = passo; renderFimSemestre(); }, () => fecharFimSemestre());
  await modal('grade-vazio', () => { switchTab('horario'); abrirGrade(); }, () => fecharGrade());
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2000);
