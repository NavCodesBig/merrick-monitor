import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    const doFetch = () =>
      supabase
        .from('users')
        .select('id, full_name, role, cabin_id, cabins(id, name)')
        .eq('id', userId)
        .single();

    try {
      let { data, error } = await doFetch();
      if (error || !data) {
        // Retry once after a short delay
        await new Promise(r => setTimeout(r, 600));
        ({ data, error } = await doFetch());
      }
      if (data && !error) {
        setProfile(data);
      } else {
        console.warn('Profile fetch error after retry:', error?.message);
      }
    } catch (err) {
      console.error('fetchProfile threw:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let settleTimer = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!mounted) return;
        // Debounce rapid consecutive events (e.g. INITIAL_SESSION → TOKEN_REFRESHED)
        // so we only act on the settled final state
        clearTimeout(settleTimer);
        settleTimer = setTimeout(async () => {
          if (!mounted) return;
          setSession(session);
          if (session?.user) {
            await fetchProfile(session.user.id);
          } else {
            setProfile(null);
            setLoading(false);
          }
        }, 200);
      }
    );

    // Hard safety net: never stay stuck on the loading screen
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(settleTimer);
      clearTimeout(timeout);
    };
  }, [fetchProfile]);

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    await supabase.auth.signOut().catch(() => {});
  }

  const role = profile?.role ?? null;
  const isAdmin     = role === 'admin';
  const isDirector  = role === 'director';
  const isNurse     = role === 'nurse' || role === 'admin' || role === 'director';
  const isCounselor = role === 'counselor';

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      loading,
      role,
      isAdmin,
      isDirector,
      isNurse,
      isCounselor,
      signIn,
      signOut,
      refreshProfile: () => session?.user && fetchProfile(session.user.id),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
