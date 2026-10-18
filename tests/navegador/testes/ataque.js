setTimeout(async () => {
  const out = {injetado: {}, erros: [], estados: 0};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  window.confirm = () => false; window.alert = () => {};
  const caminho = el => { const p = []; for(let e = el; e && e !== document.body && p.length < 4; e = e.parentElement) p.unshift(e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.classList[0] ? '.' + e.classList[0] : '')); return p.join('>'); };
  const olha = nome => {
    out.estados++;
    window.__vistos = window.__vistos || new Set();
    const achados = [...new Set([...document.querySelectorAll('.pwnd, img[onerror], [onerror]')].map(caminho))].filter(c => !__vistos.has(c));
    achados.forEach(c => __vistos.add(c));
    if(achados.length) out.injetado[nome] = achados.slice(0, 10);
  };
  const tenta = async (nome, fn) => { try{ await fn(); await espera(120); olha(nome); }catch(e){ out.erros.push(nome + ': ' + e.message); } };
  for(const t of TABS) await tenta('aba ' + t.id, () => switchTab(t.id));
  await tenta('mais (celular)', () => { const b = document.querySelector('[data-more-tab]'); });
  await tenta('modal horario', () => openModalHorario()); try{ closeModalHorario(); }catch(e){}
  await tenta('modal turmas', () => openModalTurmas()); try{ closeModalTurmas(); }catch(e){}
  await tenta('modal agenda', () => abrirModalAgenda()); try{ fecharModalAgenda(); }catch(e){}
  for(const passo of [1, 2, 3, 4]) await tenta('semestre ' + passo, () => { abrirFimSemestre(); SEM.passo = passo; renderFimSemestre(); });
  try{ fecharFimSemestre(); }catch(e){}
  await tenta('grade', () => { switchTab('horario'); abrirGrade(); gMelhorGrade(); });
  await tenta('grade marcadas', () => gMontarMarcadas());
  try{ fecharGrade(); }catch(e){}
  for(const s of STATE.historico.slice(0, 4)) await tenta('detalhe ' + s.sigla.slice(0, 6), () => showDiscDetail(s.sigla));
  try{ document.getElementById('discDetailOverlay').style.display = 'none'; }catch(e){}
  await tenta('estudos detalhe', () => { switchTab('estudos'); estReset('detail', STATE.estudos[0].id); renderEstudos(); });
  for(const sub of ['resumo', 'conceitos', 'flashcards', 'quiz', 'dissertativas']) await tenta('estudos ' + sub, () => { EST.sub = sub; renderEstudos(); });
  await tenta('perfis', () => showProfilePicker());
  try{ document.getElementById('profileScreen').style.display = 'none'; }catch(e){}
  await tenta('quick add', () => openQuickAdd('prova')); try{ closeQuickAdd(); }catch(e){}
  await tenta('editar tarefa', () => { switchTab('tarefas'); const b = document.querySelector('[data-edit-tarefa]'); b && b.click(); });
  await tenta('editar prova', () => { switchTab('provas'); const b = document.querySelector('[data-edit-prova]'); b && b.click(); });
  await tenta('lancar nota', () => { const b = document.querySelector('[data-lancar-nota], [data-nota-prova]'); b && b.click(); });
  out.pwn = window.__pwn || 0;
  out.erros.push(...[...new Set(__erros)].filter(e => !/script-src-attr inline/.test(e)));
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
