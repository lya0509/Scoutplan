-- =============================================================================
-- Plan Trimestral de la unidad visible para los jóvenes (Plan Progresivo)
-- El plan de la unidad lo guarda un Scouter con SU id (scout_id) y la regla anterior solo
-- dejaba ver al grupo los planes SIN autor: los Rovers no veían el plan de su unidad ni en
-- «Plan Trimestral» ni en el Calendario. Ahora cada miembro aprobado puede LEER los planes
-- de su grupo hechos por un dirigente. Los planes personales de cada joven siguen privados
-- (solo él y sus dirigentes). Editar sigue igual. Se puede ejecutar más de una vez.
-- =============================================================================

-- ¿El perfil es de un dirigente (cualquier rol distinto de scout)? (ya existía; por si acaso)
CREATE OR REPLACE FUNCTION public.es_dirigente(p_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_id AND role IS DISTINCT FROM 'scout');
$$;

DROP POLICY IF EXISTS planes_unidad_ver ON public.quarterly_plans;
CREATE POLICY planes_unidad_ver ON public.quarterly_plans FOR SELECT TO authenticated
  USING (
    group_name IS NOT NULL
    AND group_name = public.mi_grupo()
    AND (scout_id IS NULL OR public.es_dirigente(scout_id))
  );

SELECT 'plan de unidad visible' AS estado,
       count(*) FILTER (WHERE scout_id IS NULL OR public.es_dirigente(scout_id)) AS planes_de_unidad,
       count(*) FILTER (WHERE scout_id IS NOT NULL AND NOT public.es_dirigente(scout_id)) AS planes_personales
FROM public.quarterly_plans;
