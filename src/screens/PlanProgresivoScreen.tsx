import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { ChevronRight } from 'lucide-react-native';
import { StageBadgeIcon } from '../components/StageBadgeIcon';
import NotificationHeaderBell from '../components/NotificationHeaderBell';

const STAGE_COLORS: Record<string, string> = {
  'precursor':      '#ffb300',
  'expedicionario': '#1e88e5',
  'descubridor':    '#43a047',
  'fundador':       '#e53935',
  'rover_ciudadano':'#8e24aa'
};

export default function PlanProgresivoScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [stages, setStages]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user) loadProgress();
    }, [user])
  );

  const loadProgress = async () => {
    setLoading(true);
    const progressData = await dataService.getProgressForAllStages(user!.id);

    const { data: stageRows } = await supabase
      .from('stage_progress')
      .select('stage_id, status')
      .eq('scout_id', user!.id);

    const statusMap: Record<string, string> = {};
    stageRows?.forEach(r => { statusMap[r.stage_id] = r.status; });

    let prevApproved = true;
    const enriched = progressData.map(stage => {
      const dbStatus = statusMap[stage.id];
      let displayStatus: string;

      if (!prevApproved) {
        displayStatus = 'Bloqueada';
      } else if (dbStatus === 'Aprobada') {
        displayStatus = 'Aprobada';
      } else if (dbStatus === 'En Revision') {
        displayStatus = 'En Revision';
      } else {
        displayStatus = 'En Progreso';
      }

      prevApproved = dbStatus === 'Aprobada';
      return { ...stage, displayStatus };
    });

    setStages(enriched);
    setLoading(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isClan = (user?.unit || 'clan').toLowerCase() === 'clan';

  if (!isClan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99, 102, 241, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 36 }}>🚀</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>
          Plan Progresivo Próximamente
        </Text>
        <Text style={{ fontSize: 14, color: theme.subText, textAlign: 'center', marginTop: 10, lineHeight: 22, maxWidth: 360 }}>
          El Plan Progresivo para la unidad de <Text style={{ fontWeight: 'bold', color: colors.primary }}>{(user?.unit || 'tu unidad').toUpperCase()}</Text> se encuentra actualmente en fase de desarrollo e integración digital.
        </Text>
        <View style={{ marginTop: 24, backgroundColor: isDarkMode ? '#18181b' : '#f1f5f9', padding: 16, borderRadius: 16, width: '100%', maxWidth: 380, borderWidth: 1, borderColor: theme.border }}>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary, marginBottom: 6 }}>💡 Secciones 100% Activas para tu Unidad:</Text>
          <Text style={{ fontSize: 12, color: theme.subText, lineHeight: 20 }}>
            • 📅 Calendario de Eventos y Actividades{'\n'}
            • 📋 Ficha Médica Scout Autocompletada{'\n'}
            • 📷 Drive de Fotos y Multimedia{'\n'}
            • 📜 Currículum Scout Exportable en Word{'\n'}
            • 🪢 Manual de Nudos y Cancionero Offline
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.title, { color: theme.text }]}>Mi Plan Progresivo</Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>Sigue tu camino hacia la Insignia de Madera o Ciudadano Rover.</Text>
          </View>
          <NotificationHeaderBell />
        </View>
      </View>

      <View style={styles.listContainer}>
        {stages.map((stage) => {
          const color        = STAGE_COLORS[stage.id] || colors.primary;
          const isLocked     = stage.displayStatus === 'Bloqueada';
          const isApproved   = stage.displayStatus === 'Aprobada';
          const isInReview   = stage.displayStatus === 'En Revision';
          const isClickable  = !isLocked && !isApproved;

          return (
            <TouchableOpacity
              key={stage.id}
              style={[
                styles.card,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isLocked   && (isDarkMode ? styles.cardLockedDark : styles.cardLocked),
                isApproved && (isDarkMode ? styles.cardApprovedDark : styles.cardApproved),
                isInReview && (isDarkMode ? styles.cardInReviewDark : styles.cardInReview),
              ]}
              onPress={() => isClickable && navigation.navigate('StageDetail', { stageId: stage.id })}
              disabled={isLocked || isApproved}
              activeOpacity={isClickable ? 0.7 : 1}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeWrapper}>
                  <StageBadgeIcon stageId={stage.id} size={46} isLocked={isLocked} />
                </View>

                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[styles.stageName, { color: theme.text }, isLocked && { color: isDarkMode ? '#52525b' : '#aaa' }]}>
                    {stage.name}
                  </Text>
                  <Text style={[styles.statusLabel,
                    isApproved && { color: '#22c55e' },
                    isInReview && { color: '#f59e0b' },
                    isLocked   && { color: isDarkMode ? '#52525b' : '#bbb' },
                  ]}>
                    {isApproved ? '✓ Aprobada'
                     : isInReview ? '⏳ En Revisión'
                     : isLocked  ? '🔒 Bloqueada'
                     : `${stage.progress}% completado`}
                  </Text>
                </View>

                {!isLocked && !isApproved && !isInReview && (
                  <Text style={[styles.progressText, { color }]}>{stage.progress}%</Text>
                )}
                {isClickable && <ChevronRight size={18} color={isLocked ? '#444' : color} />}
              </View>

              {!isLocked && !isApproved && (
                <View style={[styles.progressBarBackground, { backgroundColor: isDarkMode ? '#27272a' : '#eaebed' }]}>
                  <View style={[
                    styles.progressBarFill,
                    { width: `${stage.progress}%`, backgroundColor: isInReview ? '#f59e0b' : color }
                  ]} />
                </View>
              )}

              {isApproved && (
                <View style={[styles.approvedBanner, isDarkMode && { backgroundColor: '#064e3b' }]}>
                  <Text style={[styles.approvedBannerText, isDarkMode && { color: '#6ee7b7' }]}>🏅 Etapa completada y aprobada por tu Scouter</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, marginTop: 5 },
  listContainer: { padding: 16 },

  card: {
    borderRadius: 15, padding: 20,
    marginBottom: 14, borderWidth: 1, elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
  },
  cardLocked:   { backgroundColor: '#fafafa', borderColor: '#eee', elevation: 0 },
  cardLockedDark: { backgroundColor: '#0d0d0e', borderColor: '#1f1f22', elevation: 0 },
  cardApproved: { backgroundColor: '#f0fdf4', borderWidth: 1.5, borderColor: '#86efac' },
  cardApprovedDark: { backgroundColor: '#022c22', borderWidth: 1.5, borderColor: '#065f46' },
  cardInReview: { backgroundColor: '#fffbeb', borderWidth: 1.5, borderColor: '#fcd34d' },
  cardInReviewDark: { backgroundColor: '#451a03', borderWidth: 1.5, borderColor: '#b45309' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  badgeWrapper: { alignItems: 'center', justifyContent: 'center' },
  stageName: { fontSize: 17, fontWeight: 'bold' },
  statusLabel: { fontSize: 13, marginTop: 2 },
  progressText: { fontSize: 16, fontWeight: 'bold', marginRight: 6 },

  progressBarBackground: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },

  approvedBanner: {
    backgroundColor: '#dcfce7', borderRadius: 8, padding: 10, marginTop: 4,
    alignItems: 'center',
  },
  approvedBannerText: { color: '#16a34a', fontSize: 13, fontWeight: '600' },
});
