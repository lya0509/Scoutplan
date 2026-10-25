-- =====================================================================
-- Plan Progresivo Scout · Reglas de seguridad (RLS)
-- Ejecutar UNA vez en Supabase > SQL Editor. Se puede volver a ejecutar sin problema.
--
-- Qué hace:
--   1. Al registrarse, todo usuario nuevo queda como 'scout' (antes el rol
--      venía de los datos que manda el propio usuario: cualquiera podía ser admin).
--   2. Cada persona ve y edita solo su perfil. Los dirigentes ven a los de su
--      grupo; comisionados, a los de su distrito o región; nacional y admin, a todos.
--   3. Nadie puede cambiarse su propio rol ni aprobarse su propia membresía.
--   4. El progreso, los planes trimestrales, las notificaciones y las suscripciones
--      push quedan protegidos por dueño. El resto de tablas exige sesión iniciada.
--
-- Después de ejecutarlo, prueba la app con una cuenta de cada rol (paso 6 de la guía).
-- =====================================================================

-- ---------- 1. Registro: el rol ya no lo decide el usuario ----------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, email, role, unit, group_name, region, district, cedula, birth_date
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuario Nuevo'),
    COALESCE(new.email, new.raw_user_meta_data->>'email'),
    'scout',  -- siempre scout; los roles de dirigente los asigna un admin
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'group_name',
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'district',
    new.raw_user_meta_data->>'cedula',
    CASE
      WHEN new.raw_user_meta_data->>'birth_date' IS NOT NULL AND new.raw_user_meta_data->>'birth_date' != ''
      THEN (new.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    -- el rol existente se conserva
    unit = COALESCE(EXCLUDED.unit, public.profiles.unit),
    group_name = COALESCE(EXCLUDED.group_name, public.profiles.group_name),
    region = COALESCE(EXCLUDED.region, public.profiles.region),
    district = COALESCE(EXCLUDED.district, public.profiles.district),
    cedula = COALESCE(EXCLUDED.cedula, public.profiles.cedula),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ---------- 2. Funciones de apoyo ----------
-- ¿El usuario con sesión puede ver/gestionar el perfil p_id?
CREATE OR REPLACE FUNCTION public.puede_gestionar(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles yo
    JOIN public.profiles t ON t.id::text = p_id
    WHERE yo.id = auth.uid()
      AND (
        yo.id = t.id
        OR yo.role IN ('admin', 'nacional')
        OR (yo.role = 'comisionado_regional' AND t.region = yo.region)
        OR (yo.role IN ('comisionado_distrital', 'comisionado') AND t.district = yo.district)
        OR (yo.role IN ('jefe_grupo', 'scouter') AND t.group_name = yo.group_name)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.mi_rol()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid(); $$;

CREATE OR REPLACE FUNCTION public.mi_grupo()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT group_name FROM public.profiles WHERE id = auth.uid(); $$;

-- ---------- 3. Protección contra cambios indebidos en perfiles ----------
CREATE OR REPLACE FUNCTION public.proteger_perfil()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  quien uuid := auth.uid();
  rol_quien text;
BEGIN
  -- Sin sesión = servidor o SQL Editor: permitido.
  IF quien IS NULL THEN RETURN NEW; END IF;

  SELECT role INTO rol_quien FROM public.profiles WHERE id = quien;
  IF rol_quien IN ('admin', 'nacional') THEN RETURN NEW; END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF quien = NEW.id THEN
      RAISE EXCEPTION 'No puedes cambiar tu propio rol';
    END IF;
    IF NEW.role IN ('admin', 'nacional', 'comisionado', 'comisionado_regional', 'comisionado_distrital') THEN
      RAISE EXCEPTION 'Solo un admin puede asignar ese rol';
    END IF;
  END IF;

  -- Un dirigente no puede moverse solo a otro grupo/distrito/región para ver otros datos.
  IF quien = NEW.id AND OLD.role <> 'scout'
     AND (NEW.group_name, NEW.district, NEW.region) IS DISTINCT FROM (OLD.group_name, OLD.district, OLD.region) THEN
    RAISE EXCEPTION 'Pide a un admin que cambie tu grupo, distrito o región';
  END IF;

  IF quien = NEW.id AND NEW.membership_status = 'approved'
     AND OLD.membership_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Tu membresía la aprueba un dirigente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS proteger_perfil ON public.profiles;
CREATE TRIGGER proteger_perfil
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.proteger_perfil();

-- ---------- 4. Borrar TODAS las reglas viejas (las de "acceso total") ----------
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'stage_progress', 'requirement_progress', 'quarterly_plans',
                        'notifications', 'push_subscriptions', 'calendar_events', 'scout_programas',
                        'scout_regions', 'scout_districts', 'scout_groups')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_progress       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_plans      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_programas      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_regions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_districts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_groups         ENABLE ROW LEVEL SECURITY;

-- ---------- 5. Reglas nuevas ----------
-- Perfiles (incluye ficha médica, cédula y teléfono)
CREATE POLICY perfiles_ver ON public.profiles FOR SELECT TO authenticated
  USING (public.puede_gestionar(id::text));
CREATE POLICY perfiles_crear ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY perfiles_editar ON public.profiles FOR UPDATE TO authenticated
  USING (public.puede_gestionar(id::text))
  WITH CHECK (public.puede_gestionar(id::text));
CREATE POLICY perfiles_borrar ON public.profiles FOR DELETE TO authenticated
  USING (id = auth.uid() OR public.mi_rol() IN ('admin', 'nacional'));

-- Progreso de etapas y requisitos: el scout y sus dirigentes
CREATE POLICY progreso_etapas ON public.stage_progress FOR ALL TO authenticated
  USING (public.puede_gestionar(scout_id::text))
  WITH CHECK (public.puede_gestionar(scout_id::text));
CREATE POLICY progreso_requisitos ON public.requirement_progress FOR ALL TO authenticated
  USING (public.puede_gestionar(scout_id::text))
  WITH CHECK (public.puede_gestionar(scout_id::text));

-- Planes trimestrales: el scout, sus dirigentes, o planes de unidad del propio grupo
CREATE POLICY planes_trimestrales ON public.quarterly_plans FOR ALL TO authenticated
  USING (
    (scout_id IS NOT NULL AND public.puede_gestionar(scout_id::text))
    OR (scout_id IS NULL AND group_name = public.mi_grupo())
    OR public.mi_rol() IN ('admin', 'nacional')
  )
  WITH CHECK (
    (scout_id IS NOT NULL AND public.puede_gestionar(scout_id::text))
    OR (scout_id IS NULL AND group_name = public.mi_grupo())
    OR public.mi_rol() IN ('admin', 'nacional')
  );

-- Notificaciones: las ve quien las recibe o quien las envió
CREATE POLICY notificaciones_ver ON public.notifications FOR SELECT TO authenticated
  USING (receiver_id::text = auth.uid()::text OR sender_id::text = auth.uid()::text);
CREATE POLICY notificaciones_crear ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY notificaciones_editar ON public.notifications FOR UPDATE TO authenticated
  USING (receiver_id::text = auth.uid()::text);
CREATE POLICY notificaciones_borrar ON public.notifications FOR DELETE TO authenticated
  USING (receiver_id::text = auth.uid()::text);

-- Suscripciones push: cada quien las suyas (el servidor usa la clave secreta)
CREATE POLICY push_propias ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Calendario, programas y catálogos: solo usuarios con sesión
CREATE POLICY calendario_con_sesion ON public.calendar_events FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY programas_con_sesion ON public.scout_programas FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
CREATE POLICY regiones_leer ON public.scout_regions FOR SELECT TO authenticated USING (true);
CREATE POLICY distritos_leer ON public.scout_districts FOR SELECT TO authenticated USING (true);
CREATE POLICY grupos_leer ON public.scout_groups FOR SELECT TO authenticated USING (true);
CREATE POLICY catalogos_admin_regiones ON public.scout_regions FOR ALL TO authenticated
  USING (public.mi_rol() IN ('admin', 'nacional')) WITH CHECK (public.mi_rol() IN ('admin', 'nacional'));
CREATE POLICY catalogos_admin_distritos ON public.scout_districts FOR ALL TO authenticated
  USING (public.mi_rol() IN ('admin', 'nacional')) WITH CHECK (public.mi_rol() IN ('admin', 'nacional'));
CREATE POLICY catalogos_admin_grupos ON public.scout_groups FOR ALL TO authenticated
  USING (public.mi_rol() IN ('admin', 'nacional')) WITH CHECK (public.mi_rol() IN ('admin', 'nacional'));

-- ---------- 6. Comprobación ----------
-- Debe listar las reglas nuevas y ninguna que diga "Acceso total".
SELECT tablename, policyname, cmd FROM pg_policies
WHERE schemaname = 'public' ORDER BY tablename, policyname;
