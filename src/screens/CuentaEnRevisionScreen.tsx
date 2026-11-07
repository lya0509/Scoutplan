import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Hourglass, RefreshCw, LogOut, XCircle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

/**
 * Lo único que ve una cuenta recién registrada hasta que su Scouter o la Jefatura la
 * aprueban (account_status = 'pending'), o si la rechazaron. No muestra datos del grupo.
 */
export default function CuentaEnRevisionScreen() {
  const { user, refreshProfile, signOut } = useAuth();
  const { theme, isDarkMode, primaryColor } = useTheme();
  const [checking, setChecking] = useState(false);
  const rejected = user?.account_status === 'rejected';

  const check = async () => {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  };

  const confirmSignOut = () => {
    showAlert('Cerrar sesión', '¿Quieres salir de tu cuenta?', [
      { text: 'Salir', style: 'destructive', onPress: () => { signOut(); } },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const accent = rejected ? (isDarkMode ? '#fca5a5' : '#b91c1c') : primaryColor;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.container}>
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={[styles.icon, { backgroundColor: accent + '22' }]}>
          {rejected ? <XCircle size={34} color={accent} /> : <Hourglass size={34} color={accent} />}
        </View>
        <Text style={[styles.title, { color: theme.text }]}>
          {rejected ? 'Tu cuenta no fue aprobada' : 'Tu cuenta está en revisión'}
        </Text>
        <Text style={[styles.text, { color: theme.subText }]}>
          {rejected
            ? 'La Jefatura o tu Scouter no aprobaron el acceso. Si crees que es un error, habla con ellos para que revisen tu solicitud.'
            : `Hola${user?.name ? `, ${user.name.split(' ')[0]}` : ''}. Para proteger los datos del grupo, tu Scouter o la Jefatura de ${user?.group_name || 'tu grupo'} tienen que confirmar que eres miembro. Te llegará un aviso cuando te aprueben.`}
        </Text>

        <View style={[styles.info, { backgroundColor: theme.inputBg }]}>
          <Text style={[styles.infoLine, { color: theme.text }]}>Grupo: <Text style={styles.bold}>{user?.group_name || '—'}</Text></Text>
          <Text style={[styles.infoLine, { color: theme.text }]}>Rama: <Text style={styles.bold}>{(user?.unit || '—').toUpperCase()}</Text></Text>
          <Text style={[styles.infoLine, { color: theme.text }]}>Correo: <Text style={styles.bold}>{user?.email || '—'}</Text></Text>
        </View>

        <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor }]} onPress={check} disabled={checking} accessibilityRole="button">
          {checking ? <ActivityIndicator color="#fff" /> : <RefreshCw size={18} color="#fff" />}
          <Text style={styles.primaryText}>{checking ? 'Revisando…' : 'Ya me aprobaron, revisar de nuevo'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondary, { borderColor: theme.border }]} onPress={confirmSignOut} accessibilityRole="button">
          <LogOut size={17} color={theme.subText} />
          <Text style={{ color: theme.subText, fontWeight: '700' }}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, paddingVertical: 40 },
  card: { width: '100%', maxWidth: 440, borderWidth: 1, borderRadius: 20, padding: 22, alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  text: { fontSize: 14.5, lineHeight: 21, textAlign: 'center' },
  info: { width: '100%', borderRadius: 12, padding: 14, marginTop: 18, gap: 4 },
  infoLine: { fontSize: 14 },
  bold: { fontWeight: '700' },
  primary: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, minHeight: 48, marginTop: 18 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, minHeight: 46, marginTop: 10 },
});
