const auditModel = require('../models/auditModel');

const TIPOS = ['tarefa', 'mensagem', 'pessoa', 'modelo_email', 'gt'];

// GET /historico -> só líder (e TI): quem editou/excluiu o quê, quando
async function listarHistorico(req, res) {
  const acao = ['edit', 'delete'].includes(req.query.acao) ? req.query.acao : null;
  const tipo = TIPOS.includes(req.query.tipo) ? req.query.tipo : null;
  let registros = [];
  let erro = null;
  try {
    registros = await auditModel.list({ incluirOcultos: !!req.user.isTi, acao, tipo });
  } catch (err) {
    console.error(err);
    erro = 'Não foi possível carregar o histórico. Confira se a migração migration_auditoria.sql foi rodada no Supabase.';
  }
  res.render('dashboard/historico', { title: 'Histórico', registros, acao, tipo, erro });
}

module.exports = { listarHistorico };
