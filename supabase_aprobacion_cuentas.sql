-- =============================================================================
-- Aprobación de cuentas nuevas (Plan Progresivo)
-- Quien se registra queda "en revisión" (account_status = 'pending') y NO ve nada del
-- grupo hasta que su Scouter o la Jefatura lo aprueban. Las cuentas que ya existen
-- quedan aprobadas. Cambiar de grupo vuelve a dejar la cuenta en revisión.
-- Ejecutar en Supabase > SQL Editor. Se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Columna de estado. El DEFAULT 'approved' deja aprobadas TODAS las cuentas actuales.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_account_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check
  CHECK (account_status IN ('pending', 'approved', 'rejected'));

-- 2. ¿La cuenta con sesión está aprobada?
CREATE OR REPLACE FUNCTION public.cuenta_aprobada()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND account_status = 'approved'); $$;

-- 3. Grupo de quien tiene sesión: NULL si su cuenta no está aprobada.
--    Así todas las reglas "de mi grupo" (calendario, programas, planes) se cierran solas.
CREATE OR REPLACE FUNCTION public.mi_grupo()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT group_name FROM public.profiles WHERE id = auth.uid() AND account_status = 'approved'; $$;

-- 4. ¿El perfil p_id es de mi grupo? Solo si MI cuenta está aprobada.
CREATE OR REPLACE FUNCTION public.mismo_grupo(p_id text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles yo
    JOIN public.profiles t ON t.id::text = p_id
    WHERE yo.id = auth.uid()
      AND yo.account_status = 'approved'
      AND yo.group_name IS NOT NULL
      AND t.group_name = yo.group_name
  );
$$;

-- 5. ¿Puedo gestionar a p_id? Lo propio siempre; a otros solo con cuenta aprobada.
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
        OR (
          yo.account_status = 'approved' AND (
            yo.role IN ('admin', 'nacional')
            OR (yo.role = 'comisionado_regional' AND t.region = yo.region)
            OR (yo.role IN ('comisionado_distrital', 'comisionado') AND t.district = yo.district)
            OR (yo.role IN ('jefe_grupo', 'scouter') AND t.group_name = yo.group_name)
          )
        )
      )
  );
$$;

-- 6. Directorio del grupo: sin cuentas en revisión (salvo la propia).
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
    AND p.group_name = public.mi_grupo()
    AND (p.account_status = 'approved' OR p.id = auth.uid());
$$;
REVOKE EXECUTE ON FUNCTION public.directorio_grupo() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.directorio_grupo() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.cuenta_aprobada() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cuenta_aprobada() TO authenticated;

-- 7. Registro: toda cuenta nueva entra como scout y EN REVISIÓN.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, name, email, role, unit, group_name, region, district, cedula, birth_date, account_status
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Usuario Nuevo'),
    COALESCE(new.email, new.raw_user_meta_data->>'email'),
    'scout',
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'group_name',
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'district',
    new.raw_user_meta_data->>'cedula',
    CASE
      WHEN new.raw_user_meta_data->>'birth_date' IS NOT NULL AND new.raw_user_meta_data->>'birth_date' != ''
      THEN (new.raw_user_meta_data->>'birth_date')::date
      ELSE NULL
    END,
    'pending'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    unit = COALESCE(EXCLUDED.unit, public.profiles.unit),
    group_name = COALESCE(EXCLUDED.group_name, public.profiles.group_name),
    region = COALESCE(EXCLUDED.region, public.profiles.region),
    district = COALESCE(EXCLUDED.district, public.profiles.district),
    cedula = COALESCE(EXCLUDED.cedula, public.profiles.cedula),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. Alta de perfil desde la app (si alguien borra y recrea su perfil): scout y en revisión.
CREATE OR REPLACE FUNCTION public.proteger_alta_perfil()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.mi_rol() IN ('admin', 'nacional') THEN RETURN NEW; END IF;

  NEW.role := 'scout';
  NEW.account_status := 'pending';
  IF NEW.membership_status = 'approved' THEN
    NEW.membership_status := 'none';
  END IF;
  RETURN NEW;
END;
$$;

-- 9. Cambios de perfil: nadie se aprueba a sí mismo; cambiar de grupo vuelve a revisión.
CREATE OR REPLACE FUNCTION public.proteger_perfil()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  quien uuid := auth.uid();
  rol_quien text;
BEGIN
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

  IF quien = NEW.id AND NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'Tu cuenta la aprueba tu Scouter o la Jefatura';
  END IF;

  IF quien = NEW.id AND OLD.role <> 'scout'
     AND (NEW.group_name, NEW.district, NEW.region) IS DISTINCT FROM (OLD.group_name, OLD.district, OLD.region) THEN
    RAISE EXCEPTION 'Pide a un admin que cambie tu grupo, distrito o región';
  END IF;

  -- Un scout que se cambia de grupo vuelve a quedar en revisión del grupo nuevo
  IF quien = NEW.id AND NEW.group_name IS DISTINCT FROM OLD.group_name THEN
    NEW.account_status := 'pending';
  END IF;

  IF quien = NEW.id AND NEW.membership_status = 'approved'
     AND OLD.membership_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Tu membresía la aprueba un dirigente';
  END IF;

  RETURN NEW;
END;
$$;

-- 10. Comprobación: cuántas cuentas hay en cada estado
SELECT account_status, count(*) AS cuentas FROM public.profiles GROUP BY account_status ORDER BY account_status;
