import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { WifiOff, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { outbox, OutboxStatus } from '../lib/offline/outbox';
import PendingChangesModal from './PendingChangesModal';

/**
 * Píldora flotante que avisa:
 *  - Sin conexión (y cuántos cambios esperan en el teléfono)
 *  - Enviando cambios pendientes
 *  - "Todo enviado" al terminar (desaparece sola)
 *  - Cambios que no se pudieron enviar, con botón de reintento
 * Con internet y nada pendiente no se muestra.
 */
export default function OfflineStatusBanner() {
  const { theme, isDarkMode } = useTheme();
  const [status, setStatus] = useState<OutboxStatus>(outbox.getStatus());
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showList, setShowList] = useState(false);
  const prevPending = useRef(status.pending);

  useEffect(() => outbox.subscribe(setStatus), []);

  // Mostrar "Todo enviado" unos segundos cuando la cola se vacía
  useEffect(() => {
    if (prevPending.current > 0 && status.pending === 0 && status.online && !status.syncing) {
      setShowDone(true);
      const t = setTimeout(() => setShowDone(false), 3500);
      prevPending.current = 0;
      return () => clearTimeout(t);
    }
    prevPending.current = status.pending;
  }, [status.pending, status.online, status.syncing]);

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  let tone: 'offline' | 'sync' | 'done' | 'error' | null = null;
  let title = '';
  let detail = '';

  if (!status.online) {
    tone = 'offline';
    title = 'Sin conexión';
    detail = status.pending > 0
      ? `${plural(status.pending, 'cambio guardado', 'cambios guardados')} en el teléfono; se envían solos con internet. Toca para ver.`
      : 'Puedes seguir usando la app. Lo que hagas se guarda en el teléfono.';
  } else if (status.failed > 0) {
    tone = 'error';
    title = `${plural(status.failed, 'cambio no se pudo', 'cambios no se pudieron')} enviar`;
    detail = 'Toca para ver cuáles y reintentar.';
  } else if (status.pending > 0) {
    tone = 'sync';
    title = status.syncing ? 'Enviando cambios…' : 'Cambios por enviar';
    detail = `${plural(status.pending, 'pendiente', 'pendientes')} · toca para ver`;
  } else if (showDone) {
    tone = 'done';
    title = 'Todo enviado';
    detail = 'Tus cambios ya están en la nube.';
  }

  // Se muestra completo unos segundos cuando cambia el estado y luego se encoge a una
  // etiqueta pequeña arriba (así no tapa botones fijos de abajo como "Enviar a revisión").
  const toneKey = `${tone}|${status.failed > 0}`;
  useEffect(() => {
    if (!tone) return;
    setExpanded(true);
    const t = setTimeout(() => setExpanded(false), 5000);
    return () => clearTimeout(t);
  }, [toneKey]);

  // Con el panel abierto solo se muestra el panel (la píldora quedaría encima del fondo oscuro).
  // Sigue abierto aunque la cola se vacíe mientras se mira.
  if (showList) return <PendingChangesModal visible onClose={() => setShowList(false)} />;
  if (!tone) return null;

  const palette = {
    offline: { bg: isDarkMode ? '#27272a' : '#1f2937', fg: '#f9fafb', icon: '#fbbf24' },
    sync: { bg: isDarkMode ? '#1e3a8a' : '#1d4ed8', fg: '#eff6ff', icon: '#bfdbfe' },
    done: { bg: isDarkMode ? '#14532d' : '#15803d', fg: '#f0fdf4', icon: '#bbf7d0' },
    error: { bg: isDarkMode ? '#7f1d1d' : '#b91c1c', fg: '#fef2f2', icon: '#fecaca' },
  }[tone];

  const Icon = tone === 'offline' ? WifiOff : tone === 'sync' ? RefreshCw : tone === 'done' ? CheckCircle : AlertTriangle;

  const onPress = () => {
    if (!expanded) {
      setExpanded(true);
      return;
    }
    // Con algo en cola (o con error) se abre la lista de cambios pendientes
    if (status.pending > 0 || status.failed > 0) {
      if (tone === 'sync' && !status.syncing) outbox.flush().catch(() => {});
      setShowList(true);
    } else setExpanded(false);
  };

  const count = tone === 'error' ? status.failed : status.pending;
  const chipText = tone === 'offline' ? (count > 0 ? `Sin conexión · ${count}` : 'Sin conexión')
    : tone === 'sync' ? `Enviando · ${count}` : tone === 'error' ? `${count} con error` : 'Enviado';

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, !expanded && styles.wrapperCollapsed]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${title}. ${detail}`}
        style={[expanded ? styles.pill : styles.chip, { backgroundColor: palette.bg, borderColor: theme.border }]}
      >
        <Icon size={expanded ? 16 : 13} color={palette.icon} />
        {expanded ? (
          <View style={{ flexShrink: 1 }}>
            <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
            <Text style={[styles.detail, { color: palette.fg }]} numberOfLines={2}>{detail}</Text>
          </View>
        ) : (
          <Text style={[styles.chipText, { color: palette.fg }]}>{chipText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Arriba, justo debajo del encabezado: abajo suelen ir botones fijos (enviar, guardar)
  wrapper: {
    position: Platform.OS === 'web' ? ('fixed' as any) : 'absolute',
    left: 0,
    right: 0,
    top: 70,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 9998,
  },
  wrapperCollapsed: {
    left: undefined,
    right: 12,
    alignItems: 'flex-end',
    paddingHorizontal: 0,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 28,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 440,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  title: { fontSize: 13, fontWeight: '700' },
  detail: { fontSize: 12, opacity: 0.9, marginTop: 1 },
});
