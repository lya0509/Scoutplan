-- 1. Crear las tablas principales

-- Tabla de Perfiles (Extiende de la tabla auth.users nativa de Supabase)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('scout', 'scouter', 'jefe_grupo')) NOT NULL,
  unit TEXT CHECK (unit IN ('clan', 'tropa', 'manada')),
  group_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Progreso de Etapas
CREATE TABLE public.stage_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('En Progreso', 'En Revision', 'Aprobada')) DEFAULT 'En Progreso',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Asegurar que un scout solo tenga un registro activo por cada etapa
  UNIQUE(scout_id, stage_id)
);

-- Tabla de Progreso de Requisitos (Checks)
CREATE TABLE public.requirement_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Asegurar que un scout solo tenga un registro por requisito
  UNIQUE(scout_id, stage_id, requirement_id)
);

-- Tabla de Notificaciones
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- 2. Configurar Políticas de Seguridad (RLS - Row Level Security)
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas para perfiles (Todo el mundo en tu app puede leer los perfiles)
CREATE POLICY "Perfiles publicos para usuarios autenticados" 
ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para stage_progress
CREATE POLICY "Lectura de progresos" 
ON public.stage_progress FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Scouts y Scouters pueden insertar/actualizar progresos" 
ON public.stage_progress FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para requirement_progress
CREATE POLICY "Lectura de requisitos" 
ON public.requirement_progress FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Inserción/Actualización de requisitos" 
ON public.requirement_progress FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para notificaciones
CREATE POLICY "Lectura de notificaciones propias" 
ON public.notifications FOR SELECT USING (auth.uid() = receiver_id);

CREATE POLICY "Creación de notificaciones" 
ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Actualizar notificaciones (marcar leídas)" 
ON public.notifications FOR UPDATE USING (auth.uid() = receiver_id);


-- ==========================================
-- 3. Funciones Útiles (Triggers)
-- ==========================================

-- Trigger para crear automáticamente el perfil cuando un usuario se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, unit, group_name)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Usuario Nuevo'), 
    COALESCE(new.raw_user_meta_data->>'role', 'scout'), 
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'group_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
