// Recortar y ajustar una foto de perfil antes de guardarla.
// Arrastrar para mover, pellizcar (o la barra / botones) para acercar, girar de 90 en 90.
// El resultado es una imagen cuadrada JPEG (data URL) lista para subir.
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity, Image, PanResponder,
  ActivityIndicator, useWindowDimensions, Platform,
} from 'react-native';
import { RotateCw, ZoomIn, ZoomOut, Check, X, Undo2 } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import {
  MIN_ZOOM, MAX_ZOOM, Rotation, clampZoom, clampOffset, displayScale, nextRotation,
  cropDrawParams, touchDistance,
} from '../utils/photoCrop';

interface Props {
  visible: boolean;
  /** data: URL o enlace (firmado) de la foto a recortar. */
  source: string | null;
  title?: string;
  /** Lado de la imagen final en px. */
  outputSize?: number;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void | Promise<void>;
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new (window as any).Image() as HTMLImageElement;
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la foto.'));
    img.src = src;
  });
}

export function PhotoCropModal({ visible, source, title = 'Ajustar foto', outputSize = 800, onCancel, onConfirm }: Props) {
  const { primaryColor } = useTheme();
  const { width: winW, height: winH } = useWindowDimensions();
  const frame = Math.max(200, Math.min(winW - 48, winH - 300, 340));

  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState<Rotation>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Valores actuales para los gestos (los manejadores se crean una sola vez)
  const live = useRef({ zoom, offset, rotation, natural, frame });
  live.current = { zoom, offset, rotation, natural, frame };
  const gesture = useRef({ startOffset: { x: 0, y: 0 }, startZoom: 1, startDist: 0, pinching: false });

  useEffect(() => {
    if (!visible || !source) return;
    setNatural(null); setZoom(1); setOffset({ x: 0, y: 0 }); setRotation(0); setError(null); setSaving(false);
    let cancelled = false;
    Image.getSize(
      source,
      (w, h) => { if (!cancelled) setNatural({ w, h }); },
      () => { if (!cancelled) setError('No se pudo abrir la foto.'); },
    );
    return () => { cancelled = true; };
  }, [visible, source]);

  const apply = (z: number, off: { x: number; y: number }, rot: Rotation = live.current.rotation) => {
    const n = live.current.natural;
    if (!n) return;
    const cz = clampZoom(z);
    setZoom(cz);
    setOffset(clampOffset(off, n.w, n.h, rot, live.current.frame, cz));
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const t = (evt.nativeEvent as any).touches || [];
      gesture.current.startOffset = live.current.offset;
      gesture.current.startZoom = live.current.zoom;
      gesture.current.pinching = t.length >= 2;
      gesture.current.startDist = t.length >= 2 ? touchDistance(t[0], t[1]) : 0;
    },
    onPanResponderMove: (evt, g) => {
      const t = (evt.nativeEvent as any).touches || [];
      if (t.length >= 2) {
        const d = touchDistance(t[0], t[1]);
        if (!gesture.current.pinching || !gesture.current.startDist) {
          gesture.current.pinching = true;
          gesture.current.startDist = d;
          gesture.current.startZoom = live.current.zoom;
          gesture.current.startOffset = live.current.offset;
          return;
        }
        apply(gesture.current.startZoom * (d / gesture.current.startDist), live.current.offset);
        return;
      }
      if (gesture.current.pinching) {
        // Se levantó un dedo: seguir arrastrando desde aquí sin saltos
        gesture.current.pinching = false;
        gesture.current.startOffset = { x: live.current.offset.x - g.dx, y: live.current.offset.y - g.dy };
      }
      apply(live.current.zoom, { x: gesture.current.startOffset.x + g.dx, y: gesture.current.startOffset.y + g.dy });
    },
    onPanResponderTerminationRequest: () => false,
  })).current;

  // Barra de zoom
  const trackRef = useRef<View>(null);
  const trackBox = useRef({ x: 0, w: 1 });
  const zoomFromPageX = (pageX: number) => {
    const p = Math.min(1, Math.max(0, (pageX - trackBox.current.x) / trackBox.current.w));
    apply(MIN_ZOOM + p * (MAX_ZOOM - MIN_ZOOM), live.current.offset);
  };
  const slider = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: (evt) => {
      const pageX = evt.nativeEvent.pageX;
      trackRef.current?.measureInWindow((x, _y, w) => {
        trackBox.current = { x, w: w || 1 };
        zoomFromPageX(pageX);
      });
    },
    onPanResponderMove: (evt) => zoomFromPageX(evt.nativeEvent.pageX),
    onPanResponderTerminationRequest: () => false,
  })).current;

  const rotate = () => {
    const r = nextRotation(rotation);
    setRotation(r);
    apply(zoom, offset, r);
  };

  const reset = () => { setRotation(0); setZoom(1); setOffset({ x: 0, y: 0 }); };

  const confirm = async () => {
    if (!source || !natural || saving) return;
    setSaving(true);
    setError(null);
    try {
      const img = await loadHtmlImage(source);
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Tu navegador no permite recortar fotos.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outputSize, outputSize);
      const p = cropDrawParams(natural.w, natural.h, frame, { zoom, offset, rotation }, outputSize);
      ctx.translate(p.cx, p.cy);
      ctx.rotate(p.angle);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, -p.dw / 2, -p.dh / 2, p.dw, p.dh);
      let dataUrl: string;
      try {
        dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      } catch {
        throw new Error('Esta foto no se puede ajustar sin internet. Conéctate o súbela de nuevo.');
      }
      await onConfirm(dataUrl);
    } catch (e: any) {
      setError(e?.message || 'No se pudo recortar la foto.');
    } finally {
      setSaving(false);
    }
  };

  const s = natural ? displayScale(natural.w, natural.h, rotation, frame, zoom) : 1;
  const imgW = natural ? natural.w * s : frame;
  const imgH = natural ? natural.h * s : frame;
  const pct = (zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.iconBtn} accessibilityLabel="Cancelar" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={reset} style={styles.iconBtn} accessibilityLabel="Restablecer" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Undo2 size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.hint}>Arrastra para mover · pellizca o usa la barra para acercar</Text>

        <View
          style={[styles.frame, { width: frame, height: frame }, Platform.OS === 'web' ? ({ touchAction: 'none', cursor: 'grab' } as any) : null]}
          {...pan.panHandlers}
          testID="photo-crop-frame"
        >
          {source && natural ? (
            <Image
              source={{ uri: source }}
              style={{
                position: 'absolute',
                width: imgW,
                height: imgH,
                left: frame / 2 - imgW / 2,
                top: frame / 2 - imgH / 2,
                transform: [{ translateX: offset.x }, { translateY: offset.y }, { rotate: `${rotation}deg` }],
              }}
              resizeMode="stretch"
              {...({ draggable: false } as any)}
            />
          ) : !error ? (
            <ActivityIndicator color="#fff" style={{ marginTop: frame / 2 - 12 }} />
          ) : null}
          {/* Oscurece fuera del círculo: así se verá en la app */}
          <View pointerEvents="none" style={{
            position: 'absolute', left: -frame / 2, top: -frame / 2, width: frame * 2, height: frame * 2,
            borderRadius: frame, borderWidth: frame / 2, borderColor: 'rgba(0,0,0,0.55)',
          }} />
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: frame / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.85)' }]} />
        </View>

        <View style={[styles.zoomRow, { width: frame }]}>
          <TouchableOpacity onPress={() => apply(zoom - 0.25, offset)} style={styles.iconBtn} accessibilityLabel="Alejar">
            <ZoomOut size={20} color="#fff" />
          </TouchableOpacity>
          <View ref={trackRef} style={styles.track} {...slider.panHandlers}>
            <View style={styles.trackLine} />
            <View style={[styles.trackFill, { width: `${pct * 100}%`, backgroundColor: primaryColor }]} />
            <View style={[styles.thumb, { left: `${pct * 100}%`, borderColor: primaryColor }]} />
          </View>
          <TouchableOpacity onPress={() => apply(zoom + 0.25, offset)} style={styles.iconBtn} accessibilityLabel="Acercar">
            <ZoomIn size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}

        <View style={styles.actions}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.16)' }]} onPress={rotate} disabled={!natural}>
            <RotateCw size={16} color="#fff" />
            <Text style={styles.actionText}>Girar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(255,255,255,0.16)' }]} onPress={onCancel}>
            <Text style={styles.actionText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: primaryColor, opacity: natural && !saving ? 1 : 0.6 }]}
            onPress={confirm}
            disabled={!natural || saving}
            accessibilityLabel="Usar foto"
          >
            {saving ? <ActivityIndicator color="#fff" size="small" /> : <Check size={16} color="#fff" />}
            <Text style={styles.actionText}>Usar foto</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  header: { width: '100%', maxWidth: 420, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  hint: { color: '#d4d4d8', fontSize: 12, marginBottom: 14, textAlign: 'center' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  frame: { overflow: 'hidden', backgroundColor: '#111', borderRadius: 4 },
  zoomRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  track: { flex: 1, height: 32, justifyContent: 'center' },
  trackLine: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' },
  trackFill: { position: 'absolute', left: 0, height: 4, borderRadius: 2 },
  thumb: { position: 'absolute', width: 20, height: 20, marginLeft: -10, borderRadius: 10, backgroundColor: '#fff', borderWidth: 3 },
  error: { color: '#fca5a5', fontSize: 13, marginTop: 12, textAlign: 'center', maxWidth: 340 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12 },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
