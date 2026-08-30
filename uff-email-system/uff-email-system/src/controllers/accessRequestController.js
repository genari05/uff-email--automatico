const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
const accessRequestModel = require('../models/accessRequestModel');
const { generateToken, expiresInHours } = require('../services/tokenService');
const { sendAccessApprovedEmail, sendNewAccessRequestEmail } = require('../services/emailService');

// GET /acesso/solicitar -> tela com campo de e-mail para pedir acesso
function formSolicitar(req, res) {
  res.render('auth/solicitar-acesso', { title: 'Solicitar acesso', erro: null, sucesso: null });
}

// POST /acesso/solicitar
async function solicitar(req, res) {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const person = await personModel.findByEmail(email);

    if (!person) {
      return res.render('auth/solicitar-acesso', {
        title: 'Solicitar acesso',
        erro: 'Nenhuma pessoa cadastrada com esse e-mail. Peça para te cadastrarem primeiro.',
        sucesso: null,
      });
    }

    if (!person.verified) {
      return res.render('auth/solicitar-acesso', {
        title: 'Solicitar acesso',
        erro: 'Você ainda não confirmou seu e-mail. Verifique sua caixa de entrada.',
        sucesso: null,
      });
    }

    const user = await userModel.findByPersonId(person.id);

    // Já tem acesso -> nem precisa pedir de novo
    if (user?.has_access) {
      return res.render('auth/solicitar-acesso', {
        title: 'Solicitar acesso',
        erro: 'Você já tem acesso! Faça login normalmente.',
        sucesso: null,
      });
    }

    const ultimoPedido = await accessRequestModel.findLatestByPerson(person.id);
    if (ultimoPedido && ultimoPedido.status === 'pending') {
      return res.render('auth/solicitar-acesso', {
        title: 'Solicitar acesso',
        erro: 'Você já tem um pedido pendente. Aguarde a análise do líder.',
        sucesso: null,
      });
    }

    // Cria novo pedido (mesmo que o último tenha sido negado - a pessoa
    // pode solicitar quantas vezes quiser até ser aceita)
    await accessRequestModel.create(person.id);

    const leaders = await userModel.findLeaders();
    await Promise.allSettled(
      leaders.map((leader) =>
        sendNewAccessRequestEmail({ to: leader.people.email, requesterName: person.name })
      )
    );

    res.render('auth/solicitar-acesso', {
      title: 'Solicitar acesso',
      erro: null,
      sucesso: 'Pedido enviado! O líder vai avaliar sua solicitação.',
    });
  } catch (err) {
    console.error(err);
    res.render('auth/solicitar-acesso', {
      title: 'Solicitar acesso',
      erro: 'Erro ao enviar pedido. Tente novamente.',
      sucesso: null,
    });
  }
}

// GET /acesso/status -> pessoa consulta o status do pedido dela pelo e-mail
async function formStatus(req, res) {
  res.render('auth/status-pedido', { title: 'Status do pedido', resultado: null, erro: null });
}

async function verStatus(req, res) {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    const person = await personModel.findByEmail(email);

    if (!person) {
      return res.render('auth/status-pedido', {
        title: 'Status do pedido',
        resultado: null,
        erro: 'E-mail não encontrado.',
      });
    }

    const pedido = await accessRequestModel.findLatestByPerson(person.id);
    if (!pedido) {
      return res.render('auth/status-pedido', {
        title: 'Status do pedido',
        resultado: { status: 'nenhum' },
        erro: null,
      });
    }

    res.render('auth/status-pedido', {
      title: 'Status do pedido',
      resultado: { status: pedido.status },
      erro: null,
    });
  } catch (err) {
    console.error(err);
    res.render('auth/status-pedido', {
      title: 'Status do pedido',
      resultado: null,
      erro: 'Erro ao consultar status.',
    });
  }
}

// GET /acesso/pendentes -> painel do líder (protegido por requireAuth + requireLeader)
async function listarPendentes(req, res) {
  const pedidos = await accessRequestModel.listPending();
  res.render('dashboard/pedidos-acesso', { title: 'Pedidos de acesso', pedidos });
}

// POST /acesso/:id/resolver -> líder aprova ou nega
async function resolver(req, res) {
  try {
    const { id } = req.params;
    const { decisao } = req.body; // 'approved' | 'denied'

    const pedido = await accessRequestModel.findById(id);
    if (!pedido) return res.redirect('/acesso/pendentes');

    await accessRequestModel.resolve(id, { status: decisao, resolvedBy: req.user.id });

    if (decisao === 'approved') {
      const user = await userModel.findByPersonId(pedido.person_id);
      const token = generateToken();
      await userModel.grantAccess(user.id, {
        password_set_token: token,
        password_set_expires: expiresInHours(24),
      });
      await sendAccessApprovedEmail({
        to: pedido.people.email,
        name: pedido.people.name,
        token,
      });
    }

    res.redirect('/acesso/pendentes');
  } catch (err) {
    console.error(err);
    res.redirect('/acesso/pendentes');
  }
}

module.exports = {
  formSolicitar,
  solicitar,
  formStatus,
  verStatus,
  listarPendentes,
  resolver,
};
