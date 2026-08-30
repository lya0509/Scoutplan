-- ============================================================================
-- TABLA: push_subscriptions
-- Almacena las suscripciones de Web Push (VAPID) para segundo plano y pantalla de bloqueo
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsqueda rápida de dispositivos al emitir notificaciones
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can manage their own push subscriptions" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "Authenticated users can view subscriptions for push dispatch" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "Public can register push subscriptions" ON public.push_subscriptions;
END $$;

CREATE POLICY "Users can manage their own push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view subscriptions for push dispatch"
    ON public.push_subscriptions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Public can register push subscriptions"
    ON public.push_subscriptions
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);
