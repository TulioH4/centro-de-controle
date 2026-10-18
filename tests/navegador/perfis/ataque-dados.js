// Perfil de ataque 2: cada parte com o tipo errado, itens quebrados e chaves "__proto__".
// O app tem que abrir e funcionar sem erro, e sem contaminar os objetos (Object.prototype).
(function(){
  const P = 'centro_controle_', id = 'quebrado';
  const set = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const raw = (k, v) => localStorage.setItem(P + id + '_' + k, v);
  const put = (k, v) => set(id + '_' + k, v);
  localStorage.clear();
  set('cloud_skip', true);
  set('profiles', [{id, name: 'Quebrado', curso: 5, createdAt: 'ontem'}]);
  set('active_profile', id);
  put('setup_done', true);
  put('config', {aluno: 42, curso: ['x'], notaMinima: 'muito', disciplinasAtuais: ['M01', '__proto__', 7, null, {a: 1}, 'constructor', 'F01']});
  put('base_data', {historico: [null, 5, 'texto', {sigla: 'M01', disciplina: 7, ch: 'sessenta', nota: {x: 1}, periodo: 'um'}, {sigla: '__proto__', disciplina: 'veneno'}, {disciplina: 'sem sigla'}, {sigla: 'F01', disciplina: 'Física', nota: 70}],
    aulas: 'nenhuma', turmas: [1, 2], relatorios: {a: 1}, provasOficiais: null});
  raw('historico_custom', '{"nao":"lista"}');
  raw('historico_overrides', '{"__proto__": {"poluido": true}, "M01": "texto", "F01": {"nota": 88}}');
  put('historico_removidos', 'M01');
  put('tarefas', [null, 1, 'x', {nome: {a: 1}, prazo: 20261017, status: 3}, {id: 'ok', nome: 'Tarefa boa', prazo: '2026-10-20', status: 'Pendente', prioridade: 'Alta', categoria: 'Estudo'}]);
  put('provas', [{disciplina: 5, data: 12}, {id: 'p', disciplina: 'Física (F01)', tipo: 3, data: '2026-10-30', hora: 1930}, null]);
  raw('faltas', '{"__proto__": {"faltas": 99}, "M01": {"faltas": "muitas"}, "F01": 3, "constructor": {"faltas": 1}}');
  put('faltas_limites', {M01: 'dez', F01: -5});
  put('faltas_registro', {nao: 'lista'});
  put('horas_comp', [{nome: 3, total: 'cem', validadas: {}}, 'x']);
  put('horas_global', ['lista']);
  put('notas_parciais', {M01: 'texto', F01: [{label: 5, valor: 'oito', peso: 'pesado'}, null, 3], __proto__x: 1});
  put('metas_notas', {M01: 'alta', F01: 150});
  put('lembretes', 'nenhum');
  put('pom_sessions', [{duracaoMin: 'muito', ts: 'ontem'}, 5]);
  put('disc_notes', {M01: {a: 1}, F01: 'nota ok'});
  put('estudos_materiais', [{id: 'e', titulo: 5, criadoEm: 'ontem', quizHist: [{acertos: 'x', total: null}, 'y'], resumo: 'x', quiz: 7}, null]);
  put('semestres', [{disciplinas: 'x'}, {semestre: 5, encerradoEm: 'x', disciplinas: [{nome: 3, nota: 'dez', faltas: 'x'}]}]);
  put('relatorios_overrides', ['x']);
  put('relatorios_ocultos', {x: 1});
  put('lab_concluido', 'sim');
  put('labs', 7);
  put('grade_oferta', {titulo: 3, registros: [['P1', '__proto__', 'A', 'Segunda', '19h30', 0, '', ''], 'x', ['P2', 'M01', 'A', 'Segunda', '19h30', 'sim', 5, null]]});
  put('grade_plano', {escolhidas: 'M01', sel: [], turno: 'noite', limite: 'max'});
  put('aulas_custom', {dia: 'Segunda'});
  put('turmas_custom', 'x');
  put('horas_comp_x', 1);
  put('tema', 7);
})();
