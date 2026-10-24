const jwt = require('jsonwebtoken');
const env = require('../config/env');
const userModel = require('../models/userModel');
const gtMembershipModel = require('../models/gtMembershipModel');
const gtModel = require('../models/gtModel');
const ocultoService = require('../services/ocultoService');

/**
 * Conta de TI: o papel real no banco é 'ti', mas pro resto do sistema
 * ela passa em TODAS as checagens de líder (role === 'leader'). O papel
 * real fica em user.papelReal / user.isTi.
 */
function aplicarPapelTi(user) {
  user.papelReal = user.role;
  user.isTi = user.role === 'ti';
  if (user.isTi) user.role = 'leader';
  return user;
}

/**
 * Garante que existe um usuário logado E com has_access = true.
 * Usado em todas as rotas do "painel" (listar pessoas, enviar e-mail, etc).
 */
async function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.redirect('/auth/login');

  // 1) Verifica o token em si. Se estiver expirado ou inválido de
  // verdade, aí sim é motivo real pra deslogar.
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch (err) {
    res.clearCookie('token');
    return res.redirect('/auth/login');
  }

  // 2) Busca o usuário no banco. Se der erro AQUI, não é prova de
  // que a sessão é inválida - pode ser só uma instabilidade momentânea
  // de conexão com o Supabase. Nesse caso NÃO desloga a pessoa, só
  // avisa que deu um erro passageiro (o cookie continua valendo).
  try {
    // Usuário e GTs em paralelo (antes eram 2 consultas em fila, o que
    // somava latência em TODA troca de aba).
    const [user, gtsDaPessoa] = await Promise.all([
      userModel.findById(payload.userId),
      gtMembershipModel.listApprovedByUser(payload.userId).catch((errGt) => {
        console.error('Erro ao carregar GTs da pessoa (ignorado):', errGt.message);
        return [];
      }),
    ]);

    if (!user || !user.has_access) {
      res.clearCookie('token');
      return res.redirect('/auth/login');
    }

    aplicarPapelTi(user);
    req.user = user; // disponível nos controllers/views
    res.locals.currentUser = user;
    if (user.oculto) ocultoService.marcarRequisicaoOculta(); // ações dela não vão pro feed

    // GTs aprovados da pessoa + qual está ativo agora. O GT ativo
    // vale tanto pro trocador da sidebar quanto pro isolamento de
    // dados (pessoas, e-mail, etc só mostram gente do GT ativo).
    req.meusGts = gtsDaPessoa;
<<<<<<< HEAD
    // TI enxerga todos os GTs como líder, sem precisar ser membro de nenhum
    if (user.isTi) {
      const todos = await gtModel.listAll();
      req.meusGts = todos.map((gt) => ({
        id: `ti-${gt.id}`, gt_id: gt.id, user_id: user.id,
        role: 'leader', status: 'approved', gts: gt,
      }));
    }
=======
>>>>>>> 95248c7a7374d6f120abd0db70de48b5cd5f2e38
    res.locals.meusGtsSidebar = req.meusGts;

    const slugCookie = req.cookies?.gt_ativo || null;
    let membershipAtiva = slugCookie ? req.meusGts.find((m) => m.gts.slug === slugCookie) : null;

    // Se não tem GT ativo escolhido mas a pessoa só participa de UM
    // GT, não faz sentido pedir pra escolher - já ativa ele direto.
    if (!membershipAtiva && req.meusGts.length === 1) {
      membershipAtiva = req.meusGts[0];
      res.cookie('gt_ativo', membershipAtiva.gts.slug, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60 * 24 * 30,
      });
    }

    req.gtAtivo = membershipAtiva ? membershipAtiva.gts : null;
    req.gtAtivoMembership = membershipAtiva || null;
    res.locals.gtAtivo = req.gtAtivo;
    res.locals.gtAtivoMembership = req.gtAtivoMembership;
    res.locals.gtAtivoSlug = req.gtAtivo?.slug || null;

    next();
  } catch (err) {
    console.error('Erro temporário ao verificar sessão (mantida):', err.message);
    res.status(503).send(
      '<div style="font-family:sans-serif;max-width:420px;margin:80px auto;text-align:center;">' +
      '<h2>Erro temporário de conexão</h2>' +
      '<p>Não foi possível confirmar sua sessão agora. Isso não te deslogou - tente de novo.</p>' +
      '<a href="javascript:location.reload()">Tentar novamente</a>' +
      '</div>'
    );
  }
}

/**
 * Igual ao requireAuth, mas NUNCA bloqueia o acesso - só detecta se
 * tem alguém logado (pra montar req.user/currentUser) e segue em
 * frente de qualquer jeito. Usado em rotas públicas que precisam se
 * comportar diferente pra quem já está logado (ex: cadastrar pessoa).
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    const payload = jwt.verify(token, env.jwtSecret);
    const user = await userModel.findById(payload.userId);

    if (user && user.has_access) {
      aplicarPapelTi(user);
      req.user = user;
      res.locals.currentUser = user;
    }
  } catch (err) {
    // token inválido/expirado - trata como visitante não logado, sem erro
  }
  next();
}

<<<<<<< HEAD
module.exports = { requireAuth, optionalAuth, aplicarPapelTi };
=======
module.exports = { requireAuth, optionalAuth };
>>>>>>> 95248c7a7374d6f120abd0db70de48b5cd5f2e38
