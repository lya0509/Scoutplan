-- ============================================================================
-- PAÑOLETA DEL GRUPO (colores que define la Jefatura)
-- ============================================================================
-- Ejecutar DESPUÉS de supabase_administracion.sql. Se puede repetir sin problema.
--
-- Qué hace:
--   1. Agrega a scout_groups la columna `scarf` (jsonb):
--        { "base": "#7a1f3d", "stripes": ["#ffffff", "#29b6f6"] }
--      base    = color de fondo de la pañoleta
--      stripes = franjas en orden, de 0 a 8 (hay pañoletas de un solo color y otras de siete)
--      NULL    = el grupo no la ha definido: el avatar la dibuja en blanco, como antes.
--   2. Crea guardar_panoleta_grupo(base, franjas): la ÚNICA forma de cambiarla.
--      Solo la Jefatura (o admin/Nacional) y solo para SU PROPIO grupo; la cuenta debe
--      estar aprobada. Las reglas de scout_groups no cambian: la Jefatura sigue sin
--      poder editar nada más del catálogo (nombre, distrito, activo).
--   Leerla: la regla grupos_ver ya deja ver el catálogo a toda cuenta aprobada, así que
--   cualquiera con sesión ve la pañoleta de cada grupo. Sin sesión no se ve nada.
-- ============================================================================

ALTER TABLE public.scout_groups ADD COLUMN IF NOT EXISTS scarf jsonb;

CREATE OR REPLACE FUNCTION public.guardar_panoleta_grupo(p_base text, p_franjas text[] DEFAULT '{}')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_grupo text := public.mi_grupo();          -- NULL si la cuenta no está aprobada
  v_franjas text[] := COALESCE(p_franjas, '{}');
  v_scarf jsonb;
  f text;
BEGIN
  IF v_grupo IS NULL OR public.mi_rol() NOT IN ('jefe_grupo', 'admin', 'nacional') THEN
    RAISE EXCEPTION 'Solo la Jefatura puede cambiar la pañoleta de su grupo.' USING ERRCODE = '42501';
  END IF;

  IF p_base IS NULL THEN
    v_scarf := NULL;                          -- quitar: vuelve a la pañoleta blanca
  ELSE
    IF p_base !~ '^#[0-9a-fA-F]{6}$' THEN
      RAISE EXCEPTION 'Color de fondo no válido.' USING ERRCODE = '22023';
    END IF;
    IF COALESCE(array_length(v_franjas, 1), 0) > 8 THEN
      RAISE EXCEPTION 'La pañoleta admite hasta 8 franjas.' USING ERRCODE = '22023';
    END IF;
    FOREACH f IN ARRAY v_franjas LOOP
      IF f IS NULL OR f !~ '^#[0-9a-fA-F]{6}$' THEN
        RAISE EXCEPTION 'Color de franja no válido.' USING ERRCODE = '22023';
      END IF;
    END LOOP;
    v_scarf := jsonb_build_object('base', lower(p_base), 'stripes', to_jsonb(ARRAY(SELECT lower(x) FROM unnest(v_franjas) x)));
  END IF;

  UPDATE public.scout_groups SET scarf = v_scarf WHERE name = v_grupo;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tu grupo no está en el catálogo de grupos.' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_scarf;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guardar_panoleta_grupo(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.guardar_panoleta_grupo(text, text[]) TO authenticated;
