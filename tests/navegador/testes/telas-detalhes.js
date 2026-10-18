setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  await passo('faltasToque', async () => {
    switchTab('faltas'); renderFaltas(); await espera(150);
    const b = document.querySelector('.falta-card [data-fc-dica]');
    if(!b) return 'sem botão';
    b.click(); await espera(150);
    const toasts = [...document.querySelectorAll('#toastContainer .toast')].map(txt);
    const card = b.closest('.falta-card');
    return {botao: txt(b), toast: toasts[toasts.length - 1], info: txt(card.querySelector('.fc-info')), semDicaNaPresenca: !card.querySelector('.fc-pres[title]')};
  });
  await passo('limiteAtingido', async () => { const lim = faltaLimite('F01', 60); STATE.faltas.F01 = {faltas: lim}; renderFaltas(); const c = [...document.querySelectorAll('.falta-card')].find(x => /Física Newtoniana/.test(x.textContent)); const r = txt(c.querySelector('.fc-info')); STATE.faltas.F01 = {faltas: 0}; return r; });
  await passo('detalhesAbertos', async () => {
    switchTab('mapa'); await espera(200);
    const d = document.querySelector('#formaturaPanel .fm-mais'); d.open = true; d.dispatchEvent(new Event('toggle')); await espera(50);
    const sel = document.getElementById('fmLimite'); sel.value = '30'; sel.dispatchEvent(new Event('change')); await espera(300);
    const aberto = document.querySelector('#formaturaPanel .fm-mais').open;
    STATE.config.creditosSemestre = 0; renderFormatura();
    return {aberto};
  });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
