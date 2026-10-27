const personModel = require('../models/personModel');
const userModel = require('../models/userModel');
const gtModel = require('../models/gtModel');
const gtMembershipModel = require('../models/gtMembershipModel');

// GET /ti/gts -> matriz: pessoas x GTs (marcar = entra, desmarcar = sai)
async function telaGts(req, res) {
  const [pessoas, contas, gts, vinculos] = await Promise.all([
    personModel.listAll(),
    userModel.listAllBasic(),
    gtModel.listAll(),
    gtMembershipModel.listAllApproved(),
  ]);

  const contaDaPessoa = new Map(contas.map((c) => [c.person_id, c.id]));
  const vinc = {}; // personId -> { gtId: 'leader' | 'member' }
  vinculos.forEach((v) => {
    const pid = v.users?.person_id;
    if (!pid) return;
    (vinc[pid] = vinc[pid] || {})[v.gt_id] = v.role;
  });

  res.render('ti/gts', {
    title: 'Adicionar pessoas aos GTs',
    pessoas: pessoas.filter((p) => contaDaPessoa.has(p.id)),
    gts,
    vinc,
    aviso: req.query.ok || null,
  });
}

// POST /ti/gts -> aplica só as diferenças (adiciona marcados, remove desmarcados)
async function salvarGts(req, res) {
  try {
    const paraLista = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
    const naTela = new Set(paraLista(req.body.pessoas));      // pessoas que estavam na tela
    const marcados = new Set(paraLista(req.body.vinculo));    // "personId|gtId"

    const [contas, gts, vinculos] = await Promise.all([
      userModel.listAllBasic(),
      gtModel.listAll(),
      gtMembershipModel.listAllApproved(),
    ]);
    const contaDaPessoa = new Map(contas.map((c) => [c.person_id, c.id]));
    const gtsValidos = new Set(gts.map((g) => g.id));

    const atuais = new Map(); // "personId|gtId" -> vínculo aprovado
    vinculos.forEach((v) => {
      if (v.users?.person_id) atuais.set(`${v.users.person_id}|${v.gt_id}`, v);
    });

    let adicionados = 0;
    let removidos = 0;

    // Adiciona o que foi marcado e ainda não existe
    for (const chave of marcados) {
      const [personId, gtId] = chave.split('|');
      if (!naTela.has(personId) || !gtsValidos.has(gtId) || atuais.has(chave)) continue;
      const userId = contaDaPessoa.get(personId);
      if (!userId) continue;
      await gtMembershipModel.upsertApprovedMember(gtId, userId, req.user.id);
      adicionados += 1;
    }

    // Remove o que estava aprovado como membro e foi desmarcado (líderes não saem por aqui)
    for (const [chave, v] of atuais) {
      const [personId] = chave.split('|');
      if (!naTela.has(personId) || marcados.has(chave) || v.role === 'leader') continue;
      await gtMembershipModel.removeById(v.id);
      removidos += 1;
    }

    const msg = adicionados || removidos
      ? `Salvo: ${adicionados} adicionado(s), ${removidos} removido(s).`
      : 'Nada mudou.';
    res.redirect('/ti/gts?ok=' + encodeURIComponent(msg));
  } catch (err) {
    console.error(err);
    res.redirect('/ti/gts?ok=' + encodeURIComponent('Erro ao salvar. Tente de novo.'));
  }
}

module.exports = { telaGts, salvarGts };
