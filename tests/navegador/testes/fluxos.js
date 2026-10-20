setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const ls = k => JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_' + k));
  window.confirmar = async () => true;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };

  // 1. encerrar o semestre e desfazer
  await passo('encerrar', async () => {
    const antes = {atuais: [...STATE.config.disciplinasAtuais], faltas: JSON.stringify(STATE.faltas), aulas: (STATE.aulasCustom || DATA.aulas).length, provas: STATE.provas.length, parciais: Object.keys(STATE.notasParciais).length};
    abrirFimSemestre();
    const finais = Object.fromEntries(Object.entries(SEM.finais).map(([s, f]) => [s, {nota: f.nota, res: f.res}]));
    const s0 = STATE.config.disciplinasAtuais[0], s1 = STATE.config.disciplinasAtuais[1];
    SEM.finais[s1].res = 'nao'; SEM.finais[s1].nota = 40;
    SEM.passo = 2; renderFimSemestre();
    const livres = [...document.querySelectorAll('[data-prox]')].map(cb => cb.dataset.prox);
    SEM.proximas = livres.slice(0, 3).concat([s1]);
    SEM.rotulo = '1º semestre de 2027';
    SEM.passo = 3; renderFimSemestre();
    await encerrarSemestre();
    const h0 = STATE.historico.find(i => i.sigla === s0), h1 = STATE.historico.find(i => i.sigla === s1);
    const depois = {atuais: STATE.config.disciplinasAtuais, semestre: STATE.config.semestre, faltas: STATE.faltas, aulas: STATE.aulasCustom.length,
      sit0: situacao(h0), nota0: h0.nota, sit1: situacao(h1), nota1: h1.nota, registros: STATE.semestres.length, parciais: Object.keys(STATE.notasParciais).length,
      salvoAtuais: ls('config').disciplinasAtuais};
    await desfazerEncerramento(STATE.semestres[STATE.semestres.length - 1].id);
    const desfeito = {atuais: STATE.config.disciplinasAtuais, faltas: JSON.stringify(STATE.faltas) === antes.faltas, aulas: (STATE.aulasCustom || DATA.aulas).length, provas: STATE.provas.length,
      parciais: Object.keys(STATE.notasParciais).length, sit0: situacao(STATE.historico.find(i => i.sigla === s0)), registros: STATE.semestres.length, semestre: STATE.config.semestre};
    return {antes, finais, depois, desfeito};
  });

  // 2. montar a grade com o PDF de teste e usar
  await passo('grade', async () => {
    STATE.gradeOferta = window.__OFERTA;
    switchTab('horario'); abrirGrade();
    const r = {disc: GM.disc.size, pre: [...gPlano().escolhidas]};
    gMelhorGrade();
    r.auto = {n: gPlano().escolhidas.length, opcoes: GM.opcoes.length, aviso: document.getElementById('gmAviso').textContent.trim().slice(0, 90)};
    document.querySelector('[data-gturno="noite"]').click();
    r.semNoite = {n: gPlano().escolhidas.length, aviso: document.getElementById('gmAviso').textContent.trim().slice(0, 90)};
    document.querySelector('[data-gturno="noite"]').click();
    // à mão: marcar uma que choca
    const p = gPlano();
    const a = p.escolhidas.find(s => p.sel[s] && p.sel[s].teoria);
    if(!a) return r;
    const ta = GM.disc.get(a).teoria.find(t => t.id === p.sel[a].teoria);
    const outro = [...GM.disc.values()].find(d => d.sigla !== a && d.teoria.some(t => t.slots.some(s => ta.slots.some(x => x.dia === s.dia && x.hora === s.hora))));
    if(outro){
      const cb = document.querySelector(`[data-gdisc="${outro.sigla}"]`);
      if(!cb.checked){ cb.checked = true; cb.dispatchEvent(new Event('change')); }
      const t = outro.teoria.find(t => t.slots.some(s => ta.slots.some(x => x.dia === s.dia && x.hora === s.hora)));
      document.querySelector(`[data-gop="${outro.sigla}|teoria|${t.id}"]`).click();
      r.choque = document.getElementById('gmAviso').textContent.trim().slice(0, 120);
      r.celulasChoque = document.querySelectorAll('.gm-cel.is-choque').length;
      await usarGradeMontada();
      r.usarComChoque = document.getElementById('modalGrade').classList.contains('open') ? 'bloqueou' : 'USOU';
      document.getElementById('gmSozinho').click();
      r.sozinho = document.getElementById('gmAviso').textContent.trim().slice(0, 120);
    }
    await usarGradeMontada();
    r.usado = {aberto: document.getElementById('modalGrade').classList.contains('open'), atuais: STATE.config.disciplinasAtuais, aulas: STATE.aulasCustom.length,
      salvoAulas: (ls('aulas_custom') || []).length, siglas: STATE.aulasCustom.map(aulaSigla).filter(x => !x).length + ' sem sigla'};
    await espera(700);
    r.planoSalvo = !!ls('grade_plano'); r.ofertaSalva = !!ls('grade_oferta');
    r.painelAulas = document.querySelectorAll('#aulasHojeList .row-item').length;
    r.diaCelular = document.getElementById('horarioDia').textContent.replace(/\s+/g, ' ').trim().slice(0, 160);
    // histórico sem os códigos do PDF
    const hist = STATE.historico; STATE.historico = [];
    abrirGrade(); gMelhorGrade();
    r.desconhecidas = {aviso: document.getElementById('gmAviso').textContent.trim().slice(0, 100), nota: (document.querySelector('#gmLista > .gm-nota') || {}).textContent, grupos: document.querySelectorAll('#gmLista .wiz-sem-block').length, mais: document.querySelectorAll('#gmLista details').length};
    fecharGrade(); STATE.historico = hist;
    return r;
  });

  // 3. disciplina adicionada, removida e adicionada de novo com o mesmo nome
  await passo('historico', async () => {
    switchTab('historico'); abrirAddDisciplina();
    const add = async (nome, nota) => { document.getElementById('hNome').value = nome; marcarSituacao('feita'); document.getElementById('hNota').value = nota; await document.getElementById('btnAddDisc').onclick?.(); document.getElementById('btnAddDisc').click(); await espera(100); };
    await add('Disciplina Teste Xyz', '45');
    const it = STATE.historico.find(i => i.disciplina === 'Disciplina Teste Xyz');
    const sigla = it.sigla;
    // editar a nota pela tabela (vira override)
    const inp = document.querySelector(`#histBody input[data-field="nota"][data-sigla="${sigla}"]`);
    inp.value = '33'; inp.dispatchEvent(new Event('change')); await espera(100);
    document.querySelector(`[data-del-disc="${sigla}"]`).click(); await espera(100);
    await add('Disciplina Teste Xyz', '90');
    STATE.historico = montarHistorico(); // como ao reabrir o app
    const novo = STATE.historico.find(i => i.disciplina === 'Disciplina Teste Xyz');
    return {sigla, siglaNova: novo.sigla, notaDepois: novo.nota, overrideOrfao: ls('historico_overrides')[sigla] || null};
  });

  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2000);
