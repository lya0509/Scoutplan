import { supabase } from './supabaseClient';

/**
 * Convierte una cadena Base64 / Data URL a Uint8Array para subir a Supabase Storage
 */
function dataURLToUint8Array(dataUrl: string): { bytes: Uint8Array; mimeType: string } | null {
  try {
    const parts = dataUrl.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
    const base64 = parts[1];
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return { bytes, mimeType };
  } catch (err) {
    console.error('Error convirtiendo Data URL a Uint8Array:', err);
    return null;
  }
}

/**
 * Redimensiona y comprime imágenes de perfil/firmas mediante HTML5 Canvas (si supera 800px)
 */
async function compressImageIfNeeded(dataUrl: string, maxWidth = 800, quality = 0.85): Promise<string> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return dataUrl;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const storageService = {
  /**
   * Sube una imagen (Base64 o File/Blob) directamente a Supabase Storage Bucket.
   * Si es foto de perfil o firma ('scout-files'), la redimensiona y comprime automáticamente.
   * Retorna la URL pública permanente HTTPS CDN de Supabase.
   */
  async uploadImage(
    bucketName: string,
    folderPath: string,
    fileName: string,
    fileOrBase64: File | Blob | string
  ): Promise<string> {
    try {
      let fileBody: Uint8Array | File | Blob;
      let contentType = 'image/png';

      if (typeof fileOrBase64 === 'string') {
        if (!fileOrBase64.startsWith('data:')) {
          return fileOrBase64;
        }

        // Si es foto de perfil o firma de imagen, comprimir a máx 800px (~100KB)
        let processedBase64 = fileOrBase64;
        if (bucketName === 'scout-files' && fileOrBase64.startsWith('data:image')) {
          processedBase64 = await compressImageIfNeeded(fileOrBase64, 800, 0.85);
        }

        const converted = dataURLToUint8Array(processedBase64);
        if (!converted) return fileOrBase64;
        fileBody = converted.bytes;
        contentType = converted.mimeType;
      } else {
        fileBody = fileOrBase64;
        contentType = fileOrBase64.type || 'image/png';
      }

      const filePath = `${folderPath}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

      // Subir archivo al bucket de Supabase Storage (sobrescribe si existe)
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, fileBody, {
          contentType,
          upsert: true
        });

      if (error) {
        console.error(`Error subiendo a Supabase Storage (${bucketName}):`, error.message);
        return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
      }

      // Obtener la URL pública permanente de Supabase
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        return urlData.publicUrl;
      }

      return '';
    } catch (err) {
      console.error('Error en storageService.uploadImage:', err);
      return typeof fileOrBase64 === 'string' ? fileOrBase64 : '';
    }
  }
};
