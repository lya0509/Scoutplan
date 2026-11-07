import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { UserCheck, UserX, Hourglass } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { showAlert } from '../utils/alert';
import { formatDateEs, ageFrom } from '../utils/dateLocal';

export interface PendingMember {
  id: string;
  name?: string;
  email?: string;
  unit?: string;
  cedula?: string;
  birth_date?: string;
  created_at?: string;
  account_status?: string | null;
}

interface Props {
  members: PendingMember[];
  groupName?: string | null;
  /** Se llama después de aprobar o rechazar, para recargar la lista. */
  onChanged: () => void;
}

/**
 * Cuentas nuevas en revisión (y las rechazadas, por si fue un error). Solo aparece si hay
 * alguna. Aprobar = la persona ya puede ver los datos de su grupo.
 */
export function PendingAccountsCard({ members, groupName, onChanged }: Props) {
  const { theme, isDarkMode } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);
  if (!members.length) return null;

  const pending = members.filter(m => m.account_status === 'pending');
  const rejected = members.filter(m => m.account_status === 'rejected');

  const act = (m: PendingMember, status: 'approved' | 'rejected') => {
    const go = async () => {
      setBusy(m.id + status);
      try {
        await dataService.setAccountStatus(m.id, status, groupName);
        onChanged();
      } catch (e: any) {
        showAlert('No se pudo guardar', e?.message || 'Inténtalo de nuevo.');
      } finally {
        setBusy(null);
      }
    };
    if (status === 'approved') { go(); return; }
    showAlert('Rechazar cuenta', `¿Rechazar el acceso de ${m.name || 'esta persona'}? No verá nada del grupo. Puedes aprobarla después si fue un error.`, [
      { text: 'Rechazar', style: 'destructive', onPress: go },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const warn = isDarkMode ? '#fcd34d' : '#92400e';

  const row = (m: PendingMember, isRejected: boolean) => {
    const age = ageFrom(m.birth_date);
    return (
      <View key={m.id} style={[styles.row, { borderTopColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>{m.name || 'Sin nombre'}{isRejected ? ' · rechazada' : ''}</Text>
          <Text style={[styles.meta, { color: theme.subText }]}>
            {[(m.unit || '').toUpperCase(), age !== null ? `${age} años` : '', m.cedula ? `C.I. ${m.cedula}` : ''].filter(Boolean).join(' · ')}
          </Text>
          <Text style={[styles.meta, { color: theme.subText }]} numberOfLines={1}>
            {m.email || ''}{m.created_at ? ` · se registró el ${formatDateEs(m.created_at.slice(0, 10))}` : ''}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: '#16a34a' }]}
            onPress={() => act(m, 'approved')}
            disabled={!!busy}
            accessibilityRole="button"
            accessibilityLabel={`Aprobar cuenta de ${m.name}`}
          >
            {busy === m.id + 'approved' ? <ActivityIndicator size="small" color="#fff" /> : <UserCheck size={16} color="#fff" />}
            <Text style={styles.btnText}>Aprobar</Text>
          </TouchableOpacity>
          {!isRejected && (
            <TouchableOpacity
              style={[styles.btnIcon, { borderColor: theme.border }]}
              onPress={() => act(m, 'rejected')}
              disabled={!!busy}
              accessibilityRole="button"
              accessibilityLabel={`Rechazar cuenta de ${m.name}`}
            >
              {busy === m.id + 'rejected' ? <ActivityIndicator size="small" color="#dc2626" /> : <UserX size={16} color="#dc2626" />}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: isDarkMode ? '#2a1f05' : '#fffbeb', borderColor: isDarkMode ? '#78350f' : '#fde68a' }]}>
      <View style={styles.head}>
        <Hourglass size={18} color={warn} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: warn }]}>
            {pending.length ? `Cuentas por aprobar (${pending.length})` : 'Cuentas rechazadas'}
          </Text>
          <Text style={[styles.sub, { color: theme.subText }]}>
            Confirma que son miembros de tu grupo. Hasta que las apruebes no ven ningún dato.
          </Text>
        </View>
      </View>
      {pending.map(m => row(m, false))}
      {rejected.map(m => row(m, true))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14 },
  head: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10, marginTop: 10 },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 1 },
  actions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 10, paddingHorizontal: 12, minHeight: 40 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnIcon: { borderWidth: 1, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
