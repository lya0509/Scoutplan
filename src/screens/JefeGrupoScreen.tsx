import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import HelpFloatingFAB from '../components/HelpFloatingFAB';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { Users, Award, Calendar, Moon, Sun, FileText, ChevronRight, Camera, BookOpen } from 'lucide-react-native';

export default function JefeGrupoScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme, toggleDarkMode } = useTheme();

  const [stats, setStats] = useState({
    manada: 0,
    tropa: 0,
    comunidad: 0,
    clan: 0,
    insigniasAprobadas: 0
  });

  const [groupScouts, setGroupScouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadStatsAndMembers();
    }, [user?.group_name])
  );

  const loadStatsAndMembers = async () => {
    setLoading(true);
    if (!user?.group_name) {
      setLoading(false);
      return;
    }

    // Obtener todos los scouts del grupo
    const { data: scouts } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'scout')
      .eq('group_name', user.group_name);

    let m = 0, t = 0, c = 0, cl = 0;
    if (scouts) {
      setGroupScouts(scouts);
      scouts.forEach(s => {
        if (s.unit === 'manada') m++;
        if (s.unit === 'tropa') t++;
        if (s.unit === 'comunidad') c++;
        if (s.unit === 'clan') cl++;
      });
    }

    const { count: approvedCount } = await supabase
      .from('stage_progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Aprobada');

    setStats({
      manada: m,
      tropa: t,
      comunidad: c,
      clan: cl,
      insigniasAprobadas: approvedCount || 0
    });
    setLoading(false);
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      
      {/* CABECERA JEFE DE GRUPO */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : colors.primary }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Panel Jefe de Grupo</Text>
          <Text style={styles.subtitle}>Grupo: {user?.group_name || 'Sin Asignar'}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity style={styles.iconBtn} onPress={toggleDarkMode}>
            {isDarkMode ? <Sun color="#f59e0b" size={20} /> : <Moon color="white" size={20} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('TemporalDrive')}>
            <Camera color="white" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Documentos')}>
            <BookOpen color="white" size={20} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CalendarStandalone')}>
            <Calendar color="white" size={20} />
          </TouchableOpacity>
        </View>
      </View>
      
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <View style={{ padding: 16 }}>

          {/* TARJETAS DE ESTADÍSTICAS */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Users color={colors.primary} size={28} />
              <Text style={[styles.statNumber, { color: theme.text }]}>
                {stats.manada + stats.tropa + stats.comunidad + stats.clan}
              </Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Scouts Totales</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Award color="#f59e0b" size={28} />
              <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.insigniasAprobadas}</Text>
              <Text style={[styles.statLabel, { color: theme.subText }]}>Insignias Entregadas</Text>
            </View>
          </View>

          {/* LISTA DE MIEMBROS DEL GRUPO CON FICHA MÉDICA Y CURRÍCULUM */}
          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 10 }]}>
            Scouts del Grupo ({groupScouts.length})
          </Text>

          {groupScouts.length === 0 ? (
            <View style={[styles.unitCard, { backgroundColor: theme.cardBg, borderColor: theme.border, padding: 20 }]}>
              <Text style={{ color: theme.subText, fontStyle: 'italic', textAlign: 'center' }}>
                No hay scouts registrados en tu grupo aún.
              </Text>
            </View>
          ) : (
            groupScouts.map(scout => (
              <View key={scout.id} style={[styles.scoutCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={styles.avatarBox}>
                    <Text style={styles.avatarText}>{scout.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.scoutName, { color: theme.text }]}>{scout.name}</Text>
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>
                      Unidad: {(scout.unit || 'clan').toUpperCase()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.profileBtn}
                    onPress={() => navigation.navigate('ScoutFullProfile', { scoutId: scout.id })}
                  >
                    <Text style={styles.profileBtnText}>Ver Perfil</Text>
                    <ChevronRight size={14} color="white" />
                  </TouchableOpacity>
                </View>

                {/* ACCESOS DIRECTOS A FICHA MÉDICA Y CURRÍCULUM */}
                <View style={styles.docActionsRow}>
                  <TouchableOpacity
                    style={[styles.miniDocBtn, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: colors.primary }]}
                    onPress={() => navigation.navigate('FichaMedica', { targetUserId: scout.id })}
                  >
                    <Text style={{ fontSize: 13, marginRight: 4 }}>📋</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>Ficha Médica</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.miniDocBtn, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: colors.primary }]}
                    onPress={() => navigation.navigate('CurriculumScout', { targetUserId: scout.id })}
                  >
                    <Text style={{ fontSize: 13, marginRight: 4 }}>📜</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>Currículum Scout</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

        </View>
      )}
      </ScrollView>

      {/* BOTÓN FLOTANTE DE AYUDA Y REPORTES */}
      <HelpFloatingFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statNumber: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  unitCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  
  scoutCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  avatarBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  scoutName: { fontSize: 14, fontWeight: 'bold' },
  profileBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  profileBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold', marginRight: 2 },
  docActionsRow: { flexDirection: 'row', gap: 8, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(150, 150, 150, 0.15)' },
  miniDocBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 8, borderWidth: 1 }
});
