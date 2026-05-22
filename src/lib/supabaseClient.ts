import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auto-handle invalid/expired refresh tokens — redirect to /login
if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
      if (event === 'SIGNED_OUT') {
        // Clear any stale storage and push to login
        window.location.href = '/login';
      }
    }
  });
}
