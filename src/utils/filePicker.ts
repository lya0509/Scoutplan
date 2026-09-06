import { Platform } from 'react-native';

export interface PickImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  accept?: string;
}

/**
 * Selector universal de imágenes 100% compatible con iPhone (iOS Safari / WebKit), Android y Escritorio.
 * 
 * En iOS Safari / WebKit:
 * 1. Es obligatorio que el input esté agregado al DOM (document.body.appendChild) antes de llamar a .click(),
 *    de lo contrario WebKit bloquea la apertura del selector por políticas de seguridad.
 * 2. Se incluye soporte para formatos comunes de iOS (HEIC, HEIF, JPEG, PNG, WEBP).
 * 3. Se comprime la imagen mediante Canvas para evitar sobrecarga de memoria en dispositivos móviles.
 */
export function pickImageUniversal(
  onImageSelected: (dataUrl: string, file?: File) => void,
  options?: PickImageOptions
): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    console.warn('pickImageUniversal solo está disponible en entorno Web / PWA');
    return;
  }

  const maxWidth = options?.maxWidth || 1000;
  const maxHeight = options?.maxHeight || 1000;
  const quality = options?.quality || 0.82;
  const accept = options?.accept || 'image/*,image/jpeg,image/png,image/heic,image/heif,image/webp';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = accept;
  // Ubicación fuera de pantalla para que sea invisible pero formalmente parte del DOM
  input.style.position = 'fixed';
  input.style.top = '-9999px';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  };

  input.onchange = (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) {
      cleanup();
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawResult = event.target?.result as string;
      if (!rawResult) {
        cleanup();
        return;
      }

      // Procesar compresión mediante Canvas
      const img = new (window as any).Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', quality);
            onImageSelected(compressed, file);
          } else {
            onImageSelected(rawResult, file);
          }
        } catch (err) {
          // Fallback a imagen original si falla canvas
          onImageSelected(rawResult, file);
        } finally {
          cleanup();
        }
      };

      img.onerror = () => {
        onImageSelected(rawResult, file);
        cleanup();
      };

      img.src = rawResult;
    };

    reader.onerror = () => {
      cleanup();
    };

    reader.readAsDataURL(file);
  };

  // Limpieza en caso de cancelación del selector
  window.addEventListener(
    'focus',
    () => {
      setTimeout(cleanup, 1500);
    },
    { once: true }
  );

  document.body.appendChild(input);
  input.click();
}

/**
 * Selector universal de archivos compatible con iOS Safari / WebKit, Android y Desktop.
 * Soporta selección múltiple y cualquier tipo de archivo (videos, documentos, imágenes).
 */
export function pickFilesUniversal(
  onFilesSelected: (files: File[]) => void,
  options?: { accept?: string; multiple?: boolean }
): void {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return;
  }

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = options?.accept || '*/*';
  input.multiple = options?.multiple ?? false;
  input.style.position = 'fixed';
  input.style.top = '-9999px';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  input.style.pointerEvents = 'none';

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    if (document.body.contains(input)) {
      document.body.removeChild(input);
    }
  };

  input.onchange = (e: any) => {
    const files: File[] = Array.from(e.target?.files || []);
    cleanup();
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  window.addEventListener(
    'focus',
    () => {
      setTimeout(cleanup, 2000);
    },
    { once: true }
  );

  document.body.appendChild(input);
  input.click();
}

