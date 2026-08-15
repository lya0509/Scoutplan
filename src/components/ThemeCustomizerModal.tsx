import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView
} from 'react-native';
import { Palette, X, Check, RotateCcw } from 'lucide-react-native';
import { useTheme, THEME_COLOR_PRESETS } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export function ThemeCustomizerModal({ visible, onClose }: Props) {
  const { isDarkMode, theme, primaryColor, setPrimaryColor, resetToDefaultColor } = useTheme();
  const [customHex, setCustomHex] = useState(primaryColor);

  const isValidHex = (hex: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex.trim());
  };

  const handleApplyHex = async () => {
    let cleanHex = customHex.trim();
    if (!cleanHex.startsWith('#')) {
      cleanHex = '#' + cleanHex;
    }
    if (!isValidHex(cleanHex)) {
      showAlert('Color Inválido', 'Por favor ingresa un código hexadecimal válido (ej: #612499 o #15803D).');
      return;
    }
    await setPrimaryColor(cleanHex);
    showAlert('🎨 Tema Actualizado', 'El color de la aplicación ha sido personalizado exitosamente.');
    onClose();
  };

  const handleSelectPreset = async (hex: string) => {
    setCustomHex(hex);
    await setPrimaryColor(hex);
  };

  const handleReset = async () => {
    setCustomHex('#612499');
    await resetToDefaultColor();
    showAlert('Color Restaurado', 'Se ha restablecido el Morado Scout Oficial (#612499).');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, { backgroundColor: primaryColor + '20' }]}>
                <Palette size={20} color={primaryColor} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Personalización de Color</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Vista Previa */}
            <View style={[styles.previewBox, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
              <Text style={[styles.previewLabel, { color: theme.subText }]}>VISTA PREVIA DEL COLOR ACTIVO</Text>
              <View style={styles.previewRow}>
                <View style={[styles.colorBubble, { backgroundColor: primaryColor }]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.previewHex, { color: theme.text }]}>{primaryColor.toUpperCase()}</Text>
                  <Text style={[styles.previewSub, { color: theme.subText }]}>Color primario de botones, insignias y cabeceras</Text>
                </View>
              </View>
            </View>

            {/* Paleta Predeterminada */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Paleta Scout Predeterminada</Text>
            <View style={styles.presetGrid}>
              {THEME_COLOR_PRESETS.map((preset) => {
                const isSelected = primaryColor.toLowerCase() === preset.hex.toLowerCase();
                return (
                  <TouchableOpacity
                    key={preset.id}
                    style={[
                      styles.presetItem,
                      { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: isSelected ? primaryColor : theme.border },
                      isSelected && { borderWidth: 2 }
                    ]}
                    onPress={() => handleSelectPreset(preset.hex)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.presetDot, { backgroundColor: preset.hex }]}>
                      {isSelected && <Check size={14} color="#ffffff" />}
                    </View>
                    <Text style={[styles.presetName, { color: theme.text }]} numberOfLines={1}>
                      {preset.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Código Hexadecimal Personalizado */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 18 }]}>Color Personalizado (HEX)</Text>
            <View style={styles.hexRow}>
              <TextInput
                style={[
                  styles.hexInput,
                  { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }
                ]}
                placeholder="#612499"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={customHex}
                onChangeText={setCustomHex}
                autoCapitalize="characters"
                maxLength={7}
              />
              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: primaryColor }]}
                onPress={handleApplyHex}
              >
                <Text style={styles.applyBtnText}>Aplicar</Text>
              </TouchableOpacity>
            </View>

            {/* Botón Restaurar */}
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <RotateCcw size={14} color={theme.subText} style={{ marginRight: 6 }} />
              <Text style={[styles.resetText, { color: theme.subText }]}>Restablecer color morado original</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '85%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBox: {
    padding: 8,
    borderRadius: 12,
    marginRight: 10
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold'
  },
  closeBtn: {
    padding: 6
  },
  body: {
    padding: 20
  },
  previewBox: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  colorBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 2
  },
  previewHex: {
    fontSize: 16,
    fontWeight: 'bold'
  },
  previewSub: {
    fontSize: 11,
    marginTop: 2
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: '47%',
    flex: 1
  },
  presetDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center'
  },
  presetName: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  hexRow: {
    flexDirection: 'row',
    gap: 8
  },
  hexInput: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    fontWeight: 'bold'
  },
  applyBtn: {
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  applyBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12
  },
  resetText: {
    fontSize: 12,
    fontWeight: '600'
  }
});
