setTimeout(async () => {
  const out = {passos: []};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const txt = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : null;
  // os avisos e confirmações do app (não os do navegador): o aviso vira um passo; confirmar diz sim
  window.avisar = async m => { out.passos.push('ALERTA: ' + m); };
  window.confirmar = async () => true;
  try{
    const ov = document.getElementById('wizardOverlay');
    out.assistente = !!ov && ov.style.display !== 'none';
    // passo 1: nome, curso, semestre
    document.getElementById('wNome').value = 'Ana Nova';
    document.getElementById('wCurso').value = 'Engenharia de Produção';
    const sem = document.getElementById('wSem'); if(sem) sem.value = '2º semestre de 2026';
    document.getElementById('wizardNext').click(); await espera(300); out.passos.push('passo 1');
    // passo 2: catálogo do Inatel e o semestre em que está (3º)
    const cat = document.querySelector('[data-cat="inatel-producao"]'); if(cat && !cat.classList.contains('active')) cat.click(); await espera(200);
    const s3 = document.querySelector('[data-sem="3"]'); if(s3) s3.click(); await espera(200);
    out.passos.push('catalogo ' + WIZARD_DATA.catalogo + ', semestre ' + WIZARD_DATA.semAtual);
    for(let i = 0; i < 6 && document.getElementById('wizardOverlay').style.display !== 'none'; i++){
      document.getElementById('wizardNext').click(); await espera(400); out.passos.push('avançou ' + (i + 2));
    }
    await espera(2500);
    out.app = getComputedStyle(document.getElementById('app')).display !== 'none';
    out.config = {curriculo: STATE.config.curriculo, semestre: STATE.config.semestre, atuais: (STATE.config.disciplinasAtuais || []).length, historico: STATE.historico.length};
    switchTab('mapa'); await espera(300);
    const f = document.getElementById('formaturaPanel');
    out.previsao = {visivel: !f.hidden, quando: txt(f.querySelector('.fm-quando')), semestres: f.querySelectorAll('.fm-sem').length};
    document.querySelector('[data-mvista="arvore"]').click(); await espera(300);
    out.arvore = {nos: document.querySelectorAll('[data-arv]').length, cursando: document.querySelectorAll('.arv-no.is-cur').length, aprovadas: document.querySelectorAll('.arv-no.is-ok').length};
    document.querySelector('[data-mvista="semestres"]').click();
    await espera(1600);
    out.conquistas = {salvo: STATE.conquistas, titulo: txt(document.querySelector('#conquistasPanel .cq-titulo'))};
    switchTab('config'); await espera(200);
    out.calendario = txt(document.querySelector('#calPanel .gm-nota'));
    switchTab('faltas'); await espera(200);
    out.faltas = document.querySelectorAll('.falta-card').length;
    switchTab('painel'); await espera(200);
    out.painel = [...document.querySelectorAll('#pgGrid > .panel')].map(txt).map(t => t.slice(0, 90));
  }catch(e){ out.passos.push('ERRO ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
