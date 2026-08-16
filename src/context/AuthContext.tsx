import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { Profile } from '../types/progression';

const CACHED_PROFILE_KEY = '@scout_cached_profile';
const CACHED_SESSION_KEY = '@scout_cached_session';

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
    // 1. Restaurar perfil local inmediatamente para inicio instantáneo y soporte offline
    const loadCachedAuth = async () => {
      try {
        const cachedProfileRaw = await AsyncStorage.getItem(CACHED_PROFILE_KEY);
        const cachedSessionRaw = await AsyncStorage.getItem(CACHED_SESSION_KEY);
        if (cachedProfileRaw) {
          const parsedUser = JSON.parse(cachedProfileRaw);
          setUser(parsedUser);
        }
        if (cachedSessionRaw) {
          setSession(JSON.parse(cachedSessionRaw));
        }
      } catch (e) {
        console.warn('Error leyendo caché de autenticación:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadCachedAuth();

    // 2. Obtener sesión de Supabase en segundo plano
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(session)).catch(() => {});
        fetchProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
    });

    // 3. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(session)).catch(() => {});
        fetchProfile(session.user.id);
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        AsyncStorage.removeItem(CACHED_PROFILE_KEY).catch(() => {});
        AsyncStorage.removeItem(CACHED_SESSION_KEY).catch(() => {});
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (data) {
        const mergedUser: Profile = {
          ...data,
          email: data.email || session?.user?.email || ''
        };
        setUser(mergedUser);
        await AsyncStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(mergedUser));
      } else if (error && error.code === 'PGRST116') {
        setTimeout(() => fetchProfile(userId), 1000);
      }
    } catch (e: any) {
      console.log('Modo Offline: Utilizando perfil almacenado localmente');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await AsyncStorage.removeItem(CACHED_PROFILE_KEY);
      await AsyncStorage.removeItem(CACHED_SESSION_KEY);
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Error en signOut:', e);
    } finally {
      setUser(null);
      setSession(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
