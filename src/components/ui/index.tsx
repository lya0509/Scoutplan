// Piezas comunes del sistema de diseño (2026-11-16): botón, tarjeta, etiqueta, barra de progreso,
// casilla, estados vacío / error y las animaciones de entrada. Todas leen el tema (color de la
// rama, modo oscuro) y los números de src/theme/tokens.ts. Las pantallas deben usar estas piezas
// en vez de pintar las suyas.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Pressable, View, Text, StyleSheet, ActivityIndicator, Platform,
  AccessibilityInfo, StyleProp, ViewStyle, TextStyle,
} from 'react-native';
import { AlertTriangle, Check, Lock, RotateCw } from 'lucide-react-native';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { MOTION, RADIUS, SPACE, TYPE, TOUCH_MIN } from '../../theme/tokens';

type IconType = React.ComponentType<{ size?: number; color?: string }>;

const EASE = Easing.bezier(...MOTION.bezier);
const NATIVE = Platform.OS !== 'web';

// ── Menos movimiento ─────────────────────────────────────────────────────────────────────
let reduceMotionNative = false;
if (NATIVE) {
  AccessibilityInfo.isReduceMotionEnabled().then(v => { reduceMotionNative = v; }).catch(() => {});
}
/** true si la persona pidió menos animaciones en su teléfono o navegador. */
export function prefersReducedMotion(): boolean {
  if (NATIVE) return reduceMotionNative;
  try {
    return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ── Entrada: aparece y sube 10 px, en cascada según `index` ─────────────────────────────
export function Enter({ index = 0, from = 10, children, style }: { index?: number; /** píxeles desde donde entra: positivo sube, negativo baja */ from?: number; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = prefersReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) return;
    const anim = Animated.timing(v, {
      toValue: 1, duration: MOTION.enter, delay: Math.min(index, 8) * MOTION.stagger, easing: EASE, useNativeDriver: NATIVE,
    });
    anim.start();
    return () => anim.stop();
  }, [v, index, reduced]);
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

// ── Cambio de pantalla: la pantalla que entra aparece y sube 8 px ───────────────────────
// Se usa desde `screenLayout` de los navegadores; se repite cada vez que la pantalla vuelve a
// quedar al frente (cambiar de pestaña en la barra inferior, volver atrás).
export function ScreenTransition({ children }: { children: React.ReactNode }) {
  const focused = useIsFocused();
  const reduced = prefersReducedMotion();
  const v = useRef(new Animated.Value(reduced ? 1 : 0)).current;
  // useLayoutEffect: el 0 se pone antes de pintar, así la pantalla no parpadea al volver.
  useLayoutEffect(() => {
    if (!focused || reduced) { if (reduced) v.setValue(1); return; }
    v.setValue(0);
    const anim = Animated.timing(v, { toValue: 1, duration: MOTION.enter, easing: EASE, useNativeDriver: NATIVE });
    anim.start();
    return () => { anim.stop(); v.setValue(1); };
  }, [focused, reduced, v]);
  return (
    <Animated.View style={{ flex: 1, opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}

// ── Rebote corto: para logros (casilla marcada, envío, botón que pide atención) ─────────
export function Pop({ trigger, children, style }: { trigger: unknown; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (!trigger || prefersReducedMotion()) return;
    v.setValue(0.6);
    Animated.sequence([
      Animated.timing(v, { toValue: 1.12, duration: MOTION.pop * 0.6, easing: EASE, useNativeDriver: NATIVE }),
      Animated.timing(v, { toValue: 1, duration: MOTION.pop * 0.4, easing: EASE, useNativeDriver: NATIVE }),
    ]).start();
  }, [trigger, v]);
  return <Animated.View style={[style, { transform: [{ scale: v }] }]}>{children}</Animated.View>;
}

// ── Superficie que se encoge a 97 % al tocarla ──────────────────────────────────────────
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface PressProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  hoverStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'checkbox' | 'tab';
  accessibilityState?: { selected?: boolean; checked?: boolean; disabled?: boolean; busy?: boolean; expanded?: boolean };
  testID?: string;
  scaleTo?: number;
}

export function Press({ onPress, disabled, style, hoverStyle, children, accessibilityLabel, accessibilityRole = 'button', accessibilityState, testID, scaleTo = 0.97 }: PressProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const [hover, setHover] = useState(false);
  const to = (v: number) => {
    if (prefersReducedMotion()) return;
    Animated.timing(scale, { toValue: v, duration: MOTION.press, easing: EASE, useNativeDriver: NATIVE }).start();
  };
  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={() => !disabled && to(scaleTo)}
      onPressOut={() => to(1)}
      onHoverIn={() => setHover(true)}
      onHoverOut={() => setHover(false)}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ ...accessibilityState, disabled: !!disabled }}
      testID={testID}
      style={[style, hover && !disabled && hoverStyle, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressable>
  );
}

// ── Botón ───────────────────────────────────────────────────────────────────────────────
// principal: LA acción de la pantalla (una sola) · secundario: ver, exportar, filtrar ·
// peligro: borrar, devolver · texto: enlaces dentro de tarjetas.
interface BtnProps {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'text';
  Icon?: IconType;
  /** Color propio del ícono en botones secundarios (Excel verde, PDF rojo). */
  iconColor?: string;
  loading?: boolean;
  disabled?: boolean;
  block?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Btn({ label, onPress, variant = 'primary', Icon, iconColor, loading, disabled, block, small, style, textStyle, accessibilityLabel, testID }: BtnProps) {
  const { theme } = useTheme();
  const off = !!disabled;
  let bg = theme.primary, border = theme.primary, fg = theme.onPrimary, hoverBg: string | undefined;
  if (variant === 'secondary') { bg = theme.cardBg; border = theme.border; fg = theme.text; hoverBg = theme.inputBg; }
  if (variant === 'danger') { bg = theme.errSoft; border = theme.errLine; fg = theme.err; }
  if (variant === 'text') { bg = 'transparent'; border = 'transparent'; fg = theme.accentText; hoverBg = theme.accentSoft; }
  if (off) { bg = variant === 'text' ? 'transparent' : theme.inputBg; border = variant === 'text' ? 'transparent' : theme.border; fg = theme.subText; }
  return (
    <Press
      onPress={onPress}
      disabled={off || loading}
      accessibilityLabel={accessibilityLabel || label}
      accessibilityState={{ busy: !!loading }}
      testID={testID}
      hoverStyle={hoverBg ? { backgroundColor: hoverBg } : { opacity: 0.92 }}
      style={[
        styles.btn,
        small && styles.btnSmall,
        variant === 'text' && styles.btnText,
        block && { alignSelf: 'stretch' },
        { backgroundColor: bg, borderColor: border },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator size="small" color={fg} />
        : Icon ? <Icon size={small ? 16 : 20} color={off ? fg : (iconColor || fg)} /> : null}
      <Text style={[styles.btnLabel, small && { fontSize: 13 }, { color: fg }, textStyle]} numberOfLines={1}>{label}</Text>
    </Press>
  );
}

// ── Tarjeta ─────────────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  /** Resalta la tarjeta con el acento (la etapa actual, lo que pide atención). */
  active?: boolean;
  /** Borde punteado y sin fondo (bloqueado, inactivo). */
  muted?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export function Card({ children, active, muted, onPress, style, accessibilityLabel, testID }: CardProps) {
  const { theme } = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: muted ? 'transparent' : theme.cardBg, borderColor: active ? theme.primary : theme.border },
    muted && { borderStyle: 'dashed' },
    active && { borderWidth: 1.5 },
    style,
  ];
  if (onPress) {
    return (
      <Press onPress={onPress} style={base} hoverStyle={{ borderColor: theme.primary }} scaleTo={0.985} accessibilityLabel={accessibilityLabel} testID={testID}>
        {children}
      </Press>
    );
  }
  return <View style={base} testID={testID}>{children}</View>;
}

// ── Etiqueta de estado ──────────────────────────────────────────────────────────────────
export type Tone = 'accent' | 'ok' | 'warn' | 'err' | 'neutral';

export function useTone(tone: Tone): { bg: string; fg: string } {
  const { theme } = useTheme();
  switch (tone) {
    case 'accent': return { bg: theme.accentSoft, fg: theme.accentText };
    case 'ok': return { bg: theme.okSoft, fg: theme.ok };
    case 'warn': return { bg: theme.warnSoft, fg: theme.warn };
    case 'err': return { bg: theme.errSoft, fg: theme.err };
    default: return { bg: theme.inputBg, fg: theme.subText };
  }
}

export function Chip({ label, tone = 'neutral', Icon, style }: { label: string; tone?: Tone; Icon?: IconType; style?: StyleProp<ViewStyle> }) {
  const { bg, fg } = useTone(tone);
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      {Icon ? <Icon size={14} color={fg} /> : null}
      <Text style={[styles.chipLabel, { color: fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ── Barra de progreso (se llena en 600 ms) ──────────────────────────────────────────────
export function ProgressBar({ value, onAccent, height = 8, style }: { value: number; onAccent?: boolean; height?: number; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const v = useRef(new Animated.Value(prefersReducedMotion() ? pct : 0)).current;
  useEffect(() => {
    if (prefersReducedMotion()) { v.setValue(pct); return; }
    Animated.timing(v, { toValue: pct, duration: MOTION.fill, easing: EASE, useNativeDriver: false }).start();
  }, [pct, v]);
  return (
    <View
      style={[{ height, borderRadius: RADIUS.pill, overflow: 'hidden', backgroundColor: onAccent ? 'rgba(255,255,255,0.28)' : theme.border }, style]}
      // Sin role="progressbar": las pruebas E2E lo usan para detectar pantallas que se quedan cargando
      accessibilityLabel={`Avance: ${Math.round(pct)} %`}
    >
      <Animated.View
        style={{
          height: '100%', borderRadius: RADIUS.pill,
          backgroundColor: onAccent ? theme.onPrimary : theme.primary,
          width: v.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}

/** Número que cuenta desde 0 hasta `value` mientras la barra se llena. */
export function CountUp({ value, suffix = '', style }: { value: number; suffix?: string; style?: StyleProp<TextStyle> }) {
  const target = Math.round(Number.isFinite(value) ? value : 0);
  const [shown, setShown] = useState(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(target); return; }
    const v = new Animated.Value(shown);
    const id = v.addListener(({ value: n }) => setShown(Math.round(n)));
    Animated.timing(v, { toValue: target, duration: MOTION.fill, easing: EASE, useNativeDriver: false }).start();
    return () => { v.removeListener(id); v.stopAnimation(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return <Text style={style}>{shown}{suffix}</Text>;
}

// ── Casilla de requisito (solo dibujo; el toque lo maneja la fila) ──────────────────────
export function CheckMark({ checked, locked, error, size = 24 }: { checked?: boolean; locked?: boolean; error?: boolean; size?: number }) {
  const { theme } = useTheme();
  return (
    <Pop trigger={checked}>
      <View
        style={{
          width: size, height: size, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center',
          borderStyle: locked && !checked ? 'dashed' : 'solid',
          borderColor: checked ? theme.primary : error ? theme.err : theme.subText,
          backgroundColor: checked ? theme.primary : 'transparent',
        }}
      >
        {checked ? <Check size={size - 8} color={theme.onPrimary} strokeWidth={3} /> : locked ? <Lock size={size - 12} color={theme.subText} /> : null}
      </View>
    </Pop>
  );
}

// ── Títulos ─────────────────────────────────────────────────────────────────────────────
export function SectionTitle({ children, right, style }: { children: React.ReactNode; right?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm }, style]}>
      <Text style={[TYPE.h3, { color: theme.text, flexShrink: 1 }]} accessibilityRole="header">{children}</Text>
      {right}
    </View>
  );
}

// ── Estados de pantalla: vacío y error ──────────────────────────────────────────────────
interface StateProps {
  Icon?: IconType;
  title: string;
  text?: string;
  actionLabel?: string;
  onAction?: () => void;
  ActionIcon?: IconType;
  style?: StyleProp<ViewStyle>;
}

/** Lista o sección sin datos todavía: dice para qué sirve y ofrece el primer paso. */
export function EmptyState({ Icon, title, text, actionLabel, onAction, ActionIcon, style }: StateProps) {
  const { theme } = useTheme();
  return (
    <Enter style={[styles.state, style]}>
      {Icon ? (
        <View style={[styles.stateIcon, { backgroundColor: theme.accentSoft }]}>
          <Icon size={32} color={theme.accentText} />
        </View>
      ) : null}
      <Text style={[TYPE.h3, { color: theme.text, textAlign: 'center' }]}>{title}</Text>
      {!!text && <Text style={[TYPE.small, { color: theme.subText, textAlign: 'center' }]}>{text}</Text>}
      {!!actionLabel && !!onAction && <Btn label={actionLabel} onPress={onAction} Icon={ActionIcon} style={{ marginTop: SPACE.sm }} />}
    </Enter>
  );
}

/** Algo no cargó: sin códigos técnicos, con «Reintentar». El rojo va en el ícono, no en el botón. */
export function ErrorState({ title = 'No se pudo cargar', text = 'Revisa tu conexión e inténtalo de nuevo.', actionLabel = 'Reintentar', onAction, style }: Partial<StateProps>) {
  const { theme } = useTheme();
  return (
    <Enter style={[styles.state, style]}>
      <View style={[styles.stateIcon, { backgroundColor: theme.errSoft }]} accessibilityRole="alert">
        <AlertTriangle size={32} color={theme.err} />
      </View>
      <Text style={[TYPE.h3, { color: theme.text, textAlign: 'center' }]}>{title}</Text>
      {!!text && <Text style={[TYPE.small, { color: theme.subText, textAlign: 'center' }]}>{text}</Text>}
      {!!onAction && <Btn label={actionLabel} onPress={onAction} Icon={RotateCw} style={{ marginTop: SPACE.sm }} />}
    </Enter>
  );
}

/** Aviso dentro de la pantalla (error que bloquea, advertencia, nota). */
export function Notice({ tone = 'accent', Icon, children, style }: { tone?: Tone; Icon?: IconType; children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { bg, fg } = useTone(tone);
  const { theme } = useTheme();
  const IconC = Icon || (tone === 'err' || tone === 'warn' ? AlertTriangle : undefined);
  return (
    <View style={[styles.notice, { backgroundColor: bg }, style]} accessibilityRole={tone === 'err' ? 'alert' : undefined}>
      {IconC ? <IconC size={20} color={fg} /> : null}
      <Text style={[TYPE.small, { color: tone === 'accent' || tone === 'neutral' ? theme.text : fg, flex: 1 }]}>{children}</Text>
    </View>
  );
}

// ── Formularios por pasos (teléfono) ────────────────────────────────────────────────────
// Los formularios largos se muestran una sección a la vez. Los campos de los otros pasos siguen
// montados (solo ocultos con `stepHidden`), así no se pierde lo escrito y «Guardar» sirve en
// cualquier paso.
export const stepHidden = (stepped: boolean, step: number, index: number): ViewStyle | undefined =>
  stepped && step !== index ? { display: 'none' } : undefined;

export function StepHeader({ step, titles, onStep }: { step: number; titles: string[]; onStep: (i: number) => void }) {
  const { theme } = useTheme();
  return (
    <View style={{ marginBottom: SPACE.lg }}>
      <Text style={[TYPE.over, { color: theme.subText }]}>Paso {step + 1} de {titles.length}</Text>
      <Text style={[TYPE.h3, { color: theme.text, marginTop: 2 }]}>{titles[step]}</Text>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: SPACE.sm }}>
        {titles.map((t, i) => (
          <Pressable
            key={t}
            onPress={() => onStep(i)}
            accessibilityRole="button"
            accessibilityLabel={`Ir al paso ${i + 1}: ${t}`}
            accessibilityState={{ selected: i === step }}
            hitSlop={{ top: 16, bottom: 16 }}
            style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= step ? theme.primary : theme.border }}
          />
        ))}
      </View>
    </View>
  );
}

export function StepNav({ step, total, onStep }: { step: number; total: number; onStep: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: SPACE.xl }}>
      <Btn label="Anterior" variant="secondary" disabled={step === 0} onPress={() => onStep(step - 1)} style={{ flex: 1 }} />
      <Btn label="Siguiente" variant="secondary" disabled={step >= total - 1} onPress={() => onStep(step + 1)} style={{ flex: 1 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 48, paddingHorizontal: 20, borderRadius: RADIUS.md, borderWidth: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm,
  },
  btnSmall: { minHeight: 40, paddingHorizontal: 14, borderRadius: 12 },
  btnText: { minHeight: TOUCH_MIN, paddingHorizontal: SPACE.sm },
  btnLabel: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  card: { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACE.lg },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 24, paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill, alignSelf: 'flex-start' },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  state: { alignItems: 'center', gap: SPACE.sm, paddingVertical: SPACE.xxl, paddingHorizontal: SPACE.xl },
  stateIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: SPACE.xs },
  notice: { flexDirection: 'row', gap: 10, padding: SPACE.md, borderRadius: RADIUS.md, alignItems: 'flex-start' },
});
