import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { Receipt, X, Camera, Trash2, CheckCircle2, XCircle, CloudOff, History, ImageIcon } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { dataService, MembershipReceipt, MembershipHistoryEntry } from '../lib/dataService';
import { pickImageUniversal } from '../utils/filePicker';
import { showAlert } from '../utils/alert';
import { formatDateEs } from '../utils/dateLocal';
import { SecureImage } from './SecureImage';
import { openFileUrl } from '../lib/fileUrl';

interface Props {
  visible: boolean;
  onClose: () => void;
  member: { id: string; name?: string } | null;
  /** 'self': el miembro sube su comprobante. 'leader': Scouter / Jefatura solo consultan. */
  mode: 'self' | 'leader';
}

const isoDay = (iso?: string) => (iso ? formatDateEs(iso.slice(0, 10)) : '');

/** Comprobante de pago ASV + historial de membresía año por año. */
export function MembershipRecordsModal({ visible, onClose, member, mode }: Props) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  useModalBackHandler(visible, onClose);

  const thisYear = new Date().getFullYear();
  const [loading, setLoading] = useState(true);
  const [receipts, setReceipts] = useState<MembershipReceipt[]>([]);
  const [history, setHistory] = useState<MembershipHistoryEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [year, setYear] = useState(String(thisYear));
  const [reference, setReference] = useState('');
  const [amount, setAmount] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!member?.id) return;
    setLoading(true);
    try {
      const r = await dataService.getMembershipRecords(member.id);
      setReceipts(r.receipts);
      setHistory(r.history);
    } catch (e) {
      console.warn('Error cargando membresía:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!visible) return;
    setShowForm(false);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, member?.id]);

  // Año -> { comprobantes, decisiones }
  const years = useMemo(() => {
    const map = new Map<string, { receipts: MembershipReceipt[]; history: MembershipHistoryEntry[] }>();
    const slot = (y: string) => {
      const k = y || 'Sin año';
      if (!map.has(k)) map.set(k, { receipts: [], history: [] });
      return map.get(k)!;
    };
    receipts.forEach(r => slot(r.year).receipts.push(r));
    history.forEach(h => slot(h.year).history.push(h));
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [receipts, history]);

  const resetForm = () => {
    setReference('');
    setAmount('');
    setImage(null);
    setYear(String(thisYear));
  };

  const handleSave = async () => {
    if (!member?.id) return;
    if (!image && !reference.trim()) {
      showAlert('Falta el comprobante', 'Adjunta la foto o captura del pago, o escribe el número de referencia.');
      return;
    }
    setSaving(true);
    try {
      const res = await dataService.addMembershipReceipt(member.id, { imageDataUrl: image, reference, amount, year });
      resetForm();
      setShowForm(false);
      await load();
      showAlert(
        'Comprobante guardado',
        res.pending
          ? 'Se guardó en tu teléfono y se enviará cuando vuelva la conexión.'
          : 'Tu Scouter y la Jefatura ya pueden verlo al registrar tu membresía.',
      );
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (r: MembershipReceipt) => {
    showAlert('Eliminar comprobante', `¿Eliminar el comprobante de ${r.year}?`, [
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await dataService.deleteMembershipReceipt(member!.id, r.id);
            setReceipts(prev => prev.filter(x => x.id !== r.id));
          } catch (e: any) {
            showAlert('Error', e?.message || 'No se pudo eliminar.');
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const openImage = (url: string) => { openFileUrl(url); };

  const inputStyle = [styles.input, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme.text, borderColor: theme.border }];
  const placeholderColor = isDarkMode ? '#71717a' : '#94a3b8';
  const okColor = isDarkMode ? '#86efac' : '#15803d';
  const badColor = isDarkMode ? '#fca5a5' : '#b91c1c';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIcon, { backgroundColor: primaryColor + '20' }]}>
                <Receipt size={22} color={primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
                  {mode === 'self' ? 'Mi membresía ASV' : `Membresía de ${member?.name || 'miembro'}`}
                </Text>
                <Text style={[styles.subtitle, { color: theme.subText }]}>Comprobantes de pago e historial por año</Text>
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

          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ padding: 16, paddingBottom: 30, gap: 14 }} keyboardShouldPersistTaps="handled">
            {mode === 'self' && !showForm && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: primaryColor }]}
                onPress={() => setShowForm(true)}
                accessibilityRole="button"
              >
                <Receipt size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>Subir comprobante de pago</Text>
              </TouchableOpacity>
            )}

            {mode === 'self' && showForm && (
              <View style={[styles.form, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={[styles.label, { color: theme.subText }]}>AÑO DE LA MEMBRESÍA</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  {[thisYear, thisYear + 1].map(y => {
                    const on = year === String(y);
                    return (
                      <TouchableOpacity
                        key={y}
                        onPress={() => setYear(String(y))}
                        style={[styles.chip, { borderColor: on ? primaryColor : theme.border, backgroundColor: on ? primaryColor : 'transparent' }]}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                      >
                        <Text style={{ color: on ? '#fff' : theme.text, fontWeight: '700' }}>{y}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: theme.subText }]}>FOTO O CAPTURA DEL PAGO</Text>
                {image ? (
                  <View style={{ marginBottom: 12 }}>
                    <Image source={{ uri: image }} style={[styles.preview, { borderColor: theme.border }]} resizeMode="contain" />
                    <TouchableOpacity onPress={() => setImage(null)} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
                      <Text style={{ color: badColor, fontWeight: '700', fontSize: 13 }}>Quitar imagen</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.pickBtn, { borderColor: theme.border }]}
                    onPress={() => pickImageUniversal(dataUrl => setImage(dataUrl), { maxWidth: 1400, maxHeight: 1400 })}
                    accessibilityRole="button"
                  >
                    <Camera size={18} color={primaryColor} />
                    <Text style={{ color: theme.text, fontWeight: '600' }}>Elegir imagen</Text>
                  </TouchableOpacity>
                )}

                <Text style={[styles.label, { color: theme.subText }]}>NÚMERO DE REFERENCIA</Text>
                <TextInput
                  style={[inputStyle, { marginBottom: 12 }]}
                  value={reference}
                  onChangeText={setReference}
                  placeholder="Ej: 004512879"
                  placeholderTextColor={placeholderColor}
                  maxLength={80}
                />
                <Text style={[styles.label, { color: theme.subText }]}>MONTO (OPCIONAL)</Text>
                <TextInput
                  style={inputStyle}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="Ej: 10 USD"
                  placeholderTextColor={placeholderColor}
                  maxLength={40}
                />
                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: theme.border }]}
                    onPress={() => { resetForm(); setShowForm(false); }}
                    disabled={saving}
                  >
                    <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.saveBtn, { backgroundColor: primaryColor }]} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Guardar comprobante</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {loading ? (
              <ActivityIndicator color={primaryColor} style={{ marginVertical: 24 }} />
            ) : years.length === 0 ? (
              <View style={[styles.empty, { borderColor: theme.border }]}>
                <History size={22} color={theme.subText} />
                <Text style={{ color: theme.subText, textAlign: 'center', fontSize: 13, lineHeight: 19 }}>
                  {mode === 'self'
                    ? 'Aún no hay comprobantes ni aprobaciones registradas. Sube tu comprobante para que tu Scouter registre la membresía.'
                    : 'Este miembro aún no tiene comprobantes ni aprobaciones registradas.'}
                </Text>
              </View>
            ) : (
              years.map(([y, data]) => (
                <View key={y} style={[styles.yearCard, { borderColor: theme.border }]}>
                  <Text style={[styles.yearTitle, { color: theme.text }]}>{y}</Text>

                  {data.history.map(h => (
                    <View key={h.id} style={styles.histRow}>
                      {h.status === 'approved'
                        ? <CheckCircle2 size={16} color={okColor} />
                        : <XCircle size={16} color={badColor} />}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: h.status === 'approved' ? okColor : badColor, fontWeight: '700', fontSize: 13 }}>
                          {h.status === 'approved' ? 'Aprobada' : 'Devuelta'}
                          {h.expiresAt ? ` · vence ${formatDateEs(h.expiresAt)}` : ''}
                        </Text>
                        <Text style={{ color: theme.subText, fontSize: 12 }}>
                          {isoDay(h.decidedAt)}{h.byName ? ` · por ${h.byName}` : ''}
                          {h.pending ? ' · sin enviar' : ''}
                        </Text>
                        {!!h.reason && <Text style={{ color: theme.text, fontSize: 12, marginTop: 2 }}>Motivo: {h.reason}</Text>}
                      </View>
                    </View>
                  ))}

                  {data.receipts.map(r => (
                    <View key={r.id} style={[styles.receiptRow, { backgroundColor: theme.inputBg }]}>
                      {r.imageUrl ? (
                        <TouchableOpacity onPress={() => openImage(r.imageUrl)} accessibilityRole="imagebutton" accessibilityLabel="Ver comprobante completo">
                          <SecureImage source={{ uri: r.imageUrl }} style={[styles.thumb, { borderColor: theme.border }]} />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.thumb, styles.thumbEmpty, { borderColor: theme.border }]}>
                          <ImageIcon size={18} color={theme.subText} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.text, fontWeight: '700', fontSize: 13 }}>Comprobante de pago</Text>
                        <Text style={{ color: theme.subText, fontSize: 12 }}>
                          {r.reference ? `Ref. ${r.reference}` : 'Sin referencia'}
                          {r.amount ? ` · ${r.amount}` : ''}
                        </Text>
                        <Text style={{ color: theme.subText, fontSize: 12 }}>
                          Enviado el {isoDay(r.createdAt) || formatDateEs(r.paidOn)}
                        </Text>
                        {r.pending && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <CloudOff size={12} color="#b45309" />
                            <Text style={{ color: '#b45309', fontSize: 11, fontWeight: '700' }}>Se enviará al volver la conexión</Text>
                          </View>
                        )}
                        {!!r.imageUrl && (
                          <TouchableOpacity onPress={() => openImage(r.imageUrl)} style={{ paddingVertical: 4 }}>
                            <Text style={{ color: theme.accentText, fontWeight: '700', fontSize: 12 }}>Ver imagen completa</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                      {mode === 'self' && (
                        <TouchableOpacity
                          onPress={() => handleDelete(r)}
                          accessibilityRole="button"
                          accessibilityLabel="Eliminar comprobante"
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          style={{ padding: 6 }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {data.history.length === 0 && (
                    <Text style={{ color: theme.subText, fontSize: 12 }}>Sin aprobación registrada para este año.</Text>
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
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, minHeight: 46 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14.5 },
  form: { borderRadius: 14, borderWidth: 1, padding: 14 },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8, minHeight: 40, justifyContent: 'center' },
  pickBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, minHeight: 56, marginBottom: 12 },
  preview: { width: '100%', height: 180, borderRadius: 10, borderWidth: 1, backgroundColor: '#00000010' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  secondaryBtnText: { fontWeight: '700', fontSize: 14 },
  saveBtn: { flex: 2, borderRadius: 12, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  empty: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 18, alignItems: 'center', gap: 8 },
  yearCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  yearTitle: { fontSize: 18, fontWeight: '900' },
  histRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  receiptRow: { flexDirection: 'row', gap: 12, alignItems: 'center', borderRadius: 12, padding: 10 },
  thumb: { width: 56, height: 56, borderRadius: 8, borderWidth: 1 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
});
