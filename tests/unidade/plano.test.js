// "Meu plano": disciplinas fixadas em semestres aleatórios. As fixadas ficam exatamente onde a pessoa
// escolheu, as livres respeitam os requisitos, e as escolhas que quebram requisito são marcadas.
const {requisitos, verificador} = require('./_app');
const v = verificador('meu plano (disciplinas fixadas)');

const C = requisitos({historico: [], config: {}}).CURRICULOS[0], todas = Object.keys(C.creditos);
let seed = 5;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

for(let t = 0; t < 500; t++){
  const historico = [], atuais = [], P = Math.floor(rnd() * 8);
  C.semestres.forEach((s, i) => s.forEach(([sg, n]) => {
    const it = {sigla: sg, disciplina: n, nota: null};
    if(i < P && rnd() < 0.9) it.nota = rnd() < 0.85 ? 75 : 40; else if(i === P && rnd() < 0.7) atuais.push(sg);
    historico.push(it);
  }));
  const f = requisitos({historico, config: {notaMinima: 60, disciplinasAtuais: atuais, curso: 'Engenharia de Produção', instituicao: 'INATEL', semestre: '2º semestre de 2026'}});
  const base = f.reqBase(true), faltam = todas.filter(s => !base.aprov.has(s)), fixos = {};
  faltam.forEach(s => { if(rnd() < 0.15) fixos[s] = Math.floor(rnd() * 6); });
  const lim = 14 + Math.floor(rnd() * 10) * 2, p = f.reqPlano(C, lim, {fixos}), rot = `caso ${t}`;
  v.ok(!p.sobra.length, `${rot}: sobraram ${p.sobra.join(',')}`);
  const pos = {};
  p.sems.forEach((sm, k) => sm.siglas.forEach(s => { v.ok(pos[s] === undefined, `${rot}: ${s} repetida`); pos[s] = k; }));
  faltam.forEach(s => v.ok(pos[s] !== undefined, `${rot}: ${s} ficou de fora`));
  Object.entries(fixos).forEach(([s, k]) => v.ok(pos[s] === k, `${rot}: ${s} fixada em ${k}, foi para ${pos[s]}`));
  const ok = (s, k) => f.reqDe(C, s).every(x => x.tipo === 'II' ? (base.freq.has(x.s) || pos[x.s] < k) : x.tipo === 'Co' ? (base.aprov.has(x.s) || pos[x.s] <= k) : (base.aprov.has(x.s) || pos[x.s] < k));
  faltam.forEach(s => {
    const k = pos[s]; if(k === undefined) return;
    const quebra = !ok(s, k);
    if(fixos[s] === undefined) v.ok(!quebra, `${rot}: ${s} livre sem os requisitos antes`);
    else v.ok(quebra === !!p.violacoes[s], `${rot}: violação de ${s} marcada errado`);
  });
  p.sems.forEach((sm, k) => { const fixas = f.reqCred(C, sm.siglas.filter(s => fixos[s] === k)); v.ok(sm.creditos <= Math.max(lim, fixas), `${rot}: semestre ${k + 1} passou do limite`); });
}

// número absoluto do semestre e contagem até a formatura
const g = requisitos({historico: [], config: {}});
v.igual([g.semNum('2º semestre de 2026'), g.semNum('1º Semestre de 2027'), g.semNum('2026/2'), g.semNum('2026.1'), g.semNum('4º período')], [4053, 4054, 4053, 4052, null], 'semNum');
v.ok(/^daqui a cerca de|no fim deste semestre/.test(g.reqContagem(4060)), 'contagem até a formatura');

v.fim();
