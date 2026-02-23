import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { AppUser, Role } from '../lib/data';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string, role: Role) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

async function fetchAppUser(userId: string, email: string): Promise<AppUser | null> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single();

  if (!profile || !roleData) return null;

  return {
    id: userId,
    name: profile.full_name || '',
    email,
    role: roleData.role as Role,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Use setTimeout to avoid Supabase deadlock on initial load
          setTimeout(async () => {
            const appUser = await fetchAppUser(session.user.id, session.user.email || '');
            if (appUser) {
              setUser(appUser);
              localStorage.setItem('siksha_user', JSON.stringify(appUser));
            }
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          localStorage.removeItem('siksha_user');
          setIsLoading(false);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await fetchAppUser(session.user.id, session.user.email || '');
        if (appUser) {
          setUser(appUser);
          localStorage.setItem('siksha_user', JSON.stringify(appUser));
        }
      } else {
        // Try cached user for offline support
        const cached = localStorage.getItem('siksha_user');
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch {}
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;
    const appUser = await fetchAppUser(data.user.id, data.user.email || '');
    if (appUser) {
      setUser(appUser);
      localStorage.setItem('siksha_user', JSON.stringify(appUser));
      return true;
    }
    return false;
  };

  const register = async (name: string, email: string, password: string, role: Role) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role },
      },
    });
    if (error || !data.user) return false;

    // The trigger handles profile + role creation via raw_user_meta_data
    // Wait a moment for trigger to complete, then fetch
    await new Promise(r => setTimeout(r, 500));
    const appUser = await fetchAppUser(data.user.id, email);
    if (appUser) {
      setUser(appUser);
      localStorage.setItem('siksha_user', JSON.stringify(appUser));
      return true;
    }
    return false;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    localStorage.removeItem('siksha_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};
