import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/progression';

interface AuthContextData {
  user: Profile | null;
  session: any | null;
  signOut: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // 2. Escuchar cambios (login, logout, registro)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      // Buscar el rol y los datos del usuario en la tabla profiles
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (data) {
        const mergedUser = {
          ...data,
          email: data.email || session?.user?.email || ''
        };
        setUser(mergedUser as Profile);
      } else if (error && error.code === 'PGRST116') {
        // Puede que se acabe de registrar y el trigger de la BD esté creándolo
        // Intentar de nuevo en 1 segundo
        setTimeout(() => fetchProfile(userId), 1000);
        return;
      } else if (error) {
        if (typeof window !== 'undefined' && window.alert) window.alert(`Error BD Perfil: ${error.message}`);
      }
    } catch (e: any) {
      console.error('Error fetching profile:', e);
      if (typeof window !== 'undefined' && window.alert) window.alert(`Error inesperado: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
