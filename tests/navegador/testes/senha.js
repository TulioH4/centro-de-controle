// "Esqueci a senha": o link do e-mail abre a tela da nova senha, mostra de qual conta é e tira a sessão
// do endereço; o pedido do link usa o e-mail escrito. Nada vai para o servidor: as chamadas são trocadas.
setTimeout(async () => {
  const out = {falhas: []};
  const espera = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  const vis = id => { const el = $(id); return !!el && !el.hidden && el.offsetParent !== null; };
  const confere = (cond, msg) => { if(!cond) out.falhas.push(msg); };
  const fim = () => { out.erros = __erros; const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre); };
  if(!(window.Sync && Sync.enabled)){ out.pulado = 'a biblioteca do Supabase não carregou (sem rede?)'; return fim(); }
  try{
    out.tela = {sub: $('authSub').textContent, botao: $('authSubmit').textContent, campoEmail: vis('authEmailField'), esqueci: vis('authForgot'), semConta: vis('authSkip'), endereco: location.href};
    confere(getComputedStyle($('authScreen')).display === 'flex', 'a tela da nova senha não abriu');
    confere(out.tela.botao === 'Salvar nova senha', 'não está no modo de nova senha');
    confere(/teste@exemplo\.com/.test(out.tela.sub), 'a tela não mostra de qual conta é a senha');
    confere(!/access_token|refresh_token/.test(location.href), 'a sessão de recuperação ficou no endereço');
    confere(!out.tela.campoEmail && !out.tela.esqueci && !out.tela.semConta, 'aparecem campos que não fazem sentido na nova senha');
    // senha curta
    $('authPass').value = '123'; $('authForm').requestSubmit(); await espera(100);
    confere(/6 caracteres/.test($('authMsg').textContent), 'senha curta passou');
    // salvar: a nova senha vai para a conta do link (a chamada ao servidor é trocada)
    Sync.finishPasswordReset = async (link, p) => { out.salvou = [link.email, p]; throw new Error('erro de teste'); };
    $('authPass').value = 'novasenha1'; $('authForm').requestSubmit(); await espera(200);
    confere(JSON.stringify(out.salvou) === '["teste@exemplo.com","novasenha1"]', 'a nova senha não foi para a conta do link');
    confere($('authMsg').textContent === 'erro de teste', 'o erro do servidor não aparece');
    // cancelar volta ao login, com "Esqueci a senha"
    $('authSwitch').click(); await espera(100);
    confere($('authSubmit').textContent === 'Entrar' && vis('authForgot') && vis('authEmailField') && vis('authSkip'), 'cancelar não voltou ao login');
    // esqueci a senha: sem e-mail pede o e-mail; com e-mail usa o escrito
    Sync.requestPasswordReset = async email => { out.pedido = email; };
    $('authEmail').value = ''; $('authForgot').click(); await espera(100);
    confere(/Escreva seu e-mail/.test($('authMsg').textContent), 'sem e-mail não pediu o e-mail');
    $('authEmail').value = 'aluno@exemplo.com'; $('authForgot').click(); await espera(200);
    confere(out.pedido === 'aluno@exemplo.com' && /chega um link/.test($('authMsg').textContent), 'o pedido do link não usou o e-mail escrito');
    // criar conta não mostra "Esqueci a senha"
    $('authSwitch').click(); await espera(100);
    confere(!vis('authForgot') && $('authSubmit').textContent === 'Criar conta', '"Esqueci a senha" aparece em criar conta');
  }catch(e){ out.passo = 'ERR ' + e.message; }
  fim();
}, 2500);
