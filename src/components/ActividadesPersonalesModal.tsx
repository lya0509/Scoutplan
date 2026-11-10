import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Lightbulb, Plus, Trash2, Calendar, CheckCircle2, X, Clock, CloudOff } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { dataService } from '../lib/dataService';
import { showAlert } from '../utils/alert';
import { todayLocal, formatDateEs } from '../utils/dateLocal';

interface Props {
  visible: boolean;
  onClose: () => void;
  scoutId: string;
  stageId: string;
  reqId: string;
  reqTitle?: string;
  requiredCount?: number;
  isReadOnly?: boolean;
  /** Se llama con el total registrado y, al agregar/borrar, con si el requisito quedó cumplido. */
  onProgressChange?: (total: number, isCompleted?: boolean) => void;
}

/**
 * Registro de las "Actividades Personales (de su propia creación)": el Rover anota
 * cuáles fueron (nombre, fecha y qué hizo) para que su Scouter las vea al revisar.
 * Al llegar a las requeridas, el requisito se marca solo.
 */
export function ActividadesPersonalesModal({
  visible,
  onClose,
  scoutId,
  stageId,
  reqId,
  reqTitle = 'Actividades Personales',
  requiredCount = 3,
  isReadOnly = false,
  onProgressChange,
}: Props) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  useModalBackHandler(visible, onClose);

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => todayLocal());
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible || !scoutId || !stageId || !reqId) return;
    let alive = true;
    setLoading(true);
    dataService.getPersonalActivities(scoutId, stageId, reqId)
      .then(data => {
        if (!alive) return;
        setEntries(data || []);
        onProgressChange?.((data || []).length);
        // Sin registros, abrir directamente el formulario
        if (!isReadOnly && (data || []).length === 0) setShowForm(true);
      })
      .catch(e => console.warn('Error cargando actividades personales:', e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, scoutId, stageId, reqId]);

  const total = entries.length;
  const reached = total >= requiredCount;
  const pct = Math.min(100, Math.round((total / Math.max(1, requiredCount)) * 100));

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDate(todayLocal());
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      showAlert('Falta el nombre', 'Escribe qué actividad creaste (por ejemplo: "Jornada de lectura en el ancianato").');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      showAlert('Fecha inválida', 'Escribe la fecha como AAAA-MM-DD (por ejemplo 2026-11-07).');
      return;
    }
    setSaving(true);
    try {
      const updated = await dataService.addPersonalActivity(scoutId, stageId, reqId, {
        title: title.trim(),
        date: date.trim(),
        description: description.trim(),
      });
      setEntries(updated);
      const newTotal = updated.length;
      const completed = newTotal >= requiredCount;
      // Solo se marca al cumplirse; si ya estaba marcado a mano, no se desmarca al agregar.
      if (completed) await dataService.toggleRequirement(scoutId, stageId, reqId, true);
      onProgressChange?.(newTotal, completed ? true : undefined);
      resetForm();
      setShowForm(false);
      showAlert(
        'Actividad guardada',
        completed
          ? `¡Requisito completo! Registraste ${newTotal} de ${requiredCount} actividades.`
          : `Llevas ${newTotal} de ${requiredCount} actividades.`,
      );
    } catch (e: any) {
      showAlert('Error', e?.message || 'No se pudo guardar la actividad.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: any) => {
    showAlert('Eliminar actividad', `¿Eliminar "${item.title}"?`, [
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await dataService.deletePersonalActivity(scoutId, stageId, reqId, item.id);
            setEntries(updated);
            const newTotal = updated.length;
            const completed = newTotal >= requiredCount;
            if (!completed) await dataService.toggleRequirement(scoutId, stageId, reqId, false);
            onProgressChange?.(newTotal, completed);
          } catch (e: any) {
            showAlert('Error', e?.message || 'No se pudo eliminar la actividad.');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme.text, borderColor: theme.border },
  ];
  const placeholderColor = isDarkMode ? '#71717a' : '#94a3b8';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: primaryColor + '20' }]}>
                <Lightbulb size={22} color={primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{reqTitle}</Text>
                <Text style={[styles.subtitle, { color: theme.subText }]}>Actividades que tú mismo ideaste y realizaste</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
            {/* Contador */}
            <View style={[styles.counterCard, { backgroundColor: theme.inputBg, borderColor: reached ? '#22c55e' : primaryColor + '50' }]}>
              <View style={styles.counterRow}>
                <Text style={[styles.counterValue, { color: reached ? '#16a34a' : primaryColor }]}>
                  {total} <Text style={[styles.counterOf, { color: theme.subText }]}>/ {requiredCount} actividades</Text>
                </Text>
                {reached ? (
                  <View style={[styles.badge, { backgroundColor: '#dcfce7' }]}>
                    <CheckCircle2 size={14} color="#16a34a" />
                    <Text style={[styles.badgeText, { color: '#166534' }]}>COMPLETO</Text>
                  </View>
                ) : (
                  <View style={[styles.badge, { backgroundColor: '#fef3c7' }]}>
                    <Clock size={13} color="#b45309" />
                    <Text style={[styles.badgeText, { color: '#92400e' }]}>FALTAN {requiredCount - total}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.track, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]}>
                <View style={[styles.bar, { width: `${pct}%`, backgroundColor: reached ? '#16a34a' : primaryColor }]} />
              </View>
            </View>

            {!isReadOnly && (
              <View style={{ marginTop: 14 }}>
                {!showForm ? (
                  <TouchableOpacity style={[styles.addBtn, { backgroundColor: primaryColor }]} onPress={() => setShowForm(true)} activeOpacity={0.85}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Agregar actividad</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.form, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                    <Text style={[styles.label, { color: theme.text }]}>¿QUÉ ACTIVIDAD CREASTE? *</Text>
                    <TextInput
                      style={inputStyle}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Ej: Taller de primeros auxilios para mi comunidad"
                      placeholderTextColor={placeholderColor}
                      maxLength={120}
                    />

                    <Text style={[styles.label, { color: theme.text, marginTop: 10 }]}>FECHA (AAAA-MM-DD) *</Text>
                    <TextInput
                      style={inputStyle}
                      value={date}
                      onChangeText={setDate}
                      placeholder="2026-11-07"
                      placeholderTextColor={placeholderColor}
                      maxLength={10}
                    />

                    <Text style={[styles.label, { color: theme.text, marginTop: 10 }]}>¿QUÉ HICISTE Y QUÉ LOGRASTE? (OPCIONAL)</Text>
                    <TextInput
                      style={[inputStyle, styles.textArea]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Objetivo, quiénes participaron, qué aprendiste…"
                      placeholderTextColor={placeholderColor}
                      multiline
                      maxLength={600}
                    />

                    <View style={styles.formActions}>
                      {total > 0 && (
                        <TouchableOpacity
                          style={[styles.secondaryBtn, { borderColor: theme.border }]}
                          onPress={() => { resetForm(); setShowForm(false); }}
                          disabled={saving}
                        >
                          <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Cancelar</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#16a34a' }]} onPress={handleAdd} disabled={saving}>
                        {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Guardar actividad</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Registradas ({total})</Text>

            {loading ? (
              <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 20 }} />
            ) : total === 0 ? (
              <View style={[styles.empty, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Lightbulb size={32} color={theme.subText} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Aún no hay actividades</Text>
                <Text style={[styles.emptySub, { color: theme.subText }]}>
                  {isReadOnly
                    ? 'El Rover no ha registrado actividades personales en esta etapa.'
                    : 'Anota cada actividad que ideaste y realizaste por tu cuenta.'}
                </Text>
              </View>
            ) : (
              entries.map(item => (
                <View key={item.id} style={[styles.entry, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.entryTitle, { color: theme.text }]}>{item.title}</Text>
                    <View style={styles.entryMeta}>
                      <Calendar size={13} color={theme.subText} />
                      <Text style={[styles.entryDate, { color: theme.subText }]}>{formatDateEs(item.date)}</Text>
                      {item.pending && (
                        <>
                          <CloudOff size={13} color="#d97706" />
                          <Text style={[styles.entryDate, { color: '#d97706' }]}>sin enviar</Text>
                        </>
                      )}
                    </View>
                    {item.description ? (
                      <Text style={[styles.entryDesc, { color: theme.subText }]}>{item.description}</Text>
                    ) : null}
                  </View>
                  {!isReadOnly && (
                    <TouchableOpacity
                      style={styles.deleteBtn}
                      onPress={() => handleDelete(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Eliminar ${item.title}`}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10, gap: 12 },
  headerIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  counterCard: { borderRadius: 16, borderWidth: 1.5, padding: 14 },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  counterValue: { fontSize: 28, fontWeight: '900' },
  counterOf: { fontSize: 15, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 12 },
  bar: { height: '100%', borderRadius: 4 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, minHeight: 44 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  form: { borderRadius: 14, borderWidth: 1, padding: 14 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.3, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  secondaryBtnText: { fontWeight: '700', fontSize: 14 },
  saveBtn: { flex: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  empty: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', padding: 22, alignItems: 'center', gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center' },
  entry: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8, gap: 10 },
  entryTitle: { fontSize: 14, fontWeight: '700' },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, flexWrap: 'wrap' },
  entryDate: { fontSize: 12, marginRight: 6 },
  entryDesc: { fontSize: 13, marginTop: 6, lineHeight: 18 },
  deleteBtn: { padding: 4 },
});
