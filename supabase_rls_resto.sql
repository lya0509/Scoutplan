-- =====================================================================
-- Plan Progresivo Scout · Cerrar el resto de tablas a visitantes sin sesión
-- Ejecutar DESPUÉS de supabase_rls_seguridad.sql, en el SQL Editor.
--
-- Toda regla que todavía deje entrar a cualquiera (rol "public" o "anon")
-- se vuelve a crear igual, pero solo para usuarios con sesión iniciada.
-- La lógica de cada regla no cambia: solo se exige estar logueado.
-- =====================================================================
DO $$
DECLARE
  p record;
  sql text;
BEGIN
  FOR p IN
    SELECT * FROM pg_policies
    WHERE schemaname = 'public'
      AND (roles @> ARRAY['public']::name[] OR roles @> ARRAY['anon']::name[])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
    sql := format('CREATE POLICY %I ON public.%I AS %s FOR %s TO authenticated',
                  p.policyname, p.tablename, p.permissive, p.cmd);
    IF p.qual IS NOT NULL THEN
      sql := sql || format(' USING (%s)', p.qual);
    END IF;
    IF p.with_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', p.with_check);
    END IF;
    EXECUTE sql;
    RAISE NOTICE 'Cerrada a visitantes: %.%', p.tablename, p.policyname;
  END LOOP;
END $$;

-- Comprobación: debe salir VACÍO (ninguna regla abierta a visitantes sin sesión).
SELECT tablename, policyname, roles FROM pg_policies
WHERE schemaname = 'public'
  AND (roles @> ARRAY['public']::name[] OR roles @> ARRAY['anon']::name[]);
