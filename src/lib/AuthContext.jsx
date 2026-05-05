import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { applyLanguagePreferenceFromProfile } from '@/lib/languagePreference';

const AuthContext = createContext({});

function mergeSessionUser(session) {
  const u = session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    full_name: u.user_metadata?.full_name || u.email?.split('@')[0] || 'User',
    role: 'user',
    email_confirmed_at: u.email_confirmed_at || null,
    ...u.user_metadata,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const refreshLock = useRef(null);

  const loadUser = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      applyLanguagePreferenceFromProfile(null);
      return;
    }
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      const base = mergeSessionUser(session);
      const userData = profile
        ? {
            ...base,
            ...profile,
            email: session.user.email ?? profile.email,
            role: profile.role || base.role || 'user',
          }
        : base;

      setUser(userData);
      setIsAuthenticated(true);
      applyLanguagePreferenceFromProfile(profile);
    } catch (err) {
      console.error('Failed to load profile:', err);
      setUser(mergeSessionUser(session));
      setIsAuthenticated(true);
      applyLanguagePreferenceFromProfile(null);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      loadUser(session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(session);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUser]);

  const checkAppState = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    await loadUser(session);
  }, [loadUser]);

  const refreshUser = useCallback(async () => {
    if (refreshLock.current) return refreshLock.current;
    refreshLock.current = (async () => {
      try {
        setIsLoadingAuth(true);
        const { data: { session } } = await supabase.auth.getSession();
        await loadUser(session);
      } finally {
        refreshLock.current = null;
      }
    })();
    return refreshLock.current;
  }, [loadUser]);

  const logout = useCallback(async (shouldRedirect = true) => {
    try {
      setUser(null);
      setIsAuthenticated(false);
      await supabase.auth.signOut();
    } finally {
      if (shouldRedirect) window.location.replace(`${window.location.origin}/`);
    }
  }, []);

  const navigateToLogin = useCallback(() => {
    window.location.replace(`${window.location.origin}/?signin=1`);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: null,
        isSessionExpired: false,
        logout,
        navigateToLogin,
        loadUser,
        checkAppState,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx || Object.keys(ctx).length === 0) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};

export default AuthContext;
