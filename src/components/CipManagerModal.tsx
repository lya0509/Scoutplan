import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { X, Plus, Flag, ChevronLeft, CheckSquare, Square, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { showAlert } from '../utils/alert';
import { todayLocal, formatDateEs } from '../utils/dateLocal';
import { NIVEL_LABEL, LEY_CONFIANZA, cipTargetFor, cipRequirement, parseCipMeta, CipTarget } from '../lib/cipLogic';

interface Member { id: string; name?: string; unit?: string }

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Jóvenes a los que este dirigente puede marcar asistencia (su unidad o su grupo). */
  members: Member[];
}

const NIVELES = ['distrital', 'regional', 'nacional'] as const;

/**
 * Gestionar CIP (Scouter y Jefatura):
 *  - Catálogo de CIP oficiales: crear y marcar la asistencia de los jóvenes.
 *  - Solicitudes de CIP anteriores a la app: aprobar o rechazar.
 */
export default function CipManagerModal({ visible, onClose, members }: Props) {
  const { user } = useAuth();
  const { theme, primaryColor, isDarkMode } = useTheme();
  const [tab, setTab] = useState<'cip' | 'solicitudes'>('cip');
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [missing, setMissing] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [statuses, setStatuses] = useState<Record<string, Record<string, string>>>({});
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const memberIds = useMemo(() => members.map(m => m.id), [members]);
  const nameOf = (id: string) => members.find(m => m.id === id)?.name || 'Joven';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cat, r, st] = await Promise.all([
        dataService.getCipCatalog(),
        dataService.getCipRowsForScouts(memberIds),
        Promise.all(memberIds.map(async id => [id, await dataService.getAllStageStatuses(id)] as const)),
      ]);
      setCatalog(cat.rows);
      setMissing(cat.missingTable);
      setRows(r);
      setStatuses(Object.fromEntries(st));
    } finally {
      setLoading(false);
    }
  }, [memberIds]);

  useEffect(() => { if (visible) load(); }, [visible, load]);

  const credited = useMemo(() => rows.filter(r => String(r.category).startsWith('cip_sel_')), [rows]);
  const requests = useMemo(() => rows.filter(r => String(r.category).startsWith('cip_sol_') && parseCipMeta(r.file_url).estado !== 'rechazada'), [rows]);

  const by = { id: user?.id, name: user?.name };

  const toggleAttendance = async (cip: any, m: Member, existing: any | null, target: CipTarget | null) => {
    setBusy(m.id);
    try {
      if (existing) {
        const stageId = String(existing.category).startsWith('cip_sel_rover_ciudadano_') ? 'rover_ciudadano' : String(existing.category).split('_')[2];
        const t = cipRequirement(stageId, existing.level);
        await dataService.unmarkCipAttendance(existing.id, m.id, { stageId, reqId: t?.reqId || '', required: t?.required || 1 });
      } else if (target) {
        await dataService.markCipAttendance(cip, m, target, by);
      }
      setRows(await dataService.getCipRowsForScouts(memberIds));
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const review = async (r: any, approve: boolean, motivo?: string) => {
    setBusy(r.id);
    try {
      await dataService.reviewOldCip(r, approve, by, motivo);
      setRows(await dataService.getCipRowsForScouts(memberIds));
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setBusy(null);
    }
  };

  const chip = (active: boolean) => [styles.chip, { borderColor: active ? primaryColor : theme.border, backgroundColor: active ? primaryColor : theme.cardBg }];
  const chipText = (active: boolean) => [styles.chipText, { color: active ? '#fff' : theme.text }];

  // ───────────── Vista: asistencia a un CIP ─────────────
  const renderAttendance = (cip: any) => (
    <View style={{ gap: 8 }}>
      <TouchableOpacity style={styles.back} onPress={() => setSelected(null)} accessibilityRole="button">
        <ChevronLeft size={18} color={primaryColor} />
        <Text style={{ color: theme.accentText, fontWeight: '700' }}>Volver a los CIP</Text>
      </TouchableOpacity>
      <Text style={[styles.cipName, { color: theme.text }]}>{cip.nombre}</Text>
      <Text style={[styles.meta, { color: theme.subText }]}>
        CIP {NIVEL_LABEL[cip.nivel]}{cip.fecha ? ` · ${formatDateEs(cip.fecha)}` : ''}{cip.lugar ? ` · ${cip.lugar}` : ''}
      </Text>
      <Text style={[styles.hint, { color: theme.subText }]}>Marca quiénes asistieron. Cuenta para el requisito de CIP {NIVEL_LABEL[cip.nivel]} de la etapa que cada joven está cursando.</Text>
      {members.length === 0 && <Text style={[styles.empty, { color: theme.subText }]}>No tienes jóvenes en tu lista.</Text>}
      {members.map(m => {
        const existing = credited.find(r => r.scout_id === m.id && parseCipMeta(r.file_url).eventId === cip.id) || null;
        const target = existing ? null : cipTargetFor(statuses[m.id] || {}, cip.nivel);
        const count = target ? credited.filter(r => r.scout_id === m.id && r.category === `cip_sel_${target.stageId}_${target.reqId}`).length : 0;
        const full = !!target && count >= target.required;
        const disabled = !existing && (!target || full);
        const reason = existing
          ? 'Asistencia marcada'
          : !target ? `Su etapa actual no pide CIP ${NIVEL_LABEL[cip.nivel]}`
          : full ? `Ya completó ${target.reqText}`
          : `Contará para ${target.stageName} · ${count}/${target.required}`;
        return (
          <TouchableOpacity
            key={m.id}
            style={[styles.memberRow, { borderColor: theme.border, backgroundColor: theme.cardBg, opacity: disabled ? 0.55 : 1 }]}
            onPress={() => !disabled && toggleAttendance(cip, m, existing, target)}
            disabled={disabled || busy === m.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!existing, disabled }}
          >
            {busy === m.id ? <ActivityIndicator size="small" color={primaryColor} />
              : existing ? <CheckSquare size={22} color={primaryColor} /> : <Square size={22} color={theme.subText} />}
            <View style={{ flex: 1 }}>
              <Text style={[styles.memberName, { color: theme.text }]}>{m.name || 'Sin nombre'}</Text>
              <Text style={[styles.meta, { color: existing ? primaryColor : theme.subText }]}>{reason}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ───────────── Vista: catálogo ─────────────
  const renderCatalog = () => (
    <View style={{ gap: 10 }}>
      {missing ? (
        <Text style={[styles.warn, { color: isDarkMode ? '#fcd34d' : '#92400e', backgroundColor: isDarkMode ? '#2a1f05' : '#fffbeb' }]}>
          Falta activar el catálogo de CIP en la base de datos (supabase_cip_oficiales.sql).
        </Text>
      ) : showForm ? (
        <NewCipForm onCancel={() => setShowForm(false)} onCreated={() => { setShowForm(false); load(); }} />
      ) : (
        <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor }]} onPress={() => setShowForm(true)} accessibilityRole="button">
          <Plus size={18} color="#fff" />
          <Text style={styles.primaryText}>Nuevo CIP</Text>
        </TouchableOpacity>
      )}
      {!missing && catalog.length === 0 && !showForm && (
        <Text style={[styles.empty, { color: theme.subText }]}>Aún no hay CIP en el catálogo. Crea el primero con «Nuevo CIP».</Text>
      )}
      {catalog.filter(c => c.active !== false).map(c => {
        const n = credited.filter(r => parseCipMeta(r.file_url).eventId === c.id).length;
        return (
          <TouchableOpacity
            key={c.id}
            style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => setSelected(c)}
            accessibilityRole="button"
            accessibilityLabel={`Marcar asistencia a ${c.nombre}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Flag size={16} color={primaryColor} />
              <Text style={[styles.cipName, { color: theme.text, flex: 1 }]} numberOfLines={2}>{c.nombre}</Text>
              <View style={[styles.badge, { backgroundColor: primaryColor + '22' }]}>
                <Text style={[styles.badgeText, { color: theme.accentText }]}>{NIVEL_LABEL[c.nivel]}</Text>
              </View>
            </View>
            <Text style={[styles.meta, { color: theme.subText }]}>
              {[c.fecha ? formatDateEs(c.fecha) : '', c.lugar || '', c.group_name ? 'Solo tu grupo' : 'Oficial'].filter(Boolean).join(' · ')}
            </Text>
            <Text style={[styles.meta, { color: n ? primaryColor : theme.subText, marginTop: 4, fontWeight: '700' }]}>
              {n ? `${n} asistencia${n === 1 ? '' : 's'} marcada${n === 1 ? '' : 's'}` : 'Toca para marcar asistencia'}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  // ───────────── Vista: solicitudes de CIP anteriores ─────────────
  const renderRequests = () => (
    <View style={{ gap: 10 }}>
      {requests.length === 0 && <Text style={[styles.empty, { color: theme.subText }]}>No hay solicitudes pendientes.</Text>}
      {requests.map(r => <RequestCard key={r.id} r={r} name={nameOf(r.scout_id)} busy={busy === r.id} onReview={review} />)}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBg }]}>
          <Flag size={20} color={primaryColor} />
          <Text style={[styles.title, { color: theme.text }]}>Gestionar CIP</Text>
          <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar">
            <X size={22} color={theme.subText} />
          </TouchableOpacity>
        </View>
        <View style={[styles.tabs, { backgroundColor: theme.inputBg }]}>
          {([['cip', 'CIP'], ['solicitudes', `Solicitudes${requests.length ? ` (${requests.length})` : ''}`]] as const).map(([t, label]) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && { backgroundColor: theme.cardBg }]} onPress={() => { setTab(t); setSelected(null); }} accessibilityRole="tab" accessibilityState={{ selected: tab === t }}>
              <Text style={[styles.tabText, { color: tab === t ? theme.text : theme.subText }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {loading ? <ActivityIndicator style={{ marginTop: 30 }} color={primaryColor} />
            : tab === 'solicitudes' ? renderRequests()
            : selected ? renderAttendance(selected)
            : renderCatalog()}
        </ScrollView>
      </View>
    </Modal>
  );
}

function NewCipForm({ onCancel, onCreated }: { onCancel: () => void; onCreated: () => void }) {
  const { user } = useAuth();
  const { theme, primaryColor } = useTheme();
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(todayLocal());
  const [lugar, setLugar] = useState('');
  const [nivel, setNivel] = useState<typeof NIVELES[number]>('distrital');
  const [saving, setSaving] = useState(false);
  const isGroup = user?.role === 'jefe_grupo' || user?.role === 'scouter';

  const save = async () => {
    if (nombre.trim().length < 3) { showAlert('Falta el nombre', 'Escribe el nombre del CIP (por ejemplo: Día Mundial de las Playas 2026).'); return; }
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) { showAlert('Fecha', 'Escribe la fecha como AAAA-MM-DD (por ejemplo 2026-09-20).'); return; }
    setSaving(true);
    try {
      await dataService.createCipOficial({ nombre, fecha, lugar, nivel }, user);
      onCreated();
    } catch (e: any) {
      showAlert('No se pudo crear', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const input = [styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }];
  const chip = (active: boolean) => [styles.chip, { borderColor: active ? primaryColor : theme.border, backgroundColor: active ? primaryColor : theme.cardBg }];
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border, gap: 6 }]}>
      <Text style={[styles.cipName, { color: theme.text }]}>Nuevo CIP</Text>
      {isGroup && <Text style={[styles.hint, { color: theme.subText }]}>Mientras no haya Comisionado en la app, este CIP lo verá solo tu grupo.</Text>}
      <Text style={[styles.label, { color: theme.subText }]}>Nombre</Text>
      <TextInput value={nombre} onChangeText={setNombre} placeholder="Día Mundial de las Playas 2026" placeholderTextColor={theme.subText} style={input} />
      <Text style={[styles.label, { color: theme.subText }]}>Nivel</Text>
      <View style={styles.wrap}>
        {NIVELES.map(n => (
          <TouchableOpacity key={n} style={chip(nivel === n)} onPress={() => setNivel(n)}>
            <Text style={[styles.chipText, { color: nivel === n ? '#fff' : theme.text }]}>{NIVEL_LABEL[n]}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.label, { color: theme.subText }]}>Fecha (AAAA-MM-DD)</Text>
      <TextInput value={fecha} onChangeText={setFecha} placeholder="2026-09-20" placeholderTextColor={theme.subText} style={input} autoCapitalize="none" />
      <Text style={[styles.label, { color: theme.subText }]}>Lugar (opcional)</Text>
      <TextInput value={lugar} onChangeText={setLugar} placeholder="Playa Los Caracas" placeholderTextColor={theme.subText} style={input} />
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
        <TouchableOpacity style={[styles.secondary, { borderColor: theme.border, flex: 1 }]} onPress={onCancel}>
          <Text style={{ color: theme.subText, fontWeight: '700' }}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor, flex: 2 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Crear CIP</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RequestCard({ r, name, busy, onReview }: { r: any; name: string; busy: boolean; onReview: (r: any, approve: boolean, motivo?: string) => void }) {
  const { theme, primaryColor } = useTheme();
  const [rejecting, setRejecting] = useState(false);
  const [motivo, setMotivo] = useState('');
  const meta = parseCipMeta(r.file_url);
  const stageId = meta.stageId || (String(r.category).startsWith('cip_sol_rover_ciudadano_') ? 'rover_ciudadano' : String(r.category).split('_')[2]);
  const target = cipRequirement(stageId, r.level);
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border, gap: 4 }]}>
      <Text style={[styles.memberName, { color: theme.text }]}>{name}</Text>
      <Text style={[styles.cipName, { color: theme.text }]}>{r.title}</Text>
      <Text style={[styles.meta, { color: theme.subText }]}>
        CIP {NIVEL_LABEL[r.level] || r.level} · {meta.year || 'año sin indicar'}{target ? ` · para ${target.stageName}` : ''}
      </Text>
      {!!meta.scouterEntonces && <Text style={[styles.meta, { color: theme.subText }]}>Su Scouter en ese momento: {meta.scouterEntonces}</Text>}
      {!!meta.nota && <Text style={[styles.meta, { color: theme.text }]}>«{meta.nota}»</Text>}
      <View style={[styles.law, { borderColor: primaryColor + '55', backgroundColor: primaryColor + '11' }]}>
        <ShieldCheck size={16} color={primaryColor} />
        <Text style={[styles.lawText, { color: theme.text }]}>Lo solicitó bajo la Ley Scout: «{LEY_CONFIANZA}»</Text>
      </View>
      {rejecting ? (
        <View style={{ gap: 8, marginTop: 6 }}>
          <TextInput
            value={motivo}
            onChangeText={setMotivo}
            placeholder="Motivo (opcional)"
            placeholderTextColor={theme.subText}
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }]}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={[styles.secondary, { borderColor: theme.border, flex: 1 }]} onPress={() => setRejecting(false)}>
              <Text style={{ color: theme.subText, fontWeight: '700' }}>Volver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.primary, { backgroundColor: '#dc2626', flex: 1 }]} onPress={() => onReview(r, false, motivo)} disabled={busy}>
              <Text style={styles.primaryText}>Rechazar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <TouchableOpacity style={[styles.secondary, { borderColor: theme.border, flex: 1 }]} onPress={() => setRejecting(true)} disabled={busy}>
            <Text style={{ color: '#dc2626', fontWeight: '700' }}>Rechazar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primary, { backgroundColor: '#16a34a', flex: 1.4 }]} onPress={() => onReview(r, true)} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Aprobar</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4, margin: 16, marginBottom: 0 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 9, minHeight: 40 },
  tabText: { fontSize: 14, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 48, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  cipName: { fontSize: 15, fontWeight: '800' },
  meta: { fontSize: 12.5, marginTop: 2, lineHeight: 17 },
  hint: { fontSize: 12.5, lineHeight: 17 },
  empty: { textAlign: 'center', marginTop: 20, fontSize: 14 },
  warn: { fontSize: 13, lineHeight: 18, borderRadius: 10, padding: 12 },
  badge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, minHeight: 56 },
  memberName: { fontSize: 14.5, fontWeight: '700' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, minHeight: 46, paddingHorizontal: 14 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, minHeight: 46, paddingHorizontal: 14 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 44, fontSize: 15 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, minHeight: 36, justifyContent: 'center' },
  chipText: { fontSize: 13, fontWeight: '600' },
  law: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderWidth: 1, borderRadius: 10, padding: 10, marginTop: 6 },
  lawText: { flex: 1, fontSize: 12.5, lineHeight: 17, fontStyle: 'italic' },
});
