-- Limpieza de Daniel Rivero (Clan, Grupo Orión #84) — 2026-11-13
--
-- Qué pasó: el 3-nov, desde una cuenta de dirigente, se marcaron requisitos de Descubridor,
-- Fundador y Rover Ciudadano (sin actividades ni evidencias) y se aprobaron esas etapas; después
-- las aprobaciones se quitaron, pero las marcas quedaron. Por eso su perfil muestra avance en
-- Fundador y Rover Ciudadano aunque va por Descubridor.
--
-- Qué hace: DESMARCA (completed = false) esos requisitos. No borra nada: ni sus actividades del
-- catálogo, ni Expedicionario (que está bien), ni el CIP «Día playas» que él registró hoy.
--
-- Cómo usarlo: pégalo en Supabase → SQL Editor y pulsa Run. Primero muestra lo que va a cambiar
-- (deben salir 26 filas: Descubridor 11, Fundador 13, Rover Ciudadano 2) y luego lo cambia.
--
-- Para DESHACERLO: ejecuta el mismo UPDATE con «completed = true» en vez de «false».

-- 1) Vista previa
SELECT stage_id, requirement_id, completed, created_at
FROM public.requirement_progress
WHERE scout_id = '42a8de5f-aaff-4e76-bbdd-aba6d58f6e9d'
  AND stage_id IN ('descubridor', 'fundador', 'rover_ciudadano')
  AND requirement_id NOT LIKE 'act\_%'
  AND completed = true
  AND created_at < '2026-11-04'
ORDER BY stage_id, requirement_id;

-- 2) Desmarcar
UPDATE public.requirement_progress
SET completed = false, updated_at = now()
WHERE scout_id = '42a8de5f-aaff-4e76-bbdd-aba6d58f6e9d'
  AND stage_id IN ('descubridor', 'fundador', 'rover_ciudadano')
  AND requirement_id NOT LIKE 'act\_%'
  AND completed = true
  AND created_at < '2026-11-04';
