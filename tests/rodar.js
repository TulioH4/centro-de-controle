// Roda todos os testes. Uso:
//   node tests/rodar.js                 tudo
//   node tests/rodar.js telas colega    só esses testes de navegador
//   node tests/rodar.js --unidade       só os de unidade (não precisa de navegador)
//   node tests/rodar.js --navegador     só os de navegador
// Os de navegador montam o app como ele é publicado (scripts/build-pwa.mjs, com a CSP), servem num
// endereço local e abrem no Edge ou Chrome sem janela, cada um com um perfil de teste. O resultado
// de cada um fica em tests/.saida/<nome>.json.
const fs = require('fs');
const path = require('path');
const http = require('http');
const {spawn, spawnSync} = require('child_process');

const RAIZ = path.resolve(__dirname, '..'), NAV = path.join(__dirname, 'navegador'), SAIDA = path.join(__dirname, '.saida');
const DIST = path.join(RAIZ, 'dist'), JUNTOS = 3;

const REQ = ['grade.js', 'requisitos.tail.js'];
const TESTES = [
  {nome: 'aluno-novo', perfil: ['novo.js']},
  ...['telas', 'telas-detalhes', 'calendario', 'calendario-bordas', 'colega', 'plano', 'arvore', 'fim-de-curso', 'requisitos', 'requisitos-bordas', 'notas']
    .map(nome => ({nome, perfil: REQ})),
  {nome: 'fluxos', perfil: ['grade.js'], extra: 'oferta.js'},
  {nome: 'ajustes', perfil: REQ, extra: 'oferta.js'},
  {nome: 'ajustes-celular', teste: 'ajustes', perfil: REQ, extra: 'oferta.js', largura: 390},
  {nome: 'layout', perfil: ['demo.js']},
  {nome: 'layout-celular', teste: 'layout', perfil: REQ, extra: 'vista-arvore.js', largura: 390},
  {nome: 'layout-claro', teste: 'layout', perfil: REQ, tema: 'light'},
  {nome: 'acessibilidade', perfil: REQ, extra: 'vista-arvore.js'},
  {nome: 'ataque', perfil: ['ataque.js']},
  {nome: 'ataque-dados', perfil: ['ataque-dados.js']},
  {nome: 'ataque-requisitos', perfil: [...REQ, 'ataque-requisitos.tail.js']},
  {nome: 'ataque-plano', teste: 'ataque-requisitos', perfil: [...REQ, 'ataque-requisitos.tail.js', 'ataque-plano.tail.js']},
  {nome: 'ataque-calendario', perfil: [...REQ, 'ataque-calendario.tail.js']},
  // link do e-mail de "Esqueci a senha" (sessão de mentira da conta teste@exemplo.com) e um link expirado
  {nome: 'senha', perfil: ['sem-conta.js'], hash: '#access_token=' + jwtFalso('teste@exemplo.com') + '&refresh_token=abc&expires_in=3600&token_type=bearer&type=recovery'},
  {nome: 'senha-expirada', perfil: ['sem-conta.js'], hash: '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'},
];
function jwtFalso(email){
  const b = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  return b({alg: 'HS256', typ: 'JWT'}) + '.' + b({email, exp: 4102444800}) + '.assinatura';
}

const ler = (...p) => fs.readFileSync(path.join(...p), 'utf8');
const apagar = p => { try{ fs.rmSync(p, {recursive: true, force: true, maxRetries: 5, retryDelay: 300}); }catch(e){} };

function acharNavegador(){
  if(process.env.NAVEGADOR) return process.env.NAVEGADOR;
  const e = process.env, c = [
    e['ProgramFiles(x86)'] && path.join(e['ProgramFiles(x86)'], 'Microsoft/Edge/Application/msedge.exe'),
    e.ProgramFiles && path.join(e.ProgramFiles, 'Microsoft/Edge/Application/msedge.exe'),
    e.ProgramFiles && path.join(e.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
    e.LOCALAPPDATA && path.join(e.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe'),
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge',
  ];
  return c.find(p => p && fs.existsSync(p));
}

// ---------------- testes de unidade
function unidade(){
  const dir = path.join(__dirname, 'unidade');
  let ok = true;
  fs.readdirSync(dir).filter(f => f.endsWith('.test.js')).sort().forEach(f => {
    const r = spawnSync(process.execPath, [path.join(dir, f)], {encoding: 'utf8'});
    process.stdout.write(r.stdout + r.stderr);
    if(r.status !== 0) ok = false;
  });
  return ok;
}

// ---------------- testes de navegador
// Cada teste tem seu endereço (/t/<nome>/): o index.html ganha a sonda e o perfil antes dos scripts do
// app e o teste no fim do <body>; o resto vem de dist/. Os scripts entram como arquivos (a CSP bloqueia
// os embutidos), e animações ficam desligadas para o teste não depender do tempo delas.
const TIPOS = {'.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain'};

function montarPagina(t){
  const tema = t.tema || 'dark';
  const perfil = t.perfil.map(f => ler(NAV, 'perfis', f)).join('\n;\n').split('__TEMA__').join(tema)
    + `\n;localStorage.setItem('centro_controle_demo_tema', JSON.stringify('${tema}'));`;
  const teste = (t.extra ? ler(NAV, 'perfis', t.extra) + '\n;\n' : '') + ler(NAV, 'testes', (t.teste || t.nome) + '.js');
  let html = ler(DIST, 'index.html');
  const k = html.indexOf('<script src="https://cdn.jsdelivr');
  if(k < 0) throw new Error('index.html publicado mudou: não achei os scripts externos');
  html = html.slice(0, k) + '<script src="__sonda.js"></script><script src="__perfil.js"></script>'
    + '<style>*,*::before,*::after{animation:none!important;transition:none!important}#toastContainer{display:none!important}</style>' + html.slice(k);
  const b = html.lastIndexOf('</body>');
  html = html.slice(0, b) + '<script src="__teste.js"></script>' + html.slice(b);
  return {'index.html': html, '__sonda.js': ler(NAV, 'sonda.js'), '__perfil.js': perfil, '__teste.js': teste};
}

function servidor(paginas){
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname), m = u.match(/^\/t\/([^/]+)\/(.*)$/);
    if(!m || !paginas[m[1]]){ res.writeHead(404); return res.end(); }
    const arq = m[2] || 'index.html', proprio = paginas[m[1]][arq];
    const tipo = TIPOS[path.extname(arq).toLowerCase()] || 'application/octet-stream';
    if(proprio !== undefined){ res.writeHead(200, {'Content-Type': tipo + '; charset=utf-8'}); return res.end(proprio); }
    const p = path.join(DIST, arq);
    if(!p.startsWith(DIST + path.sep) || !fs.existsSync(p) || !fs.statSync(p).isFile()){ res.writeHead(404); return res.end(); }
    res.writeHead(200, {'Content-Type': tipo}); fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

function abrir(nav, url, t){
  const perfil = path.join(SAIDA, 'perfis', t.nome), arq = path.join(SAIDA, 'perfis', t.nome + '.html');
  apagar(perfil);
  fs.mkdirSync(perfil, {recursive: true});
  // a página vai para um arquivo: no Windows o Edge às vezes não escreve num pipe
  const fd = fs.openSync(arq, 'w');
  return new Promise(resolve => {
    // (no GitHub Actions o Chrome roda sem a caixa de areia do Linux, que lá não tem permissão)
    const p = spawn(nav, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', ...(process.env.CI ? ['--no-sandbox'] : []),
      '--virtual-time-budget=30000', `--window-size=${t.largura || 1280},900`, `--user-data-dir=${perfil}`, '--dump-dom', url], {stdio: ['ignore', fd, 'ignore']});
    const limite = setTimeout(() => p.kill(), 120000);
    p.on('close', () => { clearTimeout(limite); fs.closeSync(fd); resolve(fs.readFileSync(arq, 'utf8')); });
  });
}

const desfaz = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// O que reprova um teste de navegador: o que o próprio teste anotou em "falhas", erro no console ou na
// página, bloqueio da CSP, passo que deu erro, texto adulterado que virou HTML de verdade, algo vazando
// para o lado no layout, e controles sem nome.
function problemas(r){
  const p = [...(r.falhas || [])];
  (r.erros || []).filter(e => !/script-src-attr inline/.test(e)).forEach(e => p.push('erro: ' + e));
  Object.entries(r.injetado || {}).forEach(([onde, o]) => p.push(`HTML injetado em "${onde}": ${o.join(', ')}`));
  if(r.pwn) p.push(`script injetado rodou ${r.pwn}x`);
  if(r.poluido) p.push('Object.prototype contaminado');
  if(r.injetado && !r.estados) p.push('o ataque não chegou a olhar nenhuma tela');
  Object.entries(r.semNome || {}).forEach(([onde, l]) => l.length && p.push(`sem nome acessível em ${onde}: ${l.slice(0, 4).join(', ')}`));
  Object.entries(r.inputsSemRotulo || {}).forEach(([onde, l]) => l.length && p.push(`campo sem rótulo em ${onde}: ${l.slice(0, 4).join(', ')}`));
  const anda = (v, onde) => {
    if(typeof v === 'string'){ if(/^ERRO? /.test(v)) p.push(`${onde}: ${v.slice(0, 200)}`); }
    else if(Array.isArray(v)) v.forEach((x, i) => anda(x, onde));
    else if(v && typeof v === 'object') Object.entries(v).forEach(([k, x]) => {
      if(k === 'largos' && Array.isArray(x) && x.length) p.push(`${onde}: vaza para o lado: ${x.slice(0, 3).join(', ')}`);
      else anda(x, onde ? onde + '.' + k : k);
    });
  };
  anda(Object.fromEntries(Object.entries(r).filter(([k]) => !['erros', 'injetado', 'falhas'].includes(k))), '');
  return p;
}

async function navegador(filtro){
  const nav = acharNavegador();
  if(!nav){ console.log('✕ nenhum Edge ou Chrome encontrado (dá para indicar com a variável NAVEGADOR)'); return false; }
  const b = spawnSync(process.execPath, [path.join(RAIZ, 'scripts', 'build-pwa.mjs')], {cwd: RAIZ, encoding: 'utf8'});
  if(b.status !== 0){ console.log('✕ o build falhou:\n' + b.stdout + b.stderr); return false; }
  const lista = filtro.length ? TESTES.filter(t => filtro.includes(t.nome)) : TESTES;
  if(!lista.length){ console.log('nenhum teste com esse nome. Existem: ' + TESTES.map(t => t.nome).join(', ')); return false; }
  fs.mkdirSync(SAIDA, {recursive: true});
  const paginas = {};
  lista.forEach(t => paginas[t.nome] = montarPagina(t));
  const srv = await servidor(paginas), porta = srv.address().port;
  let ok = true, i = 0;
  const um = async () => {
    for(let t; (t = lista[i++]);){
      const html = await abrir(nav, `http://127.0.0.1:${porta}/t/${t.nome}/index.html${t.hash || ''}`, t);
      const m = html.match(/<pre id="__audit">([\s\S]*?)<\/pre>/);
      let r = null, p;
      try{ r = m && JSON.parse(desfaz(m[1])); }catch(e){}
      if(!r) p = ['o teste não terminou (sem resultado na página)'];
      else{ fs.writeFileSync(path.join(SAIDA, t.nome + '.json'), JSON.stringify(r, null, 2)); p = problemas(r); }
      if(p.length){ ok = false; console.log(`✕ ${t.nome}`); p.slice(0, 12).forEach(x => console.log('   - ' + x)); }
      else console.log(`✓ ${t.nome}`);
    }
  };
  await Promise.all(Array.from({length: JUNTOS}, um));
  srv.close();
  apagar(path.join(SAIDA, 'perfis'));
  return ok;
}

(async () => {
  const args = process.argv.slice(2), nomes = args.filter(a => !a.startsWith('--'));
  const soUnidade = args.includes('--unidade'), soNavegador = args.includes('--navegador') || nomes.length;
  let ok = true;
  if(!soNavegador){ console.log('— testes de unidade'); ok = unidade() && ok; }
  if(!soUnidade){ console.log('— testes no navegador'); ok = await navegador(nomes) && ok; }
  console.log(ok ? '\ntudo certo' : '\nhá falhas (detalhes em tests/.saida/)');
  process.exitCode = ok ? 0 : 1;
})();
