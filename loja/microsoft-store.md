# Publicar na Microsoft Store

O app da loja é o mesmo do site: ele abre `https://tulioh4.github.io/centro-de-controle/` numa janela própria, sem barra de navegador. Cada atualização publicada no site chega sozinha a quem instalou pela loja; só é preciso mandar um pacote novo à loja se mudar o nome, o ícone ou algo do manifest.

Custo: nenhum (conta de pessoa física na Microsoft Store é gratuita desde setembro de 2025).

## 1. Conta de desenvolvedor (uma vez)

1. Entre em <https://storedeveloper.microsoft.com> com a sua conta Microsoft **pessoal** (Outlook/Hotmail; conta de escola ou trabalho não serve).
2. Escolha **Individual developer** e faça a verificação de identidade (documento com foto e uma selfie). Não pede cartão.
3. A aprovação costuma sair em minutos ou em poucos dias.

## 2. Reservar o nome

1. No [Partner Center](https://partner.microsoft.com/dashboard/apps-and-games/overview): **Apps and games → New product → MSIX or PWA app**.
2. Nome: tente **Centro de Controle**. Se já estiver em uso na loja, **Centro de Controle Acadêmico** ou **Centro de Controle do Curso**. (Melhor não usar o nome de uma faculdade no nome do app.)
3. Abra **Product management → Product identity** e deixe a página aberta: ela mostra **Package/Identity/Name**, **Package/Identity/Publisher** e **Package/Properties/PublisherDisplayName**.

## 3. Gerar o pacote (PWABuilder)

1. Em <https://www.pwabuilder.com>, cole `https://tulioh4.github.io/centro-de-controle/` e toque em **Start**.
2. **Package for stores → Windows → Generate package**.
3. Preencha com os três valores do passo 2 (Package ID, Publisher ID, Publisher display name). Versão: `1.0.0` na primeira vez; em cada pacote novo, aumente (`1.0.1`, `1.1.0`...).
4. Baixe o `.zip`. Dentro dele estão o `.msixbundle` e o `.classic.appxbundle`, que vão para a loja.

## 4. Enviar à loja

Em **Start your submission**:

- **Pricing and availability:** grátis; mercados: Brasil (ou todos).
- **Properties:** categoria **Education** (subcategoria: livros e consulta / ferramentas, a que houver). Política de privacidade: `https://tulioh4.github.io/centro-de-controle/privacidade.html`. Site: `https://github.com/TulioH4/centro-de-controle`. Contato de suporte: `https://github.com/TulioH4/centro-de-controle/issues`.
- **Age ratings:** responda o questionário (sem violência, sem compras, sem conteúdo gerado por outros usuários; o app guarda dados pessoais que a própria pessoa digita). Deve sair "Livre".
- **Packages:** envie os dois arquivos do `.zip`.
- **Store listings → Português (Brasil):** os textos abaixo e as capturas da pasta `capturas/` (as de computador: `painel`, `provas`, `notas`, `tarefas`, `mapa`).
- **Submission options / notas para a certificação:** o texto de "Notas para quem testa", abaixo.

A certificação costuma levar de 1 a 3 dias. Depois de aprovado, o link da loja fica em **Product management → Product identity → URL da loja**.

## Textos da página

**Descrição**

> Centro de Controle reúne a vida acadêmica num lugar só: notas, faltas, provas, tarefas, horário de aulas e o caminho até a formatura.
>
> • Painel do dia: aulas de hoje, próxima aula e próxima prova, prazos da semana e um recado curto com o que importa agora.
> • Notas: notas parciais com peso, média do semestre e quanto falta na próxima prova para passar (com a regra da NP3 do Inatel).
> • Faltas: contador por disciplina com aviso antes de chegar no limite, e um botão "Faltei" nas aulas de hoje.
> • Provas e tarefas: calendário de provas, tarefas em lista ou quadro kanban, e tudo exportável para a agenda do celular.
> • Horário: monte a grade do semestre pelo PDF de horários da faculdade, vendo as turmas e os choques.
> • Mapa de Sucesso: o currículo semestre a semestre, a árvore de pré-requisitos e a previsão de formatura.
> • Encerrar semestre: as notas finais vão para o histórico e o próximo semestre começa já com o horário pronto.
>
> Funciona sem internet. Com uma conta gratuita, os mesmos dados aparecem no computador e no celular. Sem anúncios e sem rastreamento.
>
> Já vem com as grades das engenharias do Inatel (Produção, Biomédica, Computação, Controle e Automação, Elétrica, Software e Telecomunicações); para outros cursos, basta escrever as disciplinas. Projeto independente, não é um app oficial de nenhuma faculdade.

**Recursos do produto** (um por linha)

- Painel do dia com aulas, provas e prazos
- Notas com média ponderada e quanto falta para passar
- Controle de faltas com aviso antes do limite
- Calendário de provas e tarefas em kanban
- Horário montado pelo PDF da faculdade, sem choques
- Previsão de formatura e árvore de pré-requisitos
- Funciona offline e sincroniza entre aparelhos
- Tema claro e escuro

**Termos de busca**

notas, faltas, faculdade, provas, horário, estudos, engenharia

**Novidades desta versão**

> Primeira versão na Microsoft Store.

**Notas para quem testa** (certificação)

> O app pode ser usado sem conta: na tela inicial, toque em "Usar sem conta, só neste aparelho" e siga o assistente (escolha um curso e o semestre). Criar uma conta é opcional e serve só para sincronizar entre aparelhos.

## Quando atualizar o pacote na loja

Mudanças no app (telas, correções, grades) **não** precisam de pacote novo: chegam pelo site. Gere e envie um pacote novo (passos 3 e 4, com a versão maior) só se mudar o nome, o ícone, as cores do manifest ou as capturas da página da loja.

Para refazer as capturas depois de mudanças no visual: `node scripts/capturas.mjs` (no Windows, pelo PowerShell).
