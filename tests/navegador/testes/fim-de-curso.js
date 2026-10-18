setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  // reta final: falta só a sequência de Sistemas de Produção e o TCC
  const resto = ['P09', 'P14', 'P16', 'P17', 'TCC'];
  STATE.historico.forEach(i => { i.nota = resto.includes(i.sigla) ? null : 75; delete i.aprovado; });
  STATE.config.disciplinasAtuais = ['P09'];
  STATE.faltas.P09 = {faltas: 13};
  await passo('painel', async () => { switchTab('painel'); renderPainel(); await espera(200); return {risco: [...document.querySelectorAll('#discRiscoPanel .risco-row')].map(txt), formatura: txt(document.getElementById('pcFormatura'))}; });
  await passo('mapa', async () => { switchTab('mapa'); await espera(200); const p = document.getElementById('formaturaPanel'); return {quando: txt(p.querySelector('.fm-quando')), jogo: txt(p.querySelector('.fm-jogo')), alerta: !!p.querySelector('.fm-jogo.is-alerta')}; });
  await passo('arvore', async () => { document.querySelector('[data-mvista="arvore"]').click(); await espera(250); document.querySelector('[data-arv="P09"]').click(); await espera(150); const i = document.getElementById('arvInfo'); return {info: txt(i), alerta: i.classList.contains('is-alerta')}; });
  await passo('detalhe', async () => { showDiscDetail('P09'); const r = txt(document.getElementById('discModalBody')).slice(0, 220); document.getElementById('discDetailOverlay').style.display = 'none'; return r; });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
