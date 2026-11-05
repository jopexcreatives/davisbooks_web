// Davis Books - Supabase Client & Connection Helper
const DAVIS_SUPABASE_CONFIG = {
  url: window.DAVIS_SUPABASE_URL || localStorage.getItem('davis_supabase_url') || 'https://ziojewsrdlqotnzlmhgo.supabase.co',
  anonKey: window.DAVIS_SUPABASE_ANON_KEY || localStorage.getItem('davis_supabase_key') || ''
};

let _supabaseInstance = null;

function getSupabase() {
  if (!_supabaseInstance && window.supabase && DAVIS_SUPABASE_CONFIG.url && DAVIS_SUPABASE_CONFIG.anonKey) {
    _supabaseInstance = window.supabase.createClient(DAVIS_SUPABASE_CONFIG.url, DAVIS_SUPABASE_CONFIG.anonKey);
  }
  return _supabaseInstance;
}

function updateSupabaseCredentials(url, key) {
  DAVIS_SUPABASE_CONFIG.url = url;
  DAVIS_SUPABASE_CONFIG.anonKey = key;
  localStorage.setItem('davis_supabase_url', url);
  localStorage.setItem('davis_supabase_key', key);
  if (window.supabase && url && key) {
    _supabaseInstance = window.supabase.createClient(url, key);
  }
}

async function signInWithGoogle() {
  const sb = getSupabase();
  if (!sb) {
    return { data: null, error: new Error('Supabase is not configured. Add the anon/public API key in the admin settings.') };
  }

  const { data, error } = await sb.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/account.html',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });

  return { data, error };
}

async function signOut() {
  const sb = getSupabase();
  if (!sb) {
    return { error: new Error('Supabase is not configured. Add the anon/public API key in the admin settings.') };
  }

  const { error } = await sb.auth.signOut();
  return { error };
}

function onAuthChange(callback) {
  const sb = getSupabase();
  if (!sb) return null;

  return sb.auth.onAuthStateChange((event, session) => {
    callback(session?.user || null, session, event);
  });
}
