// Etiquetas internas que el programa guarda dentro de «Notas importantes»
// (la tabla scout_programas no tiene columnas propias para estos datos).
// Nunca se muestran ni se imprimen: solo las lee programaService.

const META_KEYS = ['PLAN_ACT_ID', 'PROGRAMA_STATUS', 'PREVIEW_ROLES', 'AUTHOR_ID', 'AUTHOR_NAME'] as const;
type MetaKey = typeof META_KEYS[number];

const META_RE = new RegExp(`\\[(?:${META_KEYS.join('|')}):[^\\]]*\\]`, 'g');

/** Texto de las notas sin etiquetas internas ni líneas vacías sobrantes. */
export function visibleNotes(notes?: string | null): string {
  return (notes || '')
    .replace(/\r\n?/g, '\n')
    .replace(META_RE, '')
    .split('\n')
    .map(line => line.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readMeta(notes: string, key: MetaKey): string | undefined {
  const m = notes.match(new RegExp(`\\[${key}:([^\\]]*)\\]`));
  return m ? m[1] : undefined;
}

/**
 * Notas para guardar: el texto visible y, debajo y todas juntas, las etiquetas.
 * Un dato sin valor conserva la etiqueta que ya tenían las notas.
 */
export function notesWithMeta(
  notes: string | undefined,
  meta: Partial<Record<MetaKey, string | undefined>>
): string {
  const raw = notes || '';
  const tags = META_KEYS
    .map(key => {
      const value = meta[key] || readMeta(raw, key);
      return value ? `[${key}:${value}]` : '';
    })
    .filter(Boolean);
  return [visibleNotes(raw), ...tags].filter(Boolean).join('\n');
}
