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
import NotificationHeaderBell from '../components/NotificationHeaderBell';
import { ProgramaPdfPreviewModal } from '../components/ProgramaPdfPreviewModal';
import { ProgramaScout } from '../types/programa';
import { Calendar as CalendarIcon, Award, ChevronRight, Bell, XCircle, Compass, Target, FileText, CheckCircle, Info, Eye } from 'lucide-react-native';

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
    title: '⚜️ Aprobación y Validez Nacional',
    desc: 'Tus dirigentes revisarán y certificarán tus insignias con validez oficial ante la Asociación de Scouts de Venezuela.'
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
  const [roversList, setRoversList] = useState<any[]>([]);

  // Estados para previsualización interactiva de programas desde Próximas Actividades
  const [selectedProgramaPreview, setSelectedProgramaPreview] = useState<ProgramaScout | null>(null);
  const [selectedEventPendingModal, setSelectedEventPendingModal] = useState<any | null>(null);
  const [loadingProgramaModal, setLoadingProgramaModal] = useState(false);

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
    const combinedEvents: any[] = [];

    // 1. Eventos manuales del calendario general y de la unidad
    try {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('date', today)
        .in('unit', [userUnit, 'grupo'])
        .order('date', { ascending: true });
      if (events) combinedEvents.push(...events);
    } catch (e) {
      console.warn('Aviso cargando calendar_events:', e);
    }

    // 2. Programas de actividades semanales (scout_programas)
    try {
      const { data: progData } = await supabase
        .from('scout_programas')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true });
      if (progData) {
        progData.forEach((p: any) => {
          const unit = (p.unit || 'clan').toLowerCase();
          const isSinodalMatch = p.is_sinodal && (p.selected_units?.includes(userUnit) || p.selectedUnits?.includes(userUnit));
          if (unit === userUnit || isSinodalMatch) {
            combinedEvents.push({
              id: `prog_${p.id}`,
              title: `[Programa Scout] ${p.title}`,
              date: p.date,
              unit: unit,
              description: `Lugar: ${p.location || 'Sede'} • Tipo: ${p.activity_type || p.activityType || 'Actividad'} • Responsable: ${p.creator_name || 'Scouter'}`,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Aviso cargando scout_programas en dashboard:', e);
    }

    // 3. Actividades del Plan Trimestral (quarterly_plans)
    try {
      const { data: qpData } = await supabase
        .from('quarterly_plans')
        .select('*')
        .eq('unit', userUnit);
      if (qpData) {
        const monthMap: Record<string, string> = {
          enero: '01', febrero: '02', marzo: '03', abril: '04',
          mayo: '05', junio: '06', julio: '07', agosto: '08',
          septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
        };

        qpData.forEach((qp: any) => {
          let acts: any[] = [];
          if (qp.monthly_activities && Array.isArray(qp.monthly_activities)) {
            acts = qp.monthly_activities;
          } else if (qp.goals) {
            try {
              const parsed = typeof qp.goals === 'string' ? JSON.parse(qp.goals) : qp.goals;
              if (parsed.monthly_activities) acts = parsed.monthly_activities;
            } catch {}
          }

          const year = qp.year || new Date().getFullYear();
          acts.forEach((act: any) => {
            if (!act.activity || !act.month) return;
            const mNorm = act.month.trim().toLowerCase();
            const mNum = monthMap[mNorm];
            if (!mNum) return;
            const dayNum = parseInt(act.day || '15', 10);
            const dStr = String(isNaN(dayNum) ? 15 : dayNum).padStart(2, '0');
            const dateStr = `${year}-${mNum}-${dStr}`;
            if (dateStr >= today) {
              combinedEvents.push({
                id: `qp_${qp.id}_${act.id || Math.random()}`,
                title: `[Plan Trimestral ${qp.quarter}] ${act.activity}`,
                date: dateStr,
                unit: userUnit,
                description: `Lugar: ${act.place || 'Sede'} • Responsable: ${act.responsible || 'Scouter'}`,
              });
            }
          });
        });
      }
    } catch (e) {
      console.warn('Aviso cargando quarterly_plans en dashboard:', e);
    }

    // Ordenar todas las actividades cronológicamente y tomar las próximas 5
    combinedEvents.sort((a, b) => a.date.localeCompare(b.date));
    setUpcomingEvents(combinedEvents.slice(0, 5));
    setLoading(false);
  };

  const handlePressEvent = async (evt: any) => {
    if (evt.id && String(evt.id).startsWith('prog_')) {
      const realId = String(evt.id).replace('prog_', '');
      setLoadingProgramaModal(true);
      try {
        const { data, error } = await supabase
          .from('scout_programas')
          .select('*')
          .eq('id', realId)
          .single();

        if (data && !error) {
          const formatted: ProgramaScout = {
            id: data.id,
            title: data.title,
            date: data.date,
            location: data.location || 'Sede Scout',
            activityType: data.activity_type || data.activityType || 'Actividad Semanal',
            unit: (data.unit || 'clan').toLowerCase(),
            isSinodal: !!data.is_sinodal,
            selectedUnits: data.selected_units || [data.unit || 'clan'],
            participantProjection: data.participant_projection || 'Jóvenes de la Rama',
            generalObjective: data.general_objective || '',
            specificObjectives: data.specific_objectives || [],
            specificMetas: data.specific_metas || [],
            selectedSDGs: data.selected_sdgs || [],
            indicators: data.indicators || [],
            schedule: data.schedule || [],
            importantNotes: data.important_notes || '',
            registrationBadgeId: data.registration_badge_id || 'reg_2026',
            createdBy: data.created_by,
            creatorName: data.creator_name || 'Scouter Responsable',
            groupName: data.group_name || 'Grupo Scout Orión #84',
            createdAt: data.created_at,
            updatedAt: data.updated_at
          };
          setSelectedProgramaPreview(formatted);
          setLoadingProgramaModal(false);
          return;
        }
      } catch (e) {
        console.warn('Aviso abriendo programa scout:', e);
      } finally {
        setLoadingProgramaModal(false);
      }
    }

    // Si es un evento regular o plan trimestral sin programa detallado publicado
    setSelectedEventPendingModal(evt);
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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.welcomeTag}>{motto}</Text>
                <Text style={styles.welcomeName}>¡Hola, {user?.name || 'Scout'}!</Text>
                <Text style={styles.welcomeGroup}>
                  {user?.group_name ? `${user.group_name} • ` : ''}
                  {user?.unit ? user.unit.toUpperCase() : 'SCOUT'}
                </Text>
              </View>
              <NotificationHeaderBell color="#ffffff" />
            </View>
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
          const hasPrograma = evt.id && String(evt.id).startsWith('prog_');

          return (
            <TouchableOpacity
              key={evt.id}
              style={[styles.eventCard, { backgroundColor: theme.cardBg, borderColor: hasPrograma ? '#9333ea' : theme.border }]}
              onPress={() => handlePressEvent(evt)}
              activeOpacity={0.8}
            >
              <View style={[styles.eventCircle, { backgroundColor: color }]}>
                <Text style={styles.eventCircleText}>{evt.unit?.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.eventInfo}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <Text style={[styles.eventTitle, { color: theme.text, flex: 1 }]}>{displayTitle}</Text>
                  {hasPrograma && (
                    <View style={{ backgroundColor: isDarkMode ? '#581c87' : '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#d8b4fe' }}>
                      <Text style={{ fontSize: 9, color: '#9333ea', fontWeight: 'bold' }}>📄 Ficha Oficial</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.eventDate, { color: theme.subText }]}>📅 {evt.date}</Text>
                {displayDesc ? <Text style={[styles.eventDesc, { color: theme.subText }]}>{displayDesc}</Text> : null}
              </View>
              <ChevronRight size={18} color={theme.subText} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          );
        })
      )}

      {/* MODAL DE PREVISUALIZACIÓN OFICIAL EN PDF / IMPRESIÓN DEL PROGRAMA SCOUT */}
      <ProgramaPdfPreviewModal
        visible={!!selectedProgramaPreview}
        programa={selectedProgramaPreview}
        onClose={() => setSelectedProgramaPreview(null)}
      />

      {/* MODAL INFORMATIVO PARA ACTIVIDADES SIN PROGRAMA PUBLICADO */}
      <Modal visible={!!selectedEventPendingModal} transparent animationType="fade" onRequestClose={() => setSelectedEventPendingModal(null)}>
        <View style={styles.tourModalBg}>
          <View style={[styles.tourModalCard, { backgroundColor: theme.cardBg, maxWidth: 400 }]}>
            <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(99, 102, 241, 0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
              <CalendarIcon size={26} color={colors.primary} />
            </View>

            <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text, textAlign: 'center', marginBottom: 4 }}>
              {selectedEventPendingModal?.title}
            </Text>

            <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', padding: 10, borderRadius: 10, width: '100%', marginVertical: 8 }}>
              <Text style={{ fontSize: 12, color: theme.text, textAlign: 'center', fontWeight: 'bold' }}>
                📅 {selectedEventPendingModal?.date} • {selectedEventPendingModal?.unit?.toUpperCase()}
              </Text>
              {selectedEventPendingModal?.description ? (
                <Text style={{ fontSize: 11, color: theme.subText, textAlign: 'center', marginTop: 4 }}>
                  {selectedEventPendingModal?.description}
                </Text>
              ) : null}
            </View>

            <View style={{ backgroundColor: isDarkMode ? '#451a03' : '#fef3c7', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#fde68a', marginVertical: 8 }}>
              <Text style={{ fontSize: 12, color: '#b45309', fontWeight: 'bold', textAlign: 'center' }}>
                ⏳ Aún no se ha publicado el Programa Oficial
              </Text>
              <Text style={{ fontSize: 11, color: '#92400e', textAlign: 'center', marginTop: 4 }}>
                Tu equipo de scouters publicará próximamente la minuta detallada, horarios por bloques y lista de materiales para esta actividad.
              </Text>
            </View>

            <TouchableOpacity
              style={{ backgroundColor: colors.primary, width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 }}
              onPress={() => setSelectedEventPendingModal(null)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  notifBody: { color: '#7F1D1D', fontSize: 12, marginTop: 2 },
  notifReason: { color: '#B91C1C', fontSize: 12, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 8 },
  installCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    gap: 12
  },
  installCardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center'
  },
  installCardTitle: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  installCardSubtitle: {
    fontSize: 11,
    marginTop: 2
  },
  welcomeCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 20, marginBottom: 20 },
  welcomeTag: { color: '#E0D4F7', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
  welcomeName: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
  welcomeGroup: { color: '#E0D4F7', fontSize: 13, marginTop: 4 },
  seeAllText: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  stageCard: { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1 },
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
