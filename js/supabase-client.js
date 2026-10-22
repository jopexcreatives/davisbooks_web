// Davis Books - Supabase Client & Connection Helper
const DAVIS_SUPABASE_CONFIG = {
  url: window.DAVIS_SUPABASE_URL || localStorage.getItem('davis_supabase_url') || '',
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
