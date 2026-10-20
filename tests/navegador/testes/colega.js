setTimeout(async () => {
  const out = {};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  const ls = k => JSON.parse(localStorage.getItem('centro_controle_' + ACTIVE_PROFILE_ID + '_' + k));
  window.confirmar = async () => true;
  const passo = async (nome, fn) => { try{ out[nome] = await fn(); }catch(e){ out[nome] = 'ERR ' + e.message + ' ' + (e.stack || '').split('\n')[1]; } };
  const b64 = obj => { let bin = ''; new TextEncoder().encode(JSON.stringify(obj)).forEach(b => { bin += String.fromCharCode(b); }); return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const abreLink = async frag => { history.replaceState(null, '', location.pathname + '#grade=' + frag); applyLaunchParams(); await espera(300); };
  let link, meu;

  await passo('gera', async () => {
    switchTab('horario'); abrirGrade(); gMelhorGrade();
    meu = gEscolhidas().map(e => e.sigla + ':' + e.tipo + ':' + e.t.id);
    link = gLinkDaGrade();
    const volta = gLerLinkGrade(link.split('#grade=')[1]);
    const r = {tam: link.length, inicio: link.slice(0, 60), entradas: volta && volta.d.length, minhas: meu.length, botao: !document.getElementById('gmCompartilhar').hidden, nome: volta && volta.n};
    fecharGrade();
    return r;
  });
  // um colega com turmas diferentes nas disciplinas que têm mais de uma turma
  await passo('recebe', async () => {
    const g = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(link.split('#grade=')[1].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))));
    g.n = 'Ana';
    abrirGrade(); const trocadas = [];
    g.d.forEach(x => { const d = GM.disc.get(x[0]); const ts = d && (x[3] ? d.lab : d.teoria); const outra = ts && ts.find(t => t.id !== x[2]); if(outra && trocadas.length < 2){ x[2] = outra.id; x[4] = outra.slots.map(h => [WEEK_DAYS.indexOf(h.dia), GRADE_SLOTS.indexOf(h.hora)]); trocadas.push(x[0] + '→' + outra.id); } });
    fecharGrade();
    await abreLink(b64(g));
    const m = document.getElementById('modalAmigo');
    return {trocadas, aberto: m.classList.contains('open'), titulo: txt(document.getElementById('amTitulo')), resumo: txt(m.querySelector('.am-resumo')), itens: m.querySelectorAll('.am-item').length,
      iguais: m.querySelectorAll('.gm-bl.is-igual').length, blocos: m.querySelectorAll('.gm-bl').length, status: [...m.querySelectorAll('.am-item__st')].map(txt), usar: txt(document.getElementById('amUsar')),
      hash: location.hash, salvo: (ls('grade_amigos') || []).map(x => x.n)};
  });
  await passo('usa', async () => {
    document.getElementById('amUsar').click(); await espera(300);
    const g = STATE.gradeAmigos[0], p = gPlano();
    const iguais = g.d.filter(([sg, , turma, lab]) => (p.sel[sg] || {})[lab ? 'lab' : 'teoria'] === turma).length;
    const r = {montador: document.getElementById('modalGrade').classList.contains('open'), iguais, total: g.d.length, chips: [...document.querySelectorAll('#gmAmigos .gm-amigo')].map(txt), aviso: txt(document.getElementById('gmAviso')).slice(0, 120)};
    return r;
  });
  await passo('reabre', async () => { document.querySelector('#gmAmigos [data-gamigo="0"]').click(); await espera(200); const m = document.getElementById('modalAmigo'); const r = {aberto: m.classList.contains('open'), iguais: m.querySelectorAll('.gm-bl.is-igual').length, usarDesligado: document.getElementById('amUsar').disabled, resumo: txt(m.querySelector('.am-resumo'))}; fecharGradeAmigo(); fecharGrade(); return r; });
  // links adulterados
  await passo('adulterados', async () => {
    const r = {};
    await abreLink('isso-nao-e-base64!!!'); r.lixo = document.getElementById('modalAmigo').classList.contains('open');
    await abreLink(b64({v: 2, n: 'X', d: [['M01', 'x', 'A', 0, [[0, 0]], '']]})); r.versao = document.getElementById('modalAmigo').classList.contains('open');
    const X = s => `${s}"'><i class=pwnd>${s}</i><img src=x onerror="window.__pwn=(window.__pwn||0)+1">`;
    const mau = {v: 1, n: X('Mal'), t: X('Titulo'), d: [['M11', X('Nome'), 'A', 0, [[0, 10], [9, 99], 'x', [2, 11]], X('Sala')], ['<b>', 'x', 'A', 0, [], ''], ['__proto__', 'x', 'A', 0, [], ''], ['M06', 'x', '"><img>', 0, [], ''],
      ...Array.from({length: 60}, (_, i) => ['P' + String(i).padStart(2, '0'), 'x', 'A', 0, [[1, 1]], ''])]};
    await abreLink(b64(mau));
    const m = document.getElementById('modalAmigo');
    r.mau = {aberto: m.classList.contains('open'), titulo: txt(document.getElementById('amTitulo')).slice(0, 40), itens: m.querySelectorAll('.am-item').length, pwnd: document.querySelectorAll('.pwnd, img[onerror]').length, pwn: window.__pwn || 0,
      primeiro: STATE.gradeAmigos[0].d[0][4], codigos: STATE.gradeAmigos[0].d.slice(0, 3).map(x => x[0])};
    fecharGradeAmigo();
    r.poluido = ({}).poluido !== undefined;
    return r;
  });
  await passo('apaga', async () => { abrirGradeAmigo(0); document.getElementById('amApagar').click(); await espera(200); return {restam: (ls('grade_amigos') || []).map(x => x.n.slice(0, 10)), aberto: document.getElementById('modalAmigo').classList.contains('open')}; });
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
