-- =====================================================================
-- Plan Progresivo Scout · Correcciones de seguridad (RLS) — 2026-10-25
-- Ejecutar DESPUÉS de supabase_rls_seguridad.sql y supabase_rls_resto.sql,
-- en Supabase > SQL Editor. Se puede volver a ejecutar sin problema.
--
-- Qué corrige:
--   1. Un usuario ya no puede borrar su perfil y volver a crearlo como admin.
--   2. Un scout ya no puede aprobarse sus propias etapas.
--   3. Directorio de la unidad: los scouts vuelven a ver a sus compañeros
--      de grupo (solo nombre, unidad, rol y fotos; nunca ficha médica,
--      cédula, teléfono ni correo) y su avance de etapas.
--   4. Calendario y programas: cada grupo solo ve y edita lo suyo.
--      Los CIP creados por dirigentes siguen siendo visibles para todos.
--   5. Notificaciones: nadie puede firmar una notificación como otra persona.
--   6. Certificados, notificaciones de scouts y reportes de error quedan
--      protegidos por dueño (antes cualquiera con sesión podía leerlos).
-- =====================================================================

-- ---------- 0. Funciones de apoyo ----------
-- ¿El perfil p_id es del mismo grupo que el usuario con sesión?
CREATE OR REPLACE FUNCTION public.mismo_grupo(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles yo
    JOIN public.profiles t ON t.id::text = p_id
    WHERE yo.id = auth.uid()
      AND yo.group_name IS NOT NULL
      AND t.group_name = yo.group_name
  );
$$;

-- ¿El perfil p_id es de un dirigente (cualquier rol distinto de scout)?
CREATE OR REPLACE FUNCTION public.es_dirigente(p_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_id AND role IS DISTINCT FROM 'scout'
  );
$$;

-- ---------- 1. Perfiles: el alta no puede elegir rol ----------
-- La regla perfiles_borrar deja borrar el propio perfil y perfiles_crear deja
-- volver a crearlo; el trigger proteger_perfil solo vigilaba UPDATE.
CREATE OR REPLACE FUNCTION public.proteger_alta_perfil()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Sin sesión = registro (trigger de auth), servidor o SQL Editor: permitido.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.mi_rol() IN ('admin', 'nacional') THEN RETURN NEW; END IF;

  NEW.role := 'scout';
  IF NEW.membership_status = 'approved' THEN
    NEW.membership_status := 'none';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_alta_perfil ON public.profiles;
CREATE TRIGGER proteger_alta_perfil
  BEFORE INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_alta_perfil();

-- ---------- 2. Etapas: solo un dirigente aprueba ----------
CREATE OR REPLACE FUNCTION public.proteger_aprobacion_etapa()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'Aprobada'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'Aprobada') THEN
    IF NEW.scout_id::text = auth.uid()::text THEN
      RAISE EXCEPTION 'Tu etapa la aprueba un dirigente';
    END IF;
    IF COALESCE(public.mi_rol(), 'scout') = 'scout' THEN
      RAISE EXCEPTION 'Solo un dirigente puede aprobar etapas';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_aprobacion_etapa ON public.stage_progress;
CREATE TRIGGER proteger_aprobacion_etapa
  BEFORE INSERT OR UPDATE ON public.stage_progress
  FOR EACH ROW EXECUTE FUNCTION public.proteger_aprobacion_etapa();

-- ---------- 3. Directorio del grupo y perfil público ----------
-- Devuelven solo datos públicos. La app los usa en "Rovers" y en "Ver Perfil".
CREATE OR REPLACE FUNCTION public.directorio_grupo()
RETURNS TABLE (
  id text, name text, role text, unit text, group_name text,
  avatar_url text, custom_avatar_url text, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id::text, p.name::text, p.role::text, p.unit::text, p.group_name::text,
         p.avatar_url::text, p.custom_avatar_url::text, p.updated_at::timestamptz
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.group_name = public.mi_grupo();
$$;

CREATE OR REPLACE FUNCTION public.perfil_publico(p_id text)
RETURNS TABLE (
  id text, name text, role text, unit text, group_name text,
  avatar_url text, custom_avatar_url text, updated_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id::text, p.name::text, p.role::text, p.unit::text, p.group_name::text,
         p.avatar_url::text, p.custom_avatar_url::text, p.updated_at::timestamptz
  FROM public.profiles p
  WHERE p.id::text = p_id
    AND (public.mismo_grupo(p_id) OR public.puede_gestionar(p_id));
$$;

REVOKE EXECUTE ON FUNCTION public.directorio_grupo() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.perfil_publico(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.directorio_grupo() TO authenticated;
GRANT EXECUTE ON FUNCTION public.perfil_publico(text) TO authenticated;

-- El avance de etapas se puede ver dentro del grupo (como antes). Editarlo, no.
DROP POLICY IF EXISTS progreso_etapas_grupo_ver ON public.stage_progress;
CREATE POLICY progreso_etapas_grupo_ver ON public.stage_progress FOR SELECT TO authenticated
  USING (public.mismo_grupo(scout_id::text));
DROP POLICY IF EXISTS progreso_requisitos_grupo_ver ON public.requirement_progress;
CREATE POLICY progreso_requisitos_grupo_ver ON public.requirement_progress FOR SELECT TO authenticated
  USING (public.mismo_grupo(scout_id::text));

-- ---------- 4. Calendario y programas: por grupo ----------
-- Al crear, el autor y el grupo los pone el servidor (la app no enviaba group_name
-- y todo quedaba como 'Grupo Scout Orión #84' por defecto).
CREATE OR REPLACE FUNCTION public.asignar_grupo_y_autor()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  IF COALESCE(public.mi_rol(), '') NOT IN ('admin', 'nacional') OR NEW.group_name IS NULL THEN
    NEW.group_name := public.mi_grupo();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignar_grupo_y_autor ON public.calendar_events;
CREATE TRIGGER asignar_grupo_y_autor
  BEFORE INSERT ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.asignar_grupo_y_autor();

DROP TRIGGER IF EXISTS asignar_grupo_y_autor ON public.scout_programas;
CREATE TRIGGER asignar_grupo_y_autor
  BEFORE INSERT ON public.scout_programas
  FOR EACH ROW EXECUTE FUNCTION public.asignar_grupo_y_autor();

-- Arreglo único: los registros viejos toman el grupo real de quien los creó.
UPDATE public.calendar_events e SET group_name = p.group_name
FROM public.profiles p
WHERE e.created_by = p.id AND p.group_name IS NOT NULL
  AND e.group_name IS DISTINCT FROM p.group_name;
UPDATE public.scout_programas s SET group_name = p.group_name
FROM public.profiles p
WHERE s.created_by = p.id AND p.group_name IS NOT NULL
  AND s.group_name IS DISTINCT FROM p.group_name;

DROP POLICY IF EXISTS calendario_con_sesion ON public.calendar_events;
DROP POLICY IF EXISTS calendario_ver ON public.calendar_events;
DROP POLICY IF EXISTS calendario_crear ON public.calendar_events;
DROP POLICY IF EXISTS calendario_editar ON public.calendar_events;
DROP POLICY IF EXISTS calendario_borrar ON public.calendar_events;

CREATE POLICY calendario_ver ON public.calendar_events FOR SELECT TO authenticated
  USING (
    group_name = public.mi_grupo()
    OR created_by = auth.uid()
    OR (created_by IS NOT NULL AND public.puede_gestionar(created_by::text))
    OR ((title ILIKE '[CIP%' OR title ILIKE '[6P%') AND public.es_dirigente(created_by))
    OR public.mi_rol() IN ('admin', 'nacional')
  );
CREATE POLICY calendario_crear ON public.calendar_events FOR INSERT TO authenticated
  WITH CHECK (group_name = public.mi_grupo() OR public.mi_rol() IN ('admin', 'nacional'));
-- Dentro del grupo se colabora (p. ej. agregar fotos a un álbum compartido).
CREATE POLICY calendario_editar ON public.calendar_events FOR UPDATE TO authenticated
  USING (group_name = public.mi_grupo() OR created_by = auth.uid() OR public.mi_rol() IN ('admin', 'nacional'))
  WITH CHECK (group_name = public.mi_grupo() OR public.mi_rol() IN ('admin', 'nacional'));
-- Borrar: el autor, los dirigentes del grupo, o nacional/admin.
CREATE POLICY calendario_borrar ON public.calendar_events FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR (public.mi_rol() IN ('scouter', 'jefe_grupo') AND group_name = public.mi_grupo())
    OR public.mi_rol() IN ('admin', 'nacional')
  );

DROP POLICY IF EXISTS programas_con_sesion ON public.scout_programas;
DROP POLICY IF EXISTS programas_ver ON public.scout_programas;
DROP POLICY IF EXISTS programas_crear ON public.scout_programas;
DROP POLICY IF EXISTS programas_editar ON public.scout_programas;
DROP POLICY IF EXISTS programas_borrar ON public.scout_programas;

CREATE POLICY programas_ver ON public.scout_programas FOR SELECT TO authenticated
  USING (
    group_name = public.mi_grupo()
    OR created_by = auth.uid()
    OR (created_by IS NOT NULL AND public.puede_gestionar(created_by::text))
    OR public.mi_rol() IN ('admin', 'nacional')
  );
CREATE POLICY programas_crear ON public.scout_programas FOR INSERT TO authenticated
  WITH CHECK (group_name = public.mi_grupo() OR public.mi_rol() IN ('admin', 'nacional'));
CREATE POLICY programas_editar ON public.scout_programas FOR UPDATE TO authenticated
  USING (group_name = public.mi_grupo() OR created_by = auth.uid() OR public.mi_rol() IN ('admin', 'nacional'))
  WITH CHECK (group_name = public.mi_grupo() OR public.mi_rol() IN ('admin', 'nacional'));
CREATE POLICY programas_borrar ON public.scout_programas FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR (public.mi_rol() IN ('scouter', 'jefe_grupo') AND group_name = public.mi_grupo())
    OR public.mi_rol() IN ('admin', 'nacional')
  );

-- ---------- 5. Notificaciones: el remitente es siempre quien envía ----------
CREATE OR REPLACE FUNCTION public.asignar_remitente()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.sender_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS asignar_remitente ON public.notifications;
CREATE TRIGGER asignar_remitente
  BEFORE INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.asignar_remitente();

DROP POLICY IF EXISTS notificaciones_crear ON public.notifications;
CREATE POLICY notificaciones_crear ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (sender_id::text = auth.uid()::text);

-- ---------- 6. Tablas creadas desde el panel (no estaban en ningún .sql) ----------
-- Se reemplazan TODAS sus reglas actuales. Solo se aplica si la tabla existe.
DO $$
DECLARE pol record;
BEGIN
  IF to_regclass('public.certificates') IS NOT NULL THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'certificates' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.certificates', pol.policyname);
    END LOOP;
    ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
    -- El scout y sus dirigentes (igual que el progreso).
    CREATE POLICY certificados ON public.certificates FOR ALL TO authenticated
      USING (public.puede_gestionar(scout_id::text))
      WITH CHECK (public.puede_gestionar(scout_id::text));
  END IF;

  IF to_regclass('public.scout_notifications') IS NOT NULL THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'scout_notifications' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.scout_notifications', pol.policyname);
    END LOOP;
    ALTER TABLE public.scout_notifications ENABLE ROW LEVEL SECURITY;
    CREATE POLICY avisos_ver ON public.scout_notifications FOR SELECT TO authenticated
      USING (scout_id::text = auth.uid()::text);
    CREATE POLICY avisos_editar ON public.scout_notifications FOR UPDATE TO authenticated
      USING (scout_id::text = auth.uid()::text);
    CREATE POLICY avisos_borrar ON public.scout_notifications FOR DELETE TO authenticated
      USING (scout_id::text = auth.uid()::text);
    -- Se puede avisar a uno mismo, a alguien del propio grupo o a quien uno gestiona.
    CREATE POLICY avisos_crear ON public.scout_notifications FOR INSERT TO authenticated
      WITH CHECK (public.mismo_grupo(scout_id::text) OR public.puede_gestionar(scout_id::text));
  END IF;

  IF to_regclass('public.bug_reports') IS NOT NULL THEN
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bug_reports' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.bug_reports', pol.policyname);
    END LOOP;
    ALTER TABLE public.bug_reports ENABLE ROW LEVEL SECURITY;
    CREATE POLICY reportes_crear ON public.bug_reports FOR INSERT TO authenticated
      WITH CHECK (user_id IS NULL OR user_id::text = auth.uid()::text);
    CREATE POLICY reportes_admin ON public.bug_reports FOR ALL TO authenticated
      USING (public.mi_rol() IN ('admin', 'nacional'))
      WITH CHECK (public.mi_rol() IN ('admin', 'nacional'));
  END IF;
END $$;

-- ---------- 7. Comprobación ----------
-- Debe listar las reglas nuevas. Ninguna de calendario/programas debe decir "con_sesion".
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'stage_progress', 'requirement_progress', 'calendar_events',
                    'scout_programas', 'notifications', 'certificates', 'scout_notifications', 'bug_reports')
ORDER BY tablename, policyname;
