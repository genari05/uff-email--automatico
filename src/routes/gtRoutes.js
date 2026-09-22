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
router.get('/pendentes', gtController.listarPendentes);
router.post('/pendentes/:id/resolver', gtController.resolverPendente);

// Mural central entre GTs (qualquer pessoa com pelo menos 1 GT aprovado)
router.get('/central', centralMessageController.listarMuralCentral);
router.post('/central', centralMessageController.postarMuralCentral);

// Troca o GT ativo da sessão
router.post('/:slug/ativar', gtController.ativarGt);

// A partir daqui, exige fazer parte (aprovado) do GT da URL
router.use('/:slug', requireGtAccess);

// Painel interno do GT: mural + tarefas daquele GT
router.get('/:slug', gtTaskController.painelGt);
router.get('/:slug/tarefas/nova', gtTaskController.formNovaTarefaGt);
router.post('/:slug/tarefas', gtTaskController.criarTarefaGt);
router.post('/:slug/tarefas/:id/concluir', gtTaskController.concluirTarefaGt);

// Aprovação de tarefas cross-GT: só o líder DAQUELE GT de destino
router.get('/:slug/tarefas/aprovacao', requireGtLeader, gtTaskController.listarAprovacaoGt);
router.post('/:slug/tarefas/:id/aprovar', requireGtLeader, gtTaskController.resolverAprovacaoGt);

module.exports = router;
