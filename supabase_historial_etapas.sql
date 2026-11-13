-- =============================================================================
-- Historial de etapas y requisitos (Plan Progresivo) — 2026-11-13
-- Requiere supabase_historial_borrado.sql (tabla audit_log). Ejecutar en
-- Supabase > SQL Editor de una vez. Se puede ejecutar más de una vez.
--
-- Por qué: el 3-nov se aprobaron y luego se quitaron etapas de un Rover y no había forma de
-- saber quién lo hizo. Desde ahora queda en el Historial (Administración > Historial):
--   • cada cambio de estado de una etapa (aprobada, devuelta, enviada a revisión, borrada);
--   • cada requisito que un DIRIGENTE marca o desmarca en la ficha de un joven
--     (lo que el joven marca en su propia ficha no se anota: serían cientos de filas).
-- Lo escribe solo la base de datos (disparadores); nadie puede editarlo ni borrarlo desde la app.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.nombre_etapa(s text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE s
    WHEN 'precursor' THEN 'Precursor' WHEN 'expedicionario' THEN 'Expedicionario'
    WHEN 'descubridor' THEN 'Descubridor' WHEN 'fundador' THEN 'Fundador'
    WHEN 'rover_ciudadano' THEN 'Rover Ciudadano' ELSE coalesce(s, '—') END;
$$;

-- 1. Estado de las etapas
CREATE OR REPLACE FUNCTION public.registrar_cambio_etapa()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  quien uuid := auth.uid();
  quien_nombre text;
  v_scout uuid;
  v_stage text;
  joven record;
  texto text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_scout := OLD.scout_id; v_stage := OLD.stage_id;
    texto := 'se borró su estado (era ' || coalesce(OLD.status, '—') || ')';
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
    v_scout := NEW.scout_id; v_stage := NEW.stage_id;
    texto := coalesce(OLD.status, '—') || ' → ' || coalesce(NEW.status, '—');
  ELSE
    v_scout := NEW.scout_id; v_stage := NEW.stage_id;
    texto := coalesce(NEW.status, '—');
  END IF;

  SELECT name INTO quien_nombre FROM public.profiles WHERE id = quien;
  quien_nombre := coalesce(quien_nombre, CASE WHEN quien IS NULL THEN 'Base de datos (SQL)' ELSE 'Desconocido' END);
  SELECT name, group_name, region, district INTO joven FROM public.profiles WHERE id = v_scout;

  INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
  VALUES (quien, quien_nombre, 'etapa', v_scout, joven.name, joven.group_name, joven.region, joven.district,
          'Etapa ' || public.nombre_etapa(v_stage) || ': ' || texto);

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_cambio_etapa ON public.stage_progress;
CREATE TRIGGER trg_registrar_cambio_etapa
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.stage_progress
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_etapa();

-- 2. Requisitos que marca o desmarca alguien que NO es el propio joven (dirigente o SQL)
CREATE OR REPLACE FUNCTION public.registrar_cambio_requisito()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  quien uuid := auth.uid();
  quien_nombre text;
  joven record;
BEGIN
  IF quien IS NOT DISTINCT FROM NEW.scout_id THEN RETURN NEW; END IF;            -- lo hizo el propio joven
  IF NEW.requirement_id LIKE 'act\_%' THEN RETURN NEW; END IF;                   -- actividades del catálogo
  IF TG_OP = 'UPDATE' AND NEW.completed IS NOT DISTINCT FROM OLD.completed THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' AND NOT coalesce(NEW.completed, false) THEN RETURN NEW; END IF;

  SELECT name INTO quien_nombre FROM public.profiles WHERE id = quien;
  quien_nombre := coalesce(quien_nombre, CASE WHEN quien IS NULL THEN 'Base de datos (SQL)' ELSE 'Desconocido' END);
  SELECT name, group_name, region, district INTO joven FROM public.profiles WHERE id = NEW.scout_id;

  INSERT INTO public.audit_log (actor_id, actor_name, action, target_id, target_name, group_name, region, district, detail)
  VALUES (quien, quien_nombre, 'requisito', NEW.scout_id, joven.name, joven.group_name, joven.region, joven.district,
          CASE WHEN NEW.completed THEN 'Marcó' ELSE 'Desmarcó' END || ' el requisito «' || NEW.requirement_id ||
          '» de ' || public.nombre_etapa(NEW.stage_id));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registrar_cambio_requisito ON public.requirement_progress;
CREATE TRIGGER trg_registrar_cambio_requisito
  AFTER INSERT OR UPDATE OF completed ON public.requirement_progress
  FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_requisito();

SELECT 'historial de etapas listo' AS resultado;
