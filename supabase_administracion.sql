-- =============================================================================
-- Administración de grupos y roles (Plan Progresivo)
-- Requiere supabase_aprobacion_cuentas.sql y supabase_aviso_cuentas_pendientes.sql.
-- Ejecutar en Supabase > SQL Editor, bloque por bloque. Se puede ejecutar más de una vez.
-- =============================================================================

-- ======================= BLOQUE 1: catálogo de grupos ===========================
-- Las tablas scout_regions / scout_districts / scout_groups ya existen
-- (supabase_national_hierarchy_schema.sql) pero la app no las usaba. Aquí se completan.

-- 1. Grupos: id automático, activo/inactivo, quién lo creó
ALTER TABLE public.scout_groups ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE public.scout_groups ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.scout_groups ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. El nombre del catálogo debe ser idéntico al que guarda cada perfil (group_name).
--    Los grupos sembrados decían "Grupo Scout X"; el registro guarda "Grupo X".
UPDATE public.scout_groups g SET name = v.nuevo
FROM (VALUES
  ('grupo_orion_84', 'Grupo Orión #84'), ('grupo_alianza', 'Grupo Alianza'),
  ('grupo_mafeking', 'Grupo Mafeking'), ('grupo_gamma', 'Grupo Gamma'),
  ('grupo_sirio', 'Grupo Sirio'), ('grupo_aquatiri', 'Grupo Aquatiri')
) AS v(id, nuevo)
WHERE g.id = v.id
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.group_name = g.name)
  AND NOT EXISTS (SELECT 1 FROM public.scout_groups o WHERE o.name = v.nuevo);
CREATE UNIQUE INDEX IF NOT EXISTS scout_groups_name_key ON public.scout_groups (name);

-- 3. Agregar los grupos que ya usan los perfiles y no están en el catálogo
WITH m AS (
  SELECT group_name,
         mode() WITHIN GROUP (ORDER BY region) AS region,
         mode() WITHIN GROUP (ORDER BY district) AS district
  FROM public.profiles
  WHERE coalesce(group_name, '') NOT IN ('', 'Otro Grupo Scout')
  GROUP BY group_name
)
INSERT INTO public.scout_groups (name, region_id, district_id)
SELECT m.group_name, r.id, d.id
FROM m
LEFT JOIN public.scout_regions r ON r.id = m.region
LEFT JOIN public.scout_districts d ON d.id = m.district
ON CONFLICT (name) DO NOTHING;

-- 4. ¿Puedo administrar ese territorio? Admin/Nacional: todo el país;
--    Comisionado Regional: su región; Comisionado Distrital: su distrito.
CREATE OR REPLACE FUNCTION public.puede_admin_territorio(p_region text, p_district text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles yo
    WHERE yo.id = auth.uid()
      AND yo.account_status = 'approved'
      AND (
        yo.role IN ('admin', 'nacional')
        OR (yo.role = 'comisionado_regional' AND p_region IS NOT NULL AND p_region = yo.region)
        OR (yo.role IN ('comisionado_distrital', 'comisionado') AND p_district IS NOT NULL AND p_district = yo.district)
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION public.puede_admin_territorio(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.puede_admin_territorio(text, text) TO authenticated;

-- 5. Reglas de grupos: ver = cuenta aprobada; crear/editar = según territorio
ALTER TABLE public.scout_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS grupos_leer ON public.scout_groups;
DROP POLICY IF EXISTS catalogos_admin_grupos ON public.scout_groups;
DROP POLICY IF EXISTS "Lectura publica de grupos para usuarios autenticados" ON public.scout_groups;
DROP POLICY IF EXISTS grupos_ver ON public.scout_groups;
DROP POLICY IF EXISTS grupos_crear ON public.scout_groups;
DROP POLICY IF EXISTS grupos_editar ON public.scout_groups;
CREATE POLICY grupos_ver ON public.scout_groups FOR SELECT TO authenticated
  USING (public.cuenta_aprobada());
CREATE POLICY grupos_crear ON public.scout_groups FOR INSERT TO authenticated
  WITH CHECK (public.puede_admin_territorio(region_id, district_id));
CREATE POLICY grupos_editar ON public.scout_groups FOR UPDATE TO authenticated
  USING (public.puede_admin_territorio(region_id, district_id))
  WITH CHECK (public.puede_admin_territorio(region_id, district_id));
REVOKE ALL ON public.scout_groups FROM anon;

-- 6. Distritos: el Comisionado Regional (y admin) puede crear distritos nuevos en su región
DROP POLICY IF EXISTS distritos_crear ON public.scout_districts;
CREATE POLICY distritos_crear ON public.scout_districts FOR INSERT TO authenticated
  WITH CHECK (public.puede_admin_territorio(region_id, NULL));

SELECT g.name AS grupo, g.region_id AS region, coalesce(d.name, g.district_id) AS distrito, g.active
FROM public.scout_groups g LEFT JOIN public.scout_districts d ON d.id = g.district_id
ORDER BY g.region_id NULLS LAST, distrito, g.name;


-- ================= BLOQUE 2: quién puede cambiar roles y grupos ===============

-- 5. Cambios de perfil:
--    - Nadie cambia su propio rol ni se aprueba a sí mismo.
--    - Scouter: no cambia roles. Jefatura: Scout / Scouter / Jefe de Grupo en su grupo.
--    - Comisionado Distrital: lo mismo en su distrito. Regional: además Comisionado Distrital.
--    - Mover a OTRA persona de grupo/distrito/región: solo Comisionados (dentro de su
--      territorio) o admin. Un scout que se cambia de grupo él mismo vuelve a revisión.
CREATE OR REPLACE FUNCTION public.proteger_perfil()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  quien uuid := auth.uid();
  yo public.profiles%ROWTYPE;
  roles_ok text[];
BEGIN
  IF quien IS NULL THEN RETURN NEW; END IF;

  SELECT * INTO yo FROM public.profiles WHERE id = quien;
  IF yo.role IN ('admin', 'nacional') AND yo.account_status = 'approved' THEN RETURN NEW; END IF;

  roles_ok := CASE
    WHEN yo.role = 'comisionado_regional' THEN ARRAY['scout', 'scouter', 'jefe_grupo', 'comisionado_distrital']
    WHEN yo.role IN ('comisionado_distrital', 'comisionado', 'jefe_grupo') THEN ARRAY['scout', 'scouter', 'jefe_grupo']
    ELSE ARRAY[]::text[]
  END;

  -- Roles
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF quien = NEW.id THEN
      RAISE EXCEPTION 'No puedes cambiar tu propio rol';
    END IF;
    IF NOT (coalesce(OLD.role, 'scout') = ANY (roles_ok)) OR NOT (NEW.role = ANY (roles_ok)) THEN
      RAISE EXCEPTION 'No tienes permiso para asignar ese rol';
    END IF;
  END IF;

  -- Estado de la cuenta
  IF quien = NEW.id AND NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'Tu cuenta la aprueba tu Scouter o la Jefatura';
  END IF;

  -- Grupo / distrito / región
  IF (NEW.group_name, NEW.district, NEW.region) IS DISTINCT FROM (OLD.group_name, OLD.district, OLD.region) THEN
    IF quien = NEW.id THEN
      IF OLD.role <> 'scout' THEN
        RAISE EXCEPTION 'Pide a un Comisionado o admin que cambie tu grupo, distrito o región';
      END IF;
      IF NEW.group_name IS DISTINCT FROM OLD.group_name THEN
        NEW.account_status := 'pending';  -- vuelve a revisión del grupo nuevo
      END IF;
    ELSIF yo.role = 'comisionado_regional' THEN
      IF NEW.region IS DISTINCT FROM yo.region THEN
        RAISE EXCEPTION 'Solo puedes mover personas dentro de tu región';
      END IF;
    ELSIF yo.role IN ('comisionado_distrital', 'comisionado') THEN
      IF NEW.district IS DISTINCT FROM yo.district THEN
        RAISE EXCEPTION 'Solo puedes mover personas dentro de tu distrito';
      END IF;
    ELSE
      RAISE EXCEPTION 'Solo un Comisionado o admin puede cambiar a alguien de grupo';
    END IF;
  END IF;

  -- Membresía
  IF quien = NEW.id AND NEW.membership_status = 'approved'
     AND OLD.membership_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Tu membresía la aprueba un dirigente';
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Aviso de cuenta por aprobar: si el grupo aún no tiene Jefatura ni Scouter de esa
--    rama (grupo nuevo), avisar al Comisionado del distrito, si no al Regional, y si no
--    a admin/Nacional.
CREATE OR REPLACE FUNCTION public.avisar_cuenta_pendiente()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  texto text;
  n int;
BEGIN
  IF NEW.account_status <> 'pending' OR NEW.group_name IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.account_status = 'pending'
     AND OLD.group_name IS NOT DISTINCT FROM NEW.group_name THEN
    RETURN NEW;
  END IF;

  texto := coalesce(NEW.name, 'Una persona') || ' se registró en '
           || coalesce(upper(NEW.unit), 'el grupo') || ' de ' || NEW.group_name
           || '. Revisa si es miembro del grupo y apruébala.';

  INSERT INTO public.scout_notifications (scout_id, title, reason, is_read)
  SELECT d.id, '🕓 Cuenta por aprobar', texto, false
  FROM public.profiles d
  WHERE d.id <> NEW.id AND d.account_status = 'approved' AND d.group_name = NEW.group_name
    AND (d.role = 'jefe_grupo'
         OR (d.role = 'scouter' AND lower(coalesce(d.unit, '')) = lower(coalesce(NEW.unit, ''))));
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RETURN NEW; END IF;

  INSERT INTO public.scout_notifications (scout_id, title, reason, is_read)
  SELECT d.id, '🕓 Cuenta por aprobar (grupo sin Jefatura)', texto, false
  FROM public.profiles d
  WHERE d.id <> NEW.id AND d.account_status = 'approved'
    AND d.role IN ('comisionado_distrital', 'comisionado') AND d.district = NEW.district;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RETURN NEW; END IF;

  INSERT INTO public.scout_notifications (scout_id, title, reason, is_read)
  SELECT d.id, '🕓 Cuenta por aprobar (grupo sin Jefatura)', texto, false
  FROM public.profiles d
  WHERE d.id <> NEW.id AND d.account_status = 'approved'
    AND d.role = 'comisionado_regional' AND d.region = NEW.region;
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n > 0 THEN RETURN NEW; END IF;

  INSERT INTO public.scout_notifications (scout_id, title, reason, is_read)
  SELECT d.id, '🕓 Cuenta por aprobar (grupo sin Jefatura)', texto, false
  FROM public.profiles d
  WHERE d.id <> NEW.id AND d.account_status = 'approved' AND d.role IN ('admin', 'nacional');

  RETURN NEW;
END;
$$;

SELECT 'listo' AS bloque_2, count(*) FILTER (WHERE role IN ('admin', 'nacional')) AS admins,
       count(*) FILTER (WHERE role LIKE 'comisionado%') AS comisionados,
       count(*) FILTER (WHERE role = 'jefe_grupo') AS jefaturas
FROM public.profiles;


-- ============ BLOQUE 3 (OPCIONAL): grupos nuevos en el formulario de registro ============
-- El registro ocurre ANTES de iniciar sesión. Para que un grupo creado en la app aparezca
-- en el formulario, esta función deja ver SIN SESIÓN únicamente la lista de grupos activos
-- (nombre, región, distrito): ningún dato de personas. Si no se ejecuta, el registro sigue
-- con la lista fija de la app y los grupos nuevos se asignan desde Administración.
DROP FUNCTION IF EXISTS public.grupos_registro();
CREATE OR REPLACE FUNCTION public.grupos_registro()
RETURNS TABLE (name text, region text, district text, district_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT g.name, g.region_id, g.district_id, d.name
  FROM public.scout_groups g LEFT JOIN public.scout_districts d ON d.id = g.district_id
  WHERE g.active
  ORDER BY g.name;
$$;
GRANT EXECUTE ON FUNCTION public.grupos_registro() TO anon, authenticated;

SELECT count(*) AS grupos_en_registro FROM public.grupos_registro();
