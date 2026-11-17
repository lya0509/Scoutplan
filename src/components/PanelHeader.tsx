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
      style={styles.iconBtn}
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
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const fg = isDarkMode ? '#ffffff' : theme.onPrimary;
  return (
    <View
      style={[
        styles.header,
        { backgroundColor: isDarkMode ? theme.cardBg : theme.primary },
        isDarkMode && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.eyebrowWrap}>
          {eyebrowIcon}
          <Text style={[styles.eyebrow, { color: fg }]} numberOfLines={1}>{eyebrow}</Text>
        </View>
        <View style={styles.actions}>
          {extraActions}
          {showBell && <NotificationHeaderBell color={fg} style={styles.iconBtn} />}
          <PanelHeaderButton onPress={onCustomize} label="Personalizar colores">
            <Palette color={fg} size={20} />
          </PanelHeaderButton>
          <PanelHeaderButton onPress={toggleDarkMode} label={isDarkMode ? 'Modo claro' : 'Modo oscuro'}>
            {isDarkMode ? <Sun color={fg} size={20} /> : <Moon color={fg} size={20} />}
          </PanelHeaderButton>
          <PanelHeaderButton onPress={onSignOut} label="Cerrar sesión" danger>
            <LogOut color={fg} size={20} />
          </PanelHeaderButton>
        </View>
      </View>
      <Text style={[styles.title, { color: fg }]} numberOfLines={2} accessibilityRole="header">{title}</Text>
      {!!subtitle && <Text style={[styles.subtitle, { color: fg }]} numberOfLines={2}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  eyebrowWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  eyebrow: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700', marginTop: 12 },
  subtitle: { fontSize: 14, marginTop: 2, opacity: 0.9 },
});
