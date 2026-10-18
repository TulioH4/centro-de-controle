// Calendário acadêmico: feriados que dependem da Páscoa e aulas que restam até o fim do período.
const {calendario, verificador} = require('./_app');
const v = verificador('calendário acadêmico');

const f = calendario({config: {semestre: '2º semestre de 2026'}, calendario: null}, []);
const moveis = ano => Object.entries(f.calFeriadosNacionais(ano)).filter(([, n]) => /Carnaval|Santa|Corpus/.test(n)).map(([d]) => d.slice(5)).join(',');
// datas conferidas no calendário oficial
v.igual(moveis(2025), '03-03,03-04,04-18,06-19', 'feriados móveis de 2025');
v.igual(moveis(2026), '02-16,02-17,04-03,06-04', 'feriados móveis de 2026');
v.igual(moveis(2027), '02-08,02-09,03-26,05-27', 'feriados móveis de 2027');
v.igual(moveis(2028), '02-28,02-29,04-14,06-15', 'feriados móveis de 2028 (ano bissexto)');
v.igual(f.calSemAula('2026-11-02'), 'Finados', 'Finados sem aula');
v.igual(f.calSemAula('2026-11-03'), null, 'dia comum com aula');
v.igual(f.calSemAula('2026-11-20'), 'Consciência Negra', 'Consciência Negra (nacional desde 2024)');

// aulas que restam: conta de uma data fixa (o teste não depende de quando roda)
const RealDate = Date;
global.Date = class extends RealDate { constructor(...a){ super(...(a.length ? a : [new RealDate(2026, 9, 18, 9).getTime()])); } static now(){ return new RealDate(2026, 9, 18, 9).getTime(); } };
const aulas = [{dia: 'Terça', inicio: '19:30', fim: '21:10', disciplina: 'F01-B'}, {dia: 'Segunda', inicio: '21:30', fim: '23:10', disciplina: 'M04-A'}];
const g = calendario({config: {semestre: '2º semestre de 2026'}, calendario: {inicio: '2026-08-03', fim: '2026-12-11', ocultos: ['2026-11-20'],
  eventos: [{id: 'a', nome: 'Recesso', tipo: 'feriado', de: '2026-11-23', ate: '2026-11-27'}, {id: 'b', nome: 'Rematrícula', tipo: 'matricula', de: '2026-10-20', ate: '2026-10-23'}]}}, aulas);
// conferido à mão: terças de 20/10 a 08/12 menos 24/11 (recesso) = 7; segundas de 19/10 a 07/12 menos 02/11 (Finados) e 23/11 = 6
const restam = g.calAulasRestantes();
v.igual(Object.keys(restam).sort().map(s => [s, restam[s].aulas, restam[s].ha]), [['F01', 7, 14], ['M04', 6, 12]], 'aulas que restam');
v.igual(g.calProgresso().txt, 'Semana 11 de 19', 'semana do semestre');
v.igual(g.calProximos(30).map(e => e.de + ' ' + e.nome), ['2026-10-20 Rematrícula', '2026-11-02 Finados', '2026-11-15 Proclamação da República'], 'próximas datas');
v.igual(g.calLembretes().map(e => e.d + ' ' + e.txt), ['2026-10-20 Rematrícula começa', '2026-10-23 Rematrícula termina', '2026-11-02 Finados, sem aula', '2026-11-23 Recesso, sem aula'], 'lembretes do celular (sem o feriado de domingo)');

// calendário oficial do Inatel 2026: vale sozinho num perfil do Inatel, sem nenhuma data escrita
const inatel = (cfg, cal) => calendario({config: Object.assign({instituicao: 'INATEL', curso: 'Engenharia de Produção', semestre: '2º semestre de 2026'}, cfg), calendario: cal || null}, aulas);
// roda numa outra data (e volta para 18/10/2026)
const emDia = (a, m, d, fn) => { const D = global.Date, t = new RealDate(a, m, d, 9).getTime(); global.Date = class extends RealDate { constructor(...x){ super(...(x.length ? x : [t])); } static now(){ return t; } }; try{ return fn(); } finally { global.Date = D; } };
const i2 = inatel({});
v.igual(JSON.parse(JSON.stringify(i2.calPeriodo())), {inicio: '2026-07-27', fim: '2026-12-12', sem: 4053, estimado: false, oficial: {inicio: '2026-07-27', fim: '2026-12-12'}}, 'período do 2º semestre');
v.igual([i2.calSemAula('2026-10-13'), i2.calSemAula('2026-02-18'), i2.calSemAula('2026-05-22'), i2.calSemAula('2026-10-14')], ['Dia do Professor', 'Cinzas', 'Dia da Padroeira', null], 'dias sem aula do Inatel');
// terças de 20/10 a 08/12, nenhuma sem aula = 8; segundas de 19/10 a 07/12 menos Finados = 7
const r2 = i2.calAulasRestantes();
v.igual([r2.F01.aulas, r2.M04.aulas], [8, 7], 'aulas que restam até 12/12');
v.igual(i2.calProximos(30).map(e => e.de + ' ' + e.nome), ['2026-10-27 Semana da Produção', '2026-11-02 Finados', '2026-11-10 Semana do Empreendedor', '2026-11-15 Proclamação da República'], 'próximas datas (com a semana do curso)');
v.igual(i2.calLembretes().filter(e => /Semana/.test(e.txt)).map(e => e.d + ' ' + e.txt), ['2026-10-27 Semana da Produção começa', '2026-11-10 Semana do Empreendedor começa'], 'evento só avisa o começo');
v.ok(!inatel({curso: 'Engenharia de Telecomunicações'}).calProximos(30).some(e => /Produção/.test(e.nome)), 'a semana de outro curso não aparece');
v.igual(inatel({instituicao: 'Instituto Nacional de Telecomunicações'}).calPeriodo().fim, '2026-12-12', 'reconhece o nome por extenso');
// o semestre é o de hoje, mesmo com o perfil atrasado ou sem semestre reconhecível
v.igual(inatel({semestre: '1º semestre de 2026'}).calPeriodo().inicio, '2026-07-27', 'perfil atrasado usa o semestre de hoje');
v.igual(emDia(2026, 6, 2, () => { const p = inatel({semestre: '4º período'}); return [p.calPeriodo().inicio, p.calPeriodo().fim, p.calSemAulaHoje()]; }), ['2026-02-09', '2026-07-04', null], '02/07: ainda no 1º semestre');
v.igual(emDia(2026, 6, 15, () => inatel({semestre: '1º semestre de 2026'}).calSemAulaHoje()), 'o semestre ainda não começou', 'entre os semestres');
v.igual(emDia(2026, 11, 20, () => { const p = inatel({}); return [p.calPeriodo().fim, p.calSemAulaHoje()]; }), ['2026-12-12', 'o período de aulas acabou'], 'depois do fim das aulas de dezembro');
v.igual(emDia(2025, 9, 1, () => inatel({semestre: '2º semestre de 2025'}).calPeriodo().estimado), true, '2025 não usa o calendário de 2026');
// a data que a pessoa escreve vem na frente; um feriado marcado "com aula" deixa de contar
const i3 = inatel({}, {inicio: '', fim: '2026-12-05', eventos: [], ocultos: ['2026-11-02']});
v.igual([i3.calPeriodo().inicio, i3.calPeriodo().fim, i3.calPeriodo().estimado, i3.calSemAula('2026-11-02')], ['2026-07-27', '2026-12-05', false, null], 'datas da pessoa por cima do oficial');
// sem calendário oficial daquele ano: volta à estimativa e aos feriados nacionais
v.igual(emDia(2027, 2, 1, () => { const p = inatel({semestre: '1º semestre de 2027'}); return [p.calPeriodo().estimado, p.calSemAula('2027-02-09'), p.calSemAula('2027-02-10')]; }), [true, 'Carnaval', null], '2027 ainda sem calendário oficial');
v.ok(!calendario({config: {instituicao: 'Universidade Exemplo', semestre: '2º semestre de 2026'}, calendario: null}, aulas).calSemAula('2026-10-13'), 'outra faculdade não usa o calendário do Inatel');
global.Date = RealDate;

v.fim();
