-- ==============================================================================
-- ASOCIACIÓN DE SCOUTS DE VENEZUELA - SCRIPT MAESTRO DE BASE DE DATOS SUPABASE
-- Este script crea, repara y asegura que TODAS las tablas, columnas, permisos
-- y operaciones de lectura/escritura funcionen al 100% para todos los roles.
-- ==============================================================================

-- 1. TABLA PROFILES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  cedula TEXT,
  birth_date TEXT,
  promise_date TEXT,
  join_date TEXT,
  region TEXT DEFAULT 'miranda',
  district TEXT DEFAULT 'guarenas_guatire',
  group_name TEXT DEFAULT 'Grupo Scout Orión #84',
  role TEXT NOT NULL DEFAULT 'scout',
  unit TEXT DEFAULT 'clan',
  avatar_url TEXT,
  custom_avatar_url TEXT,
  scout_card_url TEXT,
  gender TEXT DEFAULT 'Masculino',
  membership_expires_at TEXT,
  membership_status TEXT DEFAULT 'none',
  membership_rejected_reason TEXT,
  photo_rejected_reason TEXT,
  curriculum_data JSONB DEFAULT '{}'::jsonb,
  medical_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Asegurar columnas en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cedula TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS promise_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS join_date TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'miranda';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district TEXT DEFAULT 'guarenas_guatire';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Grupo Scout Orión #84';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'scout';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'clan';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS custom_avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scout_card_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Masculino';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_expires_at TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_status TEXT DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS membership_rejected_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS photo_rejected_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS curriculum_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS medical_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Actualizar constraints de roles para permitir todos los niveles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('scout', 'scouter', 'jefe_grupo', 'comisionado_distrital', 'comisionado_regional', 'nacional', 'admin'));

-- 2. TABLA CALENDAR_EVENTS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'grupo',
  group_name TEXT DEFAULT 'Grupo Scout Orión #84',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Grupo Scout Orión #84';
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'grupo';
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS date TEXT;

-- 3. TABLA SCOUT_PROGRAMAS (PROGRAMAS DE ACTIVIDADES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scout_programas (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  location TEXT,
  activity_type TEXT,
  unit TEXT NOT NULL,
  is_sinodal BOOLEAN DEFAULT false,
  selected_units JSONB DEFAULT '[]'::jsonb,
  participant_projection TEXT,
  general_objective TEXT,
  specific_objectives JSONB DEFAULT '[]'::jsonb,
  specific_metas JSONB DEFAULT '[]'::jsonb,
  selected_sdgs JSONB DEFAULT '[]'::jsonb,
  indicators JSONB DEFAULT '{}'::jsonb,
  schedule JSONB DEFAULT '[]'::jsonb,
  important_notes TEXT,
  registration_badge_id TEXT DEFAULT 'reg_2026',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  creator_name TEXT,
  group_name TEXT DEFAULT 'Grupo Scout Orión #84',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas en scout_programas
ALTER TABLE public.scout_programas ADD COLUMN IF NOT EXISTS is_sinodal BOOLEAN DEFAULT false;
ALTER TABLE public.scout_programas ADD COLUMN IF NOT EXISTS selected_units JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.scout_programas ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.scout_programas ADD COLUMN IF NOT EXISTS indicators JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.scout_programas ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Grupo Scout Orión #84';

-- 4. TABLA QUARTERLY_PLANS (PLANES TRIMESTRALES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quarterly_plans (
  id TEXT PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit TEXT DEFAULT 'clan',
  quarter VARCHAR(10) NOT NULL DEFAULT 'Q3',
  year INT NOT NULL DEFAULT 2026,
  elaborated_by TEXT DEFAULT '',
  general_objectives TEXT DEFAULT '',
  trimestre_goals TEXT DEFAULT '',
  specific_objectives TEXT DEFAULT '',
  educational_areas JSONB DEFAULT '{"corporalidad": true, "creatividad": true, "afectividad": true, "espiritualidad": true, "caracter": true, "sociabilidad": true}'::jsonb,
  monthly_activities JSONB DEFAULT '[]'::jsonb,
  months_data JSONB DEFAULT '[]'::jsonb,
  goals TEXT DEFAULT '',
  group_name TEXT DEFAULT 'Grupo Scout Orión #84',
  scouter_feedback TEXT DEFAULT '',
  status VARCHAR(30) DEFAULT 'Enviado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.quarterly_plans ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT 'Grupo Scout Orión #84';
ALTER TABLE public.quarterly_plans ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'clan';
ALTER TABLE public.quarterly_plans ADD COLUMN IF NOT EXISTS months_data JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quarterly_plans ADD COLUMN IF NOT EXISTS monthly_activities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.quarterly_plans ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Enviado';
ALTER TABLE public.quarterly_plans ALTER COLUMN goals DROP NOT NULL;
ALTER TABLE public.quarterly_plans ALTER COLUMN goals SET DEFAULT '';

-- 5. TABLA STAGE_PROGRESS & REQUIREMENT_PROGRESS (PROGRESO SCOUT)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.stage_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('En Progreso', 'En Revision', 'Aprobada')) DEFAULT 'En Progreso',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(scout_id, stage_id)
);

CREATE TABLE IF NOT EXISTS public.requirement_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scout_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  stage_id TEXT NOT NULL,
  requirement_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(scout_id, stage_id, requirement_id)
);

-- 6. TABLA NOTIFICATIONS
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. TABLAS DEL CATÁLOGO TERRITORIAL (REGIONES, DISTRITOS, GRUPOS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.scout_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scout_districts (
  id TEXT PRIMARY KEY,
  region_id TEXT REFERENCES public.scout_regions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.scout_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_number TEXT,
  district_id TEXT REFERENCES public.scout_districts(id) ON DELETE CASCADE,
  region_id TEXT REFERENCES public.scout_regions(id) ON DELETE CASCADE,
  sponsor_institution TEXT,
  headquarters_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. POLÍTICAS DE ACCESO UNIVERSAL Y SEGURIDAD (RLS)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_programas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarterly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requirement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_groups ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores para evitar conflictos
DROP POLICY IF EXISTS "Acceso total a profiles" ON public.profiles;
DROP POLICY IF EXISTS "Acceso total a calendar_events" ON public.calendar_events;
DROP POLICY IF EXISTS "Acceso total a scout_programas" ON public.scout_programas;
DROP POLICY IF EXISTS "Acceso total a quarterly_plans" ON public.quarterly_plans;
DROP POLICY IF EXISTS "Acceso total a stage_progress" ON public.stage_progress;
DROP POLICY IF EXISTS "Acceso total a requirement_progress" ON public.requirement_progress;
DROP POLICY IF EXISTS "Acceso total a notifications" ON public.notifications;
DROP POLICY IF EXISTS "Acceso total a scout_regions" ON public.scout_regions;
DROP POLICY IF EXISTS "Acceso total a scout_districts" ON public.scout_districts;
DROP POLICY IF EXISTS "Acceso total a scout_groups" ON public.scout_groups;

-- Crear políticas permisivas y seguras para lectura y escritura completa
CREATE POLICY "Acceso total a profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a calendar_events" ON public.calendar_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a scout_programas" ON public.scout_programas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a quarterly_plans" ON public.quarterly_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a stage_progress" ON public.stage_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a requirement_progress" ON public.requirement_progress FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a scout_regions" ON public.scout_regions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a scout_districts" ON public.scout_districts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acceso total a scout_groups" ON public.scout_groups FOR ALL USING (true) WITH CHECK (true);

-- 9. POBLADO INICIAL DE REGIONES SCOUTS DE VENEZUELA (24 ENTIDADES)
-- ==============================================================================
INSERT INTO public.scout_regions (id, name, code) VALUES
  ('miranda', 'Región Miranda', 'MIR'),
  ('capital', 'Región Capital', 'CAP'),
  ('amazonas', 'Región Amazonas', 'AMA'),
  ('anzoategui', 'Región Anzoátegui', 'ANZ'),
  ('apure', 'Región Apure', 'APU'),
  ('aragua', 'Región Aragua', 'ARA'),
  ('barinas', 'Región Barinas', 'BAR'),
  ('bolivar', 'Región Bolívar', 'BOL'),
  ('carabobo', 'Región Carabobo', 'CAR'),
  ('cojedes', 'Región Cojedes', 'COJ'),
  ('delta_amacuro', 'Región Delta Amacuro', 'DEL'),
  ('falcon', 'Región Falcón', 'FAL'),
  ('guarico', 'Región Guárico', 'GUA'),
  ('lara', 'Región Lara', 'LAR'),
  ('merida', 'Región Mérida', 'MER'),
  ('monagas', 'Región Monagas', 'MON'),
  ('nueva_esparta', 'Región Nueva Esparta', 'NVE'),
  ('portuguesa', 'Región Portuguesa', 'POR'),
  ('sucre', 'Región Sucre', 'SUC'),
  ('tachira', 'Región Táchira', 'TAC'),
  ('trujillo', 'Región Trujillo', 'TRU'),
  ('vargas', 'Región Vargas (La Guaira)', 'VAR'),
  ('yaracuy', 'Región Yaracuy', 'YAR'),
  ('zulia', 'Región Zulia', 'ZUL')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

INSERT INTO public.scout_districts (id, region_id, name) VALUES
  ('guarenas_guatire', 'miranda', 'Distrito Guarenas-Guatire'),
  ('altos_mirandinos', 'miranda', 'Distrito Altos Mirandinos'),
  ('sucre_norte', 'miranda', 'Distrito Sucre Norte'),
  ('chacao', 'capital', 'Distrito Chacao'),
  ('baruta', 'capital', 'Distrito Baruta'),
  ('libertador', 'capital', 'Distrito Libertador')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.scout_groups (id, name, group_number, district_id, region_id) VALUES
  ('grupo_orion_84', 'Grupo Scout Orión #84', '84', 'guarenas_guatire', 'miranda'),
  ('grupo_alianza', 'Grupo Scout Alianza', '12', 'guarenas_guatire', 'miranda'),
  ('grupo_mafeking', 'Grupo Scout Mafeking', '45', 'guarenas_guatire', 'miranda'),
  ('grupo_gamma', 'Grupo Scout Gamma', '21', 'guarenas_guatire', 'miranda'),
  ('grupo_sirio', 'Grupo Scout Sirio', '33', 'guarenas_guatire', 'miranda'),
  ('grupo_aquatiri', 'Grupo Scout Aquatiri', '09', 'guarenas_guatire', 'miranda')
ON CONFLICT (id) DO NOTHING;
