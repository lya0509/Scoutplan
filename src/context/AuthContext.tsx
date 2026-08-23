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
  refreshProfile: () => Promise<void>;
  updateUserProfile: (updates: Partial<Profile>) => Promise<void>;
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
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user) {
        AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(currentSession)).catch(() => {});
        fetchProfile(currentSession.user.id, currentSession);
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
      setIsLoading(false);
    });

    // 3. Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      if (currentSession?.user) {
        AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(currentSession)).catch(() => {});
        fetchProfile(currentSession.user.id, currentSession);
      } else if (_event === 'SIGNED_OUT') {
        setUser(null);
        AsyncStorage.removeItem(CACHED_PROFILE_KEY).catch(() => {});
        AsyncStorage.removeItem(CACHED_SESSION_KEY).catch(() => {});
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string, activeSession?: any) => {
    try {
      const sess = activeSession || session;
      const meta = sess?.user?.user_metadata || {};

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (data) {
        const resolvedEmail = data.email || sess?.user?.email || meta.email || '';
        const resolvedCedula = data.cedula || meta.cedula || null;
        const resolvedBirthDate = data.birth_date || meta.birth_date || null;
        const resolvedPromiseDate = data.promise_date || meta.promise_date || null;
        const resolvedJoinDate = data.join_date || meta.join_date || null;
        const resolvedPhone = data.phone || meta.phone || null;
        const resolvedRegion = data.region || meta.region || null;
        const resolvedDistrict = data.district || meta.district || null;
        const resolvedGroupName = data.group_name || meta.group_name || null;
        const resolvedUnit = data.unit || meta.unit || null;
        const resolvedName = data.name || meta.name || 'Scout';
        const resolvedAvatarUrl = data.avatar_url || meta.avatar_url || null;
        const resolvedCustomAvatarUrl = data.custom_avatar_url || meta.custom_avatar_url || null;
        const resolvedMembershipStatus = data.membership_status || meta.membership_status || 'none';
        const resolvedMembershipExpiresAt = data.membership_expires_at || meta.membership_expires_at || null;
        const resolvedMembershipRejectedReason = data.membership_rejected_reason || meta.membership_rejected_reason || null;

        const mergedUser: Profile = {
          ...data,
          name: resolvedName,
          email: resolvedEmail,
          cedula: resolvedCedula,
          birth_date: resolvedBirthDate,
          promise_date: resolvedPromiseDate,
          join_date: resolvedJoinDate,
          phone: resolvedPhone,
          region: resolvedRegion,
          district: resolvedDistrict,
          group_name: resolvedGroupName,
          unit: resolvedUnit,
          avatar_url: resolvedAvatarUrl,
          custom_avatar_url: resolvedCustomAvatarUrl,
          membership_status: resolvedMembershipStatus,
          membership_expires_at: resolvedMembershipExpiresAt,
          membership_rejected_reason: resolvedMembershipRejectedReason,
        };

        setUser(mergedUser);
        await AsyncStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(mergedUser));

        // Auto-reparación en Supabase si faltaban datos en la tabla profiles
        const needsDbSync = 
          (!data.cedula && resolvedCedula) ||
          (!data.birth_date && resolvedBirthDate) ||
          (!data.promise_date && resolvedPromiseDate) ||
          (!data.join_date && resolvedJoinDate) ||
          (!data.phone && resolvedPhone) ||
          (!data.region && resolvedRegion) ||
          (!data.district && resolvedDistrict) ||
          (!data.email && resolvedEmail);

        if (needsDbSync) {
          supabase.from('profiles').update({
            cedula: resolvedCedula,
            birth_date: resolvedBirthDate,
            promise_date: resolvedPromiseDate,
            join_date: resolvedJoinDate,
            phone: resolvedPhone,
            region: resolvedRegion,
            district: resolvedDistrict,
            email: resolvedEmail,
            name: resolvedName,
          }).eq('id', userId).then(() => {});
        }
      } else if (error && error.code === 'PGRST116') {
        setTimeout(() => fetchProfile(userId, activeSession), 1000);
      }
    } catch (e: any) {
      console.log('Modo Offline: Utilizando perfil almacenado localmente');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id, session);
    }
  };

  const updateUserProfile = async (updates: Partial<Profile>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      AsyncStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });

    // Guardar en Supabase Auth metadata para sincronización permanente
    try {
      await supabase.auth.updateUser({ data: updates });
    } catch (e) {
      console.warn('Aviso sincronizando user_metadata:', e);
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
    <AuthContext.Provider value={{ user, session, signOut, isLoading, refreshProfile, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
