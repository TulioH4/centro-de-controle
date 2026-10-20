setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const ls = k => JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_' + k));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  window.confirmar = async () => true;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };

  await passo('curriculo', () => { const c = curriculoDoPerfil(); return c && c.id; });

  // 1. Mapa de Sucesso: previsão e cadeados
  await passo('mapa', async () => {
    switchTab('mapa'); await espera(200);
    const p = document.getElementById('formaturaPanel');
    const sems = [...p.querySelectorAll('.fm-sem')].map(r => txt(r.querySelector('.fm-sem__h')) + ' :: ' + [...r.querySelectorAll('.fm-chip')].length);
    const travas = [...document.querySelectorAll('#mapaTimeline .badge.is-bloq')].map(b => b.dataset.discChip);
    return {hidden: p.hidden, quando: txt(p.querySelector('.fm-quando')), sub: txt(p.querySelector('.fm-sub')), leg: txt(p.querySelector('.fm-leg')), sems,
      notas: [...p.querySelectorAll('.fm-notas p')].map(txt), travas, tituloA16: (document.querySelector('[data-disc-chip="A16"]') || {}).title};
  });

  // 2. outro limite de créditos: menos semestres e fica salvo
  await passo('limite', async () => {
    const sel = document.getElementById('fmLimite');
    sel.value = '32'; sel.dispatchEvent(new Event('change')); await espera(300);
    const p = document.getElementById('formaturaPanel');
    const r = {quando: txt(p.querySelector('.fm-quando')), sems: p.querySelectorAll('.fm-sem').length, salvo: ls('config').creditosSemestre};
    const sel2 = document.getElementById('fmLimite');
    sel2.value = '26'; sel2.dispatchEvent(new Event('change')); await espera(300);
    r.volta = txt(document.querySelector('#formaturaPanel .fm-quando'));
    return r;
  });

  // 3. detalhe da disciplina
  await passo('detalhe', async () => {
    const ler = sg => { showDiscDetail(sg); const b = document.getElementById('discModalBody'); const r = {stats: txt(b.querySelector('.dm-stat-row')), req: [...b.querySelectorAll('.dd-req')].map(txt), notas: [...b.querySelectorAll('.gm-nota')].map(txt)}; document.getElementById('discDetailOverlay').style.display = 'none'; return r; };
    return {A16: ler('A16'), TCC: ler('TCC'), M04: ler('M04'), P18: ler('P18'), M01: ler('M01')};
  });

  // 4. progresso do curso no Painel
  await passo('progresso', async () => { switchTab('painel'); await espera(200); return txt(document.getElementById('progressoCursoPanel')); });

  // 5. montador: melhor grade só com o que os requisitos liberam
  await passo('grade', async () => {
    switchTab('horario'); abrirGrade();
    gMelhorGrade();
    const cur = curriculoDoPerfil(), base = reqBase(true), esc = gPlano().escolhidas, juntas = new Set([...esc, ...base.cursando]);
    const invalidas = esc.filter(s => gStatus(s) !== 'cursando' && cur.creditos[s] && reqFaltando(cur, s, base, juntas).length);
    const travadasLista = [...document.querySelectorAll('.gm-disc.st-bloq [data-gdisc]')].map(c => c.dataset.gdisc);
    const r = {escolhidas: esc, invalidas, opcoes: GM.opcoes.length, aviso: txt(document.getElementById('gmAviso')), conta: txt(document.getElementById('gmConta')), travadasLista,
      bloqSub: txt(document.querySelector('.gm-disc.st-bloq'))};
    // marcar à mão uma travada: aviso de matrícula recusada
    const alvo = travadasLista[0];
    if(alvo){
      const cb = document.querySelector(`[data-gdisc="${alvo}"]`); cb.checked = true; cb.dispatchEvent(new Event('change')); await espera(100);
      r.manual = {alvo, aviso: txt(document.getElementById('gmAviso'))};
      cb.checked = false; cb.dispatchEvent(new Event('change')); await espera(100);
      r.depois = txt(document.getElementById('gmAviso'));
    }
    fecharGrade();
    return r;
  });

  // 6. perfil de outra faculdade com códigos parecidos: sem quadro
  await passo('outraFaculdade', () => { const i = STATE.config.instituicao; STATE.config.instituicao = 'Universidade Exemplo'; const c = curriculoDoPerfil(); STATE.config.instituicao = i; return c ? c.id : null; });

  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
