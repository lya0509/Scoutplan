import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { RefreshCw } from 'lucide-react-native';

/**
 * Aviso «Hay una versión nueva». La app instalada (PWA) descarga la versión nueva por detrás,
 * pero la pantalla abierta sigue con el código anterior hasta recargar: así un arreglo podía
 * tardar horas en llegar al teléfono sin que nadie lo notara. No recarga sola (se perdería lo
 * que se esté escribiendo): ofrece el botón.
 */
export default function UpdateAvailableBanner() {
  const [ready, setReady] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const sw = navigator.serviceWorker;
    // La primera vez que el service worker toma el control no hay nada que actualizar
    let hadController = !!sw.controller;
    const onControllerChange = () => {
      if (hadController) { setReady(true); setHidden(false); }
      hadController = true;
    };
    const check = () => { sw.getRegistration().then(r => r?.update()).catch(() => {}); };
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    sw.addEventListener('controllerchange', onControllerChange);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(check, 15 * 60 * 1000);
    return () => {
      sw.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, []);

  if (!ready || hidden) return null;
  return (
    <View pointerEvents="box-none" style={styles.wrapper}>
      <View style={styles.card} accessibilityRole="alert">
        <RefreshCw size={18} color="#e9d5ff" />
        <Text style={styles.text}>Hay una versión nueva de la app</Text>
        <View style={styles.actions}>
        <TouchableOpacity onPress={() => setHidden(true)} accessibilityRole="button" style={styles.later}>
          <Text style={styles.laterText}>Luego</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => window.location.reload()} accessibilityRole="button" style={styles.btn}>
          <Text style={styles.btnText}>Actualizar</Text>
        </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 0, right: 0, bottom: 16,
    alignItems: 'center', paddingHorizontal: 16, zIndex: 9999,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
    backgroundColor: '#3b0764', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14,
    maxWidth: 520, width: '100%',
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  text: { color: '#faf5ff', fontWeight: '700', fontSize: 14, flexGrow: 1, flexShrink: 1, flexBasis: 160 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' },
  later: { paddingVertical: 8, paddingHorizontal: 8, minHeight: 36, justifyContent: 'center' },
  laterText: { color: '#e9d5ff', fontWeight: '600', fontSize: 13 },
  btn: { backgroundColor: '#ffffff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  btnText: { color: '#3b0764', fontWeight: '800', fontSize: 14 },
});
