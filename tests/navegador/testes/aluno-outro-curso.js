// Aluno novo de outro curso do Inatel: no passo 2 escolhe Engenharia de Telecomunicações (sem escrever o
// curso no passo 1) e o 5º semestre. O perfil sai com a grade desse curso, o nome dele e a regra do Inatel.
setTimeout(async () => {
  const out = {passos: [], falhas: []};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const confere = (cond, msg) => { if(!cond) out.falhas.push(msg); };
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  window.avisar = async m => { out.passos.push('ALERTA: ' + m); };
  window.confirmar = async () => true;
  try{
    document.getElementById('wNome').value = 'Bruno Teste';
    document.getElementById('wCurso').value = '';
    document.getElementById('wizardNext').click(); await espera(300);
    out.cursos = [...document.querySelectorAll('[data-cat]')].map(b => b.dataset.cat);
    confere(['inatel-producao', 'inatel-biomedica', 'inatel-computacao', 'inatel-automacao', 'inatel-eletrica', 'inatel-software', 'inatel-telecom', 'outro'].every(c => out.cursos.includes(c)), 'o passo 2 não lista todos os cursos do Inatel');
    confere(!WIZARD_DATA.catalogo, 'sem curso escrito, uma grade veio escolhida sozinha');
    document.querySelector('[data-cat="inatel-telecom"]').click(); await espera(200);
    document.querySelector('[data-sem="5"]').click(); await espera(200);
    out.blocos = document.querySelectorAll('#wizGradeArea .wiz-sem-block').length;
    out.t27 = (document.querySelector('[data-sigla="T27"] .wiz-disc-st') || {}).textContent;
    confere(out.blocos === 10 && out.t27 === 'Cursando', 'a grade de Telecomunicações não apareceu com o 5º semestre cursando');
    for(let i = 0; i < 6 && document.getElementById('wizardOverlay').style.display !== 'none'; i++){
      document.getElementById('wizardNext').click(); await espera(400);
    }
    await espera(2500);
    // o tour começa sozinho depois do assistente (uma vez)
    out.tour = {ativo: tourAtivo(), passo: txt(document.getElementById('tourTitulo'))};
    confere(out.tour.ativo && out.tour.passo === 'Bem-vindo ao Centro de Controle', 'o tour não começou depois do assistente');
    document.getElementById('tourPular').click(); await espera(150);
    confere(!tourAtivo() && await storeGet('tour_visto', false) === true, '"Pular" não encerrou o tour');
    const h = s => STATE.historico.find(i => i.sigla === s);
    out.config = {curriculo: STATE.config.curriculo, curso: STATE.config.curso, atuais: STATE.config.disciplinasAtuais, historico: STATE.historico.length};
    out.itens = {M01: h('M01') && situacao(h('M01')), T27: h('T27') && [situacao(h('T27')), h('T27').periodo], TCC: h('TCC') && situacao(h('TCC')), P09: !!h('P09')};
    out.regra = {np3: regraNP3(), aprova: notaAprova()};
    confere(out.config.curriculo === 'inatel-telecom' && out.config.curso === 'Engenharia de Telecomunicações', 'o perfil não ficou com o curso escolhido');
    confere(out.config.historico === 72 && out.itens.M01 === 'Aprovado' && out.itens.T27[0] === 'Cursando' && out.itens.T27[1] === 5 && out.itens.TCC === 'Pendente', 'o histórico não saiu da grade de Telecomunicações');
    confere(!out.itens.P09, 'disciplina de Produção entrou no histórico de Telecomunicações');
    confere(out.regra.np3 && out.regra.aprova === 50, 'a regra do Inatel (NP3) não vale para o curso novo');
    // Mapa: os semestres da grade; sem quadro de requisitos, sem previsão nem árvore
    switchTab('mapa'); await espera(300);
    out.mapa = {semestres: document.querySelectorAll('#tab-mapa .wiz-sem-block, #tab-mapa [data-sem-bloco], #tab-mapa .mapa-sem').length, previsao: !document.getElementById('formaturaPanel').hidden};
    out.curriculo = curriculoDoPerfil() && curriculoDoPerfil().id;
    confere(out.curriculo === null || out.curriculo === undefined, 'a grade sem quadro de requisitos foi usada como se tivesse');
  }catch(e){ out.passos.push('ERRO ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
