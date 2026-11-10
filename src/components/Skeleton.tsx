// Esqueletos de carga: mientras llegan los datos se ve la forma de la pantalla (bloques grises
// que «respiran») en vez de una rueda girando sola en el medio. Se siente más rápido y no salta
// el diseño al aparecer el contenido.
// Para lectores de pantalla y para las pruebas E2E el contenedor es role="progressbar"
// (las pruebas fallan si una pantalla se queda cargando).
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle, DimensionValue, StyleProp } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface BlockProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/** Un bloque gris. Debe ir dentro de <SkeletonScreen> o <SkeletonPulse> para animarse. */
export function SkeletonBlock({ width = '100%', height = 14, radius = 8, style }: BlockProps) {
  const { isDarkMode } = useTheme();
  return <View style={[{ width, height, borderRadius: radius, backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' }, style]} />;
}

/** Hace «respirar» (opacidad) todo lo que contiene. */
export function SkeletonPulse({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: false }),
      Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[{ opacity }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando"
      aria-busy
    >
      {children}
    </Animated.View>
  );
}

function Card({ children, inRow }: { children: React.ReactNode; inRow?: boolean }) {
  const { theme } = useTheme();
  return <View style={[styles.card, inRow && { flex: 1 }, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>{children}</View>;
}

const Line = (p: BlockProps) => <SkeletonBlock {...p} style={{ marginTop: 8, ...(p.style || {}) }} />;

type Variant = 'dashboard' | 'list' | 'form' | 'profile' | 'panel';

/**
 * Esqueleto de pantalla completa (o de la parte que carga).
 * - dashboard: Inicio del joven (saludo, etapa actual, compañeros)
 * - list: tarjetas una debajo de otra (etapas, certificados, programas)
 * - form: hoja con campos (Ficha Médica, Currículum, Plan Trimestral)
 * - profile: foto y datos de perfil
 * - panel: paneles de Scouter / Jefatura / Comisionado (cifras + tarjetas)
 */
export function SkeletonScreen({ variant = 'list', fill = true }: { variant?: Variant; fill?: boolean }) {
  const { theme } = useTheme();
  return (
    <SkeletonPulse style={[styles.wrap, fill ? { flex: 1, backgroundColor: theme.bg } : null]}>
      {variant === 'dashboard' && (
        <>
          <SkeletonBlock height={96} radius={18} />
          <Line width="45%" height={18} style={{ marginTop: 22 }} />
          <Card>
            <SkeletonBlock width="55%" height={18} />
            <Line height={8} radius={4} style={{ marginTop: 16 }} />
            <Line width="30%" />
          </Card>
          <Line width="35%" height={18} style={{ marginTop: 22 }} />
          <View style={styles.row}>
            {[0, 1, 2].map(i => (
              <Card key={i} inRow>
                <SkeletonBlock width={56} height={56} radius={28} style={{ alignSelf: 'center' }} />
                <Line width="80%" style={{ alignSelf: 'center', marginTop: 10 }} />
              </Card>
            ))}
          </View>
        </>
      )}

      {variant === 'list' && [0, 1, 2, 3].map(i => (
        <Card key={i}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <SkeletonBlock width={44} height={44} radius={12} />
            <View style={{ flex: 1 }}>
              <SkeletonBlock width="60%" height={16} />
              <Line width="85%" />
            </View>
          </View>
        </Card>
      ))}

      {variant === 'form' && (
        <Card>
          <SkeletonBlock width="70%" height={18} />
          <Line width="45%" />
          {[0, 1, 2, 3, 4].map(i => (
            <View key={i} style={{ marginTop: 18 }}>
              <SkeletonBlock width="30%" height={10} />
              <Line height={42} radius={10} />
            </View>
          ))}
        </Card>
      )}

      {variant === 'profile' && (
        <>
          <SkeletonBlock width={110} height={110} radius={55} style={{ alignSelf: 'center', marginTop: 8 }} />
          <Line width="50%" height={20} style={{ alignSelf: 'center', marginTop: 14 }} />
          <Line width="35%" style={{ alignSelf: 'center' }} />
          <Card>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={{ marginTop: i ? 16 : 0 }}>
                <SkeletonBlock width="25%" height={10} />
                <Line width="60%" />
              </View>
            ))}
          </Card>
        </>
      )}

      {variant === 'panel' && (
        <>
          <View style={styles.row}>
            {[0, 1, 2].map(i => (
              <Card key={i} inRow>
                <SkeletonBlock width={28} height={28} radius={14} style={{ alignSelf: 'center' }} />
                <Line width="40%" height={20} style={{ alignSelf: 'center' }} />
                <Line width="70%" height={10} style={{ alignSelf: 'center' }} />
              </Card>
            ))}
          </View>
          {[0, 1, 2].map(i => (
            <Card key={i}>
              <SkeletonBlock width="50%" height={16} />
              <Line width="80%" />
              <Line width="65%" />
            </Card>
          ))}
        </>
      )}
    </SkeletonPulse>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
});
