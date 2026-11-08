import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ScrollView, ScrollViewProps, RefreshControl, Platform, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const TRIGGER = 64;   // px que hay que deslizar para refrescar
const MAX_PULL = 96;

type Props = ScrollViewProps & {
  /** Recarga los datos de la pantalla. Mientras la promesa no termine se muestra «Actualizando…». */
  onRefresh: () => Promise<unknown> | unknown;
};

/**
 * ScrollView con «deslizar hacia abajo para actualizar».
 * - Android/iOS: RefreshControl nativo.
 * - Web (PWA): react-native-web no implementa el gesto, así que se detecta con eventos táctiles
 *   cuando la lista está arriba del todo.
 */
const PullToRefreshScrollView = forwardRef<ScrollView, Props>(({ onRefresh, children, ...rest }, ref) => {
  const { theme, primaryColor } = useTheme();
  const innerRef = useRef<ScrollView>(null);
  useImperativeHandle(ref, () => innerRef.current as ScrollView);
  const [refreshing, setRefreshing] = useState(false);
  const [pull, setPull] = useState(0);
  const pullRef = useRef(0);
  const busyRef = useRef(false);

  const doRefresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setRefreshing(true);
    try { await onRefresh(); } catch {} finally {
      busyRef.current = false;
      setRefreshing(false);
      pullRef.current = 0;
      setPull(0);
    }
  }, [onRefresh]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node: any = (innerRef.current as any)?.getScrollableNode?.() || (innerRef.current as any);
    if (!node?.addEventListener) return;
    let startY: number | null = null;

    const onStart = (e: TouchEvent) => {
      startY = node.scrollTop <= 0 && !busyRef.current ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || node.scrollTop > 0) { if (pullRef.current) { pullRef.current = 0; setPull(0); } return; }
      const v = Math.min(dy * 0.5, MAX_PULL);
      pullRef.current = v;
      setPull(v);
    };
    const onEnd = () => {
      if (startY === null) return;
      startY = null;
      if (pullRef.current >= TRIGGER) doRefresh();
      else { pullRef.current = 0; setPull(0); }
    };
    node.addEventListener('touchstart', onStart, { passive: true });
    node.addEventListener('touchmove', onMove, { passive: true });
    node.addEventListener('touchend', onEnd);
    node.addEventListener('touchcancel', onEnd);
    return () => {
      node.removeEventListener('touchstart', onStart);
      node.removeEventListener('touchmove', onMove);
      node.removeEventListener('touchend', onEnd);
      node.removeEventListener('touchcancel', onEnd);
    };
  }, [doRefresh]);

  if (Platform.OS !== 'web') {
    return (
      <ScrollView
        ref={innerRef}
        {...rest}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={doRefresh} colors={[primaryColor]} tintColor={primaryColor} />}
      >
        {children}
      </ScrollView>
    );
  }

  const height = refreshing ? 48 : pull;
  const ready = pull >= TRIGGER;
  return (
    <ScrollView ref={innerRef} {...rest}>
      {height > 0 && (
        <View style={[styles.indicator, { height }]} accessibilityLiveRegion="polite">
          {refreshing ? (
            <>
              <ActivityIndicator size="small" color={primaryColor} />
              <Text style={[styles.text, { color: theme.subText }]}>Actualizando…</Text>
            </>
          ) : (
            <>
              <View style={{ transform: [{ rotate: `${Math.round((pull / TRIGGER) * 180)}deg` }] }}>
                <RefreshCw size={18} color={ready ? primaryColor : theme.subText} />
              </View>
              {pull > 28 && (
                <Text style={[styles.text, { color: ready ? primaryColor : theme.subText }]}>
                  {ready ? 'Suelta para actualizar' : 'Desliza para actualizar'}
                </Text>
              )}
            </>
          )}
        </View>
      )}
      {children}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  indicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, overflow: 'hidden' },
  text: { fontSize: 13, fontWeight: '600' },
});

export default PullToRefreshScrollView;
