// Regra do Inatel na aba Notas e no Painel: média 45 vai para a NP3 (precisa de 55), a NP3 lançada
// fecha a nota final, e o encerramento do semestre leva a nota final com o resultado certo.
setTimeout(async () => {
  const out = {falhas: []};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const confere = (cond, msg) => { if(!cond) out.falhas.push(msg); };
  const card = sg => [...document.querySelectorAll('#notasSemestreGrid .notas-card')].find(c => txt(c.querySelector('.notas-card-sigla')) === sg);
  try{
    // F01: 50 e 40 (NPA 45). M04: 20 e 30 (NPA 25, sem NP3). P06: 10 e prova aberta (vai para a NP3, mas ainda dá)
    STATE.notasParciais.F01 = [{label: 'P1', valor: 50, peso: 1}, {label: 'P2', valor: 40, peso: 1}];
    STATE.notasParciais.M04 = [{label: 'P1', valor: 20, peso: 1}, {label: 'P2', valor: 30, peso: 1}];
    STATE.notasParciais.P06 = [{label: 'P1', valor: 10, peso: 1}, {label: 'P2', valor: null, peso: 1}];
    await storeSet('notas_parciais', STATE.notasParciais);
    switchTab('desempenho'); renderNotasSemestre(); await espera(200);
    const f = card('F01');
    out.f01 = {badge: txt(f.querySelector('.badge')), texto: txt(f.querySelector('.notas-precisa')), np3: !!f.querySelector('[data-nota-np3]')};
    confere(out.f01.badge === 'NP3' && /vai para a NP3/.test(out.f01.texto) && /55/.test(out.f01.texto) && out.f01.np3, 'média 45 não mostrou a NP3 com 55');
    const m = card('M04');
    out.m04 = {badge: txt(m.querySelector('.badge')), texto: txt(m.querySelector('.notas-precisa')), np3: !!m.querySelector('[data-nota-np3]')};
    confere(out.m04.badge === 'Reprovado' && /abaixo de 30/.test(out.m04.texto) && !out.m04.np3, 'média 25 não ficou reprovada sem NP3');
    out.p06 = {badge: txt(card('P06').querySelector('.badge')), texto: txt(card('P06').querySelector('.notas-precisa'))};
    confere(out.p06.badge === 'NP3' && /Para ter direito a ela/.test(out.p06.texto), 'P1 10 não avisou que vai para a NP3');
    // Painel: quadro de risco e card "Reprovando em notas" (só a M04 está perdida)
    switchTab('painel'); renderPainel(); renderDiscRisco(); await espera(200);
    const linha = sg => [...document.querySelectorAll('#discRiscoPanel .risco-row')].find(r => txt(r.querySelector('.risco-sigla')) === sg);
    out.risco = {F01: txt(linha('F01')), M04: txt(linha('M04')), P06: txt(linha('P06'))};
    confere(/NP3: precisa de 55/.test(out.risco.F01) && /ficou em 25/.test(out.risco.M04) && /vai para a NP3/.test(out.risco.P06), 'quadro de risco sem a regra da NP3');
    const rep = [...document.querySelectorAll('#resumoStats .stat')].find(s => /Reprovando/.test(s.textContent));
    out.reprovando = rep ? txt(rep) : null;
    confere(out.reprovando && /1 disc/.test(out.reprovando), '"Reprovando em notas" não contou só a M04');
    // lança a NP3 de F01: 55 → final 50, aprovado
    switchTab('desempenho'); renderNotasSemestre(); await espera(100);
    const inp = card('F01').querySelector('[data-nota-np3]');
    inp.value = '55'; inp.dispatchEvent(new Event('change')); await espera(300);
    out.f01depois = {badge: txt(card('F01').querySelector('.badge')), texto: txt(card('F01').querySelector('.notas-precisa')), salvo: JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_notas_parciais')).F01};
    confere(out.f01depois.badge === 'Aprovado' && /= 50,0/.test(out.f01depois.texto), 'NP3 55 não fechou em 50, aprovado');
    confere(out.f01depois.salvo.some(e => e.np3 === true && e.valor === 55) && out.f01depois.salvo.length === 3, 'a NP3 não foi salva marcada');
    // "+ Adicionar nota" continua contando só as notas do semestre
    card('F01').querySelector('[data-nota-add]').click(); await espera(200);
    out.novaLinha = STATE.notasParciais.F01.filter(e => !e.np3).map(e => e.label);
    confere(out.novaLinha.join(',') === 'P1,P2,P3', 'a linha nova não virou P3');
    STATE.notasParciais.F01 = STATE.notasParciais.F01.filter(e => e.label !== 'P3'); await storeSet('notas_parciais', STATE.notasParciais);
    // apagar a NP3 volta para "precisa de 55"
    renderNotasSemestre(); await espera(100);
    const inp2 = card('F01').querySelector('[data-nota-np3]'); inp2.value = ''; inp2.dispatchEvent(new Event('change')); await espera(300);
    confere(txt(card('F01').querySelector('.badge')) === 'NP3' && !STATE.notasParciais.F01.some(e => e.np3), 'apagar a NP3 não voltou ao começo');
    // encerrar o semestre: F01 com NP3 55 → 50 passei; M04 → 25 não passei; com a NP3 faltando → não passei
    inp2.value = '55'; inp2.dispatchEvent(new Event('change')); await espera(300);
    abrirFimSemestre(); await espera(200);
    out.encerrar = Object.fromEntries(['F01', 'M04', 'P06'].map(s => [s, SEM.finais[s]]));
    confere(out.encerrar.F01.nota === 50 && out.encerrar.F01.res === 'passei', 'encerrar: F01 não levou 50, passei');
    confere(out.encerrar.M04.nota === 25 && out.encerrar.M04.res === 'nao', 'encerrar: M04 não ficou "não passei"');
    const linhaSem = document.querySelector('[data-sem-disc="F01"] small');
    out.encerrarSub = txt(linhaSem);
    confere(/com a NP3/.test(out.encerrarSub), 'encerrar não diz que a nota veio com a NP3');
    fecharFimSemestre();
  }catch(e){ out.passo = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; }
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
