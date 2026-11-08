-- =============================================================================
-- CIP oficiales (Ciclos Institucionales de Programa) — Plan Progresivo
-- Requiere supabase_administracion.sql. Ejecutar en Supabase > SQL Editor.
-- Se puede ejecutar más de una vez.
--
-- - Catálogo de CIP con nombre, fecha, lugar y nivel (distrital / regional / nacional).
-- - Mientras no haya Comisionados, los crea la Jefatura o un Scouter y los ve su grupo.
--   Los que crea un Comisionado los ve su distrito / región; los nacionales, todo el país.
-- - La asistencia la marca el Scouter (fila cip_sel_* en certificates). El joven NO puede
--   acreditarse un CIP a sí mismo; sí puede pedir que le acrediten uno anterior a la app.
-- =============================================================================

-- 1. Catálogo
CREATE TABLE IF NOT EXISTS public.cip_oficiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  fecha date,
  lugar text,
  nivel text NOT NULL CHECK (nivel IN ('distrital', 'regional', 'nacional')),
  group_name text,          -- con valor: lo creó un grupo y solo lo ve ese grupo
  region text,
  district text,
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cip_oficiales_fecha_idx ON public.cip_oficiales (fecha DESC);

ALTER TABLE public.cip_oficiales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cip_oficiales FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.cip_oficiales TO authenticated;

-- ¿Puedo crear/editar este CIP?
CREATE OR REPLACE FUNCTION public.puede_gestionar_cip(p_group text, p_region text, p_district text, p_nivel text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN p_group IS NOT NULL THEN
      -- CIP del grupo: Jefatura o Scouters aprobados de ese grupo
      p_group = public.mi_grupo() AND public.mi_rol() IN ('jefe_grupo', 'scouter')
    WHEN p_nivel = 'nacional' THEN
      public.mi_rol() IN ('admin', 'nacional') AND public.cuenta_aprobada()
    ELSE
      public.puede_admin_territorio(p_region, p_district)
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.puede_gestionar_cip(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_gestionar_cip(text, text, text, text) TO authenticated;

DROP POLICY IF EXISTS cip_ver ON public.cip_oficiales;
DROP POLICY IF EXISTS cip_crear ON public.cip_oficiales;
DROP POLICY IF EXISTS cip_editar ON public.cip_oficiales;
CREATE POLICY cip_ver ON public.cip_oficiales FOR SELECT TO authenticated
  USING (
    public.cuenta_aprobada() AND (
      (group_name IS NOT NULL AND group_name = public.mi_grupo())
      OR (group_name IS NULL AND nivel = 'nacional')
      OR (group_name IS NULL AND nivel = 'regional' AND region = (SELECT p.region FROM public.profiles p WHERE p.id = auth.uid()))
      OR (group_name IS NULL AND nivel = 'distrital' AND district = (SELECT p.district FROM public.profiles p WHERE p.id = auth.uid()))
      OR public.puede_admin_territorio(region, district)
    )
  );
CREATE POLICY cip_crear ON public.cip_oficiales FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.puede_gestionar_cip(group_name, region, district, nivel));
CREATE POLICY cip_editar ON public.cip_oficiales FOR UPDATE TO authenticated
  USING (public.puede_gestionar_cip(group_name, region, district, nivel))
  WITH CHECK (public.puede_gestionar_cip(group_name, region, district, nivel));

-- 2. La asistencia a un CIP (cip_sel_*) solo la registra un dirigente, no el propio joven.
--    Las solicitudes de CIP anteriores a la app (cip_sol_*) sí las crea el joven.
CREATE OR REPLACE FUNCTION public.proteger_cip_acreditado()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  fila record;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_OP = 'DELETE' THEN fila := OLD; ELSE fila := NEW; END IF;
  IF coalesce(fila.category, '') LIKE 'cip\_sel\_%' AND fila.scout_id::text = auth.uid()::text
     AND coalesce(public.mi_rol(), 'scout') = 'scout' THEN
    RAISE EXCEPTION 'Tu Scouter es quien marca tu asistencia a los CIP';
  END IF;
  IF TG_OP = 'UPDATE' AND coalesce(OLD.category, '') LIKE 'cip\_sel\_%' AND OLD.scout_id::text = auth.uid()::text
     AND coalesce(public.mi_rol(), 'scout') = 'scout' THEN
    RAISE EXCEPTION 'Tu Scouter es quien marca tu asistencia a los CIP';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.certificates') IS NOT NULL THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_proteger_cip_acreditado ON public.certificates';
    EXECUTE 'CREATE TRIGGER trg_proteger_cip_acreditado BEFORE INSERT OR UPDATE OR DELETE ON public.certificates
             FOR EACH ROW EXECUTE FUNCTION public.proteger_cip_acreditado()';
  END IF;
END $$;

SELECT 'cip listo' AS estado, count(*) AS cip_en_catalogo FROM public.cip_oficiales;
