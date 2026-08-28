import AsyncStorage from '@react-native-async-storage/async-storage';

const DRAFT_PREFIX = '@scout_autosave_';

export interface DraftMetadata<T> {
  data: T;
  savedAt: string;
  userId?: string;
  screen?: string;
}

class AutoSaveService {
  private inMemoryCache: Map<string, any> = new Map();
  private debounceTimers: Map<string, any> = new Map();

  /**
   * Guarda un borrador local con debounce automático de 300ms
   */
  async saveDraft<T>(key: string, data: T, userId?: string, screen?: string): Promise<void> {
    const fullKey = `${DRAFT_PREFIX}${key}`;
    this.inMemoryCache.set(fullKey, data);

    if (this.debounceTimers.has(fullKey)) {
      clearTimeout(this.debounceTimers.get(fullKey));
    }

    const timer = setTimeout(async () => {
      try {
        const payload: DraftMetadata<T> = {
          data,
          savedAt: new Date().toISOString(),
          userId,
          screen
        };
        await AsyncStorage.setItem(fullKey, JSON.stringify(payload));
      } catch (err) {
        console.warn('[AutoSave] Error guardando borrador local:', fullKey, err);
      } finally {
        this.debounceTimers.delete(fullKey);
      }
    }, 300);

    this.debounceTimers.set(fullKey, timer);
  }

  /**
   * Guarda un borrador local de forma inmediata (sin debounce)
   */
  async saveDraftImmediate<T>(key: string, data: T, userId?: string, screen?: string): Promise<void> {
    const fullKey = `${DRAFT_PREFIX}${key}`;
    this.inMemoryCache.set(fullKey, data);

    try {
      const payload: DraftMetadata<T> = {
        data,
        savedAt: new Date().toISOString(),
        userId,
        screen
      };
      await AsyncStorage.setItem(fullKey, JSON.stringify(payload));
    } catch (err) {
      console.warn('[AutoSave] Error guardando borrador inmediato:', fullKey, err);
    }
  }

  /**
   * Recupera un borrador local previamente guardado
   */
  async loadDraft<T>(key: string): Promise<T | null> {
    const fullKey = `${DRAFT_PREFIX}${key}`;
    
    // 1. Revisar memoria rápida
    if (this.inMemoryCache.has(fullKey)) {
      return this.inMemoryCache.get(fullKey) as T;
    }

    // 2. Revisar almacenamiento persistente
    try {
      const raw = await AsyncStorage.getItem(fullKey);
      if (!raw) return null;

      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'data' in parsed) {
        this.inMemoryCache.set(fullKey, parsed.data);
        return parsed.data as T;
      }

      this.inMemoryCache.set(fullKey, parsed);
      return parsed as T;
    } catch (err) {
      console.warn('[AutoSave] Error cargando borrador local:', fullKey, err);
      return null;
    }
  }

  /**
   * Elimina un borrador específico cuando ya fue sincronizado exitosamente
   */
  async removeDraft(key: string): Promise<void> {
    const fullKey = `${DRAFT_PREFIX}${key}`;
    this.inMemoryCache.delete(fullKey);
    try {
      await AsyncStorage.removeItem(fullKey);
    } catch (err) {
      console.warn('[AutoSave] Error eliminando borrador:', fullKey, err);
    }
  }

  /**
   * Obtiene la fecha y hora de la última copia guardada localmente
   */
  async getDraftTimestamp(key: string): Promise<string | null> {
    const fullKey = `${DRAFT_PREFIX}${key}`;
    try {
      const raw = await AsyncStorage.getItem(fullKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.savedAt || null;
    } catch {
      return null;
    }
  }
}

export const autoSaveService = new AutoSaveService();
