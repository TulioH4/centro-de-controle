setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const ls = k => JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_' + k));
  window.confirmar = async () => true;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  const iso = n => localISO(calSoma(new Date(), n));
  const linhaF01 = () => { switchTab('faltas'); renderFaltas(); const c = [...document.querySelectorAll('.falta-card')].find(x => /Física Newtoniana/.test(x.textContent)); return txt(c && c.querySelector('.fc-info')); };
  const frase = async eventos => { STATE.calendario = Object.assign({inicio: '', fim: '', ocultos: []}, STATE.calendario, {eventos}); return calAvisos(new Date()).join(' ').replace(/<[^>]+>/g, ''); };
  await espera(1500);

  await passo('estimada', () => linhaF01());
  await passo('nenhuma', async () => { const lim = faltaLimite('F01', 60); STATE.faltas.F01 = {faltas: lim - 1}; const r = linhaF01(); STATE.faltas.F01 = {faltas: 0}; return r; });
  await passo('datasReais', async () => { await calSalvar(c => { c.inicio = '2026-08-03'; c.fim = '2026-12-11'; }); return linhaF01(); });
  await passo('frases', async () => {
    switchTab('painel');
    return {
      umDiaAmanha: await frase([{id: 'a', nome: 'Prova de proficiência', tipo: 'outro', de: iso(1), ate: ''}]),
      umDiaEm3: await frase([{id: 'a', nome: 'Prova de proficiência', tipo: 'outro', de: iso(3), ate: ''}]),
      recessoEm4: await frase([{id: 'a', nome: 'Recesso', tipo: 'feriado', de: iso(4), ate: iso(8)}]),
      emAndamento: await frase([{id: 'a', nome: 'Rematrícula', tipo: 'matricula', de: iso(-1), ate: iso(2)}]),
      ultimoDia: await frase([{id: 'a', nome: 'Rematrícula', tipo: 'matricula', de: iso(-2), ate: iso(0)}]),
      feriadoCidadeAmanha: await frase([{id: 'a', nome: 'Aniversário da cidade', tipo: 'feriado', de: iso(1), ate: ''}]),
    };
  });
  await passo('fimAntesDoInicio', async () => {
    STATE.calendario.eventos = [];
    switchTab('config'); renderCalendarioConfig(); await espera(100);
    const f = document.getElementById('calFim'); f.value = '2026-07-01'; f.dispatchEvent(new Event('change')); await espera(250);
    const toasts = [...document.querySelectorAll('#toastContainer .toast')].map(txt).slice(-1);
    return {salvo: ls('calendario').fim, campo: document.getElementById('calFim').value, toasts};
  });
  await passo('ateAntesDoDe', async () => {
    localStorage.setItem('centro_controle_' + ACTIVE_PROFILE_ID + '_calendario', JSON.stringify({inicio: '', fim: '', ocultos: [], eventos: [{id: 'x', nome: 'Invertido', tipo: 'outro', de: '2026-11-10', ate: '2026-11-05'}]}));
    STATE.calendario = await storeGet('calendario', null); sanearDados();
    return {ev: STATE.calendario.eventos[0], noDia: calEventosDoDia('2026-11-10').length};
  });
  await passo('presenca', async () => {
    const reg = STATE.faltasRegistro, sems = STATE.semestres;
    STATE.faltasRegistro = []; Object.keys(STATE.faltas).forEach(k => { STATE.faltas[k] = {faltas: 0}; });
    STATE.semestres = [{id: 's1', semestre: '1º semestre de 2026', encerradoEm: Date.now(), disciplinas: [{sigla: 'M03', nome: 'x', nota: 80, passou: true, faltas: 0}]}];
    const semRegistro = cqAvaliar().presenca.ok;
    STATE.faltasRegistro = [{data: iso(-30), inicio: '19:30', sigla: 'F01', n: 2}];
    const comRegistro = cqAvaliar().presenca.ok;
    STATE.faltasRegistro = reg; STATE.semestres = sems;
    return {semRegistro, comRegistro, limpo: cqAvaliar().semestreLimpo.ok};
  });
  await passo('carregando', async () => {
    const antes = JSON.stringify(STATE.conquistas);
    _initInProgress = true;
    STATE.pomSessions.push({sigla: 'M04', nome: 'x', duracaoMin: 25, ts: new Date().toISOString()});
    await cqAtualizar();
    const durante = JSON.stringify(STATE.conquistas) === antes;
    _initInProgress = false;
    await espera(1500);
    return {esperouDurante: durante, depois: !!(STATE.conquistas || {}).foco1};
  });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
