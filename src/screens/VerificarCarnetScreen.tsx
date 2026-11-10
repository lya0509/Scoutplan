import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ShieldCheck, ShieldAlert, ShieldX, Clock, ArrowLeft, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getApi } from '../lib/apiClient';
import { isOnline } from '../lib/offline/net';
import { formatDateEs } from '../utils/dateLocal';
import { navigateBackOrHome } from '../utils/navigationHelper';

type Result =
  | { kind: 'loading' }
  | { kind: 'ok'; name: string; group?: string | null; cargo?: string; status: string; expires?: string | null; checkedAt: string }
  | { kind: 'error'; title: string; text: string; tone: 'bad' | 'warn' };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verificación del carnet (lo que abre el QR: /verificar/<id>). Solo con sesión iniciada:
 * sin sesión la app muestra primero el inicio de sesión y luego vuelve aquí.
 */
export default function VerificarCarnetScreen({ route, navigation }: any) {
  const { theme, isDarkMode, primaryColor } = useTheme();
  const { user } = useAuth();
  const id: string = String(route?.params?.id || '').trim();
  const [result, setResult] = useState<Result>({ kind: 'loading' });

  const check = useCallback(async () => {
    if (!UUID_RE.test(id)) {
      setResult({ kind: 'error', tone: 'bad', title: 'Código no válido', text: 'El código QR no corresponde a un carnet. Escanéalo de nuevo desde el carnet digital.' });
      return;
    }
    if (!isOnline()) {
      setResult({ kind: 'error', tone: 'warn', title: 'Sin conexión', text: 'Para verificar un carnet necesitas internet. Conéctate e inténtalo de nuevo.' });
      return;
    }
    setResult({ kind: 'loading' });
    try {
      const { status, body } = await getApi<any>(`/api/verificar?id=${encodeURIComponent(id)}`);
      if (status === 200 && body) {
        setResult({ kind: 'ok', name: body.name, group: body.group, cargo: body.cargo, status: body.status, expires: body.expires, checkedAt: body.checked_at });
      } else if (status === 404) {
        setResult({ kind: 'error', tone: 'bad', title: 'Carnet no encontrado', text: 'No hay ningún miembro registrado con este código.' });
      } else if (status === 401) {
        setResult({ kind: 'error', tone: 'warn', title: 'Sesión vencida', text: 'Cierra y vuelve a abrir la app para renovar tu sesión, y escanea de nuevo.' });
      } else {
        setResult({ kind: 'error', tone: 'warn', title: 'No se pudo verificar', text: 'Ocurrió un problema en el servidor. Inténtalo de nuevo en unos minutos.' });
      }
    } catch {
      setResult({ kind: 'error', tone: 'warn', title: 'Sin conexión', text: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.' });
    }
  }, [id]);

  useEffect(() => { check(); }, [check]);

  const palette = {
    ok: { bg: isDarkMode ? '#14532d' : '#dcfce7', fg: isDarkMode ? '#86efac' : '#15803d' },
    bad: { bg: isDarkMode ? '#450a0a' : '#fee2e2', fg: isDarkMode ? '#fca5a5' : '#b91c1c' },
    warn: { bg: isDarkMode ? '#422006' : '#fef9c3', fg: isDarkMode ? '#fde047' : '#a16207' },
    info: { bg: isDarkMode ? '#3b0764' : '#f3e8ff', fg: isDarkMode ? '#d8b4fe' : '#7e22ce' },
  };

  const statusBadge = (s: string) =>
    s === 'vigente' ? { ...palette.ok, label: 'Membresía vigente', Icon: ShieldCheck }
      : s === 'vencida' ? { ...palette.bad, label: 'Membresía vencida', Icon: ShieldX }
        : s === 'por_aprobar' ? { ...palette.info, label: 'Membresía en revisión', Icon: Clock }
          : { ...palette.warn, label: 'Sin membresía registrada', Icon: ShieldAlert };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={[styles.top, { backgroundColor: primaryColor }]}>
          <Text style={styles.topSmall}>ASOCIACIÓN DE SCOUTS DE VENEZUELA</Text>
          <Text style={styles.topTitle}>Verificación de carnet</Text>
        </View>

        <View style={styles.body}>
          {result.kind === 'loading' && <ActivityIndicator color={primaryColor} size="large" style={{ marginVertical: 30 }} />}

          {result.kind === 'error' && (
            <>
              <View style={[styles.badge, { backgroundColor: palette[result.tone].bg }]}>
                <ShieldAlert size={18} color={palette[result.tone].fg} />
                <Text style={[styles.badgeText, { color: palette[result.tone].fg }]}>{result.title}</Text>
              </View>
              <Text style={[styles.text, { color: theme.text }]}>{result.text}</Text>
              <TouchableOpacity style={[styles.retry, { borderColor: theme.border }]} onPress={check} accessibilityRole="button">
                <RefreshCw size={16} color={primaryColor} />
                <Text style={{ color: theme.accentText, fontWeight: '700' }}>Reintentar</Text>
              </TouchableOpacity>
            </>
          )}

          {result.kind === 'ok' && (() => {
            const b = statusBadge(result.status);
            return (
              <>
                <View style={[styles.badge, { backgroundColor: b.bg }]}>
                  <b.Icon size={18} color={b.fg} />
                  <Text style={[styles.badgeText, { color: b.fg }]}>{b.label}</Text>
                </View>
                <Text style={[styles.name, { color: theme.text }]}>{result.name}</Text>
                {!!result.group && <Row label="Grupo" value={result.group} theme={theme} />}
                {!!result.cargo && <Row label="Rama / cargo" value={result.cargo} theme={theme} />}
                {!!result.expires && (
                  <Row label={result.status === 'vencida' ? 'Venció' : 'Vence'} value={formatDateEs(result.expires)} theme={theme} />
                )}
              </>
            );
          })()}
        </View>

        <View style={[styles.foot, { borderTopColor: theme.border }]}>
          <Text style={{ color: theme.subText, fontSize: 12, lineHeight: 17 }}>
            {result.kind === 'ok' ? `Verificado por ${user?.name || 'un miembro de la ASV'} con su sesión. ` : ''}Solo se muestran nombre, grupo y estado de la membresía.
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.back} onPress={() => navigateBackOrHome(navigation, user?.role)} accessibilityRole="button">
        <ArrowLeft size={16} color={theme.subText} />
        <Text style={{ color: theme.subText, fontWeight: '600' }}>Volver a la app</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: theme.subText }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingTop: 32, alignItems: 'center', flexGrow: 1 },
  card: { width: '100%', maxWidth: 440, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  top: { paddingHorizontal: 20, paddingVertical: 16 },
  topSmall: { color: '#ffffffd9', fontSize: 12, letterSpacing: 0.5, fontWeight: '600' },
  topTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  body: { padding: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16 },
  badgeText: { fontSize: 15.5, fontWeight: '800' },
  name: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  text: { fontSize: 14.5, lineHeight: 21 },
  row: { flexDirection: 'row', gap: 12, paddingVertical: 5 },
  rowLabel: { width: 110, fontSize: 14.5 },
  rowValue: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  retry: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, minHeight: 44, marginTop: 16 },
  foot: { borderTopWidth: 1, paddingHorizontal: 20, paddingVertical: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, padding: 10, minHeight: 44 },
});
