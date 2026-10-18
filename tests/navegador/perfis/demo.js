// Fictitious profile used only for README screenshots (no real data).
(function(){
  const P = 'centro_controle_';
  const id = 'demo';
  const set = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const put = (k, v) => set(id + '_' + k, v);
  localStorage.clear();
  set('cloud_skip', true);
  set('profiles', [{id, name: 'Ana Souza', curso: 'Engenharia de Produção', createdAt: Date.now()}]);
  set('active_profile', id);
  const atuais = ['P10', 'M07', 'P14', 'E05', 'P18'];
  put('setup_done', true);
  put('config', {aluno: 'Ana Souza', curso: 'Engenharia de Produção', instituicao: 'Universidade Exemplo',
    semestre: '2º semestre de 2026', notaMinima: 60, disciplinasAtuais: atuais, railPosition: 'left', railAutoHide: false});
  put('base_data', {
    aluno: 'Ana Souza', curso: 'Engenharia de Produção', instituicao: 'Universidade Exemplo',
    semestre: '2º semestre de 2026', notaMinima: 60, disciplinasAtuais: atuais,
    historico: [
      {sigla:'M01', disciplina:'Cálculo I', ch:80, nota:78, semestre:'2025/1'},
      {sigla:'F01', disciplina:'Física I', ch:80, nota:71, semestre:'2025/1'},
      {sigla:'P01', disciplina:'Introdução à Engenharia de Produção', ch:40, nota:92, semestre:'2025/1'},
      {sigla:'M02', disciplina:'Cálculo II', ch:80, nota:66, semestre:'2025/2'},
      {sigla:'P05', disciplina:'Estatística Aplicada', ch:60, nota:84, semestre:'2025/2'},
      {sigla:'P08', disciplina:'Gestão da Qualidade', ch:60, nota:88, semestre:'2026/1'},
      {sigla:'P10', disciplina:'Pesquisa Operacional', ch:80, nota:null, semestre:null},
      {sigla:'M07', disciplina:'Métodos Numéricos', ch:60, nota:null, semestre:null},
      {sigla:'P14', disciplina:'Planejamento e Controle da Produção', ch:80, nota:null, semestre:null},
      {sigla:'E05', disciplina:'Engenharia Econômica', ch:60, nota:null, semestre:null},
      {sigla:'P18', disciplina:'Logística', ch:60, nota:null, semestre:null},
    ],
    aulas: [
      {dia:'Segunda', inicio:'19:30', fim:'21:10', disciplina:'P10', local:'Sala 12', tipo:'Presencial'},
      {dia:'Segunda', inicio:'21:20', fim:'23:00', disciplina:'M07', local:'Sala 7', tipo:'Presencial'},
      {dia:'Terça', inicio:'19:30', fim:'21:10', disciplina:'P14', local:'Lab 3', tipo:'Presencial'},
      {dia:'Quarta', inicio:'19:30', fim:'21:10', disciplina:'E05', local:'Sala 4', tipo:'Presencial'},
      {dia:'Quinta', inicio:'19:30', fim:'21:10', disciplina:'P18', local:'Sala 9', tipo:'Presencial'},
      {dia:'Sexta', inicio:'19:30', fim:'21:10', disciplina:'P10', local:'Sala 12', tipo:'Presencial'},
      {dia:'Sábado', inicio:'08:00', fim:'09:40', disciplina:'M07', local:'Sala 7', tipo:'Presencial'},
      {dia:'Sábado', inicio:'10:00', fim:'11:40', disciplina:'P14', local:'Lab 3', tipo:'Presencial'},
    ],
    turmas: {Segunda:['L1 (19h30)'], Terça:['L2 (19h30)'], Quarta:[], Quinta:['L3 (19h30)'], Sexta:[], Sábado:['L4 (10h)']},
    relatorios: [
      {nome:'Relatório 1', inicio:'2026-09-28', fim:'2026-10-16'},
      {nome:'Relatório 2', inicio:'2026-10-19', fim:'2026-11-06'},
    ],
    provasOficiais: [
      {id:'d1', disciplina:'Pesquisa Operacional (P10)', tipo:'P1', data:'2026-10-13', hora:'19:30', local:'Sala 12'},
      {id:'d2', disciplina:'Métodos Numéricos (M07)', tipo:'P1', data:'2026-10-15', hora:'19:30', local:'Sala 7'},
      {id:'d3', disciplina:'Engenharia Econômica (E05)', tipo:'P1', data:'2026-10-21', hora:'19:30', local:'Sala 4'},
      {id:'d4', disciplina:'Logística (P18)', tipo:'P1', data:'2026-10-29', hora:'19:30', local:'Sala 9'},
      {id:'d5', disciplina:'Pesquisa Operacional (P10)', tipo:'P2', data:'2026-11-24', hora:'19:30', local:'Sala 12'},
    ],
  });
  put('tarefas', [
    {id:'t1', nome:'Lista 3 de Pesquisa Operacional', categoria:'Trabalho', disciplina:'P10', prazo:'2026-10-12', status:'Em andamento', prioridade:'Alta'},
    {id:'t2', nome:'Resumo do capítulo 4 de Logística', categoria:'Trabalho', disciplina:'P18', prazo:'2026-10-14', status:'Pendente', prioridade:'Média'},
    {id:'t3', nome:'Projeto de PCP: cronograma', categoria:'Projeto', disciplina:'P14', prazo:'2026-10-20', status:'Pendente', prioridade:'Média'},
  ]);
  put('faltas', {P10:{faltas:2}, M07:{faltas:1}, P14:{faltas:0}, E05:{faltas:3}, P18:{faltas:1}});
  put('notas_parciais', {P10:[{label:'P1', valor:null, peso:1},{label:'P2', valor:null, peso:1}], M07:[{label:'T1', valor:82, peso:1},{label:'P1', valor:null, peso:2}]});
  put('lembretes', [
    {id:'l1', text:'Levar calculadora na P1 de PO', createdAt:1},
    {id:'l2', text:'Imprimir o template do relatório', createdAt:2},
  ]);
  put('tema', 'dark');
})();
