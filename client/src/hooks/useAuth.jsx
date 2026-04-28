import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role, cabin_id, cabins(id, name)')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data);
      } else {
        console.warn('Profile fetch error:', error?.message);
      }
    } catch (err) {
      console.error('fetchProfile threw:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // onAuthStateChange fires INITIAL_SESSION immediately — no need for getSession separately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // Hard safety net: never stay stuck on the loading screen
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 8000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
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
