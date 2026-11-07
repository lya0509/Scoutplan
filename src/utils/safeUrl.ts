/**
 * Enlaces que vienen de datos de usuarios (p. ej. el archivo de un certificado).
 * Solo se permiten http(s), imágenes en data: y blob:. Un enlace "javascript:" abierto
 * con <a>.click() se ejecutaría en la sesión de quien lo abre (p. ej. un dirigente).
 */
export function isSafeFileUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const u = url.trim().toLowerCase();
  return u.startsWith('https://') || u.startsWith('http://') || u.startsWith('data:image/') || u.startsWith('blob:');
}

export function safeFileUrl(url: unknown): string | null {
  return isSafeFileUrl(url) ? (url as string).trim() : null;
}
