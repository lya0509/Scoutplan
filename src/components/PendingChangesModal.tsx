import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { X, RefreshCw, AlertTriangle, Clock, WifiOff, CheckCircle, Trash2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { outbox, OutboxOp, OutboxStatus } from '../lib/offline/outbox';
import { showAlert } from '../utils/alert';

/** Nombre legible para operaciones antiguas que se guardaron sin etiqueta. */
const TYPE_LABELS: Record<string, string> = {
  'row.insert': 'Registro nuevo',
  'row.update': 'Cambio de datos',
  'row.delete': 'Registro eliminado',
  'profile.mergeJson': 'Datos del perfil',
  'profile.photo': 'Foto de perfil',
  'requirement.set': 'Requisito marcado',
  'stage.setStatus': 'Estado de etapa',
  'certificates.replaceCategory': 'Registros de etapa',
  'certificate.upload': 'Certificado',
  'certificate.update': 'Certificado editado',
  'certificate.delete': 'Certificado eliminado',
  'quarterly.save': 'Plan trimestral',
};

function opLabel(op: OutboxOp) {
  const label = (op.label || '').trim().replace(/:\s*$/, '');
  return label || TYPE_LABELS[op.type] || 'Cambio guardado';
}

function timeAgo(ts: number) {
  const mins = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (mins < 1) return 'hace un momento';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'ayer' : `hace ${days} días`;
}

/** Traduce los errores técnicos más comunes a algo que el usuario entienda. */
function friendlyError(raw?: string) {
  const msg = (raw || '').toLowerCase();
  if (!msg) return 'No se pudo enviar.';
  if (msg.includes('row-level security') || msg.includes('permission') || msg.includes('42501')) {
    return 'El servidor no permitió este cambio (permisos). Avísale a tu dirigente.';
  }
  if (msg.includes('duplicate') || msg.includes('23505')) return 'Este registro ya existía en el servidor.';
  if (msg.includes('jwt') || msg.includes('session')) return 'Tu sesión venció. Cierra sesión y vuelve a entrar.';
  if (msg.includes('storage') || msg.includes('payload too large') || msg.includes('413')) {
    return 'El archivo es demasiado pesado para subirlo.';
  }
  return raw!.length > 140 ? `${raw!.slice(0, 140)}…` : raw!;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function PendingChangesModal({ visible, onClose }: Props) {
  const { theme, isDarkMode } = useTheme();
  const [ops, setOps] = useState<OutboxOp[]>([]);
  const [status, setStatus] = useState<OutboxStatus>(outbox.getStatus());
  const [busy, setBusy] = useState(false);

  useModalBackHandler(visible, onClose);

  const refresh = useCallback(() => {
    outbox.list().then(setOps).catch(() => setOps([]));
  }, []);

  useEffect(() => {
    if (!visible) return;
    refresh();
    // Cada cambio en la cola (enviado, falló, nuevo) vuelve a leer la lista
    return outbox.subscribe(s => {
      setStatus(s);
      refresh();
    });
  }, [visible, refresh]);

  const failed = ops.filter(o => o.failed);
  const pending = ops.filter(o => !o.failed);

  const sendNow = async () => {
    setBusy(true);
    try {
      if (failed.length > 0) await outbox.retryFailed();
      else await outbox.flush();
    } catch {
      // El estado de la cola ya refleja lo que pasó
    } finally {
      setBusy(false);
      refresh();
    }
  };

  const discardOne = (op: OutboxOp) => {
    showAlert(
      'Descartar cambio',
      `"${opLabel(op)}" no se enviará nunca y se borrará del teléfono. ¿Continuar?`,
      [
        { text: 'Descartar', style: 'destructive', onPress: () => { outbox.removeWhere(o => o.id === op.id).then(refresh); } },
        { text: 'Cancelar', style: 'cancel' },
      ],
    );
  };

  const muted = theme.subText;
  const errorBg = isDarkMode ? '#2a1215' : '#fef2f2';
  const errorBorder = isDarkMode ? '#7f1d1d' : '#fecaca';
  const errorText = isDarkMode ? '#fca5a5' : '#b91c1c';

  const renderOp = (op: OutboxOp, isFailed: boolean) => (
    <View
      key={op.id}
      style={[
        styles.row,
        { borderColor: isFailed ? errorBorder : theme.border, backgroundColor: isFailed ? errorBg : theme.cardBg },
      ]}
    >
      <View style={styles.rowIcon}>
        {isFailed ? <AlertTriangle size={16} color={errorText} /> : <Clock size={16} color={muted} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: theme.text }]} numberOfLines={2}>{opLabel(op)}</Text>
        <Text style={[styles.rowMeta, { color: muted }]}>
          {timeAgo(op.createdAt)}
          {!isFailed && op.attempts > 0 ? ` · ${op.attempts} ${op.attempts === 1 ? 'intento' : 'intentos'}` : ''}
        </Text>
        {isFailed && (
          <Text style={[styles.rowError, { color: errorText }]}>{friendlyError(op.lastError)}</Text>
        )}
      </View>
      {isFailed && (
        <TouchableOpacity
          onPress={() => discardOne(op)}
          accessibilityRole="button"
          accessibilityLabel={`Descartar ${opLabel(op)}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.discardBtn}
        >
          <Trash2 size={16} color={errorText} />
        </TouchableOpacity>
      )}
    </View>
  );

  const canSend = status.online && ops.length > 0 && !status.syncing && !busy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>Cambios pendientes</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={22} color={muted} />
            </TouchableOpacity>
          </View>

          <View style={[styles.statusRow, { backgroundColor: theme.inputBg }]}>
            {status.online
              ? (status.syncing ? <ActivityIndicator size="small" color={theme.primary} /> : <CheckCircle size={16} color="#16a34a" />)
              : <WifiOff size={16} color="#d97706" />}
            <Text style={[styles.statusText, { color: theme.text }]}>
              {!status.online
                ? 'Sin conexión: se enviarán solos al volver internet.'
                : status.syncing
                  ? 'Enviando…'
                  : ops.length === 0
                    ? 'Todo está enviado.'
                    : 'Con conexión. Puedes enviarlos ahora.'}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ padding: 16, gap: 8 }}>
            {ops.length === 0 && (
              <Text style={[styles.empty, { color: muted }]}>No hay nada esperando en este teléfono.</Text>
            )}
            {failed.length > 0 && (
              <Text style={[styles.section, { color: errorText }]}>
                Con error ({failed.length})
              </Text>
            )}
            {failed.map(op => renderOp(op, true))}
            {pending.length > 0 && (
              <Text style={[styles.section, { color: muted, marginTop: failed.length ? 8 : 0 }]}>
                Esperando envío ({pending.length}) · se envían en este orden
              </Text>
            )}
            {pending.map(op => renderOp(op, false))}
          </ScrollView>

          {ops.length > 0 && (
            <View style={[styles.footer, { borderTopColor: theme.border }]}>
              <TouchableOpacity
                onPress={sendNow}
                disabled={!canSend}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSend }}
                style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: canSend ? 1 : 0.5 }]}
              >
                {busy || status.syncing
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <RefreshCw size={16} color="#fff" />}
                <Text style={styles.primaryBtnText}>
                  {failed.length > 0 ? 'Reintentar todo' : 'Enviar ahora'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 460, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: '800' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginTop: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  statusText: { fontSize: 13, flexShrink: 1 },
  section: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
  empty: { textAlign: 'center', fontSize: 14, paddingVertical: 24 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 12, padding: 12 },
  rowIcon: { paddingTop: 1 },
  rowTitle: { fontSize: 14, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowError: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  discardBtn: { padding: 4 },
  footer: { padding: 16, borderTopWidth: 1 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 12, minHeight: 44 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
