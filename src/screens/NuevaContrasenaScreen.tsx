import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { KeyRound, Eye, EyeOff, LogOut } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

const MIN_LEN = 8;

/**
 * Se muestra al entrar con el enlace de «¿Olvidaste tu contraseña?» (AuthContext.recoveryMode).
 * Hasta guardar la contraseña nueva no se ve nada más de la app.
 */
export default function NuevaContrasenaScreen() {
  const { user, endRecovery, signOut } = useAuth();
  const { theme, primaryColor } = useTheme();
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (pass.length < MIN_LEN) { setError(`La contraseña debe tener al menos ${MIN_LEN} caracteres.`); return; }
    if (pass !== pass2) { setError('Las dos contraseñas no coinciden.'); return; }
    setSaving(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password: pass });
      if (e) {
        if (/different from the old|same_password/i.test(e.message + (e as any).code)) setError('La contraseña nueva debe ser distinta a la anterior.');
        else if (/weak|at least/i.test(e.message)) setError('Esa contraseña es muy débil. Usa una más larga, con letras y números.');
        else if (/session|jwt|expired/i.test(e.message)) setError('El enlace venció. Cierra sesión y pide un enlace nuevo.');
        else setError(e.message);
        return;
      }
      endRecovery();
      showAlert('Contraseña cambiada', 'Listo. Desde ahora entra con tu contraseña nueva.');
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar. Revisa tu conexión.');
    } finally {
      setSaving(false);
    }
  };

  const input = [styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={[styles.icon, { backgroundColor: primaryColor + '22' }]}>
          <KeyRound size={32} color={primaryColor} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Crea tu contraseña nueva</Text>
        <Text style={[styles.sub, { color: theme.subText }]}>
          {user?.email ? `Para la cuenta ${user.email}.` : 'Escríbela dos veces.'} Mínimo {MIN_LEN} caracteres.
        </Text>

        <Text style={[styles.label, { color: theme.subText }]}>Contraseña nueva</Text>
        <View style={styles.row}>
          <TextInput
            value={pass}
            onChangeText={setPass}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            style={[input, { flex: 1 }]}
            accessibilityLabel="Contraseña nueva"
          />
          <TouchableOpacity onPress={() => setShow(v => !v)} style={styles.eye} accessibilityRole="button" accessibilityLabel={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
            {show ? <EyeOff size={20} color={theme.subText} /> : <Eye size={20} color={theme.subText} />}
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: theme.subText }]}>Repite la contraseña</Text>
        <TextInput
          value={pass2}
          onChangeText={setPass2}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          style={input}
          onSubmitEditing={save}
          accessibilityLabel="Repite la contraseña"
        />

        {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}

        <TouchableOpacity style={[styles.primary, { backgroundColor: primaryColor }]} onPress={save} disabled={saving} accessibilityRole="button">
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Guardar contraseña</Text>}
        </TouchableOpacity>
        <TouchableOpacity style={[styles.secondary, { borderColor: theme.border }]} onPress={() => signOut()} accessibilityRole="button">
          <LogOut size={17} color={theme.subText} />
          <Text style={{ color: theme.subText, fontWeight: '700' }}>Cancelar y cerrar sesión</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 16, paddingVertical: 40 },
  card: { width: '100%', maxWidth: 420, borderWidth: 1, borderRadius: 20, padding: 22 },
  icon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  sub: { fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 14, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 10, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 46, fontSize: 16 },
  eye: { width: 44, height: 46, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#dc2626', fontSize: 13.5, marginTop: 12, lineHeight: 19 },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, minHeight: 48, marginTop: 18 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, borderWidth: 1, minHeight: 46, marginTop: 10 },
});
