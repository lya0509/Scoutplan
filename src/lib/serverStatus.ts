// Estado de la conexión con el servidor (Supabase), separado de «hay internet o no».
// Lo actualiza el fetch de supabaseClient y lo muestra ServerStatusBanner.
// Sin dependencias a propósito: supabaseClient lo importa y no puede haber ciclos.

export interface ServerProblem {
  /** Código corto para capturas y reportes: SERVIDOR-503, SIN-RESPUESTA, TIEMPO-AGOTADO… */
  code: string;
  since: number;
}

let problem: ServerProblem | null = null;
const listeners = new Set<(p: ServerProblem | null) => void>();

function emit() {
  listeners.forEach(fn => { try { fn(problem); } catch {} });
}

export function getServerProblem(): ServerProblem | null {
  return problem;
}

export function subscribeServerProblem(fn: (p: ServerProblem | null) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function markServerDown(code: string) {
  if (problem?.code === code) return;
  problem = { code, since: problem?.since ?? Date.now() };
  emit();
}

export function markServerUp() {
  if (!problem) return;
  problem = null;
  emit();
}
