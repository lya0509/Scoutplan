import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Modal,
  TextInput
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import HelpFloatingFAB from '../components/HelpFloatingFAB';
import { dataService } from '../lib/dataService';
import { supabase } from '../lib/supabaseClient';
import { stagesData } from '../data/progressionTemplate';
import { colors } from '../theme/colors';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import {
  Users, ChevronDown, ChevronUp,
  Calendar, Calendar as CalendarIcon, LogOut, Trash2, Plus, Flag, X, Moon, Sun, Compass, Camera, ShieldCheck, Ban, CheckCircle, ImageOff, BookOpen, Palette, FileText, Music, Sparkles
} from 'lucide-react-native';
import { showAlert } from '../utils/alert';
import { ThemeCustomizerModal } from '../components/ThemeCustomizerModal';

function formatDateWithDayOfWeek(dateStr: string): string {
  if (!dateStr) return 'Seleccionar fecha en el calendario';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const dateObj = new Date(+y, +m - 1, +d, 12, 0, 0);
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `📅 ${capitalizedDay}, ${+d} de ${capitalizedMonth} de ${y}`;
  } catch (e) {
    return dateStr;
  }
}

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  'Aprobada':    { color: '#22c55e', label: 'Aprobada' },
  'En Revision': { color: '#f59e0b', label: 'En Revisión' },
  'En Progreso': { color: colors.primary, label: 'En Progreso' },
  'Bloqueada':   { color: '#d1d5db', label: 'Bloqueada' },
};

const UNIT_COLORS: Record<string, string> = {
  manada: '#ffb300', tropa: '#43a047', comunidad: '#1e88e5',
  clan: '#e53935', grupo: '#8e24aa',
};

function MembersPanel({ scouts, onReview, onViewProfile, isDarkMode, theme }: { scouts: any[]; onReview: (s: any) => void; onViewProfile: (s: any) => void; isDarkMode: boolean; theme: any }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[panelStyles.wrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <TouchableOpacity 
        style={panelStyles.header} 
        onPress={() => setOpen(o => !o)} 
        activeOpacity={0.8}
      >
        <View style={panelStyles.headerLeft}>
          <Users size={20} color={colors.primary} />
          <Text style={[panelStyles.headerTitle, { color: theme.text }]}>Miembros de Unidad</Text>
        </View>
        <View style={panelStyles.headerRight}>
          <View style={panelStyles.badge}><Text style={panelStyles.badgeText}>{scouts.length}</Text></View>
          {open ? <ChevronUp size={18} color={theme.subText} /> : <ChevronDown size={18} color={theme.subText} />}
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[panelStyles.body, { borderTopColor: theme.border }]}>
          {scouts.length === 0 ? (
            <Text style={panelStyles.empty}>No hay scouts asignados a tu unidad aún.</Text>
          ) : (
            scouts.map((scout, idx) => {
              const hasReview  = scout.stagesWithStatus?.some((s: any) => s.status === 'En Revision');
              const activeStage = scout.stagesWithStatus?.find((s: any) =>
                s.status !== 'Aprobada' && s.status !== 'Bloqueada');

              return (
                <TouchableOpacity 
                  key={scout.id} 
                  style={[
                    panelStyles.memberRow,
                    idx < scouts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }
                  ]}
                  onPress={() => onViewProfile(scout)}
                  activeOpacity={0.7}
                >
                  <View style={[panelStyles.avatar, hasReview && { backgroundColor: '#f59e0b' }]}>
                    <Text style={panelStyles.avatarText}>{scout.name?.charAt(0)?.toUpperCase()}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[panelStyles.memberName, { color: theme.text }]}>{scout.name}</Text>
                    <Text style={[panelStyles.memberSub, { color: theme.subText }]}>
                      {hasReview ? '⚠️ Pendiente de revisión (Toca para ver perfil)' : `Etapa: ${activeStage?.title || 'Sin etapa'} (Toca para ver perfil)`}
                    </Text>

                    <View style={panelStyles.stagesRow}>
                      {scout.stagesWithStatus?.map((stage: any) => {
                        const cfg = STATUS_CONFIG[stage.status] || STATUS_CONFIG['Bloqueada'];
                        return (
                          <View key={stage.id} style={[panelStyles.stagePill, { backgroundColor: cfg.color + '15', borderColor: cfg.color }]}>
                            <Text style={[panelStyles.stagePillText, { color: cfg.color }]} numberOfLines={1}>
                              {stage.title}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {hasReview ? (
                    <TouchableOpacity style={panelStyles.reviewBtn} onPress={() => onReview(scout)}>
                      <Text style={panelStyles.reviewBtnText}>Revisar</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={panelStyles.profileBtn} onPress={() => onViewProfile(scout)}>
                      <Text style={panelStyles.profileBtnText}>Ver Perfil</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

function ActivitiesPanel({ unitFilter, isDarkMode, theme, onAddCip }: { unitFilter: string; isDarkMode: boolean; theme: any; onAddCip: () => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [blinkOpacity, setBlinkOpacity] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkOpacity(prev => (prev === 1 ? 0.2 : 1));
    }, 550);
    return () => clearInterval(interval);
  }, []);

  const loadEvents = async () => {
    if (loaded) return;
    const { data } = await supabase
      .from('calendar_events')
      .select('*')
      .in('unit', [unitFilter, 'grupo'])
      .order('date', { ascending: true });
    setEvents(data || []);
    setLoaded(true);
  };

  const handleToggle = () => {
    setOpen(o => !o);
    loadEvents();
  };

  const handleDelete = async (eventId: string) => {
    if (deletingId === eventId) {
      const { error } = await supabase.from('calendar_events').delete().eq('id', eventId);
      if (!error) setEvents(prev => prev.filter(e => e.id !== eventId));
      setDeletingId(null);
    } else {
      setDeletingId(eventId);
      setTimeout(() => setDeletingId(d => d === eventId ? null : d), 4000);
    }
  };

  const canDelete = (evt: any) =>
    user?.role === 'jefe_grupo' ||
    (user?.role === 'scouter' && evt.unit.toLowerCase() === unitFilter.toLowerCase());

  return (
    <View style={[panelStyles.wrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <TouchableOpacity style={[panelStyles.header, { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]} onPress={handleToggle} activeOpacity={0.8}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Calendar size={20} color={colors.primary} />
            <Text style={[panelStyles.headerTitle, { color: theme.text, flex: 1 }]} numberOfLines={2}>
              Actividades y Ciclos (CIP)
            </Text>
          </View>
          {open ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: isDarkMode ? '#27272a' : '#f1f5f9' }}>
          <TouchableOpacity 
            style={[panelStyles.addCipBtn, { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }]}
            onPress={(e) => {
              e.stopPropagation();
              onAddCip();
            }}
          >
            <Plus size={15} color="white" style={{ marginRight: 4 }} />
            <Text style={[panelStyles.addCipBtnText, { fontSize: 12 }]}>+ Registrar Evento CIP</Text>
          </TouchableOpacity>

          {loaded && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 11, color: theme.subText }}>Registrados:</Text>
              <View style={panelStyles.badge}><Text style={panelStyles.badgeText}>{events.length}</Text></View>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[panelStyles.body, { borderTopColor: theme.border }]}>
          {!loaded ? (
            <ActivityIndicator color={colors.primary} />
          ) : events.length === 0 ? (
            <Text style={panelStyles.empty}>No hay actividades o ciclos registrados.</Text>
          ) : (
            events.map((evt, idx) => {
              const evtDate   = new Date(evt.date + 'T12:00:00');
              const unitKey   = evt.unit?.toLowerCase() || 'tropa';
              const unitColor = UNIT_COLORS[unitKey] || colors.primary;
              const isDeleting = deletingId === evt.id;
              const isCip = evt.title?.includes('[CIP') || evt.title?.includes('[6P');
              const displayTitle = (evt.title || '').replace(/\[6P\s*/gi, '[CIP ').replace(/\b6P\b/gi, 'CIP');
              const displayDesc  = evt.description ? evt.description.replace(/\b6P\b/gi, 'CIP') : '';

              return (
                <View 
                  key={evt.id} 
                  style={[
                    panelStyles.activityRow,
                    idx < events.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={[
                    panelStyles.dateBox, 
                    { backgroundColor: unitColor }
                  ]}>
                    <Text style={panelStyles.dateMonth}>
                      {evtDate.toLocaleString('es', { month: 'short' }).toUpperCase()}
                    </Text>
                    <Text style={panelStyles.dateDay}>{evtDate.getDate()}</Text>
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[panelStyles.activityTitle, { color: theme.text }]} numberOfLines={1}>
                      {displayTitle}
                    </Text>
                    {displayDesc ? (
                      <Text style={[panelStyles.activityDesc, { color: theme.subText }]} numberOfLines={1}>{displayDesc}</Text>
                    ) : null}
                    <View style={[panelStyles.unitTag, { backgroundColor: unitColor + '20' }]}>
                      <Text style={[panelStyles.unitTagText, { color: unitColor }]}>
                        {evt.unit.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {canDelete(evt) && (
                    <TouchableOpacity
                      style={[panelStyles.trashBtn, isDeleting && panelStyles.trashBtnConfirm]}
                      onPress={() => handleDelete(evt.id)}
                    >
                      {isDeleting
                        ? <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>¿Ok?</Text>
                        : <Trash2 size={16} color="#e53935" />
                      }
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

function OnlineRosterPanel({ unit, groupName, isDarkMode, theme }: { unit: string; groupName: string; isDarkMode: boolean; theme: any }) {
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const loadMembers = async () => {
    if (loaded) return;
    const result = await dataService.getUnitRoversDirectory(groupName, unit);
    setMembers(result);
    setLoaded(true);
  };

  const handleToggle = () => {
    setOpen(o => !o);
    loadMembers();
  };

  return (
    <View style={[panelStyles.wrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <TouchableOpacity style={panelStyles.header} onPress={handleToggle} activeOpacity={0.8}>
        <View style={panelStyles.headerLeft}>
          <Users size={20} color="#22c55e" />
          <Text style={[panelStyles.headerTitle, { color: theme.text }]}>Estado en Línea de la Unidad</Text>
        </View>
        <View style={panelStyles.headerRight}>
          {loaded && <View style={[panelStyles.badge, { backgroundColor: '#22c55e' }]}><Text style={panelStyles.badgeText}>{members.filter(m => m.isOnline).length} en línea</Text></View>}
          {open ? <ChevronUp size={18} color={theme.subText} /> : <ChevronDown size={18} color={theme.subText} />}
        </View>
      </TouchableOpacity>

      {open && (
        <View style={[panelStyles.body, { borderTopColor: theme.border }]}>
          {!loaded ? (
            <ActivityIndicator color={colors.primary} />
          ) : members.length === 0 ? (
            <Text style={panelStyles.empty}>No hay miembros registrados en esta unidad aún.</Text>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {members.map(member => (
                <View
                  key={member.id}
                  style={{
                    backgroundColor: isDarkMode ? '#27272a' : '#f9fafb',
                    borderColor: member.isOnline ? '#22c55e' : theme.border,
                    borderWidth: 1.5,
                    borderRadius: 12,
                    padding: 10,
                    alignItems: 'center',
                    minWidth: 90,
                    maxWidth: 110,
                  }}
                >
                  <View style={{ position: 'relative', marginBottom: 4 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={{
                      position: 'absolute', bottom: 0, right: 0,
                      width: 10, height: 10, borderRadius: 5,
                      backgroundColor: member.isOnline ? '#22c55e' : '#9ca3af',
                      borderWidth: 1.5, borderColor: 'white'
                    }} />
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.text, textAlign: 'center' }} numberOfLines={1}>
                    {member.name?.split(' ')[0] || 'Scout'}
                  </Text>
                  <Text style={{ fontSize: 9, color: member.isOnline ? '#16a34a' : '#9ca3af', marginTop: 2 }}>
                    {member.isOnline ? '🟢 En línea' : '⚪ Desconectado'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function ScouterDashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { isDarkMode, theme, primaryColor, toggleDarkMode } = useTheme();

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [scouts, setScouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats]   = useState({ total: 0, inReview: 0, approved: 0 });

  // Modal para agregar Evento CIP 6P
  const [showCipModal, setShowCipModal] = useState(false);
  useModalBackHandler(showCipModal, () => setShowCipModal(false));
  const [cipTitle, setCipTitle] = useState('');
  const [cipScope, setCipScope] = useState<'distrital' | 'regional' | 'nacional' | 'internacional'>('distrital');
  const [cipDate, setCipDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCipDatePicker, setShowCipDatePicker] = useState(false);
  const [cipDesc, setCipDesc] = useState('');
  const [savingCip, setSavingCip] = useState(false);

  // Membership management
  const [showMembershipModal, setShowMembershipModal] = useState(false);
  const [selectedScoutForMembership, setSelectedScoutForMembership] = useState<any>(null);
  const [membershipDateInput, setMembershipDateInput] = useState('');
  const [showMembershipDatePicker, setShowMembershipDatePicker] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showPhotoRejectModal, setShowPhotoRejectModal] = useState(false);
  const [photoRejectReason, setPhotoRejectReason] = useState('');
  const [photoRejectScout, setPhotoRejectScout] = useState<any>(null);

  useFocusEffect(
    useCallback(() => { loadScouts(); }, [])
  );

  const loadScouts = async () => {
    setLoading(true);
    if (!user?.unit) { setLoading(false); return; }

    const rawData = await dataService.getScoutsForScouter(user.unit, user.group_name || '');

    const enriched = await Promise.all(rawData.map(async (scout) => {
      const { data: stageRows } = await supabase
        .from('stage_progress').select('stage_id, status').eq('scout_id', scout.id);

      const statusMap: Record<string, string> = {};
      stageRows?.forEach(r => { statusMap[r.stage_id] = r.status; });

      let previousApproved = true;
      const stagesWithStatus = stagesData.map(template => {
        let status: string;
        if (!previousApproved) {
          status = 'Bloqueada';
        } else {
          status = statusMap[template.id] || 'En Progreso';
        }
        previousApproved = statusMap[template.id] === 'Aprobada';
        return { id: template.id, title: template.title, status };
      });

      const activeStage  = stagesWithStatus.find(s => s.status !== 'Aprobada' && s.status !== 'Bloqueada');
      const reviewStage  = stagesWithStatus.find(s => s.status === 'En Revision');

      return {
        ...scout,
        stagesWithStatus,
        currentStageLabel: activeStage?.title || 'Completado',
        reviewStageId: reviewStage?.id || null,
      };
    }));

    setScouts(enriched);
    setStats({
      total:    enriched.length,
      inReview: enriched.filter(s => s.reviewStageId !== null).length,
      approved: enriched.filter(s => s.stagesWithStatus.some((st: any) => st.status === 'Aprobada')).length,
    });
    setLoading(false);
  };

  const handleSaveCip = async () => {
    if (!cipTitle.trim()) {
      showAlert('Campo obligatorio', 'Debes ingresar un título para el Ciclo CIP.');
      return;
    }
    if (!user) return;

    setSavingCip(true);
    try {
      await dataService.createCipEvent({
        title: cipTitle.trim(),
        scope: cipScope,
        unit: user.unit ? user.unit.toLowerCase() : 'tropa',
        date: cipDate,
        description: cipDesc.trim(),
        created_by: user.id
      });

      showAlert('¡Ciclo CIP Registrado!', `El evento con alcance ${cipScope.toUpperCase()} fue guardado correctamente.`);
      setShowCipModal(false);
      setCipTitle('');
      setCipDesc('');
    } catch (e: any) {
      showAlert('Error al guardar', e?.message || 'No se pudo guardar el evento CIP.');
    } finally {
      setSavingCip(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : primaryColor }, isDarkMode && { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerGreeting}>Bienvenido/a,</Text>
          <Text style={styles.headerName}>{user?.name}</Text>
          <View style={styles.unitBadge}>
            <Text style={styles.unitBadgeText}>Unidad: {user?.unit?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity 
            style={[styles.calendarIconBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
            onPress={() => setShowCustomizer(true)}
            activeOpacity={0.8}
          >
            <Palette color="#ffffff" size={20} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.calendarIconBtn, { backgroundColor: isDarkMode ? '#27272a' : 'rgba(255,255,255,0.2)' }]}
            onPress={toggleDarkMode}
            activeOpacity={0.8}
          >
            {isDarkMode ? <Sun color="#f59e0b" size={20} /> : <Moon color="white" size={20} />}
          </TouchableOpacity>
        </View>
      </View>

      {/* BARRA DE HERRAMIENTAS Y ACCESOS RÁPIDOS */}
      <View style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          <TouchableOpacity
            style={[styles.scouterQuickBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => navigation.navigate('ProgramaScout')}
            activeOpacity={0.8}
          >
            <Calendar size={18} color={primaryColor} />
            <Text style={[styles.scouterQuickBtnText, { color: theme.text }]}>📅 Programas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scouterQuickBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => navigation.navigate('Documentos')}
            activeOpacity={0.8}
          >
            <BookOpen size={18} color={primaryColor} />
            <Text style={[styles.scouterQuickBtnText, { color: theme.text }]}>Documentos & PDFs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scouterQuickBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => navigation.navigate('QuarterlyPlan')}
            activeOpacity={0.8}
          >
            <Compass size={18} color={primaryColor} />
            <Text style={[styles.scouterQuickBtnText, { color: theme.text }]}>Plan Trimestral</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scouterQuickBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => navigation.navigate('TemporalDrive')}
            activeOpacity={0.8}
          >
            <Camera size={18} color={primaryColor} />
            <Text style={[styles.scouterQuickBtnText, { color: theme.text }]}>Drive Fotos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scouterQuickBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => navigation.navigate('CalendarStandalone')}
            activeOpacity={0.8}
          >
            <Calendar size={18} color={primaryColor} />
            <Text style={[styles.scouterQuickBtnText, { color: theme.text }]}>Calendario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scouterQuickBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => navigation.navigate('NudosManual')}
            activeOpacity={0.8}
          >
            <FileText size={18} color={primaryColor} />
            <Text style={[styles.scouterQuickBtnText, { color: theme.text }]}>Manual Nudos</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.scouterQuickBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => navigation.navigate('Cancionero')}
            activeOpacity={0.8}
          >
            <Music size={18} color={primaryColor} />
            <Text style={[styles.scouterQuickBtnText, { color: theme.text }]}>Cancionero</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* ESTADÍSTICAS */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderTopColor: primaryColor, backgroundColor: theme.cardBg }]}>
          <Text style={[styles.statNumber, { color: theme.text }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Scouts</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#f59e0b', backgroundColor: theme.cardBg }]}>
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.inReview}</Text>
          <Text style={styles.statLabel}>En Revisión</Text>
        </View>
        <View style={[styles.statCard, { borderTopColor: '#22c55e', backgroundColor: theme.cardBg }]}>
          <Text style={[styles.statNumber, { color: '#22c55e' }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Con Aprobada</Text>
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 30 }}>
          <MembersPanel
            scouts={scouts}
            isDarkMode={isDarkMode}
            theme={theme}
            onViewProfile={scout => navigation.navigate('ScoutFullProfile', { scoutId: scout.id })}
            onReview={scout => navigation.navigate('ScouterReview', {
              scoutId:   scout.id,
              stageId:   scout.reviewStageId,
              scoutName: scout.name,
            })}
          />

          <OnlineRosterPanel
            unit={user?.unit?.toLowerCase() || 'clan'}
            groupName={user?.group_name || ''}
            isDarkMode={isDarkMode}
            theme={theme}
          />

          <ActivitiesPanel 
            unitFilter={user?.unit?.toLowerCase() || ''} 
            isDarkMode={isDarkMode}
            theme={theme}
            onAddCip={() => setShowCipModal(true)}
          />

          {/* PANEL DE GESTIÓN DE MEMBRESÍA SCOUT */}
          <View style={[panelStyles.wrapper, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <View style={[panelStyles.header, { paddingBottom: 10 }]}>
              <View style={panelStyles.headerLeft}>
                <ShieldCheck size={20} color="#7c3aed" />
                <Text style={[panelStyles.headerTitle, { color: theme.text }]}>Gestión de Carnet y Membresía</Text>
              </View>
            </View>
            <View style={[panelStyles.body, { borderTopColor: theme.border }]}>
              <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
                Asigna la fecha de vigencia de membresía a cada scout. {user?.role === 'jefe_grupo' ? 'Puedes aprobar o rechazar solicitudes.' : 'El Jefe de Grupo aprobará las solicitudes.'}
              </Text>
              {scouts.length === 0 ? (
                <Text style={panelStyles.empty}>No hay scouts registrados aún.</Text>
              ) : (
                scouts.map(scout => {
                  const mStatus = scout.membership_status || 'none';
                  const mDate = scout.membership_expires_at || '';
                  return (
                    <View key={`mem_${scout.id}`} style={{
                      flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
                      borderBottomWidth: 1, borderBottomColor: theme.border
                    }}>
                      <View style={[panelStyles.avatar, { backgroundColor: mStatus === 'approved' ? '#22c55e' : mStatus === 'pending_approval' ? '#f59e0b' : colors.primary }]}>
                        <Text style={panelStyles.avatarText}>{scout.name?.charAt(0)?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>{scout.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.subText }}>
                          {mStatus === 'approved' ? `✅ Aprobada hasta: ${mDate}` :
                           mStatus === 'pending_approval' ? `⏳ Pendiente: ${mDate}` :
                           mStatus === 'rejected' ? `❌ Rechazada: ${scout.membership_rejected_reason || 'Sin motivo'}` :
                           '📋 Sin membresía asignada'}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {/* Asignar / Modificar fecha */}
                        <TouchableOpacity
                          style={{ backgroundColor: '#7c3aed', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => {
                            setSelectedScoutForMembership(scout);
                            setMembershipDateInput(mDate || new Date().toISOString().split('T')[0]);
                            setShowMembershipModal(true);
                          }}
                        >
                          <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
                            {mStatus === 'none' || mStatus === 'rejected' ? '📅 Asignar' : '✏️ Editar'}
                          </Text>
                        </TouchableOpacity>
                        {/* Aprobar (solo jefe_grupo o para pending) */}
                        {user?.role === 'jefe_grupo' && mStatus === 'pending_approval' && (
                          <>
                            <TouchableOpacity
                              style={{ backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}
                              onPress={async () => {
                                await dataService.approveMembershipDate(scout.id);
                                showAlert('✅ Membresía Aprobada', `La membresía de ${scout.name} fue aprobada hasta el ${mDate}.`);
                                loadScouts();
                              }}
                            >
                              <CheckCircle size={14} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{ backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}
                              onPress={() => {
                                setSelectedScoutForMembership(scout);
                                setRejectReason('');
                                setShowRejectModal(true);
                              }}
                            >
                              <Ban size={14} color="white" />
                            </TouchableOpacity>
                          </>
                        )}
                        {/* Eliminar foto no institucional */}
                        {scout.avatar_url && (user?.role === 'scouter' || user?.role === 'jefe_grupo') && (
                          <TouchableOpacity
                            style={{ backgroundColor: '#dc2626', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8 }}
                            onPress={() => {
                              setPhotoRejectScout(scout);
                              setPhotoRejectReason('');
                              setShowPhotoRejectModal(true);
                            }}
                          >
                            <ImageOff size={14} color="white" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* MODAL ASIGNAR / EDITAR FECHA DE MEMBRESÍA */}
      <Modal visible={showMembershipModal} transparent animationType="fade" onRequestClose={() => setShowMembershipModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 24, borderRadius: 20 }]}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: theme.text, marginBottom: 4 }}>📅 Fecha de Membresía</Text>
            <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 16 }}>
              Scout: <Text style={{ fontWeight: 'bold', color: theme.text }}>{selectedScoutForMembership?.name}</Text>
            </Text>
            <Text style={[modalStyles.label, { color: theme.subText }]}>FECHA DE VENCIMIENTO DE MEMBRESÍA *</Text>
            <TouchableOpacity
              style={[
                modalStyles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.border,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  paddingHorizontal: 14,
                  marginBottom: 10
                }
              ]}
              onPress={() => setShowMembershipDatePicker(true)}
              activeOpacity={0.8}
            >
              <CalendarIcon size={18} color={primaryColor} style={{ marginRight: 10 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: 'bold' }}>
                  {formatDateWithDayOfWeek(membershipDateInput || new Date().toISOString().split('T')[0])}
                </Text>
                <Text style={{ color: theme.subText, fontSize: 11 }}>
                  Toca para seleccionar el día exacto en el calendario
                </Text>
              </View>
            </TouchableOpacity>

            <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#fffbeb', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: isDarkMode ? '#3f3f46' : '#fef08a', marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#fef08a' : '#92400e' }}>
                💡 Elige la fecha con el calendario interactivo.
                {user?.role === 'scouter' ? ' La fecha quedará en "Esperando Aprobación" hasta que Jefatura la valide.' : ' Como Jefe de Grupo, la fecha se aprobará de inmediato.'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <TouchableOpacity onPress={() => setShowMembershipModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: theme.subText }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: primaryColor, padding: 12, borderRadius: 10 }}
                onPress={async () => {
                  const finalDate = membershipDateInput || new Date().toISOString().split('T')[0];
                  if (!finalDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    showAlert('Formato Inválido', 'Por favor selecciona una fecha válida en el calendario.');
                    return;
                  }
                  if (user?.role === 'jefe_grupo') {
                    await dataService.proposeMembershipDate(selectedScoutForMembership.id, finalDate);
                    await dataService.approveMembershipDate(selectedScoutForMembership.id);
                  } else {
                    await dataService.proposeMembershipDate(selectedScoutForMembership.id, finalDate);
                  }
                  showAlert('Fecha Asignada', `Membresía registrada para ${selectedScoutForMembership?.name}: ${formatDateWithDayOfWeek(finalDate)}`);
                  setShowMembershipModal(false);
                  loadScouts();
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirmar Fecha</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PICKER DE CALENDARIO PARA MEMBRESÍA */}
      <Modal visible={showMembershipDatePicker} transparent animationType="fade" onRequestClose={() => setShowMembershipDatePicker(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 18, borderRadius: 20, maxWidth: 380, width: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <CalendarIcon size={18} color={primaryColor} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                  Vencimiento de Membresía
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMembershipDatePicker(false)} style={{ padding: 4 }}>
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <RNCalendar
              current={membershipDateInput || new Date().toISOString().split('T')[0]}
              markedDates={{
                [membershipDateInput || '']: { selected: true, selectedColor: primaryColor }
              }}
              onDayPress={(day: DateData) => {
                setMembershipDateInput(day.dateString);
                setShowMembershipDatePicker(false);
              }}
              theme={{
                calendarBackground: isDarkMode ? '#18181b' : '#ffffff',
                textSectionTitleColor: isDarkMode ? '#a1a1aa' : '#64748b',
                selectedDayBackgroundColor: primaryColor,
                todayTextColor: primaryColor,
                dayTextColor: isDarkMode ? '#ffffff' : '#1e293b',
                arrowColor: primaryColor,
                monthTextColor: isDarkMode ? '#ffffff' : primaryColor,
                textDayFontWeight: 'bold',
                textMonthFontWeight: 'bold',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL RECHAZAR MEMBRESÍA (SOLO JEFE DE GRUPO) */}
      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 24, borderRadius: 20 }]}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#ef4444', marginBottom: 12 }}>❌ Rechazar Membresía</Text>
            <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
              Scout: <Text style={{ fontWeight: 'bold', color: theme.text }}>{selectedScoutForMembership?.name}</Text>
            </Text>
            <Text style={[modalStyles.label, { color: theme.subText }]}>MOTIVO DEL RECHAZO *</Text>
            <TextInput
              style={[modalStyles.input, { height: 80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: Falta pago de registro de membresía nacional 2026"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              multiline
              value={rejectReason}
              onChangeText={setRejectReason}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowRejectModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: theme.subText }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#ef4444', padding: 12, borderRadius: 10 }}
                onPress={async () => {
                  if (!rejectReason.trim()) {
                    showAlert('Campo Obligatorio', 'Debes indicar el motivo del rechazo.');
                    return;
                  }
                  await dataService.rejectMembershipDate(selectedScoutForMembership.id, rejectReason.trim());
                  showAlert('Membresía Rechazada', `Se notificó a ${selectedScoutForMembership?.name} con el motivo especificado.`);
                  setShowRejectModal(false);
                  loadScouts();
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirmar Rechazo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL ELIMINAR FOTO NO INSTITUCIONAL */}
      <Modal visible={showPhotoRejectModal} transparent animationType="fade" onRequestClose={() => setShowPhotoRejectModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 24, borderRadius: 20 }]}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', color: '#dc2626', marginBottom: 12 }}>🚫 Eliminar Foto No Institucional</Text>
            <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
              Scout: <Text style={{ fontWeight: 'bold', color: theme.text }}>{photoRejectScout?.name}</Text>
            </Text>
            <Text style={[modalStyles.label, { color: theme.subText }]}>MOTIVO DE ELIMINACIÓN *</Text>
            <TextInput
              style={[modalStyles.input, { height: 80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: Foto con filtro de red social, no institucional"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              multiline
              value={photoRejectReason}
              onChangeText={setPhotoRejectReason}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowPhotoRejectModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: theme.subText }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: '#dc2626', padding: 12, borderRadius: 10 }}
                onPress={async () => {
                  if (!photoRejectReason.trim()) {
                    showAlert('Campo Obligatorio', 'Debes indicar por qué se elimina la foto.');
                    return;
                  }
                  await dataService.deleteProfilePhotoWithReason(photoRejectScout.id, photoRejectReason.trim());
                  showAlert('Foto Eliminada', `Se eliminó la foto de ${photoRejectScout?.name} y se le notificó el motivo.`);
                  setShowPhotoRejectModal(false);
                  loadScouts();
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Eliminar Foto</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PARA CREAR CICLO INSTITUCIONAL CIP / EVENTO CIP */}
      <Modal visible={showCipModal} transparent animationType="slide" onRequestClose={() => setShowCipModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Flag color={colors.primary} size={20} style={{ marginRight: 8 }} />
                <Text style={[modalStyles.title, { color: theme.text }]}>Registrar Ciclo Institucional (CIP)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCipModal(false)} style={{ padding: 6 }}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={[modalStyles.label, { color: theme.subText }]}>TÍTULO DEL CICLO INSTITUCIONAL (CIP) *</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: I Campamento Distrital / Indaba Regional 2026"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={cipTitle}
                onChangeText={setCipTitle}
              />

              <Text style={[modalStyles.label, { color: theme.subText }]}>ALCANCE / CATEGORÍA DEL CIP *</Text>
              <View style={modalStyles.scopeRow}>
                {(['distrital', 'regional', 'nacional', 'internacional'] as const).map((sc) => (
                  <TouchableOpacity
                    key={sc}
                    style={[
                      modalStyles.scopeChip,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      cipScope === sc && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setCipScope(sc)}
                  >
                    <Text style={[
                      modalStyles.scopeChipText,
                      { color: theme.subText },
                      cipScope === sc && { color: 'white', fontWeight: 'bold' }
                    ]}>
                      CIP {sc.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[modalStyles.label, { color: theme.subText }]}>FECHA DEL CICLO / EVENTO *</Text>
              <TouchableOpacity
                style={[
                  modalStyles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    marginBottom: 10
                  }
                ]}
                onPress={() => setShowCipDatePicker(true)}
                activeOpacity={0.8}
              >
                <CalendarIcon size={18} color={primaryColor} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: 'bold' }}>
                    {formatDateWithDayOfWeek(cipDate || new Date().toISOString().split('T')[0])}
                  </Text>
                  <Text style={{ color: theme.subText, fontSize: 11 }}>
                    Toca para abrir el calendario y ver días exactos (Sábados/Domingos)
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={[modalStyles.label, { color: theme.subText }]}>DESCRIPCIÓN Y DETALLES (OPCIONAL)</Text>
              <TextInput
                style={[modalStyles.input, { height: 70, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Detalles sobre la participación y objetivos..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                value={cipDesc}
                onChangeText={setCipDesc}
              />

              <TouchableOpacity
                style={modalStyles.saveBtn}
                onPress={handleSaveCip}
                disabled={savingCip}
              >
                {savingCip ? <ActivityIndicator color="white" /> : <Text style={modalStyles.saveBtnText}>Guardar Ciclo CIP</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 12, marginBottom: 20 }}
                onPress={() => setShowCipModal(false)}
              >
                <Text style={{ color: theme.subText, fontWeight: 'bold', fontSize: 14 }}>Cancelar y Volver</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PICKER DE CALENDARIO PARA EVENTOS CIP */}
      <Modal visible={showCipDatePicker} transparent animationType="fade" onRequestClose={() => setShowCipDatePicker(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 18, borderRadius: 20, maxWidth: 380, width: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Flag size={18} color={primaryColor} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                  Seleccionar Fecha del Evento CIP
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowCipDatePicker(false)} style={{ padding: 4 }}>
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <RNCalendar
              current={cipDate || new Date().toISOString().split('T')[0]}
              markedDates={{
                [cipDate || '']: { selected: true, selectedColor: primaryColor }
              }}
              onDayPress={(day: DateData) => {
                setCipDate(day.dateString);
                setShowCipDatePicker(false);
              }}
              theme={{
                calendarBackground: isDarkMode ? '#18181b' : '#ffffff',
                textSectionTitleColor: isDarkMode ? '#a1a1aa' : '#64748b',
                selectedDayBackgroundColor: primaryColor,
                todayTextColor: primaryColor,
                dayTextColor: isDarkMode ? '#ffffff' : '#1e293b',
                arrowColor: primaryColor,
                monthTextColor: isDarkMode ? '#ffffff' : primaryColor,
                textDayFontWeight: 'bold',
                textMonthFontWeight: 'bold',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* CERRAR SESIÓN */}
      <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]} onPress={signOut}>
        <LogOut size={16} color={colors.error} />
        <Text style={styles.logoutText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      {/* BOTÓN FLOTANTE DE AYUDA Y REPORTES */}
      <HelpFloatingFAB />

      <ThemeCustomizerModal
        visible={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scouterQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  scouterQuickBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  header: {
    backgroundColor: colors.primary,
    paddingTop: 50, paddingBottom: 28, paddingHorizontal: 24,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerGreeting: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  headerName: { color: 'white', fontSize: 26, fontWeight: 'bold', marginTop: 2 },
  unitBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, marginTop: 8,
  },
  unitBadgeText: { color: 'white', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  calendarIconBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', width: 44, height: 44,
    borderRadius: 22, justifyContent: 'center', alignItems: 'center',
  },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -16, gap: 10 },
  statCard: {
    flex: 1, borderRadius: 14, padding: 14,
    alignItems: 'center', borderTopWidth: 3,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  statNumber: { fontSize: 26, fontWeight: 'bold' },
  statLabel: { fontSize: 11, color: colors.textLight, marginTop: 2, textAlign: 'center' },
  scroll: { flex: 1, marginTop: 16 },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderTopWidth: 1,
  },
  logoutText: { color: colors.error, fontSize: 15, fontWeight: 'bold' },
});

const panelStyles = StyleSheet.create({
  wrapper: {
    borderRadius: 16, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 3, overflow: 'hidden', borderWidth: 1
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  addCipBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  addCipBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  badge: { backgroundColor: colors.primary, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  body: { paddingHorizontal: 16, paddingBottom: 12, borderTopWidth: 1 },
  empty: { color: '#aaa', textAlign: 'center', padding: 20, fontStyle: 'italic' },
  memberRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  avatarText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
  memberName: { fontSize: 16, fontWeight: 'bold' },
  memberSub: { fontSize: 12, marginTop: 2, marginBottom: 6 },
  stagesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  stagePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1 },
  stagePillText: { fontSize: 10, fontWeight: '600' },
  reviewBtn: { backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'center' },
  reviewBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  profileBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'center' },
  profileBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  activityRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  dateBox: { borderRadius: 10, width: 52, paddingVertical: 8, alignItems: 'center' },
  dateMonth: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  dateDay: { color: 'white', fontSize: 20, fontWeight: '900' },
  activityTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  cipPulseBadge: { backgroundColor: '#ef4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  cipPulseText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  activityDesc: { fontSize: 12, marginBottom: 4 },
  unitTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  unitTagText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  trashBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffebee',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  trashBtnConfirm: { backgroundColor: '#e53935' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 6, marginTop: 14 },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  scopeChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  scopeChipText: { fontSize: 11 },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 30 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
