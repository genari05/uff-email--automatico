const express = require('express');
const router = express.Router();
const gtController = require('../controllers/gtController');
const gtTaskController = require('../controllers/gtTaskController');
const centralMessageController = require('../controllers/centralMessageController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireGtAccess, requireGtLeader } = require('../middlewares/gtMiddleware');

router.use(requireAuth); // tudo em /gts exige login com acesso liberado

// Lista geral de GTs + pedir entrada
router.get('/', gtController.listarGts);
router.post('/:slug/entrar', gtController.pedirEntrada);

// Pedidos de entrada pendentes (líder de qualquer GT que lidere)
// -> precisa vir ANTES de /:slug pra não ser confundido com um slug
router.get('/pendentes', (req, res) => res.redirect('/pedidos'));
router.post('/pendentes/:id/resolver', gtController.resolverPendente);

// Mural central entre GTs (qualquer pessoa com pelo menos 1 GT aprovado)
router.get('/central', centralMessageController.listarMuralCentral);
router.post('/central', centralMessageController.postarMuralCentral);
router.post('/central/:id/editar', centralMessageController.editarMensagemCentral);
router.post('/central/:id/excluir', centralMessageController.excluirMensagemCentral);

// Troca o GT ativo da sessão
router.post('/:slug/ativar', gtController.ativarGt);

// A partir daqui, exige fazer parte (aprovado) do GT da URL
router.use('/:slug', requireGtAccess);

// Painel interno do GT: mural + tarefas daquele GT
router.get('/:slug', gtTaskController.painelGt);
router.get('/:slug/tarefas/nova', gtTaskController.formNovaTarefaGt);
router.post('/:slug/tarefas', gtTaskController.criarTarefaGt);
router.post('/:slug/tarefas/:id/concluir', gtTaskController.concluirTarefaGt);

// Editar dados do GT (nome, descrição, cor): só o líder
router.get('/:slug/editar', requireGtLeader, gtController.formEditarGt);
router.post('/:slug/editar', requireGtLeader, gtController.salvarGt);

// Dar/tirar liderança dentro do GT: só o líder DAQUELE GT
router.post('/:slug/equipe/:membershipId/papel', requireGtLeader, gtTaskController.alterarPapelNoGt);

// Aprovação de tarefas cross-GT: só o líder DAQUELE GT de destino
router.get('/:slug/tarefas/aprovacao', requireGtLeader, gtTaskController.listarAprovacaoGt);
router.post('/:slug/tarefas/:id/aprovar', requireGtLeader, gtTaskController.resolverAprovacaoGt);

module.exports = router;
