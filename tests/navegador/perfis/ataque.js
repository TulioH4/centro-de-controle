// Perfil de ataque: todo texto guardado leva HTML (um marcador <i class=pwnd> e um <img onerror>)
// e aspas para quebrar atributos. Se algum marcador aparecer na página, aquele campo não tem escape.
(function(){
  const P = 'centro_controle_', id = 'evil';
  const X = s => `${s}"'><i class=pwnd>${s}</i><img src=x onerror="window.__pwn=(window.__pwn||0)+1">`;
  const set = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const put = (k, v) => set(id + '_' + k, v);
  localStorage.clear();
  set('cloud_skip', true);
  set('profiles', [{id, name: X('Nome'), curso: X('Curso'), createdAt: Date.now() - 3 * 86400000}]);
  set('active_profile', id);
  const hoje = new Date(), iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const dia = n => iso(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n));
  const S1 = X('S1'), S2 = 'M01';
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const hojeNome = DIAS[hoje.getDay()];
  const atuais = [S1, S2];
  const cfg = {aluno: X('Aluno'), curso: X('Curso'), instituicao: X('Inst'), semestre: X('Sem'), notaMinima: 60, disciplinasAtuais: atuais, railPosition: 'left', railAutoHide: false};
  put('setup_done', true);
  put('config', cfg);
  put('base_data', Object.assign({}, cfg, {
    historico: [
      {sigla: S1, disciplina: X('Disc1'), ch: 60, nota: null, semestre: X('2026/1'), periodo: 1},
      {sigla: S2, disciplina: X('Disc2'), ch: 60, nota: null, semestre: null, periodo: 1},
      {sigla: 'F01', disciplina: X('Disc3'), ch: 60, nota: 45, semestre: '2025/2', periodo: 1},
    ],
    aulas: [{dia: hojeNome, inicio: '00:01', fim: '23:58', disciplina: S1, local: X('Sala'), tipo: X('Tipo')}],
    turmas: {Segunda: [X('L6')]},
    relatorios: [{nome: X('Rel1'), inicio: dia(-3), fim: dia(1)}],
    provasOficiais: [],
  }));
  put('historico_custom', [{sigla: X('C1'), disciplina: X('Custom'), ch: null, nota: X('nota'), semestre: X('s'), periodo: 2, _custom: true}]);
  put('historico_overrides', {[S2]: {nota: X('ov')}});
  put('tarefas', [
    {id: X('t1'), nome: X('Tarefa'), categoria: X('Cat'), disciplina: X('TD'), prazo: dia(0), prioridade: X('Alta'), status: X('Pendente')},
    {id: X('t2'), nome: X('Tarefa2'), categoria: 'Relatório de Lab.', disciplina: S1, prazo: dia(-1), prioridade: 'Alta', status: 'Pendente'},
  ]);
  put('provas', [
    {id: X('p1'), disciplina: `${X('ProvaDisc')} (${S1})`, tipo: X('P1'), data: dia(1), hora: '19:30', local: X('Local')},
    {id: X('p2'), disciplina: X('ProvaDisc2'), tipo: X('P2'), data: dia(-5), hora: X('h'), local: X('L2')},
  ]);
  put('faltas', {[S1]: {faltas: X('3')}, [S2]: {faltas: 2}});
  put('faltas_limites', {[S1]: X('9')});
  put('faltas_registro', [{data: dia(0), inicio: X('i'), sigla: S1, n: X('n')}]);
  put('horas_comp', [{id: X('h1'), sigla: X('HC'), nome: X('Hora'), total: X('10'), validadas: X('5')}]);
  put('horas_global', {confirmadas: X('1'), consumidas: 2, previstas: X('3'), creditos: 4});
  put('notas_parciais', {[S1]: [{label: X('NP1'), valor: X('70'), peso: X('1')}], [S2]: [{label: X('NP2'), valor: 80, peso: 0.5}]});
  put('metas_notas', {[S1]: X('80')});
  put('lembretes', [{id: X('l1'), texto: X('Lembrete'), cor: X('yellow'), criado: Date.now()}]);
  put('pom_sessions', [{sigla: S1, nome: X('Pom'), duracaoMin: 25, ts: new Date().toISOString()}]);
  put('disc_notes', {[S1]: X('nota da disciplina')});
  put('estudos_materiais', [{id: X('e1'), titulo: X('Material'), disciplina: S1, criadoEm: Date.now(), fonte: X('fonte'),
    resumo: [{topico: X('Top'), pontos: [X('ponto')]}], conceitos: [{termo: X('Termo'), definicao: X('Def')}],
    flashcards: [{frente: X('F'), verso: X('V')}], quiz: [{pergunta: X('Q'), alternativas: [X('a'), X('b')], correta: 0, explicacao: X('E')}],
    dissertativas: [{pergunta: X('D'), resposta: X('R')}], quizzes: [{acertos: X('1'), total: X('2')}]}]);
  put('semestres', [{id: X('sem1'), semestre: X('Semestre'), encerradoEm: Date.now() - 86400000,
    disciplinas: [{sigla: S1, nome: X('SemDisc'), nota: X('7'), passou: true, faltas: X('2'), parciais: []}]}]);
  put('relatorios_overrides', {});
  put('relatorios_ocultos', []);
  put('lab_concluido', {});
  put('labs', {});
  put('grade_oferta', {titulo: X('PDF'), lidoEm: Date.now(), registros: [
    ['P1', S1, 'A', 'Segunda', '19h30', 0, X('Prof'), X('Sala')], ['P1', S1, 'A', 'Segunda', '20h20', 0, X('Prof'), X('Sala')],
    ['P1', 'F01', X('B'), 'Terça', '19h30', 0, X('Prof2'), X('Sala2')], ['P1', 'F01', 'L1', 'Quarta', '19h30', 0, '', ''],
  ]});
  put('grade_plano', {escolhidas: [S1, 'F01'], sel: {[S1]: {teoria: 'A'}}, turno: {noite: true}, limite: 0});
  put('aulas_custom', [{dia: hojeNome, inicio: '00:01', fim: '23:58', disciplina: S1, local: X('Sala'), tipo: X('Tipo')},
    {dia: '—', inicio: '—', fim: '—', disciplina: X('Async'), local: X('SemHorario'), tipo: 'Assíncrona'}]);
  put('turmas_custom', {[hojeNome]: [X('Turma')]});
  put('tema', 'dark');
})();
