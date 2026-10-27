/**
 * O servidor (Render) roda em UTC, mas a equipe está no horário de
 * Brasília. Tudo que depende de "hoje" ou de uma hora marcada passa
 * por aqui, pra não ficar 3 horas errado.
 */
const FUSO = 'America/Sao_Paulo';
const OFFSET = '-03:00'; // Brasil não tem horário de verão desde 2019

/** Data de hoje em Brasília, no formato AAAA-MM-DD. */
function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** Momento exato de "AAAA-MM-DD" + "HH:MM" no horário de Brasília. */
function momentoSP(data, hora = '00:00') {
  return new Date(`${data}T${hora}:00${OFFSET}`);
}

module.exports = { FUSO, hojeSP, momentoSP };
