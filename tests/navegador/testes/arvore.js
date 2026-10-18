setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  const toca = async sg => { document.querySelector(`[data-arv="${sg}"]`).click(); await espera(150); };

  await passo('jogo', async () => { switchTab('mapa'); await espera(200); return txt(document.querySelector('#formaturaPanel .fm-jogo')); });
  await passo('arvore', async () => {
    document.querySelector('[data-mvista="arvore"]').click(); await espera(300);
    const a = document.getElementById('mapaArvore'), nos = [...a.querySelectorAll('[data-arv]')];
    const estados = {}; nos.forEach(b => { const st = [...b.classList].find(c => c.startsWith('is-')); estados[st] = (estados[st] || 0) + 1; });
    return {visivel: !a.hidden, timelineOculta: document.getElementById('mapaTimeline').hidden, nos: nos.length, estados, salvo: localStorage.getItem('centro_controle_mapa_vista'), dica: txt(document.getElementById('arvInfo')).slice(0, 80)};
  });
  await passo('tocaM04', async () => {
    await toca('M04');
    const p = document.getElementById('arvPalco');
    return {sel: [...p.querySelectorAll('.is-sel')].map(b => b.dataset.arv), anc: [...p.querySelectorAll('.is-anc')].map(b => b.dataset.arv), desc: [...p.querySelectorAll('.is-desc')].map(b => b.dataset.arv),
      linhas: document.querySelectorAll('#arvSvg path.arv-l').length, info: txt(document.getElementById('arvInfo'))};
  });
  await passo('tocaTCC', async () => { await toca('TCC'); return {linhas: document.querySelectorAll('#arvSvg path.arv-l').length, info: txt(document.getElementById('arvInfo'))}; });
  await passo('tocaP09', async () => { await toca('P09'); return {desc: [...document.querySelectorAll('#arvPalco .is-desc')].map(b => b.dataset.arv), linhas: document.querySelectorAll('#arvSvg path.arv-l').length, info: txt(document.getElementById('arvInfo'))}; });
  await passo('desmarca', async () => { await toca('P09'); return {sel: document.querySelectorAll('#arvPalco .is-sel').length, linhas: document.querySelectorAll('#arvSvg path.arv-l').length, temSel: document.getElementById('arvPalco').classList.contains('tem-sel')}; });
  await passo('verDetalhes', async () => { await toca('F01'); document.querySelector('[data-arv-ver]').click(); await espera(150); const b = document.getElementById('discModalBody'); const r = txt(b).slice(0, 260); document.getElementById('discDetailOverlay').style.display = 'none'; return r; });
  await passo('voltaSemestres', async () => { document.querySelector('[data-mvista="semestres"]').click(); await espera(200); return {timeline: !document.getElementById('mapaTimeline').hidden, arvore: document.getElementById('mapaArvore').hidden, vazia: document.getElementById('mapaArvore').innerHTML === ''}; });
  await passo('painel', async () => { switchTab('painel'); await espera(200); const b = document.getElementById('pcFormatura'); const r = {txt: txt(b)}; b.click(); await espera(150); r.foiPara = document.querySelector('.tab.active')?.id; return r; });
  // limite apertado: algumas cursando passam a pesar; risco no Painel
  await passo('apertado', async () => {
    STATE.config.creditosSemestre = 20;
    const cur = curriculoDoPerfil(), pesos = reqPesos(cur);
    STATE.faltas.M04 = {faltas: 14}; STATE.faltas.P06 = {faltas: 14};
    switchTab('painel'); renderDiscRisco(); await espera(100);
    const r = {pesos, risco: [...document.querySelectorAll('#discRiscoPanel .risco-row')].map(txt)};
    switchTab('mapa'); await espera(200);
    r.jogo = txt(document.querySelector('#formaturaPanel .fm-jogo'));
    showDiscDetail('P06'); r.detalheP06 = txt(document.getElementById('discModalBody')).slice(0, 300); document.getElementById('discDetailOverlay').style.display = 'none';
    STATE.config.creditosSemestre = 0; delete STATE.faltas.M04; delete STATE.faltas.P06;
    return r;
  });
  await passo('montador', async () => {
    switchTab('horario'); abrirGrade(); gMelhorGrade();
    const r = {auto: txt(document.getElementById('gmFormatura')), escolhidas: [...gPlano().escolhidas], aviso: txt(document.getElementById('gmAviso')).slice(0, 200)};
    // tira quase todas: a formatura atrasa
    [...document.querySelectorAll('[data-gdisc]')].filter(c => c.checked).slice(2).forEach(c => { c.checked = false; c.dispatchEvent(new Event('change')); });
    await espera(100);
    r.pequena = {conta: txt(document.getElementById('gmConta')), form: txt(document.getElementById('gmFormatura')), classe: document.getElementById('gmFormatura').className};
    fecharGrade();
    return r;
  });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
