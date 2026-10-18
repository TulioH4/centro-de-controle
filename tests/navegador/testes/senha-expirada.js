// Link de nova senha que já expirou: abre o login com o aviso e tira o erro do endereço.
setTimeout(async () => {
  const out = {falhas: []};
  const $ = id => document.getElementById(id);
  const confere = (cond, msg) => { if(!cond) out.falhas.push(msg); };
  if(!(window.Sync && Sync.enabled)) out.pulado = 'a biblioteca do Supabase não carregou (sem rede?)';
  else{
    out.tela = {botao: $('authSubmit').textContent, msg: $('authMsg').textContent, endereco: location.href};
    confere(getComputedStyle($('authScreen')).display === 'flex' && out.tela.botao === 'Entrar', 'não abriu o login');
    confere(/não vale mais/.test(out.tela.msg), 'o aviso do link expirado não aparece');
    confere(!/error/.test(location.href), 'o erro ficou no endereço');
  }
  out.erros = __erros;
  const pre = document.createElement('pre'); pre.id = '__audit'; pre.textContent = JSON.stringify(out); document.body.appendChild(pre);
}, 2500);
