// Cloud sync for Centro de Controle (Supabase).
//
// localStorage stays the store the app reads and writes, so everything works
// offline. Every write under the app prefix is intercepted, timestamped and
// pushed to the `kv` table (one row per key, last write wins). On start, on
// focus and through Realtime, newer rows from other devices are applied back.
// Lists of items (exams, tasks...) are merged item by item instead, so what a
// device changed while offline is not lost (see "merging" below).
(function(){
  const CONFIG = {
    url: 'https://ehcbkoxbqqwiibjyzhoy.supabase.co',
    key: 'sb_publishable_mx8ZeUY1HIxCFO4R5BfanQ_wkPaA0Bw',
  };
  const PREFIX = 'centro_controle_';
  const META_KEY = PREFIX + '__sync_meta';
  const BASE_SUFFIX = '__sync_base';
  // device-specific keys that must never travel between devices
  const LOCAL_ONLY = [/^active_profile$/, /^notif_last_/, /^__sync_meta$/, /^__sync_owner$/, /__probe__$/, /^cloud_skip$/, /__sync_base$/];
  const isSynced = fullKey => fullKey.startsWith(PREFIX) && !LOCAL_ONLY.some(re => re.test(fullKey.slice(PREFIX.length)));

  const ls = window.localStorage;
  const rawSet = Storage.prototype.setItem;
  const rawRemove = Storage.prototype.removeItem;
  let applying = false;
  // another tab left the account: this page must not write that account's data back before it reloads
  let detached = false;

  let meta = {};
  try { meta = JSON.parse(ls.getItem(META_KEY) || '{}') || {}; } catch(e){ meta = {}; }
  const saveMeta = () => { try { rawSet.call(ls, META_KEY, JSON.stringify(meta)); } catch(e){} };

  // ---- merging -----------------------------------------------------------------
  // Each key holds a whole list (every exam, every task...), so "newest wins" would drop what a
  // device changed while offline: the phone adds exam X offline, the PC adds exam Y, and X was
  // gone once the phone reconnected. For the keys below, each device keeps the value of the last
  // successful sync (the base) and a conflict is solved item by item, matching items by a field:
  //   - new on one side (not in the base): kept;
  //   - deleted on one side and untouched on the other: deleted;
  //   - changed on one side only: that change;
  //   - changed on both sides: the server's version;
  //   - deleted on one side and changed on the other: kept, with the change (nothing typed is lost
  //     without a trace; deleting it again is one tap).
  // Other keys, a key with no base yet, or a list where some item has no id (or two share one)
  // keep "newest wins".
  const same = (a, b) => {
    if (a === b) return true;
    if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every(k => Object.prototype.hasOwnProperty.call(b, k) && same(a[k], b[k]));
  };
  function mergeList(base, mine, theirs, idOf){
    const index = list => {
      if (!Array.isArray(list)) return null;
      const m = new Map();
      for (const x of list) { const id = idOf(x); if (id == null || m.has(id)) return null; m.set(id, x); }
      return m;
    };
    // no base value: the key did not exist at the last sync, so everything on both sides is new.
    // A whole key deleted on one side (null) is not merged: deleting a profile must not bring it back.
    const B = base == null ? new Map() : index(base), L = index(mine), R = index(theirs);
    if (!B || !L || !R) return undefined;
    const pick = id => {
      const b = B.get(id), l = L.get(id), r = R.get(id);
      if (!B.has(id)) return R.has(id) ? r : l;                         // new (same id on both sides: the server's)
      if (!L.has(id)) return !R.has(id) || same(r, b) ? undefined : r;  // deleted here
      if (!R.has(id)) return same(l, b) ? undefined : l;                // deleted on the server
      return same(l, b) ? r : same(r, b) ? l : r;                       // changed on both sides: the server's
    };
    // the server's order, with what is new here placed after the item it followed here
    const out = [], ids = [];
    R.forEach((x, id) => { const v = pick(id); if (v !== undefined) { out.push(v); ids.push(id); } });
    let at = 0;
    L.forEach((x, id) => {
      if (R.has(id)) { const i = ids.indexOf(id); if (i >= 0) at = i + 1; return; }
      const v = pick(id);
      if (v !== undefined) { out.splice(at, 0, v); ids.splice(at, 0, id); at++; }
    });
    return out;
  }
  const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const byField = f => x => isObj(x) && (typeof x[f] === 'string' || typeof x[f] === 'number') ? x[f] : null;
  const list = idOf => (b, l, r) => mergeList(b, l, r, idOf);
  // an object: the lists inside it item by item, any other field taken from the side that changed it
  const fields = lists => (b, l, r) => {
    b = b == null ? {} : b;
    if (!isObj(b) || !isObj(l) || !isObj(r)) return undefined;
    const out = {};
    const or = v => v == null ? [] : v;
    for (const f of new Set([...Object.keys(r), ...Object.keys(l)])) {
      const v = lists[f] ? lists[f](b[f], or(l[f]), or(r[f])) : same(l[f], b[f]) ? r[f] : same(r[f], b[f]) ? l[f] : r[f];
      if (lists[f] && v === undefined) return undefined;
      if (v !== undefined) out[f] = v;
    }
    return out;
  };
  // keys are "<profile>_<name>" (or just "<name>")
  const MERGE = {
    provas: list(byField('id')), tarefas: list(byField('id')), estudos_materiais: list(byField('id')),
    lembretes: list(byField('id')), horas_comp: list(byField('id')), semestres: list(byField('id')),
    historico_custom: list(byField('sigla')), pom_sessions: list(byField('ts')),
    grade_amigos: list(byField('n')), // a classmate's timetable: one per name
    calendario: fields({ eventos: list(byField('id')), ocultos: list(x => typeof x === 'string' ? x : null) }),
  };
  const mergerFor = k => { const n = Object.keys(MERGE).find(n => k === n || k.endsWith('_' + n)); return n ? MERGE[n] : null; };

  // The base sits next to its key, on this device only. localStorage holds about 5 MB per site,
  // so a base is only kept up to BASE_MAX characters (150 tasks are about 40 thousand, one study
  // material about 17 thousand) and all of them go if the app's own data runs out of room.
  const BASE_MAX = 200000;
  const baseKey = k => PREFIX + k + BASE_SUFFIX;
  function saveBase(k, value){
    if (!mergerFor(k)) return;
    const json = JSON.stringify(value === undefined ? null : value);
    // a base that could not be updated is removed: an old one would merge the wrong way
    try { if (json.length > BASE_MAX) rawRemove.call(ls, baseKey(k)); else rawSet.call(ls, baseKey(k), json); }
    catch(e) { try { rawRemove.call(ls, baseKey(k)); } catch(e2){} }
  }
  function dropBases(){
    const keys = [];
    for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(PREFIX) && k.endsWith(BASE_SUFFIX)) keys.push(k); }
    keys.forEach(k => rawRemove.call(ls, k));
    return keys.length > 0;
  }
  // this device's value combined with a newer one from the server, or undefined to take the server's
  function mergeWithServer(k, theirs){
    const merge = mergerFor(k);
    if (!merge) return undefined;
    let base, mine = null;
    try {
      const rawBase = ls.getItem(baseKey(k));
      if (rawBase === null) return undefined;
      base = JSON.parse(rawBase);
      const raw = ls.getItem(PREFIX + k);
      if (raw !== null) mine = JSON.parse(raw);
      return merge(base, mine, theirs === undefined ? null : theirs);
    } catch(e) { return undefined; }
  }

  const state = { status: 'local', lastSync: null, error: null, user: null };
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(Object.assign({}, state)); } catch(e){} });
  const setStatus = (status, extra) => { Object.assign(state, {status}, extra || {}); emit(); };

  let client = null;
  const enabled = !!(window.supabase && window.supabase.createClient && CONFIG.key);
  if (enabled) {
    client = window.supabase.createClient(CONFIG.url, CONFIG.key, {
      // detectSessionInUrl off: the app signs in only with e-mail and password. With it on, a link
      // carrying someone else's tokens (#access_token=...) would silently sign this device into
      // that account, and everything the person typed afterwards would sync to it.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'cc-auth' },
    });
  }

  // ---- capture local writes ------------------------------------------------
  function touch(fullKey){
    meta[fullKey.slice(PREFIX.length)] = { t: Date.now(), dirty: true };
    saveMeta();
    schedulePush();
  }
  Storage.prototype.setItem = function(k, v){
    if (detached && this === ls && String(k).startsWith(PREFIX)) return;
    try { rawSet.call(this, k, v); }
    catch(e) { if (this !== ls || !dropBases()) throw e; rawSet.call(this, k, v); } // out of room: the bases go first
    if (this === ls && !applying && isSynced(k)) touch(k);
  };
  Storage.prototype.removeItem = function(k){
    if (detached && this === ls && String(k).startsWith(PREFIX)) return;
    rawRemove.call(this, k);
    if (this === ls && !applying && isSynced(k)) touch(k);
  };

  // ---- push ------------------------------------------------------------------
  let pushTimer = null, pushing = false;
  function schedulePush(delay){
    if (!client || !state.user) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(push, delay == null ? 1200 : delay);
  }
  const hasDirty = () => Object.keys(meta).some(k => meta[k].dirty);

  async function push(){
    if (!client || !state.user) return;
    if (!navigator.onLine) { setStatus('offline'); return; }
    if (pushing) { schedulePush(800); return; }
    let keys = Object.keys(meta).filter(k => meta[k].dirty);
    if (!keys.length) return;
    pushing = true;
    setStatus('syncing');
    // Never overwrite a newer version another device already sent (e.g. this one was offline
    // with an older change): those keys are left out and pulled instead, so every device ends
    // up with the same value. A key that can be merged stays pending: the pull merges it and it
    // is sent again. The check asks only for keys and timestamps.
    let staleFound = false;
    const toMerge = new Set();
    try {
      for (let i = 0; i < keys.length; i += 100) {
        const { data, error } = await client.from('kv').select('key,updated_at').in('key', keys.slice(i, i + 100));
        if (error) throw error;
        (data || []).forEach(r => {
          if (!(meta[r.key] && meta[r.key].dirty && Date.parse(r.updated_at) > meta[r.key].t)) return;
          staleFound = true;
          if (mergerFor(r.key) && ls.getItem(baseKey(r.key)) !== null) toMerge.add(r.key);
          else meta[r.key].dirty = false;
        });
      }
    } catch(e) {
      pushing = false;
      setStatus(navigator.onLine ? 'error' : 'offline', { error: e.message || String(e) });
      return;
    }
    keys = keys.filter(k => meta[k] && meta[k].dirty && !toMerge.has(k));
    if (!keys.length) {
      pushing = false;
      saveMeta();
      setStatus('synced', { lastSync: Date.now(), error: null });
      if (staleFound) pullAndNotify();
      return;
    }
    const sentAt = {};
    const rows = keys.map(k => {
      sentAt[k] = meta[k].t;
      const raw = ls.getItem(PREFIX + k);
      let value = null;
      if (raw !== null) { try { value = JSON.parse(raw); } catch(e){ value = raw; } }
      return { user_id: state.user.id, key: k, value, updated_at: new Date(meta[k].t).toISOString() };
    });
    try {
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await client.from('kv').upsert(rows.slice(i, i + 200), { onConflict: 'user_id,key' });
        if (error) throw error;
      }
      // only clear keys that were not written again while the request was in flight
      keys.forEach(k => { if (meta[k] && meta[k].t === sentAt[k]) meta[k].dirty = false; });
      rows.forEach(r => saveBase(r.key, r.value));
      saveMeta();
      setStatus('synced', { lastSync: Date.now(), error: null });
    } catch(e) {
      setStatus(navigator.onLine ? 'error' : 'offline', { error: e.message || String(e) });
    } finally {
      pushing = false;
      if (hasDirty() && state.status === 'synced') schedulePush(1500);
      if (staleFound) pullAndNotify();
    }
  }
  // after skipping stale keys: bring the newer versions in and let the app redraw
  let onRemote = null;
  async function pullAndNotify(){ if (await pull() && onRemote) onRemote(); }

  // ---- pull ------------------------------------------------------------------
  function applyRow(row){
    const k = row.key;
    if (!k || !isSynced(PREFIX + k)) return false;
    const remoteT = Date.parse(row.updated_at);
    const local = meta[k];
    if (local && local.t >= remoteT) return false;
    // a change here that was not sent yet: lists are merged, anything else takes the server's
    const merged = local && local.dirty ? mergeWithServer(k, row.value) : undefined;
    const value = merged === undefined ? row.value : merged;
    const send = merged !== undefined && !same(merged, row.value);
    applying = true;
    try {
      if (value === null || value === undefined) ls.removeItem(PREFIX + k);
      else ls.setItem(PREFIX + k, JSON.stringify(value));
    } finally { applying = false; }
    // the merge is a newer version than the server's, so it goes back up
    meta[k] = send ? { t: Math.max(Date.now(), remoteT + 1), dirty: true } : { t: remoteT, dirty: false };
    saveBase(k, row.value);
    if (send) schedulePush(300);
    return true;
  }

  // Runs every time the app comes back to the screen, so it first asks only for keys and
  // timestamps (a few KB) and then downloads the values of the keys that changed elsewhere.
  async function pull(){
    if (!client || !state.user) return false;
    if (!navigator.onLine) { setStatus('offline'); return false; }
    setStatus('syncing');
    let changed = false;
    try {
      const newer = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await client.from('kv').select('key,updated_at').range(from, from + 999);
        if (error) throw error;
        data.forEach(r => {
          if (!r.key || !isSynced(PREFIX + r.key)) return;
          const local = meta[r.key];
          if (!local || local.t < Date.parse(r.updated_at)) newer.push(r.key);
          // already in step with the server and no base yet (synced before merging existed): this is it
          else if (!local.dirty && local.t === Date.parse(r.updated_at) && mergerFor(r.key) && ls.getItem(baseKey(r.key)) === null) {
            try { const raw = ls.getItem(PREFIX + r.key); saveBase(r.key, raw === null ? null : JSON.parse(raw)); } catch(e){}
          }
        });
        if (data.length < 1000) break;
      }
      for (let i = 0; i < newer.length; i += 100) {
        const { data, error } = await client.from('kv').select('key,value,updated_at').in('key', newer.slice(i, i + 100));
        if (error) throw error;
        data.forEach(r => { if (applyRow(r)) changed = true; });
      }
      // anything stored here that the account has never seen gets uploaded
      for (let i = 0; i < ls.length; i++) {
        const fk = ls.key(i);
        if (fk && isSynced(fk) && !meta[fk.slice(PREFIX.length)]) meta[fk.slice(PREFIX.length)] = { t: Date.now(), dirty: true };
      }
      saveMeta();
      setStatus('synced', { lastSync: Date.now(), error: null });
      if (hasDirty()) schedulePush(300);
    } catch(e) {
      setStatus(navigator.onLine ? 'error' : 'offline', { error: e.message || String(e) });
    }
    return changed;
  }

  // ---- live updates + lifecycle -----------------------------------------------
  let channel = null, started = false;
  function startBackground(onRemoteChange){
    if (!client || !state.user || started) return;
    started = true;
    onRemote = onRemoteChange;
    channel = client.channel('kv-' + state.user.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kv', filter: 'user_id=eq.' + state.user.id }, payload => {
        const row = payload.new && payload.new.key ? payload.new : null;
        if (row && applyRow(row)) { saveMeta(); onRemoteChange(); }
      })
      .subscribe();
    window.addEventListener('online', async () => { const changed = await pull(); await push(); if (changed) onRemoteChange(); });
    window.addEventListener('offline', () => setStatus('offline'));
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'hidden') { push(); return; }
      if (await pull()) onRemoteChange();
    });
    window.addEventListener('pagehide', () => { if (hasDirty()) push(); });
    if (hasDirty()) schedulePush(500);
  }

  // ---- auth ------------------------------------------------------------------
  const AUTH_MESSAGES = [
    [/invalid login credentials/i, 'E-mail ou senha incorretos.'],
    [/email not confirmed/i, 'Essa conta ainda não foi ativada no servidor. Tente de novo mais tarde.'],
    [/already registered|already been registered|user already exists/i, 'Já existe uma conta com esse e-mail. Use "Entrar".'],
    [/at least 6|password should be/i, 'A senha precisa ter pelo menos 6 caracteres.'],
    [/rate limit|too many/i, 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.'],
    [/invalid.*email|unable to validate email/i, 'Esse e-mail não parece válido.'],
    [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique a internet.'],
  ];
  const friendly = e => {
    const msg = (e && e.message) || String(e);
    const hit = AUTH_MESSAGES.find(([re]) => re.test(msg));
    return hit ? hit[1] : 'Não foi possível concluir: ' + msg;
  };

  // ---- whose data is on this device -----------------------------------------------
  // The data stored here belongs to one account, or to none (used without an account). Entering a
  // different account must neither show nor upload the previous one's data, so it is cleared first:
  // it is safe in its own account. Data typed without an account goes into the account (that is how
  // someone who started without one keeps it). Changes of another account that were not sent yet
  // block the switch instead of being lost.
  const OWNER_KEY = PREFIX + '__sync_owner';
  const readOwner = () => { try { return JSON.parse(ls.getItem(OWNER_KEY) || 'null'); } catch(e){ return null; } };
  const saveOwner = u => { try { rawSet.call(ls, OWNER_KEY, JSON.stringify({ id: u.id, email: u.email || '' })); } catch(e){} };
  // something here was synced with an account (only a push or pull leaves a key clean)
  const fromAnAccount = () => !!readOwner() || Object.keys(meta).some(k => !meta[k].dirty);
  let cleared = false;
  function clearLocalData(){
    applying = true;
    try {
      const keys = [];
      for (let i = 0; i < ls.length; i++) { const k = ls.key(i); if (k && k.startsWith(PREFIX)) keys.push(k); }
      keys.forEach(k => ls.removeItem(k));
    } finally { applying = false; }
    meta = {};
    cleared = true;
  }
  // before entering an account: are there unsent changes of another one here?
  function checkSwitch(email, creating){
    if (!hasDirty()) return;
    const owner = readOwner();
    if (owner && owner.email && owner.email.toLowerCase() !== String(email || '').trim().toLowerCase())
      throw new Error(`Este aparelho tem alterações da conta ${owner.email} que ainda não foram para a nuvem. Entre nela primeiro para enviá-las.`);
    if (!owner && creating && fromAnAccount())
      throw new Error('Este aparelho tem alterações de outra conta que ainda não foram para a nuvem. Entre nela primeiro para enviá-las.');
  }
  // after entering: the data here is this account's from now on. resumed = the session was already
  // here (app opening), so what is stored was being synced with it.
  function claimDevice(user, resumed){
    const owner = readOwner();
    if (owner && owner.id === user.id) return;
    // (a device from before this check, with unsent changes: most likely the same account, they stay)
    if (owner || (!resumed && fromAnAccount() && !hasDirty())) clearLocalData();
    saveOwner(user);
  }
  // this tab signing in or out itself (the events below are about other tabs)
  let authBusy = false;
  async function busy(fn){ authBusy = true; try { return await fn(); } finally { authBusy = false; } }
  if (client) client.auth.onAuthStateChange((event, session) => {
    if (authBusy || !state.user || !/^SIGNED_(IN|OUT)$/.test(event)) return;
    if (session && session.user && session.user.id === state.user.id) return;
    // another tab left this account (or entered another): start over with what is stored now
    detached = true;
    location.reload();
  });

  async function restoreSession(){
    if (!client) return null;
    const { data } = await client.auth.getSession();
    state.user = data && data.session ? data.session.user : null;
    if (state.user) { claimDevice(state.user, true); setStatus(navigator.onLine ? 'synced' : 'offline'); }
    return state.user;
  }
  async function signIn(email, password){
    checkSwitch(email, false);
    const { data, error } = await busy(() => client.auth.signInWithPassword({ email, password }));
    if (error) throw new Error(friendly(error));
    claimDevice(data.user, false);
    state.user = data.user;
    return data.user;
  }
  // No e-mail confirmation: the account is ready to use as soon as it is created.
  // (Supabase → Authentication → Email → "Confirm email" must be off; with it on, the
  // sign-in below fails and the person sees why instead of waiting for an e-mail.)
  async function signUp(email, password){
    checkSwitch(email, true);
    const { data, error } = await busy(() => client.auth.signUp({ email, password }));
    if (error) throw new Error(friendly(error));
    if (!data.session) return signIn(email, password);
    claimDevice(data.user, false);
    state.user = data.user;
    return data.user;
  }
  async function signOut(){
    if (hasDirty()) await pull(); // merges what another device changed in the same lists, so the push below sends it
    await push();
    if (hasDirty()) throw new Error('Ainda há alterações que não foram enviadas. Conecte-se à internet e tente de novo.');
    if (channel) { client.removeChannel(channel); channel = null; }
    const { error } = await busy(() => client.auth.signOut());
    // offline, the session would stay here and the next opening would enter the account again
    if (error && !/session.*(missing|not found)|not.*logged in/i.test(error.message || '')) await busy(() => client.auth.signOut({ scope: 'local' }));
    state.user = null;
    // the data lives in the account; leave nothing behind on this device
    clearLocalData();
    setStatus('local', { lastSync: null, error: null });
  }

  // ---- push notifications ------------------------------------------------------
  const PUSH_ERRORS = [
    [/relation .*push_subscriptions.* does not exist|could not find the table/i, 'O Supabase ainda não foi preparado para notificações (falta rodar supabase/push.sql).'],
    [/failed to fetch|network/i, 'Sem conexão com o servidor. Verifique a internet.'],
  ];
  const pushFriendly = e => {
    const msg = (e && e.message) || String(e);
    const hit = PUSH_ERRORS.find(([re]) => re.test(msg));
    return new Error(hit ? hit[1] : msg);
  };
  async function currentPushSub(){
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    return reg && reg.pushManager ? reg.pushManager.getSubscription() : null;
  }
  async function savePush(sub, tz){
    if (!client || !state.user) throw new Error('Entre na sua conta para ativar as notificações.');
    const j = sub.toJSON();
    const { error } = await client.from('push_subscriptions').upsert(
      { endpoint: j.endpoint, user_id: state.user.id, p256dh: j.keys.p256dh, auth: j.keys.auth, tz },
      { onConflict: 'endpoint' });
    if (error) throw pushFriendly(error);
  }
  async function deletePush(endpoint){
    if (!client || !state.user) return;
    await client.from('push_subscriptions').delete().eq('endpoint', endpoint);
  }
  async function testPush(){
    if (!client || !state.user) throw new Error('Entre na sua conta para testar.');
    const { data, error } = await client.functions.invoke('lembretes', { body: { test: true } });
    if (error) {
      const status = error.context && error.context.status;
      if (status === 404) throw new Error('A função de lembretes ainda não foi publicada no Supabase.');
      throw pushFriendly(error);
    }
    return data;
  }
  // leaving the account also stops this device from getting that account's reminders
  const _signOut = signOut;
  async function signOutAndUnsubscribe(){
    try {
      const sub = await currentPushSub();
      if (sub) { await deletePush(sub.endpoint); await sub.unsubscribe(); }
    } catch (e) {}
    return _signOut();
  }

  // ---- forgotten password ------------------------------------------------------
  // The e-mail link comes back to the app with a recovery session in the address
  // (#access_token=...&refresh_token=...&type=recovery). detectSessionInUrl stays off,
  // so the app reads the link itself, shows which account it belongs to, and only uses
  // it when the person sets the new password there.
  const RESET_MESSAGES = [
    [/only request this after|security purposes/i, 'Espere um minuto antes de pedir outro link.'],
    [/not authorized|not allowed/i, 'O servidor ainda não envia e-mail para esse endereço.'],
    [/different from the old/i, 'A nova senha precisa ser diferente da antiga.'],
    [/jwt|refresh token|expired|invalid.*token/i, 'O link expirou. Peça outro em "Esqueci a senha".'],
  ];
  const resetFriendly = e => {
    const msg = (e && e.message) || String(e), hit = RESET_MESSAGES.find(([re]) => re.test(msg));
    return new Error(hit ? hit[1] : friendly(e));
  };
  async function requestPasswordReset(email){
    if (!client) throw new Error('Sem conexão com o servidor. Verifique a internet.');
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname.replace(/index\.html$/, '') });
    if (error) throw resetFriendly(error);
  }
  // reads the address only: {email, access_token, refresh_token}, {error} or null
  function readRecoveryLink(hash){
    const q = new URLSearchParams(String(hash || '').replace(/^#/, ''));
    if (q.get('error') || q.get('error_code')) return { error: 'Esse link não vale mais. Peça outro em "Esqueci a senha".' };
    if (q.get('type') !== 'recovery' || !q.get('access_token') || !q.get('refresh_token')) return null;
    let email = '';
    try { email = String(JSON.parse(atob(q.get('access_token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).email || ''); } catch (e) {}
    return email ? { email, access_token: q.get('access_token'), refresh_token: q.get('refresh_token') } : { error: 'Esse link não vale mais. Peça outro em "Esqueci a senha".' };
  }
  async function finishPasswordReset(link, password){
    if (!client) throw new Error('Sem conexão com o servidor. Verifique a internet.');
    // a device signed in to another account keeps it: its data must not move to this one
    if (state.user && state.user.email && state.user.email.toLowerCase() !== link.email.toLowerCase())
      throw new Error(`Este aparelho está na conta ${state.user.email}. Saia dela antes de trocar a senha de outra.`);
    checkSwitch(link.email, false);
    const s = await busy(() => client.auth.setSession({ access_token: link.access_token, refresh_token: link.refresh_token }));
    if (s.error) throw resetFriendly(s.error);
    const u = await busy(() => client.auth.updateUser({ password }));
    if (u.error) throw resetFriendly(u.error);
    state.user = u.data.user || (s.data && s.data.user) || null;
    if (state.user) { claimDevice(state.user, false); setStatus(navigator.onLine ? 'synced' : 'offline'); }
    return state.user;
  }

  window.Sync = {
    enabled,
    get state(){ return Object.assign({}, state); },
    get user(){ return state.user; },
    onChange(fn){ listeners.add(fn); fn(Object.assign({}, state)); return () => listeners.delete(fn); },
    hasSyncedBefore: () => Object.keys(meta).length > 0,
    hasPending: hasDirty,
    // entering the account cleared another account's data from this device (the page should start over)
    get cleared(){ return cleared; },
    restoreSession, signIn, signUp, signOut: signOutAndUnsubscribe, pull, push, startBackground,
    currentPushSub, savePush, deletePush, testPush,
    requestPasswordReset, readRecoveryLink, finishPasswordReset,
  };
})();
