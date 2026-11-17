import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { X, Plus, Trash2, ChevronUp, ChevronDown, Check } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { showAlert } from '../utils/alert';
import { buttonVariants } from '../theme/buttons';
import { UserScoutAvatar } from './UserScoutAvatar';
import { GroupScarf, MAX_STRIPES, saveGroupScarf, useGroupScarf } from '../lib/groupScarf';

interface Props {
  visible: boolean;
  onClose: () => void;
  groupName: string;
}

// Colores frecuentes en pañoletas; cualquier otro se escribe en HEX.
const PALETA = [
  '#ffffff', '#111111', '#9e9e9e', '#7a1f3d', '#b71c1c', '#e53935', '#ef6c00', '#ffc61a',
  '#fff176', '#1b5e20', '#43a047', '#0d47a1', '#1e88e5', '#29b6f6', '#612499', '#6d4c41',
];
const HEX = /^#[0-9a-f]{6}$/i;
const BASE_INICIAL = '#7a1f3d';

/** Jefatura define la pañoleta del grupo: un color de fondo y las franjas que tenga, en orden. */
export function PanoletaGrupoModal({ visible, onClose, groupName }: Props) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  const btn = buttonVariants(theme, isDarkMode, primaryColor);
  const actual = useGroupScarf(groupName);
  const [base, setBase] = useState(BASE_INICIAL);
  const [stripes, setStripes] = useState<string[]>([]);
  /** Qué color se está eligiendo: 'base' o el índice de la franja. */
  const [target, setTarget] = useState<'base' | number>('base');
  const [hex, setHex] = useState('');
  const [saving, setSaving] = useState(false);

  useModalBackHandler(visible, onClose);

  // Al abrir: parte de la pañoleta guardada (o de una de ejemplo si el grupo no tiene)
  useEffect(() => {
    if (!visible) return;
    setBase(actual?.base || BASE_INICIAL);
    setStripes(actual?.stripes || []);
    setTarget('base');
    setHex('');
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const draft: GroupScarf = { base, stripes };
  const selected = target === 'base' ? base : stripes[target];

  const applyColor = (c: string) => {
    const color = c.toLowerCase();
    if (target === 'base') setBase(color);
    else setStripes(prev => prev.map((s, i) => (i === target ? color : s)));
  };
  const applyHex = () => {
    let c = hex.trim();
    if (c && !c.startsWith('#')) c = '#' + c;
    if (!HEX.test(c)) {
      showAlert('Color no válido', 'Escribe un código de 6 caracteres, por ejemplo #7A1F3D.');
      return;
    }
    applyColor(c);
    setHex('');
  };
  const addStripe = () => {
    if (stripes.length >= MAX_STRIPES) return;
    setStripes(prev => [...prev, '#ffffff']);
    setTarget(stripes.length);
  };
  const removeStripe = (i: number) => {
    setStripes(prev => prev.filter((_, k) => k !== i));
    setTarget('base');
  };
  const moveStripe = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stripes.length) return;
    setStripes(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setTarget(j);
  };

  const save = async (scarf: GroupScarf | null) => {
    setSaving(true);
    try {
      await saveGroupScarf(groupName, scarf);
      showAlert(scarf ? 'Pañoleta guardada' : 'Pañoleta quitada',
        scarf ? 'Todo el grupo la verá en su avatar.' : 'El avatar vuelve a la pañoleta blanca.');
      onClose();
    } catch (e: any) {
      showAlert('No se pudo guardar', e?.message || 'Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const rowStyle = (active: boolean) => [
    styles.row,
    { borderColor: active ? primaryColor : theme.border, backgroundColor: theme.cardBg },
    active && { borderWidth: 2 },
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: theme.text }]}>Pañoleta del grupo</Text>
              <Text style={[styles.sub, { color: theme.subText }]} numberOfLines={1}>{groupName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }} contentContainerStyle={{ paddingBottom: 28 }}>
            {/* Vista previa: grande (todas las franjas) y pequeña (como sale en las listas) */}
            <View style={[styles.preview, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
              <UserScoutAvatar role="jefe_grupo" size={132} scarf={draft} />
              <View style={{ alignItems: 'center', marginLeft: 18 }}>
                <UserScoutAvatar role="jefe_grupo" size={46} scarf={draft} />
                <Text style={[styles.hint, { color: theme.subText, marginTop: 6, textAlign: 'center' }]}>En las listas{'\n'}(3 primeras franjas)</Text>
              </View>
            </View>

            <Text style={[styles.section, { color: theme.text }]}>Colores de la pañoleta</Text>
            <Text style={[styles.hint, { color: theme.subText, marginBottom: 10 }]}>
              Toca una fila y elige su color abajo. Las franjas van en orden, del borde hacia adentro.
            </Text>

            <TouchableOpacity style={rowStyle(target === 'base')} onPress={() => setTarget('base')} activeOpacity={0.8}
              accessibilityRole="button" accessibilityLabel="Color de fondo">
              <View style={[styles.swatch, { backgroundColor: base, borderColor: theme.border }]} />
              <Text style={[styles.rowText, { color: theme.text }]}>Fondo</Text>
              <Text style={[styles.hint, { color: theme.subText, marginRight: 10 }]}>{base.toUpperCase()}</Text>
            </TouchableOpacity>

            {stripes.map((c, i) => (
              <TouchableOpacity key={i} style={rowStyle(target === i)} onPress={() => setTarget(i)} activeOpacity={0.8}
                accessibilityRole="button" accessibilityLabel={`Franja ${i + 1}`}>
                <View style={[styles.swatch, { backgroundColor: c, borderColor: theme.border }]} />
                <Text style={[styles.rowText, { color: theme.text }]}>Franja {i + 1}</Text>
                <TouchableOpacity onPress={() => moveStripe(i, -1)} disabled={i === 0} style={[styles.iconBtn, i === 0 && { opacity: 0.3 }]}
                  accessibilityRole="button" accessibilityLabel={`Subir franja ${i + 1}`}>
                  <ChevronUp size={18} color={theme.subText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveStripe(i, 1)} disabled={i === stripes.length - 1}
                  style={[styles.iconBtn, i === stripes.length - 1 && { opacity: 0.3 }]}
                  accessibilityRole="button" accessibilityLabel={`Bajar franja ${i + 1}`}>
                  <ChevronDown size={18} color={theme.subText} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeStripe(i)} style={styles.iconBtn}
                  accessibilityRole="button" accessibilityLabel={`Quitar franja ${i + 1}`}>
                  <Trash2 size={17} color={btn.dangerText.color} />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}

            {stripes.length < MAX_STRIPES && (
              <TouchableOpacity style={[styles.row, btn.secondary, { justifyContent: 'center' }]} onPress={addStripe} activeOpacity={0.8} accessibilityRole="button">
                <Plus size={17} color={theme.text} />
                <Text style={[{ fontSize: 15, fontWeight: '600', marginLeft: 6 }, btn.secondaryText]}>Agregar franja</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.section, { color: theme.text, marginTop: 18 }]}>
              Color para: {target === 'base' ? 'Fondo' : `Franja ${target + 1}`}
            </Text>
            <View style={styles.palette}>
              {PALETA.map(c => (
                <TouchableOpacity key={c} onPress={() => applyColor(c)} activeOpacity={0.8}
                  style={[styles.dot, { backgroundColor: c, borderColor: selected === c ? primaryColor : theme.border }, selected === c && { borderWidth: 3 }]}
                  accessibilityRole="button" accessibilityLabel={`Color ${c}`}>
                  {selected === c && <Check size={16} color={c === '#ffffff' || c === '#fff176' || c === '#ffc61a' ? '#111111' : '#ffffff'} />}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.hexRow}>
              <TextInput
                style={[styles.hexInput, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Otro color: #7A1F3D"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={hex}
                onChangeText={setHex}
                autoCapitalize="characters"
                maxLength={7}
                onSubmitEditing={applyHex}
              />
              <TouchableOpacity style={[styles.hexBtn, btn.secondary]} onPress={applyHex} accessibilityRole="button">
                <Text style={[styles.btnText, btn.secondaryText]}>Usar</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.mainBtn, btn.primary, saving && { opacity: 0.6 }]} onPress={() => save(draft)} disabled={saving} accessibilityRole="button">
              {saving ? <ActivityIndicator color={btn.primaryText.color} /> : <Text style={[styles.btnText, btn.primaryText]}>Guardar pañoleta</Text>}
            </TouchableOpacity>
            {actual && (
              <TouchableOpacity style={[styles.mainBtn, btn.danger, { marginTop: 10 }]} onPress={() => save(null)} disabled={saving} accessibilityRole="button">
                <Text style={[styles.btnText, btn.dangerText]}>Quitar pañoleta del grupo</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 460, borderRadius: 24, borderWidth: 1, overflow: 'hidden', maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: 'bold' },
  sub: { fontSize: 13, marginTop: 2 },
  iconBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  preview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 18 },
  section: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, borderWidth: 1, borderRadius: 12, paddingLeft: 12, paddingRight: 4, marginBottom: 8 },
  rowText: { flex: 1, fontSize: 15, fontWeight: '600', marginLeft: 12 },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  palette: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  dot: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hexRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  hexInput: { flex: 1, minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  hexBtn: { minHeight: 46, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  mainBtn: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
