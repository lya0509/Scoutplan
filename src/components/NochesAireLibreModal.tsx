import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { Moon, Plus, Trash2, Calendar, MapPin, CheckCircle2, X, Tent, ChevronDown, ChevronUp, Clock } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';

interface Props {
  visible: boolean;
  onClose: () => void;
  scoutId: string;
  stageId: string;
  reqId: string;
  reqTitle?: string;
  requiredCount?: number;
  isReadOnly?: boolean;
  onProgressChange?: (totalNights: number, isCompleted: boolean) => void;
}

export function NochesAireLibreModal({
  visible,
  onClose,
  scoutId,
  stageId,
  reqId,
  reqTitle = 'Noches de Vida al Aire Libre',
  requiredCount = 10,
  isReadOnly = false,
  onProgressChange
}: Props) {
  const { isDarkMode, theme, primaryColor } = useTheme();

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);

  // Campos de formulario
  const [dateInput, setDateInput] = useState(() => new Date().toISOString().split('T')[0]);
  const [locationInput, setLocationInput] = useState('');
  const [nightsInput, setNightsInput] = useState(1);
  const [notesInput, setNotesInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && scoutId && stageId && reqId) {
      loadEntries();
    }
  }, [visible, scoutId, stageId, reqId]);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const data = await dataService.getNightsLog(scoutId, stageId, reqId);
      setEntries(data || []);
      
      const total = (data || []).reduce((acc: number, item: any) => acc + (item.nightsCount || 1), 0);
      if (onProgressChange) {
        onProgressChange(total, total >= requiredCount);
      }
    } catch (e) {
      console.warn('Error cargando noches:', e);
    } finally {
      setLoading(false);
    }
  };

  const totalNights = entries.reduce((acc, item) => acc + (item.nightsCount || 1), 0);
  const isTargetReached = totalNights >= requiredCount;
  const progressPct = Math.min(100, Math.round((totalNights / requiredCount) * 100));

  const handleAddEntry = async () => {
    if (!locationInput.trim()) {
      showAlert('Campo Requerido', 'Por favor ingresa el lugar o nombre del campamento/actividad.');
      return;
    }

    if (!dateInput.trim()) {
      showAlert('Fecha Requerida', 'Por favor ingresa la fecha en formato AAAA-MM-DD.');
      return;
    }

    setSaving(true);
    try {
      const updated = await dataService.addNightEntry(scoutId, stageId, reqId, {
        date: dateInput.trim(),
        location: locationInput.trim(),
        nightsCount: nightsInput,
        notes: notesInput.trim()
      });

      setEntries(updated);
      const newTotal = updated.reduce((acc, item) => acc + (item.nightsCount || 1), 0);
      const newCompleted = newTotal >= requiredCount;

      // Actualizar automáticamente el requisito
      await dataService.toggleRequirement(scoutId, stageId, reqId, newCompleted);

      if (onProgressChange) {
        onProgressChange(newTotal, newCompleted);
      }

      setLocationInput('');
      setNotesInput('');
      setNightsInput(1);
      setShowAddForm(false);

      showAlert(
        '🏕️ Noche Registrada',
        newCompleted
          ? `¡Felicitaciones! Has completado el requisito con un total de ${newTotal} de ${requiredCount} noches.`
          : `Se guardó tu registro de ${nightsInput} noche(s). Llevas ${newTotal} de ${requiredCount} noches.`
      );
    } catch (e: any) {
      showAlert('Error', e?.message || 'No se pudo guardar el registro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (isReadOnly) return;

    try {
      const updated = await dataService.deleteNightEntry(scoutId, stageId, reqId, entryId);
      setEntries(updated);
      const newTotal = updated.reduce((acc: number, item: any) => acc + (item.nightsCount || 1), 0);
      const newCompleted = newTotal >= requiredCount;

      await dataService.toggleRequirement(scoutId, stageId, reqId, newCompleted);

      if (onProgressChange) {
        onProgressChange(newTotal, newCompleted);
      }
    } catch (e: any) {
      showAlert('Error', e?.message || 'No se pudo eliminar el registro.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
          {/* CABECERA */}
          <View style={[styles.header, { borderBottomColor: theme?.border || '#e2e8f0' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 }}>
              <View style={[styles.headerIcon, { backgroundColor: primaryColor + '20' }]}>
                <Moon size={22} color={primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme?.text || '#0f172a' }]} numberOfLines={1}>
                  {reqTitle}
                </Text>
                <Text style={[styles.subtitle, { color: theme?.subText || '#64748b' }]}>
                  Registro oficial de pernoctas y campamentos
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* TARJETA CONTADOR EN VIVO */}
            <View style={[styles.counterCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: isTargetReached ? '#22c55e' : (primaryColor + '50') }]}>
              <View style={styles.counterRow}>
                <View>
                  <Text style={[styles.counterLabel, { color: theme?.subText || '#64748b' }]}>
                    TOTAL DE NOCHES AL AIRE LIBRE
                  </Text>
                  <Text style={[styles.counterValue, { color: isTargetReached ? '#16a34a' : primaryColor }]}>
                    {totalNights} <Text style={{ fontSize: 18, color: theme?.subText || '#64748b' }}>/ {requiredCount} noches</Text>
                  </Text>
                </View>

                {isTargetReached ? (
                  <View style={styles.reachedBadge}>
                    <CheckCircle2 size={16} color="#16a34a" style={{ marginRight: 4 }} />
                    <Text style={styles.reachedBadgeText}>COMPLETADO</Text>
                  </View>
                ) : (
                  <View style={styles.pendingBadge}>
                    <Clock size={14} color="#f59e0b" style={{ marginRight: 4 }} />
                    <Text style={styles.pendingBadgeText}>FALTAN {requiredCount - totalNights}</Text>
                  </View>
                )}
              </View>

              {/* Barra de progreso */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width: `${progressPct}%`,
                      backgroundColor: isTargetReached ? '#16a34a' : primaryColor
                    }
                  ]}
                />
              </View>
            </View>

            {/* BOTÓN / FORMULARIO PARA REGISTRAR NUEVA NOCHE */}
            {!isReadOnly && (
              <View style={{ marginVertical: 14 }}>
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: primaryColor }]}
                  onPress={() => setShowAddForm(prev => !prev)}
                  activeOpacity={0.8}
                >
                  <Plus size={18} color="white" style={{ marginRight: 6 }} />
                  <Text style={styles.addBtnText}>
                    {showAddForm ? 'Ocultar Formulario ▲' : 'Registrar Campamento / Noches ▼'}
                  </Text>
                </TouchableOpacity>

                {showAddForm && (
                  <View style={[styles.formContainer, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme?.border || '#e2e8f0' }]}>
                    <Text style={[styles.formHeader, { color: primaryColor }]}>
                      🏕️ Nuevo Registro de Pernocta
                    </Text>

                    <Text style={[styles.inputLabel, { color: theme?.text || '#0f172a' }]}>
                      FECHA (AAAA-MM-DD) *
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme?.text || '#0f172a', borderColor: theme?.border || '#d1d5db' }]}
                      value={dateInput}
                      onChangeText={setDateInput}
                      placeholder="2024-10-15"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#9ca3af'}
                    />

                    <Text style={[styles.inputLabel, { color: theme?.text || '#0f172a', marginTop: 10 }]}>
                      LUGAR O ACTIVIDAD *
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme?.text || '#0f172a', borderColor: theme?.border || '#d1d5db' }]}
                      value={locationInput}
                      onChangeText={setLocationInput}
                      placeholder="Ej: Campamento Anual El Jarillo / Parque Guatopo"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#9ca3af'}
                    />

                    <Text style={[styles.inputLabel, { color: theme?.text || '#0f172a', marginTop: 10 }]}>
                      CANTIDAD DE NOCHES *
                    </Text>
                    <View style={styles.nightsStepper}>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]}
                        onPress={() => setNightsInput(Math.max(1, nightsInput - 1))}
                      >
                        <Text style={[styles.stepperBtnText, { color: theme?.text || '#0f172a' }]}>-</Text>
                      </TouchableOpacity>

                      <Text style={[styles.stepperValue, { color: primaryColor }]}>
                        {nightsInput} {nightsInput === 1 ? 'noche' : 'noches'}
                      </Text>

                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]}
                        onPress={() => setNightsInput(Math.min(15, nightsInput + 1))}
                      >
                        <Text style={[styles.stepperBtnText, { color: theme?.text || '#0f172a' }]}>+</Text>
                      </TouchableOpacity>
                    </View>

                    <Text style={[styles.inputLabel, { color: theme?.text || '#0f172a', marginTop: 10 }]}>
                      OBSERVACIONES (OPCIONAL)
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme?.text || '#0f172a', borderColor: theme?.border || '#d1d5db' }]}
                      value={notesInput}
                      onChangeText={setNotesInput}
                      placeholder="Ej: Pernocta en carpa con la patrulla"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#9ca3af'}
                    />

                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: '#16a34a' }]}
                      onPress={handleAddEntry}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Text style={styles.saveBtnText}>💾 GUARDAR REGISTRO</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* LISTA DE NOCHES REGISTRADAS */}
            <Text style={[styles.sectionTitle, { color: theme?.text || '#0f172a' }]}>
              📜 Historial de Noches Registradas ({entries.length})
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 20 }} />
            ) : entries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme?.border || '#e2e8f0' }]}>
                <Tent size={36} color={theme?.subText || '#9ca3af'} style={{ marginBottom: 8 }} />
                <Text style={[styles.emptyTitle, { color: theme?.text || '#0f172a' }]}>
                  Aún no hay noches registradas
                </Text>
                <Text style={[styles.emptySub, { color: theme?.subText || '#64748b' }]}>
                  {isReadOnly
                    ? 'El scout no ha registrado noches de campamento para esta etapa.'
                    : 'Usa el botón "Registrar Campamento / Noches" para agregar las fechas de tus pernoctas.'}
                </Text>
              </View>
            ) : (
              entries.map((item, idx) => (
                <View
                  key={item.id || idx}
                  style={[
                    styles.entryCard,
                    {
                      backgroundColor: isDarkMode ? '#27272a' : '#ffffff',
                      borderColor: theme?.border || '#e2e8f0'
                    }
                  ]}
                >
                  <View style={styles.entryLeft}>
                    <View style={[styles.entryIconBox, { backgroundColor: primaryColor + '15' }]}>
                      <Tent size={18} color={primaryColor} />
                    </View>
                  </View>

                  <View style={{ flex: 1, marginHorizontal: 10 }}>
                    <Text style={[styles.entryLocation, { color: theme?.text || '#0f172a' }]}>
                      {item.location}
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Calendar size={13} color={theme?.subText || '#64748b'} style={{ marginRight: 3 }} />
                        <Text style={[styles.entryDate, { color: theme?.subText || '#64748b' }]}>
                          {item.date}
                        </Text>
                      </View>

                      <View style={[styles.nightsPill, { backgroundColor: primaryColor + '20' }]}>
                        <Moon size={11} color={primaryColor} style={{ marginRight: 3 }} />
                        <Text style={[styles.nightsPillText, { color: primaryColor }]}>
                          {item.nightsCount} {item.nightsCount === 1 ? 'Noche' : 'Noches'}
                        </Text>
                      </View>
                    </View>

                    {item.notes ? (
                      <Text style={[styles.entryNotes, { color: theme?.subText || '#64748b' }]}>
                        "{item.notes}"
                      </Text>
                    ) : null}
                  </View>

                  {!isReadOnly && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteEntry(item.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  counterCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  counterLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  counterValue: {
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 2,
  },
  reachedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16a34a20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reachedBadgeText: {
    color: '#16a34a',
    fontSize: 11,
    fontWeight: 'bold',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pendingBadgeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  addBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  formContainer: {
    marginTop: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  formHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  nightsStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveBtn: {
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  entryLeft: {
    justifyContent: 'center',
  },
  entryIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryLocation: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  entryDate: {
    fontSize: 11,
  },
  nightsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  nightsPillText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  entryNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 3,
  },
  deleteBtn: {
    padding: 6,
  },
});
