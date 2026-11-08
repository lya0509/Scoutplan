-- =============================================================================
-- Aviso de cuentas por aprobar + cierre de archivos sin dueño (Plan Progresivo)
-- Requiere haber ejecutado antes supabase_aprobacion_cuentas.sql.
-- Ejecutar en Supabase > SQL Editor. Se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Cuando alguien queda "en revisión" (se registra o se cambia de grupo), avisar
--    al Scouter de su rama en ese grupo y a la Jefatura del grupo (campanita de la app).
CREATE OR REPLACE FUNCTION public.avisar_cuenta_pendiente()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.account_status <> 'pending' OR NEW.group_name IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE'
     AND OLD.account_status = 'pending'
     AND OLD.group_name IS NOT DISTINCT FROM NEW.group_name THEN
    RETURN NEW;  -- ya estaba en revisión en este grupo: no repetir el aviso
  END IF;

  INSERT INTO public.scout_notifications (scout_id, title, reason, is_read)
  SELECT d.id,
         '🕓 Cuenta por aprobar',
         coalesce(NEW.name, 'Una persona') || ' se registró en '
           || coalesce(upper(NEW.unit), 'tu grupo')
           || '. Revisa en tu panel si es miembro del grupo y apruébala.',
         false
  FROM public.profiles d
  WHERE d.id <> NEW.id
    AND d.group_name = NEW.group_name
    AND d.account_status = 'approved'
    AND (
      d.role = 'jefe_grupo'
      OR (d.role = 'scouter' AND lower(coalesce(d.unit, '')) = lower(coalesce(NEW.unit, '')))
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_avisar_cuenta_pendiente ON public.profiles;
CREATE TRIGGER trg_avisar_cuenta_pendiente
  AFTER INSERT OR UPDATE OF account_status, group_name ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.avisar_cuenta_pendiente();

-- 2. Archivos: quitar la excepción "sin dueño" (la veía cualquiera con sesión, incluso
--    cuentas en revisión o de otros grupos). Solo había un archivo de prueba así.
DROP POLICY IF EXISTS scout_files_ver ON storage.objects;
CREATE POLICY scout_files_ver ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'scout-files' AND (
      owner = auth.uid()
      OR public.mismo_grupo(owner::text)
      OR public.puede_gestionar(owner::text)
    )
  );

-- 3. Comprobación: debe mostrar el disparador y la regla de archivos
SELECT 'disparador' AS tipo, tgname AS nombre FROM pg_trigger WHERE tgname = 'trg_avisar_cuenta_pendiente'
UNION ALL
SELECT 'regla archivos', policyname FROM pg_policies WHERE schemaname = 'storage' AND policyname = 'scout_files_ver';
