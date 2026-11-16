import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { formatDateEs } from '../utils/dateLocal';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { ChevronRight, PartyPopper, Clapperboard, Check, Clock, Info, Award } from 'lucide-react-native';
import { Btn, Card, Chip, CountUp, EmptyState, Enter, Notice, ProgressBar } from '../components/ui';
import { SPACE, TYPE } from '../theme/tokens';
import { StageBadgeIcon, BADGE_IMAGES } from '../components/StageBadgeIcon';
import NotificationHeaderBell from '../components/NotificationHeaderBell';
import { getStagesForUnit } from '../data/unitTemplates';
import { SkeletonScreen } from '../components/Skeleton';
import { contentMax } from '../theme/layout';
import { STAGE_COLORS } from '../theme/stageColors';
import { isMaxBadge } from '../utils/badgeCelebration';
import { showBadgeCelebration } from '../lib/celebration';
import { openCelebrationVideo, canMakeCelebrationVideo } from '../lib/celebrationVideo';


export default function PlanProgresivoScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme, primaryColor } = useTheme();
  const canCelebrate = Platform.OS === 'web';
  const canVideo = canCelebrate && canMakeCelebrationVideo();
  const myUnit = getStagesForUnit(user?.role === 'scout' ? user?.unit : null).unit;

  // Datos de la insignia para volver a ver la celebración o crear el video
  const celebrationFor = (stage: any) => {
    const tpl = getStagesForUnit(user?.role === 'scout' ? user?.unit : null);
    const order = tpl.stages.map(st => st.id);
    const idx = order.indexOf(stage.id);
    return {
      title: stage.name,
      color: STAGE_COLORS[stage.id] || colors.primary,
      badge: BADGE_IMAGES[stage.id],
      isMax: isMaxBadge(stage.id, order),
      unitLabel: tpl.unit?.label || 'Clan',
      nextTitle: idx >= 0 ? tpl.stages[idx + 1]?.title : undefined,
      name: user?.name || 'Scout',
      groupName: user?.group_name || undefined,
      dateText: stage.approvedAt ? formatDateEs(stage.approvedAt.slice(0, 10)) : undefined,
    };
  };

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
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={[contentMax, styles.content]}>
      <Enter style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.h2, { color: theme.text }]} accessibilityRole="header">Mi Plan Progresivo</Text>
          <Text style={[TYPE.small, { color: theme.subText, marginTop: 4 }]}>{myUnit && myUnit.key !== 'clan' ? `Sigue tu camino de progresión en ${myUnit.label}.` : 'Sigue tu camino hacia la Insignia de Madera o Ciudadano Rover.'}</Text>
        </View>
        <NotificationHeaderBell />
      </Enter>

      {(() => {
        const tpl = getStagesForUnit(user?.role === 'scout' ? user?.unit : null);
        if (!tpl.isFallback || !tpl.unit) return null;
        return (
          <Notice Icon={Info}>
            La plantilla de etapas de {tpl.unit.label} ({tpl.unit.minAge}–{tpl.unit.maxAge} años) aún no está cargada. Mientras tanto ves las etapas del Clan; tu avance se conserva.
          </Notice>
        );
      })()}

      {stages.length === 0 && (
        <EmptyState Icon={Award} title="Aún no hay etapas" text="Cuando tu unidad tenga su plan cargado, aquí verás cada etapa y tu avance." />
      )}

      {stages.map((stage, index) => {
        const isLocked     = stage.displayStatus === 'Bloqueada';
        const isApproved   = stage.displayStatus === 'Aprobada';
        const isInReview   = stage.displayStatus === 'En Revision';
        const isCurrent    = !isLocked && !isApproved && !isInReview;
        const stageColor   = STAGE_COLORS[stage.id] || theme.primary;

        return (
          <Enter key={stage.id} index={index + 1}>
            <Card
              active={isCurrent}
              muted={isLocked}
              onPress={() => navigation.navigate('StageDetail', { stageId: stage.id })}
              accessibilityLabel={`${stage.name}: ${isApproved ? 'aprobada' : isInReview ? 'en revisión' : isLocked ? 'bloqueada' : `${stage.progress} % completado`}`}
              style={{ gap: SPACE.md }}
            >
              <View style={styles.cardHeader}>
                <StageBadgeIcon stageId={stage.id} size={48} isLocked={isLocked} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[TYPE.h3, { color: isLocked ? theme.subText : theme.text }]} numberOfLines={1}>{stage.name}</Text>
                  <Text style={[TYPE.tiny, { color: theme.subText, marginTop: 2 }]}>
                    {isApproved ? (stage.approvedAt ? `Aprobada el ${formatDateEs(stage.approvedAt.slice(0, 10))}` : 'Etapa completada y aprobada')
                     : isInReview ? 'Tu dirigente la está revisando'
                     : isLocked  ? 'Bloqueada · toca para ver los requisitos'
                     : stage.total ? `${stage.completed} de ${stage.total} requisitos · etapa actual` : `${stage.progress}% completado`}
                  </Text>
                </View>
                {isApproved && <Chip label="Aprobada" tone="ok" Icon={Check} />}
                {isInReview && <Chip label="En revisión" tone="warn" Icon={Clock} />}
                {isCurrent && <CountUp value={stage.progress} suffix=" %" style={[TYPE.h3, { color: theme.accentText }]} />}
                {!isApproved && !isInReview && <ChevronRight size={18} color={isLocked ? theme.subText : theme.accentText} />}
              </View>

              {(isCurrent || isInReview) && <ProgressBar value={stage.progress} />}

              {isApproved && canCelebrate && (
                <View style={styles.celebrateRow}>
                  <Btn
                    variant="secondary" small label="Ver celebración" Icon={PartyPopper} iconColor={stageColor}
                    onPress={() => { showBadgeCelebration(celebrationFor(stage)); }}
                    accessibilityLabel={`Ver la celebración de ${stage.name}`}
                    style={styles.celebrateBtn}
                  />
                  {canVideo && (
                    <Btn
                      variant="secondary" small label="Descargar video" Icon={Clapperboard} iconColor={stageColor}
                      onPress={() => openCelebrationVideo(celebrationFor(stage))}
                      accessibilityLabel={`Descargar el video de ${stage.name}`}
                      style={styles.celebrateBtn}
                    />
                  )}
                </View>
              )}
            </Card>
          </Enter>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACE.lg, gap: SPACE.md, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACE.sm, paddingBottom: SPACE.xs },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md },
  celebrateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.sm },
  celebrateBtn: { flexGrow: 1, flexBasis: 140 },
});
