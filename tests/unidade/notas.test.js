// Regra de aprovação do Inatel: NPA = (NP1 + NP2)/2. NPA ≥ 60 aprova; NPA < 30 reprova; entre os dois,
// NP3 e nota final (NPA + NP3)/2, aprovado com 50 ou mais. Fora do Inatel: média ≥ mínimo.
const {notas, verificador} = require('./_app');
const v = verificador('regra de aprovação (NP3)');

const P = (...vals) => vals.map((x, i) => ({label: 'P' + (i + 1), valor: x, peso: 1}));
const caso = (entradas, cfg) => notas({config: Object.assign({notaMinima: 60, instituicao: 'INATEL', disciplinasAtuais: []}, cfg), notasParciais: {X: entradas}, historico: []});
const fase = (entradas, cfg) => { const r = caso(entradas, cfg).notaSituacao('X'); return {fase: r.fase, final: r.final, precisaNP3: r.precisaNP3}; };

// as quatro saídas da regra
v.igual(fase(P(70, 60)), {fase: 'aprovado', final: 65, precisaNP3: undefined}, 'NPA 65: aprovado direto');
v.igual(fase(P(50, 40)), {fase: 'np3', final: undefined, precisaNP3: 55}, 'NPA 45: vai para a NP3 e precisa de 55');
v.igual(fase([...P(50, 40), {label: 'NP3', valor: 55, peso: 1, np3: true}]), {fase: 'aprovado', final: 50, precisaNP3: 55}, 'NPA 45 + NP3 55: final 50, aprovado');
v.igual(fase([...P(50, 40), {label: 'NP3', valor: 54, peso: 1, np3: true}]), {fase: 'reprovado', final: 49.5, precisaNP3: 55}, 'NPA 45 + NP3 54: final 49,5, reprovado');
v.igual(fase(P(20, 30)), {fase: 'reprovado', final: 25, precisaNP3: undefined}, 'NPA 25: reprovado sem NP3');
v.igual(fase(P(30, 30)).fase, 'np3', 'NPA exatamente 30: tem NP3');
v.igual(fase(P(60, 60)).fase, 'aprovado', 'NPA exatamente 60: aprovado');
// a NP3 não entra na média do semestre, e só vale com o NPA entre 30 e 60
v.igual(caso([...P(70, 60), {label: 'NP3', valor: 0, peso: 1, np3: true}]).notaSituacao('X').final, 65, 'NP3 sobrando não mexe na média');
// pesos (NP1 feita de duas provas de peso 0,5)
v.igual(fase([{valor: 40, peso: 0.5}, {valor: 60, peso: 0.5}, {valor: 50, peso: 1}]).precisaNP3, 50, 'pesos quebrados: NPA 50');

// semestre em andamento
const a = caso(P(40, null)).notaSituacao('X');
v.igual([a.fase, a.precisa, a.precisaPiso, a.maxNPA], ['andamento', 80, 20, 70], 'P1 40: precisa de 80 para não ter NP3, 20 para ter direito a ela');
const b = caso(P(10, null)).notaSituacao('X');
v.igual([b.precisa > 100, b.maxNPA, caso(P(10, null)).notaPerdida(b)], [true, 55, false], 'P1 10: vai para a NP3, mas ainda dá');
const c = caso(P(10, null, null).slice(0, 3).map((e, i) => i === 1 ? Object.assign(e, {valor: 0}) : e)).notaSituacao('X');
v.ok(caso([]).notaPerdida(c) === false, 'P1 10, P2 0, P3 aberta: ainda dá para chegar a 30');
const d = caso(P(0, 0, 0, null)).notaSituacao('X');
v.igual([d.maxNPA < 30, caso([]).notaPerdida(d)], [true, true], 'sem chance de chegar a 30: perdida');
v.igual(caso([]).notaSituacao('X').fase, 'sem', 'sem notas');

// fora do Inatel: média mínima, sem NP3
v.igual(fase(P(50, 40), {instituicao: 'Universidade Exemplo'}), {fase: 'reprovado', final: 45, precisaNP3: undefined}, 'outra faculdade: 45 reprova');
v.igual(fase(P(50, 40), {instituicao: 'Universidade Exemplo', regraNota: 'np3'}).fase, 'np3', 'NP3 escolhida nas configurações');
v.igual(fase(P(50, 40), {regraNota: 'media'}).fase, 'reprovado', 'Inatel com "reprova" escolhido');
const e = caso(P(10, null), {instituicao: 'Universidade Exemplo'});
v.ok(e.notaPerdida(e.notaSituacao('X')), 'outra faculdade: precisa de mais de 100 é perdida');

// histórico: no Inatel a nota final que aprova é 50 (abaixo de 60 só se chega pela NP3)
const h = (nota, cfg, extra) => caso([], cfg).situacao(Object.assign({sigla: 'Y', nota}, extra));
v.igual([h(52), h(50), h(49.5), h(60), h(80, {}, {aprovado: false})], ['Aprovado', 'Aprovado', 'Reprovado', 'Aprovado', 'Reprovado'], 'situação no histórico (Inatel)');
v.igual([h(52, {instituicao: 'Universidade Exemplo'}), h(52, {instituicao: 'Universidade Exemplo'}, {aprovado: true})], ['Reprovado', 'Aprovado'], 'situação no histórico (outra faculdade)');
v.igual([caso([]).notaAprova(), caso([], {instituicao: 'X'}).notaAprova(), caso([], {instituicao: 'INATEL — Instituto Nacional de Telecomunicações'}).regraNP3()], [50, 60, true], 'nota que aprova e reconhecimento do Inatel');

v.fim();
