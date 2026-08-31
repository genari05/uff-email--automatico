const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
const accessRequestModel = require('../models/accessRequestModel');
const { generateToken, expiresInHours } = require('../services/tokenService');
const {
  sendAccessApprovedEmail,
  sendNewAccessRequestEmail,
  sendNewLeaderRequestEmail,
} = require('../services/emailService');

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

    const ultimoPedido = await accessRequestModel.findLatestByPerson(person.id, 'access');
    if (ultimoPedido && ultimoPedido.status === 'pending') {
      return res.render('auth/solicitar-acesso', {
        title: 'Solicitar acesso',
        erro: 'Você já tem um pedido pendente. Aguarde a análise do líder.',
        sucesso: null,
      });
    }

    // Cria novo pedido (mesmo que o último tenha sido negado - a pessoa
    // pode solicitar quantas vezes quiser até ser aceita)
    await accessRequestModel.create(person.id, 'access');

    const leaders = await userModel.findLeaders();
    leaders.forEach((leader) => {
      sendNewAccessRequestEmail({ to: leader.people.email, requesterName: person.name }).catch((err) =>
        console.error('Erro ao notificar líder:', err.message)
      );
    });

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

// GET /acesso/virar-lider -> membro logado vê a tela de pedir para virar líder
async function formSolicitarLider(req, res) {
  try {
    if (req.user.role === 'leader') {
      return res.render('auth/solicitar-lider', {
        title: 'Virar líder',
        erro: 'Você já é líder do sistema.',
        sucesso: null,
      });
    }

    const ultimoPedido = await accessRequestModel.findLatestByPerson(req.user.person_id, 'leader');
    res.render('auth/solicitar-lider', {
      title: 'Virar líder',
      erro: null,
      sucesso: null,
      pedidoPendente: ultimoPedido?.status === 'pending',
    });
  } catch (err) {
    console.error(err);
    res.render('auth/solicitar-lider', {
      title: 'Virar líder',
      erro: 'Erro ao carregar. Verifique se a migração do banco foi executada.',
      sucesso: null,
    });
  }
}

// POST /acesso/virar-lider -> cria o pedido de promoção a líder
async function solicitarLider(req, res) {
  try {
    if (req.user.role === 'leader') {
      return res.render('auth/solicitar-lider', {
        title: 'Virar líder',
        erro: 'Você já é líder do sistema.',
        sucesso: null,
      });
    }

    const ultimoPedido = await accessRequestModel.findLatestByPerson(req.user.person_id, 'leader');
    if (ultimoPedido && ultimoPedido.status === 'pending') {
      return res.render('auth/solicitar-lider', {
        title: 'Virar líder',
        erro: 'Você já tem um pedido pendente. Aguarde a análise.',
        sucesso: null,
      });
    }

    await accessRequestModel.create(req.user.person_id, 'leader');

    const leaders = await userModel.findLeaders();
    leaders.forEach((leader) => {
      sendNewLeaderRequestEmail({ to: leader.people.email, requesterName: req.user.people.name }).catch((err) =>
        console.error('Erro ao notificar líder:', err.message)
      );
    });

    res.render('auth/solicitar-lider', {
      title: 'Virar líder',
      erro: null,
      sucesso: 'Pedido enviado! Um líder atual vai avaliar sua solicitação.',
    });
  } catch (err) {
    console.error(err);
    res.render('auth/solicitar-lider', {
      title: 'Virar líder',
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

    const pedido = await accessRequestModel.findLatestByPerson(person.id, 'access');
    if (!pedido) {
      return res.render('auth/status-pedido', {
        title: 'Status do pedido',
        resultado: { status: 'nenhum', email },
        erro: null,
      });
    }

    res.render('auth/status-pedido', {
      title: 'Status do pedido',
      resultado: { status: pedido.status, email },
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
  const todosPedidos = await accessRequestModel.listPending();
  const pedidosAcesso = todosPedidos.filter((p) => p.request_type === 'access');
  const pedidosLider = todosPedidos.filter((p) => p.request_type === 'leader');
  res.render('dashboard/pedidos-acesso', {
    title: 'Pedidos de acesso',
    pedidosAcesso,
    pedidosLider,
    erro: req.query.erro === 'nao_verificado'
      ? 'Esse e-mail ainda não foi verificado. Não é possível aprovar o acesso até a pessoa confirmar o e-mail.'
      : null,
  });
}

// POST /acesso/:id/resolver -> líder aprova ou nega (pedido de acesso OU de virar líder)
async function resolver(req, res) {
  try {
    const { id } = req.params;
    const { decisao } = req.body; // 'approved' | 'denied'

    const pedido = await accessRequestModel.findById(id);
    if (!pedido) return res.redirect('/acesso/pendentes');

    // REGRA: não dá pra aprovar acesso de um e-mail que ainda não foi
    // confirmado - a verificação é sempre pelo link do e-mail, nunca manual.
    if (decisao === 'approved' && pedido.request_type === 'access' && !pedido.people.verified) {
      return res.redirect('/acesso/pendentes?erro=nao_verificado');
    }

    await accessRequestModel.resolve(id, { status: decisao, resolvedBy: req.user.id });

    if (decisao === 'approved' && pedido.request_type === 'access') {
      // Pedido de ACESSO aprovado -> gera link para criar senha
      const user = await userModel.findByPersonId(pedido.person_id);
      const token = generateToken();
      await userModel.grantAccess(user.id, {
        password_set_token: token,
        password_set_expires: expiresInHours(24),
      });
      sendAccessApprovedEmail({
        to: pedido.people.email,
        name: pedido.people.name,
        token,
      }).catch((err) => console.error('Erro ao enviar e-mail de aprovação:', err.message));
    }

    if (decisao === 'approved' && pedido.request_type === 'leader') {
      // Pedido de LÍDER aprovado -> a pessoa já tem senha, só muda o papel
      await userModel.promoteToLeader(pedido.person_id);
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
  formSolicitarLider,
  solicitarLider,
  formStatus,
  verStatus,
  listarPendentes,
  resolver,
};
