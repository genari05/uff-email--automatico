require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.warn(`[AVISO] Variável de ambiente ${name} não definida. Configure o arquivo .env`);
  }
  return value;
}

module.exports = {
  port: process.env.PORT || 3000,
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: required('JWT_SECRET'),
  cronSecret: required('CRON_SECRET'),

  supabase: {
    url: required('SUPABASE_URL'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },

  resend: {
    apiKey: required('RESEND_API_KEY'),
    from: process.env.EMAIL_FROM || 'Semana da Psicologia <onboarding@resend.dev>',
  },
};
