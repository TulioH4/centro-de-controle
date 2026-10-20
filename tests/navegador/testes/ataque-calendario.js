setTimeout(async () => {
  const out = {injetado: {}, erros: [], estados: 0};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  window.confirmar = async () => true; window.avisar = async () => {};
  const caminho = el => { const p = []; for(let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : '')); return p.join('>'); };
  const olha = nome => { out.estados++; const a = [...new Set([...document.querySelectorAll('.pwnd, img[onerror], [onerror]')].map(caminho))]; if(a.length) out.injetado[nome] = a.slice(0, 10); };
  const tenta = async (nome, fn) => { try{ await fn(); await espera(150); olha(nome); }catch(e){ out.erros.push(nome + ': ' + e.message); } };
  for(const t of ['painel', 'faltas', 'provas', 'config', 'mapa']) await tenta('aba ' + t, () => switchTab(t));
  await tenta('mes', () => { switchTab('provas'); const d = new Date(); STATE.calMonth = {y: d.getFullYear(), m: d.getMonth()}; renderCalendarGrid(); });
  await tenta('apaga', () => { switchTab('config'); const b = document.querySelector('[data-cal-del]'); if(b) b.click(); });
  await tenta('lembretes', () => { out.lembretes = calLembretes().slice(0, 3); });
  out.cal = {eventos: STATE.calendario.eventos.length, inicio: STATE.calendario.inicio, fim: STATE.calendario.fim, ocultos: STATE.calendario.ocultos, tipos: [...new Set(STATE.calendario.eventos.map(e => e.tipo))], ids: STATE.calendario.eventos.slice(0, 3).map(e => e.id)};
  out.conquistas = STATE.conquistas;
  out.semAulaHoje = calSemAulaHoje();
  out.poluido = ({}).poluido !== undefined;
  out.pwn = window.__pwn || 0;
  out.erros = out.erros.concat(__erros);
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
