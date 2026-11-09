import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as defaultColors } from '../theme/colors';

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
  resetToDefaultColor: () => Promise<void>;
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
  };
}

/** Mezcla un color hex con blanco (t = 0..1). Para textos de acento sobre fondo oscuro. */
function lighten(hex: string, t: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const mix = (c: number) => Math.round(c + (255 - c) * t);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [primaryColor, setPrimaryColorState] = useState(defaultColors.primary);

  useEffect(() => {
    // Cargar preferencia del tema y color al iniciar
    const loadPreferences = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_dark_mode');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'true');
        }

        const savedColor = await AsyncStorage.getItem('app_primary_color');
        if (savedColor) {
          setPrimaryColorState(savedColor);
        }
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
    setPrimaryColorState(hex);
    try {
      await AsyncStorage.setItem('app_primary_color', hex);
    } catch (e) {
      console.error('Error guardando color primario:', e);
    }
  };

  const resetToDefaultColor = async () => {
    await setPrimaryColor('#612499');
  };

  // En modo oscuro el morado se aclara un 30 %: el texto morado sobre negro pasa de un
  // contraste 2,2 a 4,8, y las letras blancas sobre los botones siguen legibles (4,4).
  const effectivePrimary = isDarkMode ? lighten(primaryColor, 0.3) : primaryColor;
  // colors.primary lo leen muchas pantallas al dibujarse: se mantiene igual al color efectivo
  defaultColors.primary = effectivePrimary;
  defaultColors.purple = effectivePrimary;

  const theme = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    cardBg: isDarkMode ? '#18181b' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#0f172a',
    subText: isDarkMode ? '#a1a1aa' : '#64748b',
    border: isDarkMode ? '#27272a' : '#e2e8f0',
    inputBg: isDarkMode ? '#27272a' : '#f1f5f9',
    primary: effectivePrimary,
    primaryLight: effectivePrimary,
    accentText: isDarkMode ? lighten(primaryColor, 0.55) : primaryColor,
  };

  return (
    <ThemeContext.Provider value={{
      isDarkMode,
      toggleDarkMode,
      primaryColor: effectivePrimary,
      basePrimaryColor: primaryColor,
      setPrimaryColor,
      resetToDefaultColor,
      theme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

