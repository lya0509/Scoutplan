-- =============================================================================
-- Seguridad y avisos en vivo (Plan Progresivo)
-- Requiere los SQL anteriores (aprobación de cuentas, administración, CIP).
-- Ejecutar en Supabase > SQL Editor, bloque por bloque. Se puede ejecutar más de una vez.
-- =============================================================================

-- ======================= BLOQUE 1: reglas de datos ===========================

-- 1. Calendario: se quita la excepción que dejaba ver los eventos «[CIP…]» de dirigentes a
--    cualquier persona con sesión (de cualquier grupo, incluso cuentas en revisión).
--    Los CIP ahora viven en su propio catálogo (cip_oficiales).
DROP POLICY IF EXISTS calendario_ver ON public.calendar_events;
CREATE POLICY calendario_ver ON public.calendar_events FOR SELECT TO authenticated
  USING (
    group_name = public.mi_grupo()
    OR created_by = auth.uid()
    OR (created_by IS NOT NULL AND public.puede_gestionar(created_by::text))
    OR (public.mi_rol() IN ('admin', 'nacional') AND public.cuenta_aprobada())
  );

-- 2. Avisos para todo un grupo / una rama / un rol: los ve cada miembro aprobado al que van
--    dirigidos (antes solo llegaban por un canal en vivo público).
DROP POLICY IF EXISTS notificaciones_grupo_ver ON public.notifications;
CREATE POLICY notificaciones_grupo_ver ON public.notifications FOR SELECT TO authenticated
  USING (
    receiver_id IS NULL
    AND group_name IS NOT NULL
    AND group_name = public.mi_grupo()
    AND (
      (receiver_role IS NOT NULL AND receiver_role = public.mi_rol())
      OR (receiver_role IS NULL AND (
            unit IS NULL
            OR lower(unit) = lower(coalesce((SELECT p.unit FROM public.profiles p WHERE p.id = auth.uid()), ''))))
    )
  );

-- 2b. Crear avisos: directos solo a uno mismo, a gente del propio grupo o a quien uno
--     gestiona; para todo un grupo, solo al propio grupo (antes se podía avisar a cualquiera).
DROP POLICY IF EXISTS notificaciones_crear ON public.notifications;
CREATE POLICY notificaciones_crear ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    sender_id::text = auth.uid()::text
    AND (
      (receiver_id IS NOT NULL AND (
          receiver_id::text = auth.uid()::text
          OR public.mismo_grupo(receiver_id::text)
          OR public.puede_gestionar(receiver_id::text)))
      OR (receiver_id IS NULL AND group_name IS NOT NULL AND group_name = public.mi_grupo())
    )
  );

-- 3. Perfil: igual que antes + nadie se cambia la fecha de vencimiento de su anualidad.
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
  -- La fecha de vencimiento de la anualidad la asigna un dirigente (si no, alguien con la
  -- anualidad vencida podría extenderla y su carnet volvería a decir «vigente»)
  IF quien = NEW.id AND NEW.membership_expires_at IS DISTINCT FROM OLD.membership_expires_at THEN
    RAISE EXCEPTION 'La fecha de tu membresía la asigna un dirigente';
  END IF;

  RETURN NEW;
END;
$$;

SELECT 'reglas listas' AS bloque_1;


-- ======================= BLOQUE 2: avisos y presencia en vivo ================

-- 4. Las tablas de avisos envían sus cambios en vivo (la base de datos aplica las reglas
--    de arriba: a cada quien le llega solo lo suyo).
DO $$
DECLARE t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH t IN ARRAY ARRAY['notifications', 'scout_notifications'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

-- 5. «En línea»: canal PRIVADO por grupo («presencia:<grupo>»). Solo entran los miembros
--    aprobados de ese grupo (antes era un canal público para todos, también sin sesión).
DROP POLICY IF EXISTS presencia_grupo_ver ON realtime.messages;
DROP POLICY IF EXISTS presencia_grupo_enviar ON realtime.messages;
CREATE POLICY presencia_grupo_ver ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.messages.extension = 'presence'
    AND public.mi_grupo() IS NOT NULL
    AND (SELECT realtime.topic()) = 'presencia:' || public.mi_grupo()
  );
CREATE POLICY presencia_grupo_enviar ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    realtime.messages.extension = 'presence'
    AND public.mi_grupo() IS NOT NULL
    AND (SELECT realtime.topic()) = 'presencia:' || public.mi_grupo()
  );

SELECT 'en vivo listo' AS bloque_2,
       (SELECT string_agg(tablename, ', ' ORDER BY tablename) FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime' AND schemaname = 'public') AS tablas_en_vivo;


-- ============ BLOQUE 3: diagnóstico (solo lee, no cambia nada) ============
-- Muestra cualquier cosa que siga abierta. Lo ideal: que salga VACÍO.
SELECT 'tabla sin RLS' AS problema, c.relname AS objeto, '' AS detalle
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
UNION ALL
SELECT 'regla abierta (true) para anon/public', tablename || '.' || policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
  AND (coalesce(qual, '') = 'true' OR coalesce(with_check, '') = 'true')
UNION ALL
SELECT 'función que puede ejecutar anon', p.proname, CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE '' END
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND has_function_privilege('anon', p.oid, 'EXECUTE')
  AND p.prosecdef AND p.prorettype <> 'trigger'::regtype AND p.proname NOT IN ('grupos_registro', 'handle_new_user', 'puede_gestionar', 'mismo_grupo', 'mi_grupo', 'mi_rol', 'cuenta_aprobada', 'es_dirigente', 'rol_nombre')
ORDER BY 1, 2;
