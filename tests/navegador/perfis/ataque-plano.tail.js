
;(function(){
  // plano adulterado (vindo da nuvem ou de um backup): chaves perigosas, tipos errados, valores absurdos
  const P = 'centro_controle_gteste_';
  const c = JSON.parse(localStorage.getItem(P + 'config'));
  c.planoCurso = JSON.parse('{"__proto__": {"poluido": 1}, "P17": "x", "toString": 4055, "P19": 99999999, "M11": 4054, "constructor": 4054, "<img src=x onerror=window.__pwn=1>": 4055, "P14": -5}');
  c.creditosSemestre = '<b>30</b>';
  localStorage.setItem(P + 'config', JSON.stringify(c));
})();
