// Ajustes de 20/10/2026: avisos do próprio app (sem a caixa do navegador), "Novo item" cabendo no
// celular, tarefa nova no quadro, horas complementares, listas no lugar de digitar, Configurações no pé,
// "Relatórios e tarefas" no Painel, calendário de provas no celular, ligações do Mapa pelos vãos e o
// horário montado junto no passo 2 do "Encerrar semestre". Roda no computador e no celular (390 px).
setTimeout(async () => {
  const out = {w: innerWidth, falhas: []};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const confere = (cond, msg) => { if(!cond) out.falhas.push(msg); };
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  const celular = matchMedia('(max-width:880px)').matches;
  // nenhuma caixa do navegador (elas mostram o endereço do site no título)
  const nativas = [];
  window.alert = m => nativas.push('alert: ' + m); window.confirm = m => { nativas.push('confirm: ' + m); return true; };
  const dentro = (el, W) => { const b = el.getBoundingClientRect(); return b.left >= -1 && b.right <= W + 1; };

  // 1. aviso do app: abre por cima, responde, e o Esc fecha só ele
  await passo('dialogo', async () => {
    const ov = document.getElementById('dlgOverlay');
    let p = confirmar('Os dados atuais deste perfil serão substituídos.', {titulo: 'Restaurar o backup?', ok: 'Restaurar', perigo: true});
    await espera(300);
    const r = {aberto: ov.classList.contains('open'), titulo: txt(document.getElementById('dlgTitulo')), ok: txt(document.getElementById('dlgOk')), foco: document.activeElement && document.activeElement.id};
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    r.esc = await p;
    p = confirmar('', {titulo: 'Seguir?'}); await espera(50);
    document.getElementById('dlgOk').click();
    r.sim = await p;
    p = avisar('Escolha o seu curso.'); await espera(50);
    r.soAviso = document.getElementById('dlgCancelar').hidden;
    document.getElementById('dlgOk').click(); await p;
    r.fechado = !ov.classList.contains('open');
    confere(r.aberto && r.titulo === 'Restaurar o backup?' && r.ok === 'Restaurar', 'o aviso do app não abriu com título e botão');
    confere(r.foco === 'dlgCancelar', 'no que apaga, o foco não ficou no Cancelar');
    confere(r.esc === false && r.sim === true && r.soAviso && r.fechado, 'o aviso não respondeu certo (Esc, OK, só aviso)');
    return r;
  });

  // 2. tarefas: disciplina numa lista, "Outra…" com texto, e a nova aparece no quadro na hora
  await passo('tarefas', async () => {
    switchTab('tarefas'); await espera(100);
    document.getElementById('btnViewKanban').click(); await espera(50);
    const antes = document.querySelectorAll('#kanbanBoard .kanban-card').length;
    openQuickAdd('tarefa'); await espera(150);
    const sel = document.getElementById('qaTarefaDisc'), opcoes = [...sel.options].map(o => o.value);
    const panel = document.getElementById('quickAddPanel'), W = document.documentElement.clientWidth;
    const r = {opcoes: opcoes.length, primeira: opcoes[0], ultima: opcoes[opcoes.length - 1],
      cabe: panel.scrollWidth <= panel.clientWidth + 1 && [...panel.querySelectorAll('input, select, button')].filter(e => e.offsetParent).every(e => dentro(e, W))};
    document.getElementById('qaTarefaNome').value = 'Lista do laboratório';
    sel.value = '__outro__'; sel.dispatchEvent(new Event('change'));
    r.outraAberta = !document.getElementById('qaTarefaDiscOutra').hidden;
    document.getElementById('qaTarefaDiscOutra').value = 'Monitoria';
    document.getElementById('qaTarefaPrazo').value = localISO(new Date(Date.now() + 2 * 86400000));
    document.getElementById('qaBtnAddTarefa').click(); await espera(300);
    const t = STATE.tarefas.find(x => x.nome === 'Lista do laboratório');
    r.disc = t && t.disciplina;
    r.noQuadro = document.querySelectorAll('#kanbanBoard .kanban-card').length - antes;
    // a lista da aba: as disciplinas cursando
    document.getElementById('btnViewList').click(); await espera(50);
    r.abaOpcoes = [...document.getElementById('fDisciplina').options].map(o => o.value).filter(v => v && v !== '__outro__');
    // editar mantém o valor que não está na lista
    _editingTarefaId = t.id; renderTarefas(); await espera(50);
    r.edita = document.getElementById('tEditDisc_' + t.id).value;
    _editingTarefaId = null; renderTarefas();
    confere(r.cabe, '"Novo item" passa da borda da tela');
    confere(r.primeira === '' && r.ultima === '__outro__' && r.opcoes === (STATE.config.disciplinasAtuais.length + 2), 'a disciplina da tarefa não virou lista');
    confere(r.outraAberta && r.disc === 'Monitoria', '"Outra…" não abriu o campo de texto');
    confere(r.noQuadro === 1, 'a tarefa nova não apareceu no quadro');
    confere(JSON.stringify(r.abaOpcoes) === JSON.stringify(STATE.config.disciplinasAtuais), 'a lista da aba Tarefas não tem as disciplinas cursando');
    confere(r.edita === 'Monitoria', 'editar perdeu a disciplina que não está na lista');
    return r;
  });

  // 3. Painel: relatórios e tarefas juntos; sem o plano de estudos de 7 dias
  await passo('painel', async () => {
    switchTab('painel'); renderPainel(); await espera(100);
    const titulo = txt(document.getElementById('prazosList').parentElement.querySelector('.stat__label'));
    const linhas = [...document.querySelectorAll('#prazosList .row-item')].map(txt);
    const r = {titulo, tarefa: linhas.some(l => /Lista do laboratório/.test(l) && /Tarefa, faltam 2 dias/.test(l)), plano: !!document.getElementById('planoEstudosPanel')};
    confere(r.titulo === 'Relatórios e tarefas' && r.tarefa, 'o Painel não mostra as tarefas junto dos relatórios');
    confere(!r.plano && !/próximos 7 dias/.test(document.getElementById('tab-painel').textContent), 'o plano de estudos de 7 dias ainda aparece');
    // resumo do dia: sem a sequência de estudos, e todo valor no mesmo tamanho (número junto da palavra)
    STATE.pomSessions = [{ts: new Date().toISOString(), sigla: 'F01', min: 25}]; renderPainel();
    const cards = [...document.querySelectorAll('#resumoStats .stat')];
    r.resumo = cards.map(txt);
    confere(!r.resumo.some(t => /Sequência/.test(t)), 'o card da sequência de estudos ainda aparece');
    confere(cards.every(c => c.querySelector('.stat__value.small')) && /^Aulas hoje (\d+ aulas?|Nenhuma)$/.test(r.resumo[0]), 'os números do resumo não estão no mesmo tamanho dos outros valores');
    return r;
  });

  // 4. horas complementares: o formulário fecha depois de adicionar
  await passo('horas', async () => {
    switchTab('horas'); await espera(50);
    document.getElementById('btnNovaHora').click();
    document.getElementById('hcNome').value = 'Monitoria de Cálculo'; document.getElementById('hcTotal').value = '30';
    document.getElementById('btnAddHora').click(); await espera(200);
    const r = {fechou: document.getElementById('horasAddPanel').hidden, salva: STATE.horasComp.some(h => h.nome === 'Monitoria de Cálculo')};
    confere(r.fechou && r.salva, 'o formulário de horas não fechou depois de adicionar');
    return r;
  });

  // 5. Configurações: no pé da barra (computador) ou no fim do "Mais" (celular); semestre numa lista
  await passo('config', async () => {
    const r = {};
    if(celular){
      openMoreSheet(); await espera(100);
      r.naGrade = !!document.querySelector('#moreSheet .msheet__grid [data-more-tab="config"]');
      r.noFim = (document.querySelector('#moreSheet .msheet__actions > :last-child') || {}).dataset?.moreTab === 'config';
      closeMoreSheet();
      confere(!r.naGrade && r.noFim, 'Configurações não está no fim do "Mais"');
    } else {
      const bs = [...document.querySelectorAll('#navRail .navbtn')], cfg = bs.find(b => b.dataset.tab === 'config'), antes = bs[bs.indexOf(cfg) - 1];
      r.ultima = bs[bs.length - 1] === cfg;
      r.distancia = Math.round(cfg.getBoundingClientRect().top - antes.getBoundingClientRect().bottom);
      r.noPe = Math.round(document.getElementById('navRail').getBoundingClientRect().bottom - cfg.getBoundingClientRect().bottom);
      confere(r.ultima && r.distancia > 40 && r.noPe < 30, 'Configurações não ficou no pé da barra lateral');
    }
    switchTab('config'); await espera(50);
    const s = document.getElementById('cSemestre');
    r.semestre = {tag: s.tagName, valor: s.value, opcoes: s.options.length};
    confere(s.tagName === 'SELECT' && s.value === STATE.config.semestre, 'o semestre atual das Configurações não é uma lista');
    return r;
  });

  // 6. calendário de provas: no celular, número no meio e pontos no lugar das etiquetas cortadas
  await passo('calendario', async () => {
    STATE.provas.push({id: 'p-cal', disciplina: 'Teste (F01)', tipo: 'P1', data: localISO(new Date()), hora: '19:30'});
    switchTab('provas'); renderProvas(); renderCalendarGrid(); await espera(100);
    const hoje = document.querySelector('.navday.today'), marca = hoje && hoje.querySelector('.nd-marks > .exam-dot');
    const b = marca && marca.getBoundingClientRect();
    const r = {marca: !!marca, tam: b ? [Math.round(b.width), Math.round(b.height)] : null, texto: marca ? getComputedStyle(marca).fontSize : null,
      borda: hoje ? getComputedStyle(hoje).borderTopStyle + ' ' + getComputedStyle(hoje).borderTopWidth : null};
    STATE.provas = STATE.provas.filter(p => p.id !== 'p-cal'); renderProvas();
    if(celular) confere(r.marca && r.tam[0] === 6 && r.tam[1] === 6 && r.texto === '0px', 'no celular a prova não virou um ponto');
    else confere(r.marca && r.tam[0] > 20, 'no computador a etiqueta da prova sumiu');
    return r;
  });

  // 7. Mapa (árvore): nenhuma ligação passa por cima de uma disciplina que não é a ponta dela
  await passo('arvore', async () => {
    lsSet('mapa_vista', 'arvore'); switchTab('mapa'); renderMapaSucesso(); await espera(200);
    const r = {};
    for(const sg of ['C02', 'P10', 'M05', 'P17']){
      if(!document.querySelector(`[data-arv="${sg}"]`)) continue;
      ARV_SEL = null; document.querySelector(`[data-arv="${sg}"]`).click(); await espera(100);
      const palco = document.getElementById('arvPalco'), pr = palco.getBoundingClientRect();
      const caixas = [...palco.querySelectorAll('[data-arv]')].map(b => { const q = b.getBoundingClientRect(); return {sg: b.dataset.arv, l: q.left - pr.left, r: q.right - pr.left, t: q.top - pr.top, b: q.bottom - pr.top}; });
      let cruzou = [];
      [...document.querySelectorAll('#arvSvg path.arv-l')].forEach((p, i) => {
        const a = ARV_ARESTAS[i], L = p.getTotalLength();
        for(let d = 0; d <= L; d += 2){
          const pt = p.getPointAtLength(d);
          const c = caixas.find(c => pt.x > c.l + 1 && pt.x < c.r - 1 && pt.y > c.t + 1 && pt.y < c.b - 1);
          if(c && c.sg !== a.de && c.sg !== a.para){ cruzou.push(`${a.de}→${a.para} sobre ${c.sg}`); break; }
        }
      });
      // descida reta: no máximo 4 curvas (desce, vai ao vão, desce, vai à disciplina, desce), sem degraus
      const curvas = Math.max(0, ...[...document.querySelectorAll('#arvSvg path.arv-l')].map(p => (p.getAttribute('d').match(/Q/g) || []).length));
      r[sg] = {ligacoes: ARV_ARESTAS.length, cruzou, curvas};
      confere(!cruzou.length, `ligações de ${sg} passam por cima de disciplinas: ${cruzou.slice(0, 3).join('; ')}`);
      confere(curvas <= 4, `ligações de ${sg} fazem degraus (${curvas} curvas)`);
    }
    ARV_SEL = null; lsSet('mapa_vista', 'semestres');
    return r;
  });

  // 8. encerrar o semestre com o PDF de horários: o passo 2 monta o horário, e o nome do novo semestre vem sozinho
  await passo('encerrar', async () => {
    STATE.gradeOferta = window.__OFERTA; STATE.gradePlano = null;
    const antes = {semestre: STATE.config.semestre, atuais: [...STATE.config.disciplinasAtuais]};
    abrirFimSemestre(); await espera(50);
    document.getElementById('semAvancar').click(); await espera(150);
    const r = {passo: SEM.passo, nome: txt(document.querySelector('.sem-novo')), montadorAqui: document.getElementById('gmApp').parentElement.id,
      digitar: !!document.querySelector('#semBody input#semRotulo'), larga: document.getElementById('semModal').classList.contains('is-larga')};
    gMelhorGrade(); await espera(100);
    r.marcadas = gPlano().escolhidas.filter(s => GM.disc.has(s));
    r.semChoque = !Object.values(gOcupado(gEscolhidas())).some(es => es.length > 1);
    // nada do passo 2 passa da borda (a semana tem rolagem lateral própria)
    const W = document.documentElement.clientWidth;
    r.largos = [...document.querySelectorAll('#semModal *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > W + 2 || b.left < -2) && !e.closest('.gm-semana, .gm-grade'); })
      .slice(0, 4).map(e => (e.id || e.className) + ' ' + Math.round(e.getBoundingClientRect().right));
    confere(!r.largos.length, 'o passo 2 com o montador passa da borda: ' + r.largos.join(', '));
    document.getElementById('semAvancar').click(); await espera(150);
    r.passo3 = {passo: SEM.passo, opcaoHorario: !!document.querySelector('[data-limpar="horario"]'), montadorVoltou: document.getElementById('gmApp').parentElement.id};
    document.getElementById('semAvancar').click(); await espera(300);
    r.depois = {semestre: STATE.config.semestre, atuais: STATE.config.disciplinasAtuais, aulas: STATE.aulasCustom.length,
      salvas: JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_aulas_custom')).length, fim: txt(document.querySelector('#semBody .help-text'))};
    fecharFimSemestre();
    // desfazer pelo aviso do app: Cancelar não mexe em nada; "Desfazer" volta como era
    const reg = STATE.semestres[STATE.semestres.length - 1];
    let p = desfazerEncerramento(reg.id); await espera(80);
    r.avisoDesfazer = txt(document.getElementById('dlgTitulo'));
    document.getElementById('dlgCancelar').click(); await p;
    r.cancelou = STATE.config.semestre;
    p = desfazerEncerramento(reg.id); await espera(80);
    document.getElementById('dlgOk').click(); await p;
    r.desfeito = {semestre: STATE.config.semestre, atuais: STATE.config.disciplinasAtuais.join(',') === antes.atuais.join(',')};
    const prox = antes.semestre.replace(/^2º semestre de (\d+)$/, (m, a) => `1º semestre de ${Number(a) + 1}`);
    confere(r.passo === 2 && r.nome === 'Novo semestre: ' + prox && !r.digitar, 'o nome do novo semestre não veio sozinho');
    confere(r.montadorAqui === 'semGm' && r.larga, 'o passo 2 não mostra o montador de horário');
    confere(r.marcadas.length > 0 && r.semChoque, 'o montador no passo 2 não montou uma grade sem choque');
    confere(r.passo3.passo === 3 && !r.passo3.opcaoHorario && r.passo3.montadorVoltou === 'gmBody', 'o passo 3 não usou o horário montado');
    confere(r.depois.semestre === prox && [...r.depois.atuais].sort().join(',') === [...r.marcadas].sort().join(','), 'o encerramento não levou as disciplinas montadas');
    confere(r.depois.aulas > 0 && r.depois.salvas === r.depois.aulas && /já com o horário/.test(r.depois.fim), 'o horário montado não foi salvo');
    confere(/Desfazer o encerramento/.test(r.avisoDesfazer) && r.cancelou === prox, 'cancelar o "Desfazer" mexeu em algo');
    confere(r.desfeito.semestre === antes.semestre && r.desfeito.atuais, 'desfazer não voltou ao semestre de antes');
    return r;
  });

  // 8b. ajuda (tecla ?): as dicas da tela aberta e as perguntas; o tour passa por todos os passos
  await passo('ajuda', async () => {
    switchTab('tarefas'); await espera(80);
    document.dispatchEvent(new KeyboardEvent('keydown', {key: '?', bubbles: true})); await espera(100);
    const r = {aberta: document.getElementById('modalAjuda').classList.contains('open'), secao: txt(document.querySelector('#ajudaBody .ajuda-sec')),
      dicas: document.querySelectorAll('#ajudaBody .ajuda-dicas li').length, faq: document.querySelectorAll('#ajudaBody details').length};
    document.getElementById('ajudaTour').click(); await espera(300);
    const W = innerWidth, H = innerHeight, passos = [];
    for(let i = 0; i < TOUR.length; i++){
      const f = document.getElementById('tourFoco'), c = document.getElementById('tourCard').getBoundingClientRect();
      passos.push((f.classList.contains('is-sem') ? 'sem' : 'ok') + (c.left >= 0 && c.right <= W && c.top >= 0 && c.bottom <= H ? '' : ' fora'));
      document.getElementById('tourProx').click(); await espera(280);
    }
    r.passos = passos;
    r.depois = {ativo: tourAtivo(), visto: await storeGet('tour_visto', false), aba: currentTabId()};
    confere(r.aberta && r.secao === 'Nesta tela: Tarefas' && r.dicas >= 3 && r.faq >= 5, 'a Ajuda não abriu com as dicas da tela e as perguntas');
    confere(passos[0] === 'sem' && passos.slice(1).every(x => x === 'ok'), 'algum passo do tour ficou sem destaque ou fora da tela: ' + passos.join(','));
    confere(!r.depois.ativo && r.depois.visto === true && r.depois.aba === 'tarefas', 'o tour não voltou para a aba em que começou');
    // Tab fica nos botões do cartão (não vai para o que está atrás do escuro)
    iniciarTour(); await espera(300); document.getElementById('tourProx').click(); await espera(300);
    const foco = [];
    for(let i = 0; i < 4; i++){ document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Tab', bubbles: true})); foco.push(document.activeElement && document.activeElement.id); }
    r.focoTab = foco;
    confere(foco.every(id => /^tour(Pular|Voltar|Prox)$/.test(id)), 'no tour, o Tab foi para fora do cartão: ' + foco.join(','));
    encerrarTour(); await espera(100);
    // barra lateral no topo: o botão de novo item some, e o passo diz o atalho
    if(!celular){
      applyRailPosition('top', false); await espera(50);
      iniciarTour(); await espera(250); for(let i = 0; i < 3; i++){ document.getElementById('tourProx').click(); await espera(280); }
      r.semBotao = {titulo: txt(document.getElementById('tourTitulo')), texto: txt(document.getElementById('tourTexto')), sem: document.getElementById('tourFoco').classList.contains('is-sem')};
      encerrarTour(); applyRailPosition(STATE.config.railPosition, STATE.config.railAutoHide); await espera(50);
      confere(r.semBotao.titulo === 'Novo item' && r.semBotao.sem && /Ctrl K/.test(r.semBotao.texto) && !/^Adicione/.test(r.semBotao.texto), 'sem o botão na tela, o passo do novo item não disse o atalho');
    }
    // a NP3 aparece na Ajuda só para quem segue a regra do Inatel
    switchTab('desempenho'); await espera(60);
    abrirAjuda(); await espera(60); r.np3Inatel = /NP3/.test(document.getElementById('ajudaBody').textContent); fecharAjuda();
    const inst = STATE.config.instituicao, curr = STATE.config.curriculo;
    STATE.config.instituicao = 'Universidade Exemplo'; STATE.config.curriculo = '';
    abrirAjuda(); await espera(60); r.np3Outra = /NP3/.test(document.getElementById('ajudaBody').textContent); fecharAjuda();
    STATE.config.instituicao = inst; STATE.config.curriculo = curr; switchTab('painel');
    confere(r.np3Inatel && !r.np3Outra, 'a NP3 aparece na Ajuda de quem não é do Inatel (ou some do Inatel)');
    return r;
  });

  // 9. assistente: o semestre atual vem numa lista, já no semestre de hoje
  await passo('assistente', async () => {
    showWizard(null); await espera(100);
    const s = document.getElementById('wSem');
    const r = {tag: s && s.tagName, valor: s && s.value, hoje: semRotulo(semDeHoje())};
    closeWizard();
    confere(r.tag === 'SELECT' && r.valor === r.hoje, 'o semestre do passo 1 não é uma lista com o de hoje');
    return r;
  });

  confere(!nativas.length, 'o app usou a caixa do navegador: ' + nativas.join(' | '));
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2000);
