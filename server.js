const app = require('./src/app');
const env = require('./src/config/env');

// Rede de segurança: um erro solto não derruba o servidor inteiro
process.on('unhandledRejection', (motivo) => console.error('Promessa rejeitada sem tratamento:', motivo));
process.on('uncaughtException', (err) => console.error('Exceção não capturada:', err));

app.listen(env.port, () => {
  console.log(`Servidor rodando em ${env.appUrl} (porta ${env.port})`);
});
