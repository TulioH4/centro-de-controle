// Lembretes do service worker (sw.js) com um resumo de mentira: tipos de aviso ligados e desligados,
// datas do calendário e o resumo de domingo.
const fs = require('fs');
const path = require('path');
const {RAIZ, verificador} = require('./_app');
const v = verificador('lembretes do celular (service worker)');
const src = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
const corpo = src.slice(src.indexOf('const REMINDER_CACHE'), src.indexOf("self.addEventListener('periodicsync'"));

async function avisos(snap, ano, mes, dia, hora){
  const enviados = [], store = {'./__lembretes.json': JSON.stringify(snap)};
  const caches = {open: async () => ({match: async p => store[p] ? {json: async () => JSON.parse(store[p])} : undefined, put: async (p, r) => { store[p] = await r.text(); }})};
  const Real = Date, agora = new Real(ano, mes, dia, hora, 0).getTime();
  const Falso = class extends Real { constructor(...a){ super(...(a.length ? a : [agora])); } static now(){ return agora; } };
  const checar = new Function('caches', 'self', 'Notification', 'Date', corpo + ';return checkReminders;')(
    caches, {registration: {showNotification: async (t, o) => enviados.push(o.tag.split('-')[0] + ': ' + t)}}, {permission: 'granted'}, Falso);
  await checar();
  return enviados;
}

(async () => {
  // domingo, 18/10/2026, 18h: prova hoje às 19h e outra amanhã
  const base = {provas: [{tipo: 'P2', disciplina: 'Cálculo', data: '2026-10-18', hora: '19:00'}, {tipo: 'P1', disciplina: 'Física', data: '2026-10-19'}], tarefas: [], rels: [], eventos: []};
  v.igual(await avisos(base, 2026, 9, 18, 18), ['dia: Hoje tem P2 de Cálculo às 19h', 'semana: Sua semana: 1 prova', 'prova: P2 de Cálculo daqui a pouco'], 'tudo ligado');
  v.igual(await avisos({...base, topicos: {semana: false}}, 2026, 9, 18, 18), ['dia: Hoje tem P2 de Cálculo às 19h', 'vespera: Amanhã tem P1 de Física', 'prova: P2 de Cálculo daqui a pouco'], 'sem o resumo de domingo, vem o aviso de amanhã');
  v.igual(await avisos({...base, topicos: {dia: false, prova2h: false}}, 2026, 9, 18, 18), ['semana: Sua semana: 1 prova'], 'no dia e 2h antes desligados');
  // datas do calendário sozinhas
  v.igual(await avisos({provas: [], tarefas: [], rels: [], eventos: [{d: '2026-10-19', txt: 'Rematrícula começa'}]}, 2026, 9, 19, 9), ['dia: Hoje: Rematrícula começa'], 'data do calendário no dia');
  v.igual(await avisos({provas: [], tarefas: [{nome: 'Lista 3', prazo: '2026-10-20'}], rels: [], eventos: [{d: '2026-10-20', txt: 'Finados, sem aula'}]}, 2026, 9, 19, 18), ['vespera: Para amanhã'], 'tarefa e data na véspera');
  v.fim();
})();
