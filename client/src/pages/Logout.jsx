import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Logout() {
  useEffect(() => {
    // Clear storage synchronously so session is gone before the redirect
    localStorage.clear();
    sessionStorage.clear();

    // Best-effort server-side invalidation (fire and forget)
    supabase.auth.signOut().catch(() => {});

    // Hard redirect — always runs immediately after clearing storage
    window.location.replace('/login');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-700 to-blue-900 flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="text-5xl mb-6">🏕️</div>
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-5" />
        <h1 className="text-2xl font-bold text-white mb-2">Signing out…</h1>
        <p className="text-blue-200 text-sm">You will be redirected to the login page.</p>
      </div>
    </div>
  );
}
