-- 1. Crear las tablas principales

-- Tabla de Perfiles (Extiende de la tabla auth.users nativa de Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cedula TEXT,
  birth_date TEXT,
  promise_date TEXT,
  join_date TEXT,
  region TEXT,
  district TEXT,
  avatar_url TEXT,
  custom_avatar_url TEXT,
  scout_card_url TEXT,
  gender TEXT DEFAULT 'Masculino',
  role TEXT CHECK (role IN ('scout', 'scouter', 'jefe_grupo')) NOT NULL,
  unit TEXT CHECK (unit IN ('clan', 'tropa', 'caminantes', 'manada', 'comunidad')),
  group_name TEXT,
  membership_expires_at TEXT,
  membership_status TEXT DEFAULT 'none',
  membership_rejected_reason TEXT,
  photo_rejected_reason TEXT,
  curriculum_data JSONB,
  medical_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Si la tabla ya existía, agregar columnas faltantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS promise_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS join_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scout_card_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Masculino';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_expires_at TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_rejected_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_rejected_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS curriculum_data JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_data JSONB;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Tabla de Progreso de Etapas
CREATE TABLE IF NOT EXISTS public.stage_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('En Progreso', 'En Revision', 'Aprobada')) DEFAULT 'En Progreso',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(scout_id, stage_id)
);

-- Tabla de Progreso de Requisitos (Checks)
CREATE TABLE IF NOT EXISTS public.requirement_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(scout_id, stage_id, requirement_id)
);

-- Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- Políticas para perfiles
DROP POLICY IF EXISTS "Perfiles publicos para usuarios autenticados" ON public.profiles;
CREATE POLICY "Perfiles publicos para usuarios autenticados" 
ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Usuarios pueden insertar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden insertar su propio perfil" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON public.profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil" 
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para stage_progress
DROP POLICY IF EXISTS "Lectura de progresos" ON public.stage_progress;
CREATE POLICY "Lectura de progresos" 
ON public.stage_progress FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Scouts y Scouters pueden insertar/actualizar progresos" ON public.stage_progress;
CREATE POLICY "Scouts y Scouters pueden insertar/actualizar progresos" 
ON public.stage_progress FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para requirement_progress
DROP POLICY IF EXISTS "Lectura de requisitos" ON public.requirement_progress;
CREATE POLICY "Lectura de requisitos" 
ON public.requirement_progress FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Inserción/Actualización de requisitos" ON public.requirement_progress;
CREATE POLICY "Inserción/Actualización de requisitos" 
ON public.requirement_progress FOR ALL USING (auth.role() = 'authenticated');

-- Políticas para notificaciones
DROP POLICY IF EXISTS "Lectura de notificaciones propias" ON public.notifications;
CREATE POLICY "Lectura de notificaciones propias" 
ON public.notifications FOR SELECT USING (auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Creación de notificaciones" ON public.notifications;
CREATE POLICY "Creación de notificaciones" 
ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Actualizar notificaciones (marcar leídas)" ON public.notifications;
CREATE POLICY "Actualizar notificaciones (marcar leídas)" 
ON public.notifications FOR UPDATE USING (auth.uid() = receiver_id);


-- ==========================================
-- 3. Funciones Útiles (Triggers)
-- ==========================================

-- Trigger para crear/actualizar automáticamente el perfil con TODOS los metadatos cuando un usuario se registra en Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    name, 
    email,
    role, 
    unit, 
    group_name,
    region,
    district,
    cedula,
    birth_date
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'name', 'Usuario Nuevo'), 
    COALESCE(new.email, new.raw_user_meta_data->>'email'),
    COALESCE(new.raw_user_meta_data->>'role', 'scout'), 
    new.raw_user_meta_data->>'unit',
    new.raw_user_meta_data->>'group_name',
    new.raw_user_meta_data->>'region',
    new.raw_user_meta_data->>'district',
    new.raw_user_meta_data->>'cedula',
    CASE 
      WHEN new.raw_user_meta_data->>'birth_date' IS NOT NULL AND new.raw_user_meta_data->>'birth_date' != '' 
      THEN (new.raw_user_meta_data->>'birth_date')::date 
      ELSE NULL 
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, public.profiles.name),
    email = COALESCE(EXCLUDED.email, public.profiles.email),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    unit = COALESCE(EXCLUDED.unit, public.profiles.unit),
    group_name = COALESCE(EXCLUDED.group_name, public.profiles.group_name),
    region = COALESCE(EXCLUDED.region, public.profiles.region),
    district = COALESCE(EXCLUDED.district, public.profiles.district),
    cedula = COALESCE(EXCLUDED.cedula, public.profiles.cedula),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-recuperar datos existentes desde auth.users.raw_user_meta_data para perfiles con campos vacíos
UPDATE public.profiles p
SET 
  cedula = COALESCE(p.cedula, u.raw_user_meta_data->>'cedula'),
  birth_date = CASE 
    WHEN p.birth_date IS NOT NULL THEN p.birth_date
    WHEN u.raw_user_meta_data->>'birth_date' IS NOT NULL AND u.raw_user_meta_data->>'birth_date' != '' 
      THEN (u.raw_user_meta_data->>'birth_date')::date
    ELSE NULL 
  END,
  region = COALESCE(p.region, u.raw_user_meta_data->>'region'),
  district = COALESCE(p.district, u.raw_user_meta_data->>'district'),
  email = COALESCE(p.email, u.email, u.raw_user_meta_data->>'email')
FROM auth.users u
WHERE p.id = u.id;
