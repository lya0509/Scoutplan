// «🐞 Errores de la app» (Panel de Jefatura): errores que la app registró sola y reportes
// enviados con el botón de ayuda, de las personas del grupo (regla supabase_errores_app.sql).
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { X, Bug, MessageSquareWarning, RefreshCw } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { useTheme } from '../context/ThemeContext';

interface Report {
  id: string;
  created_at: string;
  user_name: string | null;
  user_role: string | null;
  description: string | null;
  status: string | null;
}

interface Props { visible: boolean; onClose: () => void }

const ROLE: Record<string, string> = { scout: 'Joven', scouter: 'Scouter', jefe_grupo: 'Jefatura' };

function when(iso: string) {
  try {
    return new Date(iso).toLocaleString('es-VE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export function AppErrorsModal({ visible, onClose }: Props) {
  const { theme, isDarkMode, primaryColor } = useTheme();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from('bug_reports')
      .select('id, created_at, user_name, user_role, description, status')
      .order('created_at', { ascending: false })
      .limit(60);
    if (e) setError('No se pudieron cargar los reportes. Revisa tu conexión e intenta de nuevo.');
    setReports((data as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (visible) load(); }, [visible]);

  const autos = reports.filter(r => r.description?.startsWith('[Error automático')).length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>🐞 Errores de la app</Text>
              <Text style={{ color: theme.subText, fontSize: 13, marginTop: 2 }}>
                Personas de tu grupo · {autos} automáticos · {reports.length - autos} enviados a mano
              </Text>
            </View>
            <TouchableOpacity onPress={load} style={styles.iconBtn} accessibilityLabel="Actualizar">
              <RefreshCw size={18} color={theme.subText} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Cerrar">
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={primaryColor} style={{ marginVertical: 40 }} />
          ) : error ? (
            <Text style={[styles.empty, { color: '#dc2626' }]}>{error}</Text>
          ) : reports.length === 0 ? (
            <Text style={[styles.empty, { color: theme.subText }]}>
              No hay errores registrados en tu grupo. 🎉{'\n'}Cuando a alguien le falle algo, aparecerá aquí.
            </Text>
          ) : (
            <ScrollView style={{ maxHeight: 520 }}>
              {reports.map(r => {
                const auto = r.description?.startsWith('[Error automático');
                const lines = (r.description || '').split('\n');
                const headline = lines[0].replace(/^\[Error automático[^\]]*\]\s*/, '');
                const isOpen = open === r.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    onPress={() => setOpen(isOpen ? null : r.id)}
                    activeOpacity={0.8}
                    style={[styles.item, { borderColor: theme.border, backgroundColor: isDarkMode ? '#1f1f23' : '#f8fafc' }]}
                  >
                    <View style={styles.itemTop}>
                      {auto ? <Bug size={16} color={isDarkMode ? '#fca5a5' : '#b91c1c'} /> : <MessageSquareWarning size={16} color={isDarkMode ? '#fcd34d' : '#b45309'} />}
                      <Text style={[styles.kind, { color: theme.subText }]}>
                        {auto ? (lines[0].includes('pantalla caída') ? 'Pantalla caída' : 'Error automático') : 'Reporte manual'} · {when(r.created_at)}
                      </Text>
                    </View>
                    <Text style={[styles.headline, { color: theme.text }]} numberOfLines={isOpen ? undefined : 2}>{headline}</Text>
                    <Text style={{ color: theme.subText, fontSize: 13, marginTop: 4 }}>
                      {r.user_name || 'Sin nombre'} · {ROLE[r.user_role || ''] || r.user_role || '—'}
                    </Text>
                    {isOpen && lines.length > 1 && (
                      <Text selectable style={[styles.detail, { color: theme.subText, borderColor: theme.border }]}>
                        {lines.slice(1).join('\n').trim()}
                      </Text>
                    )}
                    {!isOpen && lines.length > 1 && (
                      <Text style={{ color: theme.accentText, fontSize: 12, marginTop: 6, fontWeight: '600' }}>Toca para ver el detalle</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 560, alignSelf: 'center', borderRadius: 18, borderWidth: 1, padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  title: { fontSize: 18, fontWeight: '800' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  empty: { textAlign: 'center', marginVertical: 36, fontSize: 15, lineHeight: 22 },
  item: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  kind: { fontSize: 12, fontWeight: '700' },
  headline: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  detail: { fontSize: 12, marginTop: 8, paddingTop: 8, borderTopWidth: 1, fontFamily: 'monospace', lineHeight: 17 },
});
