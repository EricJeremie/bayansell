/**
 * Supabase client initialization.
 * The credentials provided are using the new Supabase Auth key format.
 * sb_publishable is the Public/Anon key.
 */

const SUPABASE_URL = 'https://DfbCj9SU40bAUQjcADoY.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DfbCj9SU40bAUQjcADoY0w_vznMDHyp';

// Initialize the Supabase client
// Note: We use window.supabase because it's loaded via CDN in index.html
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Attach to window for global access (similar to how Store is global)
window.supabaseClient = supabase;
