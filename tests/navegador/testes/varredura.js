// Varredura: em cada aba (e nas janelas que elas abrem), clica em todos os botões, abas, chips e
// caixas de marcar que não apagam, não saem da conta e não baixam nada. Reprova com qualquer erro no
// console ou na página. As confirmações dizem "não" (nada é apagado), e os avisos só são anotados.
setTimeout(async () => {
  const out = {w: innerWidth, clicados: 0, abas: {}, janelas: {}};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const avisos = [];
  window.confirmar = async () => false; window.avisar = async m => { avisos.push(m); };
  window.open = () => null;
  HTMLAnchorElement.prototype.click = function(){}; // downloads (backup, agenda) não saem do teste
  HTMLInputElement.prototype.showPicker = function(){};
  const PROIBIDO = /excluir|apagar|remover|tirar |sair|logout|exportar|baixar|importar|restaurar|backup|instalar|limpar|desfazer|zerar|trocar perfil|novo perfil|gerenciar|chave|gemini|notifica|testar|^✕$|delete|reset|enviar o pdf|escolher o pdf|trocar pdf/i;
  const ignorar = el => {
    const t = (el.textContent + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.title || '') + ' ' + (el.id || '')).trim();
    return PROIBIDO.test(t) || el.matches('[data-del], [data-del-disc], [data-del-hc], [data-tirar], [data-desfazer-sem], [data-ver-tarefas], label[for], input[type=file], #btnSyncLogout, #btnInstall, #pomodoroBtn, #themeToggle, a[href^="http"], [data-mtab], .navbtn, [data-more-tab]');
  };
  const visivel = el => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const fecharTudo = () => {
    document.querySelectorAll('.modal-overlay.open').forEach(m => { m.classList.remove('open'); });
    if(typeof fecharFimSemestre === 'function' && SEM) fecharFimSemestre();
    if(typeof GM !== 'undefined' && GM && !GM.enc) GM = null;
    if(typeof closeQuickAdd === 'function') closeQuickAdd();
    if(typeof closeMoreSheet === 'function') closeMoreSheet();
    const w = document.getElementById('wizardOverlay'); if(w) w.style.display = 'none';
    const s = document.getElementById('shortcutsModal'); if(s) s.style.display = 'none';
    const pw = document.getElementById('pomodoroWidget'); if(pw) pw.style.display = 'none';
    const dd = document.getElementById('discDetailOverlay'); if(dd) dd.style.display = 'none';
    document.getElementById('app').style.display = '';
  };
  // clica em tudo o que dá dentro de raiz; volta para a aba se um clique trocou de aba
  const clicaTudo = async (raiz, aba, max) => {
    const sel = 'button, [role=button], [role=tab], [role=radio], summary, input[type=checkbox], .chip, [data-sem], [data-cat]';
    let feitos = 0;
    for(let i = 0; i < (max || 120); i++){
      const r = typeof raiz === 'function' ? raiz() : raiz;
      if(!r) break;
      const els = [...r.querySelectorAll(sel)].filter(e => visivel(e) && !e.disabled && !ignorar(e));
      if(i >= els.length) break;
      try{ els[i].click(); feitos++; }catch(e){ out.falhas = out.falhas || []; out.falhas.push('clique: ' + e.message); }
      await espera(25);
      // o que abriu por cima (janela, aviso) fecha antes do próximo clique
      if(aba){
        if(document.querySelector('.modal-overlay.open') || document.getElementById('quickAddOverlay').style.display === 'flex' || document.getElementById('discDetailOverlay').style.display === 'flex') fecharTudo();
        if(currentTabId() !== aba){ switchTab(aba); await espera(30); }
      }
    }
    out.clicados += feitos;
    return feitos;
  };

  STATE.labs = Object.assign({}, STATE.labs, {estudos: true}); renderNav();
  STATE.gradeOferta = window.__OFERTA;
  for(const t of TABS){
    try{
      switchTab(t.id); await espera(150);
      // a aba Notas se desenha no quadro seguinte (requestAnimationFrame): aqui, na hora
      if(t.id === 'desempenho') renderCharts();
      if(t.id === 'mapa'){ lsSet('mapa_vista', 'arvore'); renderMapaSucesso(); await espera(100); }
      const n = await clicaTudo(() => document.getElementById('tab-' + t.id), t.id);
      if(t.id === 'mapa'){ lsSet('mapa_vista', 'semestres'); renderMapaSucesso(); await espera(80); await clicaTudo(() => document.getElementById('tab-mapa'), 'mapa', 60); }
      out.abas[t.id] = n;
    }catch(e){ out.abas[t.id] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; }
    fecharTudo();
  }
  // as janelas, por dentro
  const janela = async (nome, abrir, raiz, max) => {
    try{ await abrir(); await espera(150); out.janelas[nome] = await clicaTudo(raiz, null, max); }
    catch(e){ out.janelas[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; }
    fecharTudo(); await espera(50);
  };
  await janela('montador', () => { switchTab('horario'); abrirGrade(); }, () => document.getElementById('gmBody'), 80);
  await janela('encerrar-1', () => abrirFimSemestre(), () => document.getElementById('semBody'), 40);
  await janela('encerrar-2', () => { abrirFimSemestre(); document.getElementById('semAvancar').click(); }, () => document.getElementById('semBody'), 80);
  await janela('encerrar-3', () => { abrirFimSemestre(); SEM.passo = 3; renderFimSemestre(); }, () => document.getElementById('semBody'), 20);
  await janela('horario', () => openModalHorario(), () => document.getElementById('modalHorario'), 30);
  await janela('turmas', () => openModalTurmas(), () => document.getElementById('modalTurmas'), 20);
  await janela('agenda', () => abrirModalAgenda(), () => document.getElementById('modalAgenda'), 20);
  await janela('novo-item', () => openQuickAdd('tarefa'), () => document.getElementById('quickAddPanel'), 20);
  for(const s of (STATE.config.disciplinasAtuais || []).slice(0, 3)) await janela('detalhe-' + s, () => showDiscDetail(s), () => document.getElementById('discDetailOverlay'), 30);
  if(matchMedia('(max-width:880px)').matches) await janela('mais', () => openMoreSheet(), () => document.getElementById('moreSheet'), 20);
  // assistente, passo a passo (sem concluir)
  await janela('assistente', async () => {
    showWizard(ACTIVE_PROFILE_ID);
    for(const passo of [1, 2, 3, 4, 5]){ WIZARD_STEP = passo; wizardRender(); await espera(60); await clicaTudo(() => document.getElementById('wizardBody'), null, 40); }
  }, () => null, 0);
  // atalhos de teclado das abas e da busca
  for(const k of ['1', '2', '3', '4', '5', '6', '7', '8', '9', '?', 'Escape']){
    document.dispatchEvent(new KeyboardEvent('keydown', {key: k, bubbles: true})); await espera(40);
  }
  fecharTudo();
  out.avisos = avisos.slice(0, 10);
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
