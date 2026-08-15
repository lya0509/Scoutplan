import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors as defaultColors } from '../theme/colors';

export const THEME_COLOR_PRESETS = [
  { id: 'scout_purple', name: 'Morado Scout', hex: '#612499' },
  { id: 'scout_blue', name: 'Azul Marino', hex: '#1d4ed8' },
  { id: 'scout_green', name: 'Verde Bosque', hex: '#15803d' },
  { id: 'scout_red', name: 'Rojo Rover', hex: '#dc2626' },
  { id: 'scout_orange', name: 'Naranja Fuego', hex: '#ea580c' },
  { id: 'scout_yellow', name: 'Dorado Manada', hex: '#d97706' },
  { id: 'scout_pink', name: 'Rosa Flor de Lis', hex: '#db2777' },
  { id: 'scout_cyan', name: 'Cyan Aventura', hex: '#0891b2' },
];

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  primaryColor: string;
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
  };
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
          defaultColors.primary = savedColor;
          defaultColors.purple = savedColor;
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
    defaultColors.primary = hex;
    defaultColors.purple = hex;
    try {
      await AsyncStorage.setItem('app_primary_color', hex);
    } catch (e) {
      console.error('Error guardando color primario:', e);
    }
  };

  const resetToDefaultColor = async () => {
    await setPrimaryColor('#612499');
  };

  const theme = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    cardBg: isDarkMode ? '#18181b' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#0f172a',
    subText: isDarkMode ? '#a1a1aa' : '#64748b',
    border: isDarkMode ? '#27272a' : '#e2e8f0',
    inputBg: isDarkMode ? '#27272a' : '#f1f5f9',
    primary: primaryColor,
    primaryLight: primaryColor,
  };

  return (
    <ThemeContext.Provider value={{
      isDarkMode,
      toggleDarkMode,
      primaryColor,
      setPrimaryColor,
      resetToDefaultColor,
      theme
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

