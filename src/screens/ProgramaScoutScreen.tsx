import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Platform,
  Modal
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
  Filter,
  ArrowLeft,
  X,
  CheckCircle,
  Lock
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { ProgramaScout } from '../types/programa';
import { programaService } from '../lib/programaService';
import { dataService } from '../lib/dataService';
import { docxProgramaGenerator } from '../lib/docxProgramaGenerator';
import { ProgramaPdfPreviewModal } from '../components/ProgramaPdfPreviewModal';
import { showAlert } from '../utils/alert';
import { navigateBackOrHome } from '../utils/navigationHelper';

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
  const [statusFilter, setStatusFilter] = useState<'proximos' | 'realizados' | 'todos'>('proximos');
  const [previewPrograma, setPreviewPrograma] = useState<ProgramaScout | null>(null);

  // Estados y navegación para la creación interactiva de programa (Trimestre vs Extraordinaria)
  const [showNewProgramChoiceModal, setShowNewProgramChoiceModal] = useState(false);
  const [choiceStep, setChoiceStep] = useState<'choice' | 'select_activity'>('choice');
  const [quarterlyActivities, setQuarterlyActivities] = useState<any[]>([]);
  const [loadingQuarterlyActivities, setLoadingQuarterlyActivities] = useState(false);
  const [choiceQuarter, setChoiceQuarter] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>(() => {
    const m = new Date().getMonth() + 1;
    return ('Q' + Math.ceil(m / 3)) as any;
  });

  useModalBackHandler(showNewProgramChoiceModal, () => {
    if (choiceStep === 'select_activity') {
      setChoiceStep('choice');
    } else {
      setShowNewProgramChoiceModal(false);
    }
  });

  const fetchQuarterlyActivities = async (q: string) => {
    setLoadingQuarterlyActivities(true);
    try {
      const cy = new Date().getFullYear();
      const targetUnit = selectedUnitFilter !== 'todas' ? selectedUnitFilter : userUnit;
      const plan = await dataService.getUnitSharedQuarterlyPlan(user?.group_name || '', targetUnit, q, cy);
      if (plan && plan.monthly_activities && Array.isArray(plan.monthly_activities)) {
        setQuarterlyActivities(plan.monthly_activities);
      } else {
        setQuarterlyActivities([]);
      }
    } catch (e) {
      console.warn('Error fetching quarterly activities:', e);
      setQuarterlyActivities([]);
    } finally {
      setLoadingQuarterlyActivities(false);
    }
  };

  const isActivityAlreadyCreated = (act: any, targetUnit: string) => {
    const actTitle = (act.activity || act.title || '').trim().toLowerCase();
    if (!actTitle) return false;

    return programas.some(p => {
      if (p.planActivityId && p.planActivityId === act.id) return true;
      if (p.importantNotes && p.importantNotes.includes(`[PLAN_ACT_ID:${act.id}]`)) return true;
      const pTitle = (p.title || '').trim().toLowerCase();
      const sameUnit = p.unit?.toLowerCase() === targetUnit.toLowerCase();
      if (sameUnit && (pTitle === actTitle || pTitle.includes(actTitle) || actTitle.includes(pTitle))) {
        return true;
      }
      return false;
    });
  };

  const handleOpenNewProgramModal = () => {
    setChoiceStep('choice');
    setShowNewProgramChoiceModal(true);
  };

  const handleChooseQuarterly = () => {
    setChoiceStep('select_activity');
    fetchQuarterlyActivities(choiceQuarter);
  };

  const handleSelectQuarter = (q: 'Q1' | 'Q2' | 'Q3' | 'Q4') => {
    setChoiceQuarter(q);
    fetchQuarterlyActivities(q);
  };

  const handleChooseExtraordinary = () => {
    setShowNewProgramChoiceModal(false);
    const targetUnit = selectedUnitFilter !== 'todas' ? selectedUnitFilter : userUnit;
    setTimeout(() => {
      navigation.navigate('ProgramaScoutEditor', {
        isExtraordinary: true,
        initialActivityType: 'Otros / Extraordinaria',
        initialUnit: targetUnit
      });
    }, 60);
  };

  const handleSelectQuarterlyActivity = (act: any) => {
    setShowNewProgramChoiceModal(false);
    const targetUnit = selectedUnitFilter !== 'todas' ? selectedUnitFilter : userUnit;
    const monthMap: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04',
      mayo: '05', junio: '06', julio: '07', agosto: '08',
      septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };
    const cy = new Date().getFullYear();
    const mNum = monthMap[act.month?.toLowerCase()] || '01';
    const dayStr = String(act.day || '15').padStart(2, '0');
    const targetDate = `${cy}-${mNum}-${dayStr}`;

    setTimeout(() => {
      navigation.navigate('ProgramaScoutEditor', {
        initialTitle: act.activity || act.title,
        initialDate: targetDate,
        initialPlace: act.place || 'Sede',
        initialUnit: targetUnit,
        initialQuarter: choiceQuarter,
        initialYear: cy,
        planActivityId: act.id,
        isExtraordinary: false
      });
    }, 60);
  };

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

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

  const unitFilteredProgramas = useMemo(() => {
    return programas.filter((p: ProgramaScout) => {
      // Determinar si el usuario actual es el autor de este programa
      const isAuthor = Boolean(
        (user?.id && p.createdBy === user.id) ||
        (user?.name && p.creatorName && p.creatorName.trim().toLowerCase() === user.name.trim().toLowerCase()) ||
        ((user as any)?.full_name && p.creatorName && p.creatorName.trim().toLowerCase() === (user as any).full_name.trim().toLowerCase())
      );

      // Si es un boceto, validar que el usuario tenga permiso de previsualización
      if (p.status === 'draft') {
        const isScouterOrLeader =
          isScouter ||
          isJefe ||
          (user?.role as string) === 'jefatura' ||
          user?.role === 'admin' ||
          user?.role === 'comisionado_distrital' ||
          user?.role === 'comisionado_regional' ||
          user?.role === 'nacional';

        const hasPreviewRole = Boolean(
          p.previewRoles && (
            p.previewRoles.includes(user?.role || '') ||
            p.previewRoles.includes('all') ||
            (isScout && (
              p.previewRoles.includes('scout') ||
              p.previewRoles.includes('guias') ||
              p.previewRoles.includes('jovenes') ||
              p.previewRoles.includes('clan') ||
              p.previewRoles.includes('caminantes')
            ))
          )
        );

        const canPreview = isAuthor || isScouterOrLeader || hasPreviewRole;

        if (!canPreview) return false;
      }

      if (isScout) {
        return isAuthor || p.unit === userUnit || Boolean(p.isSinodal && p.selectedUnits && p.selectedUnits.includes(userUnit as any));
      }
      return selectedUnitFilter === 'todas' ||
        p.unit === selectedUnitFilter ||
        Boolean(p.isSinodal && p.selectedUnits && p.selectedUnits.includes(selectedUnitFilter as any));
    });
  }, [programas, isScout, isScouter, isJefe, userUnit, selectedUnitFilter, user]);

  const countProximos = useMemo(() => {
    return unitFilteredProgramas.filter((p: ProgramaScout) => !p.date || p.date >= todayStr).length;
  }, [unitFilteredProgramas, todayStr]);

  const countRealizados = useMemo(() => {
    return unitFilteredProgramas.filter((p: ProgramaScout) => Boolean(p.date && p.date < todayStr)).length;
  }, [unitFilteredProgramas, todayStr]);

  // Filtrar programas por búsqueda y estado (próximos / realizados / todos)
  const filteredProgramas = useMemo(() => {
    return unitFilteredProgramas.filter((p: ProgramaScout) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.activityType && p.activityType.toLowerCase().includes(q)) ||
        (p.creatorName && p.creatorName.toLowerCase().includes(q));

      const isPast = p.date ? p.date < todayStr : false;
      const matchesStatus =
        statusFilter === 'todos'
          ? true
          : statusFilter === 'proximos'
          ? !isPast
          : isPast;

      return matchesSearch && matchesStatus;
    });
  }, [unitFilteredProgramas, searchQuery, statusFilter, todayStr]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.contentWrapper}>
        {/* HEADER SUPERIOR */}
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderBottomColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 5,
                paddingHorizontal: 10,
                borderRadius: 8,
                backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                marginRight: 10,
                gap: 4
              }}
              onPress={() => navigateBackOrHome(navigation, user?.role)}
            >
              <ArrowLeft size={16} color={theme.text} />
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Volver</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Programas de Actividades</Text>
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
          </View>

          {canCreate && (
            <TouchableOpacity
              style={[styles.createBtn, { backgroundColor: primaryColor }]}
              onPress={handleOpenNewProgramModal}
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

          {/* Pestañas de Estado (Próximos / Realizados / Todos) */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
            <TouchableOpacity
              style={[
                styles.unitTabChip,
                statusFilter === 'proximos'
                  ? { backgroundColor: '#16a34a', borderColor: '#16a34a' }
                  : { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }
              ]}
              onPress={() => setStatusFilter('proximos')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitTabChipText,
                  statusFilter === 'proximos' ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }
                ]}
              >
                ⚡ Próximos ({countProximos})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.unitTabChip,
                statusFilter === 'realizados'
                  ? { backgroundColor: '#64748b', borderColor: '#64748b' }
                  : { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }
              ]}
              onPress={() => setStatusFilter('realizados')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitTabChipText,
                  statusFilter === 'realizados' ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }
                ]}
              >
                ✅ Realizados ({countRealizados})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.unitTabChip,
                statusFilter === 'todos'
                  ? { backgroundColor: primaryColor, borderColor: primaryColor }
                  : { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }
              ]}
              onPress={() => setStatusFilter('todos')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.unitTabChipText,
                  statusFilter === 'todos' ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }
                ]}
              >
                📂 Todos ({unitFilteredProgramas.length})
              </Text>
            </TouchableOpacity>
          </View>
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
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              {statusFilter === 'proximos'
                ? 'No hay actividades próximas'
                : statusFilter === 'realizados'
                ? 'No hay actividades realizadas archivadas'
                : 'No hay programas registrados'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.subText }]}>
              {statusFilter === 'proximos'
                ? 'Todas tus actividades programadas ya han pasado su fecha de realización o no has creado un nuevo programa.'
                : statusFilter === 'realizados'
                ? 'Las actividades cuya fecha ya haya pasado se mostrarán automáticamente en este apartado histórico.'
                : canCreate
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

              const isPastAct = item.date ? item.date < todayStr : false;

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
                      {item.status === 'draft' && (
                        <View style={[styles.unitPill, { backgroundColor: isDarkMode ? '#451a03' : '#fef3c7', borderColor: '#f59e0b', flexDirection: 'row', alignItems: 'center', gap: 3 }]}>
                          <Lock size={10} color="#d97706" />
                          <Text style={[styles.unitPillText, { color: '#d97706', fontSize: 10, fontWeight: 'bold' }]}>BOCETO</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.dateBadge, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                        <Calendar size={12} color={theme.subText} style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, color: theme.text, fontWeight: '600' }}>{item.date || 'Sin fecha'}</Text>
                      </View>
                      <View
                        style={[
                          styles.unitPill,
                          isPastAct
                            ? { backgroundColor: isDarkMode ? '#334155' : '#e2e8f0', borderColor: isDarkMode ? '#475569' : '#cbd5e1' }
                            : { backgroundColor: isDarkMode ? '#064e3b' : '#dcfce7', borderColor: '#16a34a' }
                        ]}
                      >
                        <Text
                          style={[
                            styles.unitPillText,
                            { color: isPastAct ? (isDarkMode ? '#cbd5e1' : '#475569') : (isDarkMode ? '#86efac' : '#15803d'), fontSize: 10 }
                          ]}
                        >
                          {isPastAct ? '✓ Realizada' : '⚡ Próxima'}
                        </Text>
                      </View>
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

                    {(canCreate || (Boolean(user?.id) && item.createdBy === user?.id) || (Boolean(user?.name) && Boolean(item.creatorName) && item.creatorName.trim().toLowerCase() === user?.name?.trim().toLowerCase())) && (
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

      {/* MODAL INTERACTIVO: NUEVO PROGRAMA (TRIMESTRE VS EXTRAORDINARIA) */}
      <Modal
        visible={showNewProgramChoiceModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (choiceStep === 'select_activity') {
            setChoiceStep('choice');
          } else {
            setShowNewProgramChoiceModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.choiceModalContent, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
            {/* Cabecera del modal */}
            <View style={[styles.modalHeaderRow, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {choiceStep === 'choice' ? 'Nuevo Programa de Actividades' : 'Seleccionar del Plan Trimestral'}
                </Text>
                <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                  {choiceStep === 'choice'
                    ? '¿Deseas elaborar una actividad que ya esté en el trimestre?'
                    : `Rama: ${(selectedUnitFilter !== 'todas' ? selectedUnitFilter : userUnit).toUpperCase()} • Trimestre: ${choiceQuarter}`}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (choiceStep === 'select_activity') {
                    setChoiceStep('choice');
                  } else {
                    setShowNewProgramChoiceModal(false);
                  }
                }}
                style={{ padding: 6 }}
              >
                <X size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* PASO 1: ELECCIÓN (Sí / No) */}
            {choiceStep === 'choice' ? (
              <View style={{ padding: 18, gap: 14 }}>
                {/* Opción A: Actividad del Plan Trimestral */}
                <TouchableOpacity
                  style={[
                    styles.choiceCard,
                    {
                      backgroundColor: isDarkMode ? '#1e293b' : '#f0fdf4',
                      borderColor: '#16a34a'
                    }
                  ]}
                  onPress={handleChooseQuarterly}
                  activeOpacity={0.8}
                >
                  <View style={[styles.choiceIconBadge, { backgroundColor: '#16a34a' }]}>
                    <Calendar size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={[styles.choiceCardTitle, { color: isDarkMode ? '#86efac' : '#15803d' }]}>
                        Sí, actividad del Plan Trimestral
                      </Text>
                      <View style={{ backgroundColor: '#16a34a', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Recomendado</Text>
                      </View>
                    </View>
                    <Text style={[styles.choiceCardDesc, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
                      Selecciona una actividad planificada del trimestre de tu unidad. Se precargarán título, fecha, lugar y vínculos automáticamente.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Opción B: Extraordinaria / Otros */}
                <TouchableOpacity
                  style={[
                    styles.choiceCard,
                    {
                      backgroundColor: isDarkMode ? '#27272a' : '#faf5ff',
                      borderColor: '#9333ea'
                    }
                  ]}
                  onPress={handleChooseExtraordinary}
                  activeOpacity={0.8}
                >
                  <View style={[styles.choiceIconBadge, { backgroundColor: '#9333ea' }]}>
                    <Sparkles size={22} color="#ffffff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.choiceCardTitle, { color: isDarkMode ? '#d8b4fe' : '#7e22ce' }]}>
                      No, actividad Extraordinaria / Otros
                    </Text>
                    <Text style={[styles.choiceCardDesc, { color: isDarkMode ? '#cbd5e1' : '#475569' }]}>
                      Campamentos invitados, salidas imprevistas, eventos distritales o actividades extraordinarias no programadas en el trimestre.
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : (
              /* PASO 2: SELECTOR DE ACTIVIDAD DEL TRIMESTRE */
              <View style={{ padding: 16 }}>
                {/* Selector de Trimestre (Q1, Q2, Q3, Q4) */}
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
                    const isSelected = choiceQuarter === q;
                    const labels: Record<string, string> = {
                      Q1: 'T1 (Ene-Mar)',
                      Q2: 'T2 (Abr-Jun)',
                      Q3: 'T3 (Jul-Sep)',
                      Q4: 'T4 (Oct-Dic)'
                    };
                    return (
                      <TouchableOpacity
                        key={q}
                        style={[
                          styles.quarterChoiceBtn,
                          isSelected
                            ? { backgroundColor: primaryColor, borderColor: primaryColor }
                            : { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }
                        ]}
                        onPress={() => handleSelectQuarter(q)}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: 'bold',
                            color: isSelected ? '#ffffff' : theme.text
                          }}
                        >
                          {labels[q]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Lista de actividades filtrando las ya elaboradas */}
                {loadingQuarterlyActivities ? (
                  <View style={{ paddingVertical: 36, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={primaryColor} />
                    <Text style={{ marginTop: 10, color: theme.subText, fontSize: 12 }}>
                      Consultando actividades del trimestre...
                    </Text>
                  </View>
                ) : (() => {
                  const targetUnit = selectedUnitFilter !== 'todas' ? selectedUnitFilter : userUnit;
                  const availableActivities = quarterlyActivities.filter(act => !isActivityAlreadyCreated(act, targetUnit));
                  const completedCount = quarterlyActivities.length - availableActivities.length;

                  if (availableActivities.length === 0) {
                    return (
                      <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                        {quarterlyActivities.length === 0 ? (
                          <>
                            <Calendar size={36} color={theme.subText} style={{ marginBottom: 10 }} />
                            <Text style={{ fontWeight: 'bold', fontSize: 14, color: theme.text, textAlign: 'center' }}>
                              No hay actividades en el Plan Trimestral ({choiceQuarter})
                            </Text>
                            <Text style={{ color: theme.subText, fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
                              Aún no se han formulado actividades para este trimestre o están pendientes de sincronizar.
                            </Text>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={40} color="#16a34a" style={{ marginBottom: 10 }} />
                            <Text style={{ fontWeight: 'bold', fontSize: 14, color: theme.text, textAlign: 'center' }}>
                              ¡Todas las actividades ({quarterlyActivities.length}) ya fueron elaboradas!
                            </Text>
                            <Text style={{ color: theme.subText, fontSize: 12, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }}>
                              Cada una de las actividades del cronograma ya cuenta con su programa de actividades individual elaborado.
                            </Text>
                          </>
                        )}

                        <TouchableOpacity
                          style={[styles.createBtn, { backgroundColor: '#9333ea', marginTop: 18 }]}
                          onPress={handleChooseExtraordinary}
                        >
                          <Sparkles size={16} color="#ffffff" style={{ marginRight: 6 }} />
                          <Text style={styles.createBtnText}>Crear Actividad Extraordinaria</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  }

                  return (
                    <View>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.subText, marginBottom: 8 }}>
                        ACTIVIDADES PENDIENTES POR ELABORAR ({availableActivities.length}):
                      </Text>
                      <ScrollView style={{ maxHeight: 290 }} showsVerticalScrollIndicator={false}>
                        {availableActivities.map(act => (
                          <TouchableOpacity
                            key={act.id}
                            style={[
                              styles.quarterlyActCard,
                              {
                                backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                                borderColor: theme.border
                              }
                            ]}
                            onPress={() => handleSelectQuarterlyActivity(act)}
                            activeOpacity={0.7}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <View style={[styles.dayBadgeMini, { backgroundColor: primaryColor + '20' }]}>
                                  <Text style={{ fontSize: 10, fontWeight: 'bold', color: primaryColor }}>
                                    {act.month ? `${act.month.toUpperCase()} ` : ''}Día {act.day || '-'}
                                  </Text>
                                </View>
                                {act.isModified && (
                                  <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 }}>
                                    <Text style={{ fontSize: 9, fontWeight: 'bold', color: '#b45309' }}>Modificada</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={[styles.quarterlyActTitle, { color: theme.text }]}>
                                {act.activity || act.title || 'Actividad sin nombre'}
                              </Text>
                              <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                                📍 {act.place || 'Sede'} • 👤 {act.responsible || 'Scouters'}
                              </Text>
                            </View>
                            <View style={[styles.selectActBtn, { backgroundColor: primaryColor }]}>
                              <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 11 }}>Elaborar →</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>

                      {completedCount > 0 && (
                        <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <CheckCircle size={13} color="#16a34a" />
                          <Text style={{ fontSize: 11, color: '#16a34a', fontWeight: '600' }}>
                            {completedCount} actividad(es) ya elaboradas (ocultas para no duplicar)
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })()}

                {/* Botón Volver a Elección */}
                <TouchableOpacity
                  style={[styles.backToChoiceBtn, { borderTopColor: theme.border }]}
                  onPress={() => setChoiceStep('choice')}
                >
                  <ArrowLeft size={14} color={theme.subText} style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: theme.subText, fontWeight: 'bold' }}>
                    Volver a opciones
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  choiceModalContent: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  choiceIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  choiceCardDesc: {
    fontSize: 11,
    lineHeight: 16,
  },
  quarterChoiceBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  quarterlyActCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  dayBadgeMini: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  quarterlyActTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  selectActBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backToChoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 14,
    marginTop: 10,
    borderTopWidth: 1,
  },
});
