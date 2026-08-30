const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const routes = require('./routes');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use('/', routes);

// 404
app.use((req, res) => {
  res.status(404).render('errors/nao-encontrado', { title: 'Página não encontrada' });
});

module.exports = app;
