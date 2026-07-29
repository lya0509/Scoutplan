import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Plus, X, Sun, Moon } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
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

export default function CalendarScreen() {
  const { user } = useAuth();
  const { isDarkMode, theme, toggleDarkMode } = useTheme();

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
    }, [])
  );

  const fetchEvents = async () => {
    setLoading(true);
    let query = supabase.from('calendar_events').select('*').order('date', { ascending: true });
    
    if (user?.role !== 'jefe_grupo') {
      query = query.in('unit', [user?.unit?.toLowerCase() || '', 'grupo']);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching calendar events:', error);
    } else {
      setEvents(data || []);
    }
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
      if (unitFilter !== 'all' && evt.unit !== unitFilter && user?.role === 'jefe_grupo') {
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
      const dots = dayEvts.map(e => {
        const isEcip = e.title?.includes('[CIP') || e.title?.includes('[6P');
        const uCol = UNIT_COLORS[e.unit?.toLowerCase()] || colors.primary;
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
    if (user?.role === 'jefe_grupo' && unitFilter !== 'all') {
      return isDateMatch && evt.unit?.toLowerCase() === unitFilter.toLowerCase();
    }
    return isDateMatch;
  });

  const canAddEvent = user?.role === 'scouter' || user?.role === 'jefe_grupo';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Cabecera */}
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Calendario de Actividades</Text>
              <Text style={[styles.subtitle, { color: theme.subText }]}>
                {user?.role === 'jefe_grupo'
                  ? 'Vista global de todas las unidades del grupo'
                  : `Eventos de tu unidad (${(user?.unit || 'Manada').toUpperCase()})`
                }
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.themeBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              onPress={toggleDarkMode}
            >
              {isDarkMode ? <Sun color="#f59e0b" size={20} /> : <Moon color="#64748b" size={20} />}
            </TouchableOpacity>
          </View>

          {user?.role === 'jefe_grupo' && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={[styles.filterChip, unitFilter === 'all' && styles.filterChipActive]}
                onPress={() => setUnitFilter('all')}
              >
                <Text style={[styles.filterChipText, unitFilter === 'all' && styles.filterChipTextActive]}>Todas</Text>
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

              <Text style={[styles.label, { color: theme.subText }]}>FECHA DEL EVENTO (AAAA-MM-DD) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="2026-07-28"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={newEventDate}
                onChangeText={setNewEventDate}
              />

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

              <Text style={[styles.label, { color: theme.subText }]}>UNIDAD DESTINO *</Text>
              <View style={styles.unitSelectorRow}>
                {Object.keys(UNIT_COLORS).map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[
                      styles.unitChip,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      newEventUnit === u && { backgroundColor: UNIT_COLORS[u], borderColor: UNIT_COLORS[u] }
                    ]}
                    onPress={() => setNewEventUnit(u)}
                  >
                    <Text style={[
                      styles.unitChipText,
                      { color: theme.subText },
                      newEventUnit === u && { color: 'white', fontWeight: 'bold' }
                    ]}>
                      {u.toUpperCase()}
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
