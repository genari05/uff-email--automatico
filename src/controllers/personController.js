const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
const accessRequestModel = require('../models/accessRequestModel');
const { generateToken, expiresInHours } = require('../services/tokenService');
const { sendVerificationEmail, sendNewAccessRequestEmail } = require('../services/emailService');

// GET /pessoas/nova -> formulário de cadastro
function formNovaPessoa(req, res) {
  if (req.user) {
    // Já logado -> fica dentro da área interna (com sidebar), não parece
    // que "voltou pro login".
    return res.render('people/form-interna', { title: 'Cadastrar pessoa', erro: null });
  }
  res.render('people/form', { title: 'Cadastrar pessoa', erro: null });
}

// POST /pessoas -> cria pessoa + dispara e-mail de verificação
async function criarPessoa(req, res) {
  const view = req.user ? 'people/form-interna' : 'people/form';

  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.render(view, {
        title: 'Cadastrar pessoa',
        erro: 'Preencha nome e e-mail.',
      });
    }

    const existente = await personModel.findByEmail(email.toLowerCase().trim());
    if (existente) {
      return res.render(view, {
        title: 'Cadastrar pessoa',
        erro: 'Já existe uma pessoa cadastrada com esse e-mail.',
      });
    }

    const token = generateToken();
    const person = await personModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      verification_token: token,
      verification_expires: expiresInHours(24),
    });

    // Já cria o "user" vinculado (sem senha, sem acesso) para
    // podermos ligar pedidos de acesso a essa pessoa depois.
    await userModel.createForPerson(person.id);

    // Cria automaticamente o pedido de acesso, pra pessoa não precisar
    // fazer isso manualmente depois. Fica pendente até o líder aprovar
    // (o líder pode aprovar mesmo antes da pessoa confirmar o e-mail,
    // ou usar "reenviar verificação" / "marcar como verificado" se o
    // e-mail original não chegar).
    await accessRequestModel.create(person.id, 'access');

    // IMPORTANTE: os e-mails abaixo são disparados SEM esperar a resposta
    // (sem "await") - isso evita que o cadastro fique lento esperando o
    // Gmail confirmar o envio. Erros de envio só aparecem no log do servidor.
    userModel.findLeaders().then((leaders) => {
      leaders.forEach((leader) => {
        sendNewAccessRequestEmail({ to: leader.people.email, requesterName: person.name }).catch((err) =>
          console.error('Erro ao notificar líder sobre novo pedido:', err.message)
        );
      });
    }).catch((err) => console.error('Erro ao buscar líderes:', err.message));

    sendVerificationEmail({ to: person.email, name: person.name, token }).catch((err) =>
      console.error('Erro ao enviar e-mail de verificação:', err.message)
    );

    if (req.user) {
      // Logado -> fica na área interna, mostra a lista com aviso de sucesso
      const pessoas = await personModel.listAll();
      return res.render('people/lista', {
        title: 'Pessoas cadastradas',
        pessoas,
        erro: null,
        sucesso: `${person.name} foi cadastrado(a) e já recebeu o e-mail de verificação.`,
      });
    }

    res.render('people/sucesso', {
      title: 'Cadastro realizado',
      pessoa: person,
    });
  } catch (err) {
    console.error(err);
    res.render(view, {
      title: 'Cadastrar pessoa',
      erro: 'Erro ao cadastrar. Tente novamente.',
    });
  }
}

// GET /pessoas/verificar/:token -> confirma o e-mail da pessoa
async function verificarEmail(req, res) {
  try {
    const { token } = req.params;
    const person = await personModel.findByVerificationToken(token);

    if (!person) {
      return res.render('people/verificacao', {
        title: 'Link inválido',
        sucesso: false,
        mensagem: 'Link de verificação inválido ou já utilizado.',
      });
    }

    if (person.verification_expires && new Date(person.verification_expires) < new Date()) {
      return res.render('people/verificacao', {
        title: 'Link expirado',
        sucesso: false,
        mensagem: 'Esse link de verificação expirou. Peça pro líder reenviar ou marcar como verificado.',
      });
    }

    await personModel.markAsVerified(person.id);

    res.render('people/verificacao', {
      title: 'E-mail confirmado',
      sucesso: true,
      mensagem: `E-mail de ${person.name} confirmado com sucesso!`,
    });
  } catch (err) {
    console.error(err);
    res.render('people/verificacao', {
      title: 'Erro',
      sucesso: false,
      mensagem: 'Ocorreu um erro ao verificar o e-mail.',
    });
  }
}

// GET /pessoas -> lista todas as pessoas (rota protegida - painel)
async function listarPessoas(req, res) {
  try {
    const pessoas = await personModel.listAll();
    res.render('people/lista', { title: 'Pessoas cadastradas', pessoas, erro: null, sucesso: null });
  } catch (err) {
    console.error(err);
    res.render('people/lista', { title: 'Pessoas cadastradas', pessoas: [], erro: null, sucesso: null });
  }
}

// GET /pessoas/:id/editar
async function formEditarPessoa(req, res) {
  const pessoa = await personModel.findById(req.params.id);
  if (!pessoa) return res.redirect('/pessoas');
  res.render('people/editar', { title: 'Editar pessoa', pessoa, erro: null });
}

// POST /pessoas/:id/editar
async function editarPessoa(req, res) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    const pessoa = await personModel.findById(id);
    if (!pessoa) return res.redirect('/pessoas');

    if (!name || !email) {
      return res.render('people/editar', {
        title: 'Editar pessoa',
        pessoa,
        erro: 'Preencha nome e e-mail.',
      });
    }

    const emailNormalizado = email.toLowerCase().trim();
    const emailMudou = emailNormalizado !== pessoa.email;

    if (emailMudou) {
      const existente = await personModel.findByEmail(emailNormalizado);
      if (existente) {
        return res.render('people/editar', {
          title: 'Editar pessoa',
          pessoa,
          erro: 'Já existe outra pessoa cadastrada com esse e-mail.',
        });
      }
    }

    await personModel.update(id, { name: name.trim(), email: emailNormalizado });

    // Se o e-mail mudou, a verificação antiga não vale mais - precisa
    // confirmar de novo pra garantir que o novo e-mail é válido.
    if (emailMudou) {
      const token = generateToken();
      await personModel.resetVerification(id, { token, expiresAt: expiresInHours(24) });
      sendVerificationEmail({ to: emailNormalizado, name: name.trim(), token }).catch((err) =>
        console.error('Erro ao reenviar verificação após edição:', err.message)
      );
    }

    res.redirect('/pessoas');
  } catch (err) {
    console.error(err);
    const pessoa = await personModel.findById(req.params.id);
    res.render('people/editar', { title: 'Editar pessoa', pessoa, erro: 'Erro ao salvar. Tente novamente.' });
  }
}

// POST /pessoas/:id/excluir -> remove a pessoa (e em cascata: usuário,
// pedidos de acesso e tarefas dela, por causa das foreign keys do banco)
async function excluirPessoa(req, res) {
  try {
    await personModel.remove(req.params.id);
  } catch (err) {
    console.error(err);
  }
  res.redirect('/pessoas');
}

// POST /pessoas/:id/reenviar-verificacao -> gera novo token e reenvia o e-mail
async function reenviarVerificacao(req, res) {
  try {
    const pessoa = await personModel.findById(req.params.id);
    if (!pessoa) return res.redirect('/pessoas');

    const token = generateToken();
    await personModel.setVerificationToken(pessoa.id, { token, expiresAt: expiresInHours(24) });

    sendVerificationEmail({ to: pessoa.email, name: pessoa.name, token }).catch((err) =>
      console.error('Erro ao reenviar e-mail de verificação:', err.message)
    );

    const pessoas = await personModel.listAll();
    res.render('people/lista', {
      title: 'Pessoas cadastradas',
      pessoas,
      erro: null,
      sucesso: `E-mail de verificação reenviado para ${pessoa.name}.`,
    });
  } catch (err) {
    console.error(err);
    res.redirect('/pessoas');
  }
}

// POST /pessoas/:id/marcar-verificado -> escape hatch: se o e-mail nunca
// chegar por algum motivo, o líder pode confirmar manualmente
async function marcarVerificadoManualmente(req, res) {
  try {
    await personModel.markAsVerified(req.params.id);
  } catch (err) {
    console.error(err);
  }
  res.redirect('/pessoas');
}

module.exports = {
  formNovaPessoa,
  criarPessoa,
  verificarEmail,
  listarPessoas,
  formEditarPessoa,
  editarPessoa,
  excluirPessoa,
  reenviarVerificacao,
  marcarVerificadoManualmente,
};
