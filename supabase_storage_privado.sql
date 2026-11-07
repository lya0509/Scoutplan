-- =============================================================================
-- Almacenamiento PRIVADO para scout-files (fotos, certificados, firmas, comprobantes)
-- Ejecutar en Supabase > SQL Editor, DESPUÉS de publicar la versión de la app que usa
-- enlaces temporales (src/lib/fileUrl.ts). Se puede ejecutar más de una vez.
--
-- Resultado:
--   - Sin sesión: no se puede ver, listar ni abrir ningún archivo.
--   - Con sesión: cada quien ve sus archivos, los de su grupo y los de quienes gestiona
--     (Scouter, Jefatura, Comisionados), con enlaces que vencen en 1 hora.
-- =============================================================================

-- 1. El bucket deja de ser público (los enlaces /object/public/... dejan de abrir)
UPDATE storage.buckets SET public = false WHERE id = 'scout-files';

-- 2. Quitar las reglas anteriores de este bucket y las genéricas sin bucket (abiertas a todo)
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND (
        coalesce(qual, '') || coalesce(with_check, '') LIKE '%scout-files%'
        OR coalesce(qual, '') || coalesce(with_check, '') NOT LIKE '%bucket_id%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 3. Ver / abrir (y generar enlace temporal): solo con sesión y con relación con el dueño
CREATE POLICY scout_files_ver ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'scout-files' AND (
      owner = auth.uid()
      OR owner IS NULL                                   -- archivos antiguos sin dueño registrado
      OR public.mismo_grupo(owner::text)
      OR public.puede_gestionar(owner::text)
    )
  );

-- 4. Subir: solo con sesión
CREATE POLICY scout_files_subir ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'scout-files');

-- 5. Borrar: solo los archivos propios
CREATE POLICY scout_files_borrar ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'scout-files' AND owner = auth.uid());

-- 6. Comprobación: debe decir publico = false y mostrar las 3 reglas scout_files_*
SELECT 'bucket' AS tipo, id AS nombre, public::text AS detalle FROM storage.buckets WHERE id = 'scout-files'
UNION ALL
SELECT 'regla', policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY tipo, nombre;
