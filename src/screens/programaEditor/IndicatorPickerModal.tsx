// Elegir indicadores de logro oficiales (ASV) de un área de crecimiento, o escribir uno propio.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput } from 'react-native';
import { Trash2, Search, CheckCircle, Plus } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { GROWTH_AREAS, GrowthAreaKey, getIndicatorsForAreaAndUnit } from '../../data/achievementIndicatorsData';
import { styles } from './styles';

interface Props {
  /** Área abierta; null = cerrado. */
  area: GrowthAreaKey | null;
  /** Ramas cuyos indicadores se muestran (varias en modo Sinodal). */
  units: string[];
  /** Texto de ramas para el encabezado, p. ej. «CLAN» o «TROPA + CLAN (Sinodal)». */
  unitsLabel: string;
  stages: string[];
  selected: string[];
  onAdd: (text: string) => void;
  onRemove: (text: string) => void;
  onClose: () => void;
}

export function IndicatorPickerModal({ area, units, unitsLabel, stages, selected, onAdd, onRemove, onClose }: Props) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState('');

  // Cada vez que se abre otra área, empezar con la búsqueda vacía
  useEffect(() => { setQuery(''); }, [area]);

  if (!area) return null;
  const q = query.toLowerCase();
  const options = getIndicatorsForAreaAndUnit(area, units as any).filter(item => item.text.toLowerCase().includes(q));

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.indicatorPickerModal, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
          <View style={styles.modalHeaderRow}>
            <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>
              {GROWTH_AREAS[area].icon} Indicadores de {GROWTH_AREAS[area].name}
            </Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Trash2 size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
            {unitsLabel} (Etapas {stages.join(', ')}):
          </Text>

          {/* Buscador en vivo */}
          <View style={[styles.searchBox, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
            <Search size={16} color={theme.subText} style={{ marginRight: 8 }} />
            <TextInput
              style={{ flex: 1, color: theme.text, fontSize: 13 }}
              placeholder="Buscar indicador..."
              placeholderTextColor={theme.subText}
              value={query}
              onChangeText={setQuery}
            />
          </View>

          {/* Lista filtrada */}
          <ScrollView style={{ maxHeight: 340, marginTop: 10 }}>
            {options.map((item, idx) => {
              const isAlreadySelected = selected.includes(item.text);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.indicatorOptionRow,
                    isAlreadySelected && { backgroundColor: primaryColor + '15', borderColor: primaryColor },
                    { borderColor: theme.border }
                  ]}
                  onPress={() => (isAlreadySelected ? onRemove(item.text) : onAdd(item.text))}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, color: theme.accentText, fontWeight: 'bold' }}>Etapa {item.stage}</Text>
                    <Text style={[styles.indicatorOptionText, { color: theme.text }]}>{item.text}</Text>
                  </View>
                  {isAlreadySelected && <CheckCircle size={16} color={primaryColor} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Opción de agregar indicador personalizado manual */}
          <View style={[styles.customAddBlock, { borderTopColor: theme.border }]}>
            <TextInput
              style={[styles.customInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
              placeholder="O escribe un indicador personalizado..."
              placeholderTextColor={theme.subText}
              value={custom}
              onChangeText={setCustom}
            />
            <TouchableOpacity
              style={[styles.customAddBtn, { backgroundColor: primaryColor }]}
              onPress={() => {
                if (custom.trim()) {
                  onAdd(custom.trim());
                  setCustom('');
                }
              }}
            >
              <Plus size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
            onPress={onClose}
          >
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Listo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
