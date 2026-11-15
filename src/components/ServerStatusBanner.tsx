import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator } from 'react-native';
import { CloudOff, CheckCircle, X } from 'lucide-react-native';
import { getServerProblem, subscribeServerProblem, ServerProblem } from '../lib/serverStatus';
import { pingServer } from '../lib/supabaseClient';
import { outbox } from '../lib/offline/outbox';
import { reportError, flushPendingErrors } from '../lib/errorReporter';

const SHOW_AFTER_MS = 2500;   // un fallo suelto no debe hacer parpadear el aviso
const AUTO_CHECK_MS = 20000;  // mientras está caído, se vuelve a probar solo
const RECOVERED_MS = 10000;   // cuánto se muestra «Conexión recuperada»

/**
 * Aviso «No se puede conectar con el servidor» (hay internet, pero Supabase no responde o da
 * error 5xx). Sin él, la app mostraba pantallas vacías o cargando sin explicar nada, y parecía
 * que se había perdido el avance. Sin internet lo avisa OfflineStatusBanner, no este.
 * Lleva un código corto (SERVIDOR-503, SIN-RESPUESTA…) para saber qué pasó por una captura,
 * y queda registrado en «Errores de la app» cuando vuelve la conexión.
 */
export default function ServerStatusBanner() {
  const [problem, setProblem] = useState<ServerProblem | null>(getServerProblem());
  const [visible, setVisible] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stillDown, setStillDown] = useState(false);
  const [recovered, setRecovered] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => subscribeServerProblem(setProblem), []);

  // Mostrar solo si el problema dura más de unos segundos
  useEffect(() => {
    if (!problem) {
      setVisible(false);
      setStillDown(false);
      if (shownRef.current) {
        shownRef.current = false;
        setRecovered(true);
        outbox.flush().catch(() => {});
        flushPendingErrors().catch(() => {});
        const t = setTimeout(() => setRecovered(false), RECOVERED_MS);
        return () => clearTimeout(t);
      }
      return;
    }
    const t = setTimeout(() => {
      if (!getServerProblem()) return;
      if (!shownRef.current) {
        reportError(new Error(`Servidor sin responder · ${problem.code}`), { source: 'servidor' });
      }
      shownRef.current = true;
      setRecovered(false);
      setVisible(true);
    }, SHOW_AFTER_MS);
    return () => clearTimeout(t);
  }, [problem]);

  // Mientras se muestra, probar solo cada 20 s
  useEffect(() => {
    if (!visible) return;
    const t = setInterval(() => { pingServer().catch(() => {}); }, AUTO_CHECK_MS);
    return () => clearInterval(t);
  }, [visible]);

  const retry = async () => {
    setChecking(true);
    const r = await pingServer();
    setChecking(false);
    if (r.ok) {
      // Recargar para que cada pantalla traiga los datos al día
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload();
    } else {
      setStillDown(true);
    }
  };

  if (recovered && !visible) {
    return (
      <View pointerEvents="box-none" style={styles.wrapper}>
        <View style={[styles.card, styles.ok]} accessibilityRole="alert" accessibilityLiveRegion="polite">
          <CheckCircle size={18} color="#bbf7d0" />
          <Text style={[styles.title, { flexGrow: 1, flexShrink: 1 }]}>Conexión con el servidor recuperada</Text>
          <TouchableOpacity
            onPress={() => { if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.reload(); }}
            accessibilityRole="button" style={styles.btn}
          >
            <Text style={[styles.btnText, { color: '#14532d' }]}>Actualizar datos</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!visible || hidden || !problem) return null;

  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={styles.card} accessibilityRole="alert" accessibilityLiveRegion="polite">
        <CloudOff size={20} color="#fecaca" style={{ marginTop: 2 }} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>No se puede conectar con el servidor</Text>
          <Text style={styles.detail}>
            {stillDown ? 'Sigue sin responder. ' : ''}Estás viendo lo último guardado en este equipo; lo que hagas se envía cuando vuelva.
          </Text>
          <View style={styles.row}>
            <Text style={styles.code} selectable>Código: {problem.code}</Text>
            <TouchableOpacity onPress={retry} disabled={checking} accessibilityRole="button" style={styles.btn}>
              {checking ? <ActivityIndicator size="small" color="#7f1d1d" /> : <Text style={styles.btnText}>Reintentar</Text>}
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={() => setHidden(true)} accessibilityRole="button" accessibilityLabel="Ocultar aviso" style={styles.close}>
          <X size={18} color="#fecaca" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 0, right: 0, top: 70,
    alignItems: 'center', paddingHorizontal: 16, zIndex: 9999,
  },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#7f1d1d', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14,
    maxWidth: 560, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  ok: { backgroundColor: '#14532d', alignItems: 'center', flexWrap: 'wrap' },
  title: { color: '#fff', fontWeight: '800', fontSize: 14 },
  detail: { color: '#fee2e2', fontSize: 13, marginTop: 3, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8, flexWrap: 'wrap' },
  code: { color: '#fecaca', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  btn: { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 7, paddingHorizontal: 14, minHeight: 34, minWidth: 96, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#7f1d1d', fontWeight: '800', fontSize: 13 },
  close: { padding: 4, marginTop: -2 },
});
