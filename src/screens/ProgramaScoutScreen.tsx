import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Plus,
  Search,
  Calendar,
  MapPin,
  Clock,
  Eye,
  Edit2,
  Copy,
  Trash2,
  Download,
  FileText,
  Sparkles,
  BookOpen,
  Filter
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ProgramaScout } from '../types/programa';
import { programaService } from '../lib/programaService';
import { docxProgramaGenerator } from '../lib/docxProgramaGenerator';
import { ProgramaPdfPreviewModal } from '../components/ProgramaPdfPreviewModal';
import { showAlert } from '../utils/alert';

export default function ProgramaScoutScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme, primaryColor } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [programas, setProgramas] = useState<ProgramaScout[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>('todas');
  const [previewPrograma, setPreviewPrograma] = useState<ProgramaScout | null>(null);

  // Permisos: Manada y Tropa sólo Scouter/Jefe. Caminantes y Clan: Scouter, Jefe y Jóvenes.
  const isLeader = user?.role === 'scouter' || user?.role === 'jefe_grupo';
  const isClanOrCaminanteYouth =
    user?.role === 'scout' &&
    (user?.unit === 'clan' || user?.unit === 'caminantes');

  const canCreate = isLeader || isClanOrCaminanteYouth;

  const loadProgramas = async () => {
    try {
      const list = await programaService.getProgramas();
      setProgramas(list);
    } catch (e) {
      console.warn('Error cargando lista de programas:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProgramas();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadProgramas();
  };

  const handleDuplicate = async (programa: ProgramaScout) => {
    try {
      await programaService.duplicatePrograma(programa.id);
      showAlert('Programa Duplicado', `Se ha creado una copia de "${programa.title}".`);
      loadProgramas();
    } catch (e: any) {
      showAlert('Error', e?.message || 'No se pudo duplicar el programa.');
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`¿Estás seguro de eliminar el programa "${title}"?`)) {
        programaService.deletePrograma(id).then(() => {
          showAlert('Eliminado', 'Programa eliminado correctamente.');
          loadProgramas();
        });
      }
    } else {
      programaService.deletePrograma(id).then(() => {
        showAlert('Eliminado', 'Programa eliminado correctamente.');
        loadProgramas();
      });
    }
  };

  const handleDownloadWord = async (programa: ProgramaScout) => {
    try {
      await docxProgramaGenerator.generateAndDownload(programa);
      showAlert('Descarga Exitosa', 'El archivo Word se ha descargado correctamente.');
    } catch (e: any) {
      showAlert('Error', e?.message || 'No se pudo generar el archivo Word.');
    }
  };

  // Filtrar programas
  const filteredProgramas = programas.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.activityType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.creatorName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesUnit = selectedUnitFilter === 'todas' || p.unit === selectedUnitFilter;

    return matchesSearch && matchesUnit;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* HEADER SUPERIOR */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderBottomColor: theme.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>📅 Programas de Actividades</Text>
          <Text style={{ fontSize: 11, color: theme.subText }}>
            Formulación y cronograma oficial ASV
          </Text>
        </View>

        {canCreate && (
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: primaryColor }]}
            onPress={() => navigation.navigate('ProgramaScoutEditor')}
          >
            <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.createBtnText}>Nuevo Programa</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <View style={[styles.filterBar, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderBottomColor: theme.border }]}>
        <View style={[styles.searchWrapper, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
          <Search size={16} color={theme.subText} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar por título, lugar, actividad o autor..."
            placeholderTextColor={theme.subText}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Pestañas de Unidades */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {[
            { id: 'todas', label: 'Todas las Ramas' },
            { id: 'manada', label: '🟡 Manada' },
            { id: 'tropa', label: '🟢 Tropa' },
            { id: 'caminantes', label: '🔵 Caminantes' },
            { id: 'clan', label: '🔴 Clan' }
          ].map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.unitTabChip,
                selectedUnitFilter === tab.id
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }
              ]}
              onPress={() => setSelectedUnitFilter(tab.id)}
            >
              <Text
                style={[
                  styles.unitTabChipText,
                  selectedUnitFilter === tab.id ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* LISTA DE PROGRAMAS */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={{ marginTop: 10, color: theme.subText }}>Cargando programas oficiales...</Text>
        </View>
      ) : filteredProgramas.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FileText size={48} color={theme.subText} style={{ marginBottom: 12, opacity: 0.6 }} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No hay programas registrados</Text>
          <Text style={[styles.emptySubtitle, { color: theme.subText }]}>
            {canCreate
              ? 'Crea tu primer programa de actividades scout con la plantilla oficial de la ASV.'
              : 'Los dirigentes de tu unidad publicarán aquí los programas de las próximas actividades.'}
          </Text>
          {canCreate && (
            <TouchableOpacity
              style={[styles.emptyCreateBtn, { backgroundColor: primaryColor }]}
              onPress={() => navigation.navigate('ProgramaScoutEditor')}
            >
              <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Crear Programa Ahora</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredProgramas}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[primaryColor]} />}
          renderItem={({ item }) => {
            const unitBadgeColor =
              item.unit === 'manada'
                ? '#f59e0b'
                : item.unit === 'tropa'
                ? '#15803d'
                : item.unit === 'caminantes'
                ? '#2563eb'
                : '#dc2626';

            return (
              <View style={[styles.programCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                {/* Cabecera de la tarjeta */}
                <View style={styles.cardHeader}>
                  <View style={[styles.unitPill, { backgroundColor: unitBadgeColor + '20', borderColor: unitBadgeColor }]}>
                    <Text style={[styles.unitPillText, { color: unitBadgeColor }]}>
                      {item.unit.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.subText }}>📅 {item.date || 'Sin fecha'}</Text>
                </View>

                {/* Título y Lugar */}
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                <View style={styles.metaRow}>
                  <MapPin size={13} color={primaryColor} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, color: theme.text, marginRight: 12 }}>{item.location || 'Sin lugar'}</Text>
                  <BookOpen size={13} color={primaryColor} style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 11, color: theme.subText }}>{item.activityType || 'Actividad'}</Text>
                </View>

                {/* Indicadores de resumen */}
                <View style={styles.statsRow}>
                  <View style={[styles.statChip, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                    <Text style={{ fontSize: 10, color: theme.text }}>
                      ⏱️ {item.schedule ? item.schedule.length : 0} Actividades
                    </Text>
                  </View>
                  <View style={[styles.statChip, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                    <Text style={{ fontSize: 10, color: theme.text }}>
                      🌍 {item.selectedSDGs ? item.selectedSDGs.length : 0} ODS
                    </Text>
                  </View>
                  <View style={[styles.statChip, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                    <Text style={{ fontSize: 10, color: '#15803d', fontWeight: 'bold' }}>
                      ✓ 6 Áreas
                    </Text>
                  </View>
                </View>

                {/* Barra de acciones de la tarjeta */}
                <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: primaryColor + '15' }]}
                    onPress={() => setPreviewPrograma(item)}
                  >
                    <Eye size={14} color={primaryColor} style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: primaryColor }]}>Ver PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#2563eb15' }]}
                    onPress={() => handleDownloadWord(item)}
                  >
                    <Download size={14} color="#2563eb" style={{ marginRight: 4 }} />
                    <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>Word (.docx)</Text>
                  </TouchableOpacity>

                  {canCreate && (
                    <>
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                        onPress={() => navigation.navigate('ProgramaScoutEditor', { programa: item })}
                      >
                        <Edit2 size={14} color={theme.text} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                        onPress={() => handleDuplicate(item)}
                      >
                        <Copy size={14} color={theme.text} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: '#fee2e2' }]}
                        onPress={() => handleDelete(item.id, item.title)}
                      >
                        <Trash2 size={14} color="#ef4444" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      {/* MODAL DE VISTA PREVIA E IMPRESIÓN OFICIAL */}
      <ProgramaPdfPreviewModal
        visible={!!previewPrograma}
        programa={previewPrograma}
        onClose={() => setPreviewPrograma(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  searchInput: { flex: 1, fontSize: 12 },
  unitTabChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
  },
  unitTabChipText: { fontSize: 11 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: { fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  programCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  unitPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  unitPillText: { fontSize: 9, fontWeight: 'bold' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  statChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 6,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionBtnText: { fontSize: 11, fontWeight: 'bold' },
  iconActionBtn: {
    padding: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
