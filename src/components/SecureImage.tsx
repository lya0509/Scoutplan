import React, { useEffect, useState } from 'react';
import { Image, ImageProps, View } from 'react-native';
import { resolveFileUrl, peekFileUrl, storagePath } from '../lib/fileUrl';

/** Dirección lista para mostrar: firmada si el archivo es del bucket privado. */
export function useFileUrl(url?: string | null): string | null {
  const [resolved, setResolved] = useState<string | null>(() => (url ? peekFileUrl(url) : null));
  useEffect(() => {
    let alive = true;
    if (!url) { setResolved(null); return; }
    if (!storagePath(url)) { setResolved(url); return; }
    const quick = peekFileUrl(url);
    if (quick) setResolved(quick);
    resolveFileUrl(url).then(u => { if (alive) setResolved(u); });
    return () => { alive = false; };
  }, [url]);
  return resolved;
}

/**
 * Igual que <Image>, pero si la imagen está en el almacenamiento privado pide antes un
 * enlace temporal (solo con sesión iniciada). Otras direcciones se muestran tal cual.
 */
export function SecureImage(props: ImageProps) {
  const src: any = props.source;
  const uri: string | undefined = src && typeof src === 'object' && !Array.isArray(src) ? src.uri : undefined;
  const resolved = useFileUrl(uri);
  if (uri === undefined) return <Image {...props} />;
  if (!resolved) return <View style={props.style as any} />;
  return <Image {...props} source={{ ...src, uri: resolved }} />;
}
