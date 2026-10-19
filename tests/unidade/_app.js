// Tira trechos do index.html para testar a lógica sem navegador. Os marcadores são comentários e
// nomes de função do próprio app: se um teste disser "trecho não encontrado", o marcador mudou.
const fs = require('fs');
const path = require('path');

const RAIZ = path.resolve(__dirname, '..', '..');
const src = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');

function trecho(ini, fim){
  const i = src.indexOf(ini), j = src.indexOf(fim, i + ini.length);
  if(i < 0 || j < 0) throw new Error('trecho não encontrado: ' + ini);
  return src.slice(i, j);
}
// uma função inteira (do "function nome(" até a primeira "}" no começo de linha)
function funcao(nome){
  const i = src.indexOf('function ' + nome + '(');
  if(i < 0) throw new Error('função não encontrada: ' + nome);
  return src.slice(i, src.indexOf('\n}', i) + 2);
}

// requisitos, créditos e previsão de formatura
const REQUISITOS = [
  trecho('const CURRICULOS = [', 'const WIZ_STATUS'),
  funcao('situacao'),
  funcao('regraNP3'),
  funcao('notaAprova'),
  trecho('const NP3_PISO', 'function regraNP3'),
  trecho('function proximoRotulo', '// parece que o semestre'),
  funcao('wizNorm'),
  trecho('// ---------------- Requisitos, créditos', 'function renderFormatura'),
].join('\n');
const SAIDA_REQ = 'CURRICULOS, curriculoDoPerfil, reqBase, reqPlano, reqCred, reqTrava, reqRotulos, reqDe, reqFaltando, reqIndice, reqPrevisao, reqPesos, semNum, reqContagem';
function requisitos(STATE){
  return new Function('STATE', 'esc', 'storeSet', 'renderMapaSucesso', REQUISITOS + ';return {' + SAIDA_REQ + '};')(STATE, x => String(x), () => {}, () => {});
}

// regra de aprovação (média do semestre, NP3) e situação no histórico
const NOTAS = [
  src.slice(src.indexOf('const notaOk'), src.indexOf('\n', src.indexOf('const notaOk'))),
  trecho('// ---------------- Regra de aprovação', '// ---------------- Disciplinas em Risco'),
  funcao('situacao'),
].join('\n');
function notas(STATE){
  return new Function('STATE', NOTAS + ';return {regraNP3, notaAprova, notaSituacao, notaPerdida, situacao, NP3_PISO, NP3_FINAL};')(STATE);
}

// calendário acadêmico
const CALENDARIO = [
  funcao('localISO'),
  src.slice(src.indexOf('const DAY_NAMES'), src.indexOf('\n', src.indexOf('const DAY_NAMES'))),
  funcao('semNum'),
  funcao('daysUntil'),
  trecho('// ---------------- Calendário acadêmico', 'async function calSalvar'),
].join('\n');
function calendario(STATE, aulas){
  const min = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
  return new Function('STATE', 'getAulas', 'aulaSigla', 'faltasPorAula',
    CALENDARIO + ';return {calPascoa, calFeriadosNacionais, calSemAula, calSemAulaHoje, calPeriodo, calProgresso, calAulasRestantes, calProximos, calLembretes};')(
    STATE, () => aulas || [], a => String(a.disciplina).split('-')[0], (i, f) => Math.max(1, Math.round((min(f) - min(i)) / 50)));
}

// um contador de verificações: cada falha fica anotada, e o fim do teste diz quantas
function verificador(nome){
  const falhas = [];
  let total = 0;
  return {
    ok(cond, msg){ total++; if(!cond) falhas.push(msg); },
    igual(a, b, msg){ total++; if(JSON.stringify(a) !== JSON.stringify(b)) falhas.push(`${msg}: esperado ${JSON.stringify(b)}, veio ${JSON.stringify(a)}`); },
    fim(){
      if(falhas.length){ console.log(`✕ ${nome}: ${falhas.length} de ${total} falharam`); falhas.slice(0, 15).forEach(f => console.log('   - ' + f)); process.exitCode = 1; }
      else console.log(`✓ ${nome}: ${total} verificações`);
    },
  };
}

module.exports = {RAIZ, src, trecho, funcao, requisitos, notas, calendario, verificador};
