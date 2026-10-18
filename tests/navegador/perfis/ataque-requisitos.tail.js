
;(function(){
  // ataque com o quadro de requisitos ativo: nomes, semestre, curso e faculdade com HTML
  const P = 'centro_controle_gteste_';
  const X = s => `${s}"'><i class=pwnd>${s}</i><img src=x onerror="window.__pwn=(window.__pwn||0)+1">`;
  const g = k => JSON.parse(localStorage.getItem(P + k));
  const st = (k, v) => localStorage.setItem(P + k, JSON.stringify(v));
  const bd = g('base_data');
  bd.historico.forEach(i => { i.disciplina = X(i.disciplina); });
  st('base_data', bd);
  const c = g('config');
  c.instituicao = X('INATEL'); c.semestre = X('2026'); c.curso = X('Engenharia de Produção');
  st('config', c);
})();
