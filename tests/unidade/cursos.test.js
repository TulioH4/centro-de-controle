// As grades dos cursos de engenharia do Inatel que o assistente oferece: cada uma com 10 períodos, códigos
// sem repetir e nomes preenchidos; o mesmo código tem o mesmo nome em todos os cursos; só Produção tem o
// quadro de requisitos; e escolher qualquer uma delas liga a regra do Inatel (NP3).
const {requisitos, notas, verificador} = require('./_app');
const v = verificador('grades dos cursos do Inatel');

const C = requisitos({historico: [], config: {}}).CURRICULOS;
v.igual(C.map(c => c.id), ['inatel-producao', 'inatel-biomedica', 'inatel-computacao', 'inatel-automacao', 'inatel-eletrica', 'inatel-software', 'inatel-telecom'], 'os sete cursos, Produção primeiro');
const nomes = {};
C.forEach(c => {
  const sg = c.semestres.flat();
  v.ok(c.semestres.length === 10, `${c.curso}: 10 períodos`);
  v.ok(new Set(sg.map(x => x[0])).size === sg.length, `${c.curso}: nenhum código repetido`);
  v.ok(sg.every(([s, n]) => /^([A-Z]{1,4}\d{1,2}|TCC)$/.test(s) && n && n.trim() === n), `${c.curso}: códigos e nomes preenchidos`);
  v.ok(['AT01', 'AT10', 'EST1', 'TCC', 'M01', 'C02'].every(s => sg.some(x => x[0] === s)), `${c.curso}: tem o núcleo comum, as atividades, o estágio e o TCC`);
  sg.forEach(([s, n]) => { (nomes[s] = nomes[s] || new Set()).add(n); });
});
// a mesma disciplina não pode aparecer com dois nomes (o Histórico e o montador de grade cruzam os códigos)
const dois = Object.entries(nomes).filter(([s, ns]) => ns.size > 1 && s !== 'TCC').map(([s, ns]) => `${s}: ${[...ns].join(' / ')}`);
v.igual(dois, [], 'mesmo código, mesmo nome em todos os cursos');
v.igual(C.filter(c => c.requisitos).map(c => c.id), ['inatel-producao'], 'só Produção tem o quadro de requisitos');
// exemplos conferidos nas grades oficiais
const em = (id, s) => { const c = C.find(x => x.id === id); return c.semestres.findIndex(p => p.some(x => x[0] === s)) + 1; };
v.igual([em('inatel-telecom', 'T27'), em('inatel-software', 'S01'), em('inatel-biomedica', 'B32'), em('inatel-biomedica', 'B31'), em('inatel-eletrica', 'L01'), em('inatel-automacao', 'A12'), em('inatel-computacao', 'C13')],
  [5, 4, 7, 8, 7, 8, 8], 'disciplinas no período certo');

// a regra do Inatel vale para qualquer grade dele escolhida no assistente, mesmo sem a faculdade escrita
const regra = curriculo => notas({config: {curriculo, instituicao: '', notaMinima: 60}, notasParciais: {}, historico: []}).regraNP3();
v.igual(['inatel-telecom', 'inatel-software', 'inatel-producao', ''].map(regra), [true, true, true, false], 'regra da NP3 pela grade escolhida');

v.fim();
