const { createClient } = require('@supabase/supabase-js');

// A service_role key tem acesso total ao banco e NUNCA deve ir para o
// frontend. Ela só existe aqui, dentro das Netlify Functions, lida a
// partir das variáveis de ambiente configuradas no painel do Netlify.
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_KEY não configuradas nas variáveis de ambiente.');
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

module.exports = { getSupabase };
