import { useCallback, useRef, useState } from 'react';
import { Animated, Dimensions, LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

type Layout = { y: number; h: number };
type DragStart = { id: string; from: number; startScroll: number; gestureDy: number; pageY: number; to: number };

const EDGE = 90;      // px cerca del borde de la pantalla donde la lista se desplaza sola
const GAP_DEFAULT = 12;

/**
 * Arrastrar y soltar las actividades del cronograma.
 * Las posiciones se animan sin volver a dibujar la pantalla en cada movimiento;
 * al soltar se llama a onReorder(from, to).
 */
export function useScheduleDrag(ids: string[], onReorder: (from: number, to: number) => void) {
  const layouts = useRef<Record<string, Layout>>({});
  const nodes = useRef<Record<string, any>>({});
  const anims = useRef<Record<string, Animated.Value>>({});
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const viewH = useRef(0);
  const contentH = useRef(0);
  const drag = useRef<DragStart | null>(null);
  const raf = useRef<number | null>(null);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const anim = useCallback((id: string) => {
    if (!anims.current[id]) anims.current[id] = new Animated.Value(0);
    return anims.current[id];
  }, []);

  const gap = () => {
    const [a, b] = idsRef.current.map(id => layouts.current[id]);
    return a && b ? Math.max(0, b.y - (a.y + a.h)) : GAP_DEFAULT;
  };

  const targetIndex = (from: number, dy: number) => {
    const list = idsRef.current.map(id => layouts.current[id]);
    const me = list[from];
    if (!me) return from;
    const center = me.y + me.h / 2 + dy;
    let to = from;
    for (let i = from + 1; i < list.length; i++) if (list[i] && center > list[i].y + list[i].h / 2) to = i;
    for (let i = from - 1; i >= 0; i--) if (list[i] && center < list[i].y + list[i].h / 2) to = i;
    return to;
  };

  const update = () => {
    const d = drag.current;
    if (!d) return;
    const dy = d.gestureDy + (scrollY.current - d.startScroll);
    anim(d.id).setValue(dy);
    const to = targetIndex(d.from, dy);
    if (to === d.to) return;
    d.to = to;
    const span = (layouts.current[d.id]?.h || 0) + gap();
    idsRef.current.forEach((id, i) => {
      if (id === d.id) return;
      let shift = 0;
      if (d.from < to && i > d.from && i <= to) shift = -span;
      if (to < d.from && i >= to && i < d.from) shift = span;
      Animated.timing(anim(id), { toValue: shift, duration: 140, useNativeDriver: false }).start();
    });
  };

  const autoScroll = () => {
    const d = drag.current;
    if (!d) return;
    const H = Dimensions.get('window').height;
    let v = 0;
    if (d.pageY < EDGE) v = -Math.ceil((EDGE - d.pageY) / 5);
    else if (d.pageY > H - EDGE) v = Math.ceil((d.pageY - (H - EDGE)) / 5);
    if (v !== 0) {
      const max = Math.max(0, contentH.current - viewH.current);
      const next = Math.min(max, Math.max(0, scrollY.current + v));
      if (next !== scrollY.current) {
        scrollY.current = next;
        scrollRef.current?.scrollTo({ y: next, animated: false });
        update();
      }
    }
    raf.current = requestAnimationFrame(autoScroll);
  };

  // En web, onLayout solo avisa cambios de tamaño (no de posición): se mide al empezar.
  const measureWeb = () => {
    idsRef.current.forEach(id => {
      const n = nodes.current[id];
      const el = n && typeof n.getNode === 'function' ? n.getNode() : n;
      if (el && typeof el.offsetTop === 'number') layouts.current[id] = { y: el.offsetTop, h: el.offsetHeight };
    });
  };

  const start = (id: string, pageY: number) => {
    const from = idsRef.current.indexOf(id);
    if (from < 0) return;
    measureWeb();
    drag.current = { id, from, startScroll: scrollY.current, gestureDy: 0, pageY, to: from };
    setDraggingId(id);
    raf.current = requestAnimationFrame(autoScroll);
  };

  const move = (dy: number, pageY: number) => {
    if (!drag.current) return;
    drag.current.gestureDy = dy;
    drag.current.pageY = pageY;
    update();
  };

  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (raf.current != null) cancelAnimationFrame(raf.current);
    raf.current = null;
    Object.values(anims.current).forEach(v => { v.stopAnimation(); v.setValue(0); });
    setDraggingId(null);
    if (d && d.to !== d.from) onReorder(d.from, d.to);
  };

  return {
    draggingId,
    scrollRef,
    anim,
    handlers: { start, move, end },
    itemRef: (id: string) => (node: any) => { if (node) nodes.current[id] = node; else delete nodes.current[id]; },
    onItemLayout: (id: string) => (e: LayoutChangeEvent) => {
      layouts.current[id] = { y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height };
    },
    scrollProps: {
      ref: scrollRef,
      scrollEventThrottle: 16,
      scrollEnabled: draggingId === null,
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => { scrollY.current = e.nativeEvent.contentOffset.y; },
      onLayout: (e: LayoutChangeEvent) => { viewH.current = e.nativeEvent.layout.height; },
      onContentSizeChange: (_w: number, h: number) => { contentH.current = h; },
    },
  };
}
