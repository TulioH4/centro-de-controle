// De quem são os dados do aparelho: entrar (ou criar) outra conta não mostra nem envia os dados da conta
// anterior; os de quem usava sem conta vão para a conta nova; alteração não enviada de outra conta impede
// a troca; e uma aba que ficou aberta quando outra saiu da conta não grava mais nada.
const fs = require('fs');
const path = require('path');
const {RAIZ, verificador} = require('./_app');
const v = verificador('dados do aparelho e troca de conta');
const src = fs.readFileSync(path.join(RAIZ, 'sync.js'), 'utf8');
const P = 'centro_controle_';

// local: chaves do app (sem o prefixo); meta: o registro de sincronização; dono: {id, email} ou nada;
// sessao: o usuário que já está entrado ao abrir
function aparelho({local = {}, meta = {}, dono = null, sessao = null, sairFalha = false} = {}){
  class FakeStorage { constructor(){ this.m = new Map(); } getItem(k){ return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, val){ this.m.set(k, String(val)); } removeItem(k){ this.m.delete(k); }
    key(i){ return [...this.m.keys()][i] ?? null; } get length(){ return this.m.size; } }
  const ls = new FakeStorage();
  Object.entries(local).forEach(([k, val]) => ls.m.set(P + k, JSON.stringify(val)));
  if(sessao) ls.m.set('cc-auth', JSON.stringify({user: sessao}));
  ls.m.set(P + '__sync_meta', JSON.stringify(meta));
  if(dono) ls.m.set(P + '__sync_owner', JSON.stringify(dono));
  const chamadas = [], eventos = [];
  let atual = sessao, ouvinte = null;
  const usuario = email => ({id: 'id-' + email, email});
  const avisa = (ev, s) => { eventos.push(ev); if(ouvinte) ouvinte(ev, s); };
  const auth = {
    getSession: async () => ({data: {session: atual ? {user: atual} : null}}),
    onAuthStateChange(fn){ ouvinte = fn; },
    signInWithPassword: async ({email}) => { chamadas.push('entrar ' + email); atual = usuario(email); avisa('SIGNED_IN', {user: atual}); return {data: {user: atual, session: {}}, error: null}; },
    signUp: async ({email}) => { chamadas.push('criar ' + email); atual = usuario(email); avisa('SIGNED_IN', {user: atual}); return {data: {user: atual, session: {}}, error: null}; },
    // como a biblioteca: sem conexão, devolve o erro e deixa a sessão guardada
    signOut: async ({scope} = {}) => {
      chamadas.push('sair ' + (scope || 'global'));
      if(sairFalha) return {error: {message: 'Failed to fetch'}};
      atual = null; ls.removeItem('cc-auth'); avisa('SIGNED_OUT', null); return {error: null};
    },
  };
  const tabela = () => { const q = {select(){ return q; }, in(){ return Promise.resolve({error: null, data: []}); }, range(){ return Promise.resolve({error: null, data: []}); },
    upsert(){ return Promise.resolve({error: null}); }}; return q; };
  const client = {from: tabela, auth, channel: () => ({on(){ return this; }, subscribe(){ return this; }}), removeChannel(){}};
  const loc = {recargas: 0, reload(){ this.recargas++; }, origin: 'http://x', pathname: '/'};
  const win = {localStorage: ls, supabase: {createClient: () => client}, addEventListener(){}};
  const Sync = new Function('window', 'Storage', 'navigator', 'document', 'setTimeout', 'clearTimeout', 'location', src + ';return window.Sync;')(
    win, FakeStorage, {onLine: true}, {addEventListener(){}, visibilityState: 'visible'}, () => 0, () => {}, loc);
  // o que outra aba faria: sair ou entrar em outra conta (o Supabase avisa as abas abertas)
  const outraAba = (ev, email) => { atual = email ? usuario(email) : null; ouvinte(ev, atual ? {user: atual} : null); };
  return {Sync, ls, chamadas, eventos, loc, outraAba, valor: k => JSON.parse(ls.getItem(P + k)), dono: () => JSON.parse(ls.getItem(P + '__sync_owner'))};
}
const sincronizado = {gteste_config: {t: 1, dirty: false}, gteste_provas: {t: 1, dirty: false}};
const dadosA = {profiles: [{id: 'gteste', name: 'Ana'}], gteste_config: {aluno: 'Ana'}, gteste_provas: [{id: 'p1'}]};
const erro = async fn => { try{ await fn(); return null; }catch(e){ return e.message; } };

(async () => {
  // 1) dados da conta A no aparelho (a sessão expirou, por exemplo) e alguém cria a conta B: os dados de A saem
  let a = aparelho({local: dadosA, meta: sincronizado, dono: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.signUp('b@x.com', 'segredo');
  v.igual([a.valor('profiles'), a.valor('gteste_config')], [null, null], 'conta nova não abre com os dados da conta anterior');
  v.igual(a.dono(), {id: 'id-b@x.com', email: 'b@x.com'}, 'o aparelho passa a ser da conta nova');
  v.ok(a.Sync.cleared, 'o app sabe que precisa começar do zero');

  // 2) entrar de novo na mesma conta: nada sai do aparelho
  a = aparelho({local: dadosA, meta: sincronizado, dono: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.signIn('a@x.com', 'segredo');
  v.igual([a.valor('gteste_config'), a.Sync.cleared], [{aluno: 'Ana'}, false], 'mesma conta: os dados ficam');

  // 3) quem usava sem conta e cria uma: os dados dele vão para a conta (é assim que não se perdem)
  a = aparelho({local: dadosA, meta: {gteste_config: {t: 1, dirty: true}, gteste_provas: {t: 1, dirty: true}}});
  await a.Sync.signUp('novo@x.com', 'segredo');
  v.igual([a.valor('gteste_config'), a.Sync.cleared, a.dono().email], [{aluno: 'Ana'}, false, 'novo@x.com'], 'sem conta: os dados vão para a conta criada');

  // 4) aparelho de antes desta conferência (sem dono anotado) com dados já sincronizados: conta nova não os herda
  a = aparelho({local: dadosA, meta: sincronizado});
  await a.Sync.signUp('b@x.com', 'segredo');
  v.igual([a.valor('gteste_config'), a.Sync.cleared], [null, true], 'dados sincronizados de uma conta desconhecida saem ao criar outra');

  // 5) ...e com alteração ainda não enviada: criar outra conta é recusado, sem tocar em nada
  a = aparelho({local: dadosA, meta: {gteste_config: {t: 1, dirty: false}, gteste_provas: {t: 2, dirty: true}}});
  const e5 = await erro(() => a.Sync.signUp('b@x.com', 'segredo'));
  v.ok(e5 && /alterações de outra conta/.test(e5), 'alteração não enviada de outra conta impede criar uma nova');
  v.igual([a.chamadas, a.valor('gteste_provas')], [[], [{id: 'p1'}]], 'nada foi criado nem apagado');

  // 6) dono conhecido com alteração não enviada: entrar em outra conta é recusado, dizendo qual é a conta
  a = aparelho({local: dadosA, meta: {gteste_provas: {t: 2, dirty: true}}, dono: {id: 'id-a@x.com', email: 'a@x.com'}});
  const e6 = await erro(() => a.Sync.signIn('b@x.com', 'segredo'));
  v.ok(e6 && e6.includes('a@x.com'), 'a recusa diz de qual conta são as alterações');
  v.igual(a.chamadas, [], 'não chegou a entrar na outra conta');
  // na própria conta, entra normalmente e as alterações continuam para serem enviadas
  await a.Sync.signIn('a@x.com', 'segredo');
  v.igual([a.valor('gteste_provas'), a.Sync.hasPending()], [[{id: 'p1'}], true], 'na conta dona, as alterações continuam aqui para enviar');

  // 7) app abrindo com a sessão de sempre num aparelho de antes desta conferência: os dados são dela
  a = aparelho({local: dadosA, meta: sincronizado, sessao: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.restoreSession();
  v.igual([a.valor('gteste_config'), a.dono().id], [{aluno: 'Ana'}, 'id-a@x.com'], 'ao abrir, a conta da sessão fica dona dos dados');

  // 8) outra aba saiu da conta: esta recarrega e não grava mais os dados da conta (nem os que a página ainda tentar)
  a = aparelho({local: dadosA, meta: sincronizado, sessao: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.restoreSession();
  a.outraAba('SIGNED_OUT');
  a.ls.setItem(P + 'gteste_config', JSON.stringify({aluno: 'regravado'}));
  a.ls.removeItem(P + 'profiles');
  v.igual([a.loc.recargas, a.valor('gteste_config'), !!a.valor('profiles')], [1, {aluno: 'Ana'}, true], 'aba que ficou aberta recarrega e não regrava nada');
  // outra aba entrou em outra conta: também recarrega
  a = aparelho({local: dadosA, meta: sincronizado, sessao: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.restoreSession();
  a.outraAba('SIGNED_IN', 'b@x.com');
  v.igual(a.loc.recargas, 1, 'outra aba entrou em outra conta: esta recarrega');
  // a mesma conta renovando a sessão em outra aba: nada muda
  a = aparelho({local: dadosA, meta: sincronizado, sessao: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.restoreSession();
  a.outraAba('SIGNED_IN', 'a@x.com');
  v.igual(a.loc.recargas, 0, 'mesma conta em outra aba: nada muda');

  // 9) sair por esta aba: não conta como "outra aba", e o aparelho fica vazio
  a = aparelho({local: dadosA, meta: sincronizado, sessao: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.restoreSession();
  await a.Sync.signOut();
  v.igual([a.loc.recargas, a.valor('gteste_config'), a.dono()], [0, null, null], 'sair por esta aba limpa o aparelho sem recarregar sozinho');

  // 10) sair é só deste aparelho (o celular continua entrado)...
  a = aparelho({local: dadosA, meta: sincronizado, sessao: {id: 'id-a@x.com', email: 'a@x.com'}});
  await a.Sync.restoreSession();
  await a.Sync.signOut();
  v.igual(a.chamadas, ['sair local'], 'sair não derruba a conta nos outros aparelhos');
  // ...e sem internet a sessão sai assim mesmo (senão a próxima abertura entraria de novo)
  a = aparelho({local: dadosA, meta: sincronizado, sessao: {id: 'id-a@x.com', email: 'a@x.com'}, sairFalha: true});
  await a.Sync.restoreSession();
  await a.Sync.signOut();
  v.igual([a.chamadas, a.ls.getItem('cc-auth'), a.valor('gteste_config')], [['sair local'], null, null], 'sem resposta do servidor, a sessão e os dados saem deste aparelho');

  v.fim();
})().catch(e => { console.log('✕ ' + e.stack); process.exitCode = 1; });
