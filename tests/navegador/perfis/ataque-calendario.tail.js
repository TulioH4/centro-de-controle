
;(function(){
  // calendário e conquistas adulterados (nuvem/backup): HTML nos nomes, tipos errados, chaves perigosas
  const P = 'centro_controle_gteste_';
  const X = s => `${s}"'><i class=pwnd>${s}</i><img src=x onerror="window.__pwn=(window.__pwn||0)+1">`;
  const hoje = new Date(), iso = n => { const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  localStorage.setItem(P + 'calendario', JSON.stringify({
    inicio: X('2026'), fim: 20261211, ocultos: ['2026-11-02', X('x'), 5, null],
    eventos: [
      {id: X('id'), nome: X('Rematrícula'), tipo: 'matricula', de: iso(1), ate: iso(3)},
      {id: 'ok', nome: X('Feriado da cidade'), tipo: X('feriado'), de: iso(0)},
      {id: 'f2', nome: X('Recesso'), tipo: 'feriado', de: iso(-1), ate: iso(2)},
      {nome: 'sem data', tipo: 'outro'}, null, 'texto', {nome: {a: 1}, de: iso(2)},
      ...Array.from({length: 300}, (_, i) => ({id: 'm' + i, nome: 'Massa ' + i, tipo: 'outro', de: iso(i % 60)})),
    ],
  }));
  localStorage.setItem(P + 'conquistas', JSON.parse('null') === null ? JSON.stringify(JSON.parse('{"__proto__": {"poluido": 1}, "foco1": "<img src=x onerror=window.__pwn=1>", "metade": "2026-10-18", "nota100": 7, "constructor": "antes"}')) : '');
})();
