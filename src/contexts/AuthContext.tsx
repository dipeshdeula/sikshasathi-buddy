import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { AppUser, Role } from '../lib/data';

interface AuthContextType {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; unverified?: boolean }>;
  register: (name: string, email: string, password: string, role: Role, classLevel?: string, section?: string) => Promise<boolean>;
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
    .select('full_name, is_verified')
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
    isVerified: (profile as any).is_verified ?? true,
  };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setTimeout(async () => {
            const appUser = await fetchAppUser(session.user.id, session.user.email || '');
            if (appUser) {
              // Block unverified students from staying logged in
              if (appUser.role === 'STUDENT' && !appUser.isVerified) {
                await supabase.auth.signOut();
                setUser(null);
                localStorage.removeItem('siksha_user');
              } else {
                setUser(appUser);
                localStorage.setItem('siksha_user', JSON.stringify(appUser));
              }
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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = await fetchAppUser(session.user.id, session.user.email || '');
        if (appUser) {
          if (appUser.role === 'STUDENT' && !appUser.isVerified) {
            await supabase.auth.signOut();
            setUser(null);
            localStorage.removeItem('siksha_user');
          } else {
            setUser(appUser);
            localStorage.setItem('siksha_user', JSON.stringify(appUser));
          }
        }
      } else {
        const cached = localStorage.getItem('siksha_user');
        if (cached) {
          try { setUser(JSON.parse(cached)); } catch {}
        }
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; unverified?: boolean }> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { success: false };
    const appUser = await fetchAppUser(data.user.id, data.user.email || '');
    if (!appUser) return { success: false };

    // Block unverified students
    if (appUser.role === 'STUDENT' && !appUser.isVerified) {
      await supabase.auth.signOut();
      return { success: false, unverified: true };
    }

    setUser(appUser);
    localStorage.setItem('siksha_user', JSON.stringify(appUser));
    return { success: true };
  };

  const register = async (name: string, email: string, password: string, role: Role, classLevel?: string, section?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, role, preferred_class_level: classLevel, preferred_section: section },
      },
    });
    if (error || !data.user) return false;

    await new Promise(r => setTimeout(r, 500));

    // Update preferred fields on profile (trigger may not handle these)
    if (role === 'STUDENT' && (classLevel || section)) {
      await supabase.from('profiles').update({
        preferred_class_level: classLevel,
        preferred_section: section,
      } as any).eq('id', data.user.id);
    }

    // For students, sign them out immediately (they need verification)
    if (role === 'STUDENT') {
      await supabase.auth.signOut();
      return true;
    }

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
