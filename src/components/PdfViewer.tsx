import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Linking } from 'react-native';
import { ZoomIn, ZoomOut, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Visor de PDF dentro de la app (web/PWA). En Android el navegador no muestra PDF dentro de
 * un <iframe> y obliga a abrir otra aplicación; aquí cada página se dibuja con pdf.js
 * (public/pdfjs, misma licencia Apache-2.0, se carga solo al abrir una guía y queda guardado
 * para usarse sin conexión).
 */
const PDFJS_SRC = '/pdfjs/pdf.min.js';
const PDFJS_WORKER = '/pdfjs/pdf.worker.min.js';

let pdfjsPromise: Promise<any> | null = null;
function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Sin navegador'));
  const w = window as any;
  if (w.pdfjsLib) return Promise.resolve(w.pdfjsLib);
  if (!pdfjsPromise) {
    pdfjsPromise = new Promise((resolve, reject) => {
      const sc = document.createElement('script');
      sc.src = PDFJS_SRC;
      sc.async = true;
      sc.onload = () => {
        const lib = (window as any).pdfjsLib;
        if (!lib) { reject(new Error('pdf.js no cargó')); return; }
        lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
        resolve(lib);
      };
      sc.onerror = () => { pdfjsPromise = null; reject(new Error('No se pudo cargar el visor de PDF')); };
      document.head.appendChild(sc);
    });
  }
  return pdfjsPromise;
}

export default function PdfViewer({ url, title }: { url: string; title?: string }) {
  const { theme, isDarkMode } = useTheme();
  const hostRef = useRef<any>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [pages, setPages] = useState({ done: 0, total: 0 });
  const [zoom, setZoom] = useState(1);
  const docRef = useRef<any>(null);

  // Cargar el documento
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    let cancelled = false;
    setStatus('loading');
    setPages({ done: 0, total: 0 });
    (async () => {
      try {
        const lib = await loadPdfJs();
        const doc = await lib.getDocument({ url }).promise;
        if (cancelled) { doc.destroy(); return; }
        docRef.current = doc;
        setPages({ done: 0, total: doc.numPages });
        setStatus('ready');
      } catch (e) {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      try { docRef.current?.destroy(); } catch {}
      docRef.current = null;
    };
  }, [url]);

  // Dibujar las páginas (y volver a dibujar al cambiar el zoom)
  useEffect(() => {
    if (status !== 'ready' || !docRef.current || !hostRef.current) return;
    let cancelled = false;
    const host: HTMLElement = hostRef.current;
    host.innerHTML = '';
    const width = Math.max(260, host.clientWidth - 16);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    (async () => {
      const doc = docRef.current;
      for (let i = 1; i <= doc.numPages && !cancelled; i++) {
        try {
          const page = await doc.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = (width / base.width) * zoom;
          const vp = page.getViewport({ scale: scale * dpr });
          const canvas = document.createElement('canvas');
          canvas.width = Math.floor(vp.width);
          canvas.height = Math.floor(vp.height);
          canvas.style.width = `${Math.floor(vp.width / dpr)}px`;
          canvas.style.height = `${Math.floor(vp.height / dpr)}px`;
          canvas.style.display = 'block';
          canvas.style.margin = '0 auto 10px';
          canvas.style.background = '#ffffff';
          canvas.style.borderRadius = '6px';
          canvas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.25)';
          canvas.setAttribute('aria-label', `${title || 'Documento'} — página ${i}`);
          host.appendChild(canvas);
          await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
          if (!cancelled) setPages(p => ({ ...p, done: i }));
        } catch {
          // una página dañada no detiene las demás
        }
      }
    })();
    return () => { cancelled = true; };
  }, [status, zoom, title]);

  const openOutside = () => {
    if (typeof window !== 'undefined') window.open(url, '_blank');
    else Linking.openURL(url).catch(() => {});
  };

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.toolbar, { borderBottomColor: theme.border }]}>
        <Text style={[styles.info, { color: theme.subText }]} numberOfLines={1}>
          {status === 'loading' ? 'Abriendo guía…'
            : status === 'error' ? 'No se pudo mostrar aquí'
            : pages.done < pages.total ? `Página ${pages.done} de ${pages.total}…` : `${pages.total} páginas`}
        </Text>
        {status === 'ready' && (
          <>
            <TouchableOpacity onPress={() => setZoom(z => Math.max(1, +(z - 0.5).toFixed(1)))} disabled={zoom <= 1} style={[styles.toolBtn, { opacity: zoom <= 1 ? 0.4 : 1 }]} accessibilityRole="button" accessibilityLabel="Alejar">
              <ZoomOut size={18} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.zoomText, { color: theme.text }]}>{Math.round(zoom * 100)}%</Text>
            <TouchableOpacity onPress={() => setZoom(z => Math.min(3, +(z + 0.5).toFixed(1)))} disabled={zoom >= 3} style={[styles.toolBtn, { opacity: zoom >= 3 ? 0.4 : 1 }]} accessibilityRole="button" accessibilityLabel="Acercar">
              <ZoomIn size={18} color={theme.text} />
            </TouchableOpacity>
          </>
        )}
      </View>

      {status === 'loading' && (
        <View style={styles.center}><ActivityIndicator color={theme.accentText} /></View>
      )}
      {status === 'error' && (
        <View style={styles.center}>
          <Text style={[styles.errText, { color: theme.subText }]}>
            No se pudo abrir la guía dentro de la app (puede que necesites conexión la primera vez).
          </Text>
          <TouchableOpacity style={[styles.outBtn, { borderColor: theme.border }]} onPress={openOutside} accessibilityRole="button">
            <ExternalLink size={16} color={theme.text} />
            <Text style={{ color: theme.text, fontWeight: '700' }}>Abrir en otra aplicación</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Contenedor nativo del navegador donde pdf.js dibuja las páginas */}
      <div
        ref={hostRef}
        style={{
          flex: 1, overflow: 'auto', padding: 8, display: status === 'ready' ? 'block' : 'none',
          background: isDarkMode ? '#09090b' : '#e5e7eb', WebkitOverflowScrolling: 'touch',
        } as any}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, width: '100%', minHeight: 300 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1 },
  info: { flex: 1, fontSize: 12.5 },
  toolBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  zoomText: { fontSize: 12.5, fontWeight: '700', minWidth: 42, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  errText: { fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
  outBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, minHeight: 44 },
});
