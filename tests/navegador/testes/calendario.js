setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const ls = k => JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_' + k));
  window.confirmar = async () => true;
  const toasts = () => [...document.querySelectorAll('#toastContainer .toast')].map(txt);
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  const iso = n => localISO(calSoma(new Date(), n));

  await espera(1600); // primeira avaliação das conquistas (sem avisos)
  await passo('conquistasInicio', async () => ({salvo: ls('conquistas'), toasts: toasts()}));
  await passo('config', async () => {
    switchTab('config'); await espera(200);
    const p = document.getElementById('calPanel');
    const r = {antes: txt(p.querySelector('.gm-nota')), nacionais: p.querySelectorAll('[data-cal-nac]').length};
    const ini = document.getElementById('calInicio'); ini.value = '2026-08-03'; ini.dispatchEvent(new Event('change')); await espera(200);
    const fim = document.getElementById('calFim'); fim.value = '2026-12-11'; fim.dispatchEvent(new Event('change')); await espera(200);
    const add = async (nome, tipo, de, ate) => { document.getElementById('calEvNome').value = nome; document.getElementById('calEvTipo').value = tipo; document.getElementById('calEvDe').value = de; document.getElementById('calEvAte').value = ate || ''; document.getElementById('calEvAdd').click(); await espera(200); };
    await add('Rematrícula', 'matricula', iso(2), iso(5));
    await add('Recesso teste', 'feriado', iso(0), '');
    await add('', 'outro', iso(1), ''); // sem nome: não entra
    r.depois = txt(document.getElementById('calPanel').querySelector('.gm-nota'));
    r.eventos = [...document.querySelectorAll('#calPanel .cal-ev-row')].map(txt);
    r.salvo = ls('calendario');
    return r;
  });
  await passo('painel', async () => {
    switchTab('painel'); renderPainel(); await espera(200);
    return {semestre: [...document.querySelectorAll('#resumoStats .stat')].map(txt).find(t => t.startsWith('Semestre')), aulasHoje: txt(document.getElementById('aulasHojeList')),
      proxAula: [...document.querySelectorAll('#resumoStats .stat')].map(txt).find(t => t.startsWith('Próxima aula')), frases: txt(document.getElementById('dayOverview'))};
  });
  await passo('faltas', async () => { switchTab('faltas'); renderFaltas(); await espera(200); return [...document.querySelectorAll('.falta-card')].map(c => txt(c.querySelector('.fc-info'))).filter(t => /Ainda há/.test(t)); });
  await passo('calendarioMes', async () => {
    switchTab('provas'); STATE.calMonth = {y: 2026, m: 10}; renderCalendarGrid(); await espera(100);
    const d2 = document.querySelector('[data-cal-dia="2026-11-02"]');
    return {finados: d2 && d2.classList.contains('is-feriado'), tag: txt(d2 && d2.querySelector('.cal-tag')), aria: d2 && d2.getAttribute('aria-label')};
  });
  await passo('feriadoComAula', async () => {
    switchTab('config'); await espera(150);
    const cb = document.querySelector('[data-cal-nac="2026-11-02"]'); cb.checked = true; cb.dispatchEvent(new Event('change')); await espera(250);
    return {ocultos: ls('calendario').ocultos, semAula: calSemAula('2026-11-02'), rotulo: txt(document.querySelector('[data-cal-nac="2026-11-02"]').closest('.cal-nac'))};
  });
  await passo('apagaEvento', async () => { const b = [...document.querySelectorAll('[data-cal-del]')].find(x => x.getAttribute('aria-label').includes('Recesso')); b.click(); await espera(250); return {eventos: ls('calendario').eventos.map(e => e.nome), semAulaHoje: calSemAulaHoje()}; });
  // conquistas: uma sessão de estudo e 10 tarefas concluídas
  await passo('conquistaNova', async () => {
    STATE.pomSessions.push({sigla: 'M04', nome: 'Cálculo', duracaoMin: 25, ts: new Date().toISOString()});
    await storeSet('pom_sessions', STATE.pomSessions);
    for(let i = 0; i < 10; i++) STATE.tarefas.push({id: 'tq' + i, nome: 'Tarefa ' + i, status: 'Concluído', prioridade: 'Baixa', categoria: 'Estudo'});
    await storeSet('tarefas', STATE.tarefas);
    await espera(1700);
    return {salvo: ls('conquistas'), toasts: toasts().slice(-2)};
  });
  await passo('painelConquistas', async () => {
    switchTab('mapa'); await espera(250);
    const p = document.getElementById('conquistasPanel');
    return {titulo: txt(p.querySelector('.cq-titulo')), primeiras: [...p.querySelectorAll('.cq')].slice(0, 4).map(txt), comBarra: p.querySelectorAll('.cq-barra').length};
  });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
