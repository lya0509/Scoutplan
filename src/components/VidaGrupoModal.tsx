import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import {
  Tent,
  Compass,
  HeartHandshake,
  MapPin,
  Calendar as CalendarIcon,
  Plus,
  Trash2,
  CheckCircle,
  X,
  Sparkles,
  Info
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { dataService } from '../lib/dataService';

export interface VidaGrupoEntry {
  id: string;
  type: 'peregrinaje' | 'campamento' | 'proyecto' | string;
  subtype?: string; // Ej: Cultural, Espiritual, Ecológico
  location: string;
  title: string;
  date: string;
  description?: string;
  createdAt: string;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  scoutId: string;
  stageId: string;
  req?: {
    id: string;
    text: string;
    type?: string;
    requiredCount?: number;
  } | null;
  reqId?: string;
  reqTitle?: string;
  requiredCount?: number;
  readOnly?: boolean;
  isReadOnly?: boolean;
  onProgressChange?: (totalCount: number, isCompleted: boolean) => void;
  onCompleteChange?: (completed: boolean) => void;
}

export function VidaGrupoModal({
  visible,
  onClose,
  scoutId,
  stageId,
  req,
  reqId: propReqId,
  reqTitle: propReqTitle,
  requiredCount: propRequiredCount,
  readOnly = false,
  isReadOnly = false,
  onProgressChange,
  onCompleteChange,
}: Props) {
  const { isDarkMode, theme } = useTheme();
  const effectiveReadOnly = readOnly || isReadOnly;
  const effectiveReqId = req?.id || propReqId || '';
  const effectiveReqTitle = req?.text || propReqTitle || '';

  // Detectar categoría de Vida de Grupo
  const reqTextLower = effectiveReqTitle.toLowerCase();
  const isPeregrinaje = reqTextLower.includes('peregrinaje');
  const isCampamento = reqTextLower.includes('campamento');
  const isProyecto = reqTextLower.includes('proyecto') || reqTextLower.includes('servicio');

  const targetType: 'peregrinaje' | 'campamento' | 'proyecto' = isPeregrinaje
    ? 'peregrinaje'
    : isCampamento
    ? 'campamento'
    : 'proyecto';

  // Cantidad requerida (ej: 1, 2 o 3)
  const requiredCount = propRequiredCount || req?.requiredCount || (reqTextLower.includes('3') ? 3 : reqTextLower.includes('2') ? 2 : 1);

  const [entries, setEntries] = useState<VidaGrupoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Campos de formulario
  const [title, setTitle] = useState('');
  const [subtype, setSubtype] = useState('Cultural'); // Para peregrinajes
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && effectiveReqId && scoutId) {
      loadEntries();
    }
  }, [visible, effectiveReqId, scoutId]);

  const loadEntries = async () => {
    if (!effectiveReqId) return;
    setLoading(true);
    try {
      const list = await dataService.getVidaGrupoLog(scoutId, stageId, effectiveReqId);
      setEntries((list || []) as VidaGrupoEntry[]);
      
      const isDone = (list || []).length >= requiredCount;
      if (onProgressChange) {
        onProgressChange((list || []).length, isDone);
      }
      if (onCompleteChange) {
        onCompleteChange(isDone);
      }
    } catch (e) {
      console.warn('Error cargando Vida de Grupo:', e);
    }
    setLoading(false);
  };

  const handleAddEntry = async () => {
    if (!effectiveReqId) return;

    if (isPeregrinaje) {
      if (!location.trim()) {
        showAlert('Campo requerido', 'Por favor indica a dónde fue el peregrinaje (lugar o destino).');
        return;
      }
    } else if (isCampamento) {
      if (!title.trim() && !location.trim()) {
        showAlert('Campo requerido', 'Por favor indica el nombre o lugar del campamento.');
        return;
      }
    } else {
      if (!title.trim()) {
        showAlert('Campo requerido', 'Por favor indica el nombre del proyecto de servicio del grupo.');
        return;
      }
    }

    if (!date.trim()) {
      showAlert('Fecha requerida', 'Por favor indica la fecha de realización.');
      return;
    }

    setSaving(true);
    try {
      const displayTitle = isPeregrinaje
        ? `Peregrinaje ${subtype}: ${location.trim()}`
        : isCampamento
        ? title.trim() || `Campamento en ${location.trim()}`
        : title.trim();

      const newEntry = await dataService.addVidaGrupoEntry(scoutId, stageId, effectiveReqId, {
        type: targetType,
        subtype: isPeregrinaje ? subtype : undefined,
        location: location.trim(),
        title: displayTitle,
        date: date.trim(),
        description: description.trim(),
      });

      const updatedList = [newEntry, ...entries];
      setEntries(updatedList as VidaGrupoEntry[]);

      // Limpiar formulario
      setTitle('');
      setLocation('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setShowAddForm(false);

      const isDone = updatedList.length >= requiredCount;
      if (onProgressChange) {
        onProgressChange(updatedList.length, isDone);
      }
      if (onCompleteChange) {
        onCompleteChange(isDone);
      }

      if (isDone) {
        await dataService.toggleRequirement(scoutId, stageId, effectiveReqId, true);
        showAlert(
          '¡Requisito Completado!',
          `Has registrado ${updatedList.length} de ${requiredCount} ${isPeregrinaje ? 'peregrinajes' : isCampamento ? 'campamentos' : 'proyectos'}. Requisito marcado como cumplido.`
        );
      } else {
        showAlert(
          'Registro Guardado',
          `Se registró exitosamente. Llevas ${updatedList.length} de ${requiredCount} completados.`
        );
      }
    } catch (err: any) {
      showAlert('Error', err?.message || 'No se pudo guardar el registro.');
    }
    setSaving(false);
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!effectiveReqId) return;
    try {
      await dataService.deleteVidaGrupoEntry(scoutId, stageId, effectiveReqId, entryId);
      const filtered = entries.filter(e => e.id !== entryId);
      setEntries(filtered);

      const isDone = filtered.length >= requiredCount;
      if (onProgressChange) {
        onProgressChange(filtered.length, isDone);
      }
      if (onCompleteChange) {
        onCompleteChange(isDone);
      }
      await dataService.toggleRequirement(scoutId, stageId, effectiveReqId, isDone);
    } catch (err: any) {
      showAlert('Error', err?.message || 'No se pudo eliminar.');
    }
  };

  const isCompleted = entries.length >= requiredCount;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
          {/* CABECERA */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
              {isPeregrinaje ? (
                <Compass size={22} color={colors.primary} />
              ) : isCampamento ? (
                <Tent size={22} color="#16a34a" />
              ) : (
                <HeartHandshake size={22} color="#8b5cf6" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                  {effectiveReqTitle || 'Vida de Grupo'}
                </Text>
                <Text style={{ fontSize: 11, color: isCompleted ? '#16a34a' : theme.subText, fontWeight: isCompleted ? 'bold' : 'normal' }}>
                  {isCompleted ? '✓ Requisito Cumplido' : `Registra ${requiredCount} ${isPeregrinaje ? 'peregrinaje(s)' : isCampamento ? 'campamento(s)' : 'proyecto(s)'}`}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 30 }}>
            {/* BADGE DE PROGRESO */}
            <View
              style={[
                styles.progressCard,
                {
                  backgroundColor: isCompleted
                    ? 'rgba(34, 197, 94, 0.12)'
                    : 'rgba(99, 102, 241, 0.08)',
                  borderColor: isCompleted ? '#22c55e' : colors.primary,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: isCompleted ? '#16a34a' : colors.primary }}>
                  {isCompleted ? '🎉 ¡Meta alcanzada!' : `Progreso: ${entries.length} de ${requiredCount}`}
                </Text>
                <View
                  style={{
                    backgroundColor: isCompleted ? '#16a34a' : colors.primary,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>
                    {Math.min(100, Math.round((entries.length / requiredCount) * 100))}%
                  </Text>
                </View>
              </View>
            </View>

            {/* BOTÓN O FORMULARIO PARA AGREGAR NUEVO REGISTRO */}
            {!effectiveReadOnly && (
              <View style={{ marginBottom: 16 }}>
                {!showAddForm ? (
                  <TouchableOpacity
                    style={[styles.openFormBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setShowAddForm(true)}
                    activeOpacity={0.8}
                  >
                    <Plus size={18} color="white" />
                    <Text style={styles.openFormBtnText}>
                      {isPeregrinaje
                        ? '+ Registrar Nuevo Peregrinaje'
                        : isCampamento
                        ? '+ Registrar Campamento'
                        : '+ Registrar Proyecto de Servicio'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View
                    style={[
                      styles.formBox,
                      { backgroundColor: theme.cardBg, borderColor: colors.primary },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={[styles.formHeaderTitle, { color: colors.primary }]}>
                        {isPeregrinaje
                          ? 'Nuevo Peregrinaje'
                          : isCampamento
                          ? 'Nuevo Campamento de Unidad/Grupo'
                          : 'Nuevo Proyecto de Servicio del Grupo'}
                      </Text>
                      <TouchableOpacity onPress={() => setShowAddForm(false)}>
                        <X size={18} color={theme.subText} />
                      </TouchableOpacity>
                    </View>

                    {/* CAMPOS ESPECÍFICOS PARA PEREGRINAJE */}
                    {isPeregrinaje && (
                      <>
                        <Text style={[styles.fieldLabel, { color: theme.text }]}>TIPO DE PEREGRINAJE *</Text>
                        <View style={styles.pillsRow}>
                          {['Cultural', 'Espiritual', 'Ecológico', 'Histórico', 'Urbano'].map(t => (
                            <TouchableOpacity
                              key={t}
                              style={[
                                styles.pill,
                                {
                                  backgroundColor: subtype === t ? colors.primary : theme.inputBg,
                                  borderColor: subtype === t ? colors.primary : theme.border,
                                },
                              ]}
                              onPress={() => setSubtype(t)}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: subtype === t ? 'bold' : 'normal',
                                  color: subtype === t ? 'white' : theme.text,
                                }}
                              >
                                {t}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <Text style={[styles.fieldLabel, { color: theme.text, marginTop: 10 }]}>
                          ¿DÓNDE FUE? (LUGAR O DESTINO) *
                        </Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                          placeholder="Ej: El Ávila / Parque Nacional San Esteban / Monumento Histórico"
                          placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                          value={location}
                          onChangeText={setLocation}
                        />
                      </>
                    )}

                    {/* CAMPOS ESPECÍFICOS PARA CAMPAMENTO */}
                    {isCampamento && (
                      <>
                        <Text style={[styles.fieldLabel, { color: theme.text }]}>
                          NOMBRE / MOTIVO DEL CAMPAMENTO *
                        </Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                          placeholder="Ej: Campamento de Unidad Rover / Campamento Anual de Grupo"
                          placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                          value={title}
                          onChangeText={setTitle}
                        />

                        <Text style={[styles.fieldLabel, { color: theme.text, marginTop: 10 }]}>
                          LUGAR O UBICACIÓN *
                        </Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                          placeholder="Ej: Hacienda La Calceta / Campo Escuela Scout"
                          placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                          value={location}
                          onChangeText={setLocation}
                        />
                      </>
                    )}

                    {/* CAMPOS ESPECÍFICOS PARA PROYECTO DE SERVICIO */}
                    {isProyecto && (
                      <>
                        <Text style={[styles.fieldLabel, { color: theme.text }]}>
                          NOMBRE DEL PROYECTO DE SERVICIO DEL GRUPO *
                        </Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                          placeholder="Ej: Restauración de Mobiliario de Sede / Jornada Ecológica de Grupo"
                          placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                          value={title}
                          onChangeText={setTitle}
                        />

                        <Text style={[styles.fieldLabel, { color: theme.text, marginTop: 10 }]}>
                          DESCRIPCIÓN DEL SERVICIO REALIZADO
                        </Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, height: 65 }]}
                          placeholder="Explica brevemente en qué consistió el aporte de servicio al grupo..."
                          placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                          multiline
                          value={description}
                          onChangeText={setDescription}
                        />
                      </>
                    )}

                    {/* CAMPO DE FECHA UNIVERSAL */}
                    <Text style={[styles.fieldLabel, { color: theme.text, marginTop: 10 }]}>
                      FECHA DE REALIZACIÓN (AAAA-MM-DD) *
                    </Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="AAAA-MM-DD (Ej: 2025-05-18)"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={date}
                      onChangeText={setDate}
                    />

                    {/* BOTÓN GUARDAR REGISTRO */}
                    <TouchableOpacity
                      style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                      onPress={handleAddEntry}
                      disabled={saving}
                      activeOpacity={0.85}
                    >
                      {saving ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text style={styles.saveBtnText}>Guardar Registro</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* LISTA DE REGISTROS YA GUARDADOS */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Registros Guardados ({entries.length})
            </Text>

            {loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
            ) : entries.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Info size={28} color={theme.subText} style={{ marginBottom: 6 }} />
                <Text style={[styles.emptyText, { color: theme.subText }]}>
                  {readOnly
                    ? 'El scout no ha registrado entradas para este requisito todavía.'
                    : 'Aún no has registrado ningún evento. Presiona el botón superior para agregar uno.'}
                </Text>
              </View>
            ) : (
              entries.map((item, idx) => (
                <View
                  key={item.id || idx}
                  style={[styles.entryCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={[styles.entryTitle, { color: theme.text }]}>
                        {item.title}
                      </Text>
                    </View>

                    {!!item.subtype && (
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold', marginBottom: 2 }}>
                        Tipo: {item.subtype}
                      </Text>
                    )}

                    {!!item.location && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                        <MapPin size={12} color={theme.subText} />
                        <Text style={{ fontSize: 11, color: theme.subText }}>{item.location}</Text>
                      </View>
                    )}

                    {item.description ? (
                      <Text style={{ fontSize: 11, color: theme.subText, marginVertical: 4 }}>
                        {item.description}
                      </Text>
                    ) : null}

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <CalendarIcon size={12} color={theme.subText} />
                      <Text style={{ fontSize: 11, color: theme.subText }}>Fecha: {item.date}</Text>
                    </View>
                  </View>

                  {!readOnly && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDeleteEntry(item.id)}
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 12,
  },
  content: {
    padding: 20,
  },
  progressCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  openFormBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  openFormBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  formBox: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
  },
  formHeaderTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 14,
  },
  saveBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptyBox: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    textAlign: 'center',
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  entryTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
});
