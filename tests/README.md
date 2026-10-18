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

## Unidade (`unidade/`)

Tiram a lógica do `index.html`, `sync.js` e `sw.js` e testam sem navegador.

- **previsao**: centenas de históricos aleatórios. O plano até a formatura tem que respeitar todos os pré e co-requisitos e o limite de créditos, incluir tudo o que falta e nunca prever menos semestres que a cadeia mais longa. Também confere os créditos de cada período do quadro do Inatel.
- **plano**: o "Meu plano" com disciplinas fixadas pela pessoa em semestres aleatórios.
- **calendario**: feriados móveis de 2025 a 2028 e as aulas que restam até o fim do período, contadas à mão.
- **sync**: um Supabase de mentira. Um aparelho que ficou sem internet com uma alteração velha não sobrescreve a versão mais nova que outro aparelho mandou.
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

O que cada teste viu fica em `tests/.saida/<nome>.json`. Algumas telas dependem da data de hoje, como o calendário, a contagem de aulas e a previsão. Por isso os testes de navegador conferem o comportamento, não números fixos.
