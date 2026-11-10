// Si una pantalla falla al dibujarse, en vez de quedar en blanco se muestra este aviso con
// «Volver a intentar» / «Ir al inicio», y el error se registra (y se avisa por Telegram).
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { reportError } from '../lib/errorReporter';

interface State { error: Error | null }

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, { fatal: true, source: 'pantalla', componentStack: info?.componentStack || undefined });
  }

  private retry = () => this.setState({ error: null });

  private goHome = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.href = '/';
    else this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    // Colores fijos: si falló algo, mejor no depender del tema
    return (
      <View style={styles.wrap} accessibilityRole="alert">
        <Text style={styles.icon}>⚜️</Text>
        <Text style={styles.title}>Algo salió mal en esta pantalla</Text>
        <Text style={styles.text}>
          Ya quedó registrado para que lo revisemos. Tus datos están a salvo: lo que guardaste sigue en tu teléfono.
        </Text>
        <TouchableOpacity style={[styles.btn, styles.primary]} onPress={this.retry} accessibilityRole="button">
          <Text style={styles.primaryText}>Volver a intentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.secondary]} onPress={this.goHome} accessibilityRole="button">
          <Text style={styles.secondaryText}>Ir al inicio</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#f8fafc' },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  text: { fontSize: 15, color: '#475569', textAlign: 'center', marginTop: 8, marginBottom: 20, maxWidth: 360, lineHeight: 21 },
  btn: { minWidth: 220, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 10, paddingHorizontal: 20 },
  primary: { backgroundColor: '#612499' },
  primaryText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
  secondary: { borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: '#ffffff' },
  secondaryText: { color: '#334155', fontWeight: '700', fontSize: 15 },
});
