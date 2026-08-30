const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireLeader } = require('../middlewares/leaderMiddleware');

router.use(requireAuth); // tudo aqui exige login com acesso liberado

router.get('/', taskController.listarTarefas);
router.get('/minhas', taskController.minhasTarefas);
router.post('/:id/concluir', taskController.concluirTarefa);

router.get('/nova', taskController.formNovaTarefa);
router.post('/', taskController.criarTarefa);

// Só o líder aprova/nega tarefas atribuídas por membros
router.get('/aprovacao', requireLeader, taskController.listarAprovacao);
router.post('/:id/aprovar', requireLeader, taskController.resolverAprovacao);
router.get('/desempenho', requireLeader, taskController.desempenho);

module.exports = router;
