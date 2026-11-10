import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Award, Download, FileText } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { buildInsigniasReport, InsigniaMember } from '../lib/insigniasReport';
import { exportReportExcel, exportReportPdf } from '../utils/exportHelpers';
import { isOnline } from '../lib/offline/net';
import { showAlert } from '../utils/alert';
import { buttonVariants, iconColor } from '../theme/buttons';

interface Props {
  members: InsigniaMember[];
  groupName: string;
  /** Lo que abarca el reporte, p. ej. "Clan" o "Grupo completo". */
  scopeLabel: string;
}

/** Tarjeta con "Avance de insignias" → Excel / PDF para Scouters y Jefatura. */
export function InsigniasExportBar({ members, groupName, scopeLabel }: Props) {
  const { theme, primaryColor, isDarkMode } = useTheme();
  const btn = buttonVariants(theme, isDarkMode, primaryColor);
  const [busy, setBusy] = useState<'xlsx' | 'pdf' | null>(null);

  const run = async (kind: 'xlsx' | 'pdf') => {
    if (busy) return;
    if (!members.length) {
      showAlert('Sin miembros', 'No hay miembros en la lista para exportar.');
      return;
    }
    if (!isOnline()) {
      showAlert('Sin conexión', 'El avance de insignias se lee del servidor: conéctate a internet para generarlo.');
      return;
    }
    setBusy(kind);
    try {
      const table = await buildInsigniasReport(members, groupName, scopeLabel);
      await (kind === 'xlsx' ? exportReportExcel(table) : exportReportPdf(table));
    } catch (e: any) {
      const msg = String(e?.message || '');
      showAlert(
        'No se pudo generar',
        /abort|fetch|network|no disponible|timeout/i.test(msg)
          ? 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
          : msg || 'Inténtalo de nuevo en un momento.',
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.head}>
        <Award size={18} color={primaryColor} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.text }]}>Avance de insignias</Text>
          <Text style={[styles.sub, { color: theme.subText }]}>
            Etapa actual, porcentaje y fechas de aprobación de {members.length} {members.length === 1 ? 'miembro' : 'miembros'}
          </Text>
        </View>
      </View>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.btn, btn.secondary]}
          onPress={() => run('xlsx')}
          disabled={!!busy}
          accessibilityRole="button"
          accessibilityLabel="Descargar avance de insignias en Excel"
        >
          {busy === 'xlsx' ? <ActivityIndicator size="small" color={iconColor('excel', isDarkMode)} /> : <Download size={15} color={iconColor('excel', isDarkMode)} />}
          <Text style={[styles.btnText, btn.secondaryText]}>Excel (.xlsx)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, btn.secondary]}
          onPress={() => run('pdf')}
          disabled={!!busy}
          accessibilityRole="button"
          accessibilityLabel="Descargar avance de insignias en PDF"
        >
          {busy === 'pdf' ? <ActivityIndicator size="small" color={iconColor('pdf', isDarkMode)} /> : <FileText size={15} color={iconColor('pdf', isDarkMode)} />}
          <Text style={[styles.btnText, btn.secondaryText]}>PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 12, marginTop: 1 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, minHeight: 42, paddingHorizontal: 10 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13.5 },
});
