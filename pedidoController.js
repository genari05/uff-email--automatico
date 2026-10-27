const accessRequestModel = require('../models/accessRequestModel');
const gtMembershipModel = require('../models/gtMembershipModel');

// GET /pedidos -> tela única de pedidos (entrada em GT + acesso ao site + virar líder)
async function listarPedidos(req, res) {
  const ehLiderGlobal = req.user.role === 'leader';
  const [pedidosGt, todosAcesso] = await Promise.all([
    req.user.isTi
      ? gtMembershipModel.listPendingAll()
      : gtMembershipModel.listPendingForLeaderGts(req.user.id),
    ehLiderGlobal ? accessRequestModel.listPending() : Promise.resolve([]),
  ]);
  res.render('dashboard/pedidos', {
    title: 'Pedidos',
    ehLiderGlobal,
    pedidosGt,
    pedidosAcesso: todosAcesso.filter((p) => p.request_type === 'access'),
    pedidosLider: todosAcesso.filter((p) => p.request_type === 'leader'),
    erro: req.query.erro === 'nao_verificado'
      ? 'Esse e-mail ainda não foi verificado. Não é possível aprovar o acesso até a pessoa confirmar o e-mail.'
      : null,
  });
}

module.exports = { listarPedidos };
