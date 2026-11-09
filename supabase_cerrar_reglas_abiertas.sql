-- =============================================================================
-- Cerrar reglas abiertas a usuarios SIN sesión (Plan Progresivo)
-- El diagnóstico encontró una regla «true» para anon/public (una tabla creada desde el
-- panel, que la app no usa). Esto la deja solo para usuarios con sesión, igual que todo lo
-- demás («nada sin sesión»). Revisa TODAS las tablas de public. Se puede ejecutar más de una vez.
-- =============================================================================

-- 1. Qué reglas se van a cerrar (y cuántas filas tiene cada tabla)
SELECT p.tablename AS tabla, p.policyname AS regla, p.cmd AS operacion, p.roles::text AS para
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (p.roles @> ARRAY['anon']::name[] OR p.roles @> ARRAY['public']::name[])
ORDER BY 1, 2;

-- 2. Pasarlas a «solo con sesión» (authenticated) y quitar el permiso directo de anon
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', pol.policyname, pol.tablename);
  END LOOP;
END $$;

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t.relname);
  END LOOP;
END $$;

-- 3. Comprobación: debe salir VACÍO (ninguna regla para anon/public)
SELECT p.tablename AS tabla, p.policyname AS regla, p.roles::text AS para
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (p.roles @> ARRAY['anon']::name[] OR p.roles @> ARRAY['public']::name[]);
