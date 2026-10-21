# Testes

```bash
node tests/rodar.js
```

Precisa de Node 18 ou mais novo e do Edge ou do Chrome instalados. Nada é instalado e nada vai para a internet. Leva uns 30 segundos.

| Comando | O que roda |
| --- | --- |
| `node tests/rodar.js` | tudo |
| `node tests/rodar.js --unidade` | só os testes de unidade (não abre navegador) |
| `node tests/rodar.js --navegador` | só os testes no navegador |
| `node tests/rodar.js telas colega` | só os testes de navegador com esses nomes |

Se o navegador estiver num lugar diferente, indique o caminho na variável `NAVEGADOR`.

No GitHub, os testes rodam a cada envio para a `main`, antes de publicar: se algum falhar, o site continua na versão anterior. O motivo aparece no passo "Testes" da aba Actions.

## Unidade (`unidade/`)

Tiram a lógica do `index.html`, `sync.js` e `sw.js` e testam sem navegador.

- **previsao**: centenas de históricos aleatórios. O plano até a formatura tem que respeitar todos os pré e co-requisitos e o limite de créditos, incluir tudo o que falta e nunca prever menos semestres que a cadeia mais longa. Também confere os créditos de cada período do quadro do Inatel.
- **plano**: o "Meu plano" com disciplinas fixadas pela pessoa em semestres aleatórios.
- **calendario**: feriados móveis de 2025 a 2028, as aulas que restam até o fim do período (contadas à mão) e os calendários oficiais do Inatel de 2026 e 2027.
- **notas**: a regra de aprovação do Inatel (média, NP3 e nota final) e a situação de cada disciplina no histórico.
- **sync**: um Supabase de mentira. Um aparelho que ficou sem internet com uma alteração velha não sobrescreve a versão mais nova que outro aparelho mandou, e as listas mexidas nos dois aparelhos são combinadas item por item (o que cada um adicionou fica, o apagado sai, mudado dos dois lados vale o do servidor).
- **cursos**: as grades das engenharias do Inatel que o assistente oferece (10 períodos, nenhum código repetido, o mesmo código com o mesmo nome em todos os cursos, só Produção com o quadro de requisitos) e a regra da NP3 para qualquer uma delas.
- **conta**: de quem são os dados do aparelho. Entrar ou criar outra conta não mostra nem envia os dados da anterior; os de quem usava sem conta vão para a conta nova; alteração ainda não enviada de outra conta impede a troca; e a aba que ficou aberta quando outra saiu da conta recarrega sem gravar nada.
- **service-worker**: os lembretes do celular com cada tipo de aviso ligado ou desligado.

## Navegador (`navegador/`)

O `rodar.js` monta o app como ele é publicado (`scripts/build-pwa.mjs`, com a CSP), serve num endereço local e abre no Edge ou Chrome sem janela. Cada teste usa um perfil de `perfis/` (dados inventados, nunca os seus) e roda um script de `testes/` que mexe nas telas.

Um teste reprova se acontecer um destes:

- erro no console ou na página, ou bloqueio da CSP;
- um passo que deu erro;
- texto adulterado que virou HTML (perfis `ataque*`, com `<img onerror>` em todo campo);
- algo vazando para o lado da tela;
- botão ou campo sem nome para leitor de tela;
- uma conferência que o próprio teste anotou em `falhas`.

A **varredura** (no computador, no celular e no tema claro) entra em cada aba e em cada janela e clica em tudo o que não apaga, não sai da conta e não baixa nada (mais de 500 cliques por rodada); qualquer erro reprova.

O **aluno-outro-curso** passa pelo assistente escolhendo Engenharia de Telecomunicações e confere o histórico, o nome do curso e a regra do Inatel no perfil criado.

O **ajustes** (no computador e, como `ajustes-celular`, com 390 px) confere os avisos do próprio app no lugar das caixas do navegador, o "Novo item" cabendo na tela, a tarefa nova aparecendo no quadro, as listas de disciplina e de semestre, Configurações no pé da barra, as tarefas no Painel, o calendário de provas no celular, as ligações do Mapa sem passar por cima das disciplinas, o horário montado no passo 2 do "Encerrar semestre", a Ajuda (tecla ?) e o tour, com cada passo destacando a parte certa e dentro da tela.

O que cada teste viu fica em `tests/.saida/<nome>.json`. Algumas telas dependem da data de hoje, como o calendário, a contagem de aulas e a previsão. Por isso os testes de navegador conferem o comportamento, não números fixos.
