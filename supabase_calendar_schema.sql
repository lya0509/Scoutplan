-- Crear la tabla de eventos de calendario (Trimestre)
CREATE TABLE public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  time TEXT,
  unit TEXT NOT NULL, -- Ej: 'clan', 'tropa', 'manada'
  description TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS (Seguridad a Nivel de Fila)
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- 1. Todos los usuarios autenticados pueden ver los eventos de calendario
CREATE POLICY "Todos pueden ver eventos" 
ON public.calendar_events 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 2. Scouts y Scouters pueden insertar eventos
CREATE POLICY "Scouts y Scouters pueden crear eventos" 
ON public.calendar_events 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('scout', 'scouter')
  )
);

-- 3. Solo el creador o un Scouter/Jefe pueden borrar eventos (opcional)
CREATE POLICY "Creadores o admins pueden borrar" 
ON public.calendar_events 
FOR DELETE 
USING (
  auth.uid() = created_by OR 
  (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('scouter', 'jefe_grupo')
);
