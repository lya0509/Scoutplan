import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { formatDateEs } from '../utils/dateLocal';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { ChevronRight } from 'lucide-react-native';
import { StageBadgeIcon } from '../components/StageBadgeIcon';
import NotificationHeaderBell from '../components/NotificationHeaderBell';
import { getStagesForUnit } from '../data/unitTemplates';
import { SkeletonScreen } from '../components/Skeleton';
import { contentMax } from '../theme/layout';

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

    // Con copia offline: sin red se mantiene la etapa real (no se bloquea todo)
      const statusMap: Record<string, string> = await dataService.getAllStageStatuses(user!.id);
    const dates = await dataService.getStageDates(user!.id).catch(() => ({} as Record<string, string>));

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
      return { ...stage, displayStatus, approvedAt: dbStatus === 'Aprobada' ? dates[stage.id] : undefined };
    });

    setStages(enriched);
    setLoading(false);
  };

  if (loading) {
    return (
      <SkeletonScreen variant="list" />
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={contentMax}>
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderBottomColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={[styles.title, { color: theme.text }]}>Mi Plan Progresivo</Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>Sigue tu camino hacia la Insignia de Madera o Ciudadano Rover.</Text>
          </View>
          <NotificationHeaderBell />
        </View>
      </View>

      {(() => {
        const tpl = getStagesForUnit(user?.role === 'scout' ? user?.unit : null);
        if (!tpl.isFallback || !tpl.unit) return null;
        return (
          <View style={[styles.templateNotice, { backgroundColor: isDarkMode ? '#1e1b4b' : '#eff6ff', borderColor: isDarkMode ? '#3730a3' : '#bfdbfe' }]}>
            <Text style={[styles.templateNoticeText, { color: isDarkMode ? '#c7d2fe' : '#1e3a8a' }]}>
              La plantilla de etapas de la {tpl.unit.label} ({tpl.unit.minAge}–{tpl.unit.maxAge} años) aún no está cargada. Mientras tanto ves las etapas del Clan; tu avance se conserva.
            </Text>
          </View>
        );
      })()}

      <View style={styles.listContainer}>
        {stages.map((stage) => {
          const color        = STAGE_COLORS[stage.id] || colors.primary;
          const isLocked     = stage.displayStatus === 'Bloqueada';
          const isApproved   = stage.displayStatus === 'Aprobada';
          const isInReview   = stage.displayStatus === 'En Revision';

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
              onPress={() => navigation.navigate('StageDetail', { stageId: stage.id })}
              activeOpacity={0.7}
            >
              <View style={styles.cardHeader}>
                <View style={styles.badgeWrapper}>
                  <StageBadgeIcon stageId={stage.id} size={46} isLocked={isLocked} />
                </View>

                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[styles.stageName, { color: theme.text }, isLocked && { color: isDarkMode ? '#a1a1aa' : '#475569' }]}>
                    {stage.name}
                  </Text>
                  <Text style={[styles.statusLabel, { color: theme.subText },
                    isApproved && { color: '#22c55e', fontWeight: 'bold' },
                    isInReview && { color: '#f59e0b', fontWeight: 'bold' },
                    isLocked   && { color: isDarkMode ? '#94a3b8' : '#64748b' },
                  ]}>
                    {isApproved ? '✓ Aprobada • Toca para previsualizar'
                     : isInReview ? '⏳ En Revisión • Toca para previsualizar'
                     : isLocked  ? '🔒 Bloqueada • Toca para previsualizar'
                     : `${stage.progress}% completado`}
                  </Text>
                </View>

                {!isLocked && !isApproved && !isInReview && (
                  <Text style={[styles.progressText, { color }]}>{stage.progress}%</Text>
                )}
                <ChevronRight size={18} color={isLocked ? (isDarkMode ? '#64748b' : '#94a3b8') : color} />
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
                  <Text style={[styles.approvedBannerText, isDarkMode && { color: '#6ee7b7' }]}>🏅 {stage.approvedAt ? `Aprobada el ${formatDateEs(stage.approvedAt.slice(0, 10))}` : 'Etapa completada y aprobada'} • Toca para ver lo que registraste</Text>
                </View>
              )}

              {isLocked && (
                <View style={[styles.approvedBanner, isDarkMode ? { backgroundColor: '#1e293b' } : { backgroundColor: '#f1f5f9' }]}>
                  <Text style={[styles.approvedBannerText, isDarkMode ? { color: '#94a3b8' } : { color: '#64748b' }]}>🔒 Etapa bloqueada • Toca para consultar el contenido y requisitos</Text>
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
  templateNotice: { marginHorizontal: 16, marginTop: 14, borderWidth: 1, borderRadius: 12, padding: 12 },
  templateNoticeText: { fontSize: 13, lineHeight: 19 },
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
