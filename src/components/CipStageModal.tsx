import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { X, Flag, ShieldCheck, CheckSquare, Square, Clock } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { showAlert } from '../utils/alert';
import { formatDateEs } from '../utils/dateLocal';
import { NIVEL_LABEL, LEY_CONFIANZA, parseCipMeta } from '../lib/cipLogic';

interface Props {
  visible: boolean;
  onClose: () => void;
  stageId: string;
  req: { id: string; text: string; requiredCount?: number } | null;
  isReadOnly?: boolean;
}

/**
 * Lo que ve el joven en un requisito de CIP: los CIP que su Scouter le acreditó, sus
 * solicitudes de CIP anteriores a la app y el formulario para pedir uno (bajo la Ley Scout).
 */
export default function CipStageModal({ visible, onClose, stageId, req, isReadOnly }: Props) {
  const { user } = useAuth();
  const { theme, primaryColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [credited, setCredited] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const nivel = req?.id.match(/_cip_(distrital|regional|nacional)$/)?.[1] || 'distrital';
  const required = req?.requiredCount || 1;

  const load = useCallback(async () => {
    if (!user || !req) return;
    setLoading(true);
    try {
      const [sels, rows] = await Promise.all([
        dataService.getCipSelections(user.id, stageId, req.id),
        dataService.getCipRowsForScouts([user.id]),
      ]);
      setCredited(sels || []);
      setRequests(rows.filter(r => r.category === `cip_sol_${stageId}_${req.id}`));
    } finally {
      setLoading(false);
    }
  }, [user, req, stageId]);

  useEffect(() => { if (visible) { setShowForm(false); load(); } }, [visible, load]);

  const withdraw = async (r: any) => {
    try {
      await dataService.deleteOldCipRequest(r.id);
      load();
    } catch (e: any) {
      showAlert('No se pudo retirar', e?.message || 'Inténtalo de nuevo.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBg }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Flag color={primaryColor} size={20} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Ciclos Institucionales (CIP)</Text>
              {req && <Text style={{ fontSize: 12, color: theme.accentText, fontWeight: '700' }}>{req.text} · {credited.length} / {required} acreditados</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X color={theme.subText} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 18, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.info, { color: theme.subText, backgroundColor: theme.inputBg }]}>
              Tu Scouter marca tu asistencia a los CIP {NIVEL_LABEL[nivel]}es. Si fuiste a uno y no aparece aquí, avísale.
            </Text>

            {loading ? <ActivityIndicator color={primaryColor} /> : (
              <>
                <Text style={[styles.section, { color: theme.subText }]}>Acreditados</Text>
                {credited.length === 0 && <Text style={[styles.meta, { color: theme.subText }]}>Todavía no tienes CIP acreditados en este requisito.</Text>}
                {credited.map((c, i) => (
                  <View key={c.rowId || c.id || i} style={[styles.card, { borderColor: theme.border }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <CheckSquare size={18} color={primaryColor} />
                      <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{c.title}</Text>
                    </View>
                    <Text style={[styles.meta, { color: theme.subText }]}>
                      {[c.historico ? (c.year ? `Año ${c.year}` : '') : (c.date && /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? formatDateEs(c.date) : c.date), c.marcadoPor ? `Marcado por ${c.marcadoPor}` : ''].filter(Boolean).join(' · ')}
                    </Text>
                    {c.historico && (
                      <View style={[styles.tag, { backgroundColor: '#f59e0b22' }]}>
                        <Text style={{ color: '#b45309', fontSize: 12, fontWeight: '700' }}>Registro anterior a la app</Text>
                      </View>
                    )}
                  </View>
                ))}

                {requests.length > 0 && <Text style={[styles.section, { color: theme.subText }]}>Tus solicitudes</Text>}
                {requests.map(r => {
                  const meta = parseCipMeta(r.file_url);
                  const rejected = meta.estado === 'rechazada';
                  return (
                    <View key={r.id} style={[styles.card, { borderColor: rejected ? '#fecaca' : theme.border }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Clock size={16} color={rejected ? '#dc2626' : '#d97706'} />
                        <Text style={[styles.cardTitle, { color: theme.text, flex: 1 }]}>{r.title} ({meta.year || '—'})</Text>
                      </View>
                      <Text style={[styles.meta, { color: rejected ? '#dc2626' : '#b45309', fontWeight: '700' }]}>
                        {rejected ? `No aprobada${meta.motivo ? `: ${meta.motivo}` : ''}` : 'En revisión por tu Scouter'}
                      </Text>
                      {!isReadOnly && (
                        <TouchableOpacity onPress={() => withdraw(r)} style={{ alignSelf: 'flex-start', marginTop: 6 }} accessibilityRole="button">
                          <Text style={{ color: theme.subText, fontWeight: '700', fontSize: 13 }}>Retirar solicitud</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {!isReadOnly && credited.length + requests.filter(r => parseCipMeta(r.file_url).estado !== 'rechazada').length < required && (
                  showForm
                    ? <OldCipForm stageId={stageId} req={req!} nivel={nivel} onDone={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
                    : (
                      <TouchableOpacity style={[styles.outline, { borderColor: primaryColor }]} onPress={() => setShowForm(true)} accessibilityRole="button">
                        <Text style={{ color: theme.accentText, fontWeight: '800' }}>Solicitar un CIP anterior a la app</Text>
                        <Text style={[styles.meta, { color: theme.subText, textAlign: 'center' }]}>Para CIP a los que fuiste antes de usar la app. Lo revisa tu Scouter.</Text>
                      </TouchableOpacity>
                    )
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function OldCipForm({ stageId, req, nivel, onDone, onCancel }: { stageId: string; req: { id: string }; nivel: string; onDone: () => void; onCancel: () => void }) {
  const { user } = useAuth();
  const { theme, primaryColor } = useTheme();
  const [nombre, setNombre] = useState('');
  const [year, setYear] = useState('');
  const [scouter, setScouter] = useState('');
  const [nota, setNota] = useState('');
  const [ley, setLey] = useState(false);
  const [saving, setSaving] = useState(false);

  const send = async () => {
    if (!user) return;
    if (nombre.trim().length < 3) { showAlert('Falta el nombre', '¿A qué CIP fuiste? Escribe su nombre.'); return; }
    if (!/^(19|20)\d{2}$/.test(year.trim())) { showAlert('Falta el año', 'Escribe el año en que fuiste (por ejemplo 2024).'); return; }
    if (!ley) { showAlert('Ley Scout', 'Para enviar la solicitud confirma que la haces bajo la Ley Scout.'); return; }
    setSaving(true);
    try {
      await dataService.requestOldCip(user, { stageId, reqId: req.id }, { nombre, year: year.trim(), nivel, scouterEntonces: scouter, nota });
      showAlert('Solicitud enviada', 'Tu Scouter la revisará. Te llegará un aviso cuando la apruebe.');
      onDone();
    } catch (e: any) {
      showAlert('No se pudo enviar', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const input = [styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }];
  return (
    <View style={[styles.card, { borderColor: primaryColor, gap: 4 }]}>
      <Text style={[styles.cardTitle, { color: theme.text }]}>CIP {NIVEL_LABEL[nivel]} anterior a la app</Text>
      <Text style={[styles.label, { color: theme.subText }]}>¿A qué CIP fuiste?</Text>
      <TextInput value={nombre} onChangeText={setNombre} placeholder="Ej: Día Mundial de las Playas" placeholderTextColor={theme.subText} style={input} />
      <Text style={[styles.label, { color: theme.subText }]}>Año</Text>
      <TextInput value={year} onChangeText={setYear} placeholder="2024" placeholderTextColor={theme.subText} keyboardType="numeric" maxLength={4} style={input} />
      <Text style={[styles.label, { color: theme.subText }]}>¿Quién era tu Scouter? (opcional)</Text>
      <TextInput value={scouter} onChangeText={setScouter} placeholder="Nombre" placeholderTextColor={theme.subText} style={input} />
      <Text style={[styles.label, { color: theme.subText }]}>Algo que ayude a recordarlo (opcional)</Text>
      <TextInput value={nota} onChangeText={setNota} placeholder="Dónde fue, con quién fuiste…" placeholderTextColor={theme.subText} style={[input, { minHeight: 64, textAlignVertical: 'top', paddingTop: 10 }]} multiline />

      <TouchableOpacity style={[styles.law, { borderColor: primaryColor + '55', backgroundColor: primaryColor + '11' }]} onPress={() => setLey(v => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: ley }}>
        {ley ? <CheckSquare size={20} color={primaryColor} /> : <Square size={20} color={theme.subText} />}
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.text, fontSize: 13, lineHeight: 18 }}>Hago esta solicitud bajo la Ley Scout:</Text>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center', marginTop: 2 }}>
            <ShieldCheck size={14} color={primaryColor} />
            <Text style={{ color: theme.text, fontSize: 13, fontStyle: 'italic', fontWeight: '700', flex: 1 }}>«{LEY_CONFIANZA}»</Text>
          </View>
        </View>
      </TouchableOpacity>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <TouchableOpacity style={[styles.secondary, { borderColor: theme.border, flex: 1 }]} onPress={onCancel}>
          <Text style={{ color: theme.subText, fontWeight: '700' }}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor, flex: 2, opacity: ley ? 1 : 0.6 }]} onPress={send} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enviar a mi Scouter</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopLeftRadius: 22, borderTopRightRadius: 22, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  info: { fontSize: 13, lineHeight: 18, borderRadius: 10, padding: 12 },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 14.5, fontWeight: '700' },
  meta: { fontSize: 12.5, marginTop: 3, lineHeight: 17 },
  tag: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginTop: 6 },
  outline: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', gap: 2 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontSize: 15 },
  law: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 10 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, minHeight: 46, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, minHeight: 46, paddingHorizontal: 14 },
});
