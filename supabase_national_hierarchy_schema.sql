-- ==============================================================================
-- ASOCIACIÓN DE SCOUTS DE VENEZUELA - ESQUEMA JERÁRQUICO NACIONAL
-- ==============================================================================
-- 1. Actualizar tabla de perfiles para soportar todos los roles de la estructura
-- ==============================================================================

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN (
    'scout', 
    'scouter', 
    'jefe_grupo', 
    'comisionado_distrital', 
    'comisionado_regional', 
    'nacional', 
    'admin'
  ));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_unit_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_unit_check 
  CHECK (unit IN ('clan', 'tropa', 'caminantes', 'manada', 'comunidad', 'grupo', 'jefatura') OR unit IS NULL);

-- Asegurar columnas territoriales en profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS group_name TEXT;

-- ==============================================================================
-- 2. Tablas del Catálogo Territorial Scout
-- ==============================================================================

-- Regiones Scouts de Venezuela (24 Estados / Entidades)
CREATE TABLE IF NOT EXISTS public.scout_regions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Distritos Scouts por Región
CREATE TABLE IF NOT EXISTS public.scout_districts (
  id TEXT PRIMARY KEY,
  region_id TEXT REFERENCES public.scout_regions(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Grupos Scouts por Distrito y Región
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

-- ==============================================================================
-- 3. Sembrado de Regiones Oficiales de Venezuela
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

-- Distritos Iniciales (Ejemplo Miranda)
INSERT INTO public.scout_districts (id, region_id, name) VALUES
  ('guarenas_guatire', 'miranda', 'Distrito Guarenas-Guatire'),
  ('altos_mirandinos', 'miranda', 'Distrito Altos Mirandinos'),
  ('sucre_norte', 'miranda', 'Distrito Sucre Norte'),
  ('chacao', 'capital', 'Distrito Chacao'),
  ('baruta', 'capital', 'Distrito Baruta'),
  ('libertador', 'capital', 'Distrito Libertador')
ON CONFLICT (id) DO NOTHING;

-- Grupos Iniciales
INSERT INTO public.scout_groups (id, name, group_number, district_id, region_id) VALUES
  ('grupo_orion_84', 'Grupo Scout Orión #84', '84', 'guarenas_guatire', 'miranda'),
  ('grupo_alianza', 'Grupo Scout Alianza', '12', 'guarenas_guatire', 'miranda'),
  ('grupo_mafeking', 'Grupo Scout Mafeking', '45', 'guarenas_guatire', 'miranda'),
  ('grupo_gamma', 'Grupo Scout Gamma', '21', 'guarenas_guatire', 'miranda'),
  ('grupo_sirio', 'Grupo Scout Sirio', '33', 'guarenas_guatire', 'miranda'),
  ('grupo_aquatiri', 'Grupo Scout Aquatiri', '09', 'guarenas_guatire', 'miranda')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 4. Políticas de Seguridad (RLS) para Acceso Jerárquico
-- ==============================================================================

ALTER TABLE public.scout_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scout_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de regiones para usuarios autenticados" ON public.scout_regions;
CREATE POLICY "Lectura publica de regiones para usuarios autenticados" 
ON public.scout_regions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica de distritos para usuarios autenticados" ON public.scout_districts;
CREATE POLICY "Lectura publica de distritos para usuarios autenticados" 
ON public.scout_districts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura publica de grupos para usuarios autenticados" ON public.scout_groups;
CREATE POLICY "Lectura publica de grupos para usuarios autenticados" 
ON public.scout_groups FOR SELECT USING (true);
