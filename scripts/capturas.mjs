// Capturas de tela para a página da loja (Microsoft Store) e para a instalação do app (manifest).
//   node scripts/capturas.mjs
// Usa o perfil de demonstração (dados inventados: tests/navegador/perfis/demo.js), monta o app como
// ele é publicado (dist/) e fotografa cada tela no Edge ou Chrome sem janela. Saem em capturas/.
// No Windows, rode pelo PowerShell (o Edge sem janela não abre de dentro de alguns terminais).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist'), saida = join(root, 'capturas');
// largura x altura da janela e a escala (a imagem sai com o tamanho vezes a escala)
const TELAS = [
  { nome: 'painel', tema: 'light', w: 1366, h: 768, s: 1.5, preparo: "switchTab('painel');" },
  { nome: 'provas', tema: 'dark', w: 1366, h: 768, s: 1.5, preparo: "switchTab('provas');" },
  { nome: 'notas', tema: 'light', w: 1366, h: 768, s: 1.5, preparo: "switchTab('desempenho'); renderCharts();" },
  { nome: 'tarefas', tema: 'dark', w: 1366, h: 768, s: 1.5, preparo: "switchTab('tarefas'); document.getElementById('btnViewKanban').click();" },
  { nome: 'mapa', tema: 'light', w: 1366, h: 768, s: 1.5, preparo: "switchTab('mapa');" },
  // celular: o navegador sem janela não deixa a página com menos de ~500 px de largura (com 390, a foto
  // corta o lado direito); 500 x 1083 tem a proporção de um telefone e a imagem sai com 1170 px de largura
  { nome: 'celular-painel', tema: 'light', w: 500, h: 1083, s: 2.34, preparo: "switchTab('painel');" },
  { nome: 'celular-provas', tema: 'dark', w: 500, h: 1083, s: 2.34, preparo: "switchTab('provas');" },
];

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const navegador = () => {
  const e = process.env;
  return [e.NAVEGADOR, e['ProgramFiles(x86)'] && join(e['ProgramFiles(x86)'], 'Microsoft/Edge/Application/msedge.exe'),
    e.ProgramFiles && join(e.ProgramFiles, 'Microsoft/Edge/Application/msedge.exe'), e.ProgramFiles && join(e.ProgramFiles, 'Google/Chrome/Application/chrome.exe'),
    '/usr/bin/google-chrome', '/usr/bin/chromium'].find(p => p && existsSync(p));
};

const b = spawnSync(process.execPath, [join(root, 'scripts', 'build-pwa.mjs')], { cwd: root, encoding: 'utf8' });
if (b.status !== 0) { console.error(b.stdout + b.stderr); process.exit(1); }
const nav = navegador();
if (!nav) { console.error('Nenhum Edge ou Chrome encontrado (dá para indicar com a variável NAVEGADOR).'); process.exit(1); }
mkdirSync(saida, { recursive: true });
const perfil = readFileSync(join(root, 'tests/navegador/perfis/demo.js'), 'utf8');

// /<tela>/index.html: o app com o perfil de demonstração antes dos scripts e o preparo da tela no fim
const srv = createServer((req, res) => {
  const m = decodeURIComponent(new URL(req.url, 'http://x').pathname).match(/^\/([^/]+)\/(.*)$/);
  const tela = m && TELAS.find(t => t.nome === m[1]);
  if (!tela) { res.writeHead(404); return res.end(); }
  const arq = m[2] || 'index.html';
  if (arq === 'index.html') {
    let html = readFileSync(join(dist, 'index.html'), 'utf8');
    const k = html.indexOf('<script src="https://cdn.jsdelivr');
    html = html.slice(0, k) + '<script src="__perfil.js"></script><style>*,*::before,*::after{animation:none!important;transition:none!important}#toastContainer,#pomodoroBtn{display:none!important}</style>' + html.slice(k);
    const fim = html.lastIndexOf('</body>');
    html = html.slice(0, fim) + '<script src="__preparo.js"></script>' + html.slice(fim);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(html);
  }
  if (arq === '__perfil.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(perfil.split('__TEMA__').join(tela.tema) + `;localStorage.setItem('centro_controle_demo_tema', JSON.stringify('${tela.tema}'));`); }
  if (arq === '__preparo.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); return res.end(`setTimeout(() => { ${tela.preparo} window.scrollTo(0, 0); }, 1500);`); }
  const p = join(dist, arq);
  if (!p.startsWith(dist) || !existsSync(p) || !statSync(p).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TIPOS[extname(p)] || 'application/octet-stream' }); createReadStream(p).pipe(res);
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const porta = srv.address().port;
for (const t of TELAS) {
  const arquivo = join(saida, t.nome + '.png'), perfilNav = join(root, 'tests', '.saida', 'perfis', 'captura-' + t.nome);
  await new Promise(resolve => {
    const p = spawn(nav, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--hide-scrollbars',
      `--user-data-dir=${perfilNav}`, `--window-size=${t.w},${t.h}`, `--force-device-scale-factor=${t.s}`, '--virtual-time-budget=6000',
      `--screenshot=${arquivo}`, `http://127.0.0.1:${porta}/${t.nome}/index.html`], { stdio: 'ignore' });
    const limite = setTimeout(() => p.kill(), 90000);
    p.on('close', () => { clearTimeout(limite); resolve(); });
  });
  console.log(existsSync(arquivo) ? `✓ ${t.nome}.png (${Math.round(t.w * t.s)}x${Math.round(t.h * t.s)})` : `✕ ${t.nome}: o navegador não gerou a imagem`);
}
srv.close();
