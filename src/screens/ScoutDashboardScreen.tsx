import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import HelpFloatingFAB from '../components/HelpFloatingFAB';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { dataService } from '../lib/dataService';
import { colors } from '../theme/colors';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar as CalendarIcon, Award, ChevronRight, Bell, XCircle, Compass, Target, FileText, CheckCircle } from 'lucide-react-native';

const UNIT_COLORS: Record<string, string> = {
  'manada': '#ffb300',
  'tropa': '#43a047',
  'caminantes': '#1e88e5',
  'comunidad': '#1e88e5',
  'clan': '#e53935',
  'grupo': '#8e24aa',
};

const ONBOARDING_SLIDES = [
  {
    icon: Compass,
    title: '⚜️ ¡Bienvenido a tu Plan Progresivo!',
    desc: 'Te acompañamos en tu camino de adelanto scout. Aquí llevarás el registro digital de tus insignias y etapas en la Asociación de Scouts de Venezuela.'
  },
  {
    icon: Target,
    title: '🎯 Catálogo de Actividades',
    desc: 'Dentro de cada etapa podrás abrir el catálogo de 328 actividades. Selecciona tus 12 Básicas y 9 Opcionales utilizando la barra de progreso en vivo.'
  },
  {
    icon: FileText,
    title: '📜 Certificados e Iniciativas',
    desc: 'Sube tus acreditaciones de Especialidades (Bronce, Plata, Oro), Cursos (Horqueta, Remo, Canoa) e Iniciativas de Programa Nacionales (ej: Enseñas).'
  },
  {
    icon: CheckCircle,
    title: '🤝 Revisión con tu Scouter',
    desc: 'Al completar los requisitos de tu etapa, envíala a tu dirigente. Él la revisará, aprobará tus logros y te otorgará tu nueva insignia.'
  }
];

export default function ScoutDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [loading, setLoading]           = useState(true);
  const [currentStage, setCurrentStage]   = useState<any>(null);
  const [stageStatus, setStageStatus]     = useState<string>('En Progreso');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentSlide, setCurrentSlide]     = useState(0);

  useEffect(() => {
    checkOnboarding();
  }, [user]);

  const checkOnboarding = async () => {
    if (!user) return;
    try {
      const value = await AsyncStorage.getItem(`onboarding_seen_${user.id}`);
      if (value === null) {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.error('Error comprobando onboarding:', e);
    }
  };

  const handleFinishOnboarding = async () => {
    if (!user) return;
    try {
      await AsyncStorage.setItem(`onboarding_seen_${user.id}`, 'true');
    } catch (e) {
      console.error('Error guardando onboarding:', e);
    } finally {
      setShowOnboarding(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadDashboardData();
      }
    }, [user])
  );

  const [roversList, setRoversList] = useState<any[]>([]);

  const loadDashboardData = async () => {
    setLoading(true);
    if (!user) return;

    // Actualizar estado online del usuario actual
    await dataService.updateLastSeen(user.id);

    // Obtener directorio de Rovers de la misma unidad
    const rovers = await dataService.getUnitRoversDirectory(user.group_name || 'Grupo Scout Orión #84', user.unit || 'clan');
    setRoversList(rovers);

    const unreadNotifs = await dataService.getUnreadNotifications(user.id);
    setNotifications(unreadNotifs);

    const progressData = await dataService.getProgressForAllStages(user.id);

    const { data: stageRows } = await supabase
      .from('stage_progress')
      .select('stage_id, status')
      .eq('scout_id', user.id);

    const statusMap: Record<string, string> = {};
    stageRows?.forEach(r => { statusMap[r.stage_id] = r.status; });

    let prevApproved = true;
    let activeStage  = null;
    let activeStatus = 'En Progreso';

    for (const p of progressData) {
      if (!prevApproved) break;
      const dbStatus = statusMap[p.id];
      if (dbStatus !== 'Aprobada') {
        activeStage  = p;
        activeStatus = dbStatus || 'En Progreso';
        break;
      }
      prevApproved = dbStatus === 'Aprobada';
    }

    if (!activeStage && progressData.length > 0) {
      activeStage  = progressData[progressData.length - 1];
      activeStatus = statusMap[activeStage.id] || 'Aprobada';
    }

    setCurrentStage(activeStage);
    setStageStatus(activeStatus);

    const today = new Date().toISOString().split('T')[0];
    const userUnit = (user.unit || 'manada').toLowerCase();

    const { data: events } = await supabase
      .from('calendar_events')
      .select('*')
      .gte('date', today)
      .in('unit', [userUnit, 'grupo'])
      .order('date', { ascending: true })
      .limit(3);

    setUpcomingEvents(events || []);
    setLoading(false);
  };

  const handleDismissNotification = async (id: string) => {
    await dataService.markNotificationRead(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const SlideIcon = ONBOARDING_SLIDES[currentSlide].icon;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.content}>
      
      {/* BANNER DE NOTIFICACIONES */}
      {notifications.map(notif => (
        <View key={notif.id} style={styles.notifBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Bell color="#DC2626" size={22} style={{ marginRight: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text style={styles.notifReason}>{notif.reason}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDismissNotification(notif.id)} style={{ padding: 4 }}>
            <XCircle color="#991B1B" size={20} />
          </TouchableOpacity>
        </View>
      ))}

      {/* Saludo */}
      {(() => {
        const unitKey = (user?.unit || '').toLowerCase();
        let motto = '⚜️ ¡Siempre Listo!';
        if (unitKey === 'manada') motto = '🐾 ¡Siempre lo Mejor!';
        else if (unitKey === 'tropa') motto = '⚜️ ¡Siempre Listo!';
        else if (unitKey === 'caminantes' || unitKey === 'comunidad') motto = '🏕️ ¡Siempre Adelante!';
        else if (unitKey === 'clan') motto = '🔴 ¡Siempre Listo para Servir!';

        return (
          <View style={[styles.welcomeCard, isDarkMode && { backgroundColor: '#000000', borderWidth: 1, borderColor: '#27272a' }]}>
            <Text style={styles.welcomeTag}>{motto}</Text>
            <Text style={styles.welcomeName}>¡Hola, {user?.name || 'Scout'}!</Text>
            <Text style={styles.welcomeGroup}>
              {user?.group_name ? `${user.group_name} • ` : ''}
              {user?.unit ? user.unit.toUpperCase() : 'SCOUT'}
            </Text>
          </View>
        );
      })()}

      {/* Etapa Actual */}
      <View style={styles.sectionHeader}>
        <Award color={colors.primary} size={20} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tu Etapa Actual</Text>
      </View>

      {currentStage ? (
        <TouchableOpacity
          style={[styles.stageCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('StageDetail', { stageId: currentStage.id })}
        >
          <View style={styles.stageCardHeader}>
            <Text style={[styles.stageName, { color: theme.text }]}>{currentStage.name}</Text>
            <View style={[
              styles.statusBadge,
              stageStatus === 'Aprobada' ? styles.statusApproved :
              stageStatus === 'En Revision' ? styles.statusReview :
              styles.statusProgress
            ]}>
              <Text style={styles.statusText}>{stageStatus}</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${currentStage.progress}%` }]} />
          </View>
          <Text style={[styles.progressText, { color: theme.subText }]}>{currentStage.progress}% completado</Text>

          <View style={[styles.stageCardFooter, { borderTopColor: theme.border }]}>
            <Text style={styles.actionLinkText}>Ver requisitos y avanzar</Text>
            <ChevronRight color={colors.primary} size={18} />
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={[styles.emptyText, { color: theme.subText }]}>No tienes etapas activas cargadas.</Text>
      )}

      {/* DIRECTORIO Y ESTADO ONLINE DE ROVERS DE LA UNIDAD */}
      <View style={{ marginBottom: 20 }}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 8 }]}>⚜️ Rovers</Text>
        {roversList.length === 0 ? (
          <View style={[styles.emptyEventsCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.subText, fontSize: 13 }}>Sé el primer Rover registrado en esta unidad.</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 4 }}>
              {roversList.map(rover => (
                <View
                  key={rover.id}
                  style={{
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                    borderWidth: 1,
                    borderRadius: 16,
                    padding: 12,
                    alignItems: 'center',
                    minWidth: 110,
                    elevation: 2,
                  }}
                >
                  <View style={{ position: 'relative', marginBottom: 6 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                        {rover.name?.charAt(0)?.toUpperCase() || 'R'}
                      </Text>
                    </View>
                    <View style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: rover.isOnline ? '#22c55e' : '#9ca3af',
                      borderWidth: 2,
                      borderColor: 'white'
                    }} />
                  </View>

                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, textAlign: 'center' }} numberOfLines={1}>
                    {rover.name || 'Rover'}
                  </Text>
                  
                  <View style={{ backgroundColor: rover.isOnline ? 'rgba(34, 197, 94, 0.15)' : 'rgba(156, 163, 175, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: rover.isOnline ? '#16a34a' : '#6b7280' }}>
                      {rover.isOnline ? '🟢 En línea' : '⚪ Desconectado'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </View>

      {/* Próximos Eventos */}
      <View style={styles.sectionHeader}>
        <CalendarIcon color={colors.primary} size={20} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Próximas Actividades</Text>
        <TouchableOpacity style={{ marginLeft: 'auto' }} onPress={() => navigation.navigate('Calendario')}>
          <Text style={styles.seeAllText}>Ver todo</Text>
        </TouchableOpacity>
      </View>

      {upcomingEvents.length === 0 ? (
        <View style={[styles.emptyEventsCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.emptyText, { color: theme.subText }]}>No hay actividades programadas próximamente.</Text>
        </View>
      ) : (
        upcomingEvents.map(evt => {
          const color = UNIT_COLORS[evt.unit?.toLowerCase()] || colors.primary;
          const displayTitle = (evt.title || '').replace(/\[6P\s*/gi, '[CIP ').replace(/\b6P\b/gi, 'CIP').replace(/6P/g, 'CIP');
          const displayDesc = evt.description ? evt.description.replace(/\b6P\b/gi, 'CIP').replace(/6P/g, 'CIP') : '';

          return (
            <View key={evt.id} style={[styles.eventCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={[styles.eventCircle, { backgroundColor: color }]}>
                <Text style={styles.eventCircleText}>{evt.unit?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventTitle, { color: theme.text }]}>{displayTitle}</Text>
                <Text style={[styles.eventDate, { color: theme.subText }]}>📅 {evt.date}</Text>
                {displayDesc ? <Text style={[styles.eventDesc, { color: theme.subText }]}>{displayDesc}</Text> : null}
              </View>
            </View>
          );
        })
      )}

      {/* MODAL INTERACTIVO DE GUÍA DE PRIMERA VEZ (ONBOARDING) */}
      <Modal visible={showOnboarding} transparent animationType="fade">
        <View style={styles.tourModalBg}>
          <View style={[styles.tourModalCard, { backgroundColor: theme.cardBg }]}>
            
            <View style={styles.tourIconCircle}>
              <SlideIcon size={44} color={colors.primary} />
            </View>

            <Text style={[styles.tourTitle, { color: theme.text }]}>{ONBOARDING_SLIDES[currentSlide].title}</Text>
            <Text style={[styles.tourDesc, { color: theme.subText }]}>{ONBOARDING_SLIDES[currentSlide].desc}</Text>

            <View style={styles.dotsRow}>
              {ONBOARDING_SLIDES.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    currentSlide === idx && styles.dotActive
                  ]}
                />
              ))}
            </View>

            <View style={styles.tourNavRow}>
              {currentSlide > 0 ? (
                <TouchableOpacity
                  style={styles.tourPrevBtn}
                  onPress={() => setCurrentSlide(prev => prev - 1)}
                >
                  <Text style={[styles.tourPrevText, { color: theme.subText }]}>Anterior</Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}

              {currentSlide < ONBOARDING_SLIDES.length - 1 ? (
                <TouchableOpacity
                  style={styles.tourNextBtn}
                  onPress={() => setCurrentSlide(prev => prev + 1)}
                >
                  <Text style={styles.tourNextText}>Siguiente</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.tourFinishBtn}
                  onPress={handleFinishOnboarding}
                >
                  <Text style={styles.tourFinishText}>¡Empezar Aventura!</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>
        </View>
      </Modal>

      </ScrollView>

      {/* BOTÓN FLOTANTE DE AYUDA Y REPORTES */}
      <HelpFloatingFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  notifBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  notifTitle: { fontWeight: 'bold', color: '#991B1B', fontSize: 13 },
  notifReason: { color: '#B91C1C', fontSize: 12, marginTop: 2 },
  welcomeCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 20 },
  welcomeTag: { color: '#E0D4F7', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  welcomeName: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  welcomeGroup: { color: '#E0D4F7', fontSize: 13, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  stageCard: { borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1 },
  stageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  stageName: { fontSize: 18, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusProgress: { backgroundColor: '#FEF3C7' },
  statusReview: { backgroundColor: '#DBEAFE' },
  statusApproved: { backgroundColor: '#D1FAE5' },
  statusText: { fontSize: 11, fontWeight: 'bold', color: '#1E293B' },
  progressBarBg: { height: 8, backgroundColor: '#E2E8F0', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { fontSize: 12, marginTop: 6, fontWeight: '500' },
  stageCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1 },
  actionLinkText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 },
  eventCard: { borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  eventCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  eventCircleText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: 'bold' },
  eventDate: { fontSize: 12, marginTop: 2 },
  eventDesc: { fontSize: 12, marginTop: 2 },
  emptyEventsCard: { borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 1 },
  emptyText: { fontSize: 14 },

  tourModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tourModalCard: { width: '92%', maxWidth: 420, borderRadius: 24, padding: 26, alignItems: 'center' },
  tourIconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  tourTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  tourDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  dotsRow: { flexDirection: 'row', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#CBD5E1', marginHorizontal: 4 },
  dotActive: { width: 24, backgroundColor: colors.primary },
  tourNavRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' },
  tourPrevBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  tourPrevText: { fontWeight: 'bold', fontSize: 14 },
  tourNextBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
  tourNextText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  tourFinishBtn: { backgroundColor: '#4EAE49', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
  tourFinishText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 }
});
