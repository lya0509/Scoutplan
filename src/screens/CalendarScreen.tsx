import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Plus, X, Sun, Moon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { notificationService } from '../services/notificationService';
import NotificationHeaderBell from '../components/NotificationHeaderBell';
import { colors, UNIT_COLORS } from '../theme/colors';
import { useFocusEffect } from '@react-navigation/native';
import { showAlert } from '../utils/alert';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  unit: string;
  description: string;
}

const MONTH_MAP: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12'
};

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

export default function CalendarScreen() {
  const { user } = useAuth();
  const { isDarkMode, theme, toggleDarkMode } = useTheme();

  const isJefe = user?.role === 'jefe_grupo';
  const isScouter = user?.role === 'scouter';
  const isScout = user?.role === 'scout';
  const canSeeAllUnits = isJefe || isScouter;
  const userUnit = (user?.unit || 'clan').toLowerCase();

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitFilter, setUnitFilter] = useState<string>('all');

  // Estado de opacidad para el parpadeo ÚNICAMENTE del circulito del calendario
  const [blinkOpacity, setBlinkOpacity] = useState(1);

  const [modalVisible, setModalVisible] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [newEventUnit, setNewEventUnit] = useState(user?.unit?.toLowerCase() || 'tropa');
  const [newEventDate, setNewEventDate] = useState(selectedDate);
  const [showNewEventDatePicker, setShowNewEventDatePicker] = useState(false);

  // Intervalo continuo de parpadeo a 500ms para la pelotita del día en el calendario
  useEffect(() => {
    const interval = setInterval(() => {
      setBlinkOpacity(prev => (prev === 1 ? 0.15 : 1));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [user?.role, user?.unit])
  );

  const fetchEvents = async () => {
    setLoading(true);
    const combinedEvents: CalendarEvent[] = [];

    // 1. Cargar eventos manuales y eventos CIP de calendar_events
    try {
      let query = supabase.from('calendar_events').select('*').order('date', { ascending: true });
      if (isScout) {
        query = query.in('unit', [userUnit, 'grupo']);
      }
      const { data, error } = await query;
      if (!error && data) {
        combinedEvents.push(...data);
      }
    } catch (e) {
      console.warn('Aviso cargando calendar_events:', e);
    }

    // 2. Cargar actividades del Plan Trimestral (quarterly_plans)
    try {
      const { data: qpData, error: qpError } = await supabase.from('quarterly_plans').select('*');
      if (!qpError && qpData) {
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
            const mNum = MONTH_MAP[mNorm];
            if (!mNum) return;
            const dayNum = parseInt(act.day || '15', 10);
            const dStr = String(isNaN(dayNum) ? 15 : dayNum).padStart(2, '0');
            const dateStr = `${year}-${mNum}-${dStr}`;
            const unit = (qp.unit || userUnit).toLowerCase();

            // Jefatura y Scouter ven todas las unidades; Scout ve solo la suya
            if (canSeeAllUnits || unit === userUnit) {
              combinedEvents.push({
                id: `qp_${qp.id}_${act.id || Math.random()}`,
                title: `[Plan Trimestral ${qp.quarter}] ${act.activity}`,
                date: dateStr,
                unit: unit,
                description: `Lugar: ${act.place || 'Sede'} • Responsable: ${act.responsible || 'Scouter'}${act.planB ? ` • Plan B: ${act.planB}` : ''}`,
              });
            }
          });
        });
      }
    } catch (e) {
      console.warn('Aviso cargando quarterly_plans en calendario:', e);
    }

    // 3. Cargar programas de actividades (scout_programas)
    try {
      const { data: progData, error: progError } = await supabase.from('scout_programas').select('*');
      if (!progError && progData) {
        progData.forEach((p: any) => {
          if (!p.date || !p.title) return;
          const unit = (p.unit || 'clan').toLowerCase();
          const isSinodalMatch = p.is_sinodal && p.selected_units?.includes(userUnit);

          // Jefatura y Scouter ven todas las unidades; Scout ve solo la suya o sinodales
          if (canSeeAllUnits || unit === userUnit || isSinodalMatch) {
            combinedEvents.push({
              id: `prog_${p.id}`,
              title: `[Programa Scout] ${p.title}`,
              date: p.date,
              unit: unit,
              description: `Lugar: ${p.location || 'Por definir'} • Tipo: ${p.activity_type || p.activityType || 'Actividad'} • Responsable: ${p.creator_name || 'Scouter'}`,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Aviso cargando scout_programas en calendario:', e);
    }

    setEvents(combinedEvents);
    setLoading(false);
  };

  const handleOpenAddModal = () => {
    setNewEventDate(selectedDate);
    setModalVisible(true);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) {
      showAlert('Campo obligatorio', 'Por favor ingresa un título para el evento.');
      return;
    }
    if (!newEventDate.trim()) {
      showAlert('Campo obligatorio', 'Por favor ingresa una fecha válida en formato AAAA-MM-DD.');
      return;
    }

    const { error } = await supabase.from('calendar_events').insert({
      title: newEventTitle.trim(),
      description: newEventDesc.trim(),
      date: newEventDate.trim(),
      unit: newEventUnit,
      created_by: user?.id,
    });

    if (error) {
      showAlert('Error al crear evento', error.message);
    } else {
      // Enviar notificación en vivo por WebSockets
      notificationService.sendNotification({
        senderId: user?.id,
        groupName: user?.group_name || undefined,
        unit: newEventUnit === 'grupo' ? undefined : newEventUnit,
        title: '📅 Nueva Actividad de Calendario',
        message: `${newEventTitle.trim()} programada para el ${newEventDate.trim()} (${newEventUnit.toUpperCase()}).`,
        type: 'calendar'
      }).catch(() => {});

      setModalVisible(false);
      setNewEventTitle('');
      setNewEventDesc('');
      fetchEvents();
    }
  };

  const getMarkedDates = () => {
    const marked: Record<string, any> = {};

    // Agrupar eventos por fecha
    const eventsByDate: Record<string, CalendarEvent[]> = {};
    events.forEach(evt => {
      if (canSeeAllUnits && unitFilter !== 'all' && evt.unit !== unitFilter) {
        return;
      }
      if (!eventsByDate[evt.date]) eventsByDate[evt.date] = [];
      eventsByDate[evt.date].push(evt);
    });

    // Procesar cada fecha con eventos
    Object.keys(eventsByDate).forEach(dateStr => {
      const dayEvts = eventsByDate[dateStr];
      const hasCip = dayEvts.some(e => e.title?.includes('[CIP') || e.title?.includes('[6P'));
      
      const primaryEvt = dayEvts[0];
      const unitKey = primaryEvt.unit?.toLowerCase() || 'tropa';
      const unitColor = UNIT_COLORS[unitKey] || colors.primary;

      // Puntos múltiples por unidad abajo de la pelotita
      const dots = dayEvts.slice(0, 4).map(e => {
        const uKey = e.unit?.toLowerCase() || 'tropa';
        const uCol = UNIT_COLORS[uKey] || colors.primary;
        const isEcip = e.title?.includes('[CIP') || e.title?.includes('[6P');
        return {
          key: `${e.id}`,
          color: isEcip ? (blinkOpacity < 0.5 ? 'transparent' : uCol) : uCol
        };
      });

      // El círculo ("pelotita") del día toma el color de la unidad:
      // - Si tiene un CIP: ¡PARPADEA alternando transparencia!
      // - Si es evento normal: se mantiene SÓLIDO con el color de la unidad (sin parpadear).
      const circleColor = hasCip 
        ? (blinkOpacity < 0.5 ? (isDarkMode ? '#27272a' : '#cbd5e1') : unitColor) 
        : unitColor;

      marked[dateStr] = {
        selected: true,
        selectedColor: circleColor,
        dots: dots,
        marked: true,
      };
    });

    // Si la fecha seleccionada no tiene eventos, mostrar círculo morado por defecto
    if (!marked[selectedDate]) {
      marked[selectedDate] = {
        selected: true,
        selectedColor: colors.primary,
      };
    }

    return marked;
  };

  const filteredEvents = events.filter(evt => {
    const isDateMatch = evt.date === selectedDate;
    if (canSeeAllUnits && unitFilter !== 'all') {
      return isDateMatch && evt.unit?.toLowerCase() === unitFilter.toLowerCase();
    }
    return isDateMatch;
  });

  const canAddEvent = isJefe || isScouter;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Cabecera */}
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Calendario de Actividades</Text>
              <Text style={[styles.subtitle, { color: theme.subText }]}>
                {isJefe
                  ? 'Jefatura de Grupo • Vista global de todas las unidades'
                  : isScouter
                  ? `Dirigente Scout (${userUnit.toUpperCase()}) • Calendario general de unidades`
                  : `Rama ${userUnit.toUpperCase()} • Actividades de tu unidad`
                }
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <NotificationHeaderBell />
              <TouchableOpacity
                style={[styles.themeBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                onPress={toggleDarkMode}
              >
                {isDarkMode ? <Sun color="#f59e0b" size={20} /> : <Moon color="#64748b" size={20} />}
              </TouchableOpacity>
            </View>
          </View>

          {/* Filtro por unidad visible para Jefatura y Scouters */}
          {canSeeAllUnits && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.filterChip, unitFilter === 'all' && styles.filterChipActive]}
                onPress={() => setUnitFilter('all')}
              >
                <Text style={[styles.filterChipText, unitFilter === 'all' && styles.filterChipTextActive]}>Todas las Ramas</Text>
              </TouchableOpacity>
              {Object.keys(UNIT_COLORS).map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.filterChip, unitFilter === u && { backgroundColor: UNIT_COLORS[u] }]}
                  onPress={() => setUnitFilter(u)}
                >
                  <Text style={[styles.filterChipText, unitFilter === u && { color: 'white', fontWeight: 'bold' }]}>
                    {u.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Componente Calendario con pelotitas parpadeantes en CIP */}
        <View style={styles.calendarContainer}>
          <Calendar
            key={isDarkMode ? 'calendar-dark' : 'calendar-light'}
            current={selectedDate}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            markingType={'multi-dot'}
            markedDates={getMarkedDates()}
            theme={{
              calendarBackground: isDarkMode ? '#18181b' : '#ffffff',
              textSectionTitleColor: isDarkMode ? '#a1a1aa' : '#b6c1cd',
              selectedDayBackgroundColor: colors.primary,
              selectedDayTextColor: '#ffffff',
              todayTextColor: colors.primary,
              dayTextColor: isDarkMode ? '#ffffff' : '#2d4150',
              textDisabledColor: isDarkMode ? '#3f3f46' : '#d9e1e8',
              dotColor: colors.primary,
              selectedDotColor: '#ffffff',
              arrowColor: colors.primary,
              disabledArrowColor: '#d9e1e8',
              monthTextColor: isDarkMode ? '#ffffff' : colors.primary,
              indicatorColor: colors.primary,
              textDayFontWeight: 'bold',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: 'bold',
              textDayFontSize: 15,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 13
            }}
          />
        </View>

        {/* Leyenda de colores por Unidad */}
        <View style={[styles.legendContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.subText, width: '100%', marginBottom: 4 }}>
            COLORES POR UNIDAD (La pelotita del día parpadea si es un CIP):
          </Text>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ffb300' }]} />
            <Text style={[styles.legendText, { color: theme.text }]}>Manada (Amarillo)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#43a047' }]} />
            <Text style={[styles.legendText, { color: theme.text }]}>Tropa (Verde)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#1e88e5' }]} />
            <Text style={[styles.legendText, { color: theme.text }]}>Caminantes (Azul)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#e53935' }]} />
            <Text style={[styles.legendText, { color: theme.text }]}>Clan (Rojo)</Text>
          </View>
        </View>

        {/* Lista de eventos del día seleccionado (SÓLIDA, SIN PARPADEO NI DEGRADADO) */}
        <View style={styles.eventsSection}>
          <Text style={[styles.eventsTitle, { color: theme.text }]}>
            Actividades para el {selectedDate.split('-').reverse().join('/')}
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
          ) : filteredEvents.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <Text style={[styles.emptyText, { color: theme.subText }]}>No hay actividades programadas para este día.</Text>
            </View>
          ) : (
            filteredEvents.map(evt => {
              const isCip = evt.title?.includes('[CIP') || evt.title?.includes('[6P');
              const displayTitle = (evt.title || '').replace(/\[6P\s*/gi, '[CIP ').replace(/\b6P\b/gi, 'CIP');
              const displayDesc  = evt.description ? evt.description.replace(/\b6P\b/gi, 'CIP') : '';
              const uKey = evt.unit?.toLowerCase() || 'tropa';
              const uColor = UNIT_COLORS[uKey] || colors.primary;

              return (
                <View 
                  key={evt.id} 
                  style={[
                    styles.eventCard, 
                    { backgroundColor: theme.cardBg, borderColor: isCip ? uColor : theme.border }
                  ]}
                >
                  <View style={[styles.unitBar, { backgroundColor: uColor }]} />
                  <View style={styles.eventContent}>
                    <View style={styles.eventHeaderRow}>
                      <Text style={[styles.eventTitleText, { color: theme.text }]}>{displayTitle}</Text>
                      <View style={[styles.unitBadge, { backgroundColor: uColor }]}>
                        <Text style={styles.unitBadgeText}>{evt.unit.toUpperCase()}</Text>
                      </View>
                    </View>

                    {displayDesc ? (
                      <Text style={[styles.eventDescText, { color: theme.subText }]}>{displayDesc}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Botón flotante (+) solo para Scouter / Jefe de Grupo */}
      {canAddEvent && (
        <TouchableOpacity style={styles.fab} onPress={handleOpenAddModal}>
          <Plus color="white" size={28} />
        </TouchableOpacity>
      )}

      {/* Modal Agregar Evento */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Nuevo Evento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#666'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={[styles.label, { color: theme.subText }]}>TÍTULO DEL EVENTO *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: Campamento de Unidad / Indaba"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={newEventTitle}
                onChangeText={setNewEventTitle}
              />

              <Text style={[styles.label, { color: theme.subText }]}>FECHA DEL EVENTO *</Text>
              <TouchableOpacity
                style={[
                  styles.input,
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
                onPress={() => setShowNewEventDatePicker(true)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: 'bold' }}>
                    {formatDateWithDayOfWeek(newEventDate || selectedDate)}
                  </Text>
                  <Text style={{ color: theme.subText, fontSize: 11 }}>
                    Toca para ver el calendario (Lunes a Domingo)
                  </Text>
                </View>
              </TouchableOpacity>

              {/* MODAL PICKER DE CALENDARIO PARA NUEVO EVENTO */}
              <Modal visible={showNewEventDatePicker} transparent animationType="fade" onRequestClose={() => setShowNewEventDatePicker(false)}>
                <View style={styles.modalOverlay}>
                  <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 18, borderRadius: 20, maxWidth: 380, width: '92%' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                        Seleccionar Fecha del Evento
                      </Text>
                      <TouchableOpacity onPress={() => setShowNewEventDatePicker(false)} style={{ padding: 4 }}>
                        <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                      </TouchableOpacity>
                    </View>

                    <Calendar
                      current={newEventDate || selectedDate}
                      markedDates={{
                        [newEventDate || selectedDate]: { selected: true, selectedColor: colors.primary }
                      }}
                      onDayPress={(day: DateData) => {
                        setNewEventDate(day.dateString);
                        setShowNewEventDatePicker(false);
                      }}
                      theme={{
                        calendarBackground: isDarkMode ? '#18181b' : '#ffffff',
                        textSectionTitleColor: isDarkMode ? '#a1a1aa' : '#64748b',
                        selectedDayBackgroundColor: colors.primary,
                        todayTextColor: colors.primary,
                        dayTextColor: isDarkMode ? '#ffffff' : '#1e293b',
                        arrowColor: colors.primary,
                        monthTextColor: isDarkMode ? '#ffffff' : colors.primary,
                        textDayFontWeight: 'bold',
                        textMonthFontWeight: 'bold',
                      }}
                    />
                  </View>
                </View>
              </Modal>

              <Text style={[styles.label, { color: theme.subText }]}>DESCRIPCIÓN</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Detalles, lugar, lista de equipo necesario..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                numberOfLines={3}
                value={newEventDesc}
                onChangeText={setNewEventDesc}
              />

              <Text style={[styles.label, { color: theme.subText }]}>DESTINO / RAMA DEL EVENTO *</Text>
              <View style={styles.unitSelectorRow}>
                {[
                  { id: 'grupo', label: '⚜️ Todo el Grupo' },
                  { id: 'scouters', label: '👥 Solo Scouters (Asamblea)' },
                  { id: 'manada', label: '🟡 Manada' },
                  { id: 'tropa', label: '🟢 Tropa' },
                  { id: 'comunidad', label: '🔵 Caminantes' },
                  { id: 'clan', label: '🔴 Clan' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.unitChip,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      newEventUnit === item.id && { backgroundColor: UNIT_COLORS[item.id] || colors.primary, borderColor: UNIT_COLORS[item.id] || colors.primary }
                    ]}
                    onPress={() => setNewEventUnit(item.id)}
                  >
                    <Text style={[
                      styles.unitChipText,
                      { color: theme.subText },
                      newEventUnit === item.id && { color: 'white', fontWeight: 'bold' }
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddEvent}>
                <Text style={styles.saveBtnText}>Guardar Evento</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 22, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  themeBtn: { padding: 8, borderRadius: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e2e8f0', marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: 'white', fontWeight: 'bold' },

  calendarContainer: { margin: 16, borderRadius: 16, overflow: 'hidden', elevation: 2 },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 14, marginHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12 },

  eventsSection: { paddingHorizontal: 16 },
  eventsTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyCard: { padding: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 13 },
  eventCard: { flexDirection: 'row', borderRadius: 12, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  unitBar: { width: 6 },
  eventContent: { flex: 1, padding: 14 },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eventTitleText: { fontSize: 15, fontWeight: 'bold' },
  unitBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  unitBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  eventDescText: { fontSize: 12, marginTop: 2 },

  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: colors.primary, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: 'bold', marginTop: 14, marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14 },
  textArea: { height: 75, textAlignVertical: 'top' },
  unitSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  unitChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  unitChipText: { fontSize: 11 },
  saveBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 24, marginBottom: 30 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
