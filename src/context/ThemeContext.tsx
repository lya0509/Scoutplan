import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as defaultColors } from '../theme/colors';
import { DEFAULT_ACCENT, accentOnDark, accentAsText, onColor, mix } from '../theme/tokens';

const CUSTOM_COLOR_KEY = 'app_accent_custom';
const LARGE_TEXT_KEY = 'app_large_text';

export const THEME_COLOR_PRESETS = [
  { id: 'scout_purple', name: 'Morado Scout', hex: '#612499' },
  { id: 'scout_blue', name: 'Azul Marino', hex: '#1d4ed8' },
  { id: 'scout_green', name: 'Verde', hex: '#15803d' },
  { id: 'scout_red', name: 'Rojo', hex: '#dc2626' },
  { id: 'scout_orange', name: 'Naranja', hex: '#ea580c' },
  { id: 'scout_yellow', name: 'Dorado', hex: '#d97706' },
  { id: 'scout_pink', name: 'Rosa', hex: '#db2777' },
  { id: 'scout_cyan', name: 'Cian', hex: '#0891b2' },
];

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  /** Color de acento para usar en pantalla (en modo oscuro, aclarado para que se lea). */
  primaryColor: string;
  /** Color que eligió la persona (sin ajustar); lo usa el personalizador del tema. */
  basePrimaryColor: string;
  setPrimaryColor: (hex: string) => Promise<void>;
  /** Vuelve al color de la rama (borra el color personalizado). */
  resetToDefaultColor: () => Promise<void>;
  /** Color de partida según la rama y el rol de quien inició sesión (lo fija RamaAccentSync). */
  setRamaAccent: (hex: string) => void;
  /** true si la persona eligió un color propio en «Personalizar». */
  hasCustomColor: boolean;
  /** Letra grande: encendida sola para los lobatos (Manada); cualquiera la puede cambiar en «Personalizar». */
  largeText: boolean;
  setLargeText: (on: boolean) => Promise<void>;
  /** La fija App.tsx según quien inició sesión (true para jóvenes de Manada). */
  setLargeTextDefault: (on: boolean) => void;
  theme: {
    bg: string;
    cardBg: string;
    text: string;
    subText: string;
    border: string;
    inputBg: string;
    primary: string;
    primaryLight: string;
    /** Color de acento legible para TEXTO: en modo oscuro, una versión clara del color del tema. */
    accentText: string;
    /** Letra sobre un fondo de acento (blanca; oscura si el acento es claro, como el amarillo de Manada). */
    onPrimary: string;
    /** Fondo suave de acento: etiquetas, elemento activo, foco. */
    accentSoft: string;
    /** Estados. Nunca para decorar: siempre con ícono y palabra. */
    ok: string; okSoft: string;
    warn: string; warnSoft: string;
    err: string; errSoft: string; errLine: string;
  };
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Color elegido en «Personalizar» (null = usar el de la rama)
  const [customColor, setCustomColor] = useState<string | null>(null);
  const [ramaAccent, setRamaAccent] = useState<string>(DEFAULT_ACCENT);
  const primaryColor = customColor || ramaAccent;
  // Letra grande: elección guardada (null = seguir lo que toca por rama)
  const [largeTextChoice, setLargeTextChoice] = useState<boolean | null>(null);
  const [largeTextDefault, setLargeTextDefault] = useState(false);
  const largeText = largeTextChoice ?? largeTextDefault;

  // Web: agranda solo los textos (los <Text> de primer nivel salen como div[dir=auto]); así no
  // cambia el ancho que la app cree tener, como pasaría con un zoom de toda la página.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const id = 'scout-large-text';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = 'html.scout-letra-grande div[dir="auto"]{zoom:1.12}';
      document.head.appendChild(el);
    }
    document.documentElement.classList.toggle('scout-letra-grande', largeText);
  }, [largeText]);

  useEffect(() => {
    // Cargar preferencia del tema y color al iniciar
    const loadPreferences = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_dark_mode');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'true');
        }

        // Color personalizado. La clave vieja ('app_primary_color') guardaba también el morado
        // «restablecido», que ya no es una elección: ahora el color de partida es el de la rama.
        let savedColor = await AsyncStorage.getItem(CUSTOM_COLOR_KEY);
        if (!savedColor) {
          const legacy = await AsyncStorage.getItem('app_primary_color');
          if (legacy && legacy.toLowerCase() !== '#612499') {
            savedColor = legacy;
            await AsyncStorage.setItem(CUSTOM_COLOR_KEY, legacy);
          }
          if (legacy) await AsyncStorage.removeItem('app_primary_color');
        }
        if (savedColor) {
          setCustomColor(savedColor);
        }
        const savedLarge = await AsyncStorage.getItem(LARGE_TEXT_KEY);
        if (savedLarge === 'on' || savedLarge === 'off') setLargeTextChoice(savedLarge === 'on');
      } catch (e) {
        console.error('Error cargando preferencias de tema:', e);
      }
    };
    loadPreferences();
  }, []);

  const toggleDarkMode = async () => {
    const nextVal = !isDarkMode;
    setIsDarkMode(nextVal);
    try {
      await AsyncStorage.setItem('app_dark_mode', String(nextVal));
    } catch (e) {
      console.error('Error guardando preferencia de tema:', e);
    }
  };

  const setPrimaryColor = async (hex: string) => {
    if (!hex) return;
    setCustomColor(hex);
    try {
      await AsyncStorage.setItem(CUSTOM_COLOR_KEY, hex);
    } catch (e) {
      console.error('Error guardando color primario:', e);
    }
  };

  const setLargeText = async (on: boolean) => {
    setLargeTextChoice(on);
    try {
      await AsyncStorage.setItem(LARGE_TEXT_KEY, on ? 'on' : 'off');
    } catch (e) {
      console.error('Error guardando el tamaño de letra:', e);
    }
  };

  const resetToDefaultColor = async () => {
    setCustomColor(null);
    try {
      await AsyncStorage.removeItem(CUSTOM_COLOR_KEY);
    } catch (e) {
      console.error('Error borrando color primario:', e);
    }
  };

  // En modo oscuro el acento se aclara solo lo necesario para distinguirse del fondo (el morado
  // queda como antes, ~25 %; el rojo, verde, azul y amarillo de las ramas ya se distinguen).
  const cardBg = isDarkMode ? '#18181b' : '#ffffff';
  const effectivePrimary = isDarkMode ? accentOnDark(primaryColor, cardBg) : primaryColor;
  // colors.primary lo leen muchas pantallas al dibujarse: se mantiene igual al color efectivo
  defaultColors.primary = effectivePrimary;
  defaultColors.purple = effectivePrimary;

  const theme = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    cardBg,
    text: isDarkMode ? '#ffffff' : '#0f172a',
    subText: isDarkMode ? '#a1a1aa' : '#556377',
    border: isDarkMode ? '#27272a' : '#e2e8f0',
    inputBg: isDarkMode ? '#27272a' : '#f1f5f9',
    primary: effectivePrimary,
    primaryLight: effectivePrimary,
    accentText: accentAsText(primaryColor, cardBg, isDarkMode),
    onPrimary: onColor(effectivePrimary),
    accentSoft: mix(effectivePrimary, cardBg, isDarkMode ? 0.76 : 0.9),
    ok: isDarkMode ? '#4ade80' : '#166534',
    okSoft: isDarkMode ? '#14281c' : '#dcfce7',
    warn: isDarkMode ? '#fbbf24' : '#92400e',
    warnSoft: isDarkMode ? '#2e2410' : '#fef3c7',
    err: isDarkMode ? '#fca5a5' : '#b91c1c',
    errSoft: isDarkMode ? '#2a1717' : '#fef2f2',
    errLine: isDarkMode ? '#7f1d1d' : '#fecaca',
  };

  // Copias en vivo para estilos escritos fuera de los componentes (ver theme/liveStyles.ts)
  defaultColors.accentText = theme.accentText;
  defaultColors.accentSoft = theme.accentSoft;
  defaultColors.onPrimary = theme.onPrimary;

  return (
    <ThemeContext.Provider value={{
      isDarkMode,
      toggleDarkMode,
      primaryColor: effectivePrimary,
      basePrimaryColor: primaryColor,
      setPrimaryColor,
      resetToDefaultColor,
      setRamaAccent,
      hasCustomColor: !!customColor,
      largeText,
      setLargeText,
      setLargeTextDefault,
      theme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

