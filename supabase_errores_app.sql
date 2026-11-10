-- ============================================================================
-- Errores de la app visibles para la Jefatura (2026-11-10)
-- ----------------------------------------------------------------------------
-- La app ahora guarda sola en `bug_reports` los errores que les pasan a los usuarios
-- (además de los reportes que se mandan a mano con el botón de ayuda).
-- Hasta hoy solo los podía leer un admin/nacional (y no hay ninguno). Con esto:
--   - la Jefatura de Grupo LEE los reportes de las personas de SU grupo (solo lectura);
--   - nadie más ve reportes ajenos; crear un reporte sigue igual (solo a nombre propio).
-- Se puede ejecutar varias veces.
-- ============================================================================
DO $$
BEGIN
  IF to_regclass('public.bug_reports') IS NOT NULL THEN
    DROP POLICY IF EXISTS reportes_jefatura_ver ON public.bug_reports;
    CREATE POLICY reportes_jefatura_ver ON public.bug_reports FOR SELECT TO authenticated
      USING (
        public.mi_rol() = 'jefe_grupo'
        AND user_id IS NOT NULL
        AND public.mismo_grupo(user_id::text)
      );
  END IF;
END $$;

-- Comprobación: debe listar reportes_crear, reportes_admin y reportes_jefatura_ver
SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bug_reports' ORDER BY policyname;
