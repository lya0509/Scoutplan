import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { Search, Moon, Sun, Bookmark } from 'lucide-react-native';
import { activitiesCatalog, CatalogActivity } from '../data/activitiesCatalog';
import { useTheme } from '../context/ThemeContext';

const SUB_AREAS = [
  'TODAS',
  'RELIGIÓN',
  'FAMILIA',
  'COMUNIDAD',
  'ESCUELA O TRABAJO',
  'IDENTIDAD NACIONAL',
  'CAMPISMO',
  'PIONERISMO',
  'ESPECIALIDADES (ACTIVIDADES)',
  'EXPLORACIÓN',
  'LEY Y PROMESA',
  'CONSERVACIÓN',
  'DESARROLLO CORPORAL',
  'DESARROLLO CULTURAL',
  'DESARROLLO OCUPACIONAL',
  'DESARROLLO SOCIAL',
  'DESARROLLO ESPIRITUAL',
  'LIDERAZGO'
];

export default function ActivityCenterScreen({ navigation }: any) {
  const { isDarkMode, toggleDarkMode, theme } = useTheme();
  const [activeTab, setActiveTab] = useState<'basicas' | 'opcionales'>('basicas');
  const [selectedSubArea, setSelectedSubArea] = useState('TODAS');
  const [searchQuery, setSearchQuery] = useState('');

  // Clasificación limpia y exacta basada en el Excel oficial de la ASV
  const { basicas, opcionales } = useMemo(() => {
    const bas = activitiesCatalog.filter(item => item.superArea === 'BÁSICAS');
    const opc = activitiesCatalog.filter(item => item.superArea === 'OPCIONALES');

    return { basicas: bas, opcionales: opc };
  }, []);

  const currentList = activeTab === 'basicas' ? basicas : opcionales;

  // Filtrar por subárea/categoría y por texto de búsqueda
  const filteredList = useMemo(() => {
    return currentList.filter(item => {
      const isSubAreaMatch = selectedSubArea === 'TODAS' || item.subArea === selectedSubArea || item.area === selectedSubArea;
      
      const q = searchQuery.trim().toLowerCase();
      const isSearchMatch = !q || 
        (item.text && item.text.toLowerCase().includes(q)) ||
        (item.area && item.area.toLowerCase().includes(q)) ||
        (item.subArea && item.subArea.toLowerCase().includes(q));

      return isSubAreaMatch && isSearchMatch;
    });
  }, [currentList, selectedSubArea, searchQuery]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA CON BOTÓN PROMINENTE DE MODO OSCURO */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={styles.topRow}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={[styles.title, { color: theme.text }]}>Biblioteca Scout</Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>
              Catálogo oficial de actividades del Plan Progresivo
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[
              styles.themePillBtn, 
              { 
                backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', 
                borderColor: isDarkMode ? '#3f3f46' : '#cbd5e1' 
              }
            ]}
            onPress={toggleDarkMode}
            activeOpacity={0.8}
          >
            {isDarkMode ? (
              <>
                <Sun size={16} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Claro</Text>
              </>
            ) : (
              <>
                <Moon size={16} color="#475569" style={{ marginRight: 6 }} />
                <Text style={{ color: '#0f172a', fontSize: 12, fontWeight: 'bold' }}>Dark AMOLED</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* DOS ÚNICAS PESTAÑAS: BÁSICAS Y OPCIONALES */}
        <View style={[styles.tabsWrapper, { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' }]}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'basicas' && styles.tabBtnActive]}
            onPress={() => setActiveTab('basicas')}
          >
            <Text style={[styles.tabText, activeTab === 'basicas' && styles.tabTextActive]}>
              Básicas ({basicas.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'opcionales' && styles.tabBtnActive]}
            onPress={() => setActiveTab('opcionales')}
          >
            <Text style={[styles.tabText, activeTab === 'opcionales' && styles.tabTextActive]}>
              Opcionales ({opcionales.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* BUSCADOR ÚNICO Y LIMPIO */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Search size={18} color={isDarkMode ? '#a1a1aa' : '#71717a'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={`Buscar en ${activeTab === 'basicas' ? 'Básicas' : 'Opcionales'}...`}
            placeholderTextColor={isDarkMode ? '#71717a' : '#94a3b8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>Borrar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* CATEGORÍAS Y SUBÁREAS HORIZONTALES */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {SUB_AREAS.map(area => (
            <TouchableOpacity
              key={area}
              style={[
                styles.chip,
                { backgroundColor: theme.inputBg, borderColor: theme.border },
                selectedSubArea === area && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedSubArea(area)}
            >
              <Text style={[
                styles.chipText,
                { color: theme.subText },
                selectedSubArea === area && { color: 'white', fontWeight: 'bold' }
              ]}>
                {area === 'TODAS' ? 'TODAS LAS CATEGORÍAS' : area}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTA DE ACTIVIDADES */}
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {filteredList.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No hay resultados</Text>
            <Text style={[styles.emptyDesc, { color: theme.subText }]}>
              No encontramos coincidencias en la sección de {activeTab === 'basicas' ? 'Básicas' : 'Opcionales'}.
            </Text>
          </View>
        ) : (
          filteredList.map((item) => (
            <View 
              key={item.id} 
              style={[
                styles.activityCard, 
                { backgroundColor: theme.cardBg, borderColor: theme.border }
              ]}
            >
              <View style={styles.cardTopRow}>
                <View style={[
                  styles.badgeTag, 
                  { backgroundColor: activeTab === 'basicas' ? '#16a34a' : colors.primary }
                ]}>
                  <Bookmark size={12} color="white" style={{ marginRight: 4 }} />
                  <Text style={styles.badgeTagText}>
                    {activeTab === 'basicas' ? 'BÁSICA' : 'OPCIONAL'}
                  </Text>
                </View>
                {item.subArea ? (
                  <Text style={[styles.subAreaText, { color: colors.primary, fontWeight: 'bold' }]}>{item.subArea}</Text>
                ) : null}
                {item.area ? (
                  <Text style={[styles.areaText, { color: theme.subText }]}>• {item.area}</Text>
                ) : null}
              </View>

              <Text style={[styles.activityText, { color: theme.text }]}>{item.text}</Text>
            </View>
          ))
        )}
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2 },
  themePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2
  },
  
  tabsWrapper: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 10 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tabTextActive: { color: '#ffffff', fontWeight: 'bold' },

  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1
  },
  searchInput: { flex: 1, fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12 },

  activityCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, flexWrap: 'wrap' },
  badgeTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeTagText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  subAreaText: { fontSize: 11 },
  areaText: { fontSize: 11 },
  activityText: { fontSize: 15, fontWeight: '600', lineHeight: 22 },

  emptyCard: { borderRadius: 14, padding: 30, alignItems: 'center', borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center' }
});
