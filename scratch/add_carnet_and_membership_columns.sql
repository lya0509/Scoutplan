-- EJECUTAR EN EL EDITOR SQL DE SUPABASE SI SE REQUIERE
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cedula text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_expires_at text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_status text DEFAULT 'none';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS membership_rejected_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_rejected_reason text;
