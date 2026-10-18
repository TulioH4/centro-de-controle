// Sincronização com um Supabase de mentira: o envio nunca sobrescreve uma versão mais nova que outro
// aparelho já mandou (quem estava sem internet com uma alteração velha recebe a nova), e as listas
// (provas, tarefas...) mexidas nos dois aparelhos são combinadas item por item.
const fs = require('fs');
const path = require('path');
const {RAIZ, verificador} = require('./_app');
const v = verificador('sincronização entre aparelhos');
const src = fs.readFileSync(path.join(RAIZ, 'sync.js'), 'utf8');

// limite: quantos caracteres cabem no armazenamento (como o localStorage cheio)
function cenario(servidorInicial, local, metaInicial, limite){
  class FakeStorage { constructor(){ this.m = new Map(); } getItem(k){ return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, val){
      const usado = [...this.m].reduce((s, [a, b]) => s + (a === k ? 0 : a.length + b.length), 0);
      if (limite && usado + k.length + String(val).length > limite) throw new Error('QuotaExceededError');
      this.m.set(k, String(val));
    }
    removeItem(k){ this.m.delete(k); } key(i){ return [...this.m.keys()][i] ?? null; } get length(){ return this.m.size; } }
  const ls = new FakeStorage();
  Object.entries(local).forEach(([k, val]) => ls.m.set('centro_controle_' + k, JSON.stringify(val)));
  ls.m.set('centro_controle___sync_meta', JSON.stringify(metaInicial));
  const srv = new Map(Object.entries(servidorInicial)), log = [];
  const query = () => {
    let cols = '', filtro = null;
    const run = () => Promise.resolve({error: null, data: [...srv.entries()].filter(([k]) => !filtro || filtro.includes(k))
      .map(([key, x]) => ({key, updated_at: x.updated_at, ...(cols.includes('value') ? {value: x.value} : {})}))});
    const q = {
      select(c){ cols = c; return q; },
      in(col, arr){ filtro = arr; return run(); },
      range(){ return run(); },
      upsert(rows){ rows.forEach(r => { srv.set(r.key, {value: r.value, updated_at: r.updated_at}); log.push(r.key); }); return Promise.resolve({error: null}); },
    };
    return q;
  };
  const client = {from: () => query(), auth: {getSession: async () => ({data: {session: {user: {id: 'u'}}}}), onAuthStateChange(){}},
    channel: () => ({on(){ return this; }, subscribe(){ return this; }}), removeChannel(){}};
  const win = {localStorage: ls, supabase: {createClient: () => client}, addEventListener(){}};
  const Sync = new Function('window', 'Storage', 'navigator', 'document', 'setTimeout', 'clearTimeout', src + ';return window.Sync;')(
    win, FakeStorage, {onLine: true}, {addEventListener(){}, visibilityState: 'visible'}, () => 0, () => {});
  return {Sync, srv, ls, log};
}

(async () => {
  const iso = h => new Date(Date.UTC(2026, 9, 18, h)).toISOString(), t = h => Date.UTC(2026, 9, 18, h);
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const roda = async c => { await c.Sync.restoreSession(); await c.Sync.push(); await espera(30); return c; };
  const meta = (c, k) => JSON.parse(c.ls.getItem('centro_controle___sync_meta'))[k];

  // 1) o servidor tem uma versão mais nova (outro aparelho mandou depois): não sobrescreve, e este recebe a nova
  let c = await roda(cenario({p_config: {value: {de: 'PC'}, updated_at: iso(11)}}, {p_config: {de: 'CELULAR'}}, {p_config: {t: t(10), dirty: true}}));
  v.igual(c.srv.get('p_config').value, {de: 'PC'}, 'servidor mais novo continua com a versão nova');
  v.igual(c.ls.getItem('centro_controle_p_config'), JSON.stringify({de: 'PC'}), 'o aparelho atrasado recebe a versão nova');
  v.igual(c.log, [], 'nada foi enviado por cima');
  v.ok(meta(c, 'p_config').dirty === false, 'nada fica pendente');
  // 2) este aparelho tem a mais nova: envia
  c = await roda(cenario({p_config: {value: {de: 'PC'}, updated_at: iso(11)}}, {p_config: {de: 'CELULAR'}}, {p_config: {t: t(12), dirty: true}}));
  v.igual(c.srv.get('p_config').value, {de: 'CELULAR'}, 'aparelho mais novo envia');
  // 3) chave que o servidor ainda não tem: envia
  c = await roda(cenario({}, {p_calendario: {inicio: '2026-08-03'}}, {p_calendario: {t: t(10), dirty: true}}));
  v.igual(c.srv.get('p_calendario').value, {inicio: '2026-08-03'}, 'chave nova é enviada');

  // ---- listas: combinadas item por item com a base (o valor da última sincronização) ----
  // o merge sai no pull que o envio dispara, e o resultado vai no envio seguinte
  const sincroniza = async c => { await roda(c); await c.Sync.push(); await espera(30); return c; };
  const local = (c, k) => JSON.parse(c.ls.getItem('centro_controle_' + k));
  const base = (c, k) => JSON.parse(c.ls.getItem('centro_controle_' + k + '__sync_base'));
  const ids = l => l.map(x => x.id);
  const A = {id: 'a', disciplina: 'Cálculo I', tipo: 'Prova', data: '2026-11-03'}, B = {id: 'b', disciplina: 'Física I', tipo: 'Prova', data: '2026-11-05'};
  const X = {id: 'x', disciplina: 'Química', tipo: 'Prova', data: '2026-11-10'}, Y = {id: 'y', disciplina: 'Desenho', tipo: 'Trabalho', data: '2026-11-12'};
  const pendente = {p_provas: {t: t(10), dirty: true}}, servidor = val => ({p_provas: {value: val, updated_at: iso(11)}});

  // 4) o celular sem internet adiciona X, o PC adiciona Y: ficam as duas
  c = await sincroniza(cenario(servidor([A, Y]), {p_provas: [A, X], p_provas__sync_base: [A]}, pendente));
  v.igual(ids(c.srv.get('p_provas').value), ['a', 'x', 'y'], 'cada aparelho adicionou uma prova: as duas ficam no servidor');
  v.igual(ids(local(c, 'p_provas')), ['a', 'x', 'y'], 'cada aparelho adicionou uma prova: as duas ficam neste aparelho');
  v.igual(c.log, ['p_provas'], 'o resultado é enviado uma vez');
  v.ok(meta(c, 'p_provas').dirty === false, 'depois do merge nada fica pendente');
  v.igual(ids(base(c, 'p_provas')), ['a', 'x', 'y'], 'a base passa a ser o que foi enviado');

  // 5) apagada aqui e intacta no servidor: sai (e a que o outro aparelho adicionou fica)
  c = await sincroniza(cenario(servidor([A, B, Y]), {p_provas: [A], p_provas__sync_base: [A, B]}, pendente));
  v.igual(ids(c.srv.get('p_provas').value), ['a', 'y'], 'apagada aqui e intacta no servidor: sai');
  // ... e o contrário: apagada no servidor e intacta aqui também sai
  c = await sincroniza(cenario(servidor([A]), {p_provas: [A, B, X], p_provas__sync_base: [A, B]}, pendente));
  v.igual(ids(c.srv.get('p_provas').value), ['a', 'x'], 'apagada no servidor e intacta aqui: sai');

  // 6) a mesma prova mudada nos dois aparelhos: vale a do servidor; mudada só aqui: vale a daqui
  c = await sincroniza(cenario(servidor([{...A, nota: 80}, B]), {p_provas: [{...A, nota: 70}, {...B, local: 'Sala 2'}], p_provas__sync_base: [A, B]}, pendente));
  v.igual(c.srv.get('p_provas').value, [{...A, nota: 80}, {...B, local: 'Sala 2'}], 'mudada dos dois lados: a do servidor; só aqui: a daqui');
  v.igual(local(c, 'p_provas'), c.srv.get('p_provas').value, 'os dois aparelhos ficam iguais');

  // 7) apagada aqui e mudada no servidor: fica, com a mudança
  c = await sincroniza(cenario(servidor([A, {...B, hora: '21:00'}]), {p_provas: [A], p_provas__sync_base: [A, B]}, pendente));
  v.igual(c.srv.get('p_provas').value, [A, {...B, hora: '21:00'}], 'apagada aqui e mudada no outro: fica com a mudança');

  // 8) chave que não é lista: continua valendo a mais nova (e não ganha base)
  c = await sincroniza(cenario({p_config: {value: {de: 'PC', semestre: '2026.2'}, updated_at: iso(11)}}, {p_config: {de: 'CELULAR'}}, {p_config: {t: t(10), dirty: true}}));
  v.igual(local(c, 'p_config'), {de: 'PC', semestre: '2026.2'}, 'chave que não é lista: vale a mais nova, inteira');
  v.igual(c.log, [], 'chave que não é lista: nada enviado por cima');
  v.ok(c.ls.getItem('centro_controle_p_config__sync_base') === null, 'chave que não é lista não guarda base');

  // 9) lista sem base (sincronizada antes desta versão): continua valendo a mais nova
  c = await sincroniza(cenario(servidor([A, Y]), {p_provas: [A, X]}, pendente));
  v.igual(ids(local(c, 'p_provas')), ['a', 'y'], 'lista sem base: vale a mais nova');
  v.igual(c.log, [], 'lista sem base: nada enviado por cima');
  // 10) item sem id: não dá para combinar, vale a mais nova
  c = await sincroniza(cenario(servidor([A, {disciplina: 'Sem id'}]), {p_provas: [A, X], p_provas__sync_base: [A]}, pendente));
  v.igual(local(c, 'p_provas'), [A, {disciplina: 'Sem id'}], 'item sem id: vale a mais nova');

  // 11) ao voltar a internet o app puxa antes de enviar: o merge acontece no pull também
  c = cenario({p_tarefas: {value: [{id: 't1', nome: 'Lista 1'}, {id: 't3', nome: 'Lista 3'}], updated_at: iso(11)}},
    {p_tarefas: [{id: 't1', nome: 'Lista 1'}, {id: 't2', nome: 'Lista 2'}], p_tarefas__sync_base: [{id: 't1', nome: 'Lista 1'}]}, {p_tarefas: {t: t(10), dirty: true}});
  await c.Sync.restoreSession(); await c.Sync.pull(); await c.Sync.push(); await espera(30);
  v.igual(ids(c.srv.get('p_tarefas').value), ['t1', 't2', 't3'], 'puxar e depois enviar: as tarefas dos dois aparelhos ficam');

  // 12) calendário: os eventos item por item, as datas do lado que mudou
  const E1 = {id: 'ev1', nome: 'Semana de provas', tipo: 'provas', de: '2026-10-05', ate: '2026-10-09'};
  const E2 = {id: 'ev2', nome: 'Palestra', tipo: 'outro', de: '2026-10-20', ate: ''}, E3 = {id: 'ev3', nome: 'Feira', tipo: 'outro', de: '2026-11-04', ate: ''};
  const cal0 = {inicio: '2026-08-03', fim: '2026-12-12', eventos: [E1], ocultos: []};
  c = await sincroniza(cenario({p_calendario: {value: {...cal0, eventos: [E1, E3], ocultos: ['2026-10-12']}, updated_at: iso(11)}},
    {p_calendario: {...cal0, fim: '2026-12-19', eventos: [E1, E2]}, p_calendario__sync_base: cal0}, {p_calendario: {t: t(10), dirty: true}}));
  v.igual(c.srv.get('p_calendario').value, {inicio: '2026-08-03', fim: '2026-12-19', eventos: [E1, E2, E3], ocultos: ['2026-10-12']},
    'calendário: eventos dos dois aparelhos, o fim mudado aqui e o feriado oculto no outro');

  // 13) a base de uma chave grande demais não é guardada
  c = await roda(cenario({}, {p_tarefas: [{id: 't1', nome: 'Lista', notas: 'x'.repeat(250000)}]}, {p_tarefas: {t: t(10), dirty: true}}));
  v.ok(c.srv.has('p_tarefas') && c.ls.getItem('centro_controle_p_tarefas__sync_base') === null, 'chave grande demais: enviada, sem base');
  // 14) sem espaço para os dados do app, as bases são apagadas primeiro
  c = await roda(cenario({}, {p_tarefas: [{id: 't1', nome: 'Lista ' + 'y'.repeat(900)}]}, {p_tarefas: {t: t(10), dirty: true}}, 3200));
  v.ok(c.ls.getItem('centro_controle_p_tarefas__sync_base') !== null, 'a base é guardada depois do envio');
  c.ls.setItem('centro_controle_p_disc_notes', JSON.stringify({EP01: 'z'.repeat(1300)}));
  v.ok(c.ls.getItem('centro_controle_p_disc_notes') !== null && c.ls.getItem('centro_controle_p_tarefas__sync_base') === null,
    'sem espaço: a base sai e o dado do app é gravado');

  // 15) chave já em dia com o servidor (sincronizada antes desta versão) ganha base no pull
  c = cenario({p_provas: {value: [A], updated_at: iso(11)}}, {p_provas: [A]}, {p_provas: {t: t(11), dirty: false}});
  await c.Sync.restoreSession(); await c.Sync.pull();
  v.igual(base(c, 'p_provas'), [A], 'chave em dia com o servidor ganha base');
  v.fim();
})();
