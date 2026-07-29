-- ========================================================
-- AGREGAR COLUMNAS FALTANTES A LA TABLA quarterly_plans EN SUPABASE
-- Copia y pega estas líneas en el Editor SQL de tu panel de Supabase:
-- ========================================================

ALTER TABLE public.quarterly_plans 
ADD COLUMN IF NOT EXISTS elaborated_by TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS general_objectives TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS trimestre_goals TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS specific_objectives TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS educational_areas JSONB DEFAULT '{"corporalidad": true, "creatividad": true, "afectividad": true, "espiritualidad": true, "caracter": true, "sociabilidad": true}'::jsonb,
ADD COLUMN IF NOT EXISTS monthly_activities JSONB DEFAULT '[]'::jsonb;
