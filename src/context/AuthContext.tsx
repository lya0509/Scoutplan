import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabaseClient';
import { presenceService } from '../services/presenceService';
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
    // 0. Timeout de seguridad máximo (800ms): NUNCA permitir que la app se quede en pantalla de carga
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 800);

    // 1. Restaurar perfil local inmediatamente (0-10ms) para inicio instantáneo y soporte offline
    const loadCachedAuth = async () => {
      try {
        const cachedProfileRaw = await AsyncStorage.getItem(CACHED_PROFILE_KEY);
        const cachedSessionRaw = await AsyncStorage.getItem(CACHED_SESSION_KEY);
        if (cachedProfileRaw) {
          const parsedUser = JSON.parse(cachedProfileRaw);
          setUser(parsedUser);
          presenceService.init(parsedUser);
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

    // 2. Obtener sesión de Supabase en segundo plano sin bloquear la UI
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
        presenceService.destroy();
        AsyncStorage.removeItem(CACHED_PROFILE_KEY).catch(() => {});
        AsyncStorage.removeItem(CACHED_SESSION_KEY).catch(() => {});
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []);

  const fetchProfile = async (userId: string, activeSession?: any) => {
    try {
      const sess = activeSession || session;
      const meta = sess?.user?.user_metadata || {};

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const resolvedEmail = data?.email || sess?.user?.email || meta.email || '';
      const resolvedRole = data?.role || meta.role || 'scout';
      const resolvedUnit = data?.unit || meta.unit || 'tropa';
      const resolvedGroupName = data?.group_name || meta.group_name || 'Grupo Orión';
      const resolvedName = data?.name || meta.name || sess?.user?.email?.split('@')[0] || 'Scout';
      const resolvedCedula = data?.cedula || meta.cedula || '';
      const resolvedBirthDate = data?.birth_date || meta.birth_date || '';
      const resolvedPromiseDate = data?.promise_date || meta.promise_date || '';
      const resolvedJoinDate = data?.join_date || meta.join_date || '';
      const resolvedPhone = data?.phone || meta.phone || '';
      const resolvedRegion = data?.region || meta.region || '';
      const resolvedDistrict = data?.district || meta.district || '';
      const resolvedScoutAvatar = data ? (data.scout_avatar_url || data.avatar_url || null) : (meta.scout_avatar_url || null);
      const resolvedCustomAvatar = data ? (data.custom_avatar_url || null) : (meta.custom_avatar_url || null);
      const resolvedMembershipStatus = data?.membership_status || meta.membership_status || 'vigente';
      const resolvedMembershipExpiresAt = data?.membership_expires_at || meta.membership_expires_at || null;
      const resolvedMembershipRejectedReason = data?.membership_rejected_reason || meta.membership_rejected_reason || null;

      const mergedUser: Profile = {
        id: userId,
        email: resolvedEmail,
        role: resolvedRole,
        unit: resolvedUnit,
        group_name: resolvedGroupName,
        name: resolvedName,
        cedula: resolvedCedula,
        birth_date: resolvedBirthDate,
        promise_date: resolvedPromiseDate,
        join_date: resolvedJoinDate,
        phone: resolvedPhone,
        region: resolvedRegion,
        district: resolvedDistrict,
        avatar_url: resolvedScoutAvatar,
        scout_avatar_url: resolvedScoutAvatar,
        custom_avatar_url: resolvedCustomAvatar,
        membership_status: resolvedMembershipStatus,
        membership_expires_at: resolvedMembershipExpiresAt,
        membership_rejected_reason: resolvedMembershipRejectedReason,
        created_at: data?.created_at || new Date().toISOString(),
        updated_at: data?.updated_at || new Date().toISOString(),
      };

      setUser(mergedUser);
      presenceService.init(mergedUser);
      await AsyncStorage.setItem(CACHED_PROFILE_KEY, JSON.stringify(mergedUser));

      // Si no existía el registro en profiles o faltaban campos, sincronizarlo en segundo plano
      if (!data) {
        supabase.from('profiles').upsert({
          id: userId,
          role: resolvedRole,
          unit: resolvedUnit,
          group_name: resolvedGroupName,
          name: resolvedName,
          email: resolvedEmail,
          cedula: resolvedCedula,
          phone: resolvedPhone,
          region: resolvedRegion,
          district: resolvedDistrict,
          birth_date: resolvedBirthDate,
          promise_date: resolvedPromiseDate,
          join_date: resolvedJoinDate
        }).then(() => {});
      } else {
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
      }
    } catch (e: any) {
      console.warn('Aviso resolviendo perfil:', e);
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

    // Guardar en Supabase Auth metadata y en tabla profiles
    try {
      if (session?.user?.id) {
        await supabase.from('profiles').update(updates).eq('id', session.user.id);
      }
      await supabase.auth.updateUser({ data: updates });
    } catch (e) {
      console.warn('Aviso sincronizando perfil:', e);
    }
  };

  const signOut = async () => {
    setUser(null);
    setSession(null);
    setIsLoading(false);

    try {
      if (user?.id) {
        await presenceService.destroy(user.id).catch(() => {});
      } else {
        await presenceService.destroy().catch(() => {});
      }

      await AsyncStorage.removeItem(CACHED_PROFILE_KEY).catch(() => {});
      await AsyncStorage.removeItem(CACHED_SESSION_KEY).catch(() => {});

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && (k.startsWith('sb-') || k.includes('supabase') || k.includes('auth') || k.includes('scout'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach(k => window.localStorage.removeItem(k));
        } catch (e) {}
      }

      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
    } catch (e) {
      console.warn('Error en signOut:', e);
    } finally {
      setUser(null);
      setSession(null);
      setIsLoading(false);

      if (typeof window !== 'undefined' && window.location) {
        if (window.location.pathname !== '/' && window.location.pathname !== '/ingresar') {
          window.location.href = '/';
        }
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, signOut, isLoading, refreshProfile, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
