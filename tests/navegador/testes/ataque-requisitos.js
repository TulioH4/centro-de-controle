setTimeout(async () => {
  const out = {injetado: {}, erros: [], estados: 0};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  window.confirmar = async () => false; window.avisar = async () => {};
  const caminho = el => { const p = []; for(let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : '')); return p.join('>'); };
  const olha = nome => {
    out.estados++;
    const achados = [...new Set([...document.querySelectorAll('.pwnd, img[onerror], [onerror]')].map(caminho))];
    if(achados.length) out.injetado[nome] = achados.slice(0, 10);
  };
  const tenta = async (nome, fn) => { try{ await fn(); await espera(120); olha(nome); }catch(e){ out.erros.push(nome + ': ' + e.message); } };
  out.curriculo = (curriculoDoPerfil() || {}).id || null;
  await tenta('mapa', () => switchTab('mapa'));
  await tenta('limite', () => { const s = document.getElementById('fmLimite'); s.value = '32'; s.dispatchEvent(new Event('change')); });
  for(const sg of ['A16', 'P18', 'TCC', 'M04', 'M01', 'F03']) await tenta('detalhe ' + sg, () => showDiscDetail(sg));
  document.getElementById('discDetailOverlay').style.display = 'none';
  await tenta('painel', () => switchTab('painel'));
  await tenta('grade auto', () => { switchTab('horario'); abrirGrade(); gMelhorGrade(); });
  await tenta('grade travada', () => { const cb = document.querySelector('.gm-disc.st-bloq [data-gdisc]'); cb.checked = true; cb.dispatchEvent(new Event('change')); });
  try{ fecharGrade(); }catch(e){}
  await tenta('arvore', () => { switchTab('mapa'); document.querySelector('[data-mvista="arvore"]').click(); });
  for(const sg of ['M04', 'TCC', 'P09', 'F01']) await tenta('arvore ' + sg, () => document.querySelector(`[data-arv="${sg}"]`).click());
  await tenta('painel formatura', () => { switchTab('painel'); renderPainel(); });
  await tenta('grade formatura', () => { switchTab('horario'); abrirGrade(); gMelhorGrade(); });
  try{ fecharGrade(); }catch(e){}
  out.textoQuando =(document.querySelector('#formaturaPanel .fm-quando') || {}).textContent || null;
  out.pwn = window.__pwn || 0;
  out.erros = out.erros.concat(__erros);
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
