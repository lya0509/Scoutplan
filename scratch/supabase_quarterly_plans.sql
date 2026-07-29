-- ========================================================
-- TABLA DE PLANES TRIMESTRALES (FORMATO OFICIAL SCOUT)
-- ========================================================
CREATE TABLE IF NOT EXISTS public.quarterly_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  quarter VARCHAR(10) NOT NULL, -- 'Q1', 'Q2', 'Q3', 'Q4'
  year INT NOT NULL DEFAULT 2026,
  elaborated_by TEXT DEFAULT '',
  general_objectives TEXT DEFAULT '',
  trimestre_goals TEXT DEFAULT '',
  specific_objectives TEXT DEFAULT '',
  educational_areas JSONB DEFAULT '{"corporalidad": true, "creatividad": true, "afectividad": true, "espiritualidad": true, "caracter": true, "sociabilidad": true}'::jsonb,
  monthly_activities JSONB DEFAULT '[]'::jsonb,
  goals TEXT DEFAULT '',
  scouter_feedback TEXT DEFAULT '',
  status VARCHAR(30) DEFAULT 'Enviado', -- 'Enviado', 'Aprobado', 'Con Observaciones'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_quarterly_plans_lookup 
ON public.quarterly_plans(scout_id, quarter, year);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.quarterly_plans ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso
CREATE POLICY "Permitir lectura para usuarios autenticados" 
ON public.quarterly_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir inserción y actualización para usuarios autenticados" 
ON public.quarterly_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
