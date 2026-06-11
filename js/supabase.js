/**
 * Supabase client initialization.
 * The credentials provided are using the new Supabase Auth key format.
 * sb_publishable is the Public/Anon key.
 */

const SUPABASE_URL = 'https://qgfbpaetjwvrjnyedokl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DfbCj9SU40bAUQjcADoY0w_vznMDHyp';

// Initialize the Supabase client. window.supabase is the library loaded via
// CDN in index.html — don't declare a global named `supabase` here, it
// collides with the library's own global and kills this whole script.
window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
