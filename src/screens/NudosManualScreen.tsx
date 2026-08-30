import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform
} from 'react-native';
import { Compass, Search, ChevronRight, BookOpen, Shield, Sparkles, CheckCircle2, ArrowLeft } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { navigateBackOrHome } from '../utils/navigationHelper';

interface KnotItem {
  id: string;
  name: string;
  category: 'basico' | 'amarre' | 'empalme' | 'especial';
  difficulty: 'Fácil' | 'Intermedio' | 'Avanzado';
  use: string;
  steps: string[];
  svgIcon: string;
}

const KNOTS_DATA: KnotItem[] = [
  {
    id: 'nudo_llano',
    name: 'Nudo Rizo o Llano',
    category: 'basico',
    difficulty: 'Fácil',
    use: 'Unir dos cuerdas del mismo grosor. Ideal para vendajes de primeros auxilios y pañuelos scout.',
    steps: [
      '1. Toma un extremo en cada mano (Izquierda y Derecha).',
      '2. Cruza el extremo Izquierdo sobre el Derecho y pasa por debajo.',
      '3. Luego cruza el extremo Derecho sobre el Izquierdo y pasa por debajo.',
      '4. Ajusta firmemente ambos lados.'
    ],
    svgIcon: '🪢'
  },
  {
    id: 'ballestrinque',
    name: 'Ballestrinque',
    category: 'basico',
    difficulty: 'Fácil',
    use: 'Sujetar una cuerda a un poste o árbol. Base principal para comenzar casi todos los amarres de construcciones.',
    steps: [
      '1. Dale una vuelta a la cuerda alrededor del poste.',
      '2. Cruza la cuerda por encima del primer tramo haciendo una X.',
      '3. Dale una segunda vuelta e introduce el extremo por debajo del cruce.',
      '4. Tensa fuertemente.'
    ],
    svgIcon: '🪵'
  },
  {
    id: 'as_de_guia',
    name: 'As de Guía (Bowline)',
    category: 'especial',
    difficulty: 'Intermedio',
    use: 'El rey de los nudos de salvamento. Forma una gaza fija que nunca se corre ni se aprieta bajo tensión pesada.',
    steps: [
      '1. Haz un bucle pequeño en la cuerda (el lago).',
      '2. El extremo (la serpiente) sale del lago.',
      '3. Pasa por detrás del árbol (tramo largo de la cuerda).',
      '4. Vuelve a entrar al lago y ajusta.'
    ],
    svgIcon: '🦺'
  },
  {
    id: 'amarre_cuadrado',
    name: 'Amarre Cuadrado',
    category: 'amarre',
    difficulty: 'Intermedio',
    use: 'Unir dos troncos que se cruzan a 90 grados. Esencial en construcciones scout (portadas, mesas, torres).',
    steps: [
      '1. Empieza con un Ballestrinque en el tronco vertical.',
      '2. Pasa la cuerda sobre el tronco horizontal, luego por detrás del vertical.',
      '3. Da 3 a 4 vueltas completas ordenadas.',
      '4. Realiza el "ahorcado" (vueltas de apriete entre ambos troncos).',
      '5. Remata con un Ballestrinque.'
    ],
    svgIcon: '🏗️'
  },
  {
    id: 'amarre_diagonal',
    name: 'Amarre Diagonal',
    category: 'amarre',
    difficulty: 'Intermedio',
    use: 'Unir dos troncos que se cruzan en ángulo diagonal y tienden a separarse.',
    steps: [
      '1. Inicia con un nudo Leñador (Vuelta de Braza) abrazando ambos troncos.',
      '2. Da 3 vueltas en sentido de la diagonal principal.',
      '3. Da 3 vueltas en la diagonal opuesta formando una X.',
      '4. Ahorca fuertemente el cruce y remata con Ballestrinque.'
    ],
    svgIcon: '❌'
  },
  {
    id: 'vuelta_de_margarita',
    name: 'Margarita',
    category: 'especial',
    difficulty: 'Avanzado',
    use: 'Acortar una cuerda larga o aislar un tramo dañado sin cortarla.',
    steps: [
      '1. Dobla la cuerda haciendo 3 bucles superpuestos.',
      '2. Introduce los bucles exteriores sobre el central.',
      '3. Tensa ambos extremos de la cuerda para trabar el nudo.'
    ],
    svgIcon: '🌿'
  }
];

export default function NudosManualScreen({ navigation }: any) {
  const { isDarkMode, theme } = useTheme();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [selectedKnot, setSelectedKnot] = useState<KnotItem | null>(null);

  const filteredKnots = KNOTS_DATA.filter(k => {
    const matchesSearch = k.name.toLowerCase().includes(search.toLowerCase()) || k.use.toLowerCase().includes(search.toLowerCase());
    const matchesCat = selectedCategory === 'todos' || k.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <TouchableOpacity
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
            marginBottom: 10,
            gap: 6
          }}
          onPress={() => navigateBackOrHome(navigation, user?.role)}
        >
          <ArrowLeft size={16} color={theme.text} />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Volver</Text>
        </TouchableOpacity>
        <Text style={styles.offlineBadge}>⚡ 100% OFFLINE (DISPONIBLE SIN INTERNET NI MEGAS)</Text>
        <Text style={[styles.title, { color: theme.text }]}>Manual de Nudos y Cabuyería</Text>
        <Text style={[styles.subTitle, { color: theme.subText }]}>
          Guía de nudos y amarres scout para construcciones y campamentos.
        </Text>

        {/* BUSCADOR */}
        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Search size={16} color={isDarkMode ? '#71717a' : '#a1a1aa'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar nudo o amarre..."
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* CATEGORÍAS CHIPS */}
      <View style={styles.catRow}>
        {[
          { id: 'todos', label: 'Todos' },
          { id: 'basico', label: 'Básicos' },
          { id: 'amarre', label: 'Amarres' },
          { id: 'especial', label: 'Especiales' },
        ].map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.catChip,
              { backgroundColor: theme.cardBg, borderColor: theme.border },
              selectedCategory === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Text style={[
              styles.catChipText,
              { color: theme.subText },
              selectedCategory === cat.id && { color: 'white', fontWeight: 'bold' }
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* LISTADO DE NUDOS */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {filteredKnots.map(knot => (
          <TouchableOpacity
            key={knot.id}
            style={[styles.knotCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
            onPress={() => setSelectedKnot(knot)}
            activeOpacity={0.8}
          >
            <View style={styles.knotIconBox}>
              <Text style={{ fontSize: 26 }}>{knot.svgIcon}</Text>
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.knotName, { color: theme.text }]}>{knot.name}</Text>
                <View style={[styles.diffBadge, { backgroundColor: knot.difficulty === 'Fácil' ? '#dcfce7' : '#fef3c7' }]}>
                  <Text style={[styles.diffBadgeText, { color: knot.difficulty === 'Fácil' ? '#15803d' : '#b45309' }]}>
                    {knot.difficulty}
                  </Text>
                </View>
              </View>
              <Text style={[styles.knotUse, { color: theme.subText }]} numberOfLines={2}>{knot.use}</Text>
            </View>

            <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* MODAL DETALLE DEL NUDO */}
      {selectedKnot && (
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginRight: 10 }}>{selectedKnot.svgIcon}</Text>
                <View>
                  <Text style={[modalStyles.title, { color: theme.text }]}>{selectedKnot.name}</Text>
                  <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>{selectedKnot.difficulty}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedKnot(null)}>
                <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 16 }}>Cerrar</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 18, maxHeight: 400 }}>
              <Text style={[modalStyles.sectionLabel, { color: theme.subText }]}>USO Y APLICACIÓN EN CAMPAMENTO</Text>
              <Text style={[modalStyles.useText, { color: theme.text }]}>{selectedKnot.use}</Text>

              <Text style={[modalStyles.sectionLabel, { color: theme.subText, marginTop: 16 }]}>PASOS PASO A PASO</Text>
              {selectedKnot.steps.map((st, idx) => (
                <View key={idx} style={modalStyles.stepRow}>
                  <CheckCircle2 size={16} color={colors.primary} style={{ marginTop: 2, marginRight: 8 }} />
                  <Text style={[modalStyles.stepText, { color: theme.text }]}>{st}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  offlineBadge: { fontSize: 10, fontWeight: '900', color: '#16a34a', letterSpacing: 0.5, marginBottom: 2 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subTitle: { fontSize: 12, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, marginTop: 12, height: 42 },
  searchInput: { flex: 1, fontSize: 13 },
  catRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 12 },
  knotCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  knotIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(99, 102, 241, 0.1)', justifyContent: 'center', alignItems: 'center' },
  knotName: { fontSize: 14, fontWeight: 'bold' },
  knotUse: { fontSize: 12, marginTop: 2 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  diffBadgeText: { fontSize: 10, fontWeight: 'bold' }
});

const modalStyles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  useText: { fontSize: 13, lineHeight: 19 },
  stepRow: { flexDirection: 'row', marginBottom: 8 },
  stepText: { fontSize: 13, flex: 1, lineHeight: 19 }
});
