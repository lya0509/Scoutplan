import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Compass } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { buttonVariants } from '../theme/buttons';

/** Pantalla de inicio de cada rol (la primera de su grupo en AppNavigator). */
export function homeRouteFor(role?: string | null): string {
  if (role === 'scouter') return 'ScouterDashboard';
  if (role === 'jefe_grupo') return 'JefeDashboard';
  if (role === 'comisionado_distrital' || role === 'comisionado_regional' || role === 'nacional' || role === 'admin') return 'ComisionadoDashboard';
  return 'Drawer';
}

/**
 * «Esta página no existe» (404): enlace mal escrito, viejo o de una pantalla que ya no está.
 * Antes la app mandaba al Inicio sin decir nada. Solo se ve con sesión iniciada: sin sesión
 * cualquier dirección lleva a Ingresar (regla «nada sin sesión»).
 */
export default function NoEncontradaScreen({ navigation }: any) {
  const { user } = useAuth();
  const { theme, isDarkMode, primaryColor } = useTheme();
  const btn = buttonVariants(theme, isDarkMode, primaryColor);
  const path = typeof window !== 'undefined' && window.location ? window.location.pathname : '';

  return (
    <View style={[styles.wrap, { backgroundColor: theme.bg }]} accessibilityRole="alert">
      <Compass size={56} color={primaryColor} />
      <Text style={[styles.title, { color: theme.text }]}>Esta página no existe</Text>
      <Text style={[styles.text, { color: theme.subText }]}>
        El enlace puede estar mal escrito, ser viejo o llevar a una pantalla que ya no está en la app.
      </Text>
      {!!path && <Text style={[styles.code, { color: theme.subText }]} selectable>Código: PAGINA-404 · {path}</Text>}
      <TouchableOpacity
        style={[styles.btn, btn.primary]}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: homeRouteFor(user?.role) }] })}
        accessibilityRole="button"
      >
        <Text style={[styles.btnText, btn.primaryText]}>Ir al inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  text: { fontSize: 15, textAlign: 'center', marginTop: 8, maxWidth: 380, lineHeight: 21 },
  code: { fontSize: 12, marginTop: 14, textAlign: 'center' },
  btn: { marginTop: 22, minWidth: 200, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  btnText: { fontWeight: '700', fontSize: 15 },
});
