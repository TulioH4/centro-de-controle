// Previsão de formatura: perfis aleatórios. Cada plano tem que respeitar o quadro (I: aprovada antes;
// II: cursada antes; Co: antes ou junto), o limite de créditos, cobrir tudo o que falta e nunca ficar
// abaixo do mínimo que a sequência mais longa exige.
const {requisitos, verificador} = require('./_app');
const v = verificador('previsão de formatura');

const cur = requisitos({historico: [], config: {}}).CURRICULOS[0], todas = Object.keys(cur.creditos);
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

function confere(STATE, limite, rotulo){
  const f = requisitos(STATE), c = f.curriculoDoPerfil(), plano = f.reqPlano(c, limite);
  const base = f.reqBase(true), feitas = new Set(base.aprov), freq = new Set(base.freq);
  const faltam = todas.filter(s => !feitas.has(s)), vistos = new Set();
  plano.sems.forEach((sm, k) => {
    const este = new Set(sm.siglas);
    v.ok(sm.creditos <= limite, `${rotulo}: semestre ${k + 1} com ${sm.creditos} > ${limite}`);
    sm.siglas.forEach(s => {
      v.ok(!vistos.has(s), `${rotulo}: ${s} repetida`); vistos.add(s);
      f.reqDe(c, s).forEach(r => {
        const ok = r.tipo === 'II' ? freq.has(r.s) : r.tipo === 'Co' ? (feitas.has(r.s) || este.has(r.s)) : feitas.has(r.s);
        v.ok(ok, `${rotulo}: semestre ${k + 1}: ${s} sem ${r.s} (${r.tipo})`);
      });
    });
    este.forEach(s => { feitas.add(s); freq.add(s); });
  });
  faltam.forEach(s => v.ok(vistos.has(s), `${rotulo}: ${s} ficou de fora`));
  v.ok(!plano.sobra.length, `${rotulo}: sobraram ${plano.sobra.join(',')}`);
  v.ok(plano.sems.length >= plano.minimo, `${rotulo}: ${plano.sems.length} semestres < mínimo ${plano.minimo}`);
}

// perfis "em ordem": aprovado até o período P, cursando o seguinte, com reprovações
for(let P = 0; P <= 10; P++) for(const reprova of [0, 0.15, 0.4]) for(const limite of [12, 20, 24, 26, 30, 36]) for(let rep = 0; rep < 4; rep++){
  const historico = [], atuais = [];
  cur.semestres.forEach((sem, i) => sem.forEach(([sg, n]) => {
    const it = {sigla: sg, disciplina: n, nota: null, periodo: i + 1};
    if(i + 1 <= P){ it.nota = rnd() < reprova ? (rnd() < 0.5 ? 40 : 80) : 75; if(it.nota === 80) it.aprovado = false; }
    else if(i + 1 === P + 1 && rnd() < 0.8) atuais.push(sg);
    historico.push(it);
  }));
  confere({historico, config: {notaMinima: 60, disciplinasAtuais: atuais, curso: 'Engenharia de Produção', instituicao: 'INATEL', semestre: '2º semestre de 2026'}}, limite, `P${P}/${reprova}/${limite}`);
}
// perfis com aprovações fora de ordem
for(let k = 0; k < 400; k++){
  const historico = [], atuais = [];
  cur.semestres.forEach((sem, i) => sem.forEach(([sg, n]) => { const x = rnd(); historico.push({sigla: sg, disciplina: n, nota: x < 0.35 ? 75 : x < 0.45 ? 40 : null, periodo: i + 1}); if(x > 0.9) atuais.push(sg); }));
  confere({historico, config: {notaMinima: 60, disciplinasAtuais: atuais, curso: 'Engenharia de Produção', instituicao: 'INATEL'}}, 12 + Math.floor(rnd() * 13) * 2, `aleatório ${k}`);
}

// o quadro: somas de créditos por período iguais às do Serviços Acadêmicos, 179 no total
const per = {};
cur.semestres.forEach((s, i) => s.forEach(([sg]) => { if(cur.creditos[sg]) per[i + 1] = (per[i + 1] || 0) + cur.creditos[sg]; }));
v.igual(per, {1: 20, 2: 19, 3: 21, 4: 20, 5: 21, 6: 21, 7: 21, 8: 19, 9: 9, 10: 8}, 'créditos por período');

// nomes dos semestres e reconhecimento do curso
const rot = (s, agora) => requisitos({historico: [], config: {semestre: s}}).reqRotulos(3, agora).join(' | ');
v.igual(rot('2º Semestre de 2026', false), '1º semestre de 2027 | 2º semestre de 2027 | 1º semestre de 2028', 'rótulos a partir de "2º Semestre de 2026"');
v.igual(rot('2026/2', false), '2027/1 | 2027/2 | 2028/1', 'rótulos com barra');
v.igual(rot('4º período', false), 'Próximo semestre | Daqui a 2 semestres | Daqui a 3 semestres', 'rótulos sem formato conhecido');
v.igual(rot('', true), 'Este semestre | Próximo semestre | Daqui a 2 semestres', 'rótulos começando agora');
const hist3 = []; cur.semestres.forEach((s, i) => s.forEach(([sg, n]) => hist3.push({sigla: sg, disciplina: n, nota: i < 3 ? 75 : null})));
const reconhece = cfg => !!requisitos({historico: hist3, config: cfg}).curriculoDoPerfil();
v.ok(reconhece({curso: 'Engenharia de Produção', instituicao: 'INATEL — Instituto Nacional de Telecomunicações'}), 'reconhece o Inatel escrito por extenso');
v.ok(!reconhece({curso: 'Engenharia de Produção', instituicao: 'Universidade Exemplo'}), 'não usa o quadro em outra faculdade');
v.ok(!reconhece({curso: 'Engenharia de Produção', instituicao: 'INATEL', curriculo: 'outro'}), 'não usa o quadro em "Outro curso"');
const ts = requisitos({historico: [{sigla: 'toString', disciplina: 'x', nota: null}], config: {curriculo: 'inatel-producao', disciplinasAtuais: ['valueOf']}});
v.igual(ts.reqDe(ts.curriculoDoPerfil(), 'toString').length, 0, 'código "toString" não acha nada no quadro');

v.fim();
