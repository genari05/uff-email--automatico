require('./utils/asyncErrors'); // precisa vir ANTES das rotas
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

const routes = require('./routes');
const { verificarLembretes } = require('./services/reminderService');
const { encontrarAla } = require('./data/alas');

const app = express();

app.set('trust proxy', 1); // Render fica atrás de proxy: IP real do visitante
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
try { app.use(require('compression')()); } catch (e) { /* compression opcional */ }
app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: '1h' }));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.ala = encontrarAla(req.path);
  next();
});

app.use('/', routes);

// 404
app.use((req, res) => {
  res.status(404).render('errors/nao-encontrado', { title: 'Página não encontrada' });
});

// Erro inesperado em qualquer rota: página amigável em vez de travar
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Erro não tratado em', req.method, req.originalUrl, '-', err && err.message);
  if (res.headersSent) return;
  res.status(500).render('errors/erro-interno', { title: 'Erro' }, (renderErr, html) => {
    if (renderErr) return res.status(500).send('Erro interno. Tente novamente em instantes.');
    res.send(html);
  });
});

// "Relógio interno": confere a cada 10 minutos se algum lembrete
// (com data e, opcionalmente, horário) já deve ser enviado.
// Só funciona se o servidor estiver acordado nesse momento -
// por isso existe também a rota GET /cron/lembretes (veja o README),
// que pode ser acionada por um serviço externo como garantia extra.
cron.schedule('*/10 * * * *', () => {
  verificarLembretes().catch((err) => console.error('Erro no cron de lembretes:', err));
});

module.exports = app;
