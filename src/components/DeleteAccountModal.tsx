import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ActivityIndicator } from 'react-native';
import { Trash2, X } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { apiUrl } from '../lib/apiClient';
import { showAlert } from '../utils/alert';

/** Botón «Borrar mi cuenta» + confirmación escrita. Usa /api/delete-account (solo la propia cuenta). */
export function DeleteAccountButton({ compact }: { compact?: boolean }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity
        style={[styles.trigger, { borderColor: theme.border }, compact && { minHeight: 40 }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
      >
        <Trash2 size={16} color="#dc2626" />
        <Text style={styles.triggerText}>Borrar mi cuenta</Text>
      </TouchableOpacity>
      {open && <DeleteAccountModal onClose={() => setOpen(false)} />}
    </>
  );
}

export default function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLeader = !!user?.role && user.role !== 'scout';

  const confirm = async () => {
    if (text.trim().toUpperCase() !== 'BORRAR') { setError('Escribe BORRAR para confirmar.'); return; }
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token;
      if (!token) throw new Error('Tu sesión venció. Vuelve a entrar e inténtalo de nuevo.');
      const res = await fetch(apiUrl('/api/delete-account'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm: 'BORRAR' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.message || `No se pudo borrar la cuenta (error ${res.status}).`);
      showAlert('Cuenta borrada', 'Tu cuenta y tus datos personales se borraron. Gracias por haber sido parte.');
      await signOut();
    } catch (e: any) {
      setError(e?.message?.includes('Failed to fetch') ? 'Necesitas conexión a internet para borrar la cuenta.' : (e?.message || 'No se pudo borrar la cuenta.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.head}>
            <Text style={[styles.title, { color: theme.text }]}>Borrar mi cuenta</Text>
            <TouchableOpacity onPress={onClose} style={styles.close} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.p, { color: theme.text }]}>Se borra para siempre y no se puede deshacer:</Text>
          <Text style={[styles.li, { color: theme.subText }]}>• Tu perfil, ficha médica y datos personales</Text>
          <Text style={[styles.li, { color: theme.subText }]}>• Tu avance del Plan Progresivo, certificados y comprobantes</Text>
          <Text style={[styles.li, { color: theme.subText }]}>• Tus fotos y archivos subidos</Text>
          <Text style={[styles.p, { color: theme.subText, marginTop: 8 }]}>
            Se conserva lo que es del grupo (calendario, programas y planes trimestrales), sin tu nombre.
          </Text>
          {isLeader && (
            <Text style={[styles.warn]}>
              Eres dirigente: si eres la única Jefatura de tu grupo, pide antes a un Comisionado que nombre a otra persona.
            </Text>
          )}
          <Text style={[styles.label, { color: theme.subText }]}>Escribe BORRAR para confirmar</Text>
          <TextInput
            value={text}
            onChangeText={setText}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="BORRAR"
            placeholderTextColor={theme.subText}
            style={[styles.input, { color: theme.text, backgroundColor: theme.inputBg, borderColor: theme.border }]}
            accessibilityLabel="Escribe BORRAR para confirmar"
          />
          {error && <Text style={styles.error}>{error}</Text>}
          <View style={styles.actions}>
            <TouchableOpacity style={[styles.secondary, { borderColor: theme.border }]} onPress={onClose} disabled={busy}>
              <Text style={{ color: theme.subText, fontWeight: '700' }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.danger, { opacity: text.trim().toUpperCase() === 'BORRAR' ? 1 : 0.5 }]}
              onPress={confirm}
              disabled={busy}
              accessibilityRole="button"
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerText}>Borrar para siempre</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderRadius: 12, minHeight: 46, paddingHorizontal: 14 },
  triggerText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 460, alignSelf: 'center', borderRadius: 18, borderWidth: 1, padding: 20 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  close: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  p: { fontSize: 14, lineHeight: 20 },
  li: { fontSize: 14, lineHeight: 21, marginLeft: 4 },
  warn: { fontSize: 13, lineHeight: 18, color: '#b45309', marginTop: 10 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, minHeight: 46, fontSize: 16, letterSpacing: 2 },
  error: { color: '#dc2626', fontSize: 13.5, marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  secondary: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 12, borderWidth: 1, minHeight: 46 },
  danger: { flex: 1.4, alignItems: 'center', justifyContent: 'center', borderRadius: 12, minHeight: 46, backgroundColor: '#dc2626' },
  dangerText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
