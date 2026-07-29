import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  theme: {
    bg: string;
    cardBg: string;
    text: string;
    subText: string;
    border: string;
    inputBg: string;
  };
}

const ThemeContext = createContext<ThemeContextType>({} as ThemeContextType);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Cargar preferencia del tema al iniciar
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('app_dark_mode');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'true');
        }
      } catch (e) {
        console.error('Error cargando preferencia de tema:', e);
      }
    };
    loadThemePreference();
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

  const theme = {
    bg: isDarkMode ? '#000000' : '#f8fafc',
    cardBg: isDarkMode ? '#18181b' : '#ffffff',
    text: isDarkMode ? '#ffffff' : '#0f172a',
    subText: isDarkMode ? '#a1a1aa' : '#64748b',
    border: isDarkMode ? '#27272a' : '#e2e8f0',
    inputBg: isDarkMode ? '#27272a' : '#f1f5f9',
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode, theme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
