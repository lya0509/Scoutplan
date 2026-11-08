-- =============================================================================
-- Historial de cambios + borrar mi cuenta (Plan Progresivo)
-- Requiere supabase_administracion.sql. Ejecutar en Supabase > SQL Editor, bloque por
-- bloque. Se puede ejecutar más de una vez.
-- =============================================================================

-- ======================= BLOQUE 1: historial de cambios ======================

-- 1. Registro de quién cambió qué (roles, aprobaciones, grupos, ramas, cuentas borradas).
--    Lo escribe SOLO la base de datos (disparadores): nadie puede crearlo ni borrarlo desde la app.
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  target_id uuid,
  target_name text,
  group_name text,
  region text,
  district text,
  detail text
);
CREATE INDEX IF NOT EXISTS audit_log_at_idx ON public.audit_log (at DESC);
CREATE INDEX IF NOT EXISTS audit_log_group_idx ON public.audit_log (group_name, at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_log FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.audit_log FROM authenticated;
GRANT SELECT ON public.audit_log TO authenticated;
DROP POLICY IF EXISTS historial_ver ON public.audit_log;
-- Ver: admin/Nacional todo; Comisionados su territorio; Jefatura su grupo.
CREATE POLICY historial_ver ON public.audit_log FOR SELECT TO authenticated
  USING (
    public.puede_admin_territorio(region, district)
    OR (group_name IS NOT NULL AND group_name = public.mi_grupo() AND public.mi_rol() = 'jefe_grupo')
  );

CREATE OR REPLACE FUNCTION public.rol_nombre(r text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE r
    WHEN 'scout' THEN 'Joven' WHEN 'scouter' THEN 'Scouter' WHEN 'jefe_grupo' THEN 'Jefe de Grupo'
    WHEN 'comisionado' THEN 'Comisionado Distrital' WHEN 'comisionado_distrital' THEN 'Comisionado Distrital'
    WHEN 'comisionado_regional' THEN 'Comisionado Regional' WHEN 'nacional' THEN 'Nacional'
    WHEN 'admin' THEN 'Administrador' ELSE coalesce(r, '—') END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_cambio_perfil()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  quien uuid := auth.uid();
  quien_nombre text;
BEGIN
  SELECT name INTO quien_nombre FROM public.profiles WHERE id = quien;
  quien_nombre := coalesce(quien_nombre, CASE WHEN quien IS NULL THEN 'Base de datos (SQL)' ELSE 'Desconocido' END);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
    VALUES (NEW.id, NEW.name, 'registro', NEW.id, NEW.name, NEW.group_name, NEW.region, NEW.district,
            'Se registró' || CASE WHEN NEW.account_status = 'pending' THEN ' (en revisión)' ELSE '' END);
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
    VALUES (quien, quien_nombre, 'rol', NEW.id, NEW.name, NEW.group_name, NEW.region, NEW.district,
            'Rol: ' || public.rol_nombre(OLD.role) || ' → ' || public.rol_nombre(NEW.role));
  END IF;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
    VALUES (quien, quien_nombre, 'cuenta', NEW.id, NEW.name, NEW.group_name, NEW.region, NEW.district,
            CASE NEW.account_status WHEN 'approved' THEN 'Cuenta aprobada' WHEN 'rejected' THEN 'Cuenta rechazada'
                 ELSE 'Cuenta en revisión' END);
  END IF;

  IF NEW.group_name IS DISTINCT FROM OLD.group_name THEN
    -- Dos filas: la ve la Jefatura del grupo anterior y la del nuevo
    INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
    VALUES (quien, quien_nombre, 'grupo', NEW.id, NEW.name, OLD.group_name, OLD.region, OLD.district,
            'Grupo: ' || coalesce(OLD.group_name, '—') || ' → ' || coalesce(NEW.group_name, '—')),
           (quien, quien_nombre, 'grupo', NEW.id, NEW.name, NEW.group_name, NEW.region, NEW.district,
            'Grupo: ' || coalesce(OLD.group_name, '—') || ' → ' || coalesce(NEW.group_name, '—'));
  END IF;

  IF lower(coalesce(NEW.unit, '')) IS DISTINCT FROM lower(coalesce(OLD.unit, '')) THEN
    INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
    VALUES (quien, quien_nombre, 'rama', NEW.id, NEW.name, NEW.group_name, NEW.region, NEW.district,
            'Rama: ' || coalesce(OLD.unit, '—') || ' → ' || coalesce(NEW.unit, '—'));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_cambio_perfil ON public.profiles;
CREATE TRIGGER trg_registrar_cambio_perfil
  AFTER INSERT OR UPDATE OF role, account_status, group_name, unit ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_perfil();

CREATE OR REPLACE FUNCTION public.registrar_cambio_grupo()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  quien uuid := auth.uid();
  quien_nombre text;
BEGIN
  SELECT name INTO quien_nombre FROM public.profiles WHERE id = quien;
  quien_nombre := coalesce(quien_nombre, 'Base de datos (SQL)');
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (actor_id, actor_name, action, group_name, region, district, detail)
    VALUES (quien, quien_nombre, 'grupo_creado', NEW.name, NEW.region_id, NEW.district_id, 'Grupo creado: ' || NEW.name);
  ELSIF NEW.active IS DISTINCT FROM OLD.active THEN
    INSERT INTO public.audit_log (actor_id, actor_name, action, group_name, region, district, detail)
    VALUES (quien, quien_nombre, 'grupo_estado', NEW.name, NEW.region_id, NEW.district_id,
            CASE WHEN NEW.active THEN 'Grupo activado: ' ELSE 'Grupo desactivado: ' END || NEW.name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_cambio_grupo ON public.scout_groups;
CREATE TRIGGER trg_registrar_cambio_grupo
  AFTER INSERT OR UPDATE OF active ON public.scout_groups
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_grupo();

SELECT 'historial listo' AS bloque_1, count(*) AS eventos FROM public.audit_log;


-- ======================= BLOQUE 2: borrar mi cuenta ==========================
-- Lo usa SOLO el servidor de la app (/api/delete-account, con la clave de servicio),
-- después de comprobar que quien lo pide es el dueño de la cuenta.

-- 2. Archivos (fotos, certificados, firmas, comprobantes) de una persona
CREATE OR REPLACE FUNCTION public.archivos_de_usuario(p_uid uuid)
RETURNS TABLE (name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage
AS $$ SELECT o.name FROM storage.objects o WHERE o.bucket_id = 'scout-files' AND o.owner = p_uid; $$;
REVOKE EXECUTE ON FUNCTION public.archivos_de_usuario(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.archivos_de_usuario(uuid) TO service_role;

-- 3. Borra los datos PERSONALES. Lo que es del grupo (calendario, programas, planes
--    trimestrales) se conserva sin autor. Revisa qué tablas/columnas existen.
CREATE OR REPLACE FUNCTION public.borrar_datos_de_cuenta(p_uid uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p public.profiles%ROWTYPE;
  par text[];
  pares_grupo text[][] := ARRAY[
    ARRAY['calendar_events', 'created_by'],
    ARRAY['scout_programas', 'created_by'],
    ARRAY['quarterly_plans', 'scout_id'],
    ARRAY['quarterly_plans', 'created_by'],
    ARRAY['bug_reports', 'user_id'],
    ARRAY['scout_groups', 'created_by']
  ];
  pares_personales text[][] := ARRAY[
    ARRAY['certificates', 'scout_id'],
    ARRAY['requirement_progress', 'scout_id'],
    ARRAY['stage_progress', 'scout_id'],
    ARRAY['scout_notifications', 'scout_id'],
    ARRAY['notifications', 'receiver_id'],
    ARRAY['notifications', 'sender_id'],
    ARRAY['push_subscriptions', 'user_id']
  ];
  existe boolean;
  nullable boolean;
BEGIN
  SELECT * INTO p FROM public.profiles WHERE id = p_uid;

  -- Contenido del grupo: quitar el autor (no borrarlo)
  FOREACH par SLICE 1 IN ARRAY pares_grupo LOOP
    SELECT true, (c.is_nullable = 'YES') INTO existe, nullable
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = par[1] AND c.column_name = par[2];
    IF existe AND nullable THEN
      EXECUTE format('UPDATE public.%I SET %I = NULL WHERE %I::text = $1::text', par[1], par[2], par[2]) USING p_uid;
    END IF;
    existe := NULL; nullable := NULL;
  END LOOP;

  -- Datos personales: borrar
  FOREACH par SLICE 1 IN ARRAY pares_personales LOOP
    SELECT true INTO existe
    FROM information_schema.columns c
    WHERE c.table_schema = 'public' AND c.table_name = par[1] AND c.column_name = par[2];
    IF existe THEN
      EXECUTE format('DELETE FROM public.%I WHERE %I::text = $1::text', par[1], par[2]) USING p_uid;
    END IF;
    existe := NULL;
  END LOOP;

  IF p.id IS NOT NULL THEN
    INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
    VALUES (p_uid, p.name, 'cuenta_borrada', p_uid, p.name, p.group_name, p.region, p.district,
            'Borró su cuenta (' || public.rol_nombre(p.role) || coalesce(', ' || p.unit, '') || ')');
    DELETE FROM public.profiles WHERE id = p_uid;
  END IF;

  RETURN coalesce(p.name, 'sin perfil');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.borrar_datos_de_cuenta(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.borrar_datos_de_cuenta(uuid) TO service_role;

SELECT 'borrado listo' AS bloque_2;
