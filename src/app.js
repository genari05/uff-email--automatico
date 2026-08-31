const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

const routes = require('./routes');
const { verificarLembretes } = require('./services/reminderService');
const { encontrarAla } = require('./data/alas');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

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

// "Relógio interno": confere a cada 10 minutos se algum lembrete
// (com data e, opcionalmente, horário) já deve ser enviado.
// Só funciona se o servidor estiver acordado nesse momento -
// por isso existe também a rota GET /cron/lembretes (veja o README),
// que pode ser acionada por um serviço externo como garantia extra.
cron.schedule('*/10 * * * *', () => {
  verificarLembretes().catch((err) => console.error('Erro no cron de lembretes:', err));
});

module.exports = app;
