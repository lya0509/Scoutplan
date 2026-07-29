import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal
} from 'react-native';
import { Search, CheckSquare, Square, Lock, XCircle, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { activitiesCatalog } from '../data/activitiesCatalog';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';

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

export default function CatalogSelectorScreen({ route, navigation }: any) {
  const { stageId = 'expedicionario', reqId, reqType = 'basica', requiredCount = 12 } = route.params || {};
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState('TODAS');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [disabledIds, setDisabledIds] = useState<string[]>([]);
  const [stageStatus, setStageStatus] = useState<string>('En Progreso');
  
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const status = await dataService.getStageStatus(user.id, stageId);
      setStageStatus(status);

      const completedIds = await dataService.getCompletedCatalogActivityIds(user.id);
      
      const currentStageCompleted: string[] = [];
      const previousCompleted: string[] = [];

      for (const id of completedIds) {
        const isCurrent = await dataService.getRequirement(user.id, stageId, id);
        const activityItem = activitiesCatalog.find(a => a.id === id);

        const subStr = (activityItem?.subArea || '').toUpperCase();
        const superStr = (activityItem?.superArea || '').toUpperCase();
        const areaStr = (activityItem?.area || '').toUpperCase();

        const isBasic = subStr.includes('BÁSIC') || superStr.includes('BÁSIC') || areaStr.includes('BÁSIC');
        const isOptional = subStr.includes('OPCIONAL') || superStr.includes('OPCIONAL') || areaStr.includes('OPCIONAL');

        const matchesType = reqType === 'basica' ? isBasic : isOptional;

        if (isCurrent && matchesType) {
          currentStageCompleted.push(id);
        } else if (!isCurrent && matchesType) {
          previousCompleted.push(id);
        }
      }

      setSelectedIds(currentStageCompleted);
      setDisabledIds(previousCompleted);
    } catch (err) {
      console.error('Error cargando catálogo:', err);
    } finally {
      setLoading(false);
    }
  };

  const isReadOnly = stageStatus === 'En Revision' || stageStatus === 'Aprobada';

  const handleToggleActivity = async (id: string) => {
    if (isReadOnly || !user) return;

    if (disabledIds.includes(id)) {
      setModalMessage('Esta actividad ya fue completada en una etapa anterior y no se puede repetir.');
      return;
    }

    const isCurrentlySelected = selectedIds.includes(id);

    if (!isCurrentlySelected && selectedIds.length >= requiredCount) {
      setModalMessage(`Ya alcanzaste el máximo de ${requiredCount} actividades ${reqType === 'basica' ? 'básicas' : 'opcionales'} para esta etapa.`);
      return;
    }

    const newSelection = isCurrentlySelected
      ? selectedIds.filter(item => item !== id)
      : [...selectedIds, id];

    setSelectedIds(newSelection);

    // Guardar la actividad del catálogo
    await dataService.toggleRequirement(user.id, stageId, id, !isCurrentlySelected);

    // Si al hacer toggle se alcanza o desmarcan las actividades, actualizar automáticamente el requisito padre de la etapa si se especificó reqId
    if (reqId) {
      const willBeCompleted = newSelection.length >= requiredCount;
      await dataService.toggleRequirement(user.id, stageId, reqId, willBeCompleted);
    }
  };

  const filteredActivities = activitiesCatalog.filter(act => {
    // 1. Excluir resúmenes del Cuadro de Adelantos y nombres de insignias/etapas (act_1 a act_87)
    if (
      act.superArea === 'CUADRO DE ADELANTOS' || 
      ['PRECURSOR', 'EXPEDICIONARIO', 'DESCUBRIDOR', 'FUNDADOR'].includes(act.superArea)
    ) {
      return false;
    }

    // 2. Filtrar por el tipo actual (Básicas u Opcionales)
    const isBasicType = reqType === 'basica';
    const superStr = (act.superArea || '').toUpperCase();
    const subStr = (act.subArea || '').toUpperCase();
    const areaStr = (act.area || '').toUpperCase();

    const isMatchBasic = superStr === 'BÁSICAS' || subStr.includes('BÁSIC') || areaStr.includes('BÁSIC');
    const isMatchOptional = superStr === 'OPCIONALES' || subStr.includes('OPCIONAL') || areaStr.includes('OPCIONAL');

    if (isBasicType && !isMatchBasic) return false;
    if (!isBasicType && !isMatchOptional) return false;

    // 3. Filtrar por Categoría seleccionada (TODAS o subárea específica)
    const isAreaMatch = selectedArea === 'TODAS' || 
      act.subArea === selectedArea || 
      act.area === selectedArea;

    // 4. Búsqueda por texto libre
    const isSearchMatch = searchQuery.trim() === '' || 
      (act.text && act.text.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (act.subArea && act.subArea.toLowerCase().includes(searchQuery.toLowerCase()));

    return isAreaMatch && isSearchMatch;
  });

  const isClan = (user?.unit || 'clan').toLowerCase() === 'clan';

  const handleReturnToStage = () => {
    if (stageId) {
      navigation.navigate('StageDetail', { stageId });
    } else if (navigation?.canGoBack()) {
      navigation.goBack();
    }
  };

  if (!isClan) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(99, 102, 241, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 36 }}>🚀</Text>
        </View>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.text, textAlign: 'center' }}>
          Centro de Actividades Próximamente
        </Text>
        <Text style={{ fontSize: 14, color: theme.subText, textAlign: 'center', marginTop: 10, lineHeight: 22, maxWidth: 360 }}>
          El catálogo oficial de actividades para la unidad de <Text style={{ fontWeight: 'bold', color: colors.primary }}>{(user?.unit || 'tu unidad').toUpperCase()}</Text> se encuentra en desarrollo.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 24, backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14 }}
          onPress={handleReturnToStage}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>← Volver a la Etapa</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Cabecera */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginRight: 10 }}
            onPress={handleReturnToStage}
          >
            <ArrowLeft size={16} color={theme.text} style={{ marginRight: 4 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.text }}>Volver</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: theme.text, flex: 1 }]}>
            Catálogo de Actividades {reqType === 'basica' ? 'Básicas' : 'Opcionales'}
          </Text>
        </View>
        
        <View style={styles.counterBox}>
          <Text style={styles.counterText}>
            Seleccionadas: <Text style={styles.counterHighlight}>{selectedIds.length}</Text> / {requiredCount}
          </Text>
          {selectedIds.length >= requiredCount && (
            <Text style={styles.completedBadge}>✓ REQUISITO CUMPLIDO</Text>
          )}
        </View>

        {/* Buscador */}
        <View style={[styles.searchWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Search size={18} color={isDarkMode ? '#a1a1aa' : '#71717a'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar por palabra clave, nudos, fogata, comunidad..."
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filtros por Categorías / Subáreas exactas del Excel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
          {SUB_AREAS.map(area => (
            <TouchableOpacity
              key={area}
              style={[
                styles.chip,
                { backgroundColor: theme.inputBg, borderColor: theme.border },
                selectedArea === area && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedArea(area)}
            >
              <Text style={[
                styles.chipText,
                { color: theme.subText },
                selectedArea === area && { color: 'white', fontWeight: 'bold' }
              ]}>
                {area === 'TODAS' ? 'TODAS LAS CATEGORÍAS' : area}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de Actividades */}
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 20 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredActivities.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No se encontraron actividades</Text>
          </View>
        ) : (
          filteredActivities.map(act => {
            const isSelected = selectedIds.includes(act.id);
            const isDisabled = disabledIds.includes(act.id);

            return (
              <TouchableOpacity
                key={act.id}
                style={[
                  styles.card,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                  isSelected && (isDarkMode ? styles.cardSelectedDark : styles.cardSelected),
                  isDisabled && (isDarkMode ? styles.cardDisabledDark : styles.cardDisabled)
                ]}
                onPress={() => handleToggleActivity(act.id)}
                disabled={isDisabled || isReadOnly}
                activeOpacity={0.7}
              >
                <View style={styles.iconBox}>
                  {isDisabled ? (
                    <Lock size={22} color={isDarkMode ? '#52525b' : '#aaa'} />
                  ) : isSelected ? (
                    <CheckSquare size={22} color={colors.primary} />
                  ) : (
                    <Square size={22} color={isDarkMode ? '#71717a' : '#888'} />
                  )}
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.cardText,
                    { color: theme.text },
                    isSelected && styles.cardTextSelected,
                    isDisabled && { color: isDarkMode ? '#52525b' : '#aaa' }
                  ]}>
                    {act.text}
                  </Text>
                  
                  <View style={styles.tagRow}>
                    {act.subArea ? <Text style={[styles.tagText, { color: colors.primary, fontWeight: 'bold' }]}>{act.subArea}</Text> : null}
                    {act.area ? <Text style={[styles.tagAreaText, { color: theme.subText }]}>• {act.area}</Text> : null}
                    {isDisabled && (
                      <Text style={styles.disabledTagText}>Completada en etapa anterior</Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* BARRA INFERIOR: BOTÓN DE GUARDAR Y ACEPTAR REQUISITO */}
      {!isReadOnly && (
        <View style={[styles.bottomBar, { backgroundColor: isDarkMode ? '#121214' : 'white', borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.saveAcceptBtn,
              selectedIds.length < requiredCount && styles.saveAcceptBtnPartial
            ]}
            onPress={async () => {
              if (!user) return;
              const isCompleted = selectedIds.length >= requiredCount;
              if (reqId) {
                await dataService.toggleRequirement(user.id, stageId, reqId, isCompleted);
              }
              showAlert(
                isCompleted ? '¡Requisito Aceptado y Completado!' : 'Progreso Guardado',
                isCompleted
                  ? `¡Seleccionaste las ${requiredCount} actividades! Se marcó el requisito con un check (✓) en tu etapa.`
                  : `Has seleccionado ${selectedIds.length} de ${requiredCount} actividades. Recuerda completarlas todas.`
              );
              handleReturnToStage();
            }}
          >
            <CheckSquare size={20} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.saveAcceptBtnText}>
              {selectedIds.length >= requiredCount
                ? `ACEPTAR Y COMPLETAR REQUISITO (${selectedIds.length}/${requiredCount})`
                : `GUARDAR SELECCIÓN (${selectedIds.length}/${requiredCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de Aviso */}
      <Modal visible={modalMessage !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <XCircle size={40} color="#f59e0b" style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: theme.text }]}>Atención</Text>
            <Text style={[styles.modalDesc, { color: theme.subText }]}>{modalMessage}</Text>
            
            <TouchableOpacity style={styles.modalBtn} onPress={() => setModalMessage(null)}>
              <Text style={styles.modalBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  counterBox: { marginVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  counterText: { fontSize: 14, color: '#475569', fontWeight: '600' },
  counterHighlight: { color: colors.primary, fontWeight: 'bold', fontSize: 16 },
  completedBadge: { color: '#16a34a', fontWeight: 'bold', fontSize: 12 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, height: 40, marginTop: 4 },
  searchInput: { flex: 1, fontSize: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, marginRight: 8 },
  chipText: { fontSize: 12 },

  card: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, elevation: 2 },
  cardSelected: { backgroundColor: '#faf5ff', borderColor: '#d8b4fe' },
  cardSelectedDark: { backgroundColor: '#2e1065', borderColor: '#7c3aed' },
  cardDisabled: { backgroundColor: '#f1f5f9', opacity: 0.7 },
  cardDisabledDark: { backgroundColor: '#0d0d0e', opacity: 0.7 },
  iconBox: { marginRight: 14 },
  cardText: { fontSize: 14, fontWeight: 'bold', lineHeight: 20 },
  cardTextSelected: { color: colors.primary },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tagText: { fontSize: 11 },
  tagAreaText: { fontSize: 11 },
  disabledTagText: { fontSize: 11, color: '#ef4444', fontWeight: 'bold' },

  emptyCard: { padding: 30, alignItems: 'center', borderRadius: 14, borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 15, fontWeight: 'bold' },

  bottomBar: { padding: 16, borderTopWidth: 1 },
  saveAcceptBtn: { backgroundColor: '#16a34a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  saveAcceptBtnPartial: { backgroundColor: colors.primary },
  saveAcceptBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14, letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, borderRadius: 20, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 6 },
  modalDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  modalBtn: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  modalBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
