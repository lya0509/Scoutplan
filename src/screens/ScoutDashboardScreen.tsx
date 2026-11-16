import React, { useState, useCallback, useEffect, useRef } from 'react';
import { liveStyles } from '../theme/liveStyles';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Modal, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import HelpFloatingFAB from '../components/HelpFloatingFAB';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { readCached, writeCached } from '../lib/offline/readCache';
import { dataService } from '../lib/dataService';
import { presenceService } from '../services/presenceService';
import { useFocusEffect } from '@react-navigation/native';
import NotificationHeaderBell from '../components/NotificationHeaderBell';
import { DualProfileAvatar } from '../components/DualProfileAvatar';
import { ScoutUserIcon } from '../components/ScoutUserIcon';
import { ProgramaPdfPreviewModal } from '../components/ProgramaPdfPreviewModal';
import { ProgramaScout } from '../types/programa';
import { Calendar as CalendarIcon, Award, ChevronRight, Bell, XCircle, Compass, Target, FileText, CheckCircle, ShieldAlert, ShieldCheck, Clock, Users, Check, Lock } from 'lucide-react-native';
import { Btn, Card, Chip, CountUp, Enter, ProgressBar, SectionTitle, CheckMark } from '../components/ui';
import { RADIUS, SPACE, TYPE } from '../theme/tokens';
import { todayLocal, daysUntil, formatDateEs } from '../utils/dateLocal';
import PullToRefreshScrollView from '../components/PullToRefreshScrollView';
import { useNotifications } from '../context/NotificationContext';
import { SkeletonScreen } from '../components/Skeleton';
import { contentMax, contentWide, WIDE_BREAKPOINT } from '../theme/layout';
import { getUnitInfo } from '../data/unitTemplates';

const ONBOARDING_SLIDES = [
  {
    icon: Compass,
    title: '¡Bienvenido a tu Plan Progresivo!',
    desc: 'Te acompañamos en tu camino de adelanto scout. Aquí llevarás el registro digital de tus insignias y etapas en la Asociación de Scouts de Venezuela.'
  },
  {
    icon: Target,
    title: 'Catálogo de Actividades',
    desc: 'Dentro de cada etapa podrás abrir el catálogo de 328 actividades. Selecciona tus 12 Básicas y 9 Opcionales utilizando la barra de progreso en vivo.'
  },
  {
    icon: FileText,
    title: 'Certificados e Iniciativas',
    desc: 'Sube tus acreditaciones de Especialidades (Bronce, Plata, Oro), Cursos (Horqueta, Remo, Canoa) e Iniciativas de Programa Nacionales (ej: Enseñas).'
  },
  {
    icon: CheckCircle,
    title: 'Aprobación y Validez Nacional',
    desc: 'Tus dirigentes revisarán y certificarán tus insignias con validez oficial ante la Asociación de Scouts de Venezuela.'
  }
];

export default function ScoutDashboardScreen({ navigation }: any) {
  const { user } = useAuth();
  const myUnitInfo = getUnitInfo(user?.unit);
  const { isDarkMode, theme, primaryColor } = useTheme();
  // Pantalla grande (1080p, 2K): el inicio usa casi todo el ancho; etapa y rovers a la izquierda,
  // próximas actividades a la derecha.
  const { width: winWidth } = useWindowDimensions();
  const isWide = winWidth >= WIDE_BREAKPOINT;

  const [loading, setLoading]           = useState(true);
  const [currentStage, setCurrentStage]   = useState<any>(null);
  const [stageStatus, setStageStatus]     = useState<string>('En Progreso');
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  // Avisos sin leer: la misma lista que la campanita (se actualiza sola cuando llega uno en vivo)
  const { notifications: allNotifs, markAsRead } = useNotifications();
  const notifications = allNotifs.filter(n => !n.read);
  const [expandedNotifs, setExpandedNotifs] = useState<Record<string, boolean>>({});
  const [showAllNotifs, setShowAllNotifs] = useState(false);
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
      // Suscribirse a cambios de presencia en tiempo real (los datos los carga useFocusEffect)
      const unsubPresence = presenceService.subscribe((onlineIds) => {
        setRoversList(prev => prev.map(r => ({
          ...r,
          isOnline: presenceService.isUserOnline(r.id, r.updated_at)
        })));
      });

      return () => {
        unsubPresence();
      };
    }
  }, [user?.id]);

  // Recargar al entrar a la pantalla o si cambia la persona; no cada vez que se refresca
  // el perfil (antes recargaba todo 6-7 veces seguidas al abrir la app).
  const lastLoadRef = useRef<{ id?: string; at: number }>({ at: 0 });
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      const now = Date.now();
      if (lastLoadRef.current.id === user.id && now - lastLoadRef.current.at < 2000) return;
      lastLoadRef.current = { id: user.id, at: now };
      loadDashboardData();
    }, [user?.id])
  );

  const loadDashboardData = async () => {
    if (!user) return;
    setLoading(true);

    // Actualizar estado online del usuario actual
    await dataService.updateLastSeen(user.id);

    // Obtener directorio de Rovers de la misma unidad
    const rovers = await dataService.getUnitRoversDirectory(user.group_name || 'Grupo Scout Orión #84', user.unit || 'clan');
    const enrichedRovers = rovers.map(r => ({
      ...r,
      isOnline: presenceService.isUserOnline(r.id, r.updated_at)
    }));
    setRoversList(enrichedRovers);


    const progressData = await dataService.getProgressForAllStages(user.id);

    // Con copia offline: sin red se mantiene la etapa real del scout
    const statusMap: Record<string, string> = await dataService.getAllStageStatuses(user.id);

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

    const today = todayLocal();
    const userUnit = (user.unit || 'manada').toLowerCase();
    let combinedEvents: any[] = [];
    let anyLoaded = false;

    // 1. Eventos manuales del calendario general y de la unidad
    try {
      const { data: events } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('date', today)
        .in('unit', [userUnit, 'grupo'])
        .order('date', { ascending: true });
      if (events) { combinedEvents.push(...events); anyLoaded = true; }
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
        anyLoaded = true;
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
        anyLoaded = true;
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

    // Copia offline: sin red se muestran las últimas actividades conocidas que aún no pasan
    const eventsCacheKey = `dashboard_events_${user.id}`;
    if (anyLoaded) {
      writeCached(eventsCacheKey, combinedEvents);
    } else {
      combinedEvents = ((await readCached<any[]>(eventsCacheKey)) || []).filter(e => e.date >= today);
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
    await markAsRead(id);
  };

  const handleDismissAll = async () => {
    const ids = notifications.map(n => n.id);
    setShowAllNotifs(false);
    for (const id of ids) await markAsRead(id).catch(() => {});
  };

  if (loading) {
    return (
      <SkeletonScreen variant="dashboard" />
    );
  }

  const SlideIcon = ONBOARDING_SLIDES[currentSlide].icon;

  const statusTone = stageStatus === 'Aprobada' ? 'ok' : stageStatus === 'En Revision' ? 'warn' : 'accent';
  const statusLabel = stageStatus === 'En Revision' ? 'En revisión' : stageStatus === 'Aprobada' ? 'Aprobada' : 'En progreso';
  const StatusIcon = stageStatus === 'Aprobada' ? Check : stageStatus === 'En Revision' ? Clock : undefined;
  const pendingReqs: { id: string; title: string }[] = currentStage?.pending || [];
  const unitTitle = myUnitInfo && myUnitInfo.key !== 'clan' ? `Mi ${myUnitInfo.label}` : 'Rovers';
  const onlineCount = roversList.filter(r => r.isOnline).length;

  // Secciones del inicio (en pantalla grande van en dos columnas)
  const stageAndRoversSection = (
    <>
      {/* Etapa Actual */}
      <Enter index={1} style={styles.section}>
        <SectionTitle>Tu Etapa Actual</SectionTitle>
        {currentStage ? (
          <Card active onPress={() => navigation.navigate('StageDetail', { stageId: currentStage.id })} accessibilityLabel={`${currentStage.name}, ${currentStage.progress} % completado. Ver requisitos y avanzar`}>
            <View style={styles.stageCardHeader}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[TYPE.h3, { color: theme.text }]} numberOfLines={1}>{currentStage.name}</Text>
                <Text style={[TYPE.tiny, { color: theme.subText, marginTop: 2 }]}>
                  {currentStage.total ? `${currentStage.completed} de ${currentStage.total} requisitos` : `${currentStage.progress}% completado`}
                </Text>
              </View>
              <CountUp value={currentStage.progress} suffix=" %" style={[TYPE.h3, { color: theme.accentText }]} />
            </View>
            <ProgressBar value={currentStage.progress} />
            <View style={styles.stageCardFooter}>
              <Chip label={statusLabel} tone={statusTone} Icon={StatusIcon} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={[styles.actionLinkText, { color: theme.accentText }]}>Ver requisitos y avanzar</Text>
                <ChevronRight color={theme.accentText} size={18} />
              </View>
            </View>
          </Card>
        ) : (
          <Card muted><Text style={[TYPE.small, { color: theme.subText }]}>No tienes etapas activas cargadas.</Text></Card>
        )}
      </Enter>

      {/* Qué te falta: los requisitos pendientes más cercanos, con acceso directo */}
      {currentStage && stageStatus !== 'Aprobada' && stageStatus !== 'En Revision' && pendingReqs.length > 0 && (
        <Enter index={2} style={styles.section}>
          <SectionTitle right={<Text style={[TYPE.tiny, { color: theme.subText }]}>{pendingReqs.length} {pendingReqs.length === 1 ? 'pendiente' : 'pendientes'}</Text>}>Qué te falta</SectionTitle>
          <View style={{ gap: SPACE.sm }}>
            {pendingReqs.slice(0, 3).map(req => (
              <Card key={req.id} onPress={() => navigation.navigate('StageDetail', { stageId: currentStage.id })} style={styles.rowCard} accessibilityLabel={`Pendiente: ${req.title}`}>
                <CheckMark />
                <Text style={[TYPE.small, { color: theme.text, fontWeight: '600', flex: 1 }]} numberOfLines={2}>{req.title}</Text>
                <ChevronRight size={18} color={theme.subText} />
              </Card>
            ))}
          </View>
        </Enter>
      )}
      {currentStage && stageStatus === 'En Revision' && (
        <Enter index={2} style={styles.section}>
          <Card style={styles.rowCard}>
            <Clock size={20} color={theme.warn} />
            <Text style={[TYPE.small, { color: theme.text, flex: 1 }]}>Tu dirigente está revisando esta etapa. Te llegará un aviso cuando responda.</Text>
          </Card>
        </Enter>
      )}

      {/* DIRECTORIO Y ESTADO ONLINE DE LA UNIDAD */}
      <Enter index={3} style={styles.section}>
        <SectionTitle right={roversList.length > 0 ? <Text style={[TYPE.tiny, { color: theme.subText }]}>{onlineCount} en línea</Text> : undefined}>{unitTitle}</SectionTitle>
        {roversList.length === 0 ? (
          <Card muted style={{ alignItems: 'center', gap: SPACE.sm }}>
            <Users size={24} color={theme.subText} />
            <Text style={[TYPE.small, { color: theme.subText, textAlign: 'center' }]}>{myUnitInfo && myUnitInfo.key !== 'clan' ? 'Aún no hay más miembros registrados en tu unidad.' : 'Sé el primer Rover registrado en esta unidad.'}</Text>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: SPACE.sm, paddingVertical: 2 }}>
              {roversList.map(rover => (
                <Card
                  key={rover.id}
                  onPress={() => navigation.navigate('ScoutFullProfile', { scoutId: rover.id })}
                  accessibilityLabel={`Ver perfil de ${rover.name || 'Rover'}, ${rover.isOnline ? 'en línea' : 'desconectado'}`}
                  style={styles.memberCard}
                >
                  <View style={{ position: 'relative' }}>
                    <DualProfileAvatar
                      scoutAvatarUrl={rover.avatar_url}
                      customAvatarUrl={rover.custom_avatar_url}
                      unit={rover.unit || 'clan'}
                      size={52}
                      editable={false}
                    />
                    <View style={[styles.presenceDot, { backgroundColor: rover.isOnline ? '#16a34a' : theme.subText, borderColor: theme.cardBg }]} />
                  </View>
                  <Text style={[TYPE.tiny, { fontWeight: '700', color: theme.text, textAlign: 'center' }]} numberOfLines={1}>
                    {rover.name || 'Rover'}
                  </Text>
                  <Text style={[TYPE.tiny, { color: rover.isOnline ? theme.ok : theme.subText }]}>
                    {rover.isOnline ? 'En línea' : 'Desconectado'}
                  </Text>
                </Card>
              ))}
            </View>
          </ScrollView>
        )}
      </Enter>
    </>
  );
  const upcomingSection = (
    <Enter index={isWide ? 1 : 4} style={styles.section}>
      {/* Próximos Eventos */}
      <SectionTitle right={<Btn variant="text" small label="Ver todo" onPress={() => navigation.navigate('Calendario')} />}>Próximas Actividades</SectionTitle>

      {upcomingEvents.length === 0 ? (
        <Card muted style={{ alignItems: 'center', gap: SPACE.sm }}>
          <CalendarIcon size={24} color={theme.subText} />
          <Text style={[TYPE.small, { color: theme.subText, textAlign: 'center' }]}>No hay actividades programadas próximamente.</Text>
        </Card>
      ) : (
        <View style={{ gap: SPACE.sm }}>
          {upcomingEvents.map(evt => {
            const displayTitle = (evt.title || '').replace(/\[6P\s*/gi, '[CIP ').replace(/\b6P\b/gi, 'CIP').replace(/6P/g, 'CIP');
            const displayDesc = evt.description ? evt.description.replace(/\b6P\b/gi, 'CIP').replace(/6P/g, 'CIP') : '';
            const hasPrograma = evt.id && String(evt.id).startsWith('prog_');

            return (
              <Card key={evt.id} onPress={() => handlePressEvent(evt)} style={styles.rowCard}>
                <View style={[styles.eventCircle, { backgroundColor: theme.accentSoft }]}>
                  <CalendarIcon size={20} color={theme.accentText} />
                </View>
                <View style={styles.eventInfo}>
                  <Text style={[TYPE.small, { color: theme.text, fontWeight: '600' }]}>{displayTitle}</Text>
                  <Text style={[TYPE.tiny, { color: theme.subText, marginTop: 2 }]}>{formatDateEs(evt.date)}{displayDesc ? ` · ${displayDesc}` : ''}</Text>
                  {hasPrograma && <Chip label="Ficha Oficial" tone="accent" Icon={FileText} style={{ marginTop: 6 }} />}
                </View>
                <ChevronRight size={18} color={theme.subText} />
              </Card>
            );
          })}
        </View>
      )}
    </Enter>
  );

  return (
    <View style={{ flex: 1 }}>
      <PullToRefreshScrollView onRefresh={() => loadDashboardData()} style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={[styles.content, isWide ? contentWide : contentMax]}>
      
      {/* AVISOS SIN LEER: 2 a la vista; el resto con «Ver todos» (antes se apilaban todos) */}
      {notifications.slice(0, showAllNotifs ? notifications.length : 2).map(notif => {
        const negative = /no aprobad|rechaz|devuelt|vencid|removid|no fue/i.test(`${notif.title} ${notif.message || ''}`);
        const accent = negative ? theme.err : theme.accentText;
        return (
          <View key={notif.id} style={[styles.notifBanner, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: accent }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <Bell color={accent} size={20} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.notifTitle, { color: theme.text }]}>{notif.title}</Text>
                {!!(notif.message || (notif as any).reason) && (() => {
                  // Avisos largos (p. ej. el comunicado de mantenimiento) se ven en 3 líneas con «Ver más»
                  const body = String(notif.message || (notif as any).reason);
                  const long = body.length > 160 || body.split('\n').length > 3;
                  const open = expandedNotifs[notif.id];
                  return (
                    <>
                      <Text style={[styles.notifReason, { color: theme.subText }]} numberOfLines={long && !open ? 3 : undefined}>{body}</Text>
                      {long && (
                        <TouchableOpacity onPress={() => setExpandedNotifs(prev => ({ ...prev, [notif.id]: !open }))} accessibilityRole="button" style={{ alignSelf: 'flex-start', paddingVertical: 4 }}>
                          <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 13 }}>{open ? 'Ver menos' : 'Ver más'}</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  );
                })()}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDismissNotification(notif.id)} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel="Marcar aviso como leído">
              <XCircle color={theme.subText} size={20} />
            </TouchableOpacity>
          </View>
        );
      })}
      {notifications.length > 2 && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, marginTop: -4 }}>
          <TouchableOpacity onPress={() => setShowAllNotifs(v => !v)} style={{ paddingVertical: 8 }} accessibilityRole="button">
            <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 13 }}>
              {showAllNotifs ? 'Ver menos' : `Ver los ${notifications.length} avisos`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDismissAll} style={{ paddingVertical: 8 }} accessibilityRole="button">
            <Text style={{ color: theme.subText, fontWeight: '700', fontSize: 13 }}>Marcar todos como leídos</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Saludo */}
      {(() => {
        const unitKey = (user?.unit || '').toLowerCase();
        let motto = '¡Siempre Listo!';
        if (unitKey === 'manada') motto = '¡Siempre lo Mejor!';
        else if (unitKey === 'caminantes' || unitKey === 'comunidad') motto = '¡Siempre Adelante!';
        else if (unitKey === 'clan') motto = '¡Siempre Listo para Servir!';
        const heroFg = isDarkMode ? '#ffffff' : theme.onPrimary;

        return (
          <Enter style={[styles.welcomeCard, { backgroundColor: isDarkMode ? theme.cardBg : theme.primary }, isDarkMode && { borderWidth: 1, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: SPACE.sm }}>
              <View style={{ flex: 1 }}>
                <View style={styles.welcomeTagRow}>
                  <ScoutUserIcon unit={user?.unit} size={36} />
                  <Text style={[TYPE.over, { color: heroFg, flexShrink: 1 }]}>{motto}</Text>
                </View>
                <Text style={[TYPE.h2, { color: heroFg }]}>¡Hola, {user?.name || 'Scout'}!</Text>
                <Text style={[TYPE.small, { color: heroFg, opacity: 0.9, marginTop: 4 }]}>
                  {user?.group_name ? `${user.group_name} • ` : ''}
                  {user?.unit ? user.unit.toUpperCase() : 'SCOUT'}
                </Text>
              </View>
              <NotificationHeaderBell color={heroFg} />
            </View>
          </Enter>
        );
      })()}

      {/* Aviso de membresía: solo si está por vencer, vencida, pendiente o devuelta */}
      {(() => {
        const status = user?.membership_status;
        const expires = user?.membership_expires_at;
        const days = daysUntil(expires);
        let tone: 'warn' | 'danger' | 'info' | null = null;
        let title = '';
        let detail = '';
        if (status === 'approved' && days !== null) {
          if (days < 0) {
            tone = 'danger';
            title = 'Tu membresía está vencida';
            detail = `Venció el ${formatDateEs(expires)}. Habla con tu Scouter para renovarla.`;
          } else if (days <= 60) {
            tone = days <= 15 ? 'danger' : 'warn';
            title = days === 0 ? 'Tu membresía vence hoy' : `Tu membresía vence en ${days} ${days === 1 ? 'día' : 'días'}`;
            detail = `Válida hasta el ${formatDateEs(expires)}. Recuerda renovarla con tu Scouter.`;
          }
        } else if (status === 'pending_approval') {
          tone = 'info';
          title = 'Membresía en aprobación';
          detail = expires
            ? `Tu Scouter propuso el ${formatDateEs(expires)}. Falta la aprobación de Jefatura.`
            : 'Falta la aprobación de Jefatura.';
        } else if (status === 'rejected') {
          tone = 'danger';
          title = 'Membresía devuelta';
          detail = user?.membership_rejected_reason
            ? `Motivo: ${user.membership_rejected_reason}`
            : 'Jefatura devolvió la fecha propuesta. Habla con tu Scouter.';
        }
        if (!tone) return null;
        const pal = {
          warn: { bg: theme.warnSoft, border: theme.warnSoft, fg: theme.warn },
          danger: { bg: theme.errSoft, border: theme.errLine, fg: theme.err },
          info: { bg: theme.accentSoft, border: theme.accentSoft, fg: theme.accentText },
        }[tone];
        const Icon = tone === 'info' ? Clock : tone === 'warn' ? ShieldCheck : ShieldAlert;
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('Perfil')}
            accessibilityRole="button"
            accessibilityLabel={`${title}. ${detail}`}
            style={[styles.membershipCard, { backgroundColor: pal.bg, borderColor: pal.border }]}
          >
            <Icon size={22} color={pal.fg} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.membershipTitle, { color: pal.fg }]}>{title}</Text>
              <Text style={[styles.membershipDetail, { color: pal.fg }]}>{detail}</Text>
            </View>
            <ChevronRight size={18} color={pal.fg} />
          </TouchableOpacity>
        );
      })()}

      {isWide ? (
        <View style={{ flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}>
          <View style={{ flex: 3, minWidth: 0 }}>
            {stageAndRoversSection}
          </View>
          <View style={{ flex: 2, minWidth: 0 }}>
            {upcomingSection}
          </View>
        </View>
      ) : (
        <>
          {stageAndRoversSection}
          {upcomingSection}
        </>
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
          <View style={[styles.tourModalCard, { backgroundColor: theme.cardBg, maxWidth: 400, gap: SPACE.md }]}>
            <View style={[styles.eventCircle, { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.accentSoft }]}>
              <CalendarIcon size={26} color={theme.accentText} />
            </View>
            <Text style={[TYPE.h3, { color: theme.text, textAlign: 'center' }]}>
              {selectedEventPendingModal?.title}
            </Text>
            <View style={{ backgroundColor: theme.inputBg, padding: SPACE.md, borderRadius: RADIUS.md, width: '100%' }}>
              <Text style={[TYPE.small, { color: theme.text, textAlign: 'center', fontWeight: '600' }]}>
                {formatDateEs(selectedEventPendingModal?.date)} • {selectedEventPendingModal?.unit?.toUpperCase()}
              </Text>
              {selectedEventPendingModal?.description ? (
                <Text style={[TYPE.tiny, { color: theme.subText, textAlign: 'center', marginTop: 4 }]}>
                  {selectedEventPendingModal?.description}
                </Text>
              ) : null}
            </View>
            <View style={{ backgroundColor: theme.warnSoft, padding: SPACE.md, borderRadius: RADIUS.md, width: '100%', flexDirection: 'row', gap: SPACE.sm }}>
              <Clock size={20} color={theme.warn} />
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.small, { color: theme.warn, fontWeight: '700' }]}>Aún no se ha publicado el Programa Oficial</Text>
                <Text style={[TYPE.tiny, { color: theme.warn, marginTop: 4 }]}>
                  Tu equipo de scouters publicará próximamente la minuta detallada, horarios por bloques y lista de materiales para esta actividad.
                </Text>
              </View>
            </View>
            <Btn label="Entendido" block onPress={() => setSelectedEventPendingModal(null)} />
          </View>
        </View>
      </Modal>

      {/* MODAL INTERACTIVO DE GUÍA DE PRIMERA VEZ (ONBOARDING) */}
      <Modal visible={showOnboarding} transparent animationType="fade">
        <View style={styles.tourModalBg}>
          <View style={[styles.tourModalCard, { backgroundColor: theme.cardBg }]}>
            <View style={[styles.tourIconCircle, { backgroundColor: theme.accentSoft }]}>
              <SlideIcon size={44} color={theme.accentText} />
            </View>

            <Text style={[styles.tourTitle, { color: theme.text }]}>{ONBOARDING_SLIDES[currentSlide].title}</Text>
            <Text style={[styles.tourDesc, { color: theme.subText }]}>{ONBOARDING_SLIDES[currentSlide].desc}</Text>

            <View style={styles.dotsRow}>
              {ONBOARDING_SLIDES.map((_, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.dot,
                    { backgroundColor: theme.border },
                    currentSlide === idx && { width: 24, backgroundColor: theme.primary }
                  ]}
                />
              ))}
            </View>

            <View style={styles.tourNavRow}>
              {currentSlide > 0 ? (
                <Btn variant="text" label="Anterior" onPress={() => setCurrentSlide(prev => prev - 1)} />
              ) : <View style={{ flex: 1 }} />}

              {currentSlide < ONBOARDING_SLIDES.length - 1 ? (
                <Btn label="Siguiente" onPress={() => setCurrentSlide(prev => prev + 1)} />
              ) : (
                <Btn label="¡Empezar Aventura!" onPress={handleFinishOnboarding} />
              )}
            </View>

          </View>
        </View>
      </Modal>

      </PullToRefreshScrollView>

      {/* BOTÓN FLOTANTE DE AYUDA Y REPORTES */}
      <HelpFloatingFAB />
    </View>
  );
}

const styles = liveStyles(() => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACE.lg, paddingBottom: 40 },
  section: { gap: SPACE.md, marginBottom: SPACE.xl },
  notifBanner: {
    borderLeftWidth: 4, borderWidth: 1, borderRadius: RADIUS.md, padding: SPACE.md, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  notifTitle: { fontWeight: '700', fontSize: 13 },
  notifReason: { fontSize: 12, marginTop: 2 },
  membershipCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, borderWidth: 1, borderRadius: RADIUS.lg, padding: 14, marginBottom: SPACE.lg },
  membershipTitle: { fontSize: 15, fontWeight: '700' },
  membershipDetail: { fontSize: 13, marginTop: 2, lineHeight: 18 },
  welcomeCard: { borderRadius: RADIUS.lg, padding: 20, marginBottom: SPACE.xl },
  welcomeTagRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginBottom: 6 },
  stageCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: SPACE.md, marginBottom: SPACE.md },
  stageCardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: SPACE.sm, marginTop: SPACE.md },
  actionLinkText: { fontWeight: '600', fontSize: 14 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, paddingVertical: SPACE.md, minHeight: 64 },
  memberCard: { alignItems: 'center', gap: 4, padding: SPACE.md, minWidth: 116 },
  presenceDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  eventCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  eventInfo: { flex: 1, minWidth: 0 },

  tourModalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  tourModalCard: { width: '92%', maxWidth: 420, borderRadius: RADIUS.xl, padding: SPACE.xl, alignItems: 'center' },
  tourIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
  tourTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  tourDesc: { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: SPACE.xl },
  dotsRow: { flexDirection: 'row', marginBottom: SPACE.xl },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  tourNavRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center' },
}));
