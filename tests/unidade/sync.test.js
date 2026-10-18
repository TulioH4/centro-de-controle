// Sincronização com um Supabase de mentira: o envio nunca sobrescreve uma versão mais nova que outro
// aparelho já mandou (quem estava sem internet com uma alteração velha recebe a nova).
const fs = require('fs');
const path = require('path');
const {RAIZ, verificador} = require('./_app');
const v = verificador('sincronização entre aparelhos');
const src = fs.readFileSync(path.join(RAIZ, 'sync.js'), 'utf8');

function cenario(servidorInicial, local, metaInicial){
  class FakeStorage { constructor(){ this.m = new Map(); } getItem(k){ return this.m.has(k) ? this.m.get(k) : null; } setItem(k, val){ this.m.set(k, String(val)); }
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
  v.fim();
})();
