// Encabezado común de los paneles de Scouter, Jefatura y Comisionados (antes cada uno tenía
// el suyo: distinto tamaño, color y orden). Arriba: etiqueta del rol + botones; abajo: el
// nombre a todo lo ancho (antes los botones lo apretaban en dos líneas).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Palette, Moon, Sun, LogOut } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import NotificationHeaderBell from './NotificationHeaderBell';

interface Props {
  /** Etiqueta pequeña de arriba: rol y alcance («Scouter · Unidad CLAN»). */
  eyebrow: string;
  /** Ícono opcional antes de la etiqueta (p. ej. el nivel territorial). */
  eyebrowIcon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Botones extra a la izquierda de los fijos (mismo estilo: usar PanelHeaderButton). */
  extraActions?: React.ReactNode;
  showBell?: boolean;
  onCustomize: () => void;
  onSignOut: () => void;
}

export function PanelHeaderButton({ onPress, label, children, danger }: { onPress: () => void; label: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <TouchableOpacity
      style={[styles.iconBtn, danger && { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {children}
    </TouchableOpacity>
  );
}

export function PanelHeader({ eyebrow, eyebrowIcon, title, subtitle, extraActions, showBell = true, onCustomize, onSignOut }: Props) {
  const { isDarkMode, toggleDarkMode, primaryColor } = useTheme();
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: isDarkMode ? '#121214' : primaryColor },
        isDarkMode && { borderBottomWidth: 1, borderBottomColor: '#27272a' },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.eyebrowWrap}>
          {eyebrowIcon}
          <Text style={styles.eyebrow} numberOfLines={1}>{eyebrow}</Text>
        </View>
        <View style={styles.actions}>
          {extraActions}
          {showBell && <NotificationHeaderBell color="#ffffff" style={styles.iconBtn} />}
          <PanelHeaderButton onPress={onCustomize} label="Personalizar colores">
            <Palette color="#ffffff" size={20} />
          </PanelHeaderButton>
          <PanelHeaderButton onPress={toggleDarkMode} label={isDarkMode ? 'Modo claro' : 'Modo oscuro'}>
            {isDarkMode ? <Sun color="#f59e0b" size={20} /> : <Moon color="#ffffff" size={20} />}
          </PanelHeaderButton>
          <PanelHeaderButton onPress={onSignOut} label="Cerrar sesión" danger>
            <LogOut color="#fca5a5" size={20} />
          </PanelHeaderButton>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 20, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, backgroundColor: 'rgba(255,255,255,0.16)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  eyebrow: { color: '#ffffff', fontSize: 12, fontWeight: '700', letterSpacing: 0.3, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  title: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 14 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 4 },
});
