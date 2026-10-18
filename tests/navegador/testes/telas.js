setTimeout(async () => {
  const out = {falhas: []};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const ls = k => JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_' + k));
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  await passo('previsao', async () => {
    switchTab('mapa'); await espera(200);
    const p = document.getElementById('formaturaPanel'), chip = p.querySelector('.fm-chip'), r = chip.getBoundingClientRect();
    return {notasVisiveis: [...p.querySelectorAll(':scope .fm > .fm-notas p')].map(txt), detalhes: [...p.querySelectorAll('.fm-mais .fm-notas p')].length, resumo: txt(p.querySelector('.fm-mais summary')),
      chip: {codigo: txt(chip.querySelector('.fm-chip__c')), nome: txt(chip.querySelector('.fm-chip__n')), w: Math.round(r.width), h: Math.round(r.height)}};
  });
  await passo('arvoreDica', async () => { document.querySelector('[data-mvista="arvore"]').click(); await espera(200); const t = txt(document.getElementById('arvInfo')); document.querySelector('[data-mvista="semestres"]').click(); return t; });
  await passo('conquistasMargem', async () => { const p = document.getElementById('conquistasPanel'); return {margem: getComputedStyle(p).marginTop, tituloTopo: Math.round(p.querySelector('.cq-titulo').getBoundingClientRect().top - p.previousElementSibling.getBoundingClientRect().bottom)}; });
  await passo('faltas', async () => { switchTab('faltas'); renderFaltas(); await espera(150); const c = document.querySelector('.falta-card'); const pres = c.querySelector('.fc-pres'); return {info: txt(c.querySelector('.fc-info')), dica: pres && pres.title}; });
  await passo('notificacoes', async () => {
    switchTab('config'); renderNotifPanel(); await espera(300);
    const sws = [...document.querySelectorAll('[data-notif-top]')];
    const r = {chaves: sws.map(x => x.dataset.notifTop + ':' + x.checked)};
    const v = sws.find(x => x.dataset.notifTop === 'semana'); v.click(); await espera(300);
    r.depois = {salvo: (ls('config') || {}).notifTopicos, cartaoApagado: v.closest('.notif-q').classList.contains('is-off'), topicos: notifTopicos()};
    renderNotifPanel(); await espera(200);
    r.reaberto = [...document.querySelectorAll('[data-notif-top]')].map(x => x.dataset.notifTop + ':' + x.checked + (x.closest('.notif-q').classList.contains('is-off') ? '(apagado)' : ''));
    // o resumo que o service worker lê
    // (pega o resumo quando ele é montado: a gravação no cache roda fora do tempo virtual do navegador sem janela)
    const R0 = window.Response, open0 = caches.open;
    let snap = null;
    window.Response = class extends R0 { constructor(b, o){ super(b, o); try{ const j = JSON.parse(b); if(j && j.topicos) snap = j.topicos; }catch(e){} } };
    caches.open = async () => ({put: async () => {}});
    saveReminderSnapshot(); await espera(1200);
    window.Response = R0; caches.open = open0;
    r.snapshot = snap || 'não gravou';
    if(!snap || snap.semana !== false) out.falhas.push('o resumo do service worker não recebeu o tópico desligado');
    if(!r.depois.cartaoApagado) out.falhas.push('o cartão do tópico desligado não ficou apagado');
    return r;
  });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
