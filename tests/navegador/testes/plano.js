setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const ls = k => JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_' + k));
  window.confirmar = async () => true;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  const semDe = sg => { const c = document.querySelector(`#formaturaPanel [data-disc-chip="${sg}"]`); return c ? txt(c.closest('.fm-sem').querySelector('.fm-sem__h')) : null; };
  const escolhe = async (sg, idx) => { showDiscDetail(sg); const sel = document.getElementById('ddPlano'); const r = {opcoes: sel ? sel.options.length : 0, auto: sel ? sel.options[0].text : null};
    if(sel){ sel.selectedIndex = idx; sel.dispatchEvent(new Event('change')); await espera(250); r.info = txt(document.getElementById('ddPlanoInfo')); }
    document.getElementById('discDetailOverlay').style.display = 'none'; return r; };

  await passo('inicio', async () => { switchTab('mapa'); await espera(200); const p = document.getElementById('formaturaPanel');
    return {quando: txt(p.querySelector('.fm-quando')), conta: txt(p.querySelector('.fm-conta')), P19: semDe('P19'), nota: [...p.querySelectorAll('.fm-notas p')].map(txt).find(t => t.startsWith('Meu plano'))}; });
  // Sistemas de Informação (sem requisito) para o 2º semestre do plano
  await passo('fixaP19', async () => { const r = await escolhe('P19', 2); r.salvo = ls('config').planoCurso; r.ondeAgora = semDe('P19'); r.alfinete = !!document.querySelector('#formaturaPanel [data-disc-chip="P19"].is-fixo'); r.acoes = txt(document.querySelector('#formaturaPanel .fm-acoes')); return r; });
  // Simulação Industrial (precisa de Probabilidade, Sistemas de Produção e Logística) cedo demais
  await passo('fixaP17cedo', async () => { const r = await escolhe('P17', 1); const p = document.getElementById('formaturaPanel');
    r.erro = !!p.querySelector('[data-disc-chip="P17"].is-erro'); r.aviso = txt(p.querySelector('.fm-notas .fm-alerta')); r.quando = txt(p.querySelector('.fm-quando')); return r; });
  await passo('arvore', async () => { document.querySelector('[data-mvista="arvore"]').click(); await espera(250); document.querySelector('[data-arv="P17"]').click(); await espera(150);
    const r = txt(document.getElementById('arvInfo')); document.querySelector('[data-mvista="semestres"]').click(); await espera(150); return r; });
  // de volta ao automático numa delas
  await passo('autoP17', async () => { const r = await escolhe('P17', 0); r.salvo = ls('config').planoCurso; r.erro = !!document.querySelector('#formaturaPanel .is-erro'); return r; });
  // montador: fixa para o próximo semestre uma que não entraria
  await passo('montador', async () => {
    switchTab('horario'); abrirGrade(); gMelhorGrade();
    const antes = [...gPlano().escolhidas];
    const fora = [...GM.disc.values()].map(d => d.sigla).filter(sg => gStatus(sg) === 'falta' && !antes.includes(sg) && curriculoDoPerfil().creditos[sg] && !reqTrava(curriculoDoPerfil(), sg, reqBase(true)).length);
    fecharGrade();
    const alvo = fora[0];
    STATE.config.planoCurso = Object.assign({}, STATE.config.planoCurso, {[alvo]: semNum(STATE.config.semestre) + 1});
    switchTab('horario'); abrirGrade(); gMelhorGrade();
    const r = {antes, alvo, depois: [...gPlano().escolhidas], entrou: gPlano().escolhidas.includes(alvo), aviso: txt(document.getElementById('gmAviso')).slice(-150), form: txt(document.getElementById('gmFormatura'))};
    fecharGrade();
    return r;
  });
  await passo('limpa', async () => { switchTab('mapa'); await espera(200); document.getElementById('fmLimparPlano').click(); await espera(250); return {salvo: ls('config').planoCurso, acoes: !!document.querySelector('#formaturaPanel .fm-acoes'), P19: semDe('P19')}; });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
