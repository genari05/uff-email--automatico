const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Usamos a service_role key porque o back-end é a única camada
// que fala com o banco (o front-end nunca acessa o Supabase direto).
const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabase;
