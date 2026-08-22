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

  const isJefe = user?.role === 'jefe_grupo';
  const isScouter = user?.role === 'scouter';
  const isScout = user?.role === 'scout';

  const isClanOrCaminanteYouth = isScout && (user?.unit === 'clan' || user?.unit === 'caminantes');
  const canCreate = isJefe || isScouter || isClanOrCaminanteYouth;

  // Filtrado por unidad: Scouts y Scouters inician en su unidad por defecto
  const userUnit = (user?.unit || 'clan').toLowerCase();
  const defaultUnit = isJefe ? 'todas' : userUnit;
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<string>(defaultUnit);
  const [previewPrograma, setPreviewPrograma] = useState<ProgramaScout | null>(null);

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

  // 1. Suscripción en Tiempo Real (WebSockets estilo WhatsApp)
  useEffect(() => {
    loadProgramas();

    const unsubscribe = programaService.subscribeToProgramas((freshList) => {
      setProgramas(freshList);
      setLoading(false);
    });

    // 2. Sincronización al cambiar de pestaña o volver a enfocar la ventana
    const handleFocus = () => {
      loadProgramas();
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) handleFocus();
      });
    }

    return () => {
      unsubscribe();
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
      }
    };
  }, []);

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
    const executeDelete = async () => {
      // Actualización optimista inmediata en pantalla
      setProgramas(prev => prev.filter(p => p.id !== id));
      try {
        await programaService.deletePrograma(id);
        showAlert('Eliminado', 'Programa eliminado correctamente.');
      } catch (e: any) {
        showAlert('Error', e?.message || 'No se pudo eliminar el programa.');
        loadProgramas();
      }
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`¿Estás seguro de eliminar el programa "${title}"?`)) {
        executeDelete();
      }
    } else {
      executeDelete();
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
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.location && p.location.toLowerCase().includes(q)) ||
      (p.activityType && p.activityType.toLowerCase().includes(q)) ||
      (p.creatorName && p.creatorName.toLowerCase().includes(q));

    let matchesUnit = false;
    if (isScout) {
      // Un joven Scout sólo ve los programas de su unidad o sinodales que incluyan su unidad
      matchesUnit = p.unit === userUnit || Boolean(p.isSinodal && p.selectedUnits && p.selectedUnits.includes(userUnit as any));
    } else {
      matchesUnit =
        selectedUnitFilter === 'todas' ||
        p.unit === selectedUnitFilter ||
        Boolean(p.isSinodal && p.selectedUnits && p.selectedUnits.includes(selectedUnitFilter as any));
    }

    return matchesSearch && matchesUnit;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.contentWrapper}>
        {/* HEADER SUPERIOR */}
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderBottomColor: theme.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: theme.text }]}>📅 Programas de Actividades</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e', marginRight: 5 }} />
              <Text style={{ fontSize: 11, color: theme.subText }}>
                {isJefe 
                  ? 'Jefatura de Grupo • En vivo'
                  : isScouter
                  ? `Dirigente Scout • Rama ${userUnit.toUpperCase()} • En vivo`
                  : `Rama ${userUnit.toUpperCase()} • Sincronizado en vivo`}
              </Text>
            </View>
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

          {/* Pestañas de Unidades (Visibles para Jefatura y Scouters) */}
          {!isScout && (
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
          )}
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
                <View style={[styles.programCard, { backgroundColor: theme.cardBg, borderColor: theme.border, borderLeftColor: unitBadgeColor, borderLeftWidth: 4 }]}>
                  {/* Cabecera de la tarjeta */}
                  <View style={styles.cardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.unitPill, { backgroundColor: unitBadgeColor + '20', borderColor: unitBadgeColor }]}>
                        <Text style={[styles.unitPillText, { color: unitBadgeColor }]}>
                          {item.unit.toUpperCase()}
                        </Text>
                      </View>
                      {item.isSinodal && (
                        <View style={[styles.unitPill, { backgroundColor: '#7c3aed20', borderColor: '#7c3aed' }]}>
                          <Text style={[styles.unitPillText, { color: '#7c3aed' }]}>SINODAL</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.dateBadge, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                      <Calendar size={12} color={theme.subText} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, color: theme.text, fontWeight: '600' }}>{item.date || 'Sin fecha'}</Text>
                    </View>
                  </View>

                  {/* Título y Lugar */}
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    <MapPin size={13} color={primaryColor} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: theme.text, marginRight: 14 }}>{item.location || 'Lugar por definir'}</Text>
                    <BookOpen size={13} color={primaryColor} style={{ marginRight: 4 }} />
                    <Text style={{ fontSize: 12, color: theme.subText }}>{item.activityType || 'Actividad Scout'}</Text>
                  </View>

                  {/* Indicadores de resumen */}
                  <View style={styles.statsRow}>
                    <View style={[styles.statChip, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                      <Clock size={11} color={primaryColor} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, color: theme.text, fontWeight: '500' }}>
                        {item.schedule ? item.schedule.length : 0} Actividades
                      </Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                      <Sparkles size={11} color="#f59e0b" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, color: theme.text, fontWeight: '500' }}>
                        {item.selectedSDGs ? item.selectedSDGs.length : 0} ODS
                      </Text>
                    </View>
                    <View style={[styles.statChip, { backgroundColor: isDarkMode ? '#27272a' : '#f0fdf4' }]}>
                      <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: 'bold' }}>
                        ✓ Áreas de Crecimiento
                      </Text>
                    </View>
                  </View>

                  {/* Barra de acciones de la tarjeta */}
                  <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: primaryColor }]}
                      onPress={() => setPreviewPrograma(item)}
                    >
                      <Eye size={14} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={[styles.actionBtnText, { color: '#ffffff' }]}>Ver PDF</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#2563eb18', borderWidth: 1, borderColor: '#2563eb40' }]}
                      onPress={() => handleDownloadWord(item)}
                    >
                      <Download size={14} color="#2563eb" style={{ marginRight: 6 }} />
                      <Text style={[styles.actionBtnText, { color: '#2563eb' }]}>Word (.docx)</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    {canCreate && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.iconActionBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                          onPress={() => navigation.navigate('ProgramaScoutEditor', { programa: item })}
                        >
                          <Edit2 size={15} color={theme.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.iconActionBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                          onPress={() => handleDuplicate(item)}
                        >
                          <Copy size={15} color={theme.text} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.iconActionBtn, { backgroundColor: '#fee2e2' }]}
                          onPress={() => handleDelete(item.id, item.title)}
                        >
                          <Trash2 size={15} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

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
  contentWrapper: {
    width: '100%',
    maxWidth: 960,
    alignSelf: 'center',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  createBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 13 },
  unitTabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  unitTabChipText: { fontSize: 12 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
  },
  programCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  unitPillText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnText: { fontSize: 12, fontWeight: 'bold' },
  iconActionBtn: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
