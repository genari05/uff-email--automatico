const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
const { generateToken, expiresInHours } = require('../services/tokenService');
const { sendVerificationEmail } = require('../services/emailService');

// GET /pessoas/nova -> formulário de cadastro
function formNovaPessoa(req, res) {
  res.render('people/form', { title: 'Realizar Cadastro', erro: null });
}

// POST /pessoas -> cria pessoa + dispara e-mail de verificação
async function criarPessoa(req, res) {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.render('people/form', {
        title: 'Realizar Cadastro',
        erro: 'Preencha nome e e-mail.',
      });
    }

    const existente = await personModel.findByEmail(email.toLowerCase().trim());
    if (existente) {
      return res.render('people/form', {
        title: 'Realizar Cadastro',
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

    await sendVerificationEmail({ to: person.email, name: person.name, token });

    res.render('people/sucesso', {
      title: 'Cadastro realizado',
      pessoa: person,
    });
  } catch (err) {
    console.error(err);
    res.render('people/form', {
      title: 'Realizar Cadastro',
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
        mensagem: 'Esse link de verificação expirou. Peça um novo cadastro.',
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
    res.render('people/lista', { title: 'Pessoas cadastradas', pessoas });
  } catch (err) {
    console.error(err);
    res.render('people/lista', { title: 'Pessoas cadastradas', pessoas: [] });
  }
}

module.exports = { formNovaPessoa, criarPessoa, verificarEmail, listarPessoas };
