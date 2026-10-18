setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  const original = JSON.stringify({h: STATE.historico, a: STATE.config.disciplinasAtuais});
  const restaura = () => { const o = JSON.parse(original); STATE.historico = o.h; STATE.config.disciplinasAtuais = o.a; };
  const painel = () => { renderMapaSucesso(); const p = document.getElementById('formaturaPanel');
    return {hidden: p.hidden, quando: txt(p.querySelector('.fm-quando')), sub: txt(p.querySelector('.fm-sub')), select: !!p.querySelector('#fmLimite'), sems: [...p.querySelectorAll('.fm-sem__h')].map(txt), spans: [...p.querySelectorAll('span.fm-chip')].map(txt).slice(0, 3), notas: p.querySelectorAll('.fm-notas p').length}; };
  switchTab('mapa'); await espera(200);

  await passo('tudoAprovado', () => { STATE.historico.forEach(i => { i.nota = 80; delete i.aprovado; }); STATE.config.disciplinasAtuais = []; const r = painel(); restaura(); return r; });
  await passo('ultimas', () => { const at = ['TCC', 'A18', 'P23']; STATE.historico.forEach(i => { if(at.includes(i.sigla)) i.nota = null; else { i.nota = 80; delete i.aprovado; } }); STATE.config.disciplinasAtuais = at; const r = painel(); restaura(); return r; });
  await passo('semCursando', () => { STATE.config.disciplinasAtuais = []; const r = painel(); restaura(); return r; });
  await passo('foraDoHistorico', () => { STATE.historico = STATE.historico.filter(i => i.sigla !== 'P19'); const r = painel(); restaura(); return r; });
  await passo('coJunto', () => { STATE.config.disciplinasAtuais = [...STATE.config.disciplinasAtuais, 'P06', 'P08']; showDiscDetail('P08'); const b = document.getElementById('discModalBody'); const r = [...b.querySelectorAll('.dd-req')].map(txt); document.getElementById('discDetailOverlay').style.display = 'none'; restaura(); return r; });
  await passo('outraFaculdade', async () => {
    const inst = STATE.config.instituicao; STATE.config.instituicao = 'Universidade Exemplo';
    renderMapaSucesso(); renderProgressoCurso();
    switchTab('horario'); abrirGrade(); gMelhorGrade();
    const r = {painelOculto: document.getElementById('formaturaPanel').hidden, cadeados: document.querySelectorAll('#mapaTimeline .is-bloq').length,
      progresso: txt(document.getElementById('progressoCursoPanel')), aviso: txt(document.getElementById('gmAviso')), bloqLista: document.querySelectorAll('.gm-disc.st-bloq').length};
    fecharGrade(); STATE.config.instituicao = inst; renderMapaSucesso();
    return r;
  });
  // começo de semestre, ainda sem horário: as cursando não contam como feitas
  await passo('semHorario', async () => {
    const aulas = STATE.aulasCustom; STATE.aulasCustom = [];
    switchTab('horario'); abrirGrade(); gMelhorGrade();
    const cur = curriculoDoPerfil(), base = reqBase(false), esc = gPlano().escolhidas, juntas = new Set([...esc, ...base.cursando]);
    const r = {escolhidas: esc, invalidas: esc.filter(s => gStatus(s) !== 'cursando' && cur.creditos[s] && reqFaltando(cur, s, base, juntas).length),
      aviso: txt(document.getElementById('gmAviso')).slice(-120), bloq: [...document.querySelectorAll('.gm-disc.st-bloq [data-gdisc]')].map(c => c.dataset.gdisc)};
    fecharGrade(); STATE.aulasCustom = aulas;
    return r;
  });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
