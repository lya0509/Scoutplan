import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform,
  Alert
} from 'react-native';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Calendar,
  MapPin,
  Users,
  Target,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Eye,
  Download,
  Lock
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ProgramaScout, ActivityScheduleItem } from '../types/programa';
import { SDG_LIST, SDGItem } from '../data/sdgData';
import {
  GROWTH_AREAS,
  GrowthAreaKey,
  getIndicatorsForAreaAndUnit,
  getStagesForUnit,
  getStagesForUnits
} from '../data/achievementIndicatorsData';
import { REGISTRATION_BADGES } from '../data/registrationBadgesData';
import { programaService } from '../lib/programaService';
import { dataService } from '../lib/dataService';
import { autoSaveService } from '../services/autoSaveService';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { ProgramaPdfPreviewModal } from '../components/ProgramaPdfPreviewModal';
import { showAlert } from '../utils/alert';

export default function ProgramaScoutEditorScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme, primaryColor } = useTheme();

  const existingPrograma: ProgramaScout | undefined = route.params?.programa;
  const userUnit = (user?.unit || existingPrograma?.unit || 'clan').toLowerCase() as 'manada' | 'tropa' | 'caminantes' | 'clan';

  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTrimestreModal, setShowTrimestreModal] = useState(false);
  const [trimestreActivities, setTrimestreActivities] = useState<any[]>([]);
  const [loadingTrimestre, setLoadingTrimestre] = useState(false);

  // Estados principales del programa
  const [id, setId] = useState(existingPrograma?.id || `prog_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
  const [title, setTitle] = useState(existingPrograma?.title || '');
  const [date, setDate] = useState(existingPrograma?.date || new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState(existingPrograma?.location || '');
  const [activityType, setActivityType] = useState(existingPrograma?.activityType || '');
  const [unit] = useState<'manada' | 'tropa' | 'caminantes' | 'clan'>(userUnit);
  const [isSinodal, setIsSinodal] = useState<boolean>(existingPrograma?.isSinodal || false);
  const [selectedUnits, setSelectedUnits] = useState<('manada' | 'tropa' | 'caminantes' | 'clan')[]>(
    existingPrograma?.selectedUnits && existingPrograma.selectedUnits.length > 0
      ? existingPrograma.selectedUnits
      : [userUnit]
  );
  const [participantProjection, setParticipantProjection] = useState(existingPrograma?.participantProjection || '4 Jóvenes');
  const [generalObjective, setGeneralObjective] = useState(existingPrograma?.generalObjective || '');
  const [specificObjectives, setSpecificObjectives] = useState<string[]>(existingPrograma?.specificObjectives || ['']);
  const [specificMetas, setSpecificMetas] = useState<string[]>(existingPrograma?.specificMetas || ['']);
  const [selectedSDGs, setSelectedSDGs] = useState<number[]>(existingPrograma?.selectedSDGs || []);
  const [importantNotes, setImportantNotes] = useState(existingPrograma?.importantNotes || '');
  const [registrationBadgeId] = useState('reg_2026');

  // Estado para el selector interactivo de Fecha (Calendario)
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(showPreviewModal, () => setShowPreviewModal(false));
  useModalBackHandler(showTrimestreModal, () => setShowTrimestreModal(false));
  useModalBackHandler(showDatePickerModal, () => setShowDatePickerModal(false));

  const initialDateObj = date ? new Date(date + 'T12:00:00') : new Date();
  const [calendarYear, setCalendarYear] = useState(isNaN(initialDateObj.getFullYear()) ? new Date().getFullYear() : initialDateObj.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(isNaN(initialDateObj.getMonth()) ? new Date().getMonth() : initialDateObj.getMonth());

  const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const handleSelectDate = (year: number, month: number, day: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    setDate(`${year}-${mm}-${dd}`);
    setShowDatePickerModal(false);
  };

  const handleSelectQuickDate = (type: 'today' | 'next_saturday' | 'next_sunday') => {
    const now = new Date();
    if (type === 'today') {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    } else if (type === 'next_saturday') {
      const d = new Date();
      const dayOfWeek = d.getDay();
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
      d.setDate(d.getDate() + daysUntilSaturday);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    } else if (type === 'next_sunday') {
      const d = new Date();
      const dayOfWeek = d.getDay();
      const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;
      d.setDate(d.getDate() + daysUntilSunday);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      setDate(`${yyyy}-${mm}-${dd}`);
    }
    setShowDatePickerModal(false);
  };

  // Indicadores de logro por las 6 áreas
  const [indicators, setIndicators] = useState<Record<GrowthAreaKey, string[]>>(
    existingPrograma?.indicators || {
      corporalidad: [],
      creatividad: [],
      caracter: [],
      afectividad: [],
      sociabilidad: [],
      espiritualidad: []
    }
  );

  // Cronograma de actividades
  const [schedule, setSchedule] = useState<ActivityScheduleItem[]>(
    existingPrograma?.schedule || [
      {
        id: `sch_${Date.now()}_1`,
        timeRange: '10:00 am - 10:20 am',
        title: 'Ceremonia de Apertura',
        description: 'Izada de bandera nacional y scout, oración de unidad y pase de lista.',
        responsible: 'Adultos de Programa',
        materials: 'Banderas, Asta'
      }
    ]
  );

  // Modal para seleccionar indicador oficial
  const [indicatorPickerArea, setIndicatorPickerArea] = useState<GrowthAreaKey | null>(null);
  const [indicatorSearchQuery, setIndicatorSearchQuery] = useState('');
  const [expandedArea, setExpandedArea] = useState<GrowthAreaKey | null>('corporalidad');
  const [customIndicatorInput, setCustomIndicatorInput] = useState('');

  // Unidades activas para indicadores
  const activeUnitsForIndicators = isSinodal ? selectedUnits : [unit];
  const activeStages = getStagesForUnits(activeUnitsForIndicators);

  // Manejador para alternar unidades en modo Sinodal
  const handleToggleSinodalUnit = (u: 'manada' | 'tropa' | 'caminantes' | 'clan') => {
    if (u === unit) {
      showAlert('Unidad Principal', `Tu unidad (${unit.toUpperCase()}) es la anfitriona del programa y no se puede deseleccionar.`);
      return;
    }
    if (selectedUnits.includes(u)) {
      setSelectedUnits(selectedUnits.filter(x => x !== u));
    } else {
      setSelectedUnits([...selectedUnits, u]);
    }
  };

  // Auto-recuperación de borrador local al abrir
  useEffect(() => {
    if (!existingPrograma && user) {
      autoSaveService.loadDraft<any>('active_programa_draft').then(draft => {
        if (draft) {
          if (draft.title) setTitle(draft.title);
          if (draft.date) setDate(draft.date);
          if (draft.location) setLocation(draft.location);
          if (draft.activityType) setActivityType(draft.activityType);
          if (draft.isSinodal !== undefined) setIsSinodal(draft.isSinodal);
          if (draft.selectedUnits) setSelectedUnits(draft.selectedUnits);
          if (draft.participantProjection) setParticipantProjection(draft.participantProjection);
          if (draft.generalObjective) setGeneralObjective(draft.generalObjective);
          if (draft.specificObjectives) setSpecificObjectives(draft.specificObjectives);
          if (draft.specificMetas) setSpecificMetas(draft.specificMetas);
          if (draft.selectedSDGs) setSelectedSDGs(draft.selectedSDGs);
          if (draft.importantNotes) setImportantNotes(draft.importantNotes);
          if (draft.schedule && Array.isArray(draft.schedule)) setSchedule(draft.schedule);
          if (draft.indicators) setIndicators(draft.indicators);
        }
      });
    }
  }, [existingPrograma, user]);

  // Auto-guardado local en segundo plano al modificar cualquier campo
  useEffect(() => {
    if (!user) return;
    autoSaveService.saveDraft(
      'active_programa_draft',
      {
        id,
        title,
        date,
        location,
        activityType,
        unit,
        isSinodal,
        selectedUnits,
        participantProjection,
        generalObjective,
        specificObjectives,
        specificMetas,
        selectedSDGs,
        importantNotes,
        schedule,
        indicators
      },
      user.id,
      'ProgramaScoutEditor'
    );
  }, [id, title, date, location, activityType, unit, isSinodal, selectedUnits, participantProjection, generalObjective, specificObjectives, specificMetas, selectedSDGs, importantNotes, schedule, indicators, user]);

  const handleToggleSinodalMode = () => {
    if (isSinodal) {
      setIsSinodal(false);
      setSelectedUnits([unit]);
    } else {
      setIsSinodal(true);
    }
  };

  // Cargar actividades del Plan Trimestral para importar
  const loadTrimestreActivities = async () => {
    setLoadingTrimestre(true);
    try {
      const cy = new Date().getFullYear();
      const currentQuarter = 'Q' + Math.ceil((new Date().getMonth() + 1) / 3);
      const gn = user?.group_name || 'Grupo Scout Orión #84';

      let allActivities: any[] = [];

      // 1. Intentar con plan compartido del trimestre actual
      let plan = await dataService.getUnitSharedQuarterlyPlan(gn, unit, currentQuarter, cy);
      if (plan && plan.monthly_activities && Array.isArray(plan.monthly_activities)) {
        allActivities.push(...plan.monthly_activities);
      }

      // 2. Si no hay suficientes, revisar otros trimestres del año
      for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
        if (q !== currentQuarter) {
          const p = await dataService.getUnitSharedQuarterlyPlan(gn, unit, q, cy);
          if (p && p.monthly_activities && Array.isArray(p.monthly_activities)) {
            p.monthly_activities.forEach((act: any) => {
              if (!allActivities.some(a => (a.title || a.name) === (act.title || act.name))) {
                allActivities.push(act);
              }
            });
          }
        }
      }

      // 3. Si aún está vacío, buscar plan personal
      if (allActivities.length === 0 && user?.id) {
        const myPlan = await dataService.getQuarterlyPlan(user.id, currentQuarter, cy);
        if (myPlan && myPlan.monthly_activities && Array.isArray(myPlan.monthly_activities)) {
          allActivities.push(...myPlan.monthly_activities);
        }
      }

      setTrimestreActivities(allActivities);
    } catch (e) {
      console.warn('Error cargando plan trimestral:', e);
      setTrimestreActivities([]);
    } finally {
      setLoadingTrimestre(false);
    }
  };

  const handleImportFromTrimestre = (item: any) => {
    if (item.title || item.name || item.activity) {
      setTitle(item.title || item.name || item.activity);
    }
    if (item.date) setDate(item.date);
    if (item.location) setLocation(item.location);
    if (item.type || item.activity_type) setActivityType(item.type || item.activity_type);
    if (item.objective || item.description) setGeneralObjective(item.objective || item.description);
    if (item.responsible) setParticipantProjection(`Responsable: ${item.responsible}`);
    setShowTrimestreModal(false);
    showAlert('Importado con Éxito', `Se importó "${item.title || item.name || 'la actividad'}" desde el Plan Trimestral.`);
  };

  // Manejadores de Objetivos Específicos
  const handleAddObjective = () => setSpecificObjectives([...specificObjectives, '']);
  const handleUpdateObjective = (text: string, index: number) => {
    const updated = [...specificObjectives];
    updated[index] = text;
    setSpecificObjectives(updated);
  };
  const handleRemoveObjective = (index: number) => {
    setSpecificObjectives(specificObjectives.filter((_, i) => i !== index));
  };

  // Manejadores de Metas Específicas
  const handleAddMeta = () => setSpecificMetas([...specificMetas, '']);
  const handleUpdateMeta = (text: string, index: number) => {
    const updated = [...specificMetas];
    updated[index] = text;
    setSpecificMetas(updated);
  };
  const handleRemoveMeta = (index: number) => {
    setSpecificMetas(specificMetas.filter((_, i) => i !== index));
  };

  // Manejador de ODS (Toggle selección)
  const handleToggleSDG = (number: number) => {
    if (selectedSDGs.includes(number)) {
      setSelectedSDGs(selectedSDGs.filter(n => n !== number));
    } else {
      setSelectedSDGs([...selectedSDGs, number]);
    }
  };

  // Manejadores de Indicadores
  const handleAddIndicator = (area: GrowthAreaKey, text: string) => {
    if (!text.trim()) return;
    const currentList = indicators[area] || [];
    if (!currentList.includes(text.trim())) {
      setIndicators({
        ...indicators,
        [area]: [...currentList, text.trim()]
      });
    }
  };

  const handleRemoveIndicator = (area: GrowthAreaKey, index: number) => {
    const currentList = indicators[area] || [];
    setIndicators({
      ...indicators,
      [area]: currentList.filter((_, i) => i !== index)
    });
  };

  // Manejadores de Cronograma
  const handleAddScheduleRow = () => {
    setSchedule([
      ...schedule,
      {
        id: `sch_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        timeRange: '',
        title: '',
        description: '',
        responsible: '',
        materials: ''
      }
    ]);
  };

  const handleUpdateScheduleRow = (id: string, field: keyof ActivityScheduleItem, value: string) => {
    setSchedule(
      schedule.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleRemoveScheduleRow = (id: string) => {
    if (schedule.length <= 1) {
      showAlert('Aviso', 'El cronograma debe tener al menos una actividad.');
      return;
    }
    setSchedule(schedule.filter(item => item.id !== id));
  };

  // Validaciones
  const completedAreasCount = Object.keys(GROWTH_AREAS).filter(
    k => (indicators[k as GrowthAreaKey] || []).length > 0
  ).length;

  const handleSave = async () => {
    const finalTitle = title.trim() || 'Programa de Actividades Scout';
    const finalDate = date.trim() || new Date().toISOString().split('T')[0];
    const finalLocation = location.trim() || 'Lugar por definir';
    const finalActivityType = activityType.trim() || 'Actividad Scout';
    const finalProjection = participantProjection.trim() || '4 Jóvenes';

    setSaving(true);
    try {
      const programaToSave: ProgramaScout = {
        id,
        title: finalTitle,
        date: finalDate,
        location: finalLocation,
        activityType: finalActivityType,
        unit,
        isSinodal,
        selectedUnits: isSinodal ? selectedUnits : [unit],
        participantProjection: finalProjection,
        generalObjective: generalObjective.trim() || 'Fomentar competencias clave para actividades al aire libre y crecimiento integral.',
        specificObjectives: specificObjectives.filter(o => o.trim()),
        specificMetas: specificMetas.filter(m => m.trim()),
        selectedSDGs,
        indicators,
        schedule: schedule.length > 0 ? schedule : [
          {
            id: `sch_${Date.now()}_1`,
            timeRange: '10:00 am - 10:20 am',
            title: 'Ceremonia de Apertura',
            description: 'Izada de bandera nacional y scout, oración y pase de lista.',
            responsible: 'Adultos de Programa',
            materials: 'Banderas, Asta'
          }
        ],
        importantNotes: importantNotes.trim() || 'Cada integrante debe tener dominio del tema y dar lo mejor de sí en este servicio.',
        registrationBadgeId,
        createdBy: user?.id || 'anonymous',
        creatorName: user?.name || 'Scouter / Rover',
        groupName: user?.group_name || 'Grupo Scout Orión #84',
        createdAt: existingPrograma?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await programaService.savePrograma(programaToSave);
      await autoSaveService.removeDraft('active_programa_draft');
      setSaving(false);
      
      const statusMsg = completedAreasCount >= 6
        ? '🎉 Programa guardado y validado oficialmente con las 6 áreas de crecimiento.'
        : `💾 Programa guardado exitosamente (${completedAreasCount}/6 áreas completadas).`;

      showAlert('Programa Guardado', statusMsg, [
        {
          text: 'Aceptar',
          onPress: () => {
            navigation.goBack();
          }
        }
      ]);
    } catch (err: any) {
      setSaving(false);
      console.error('Error al guardar programa:', err);
      showAlert('Aviso', 'El programa se ha guardado localmente en tu dispositivo.');
      navigation.goBack();
    }
  };

  const currentProgramaData: ProgramaScout = {
    id,
    title: title || 'Sin Título',
    date,
    location,
    activityType,
    unit,
    isSinodal,
    selectedUnits: isSinodal ? selectedUnits : [unit],
    participantProjection,
    generalObjective,
    specificObjectives: specificObjectives.filter(o => o.trim()),
    specificMetas: specificMetas.filter(m => m.trim()),
    selectedSDGs,
    indicators,
    schedule,
    importantNotes,
    registrationBadgeId,
    createdBy: user?.id || '',
    creatorName: user?.name || 'Scout',
    groupName: user?.group_name || 'Grupo Scout Orión #84',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* HEADER DE LA PANTALLA */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {existingPrograma ? 'Editar Programa Scout' : 'Crear Nuevo Programa Scout'}
        </Text>
        <View style={styles.headerRightActions}>
          <TouchableOpacity
            style={[styles.previewIconBtn, { backgroundColor: primaryColor + '20' }]}
            onPress={() => setShowPreviewModal(true)}
          >
            <Eye size={18} color={primaryColor} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveHeaderBtn, { backgroundColor: primaryColor }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Save size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.saveHeaderBtnText}>Guardar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
        {/* BOTÓN PARA IMPORTAR DESDE PLAN TRIMESTRAL */}
        <TouchableOpacity
          style={[styles.importTrimestreBanner, { backgroundColor: isDarkMode ? '#27272a' : '#f0fdf4', borderColor: '#16a34a' }]}
          onPress={() => {
            loadTrimestreActivities();
            setShowTrimestreModal(true);
          }}
          activeOpacity={0.8}
        >
          <BookOpen size={20} color="#16a34a" style={{ marginRight: 10 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.importBannerTitle, { color: isDarkMode ? '#86efac' : '#15803d' }]}>
              📥 Importar desde Plan Trimestral
            </Text>
            <Text style={{ fontSize: 11, color: isDarkMode ? '#dcfce7' : '#166534' }}>
              Auto-rellena fecha, lugar y actividad planificada para tu unidad.
            </Text>
          </View>
        </TouchableOpacity>

        {/* 1. SECCIÓN: DATOS GENERALES DEL PROGRAMA */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: primaryColor }]}>📋 1. Datos Generales de la Actividad</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Título / Nombre de la Actividad *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: Hermandad Scout / Presentación de Proyectos"
              placeholderTextColor={theme.subText}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.rowTwo}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Fecha *</Text>
              <TouchableOpacity
                style={[
                  styles.datePickerBtn,
                  {
                    backgroundColor: isDarkMode ? '#27272a' : '#f8fafc',
                    borderColor: theme.border
                  }
                ]}
                onPress={() => setShowDatePickerModal(true)}
                activeOpacity={0.7}
              >
                <Calendar size={16} color={primaryColor} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, color: date ? theme.text : theme.subText, fontWeight: '600' }}>
                  {date || 'Seleccionar fecha...'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Lugar *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: Caracas / Terreno 25"
                placeholderTextColor={theme.subText}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          <View style={styles.rowTwo}>
            <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Tipo de Actividad</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: Recorrido Museos"
                placeholderTextColor={theme.subText}
                value={activityType}
                onChangeText={setActivityType}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Proyección Participantes</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: 4 Jóvenes"
                placeholderTextColor={theme.subText}
                value={participantProjection}
                onChangeText={setParticipantProjection}
              />
            </View>
          </View>

          {/* Selector de Rama y Modo Sinodal */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithAction}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Rama Scout</Text>
              <TouchableOpacity
                style={[
                  styles.sinodalToggleBtn,
                  isSinodal ? { backgroundColor: '#7c3aed', borderColor: '#7c3aed' } : { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }
                ]}
                onPress={handleToggleSinodalMode}
                activeOpacity={0.8}
              >
                <Users size={13} color={isSinodal ? '#ffffff' : theme.subText} style={{ marginRight: 4 }} />
                <Text style={[styles.sinodalToggleText, isSinodal ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.subText }]}>
                  {isSinodal ? '🤝 Sinodal: Activada' : '🤝 ¿Actividad Sinodal?'}
                </Text>
              </TouchableOpacity>
            </View>

            {!isSinodal ? (
              /* MODO NORMAL: Tu unidad fijada */
              <View style={[styles.fixedUnitBox, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
                <Text style={[styles.fixedUnitText, { color: primaryColor }]}>
                  ⚜️ Rama: <Text style={{ fontWeight: 'bold' }}>{unit.toUpperCase()}</Text>
                </Text>
                <View style={[styles.fixedUnitBadge, { backgroundColor: primaryColor }]}>
                  <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>Tu Unidad</Text>
                </View>
              </View>
            ) : (
              /* MODO SINODAL: Selección múltiple con tu unidad bloqueada */
              <View style={[styles.sinodalBox, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: '#7c3aed' }]}>
                <Text style={{ fontSize: 11, color: theme.subText, marginBottom: 8 }}>
                  Selecciona las otras unidades participantes (tu unidad <Text style={{ fontWeight: 'bold', color: primaryColor }}>{unit.toUpperCase()}</Text> está fija):
                </Text>
                <View style={styles.unitSelectorRow}>
                  {(['manada', 'tropa', 'caminantes', 'clan'] as const).map(u => {
                    const isSelected = selectedUnits.includes(u);
                    const isMyUnit = u === unit;
                    return (
                      <TouchableOpacity
                        key={u}
                        style={[
                          styles.unitChip,
                          isSelected && { backgroundColor: isMyUnit ? primaryColor : '#7c3aed', borderColor: isMyUnit ? primaryColor : '#7c3aed' },
                          { borderColor: theme.border }
                        ]}
                        onPress={() => handleToggleSinodalUnit(u)}
                      >
                        <Text
                          style={[
                            styles.unitChipText,
                            isSelected ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }
                          ]}
                        >
                          {isMyUnit ? `🔒 ${u.toUpperCase()}` : isSelected ? `✓ ${u.toUpperCase()}` : u.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>

          {/* Insignia Anual de Registro (Solo año en curso 2026) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Insignia Anual de Registro Nacional</Text>
            <View style={[styles.activeBadgePill, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: primaryColor }]}>
              <Text style={{ fontSize: 14, marginRight: 8 }}>🎖️</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activeBadgeTitle, { color: theme.text }]}>Bienestar en Acción 2026</Text>
                <Text style={{ fontSize: 10, color: theme.subText }}>Insignia Oficial ASV activa para el periodo en curso</Text>
              </View>
              <View style={[styles.activeBadgeStatus, { backgroundColor: '#dcfce7' }]}>
                <Text style={{ color: '#15803d', fontSize: 10, fontWeight: 'bold' }}>Año 2026</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 2. SECCIÓN: OBJETIVOS Y METAS */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: primaryColor }]}>🎯 2. Objetivos y Metas</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Objetivo General</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
              placeholder="Describe el propósito formativo central de la actividad..."
              placeholderTextColor={theme.subText}
              multiline
              numberOfLines={3}
              value={generalObjective}
              onChangeText={setGeneralObjective}
            />
          </View>

          {/* Objetivos Específicos */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithAction}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Objetivos Específicos</Text>
              <TouchableOpacity style={styles.addSmallBtn} onPress={handleAddObjective}>
                <Plus size={14} color={primaryColor} />
                <Text style={[styles.addSmallBtnText, { color: primaryColor }]}>Agregar</Text>
              </TouchableOpacity>
            </View>
            {specificObjectives.map((obj, index) => (
              <View key={index} style={styles.dynamicListRow}>
                <Text style={{ color: theme.subText, marginRight: 6 }}>*</Text>
                <TextInput
                  style={[styles.dynamicInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
                  placeholder={`Objetivo específico ${index + 1}...`}
                  placeholderTextColor={theme.subText}
                  value={obj}
                  onChangeText={txt => handleUpdateObjective(txt, index)}
                />
                {specificObjectives.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveObjective(index)} style={{ padding: 6 }}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Metas Específicas */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithAction}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Metas Específicas</Text>
              <TouchableOpacity style={styles.addSmallBtn} onPress={handleAddMeta}>
                <Plus size={14} color={primaryColor} />
                <Text style={[styles.addSmallBtnText, { color: primaryColor }]}>Agregar</Text>
              </TouchableOpacity>
            </View>
            {specificMetas.map((meta, index) => (
              <View key={index} style={styles.dynamicListRow}>
                <Text style={{ color: theme.subText, marginRight: 6 }}>*</Text>
                <TextInput
                  style={[styles.dynamicInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
                  placeholder={`Meta específica ${index + 1} (ej: Lograr que el 75% participe)...`}
                  placeholderTextColor={theme.subText}
                  value={meta}
                  onChangeText={txt => handleUpdateMeta(txt, index)}
                />
                {specificMetas.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveMeta(index)} style={{ padding: 6 }}>
                    <Trash2 size={16} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* 3. SECCIÓN: SELECTOR DE ODS (OBJETIVOS DE DESARROLLO SOSTENIBLE) */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.labelWithAction}>
            <Text style={[styles.sectionHeading, { color: primaryColor }]}>🌍 3. Objetivos de Desarrollo Sostenible (ODS)</Text>
            <View style={[styles.countBadge, { backgroundColor: primaryColor + '20' }]}>
              <Text style={{ color: primaryColor, fontWeight: 'bold', fontSize: 11 }}>
                {selectedSDGs.length} seleccionados
              </Text>
            </View>
          </View>
          <Text style={[styles.subTextHint, { color: theme.subText }]}>
            Toca los ODS de la ONU que se desarrollarán en esta actividad scout:
          </Text>

          <View style={styles.sdgGrid}>
            {SDG_LIST.map(sdg => {
              const isSelected = selectedSDGs.includes(sdg.number);
              return (
                <TouchableOpacity
                  key={sdg.number}
                  style={[
                    styles.sdgChip,
                    isSelected ? { backgroundColor: sdg.color, borderColor: sdg.color } : { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }
                  ]}
                  onPress={() => handleToggleSDG(sdg.number)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.sdgChipText, isSelected ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }]}>
                    {sdg.icon} #{sdg.number}. {sdg.name}
                  </Text>
                  {isSelected && <CheckCircle size={13} color="#ffffff" style={{ marginLeft: 6 }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 4. SECCIÓN: INDICADORES DE LOGRO (6 ÁREAS DE CRECIMIENTO) */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.labelWithAction}>
            <Text style={[styles.sectionHeading, { color: primaryColor }]}>📊 4. Indicadores de Logro Oficiales</Text>
            <View style={[styles.countBadge, { backgroundColor: completedAreasCount === 6 ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={{ color: completedAreasCount === 6 ? '#15803d' : '#b91c1c', fontWeight: 'bold', fontSize: 11 }}>
                {completedAreasCount}/6 Áreas Listas
              </Text>
            </View>
          </View>

          <Text style={[styles.subTextHint, { color: theme.subText }]}>
            Selecciona al menos 1 indicador en cada una de las 6 áreas para{' '}
            <Text style={{ fontWeight: 'bold', color: primaryColor }}>
              {isSinodal ? selectedUnits.map(u => u.toUpperCase()).join(' + ') + ' (Sinodal)' : unit.toUpperCase()}
            </Text>{' '}
            (Etapas {activeStages.join(', ')}):
          </Text>

          {/* Acordeones para las 6 áreas */}
          {Object.keys(GROWTH_AREAS).map(areaKey => {
            const area = GROWTH_AREAS[areaKey as GrowthAreaKey];
            const areaIndicators = indicators[area.key] || [];
            const isExpanded = expandedArea === area.key;
            const hasIndicators = areaIndicators.length > 0;

            return (
              <View key={area.key} style={[styles.areaAccordion, { borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[styles.areaAccordionHeader, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }]}
                  onPress={() => setExpandedArea(isExpanded ? null : area.key)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>{area.icon}</Text>
                    <Text style={[styles.areaTitle, { color: theme.text }]}>{area.name}</Text>
                    {hasIndicators ? (
                      <View style={[styles.areaBadge, { backgroundColor: '#dcfce7' }]}>
                        <Text style={{ color: '#15803d', fontSize: 10, fontWeight: 'bold' }}>
                          ✓ {areaIndicators.length}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.areaBadge, { backgroundColor: '#fee2e2' }]}>
                        <Text style={{ color: '#b91c1c', fontSize: 10, fontWeight: 'bold' }}>
                          Pendiente
                        </Text>
                      </View>
                    )}
                  </View>
                  {isExpanded ? <ChevronUp size={18} color={theme.subText} /> : <ChevronDown size={18} color={theme.subText} />}
                </TouchableOpacity>

                {isExpanded && (
                  <View style={styles.areaBody}>
                    <Text style={{ fontSize: 11, color: theme.subText, marginBottom: 8 }}>
                      {area.description}
                    </Text>

                    {/* Lista de indicadores seleccionados */}
                    {areaIndicators.map((ind, idx) => (
                      <View key={idx} style={[styles.selectedIndicatorItem, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
                        <Text style={[styles.selectedIndicatorText, { color: theme.text }]}>• {ind}</Text>
                        <TouchableOpacity onPress={() => handleRemoveIndicator(area.key, idx)} style={{ padding: 4 }}>
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Botones para agregar indicadores */}
                    <View style={styles.indicatorActionsRow}>
                      <TouchableOpacity
                        style={[styles.btnPickOfficial, { backgroundColor: primaryColor }]}
                        onPress={() => {
                          setIndicatorPickerArea(area.key);
                          setIndicatorSearchQuery('');
                        }}
                      >
                        <Search size={14} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.btnPickOfficialText}>Buscar en Catálogo Oficial ASV</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* 5. SECCIÓN: CRONOGRAMA / ITINERARIO DE ACTIVIDADES */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={styles.labelWithAction}>
            <Text style={[styles.sectionHeading, { color: primaryColor }]}>⏱️ 5. Cronograma de Actividades</Text>
            <TouchableOpacity style={[styles.addScheduleBtn, { backgroundColor: primaryColor }]} onPress={handleAddScheduleRow}>
              <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addScheduleBtnText}>Agregar Actividad</Text>
            </TouchableOpacity>
          </View>

          {schedule.map((item, index) => (
            <View key={item.id} style={[styles.scheduleCardItem, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
              <View style={styles.scheduleItemHeader}>
                <Text style={[styles.scheduleItemIndex, { color: primaryColor }]}>#{index + 1}</Text>
                <TouchableOpacity onPress={() => handleRemoveScheduleRow(item.id)} style={{ padding: 4 }}>
                  <Trash2 size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <View style={styles.rowTwo}>
                <View style={[styles.fieldGroup, { flex: 1, marginRight: 6 }]}>
                  <Text style={[styles.fieldLabelSmall, { color: theme.text }]}>Horario (AM/PM)</Text>
                  <TextInput
                    style={[styles.textInputSmall, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme.text, borderColor: theme.border }]}
                    placeholder="Ej: 10:20 am - 10:40 am"
                    placeholderTextColor={theme.subText}
                    value={item.timeRange}
                    onChangeText={txt => handleUpdateScheduleRow(item.id, 'timeRange', txt)}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1, marginLeft: 6 }]}>
                  <Text style={[styles.fieldLabelSmall, { color: theme.text }]}>Responsable(s)</Text>
                  <TextInput
                    style={[styles.textInputSmall, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme.text, borderColor: theme.border }]}
                    placeholder="Ej: AP Lisbeth / Rover Juan"
                    placeholderTextColor={theme.subText}
                    value={item.responsible}
                    onChangeText={txt => handleUpdateScheduleRow(item.id, 'responsible', txt)}
                  />
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabelSmall, { color: theme.text }]}>Nombre de la Dinámica / Actividad</Text>
                <TextInput
                  style={[styles.textInputSmall, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme.text, borderColor: theme.border }]}
                  placeholder="Ej: Rompehielo 'Descubre las Palabras'"
                  placeholderTextColor={theme.subText}
                  value={item.title}
                  onChangeText={txt => handleUpdateScheduleRow(item.id, 'title', txt)}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabelSmall, { color: theme.text }]}>Descripción y Explicación de la Dinámica</Text>
                <TextInput
                  style={[styles.textAreaSmall, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme.text, borderColor: theme.border }]}
                  placeholder="Explica las reglas, la dinámica, el juego o el recorrido paso a paso..."
                  placeholderTextColor={theme.subText}
                  multiline
                  numberOfLines={2}
                  value={item.description}
                  onChangeText={txt => handleUpdateScheduleRow(item.id, 'description', txt)}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabelSmall, { color: theme.text }]}>Materiales Necesarios</Text>
                <TextInput
                  style={[styles.textInputSmall, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', color: theme.text, borderColor: theme.border }]}
                  placeholder="Ej: Lápices, Hojas, Banderas, Mecatillo, Carpas (o N/A)"
                  placeholderTextColor={theme.subText}
                  value={item.materials}
                  onChangeText={txt => handleUpdateScheduleRow(item.id, 'materials', txt)}
                />
              </View>
            </View>
          ))}
        </View>

        {/* 6. SECCIÓN: NOTAS IMPORTANTES */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: primaryColor }]}>📝 6. Notas Importantes / Recomendaciones</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
            placeholder="Ej: Cada Rover debe tener dominio del tema. Traer hidratación y uniforme completo..."
            placeholderTextColor={theme.subText}
            multiline
            numberOfLines={3}
            value={importantNotes}
            onChangeText={setImportantNotes}
          />
        </View>

        {/* BOTÓN FINAL DE GUARDAR */}
        <TouchableOpacity
          style={[styles.mainSaveBtn, { backgroundColor: primaryColor }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Save size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.mainSaveBtnText}>Guardar y Validar Programa Scout</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL PARA SELECCIONAR INDICADORES OFICIALES ASV */}
      {indicatorPickerArea && (
        <Modal visible={!!indicatorPickerArea} animationType="slide" transparent onRequestClose={() => setIndicatorPickerArea(null)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.indicatorPickerModal, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>
                  {GROWTH_AREAS[indicatorPickerArea].icon} Indicadores de {GROWTH_AREAS[indicatorPickerArea].name}
                </Text>
                <TouchableOpacity onPress={() => setIndicatorPickerArea(null)} style={{ padding: 4 }}>
                  <Trash2 size={20} color={theme.subText} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 11, color: theme.subText, marginBottom: 10 }}>
                {isSinodal ? selectedUnits.map(u => u.toUpperCase()).join(' + ') + ' (Sinodal)' : unit.toUpperCase()} (Etapas {activeStages.join(', ')}):
              </Text>

              {/* Buscador en vivo */}
              <View style={[styles.searchBox, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                <Search size={16} color={theme.subText} style={{ marginRight: 8 }} />
                <TextInput
                  style={{ flex: 1, color: theme.text, fontSize: 13 }}
                  placeholder="Buscar indicador..."
                  placeholderTextColor={theme.subText}
                  value={indicatorSearchQuery}
                  onChangeText={setIndicatorSearchQuery}
                />
              </View>

              {/* Lista filtrada */}
              <ScrollView style={{ maxHeight: 340, marginTop: 10 }}>
                {getIndicatorsForAreaAndUnit(indicatorPickerArea, activeUnitsForIndicators)
                  .filter(item => item.text.toLowerCase().includes(indicatorSearchQuery.toLowerCase()))
                  .map((item, idx) => {
                    const isAlreadySelected = (indicators[indicatorPickerArea] || []).includes(item.text);
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.indicatorOptionRow,
                          isAlreadySelected && { backgroundColor: primaryColor + '15', borderColor: primaryColor },
                          { borderColor: theme.border }
                        ]}
                        onPress={() => {
                          if (isAlreadySelected) {
                            const current = indicators[indicatorPickerArea] || [];
                            setIndicators({
                              ...indicators,
                              [indicatorPickerArea]: current.filter(t => t !== item.text)
                            });
                          } else {
                            handleAddIndicator(indicatorPickerArea, item.text);
                          }
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 9, color: primaryColor, fontWeight: 'bold' }}>Etapa {item.stage}</Text>
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
                  value={customIndicatorInput}
                  onChangeText={setCustomIndicatorInput}
                />
                <TouchableOpacity
                  style={[styles.customAddBtn, { backgroundColor: primaryColor }]}
                  onPress={() => {
                    if (customIndicatorInput.trim()) {
                      handleAddIndicator(indicatorPickerArea, customIndicatorInput.trim());
                      setCustomIndicatorInput('');
                    }
                  }}
                >
                  <Plus size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                onPress={() => setIndicatorPickerArea(null)}
              >
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>Listo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* MODAL DE IMPORTAR DESDE PLAN TRIMESTRAL */}
      <Modal visible={showTrimestreModal} animationType="slide" transparent onRequestClose={() => setShowTrimestreModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.indicatorPickerModal, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>
                📅 Actividades del Plan Trimestral
              </Text>
              <TouchableOpacity onPress={() => setShowTrimestreModal(false)} style={{ padding: 4 }}>
                <Trash2 size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {loadingTrimestre ? (
              <ActivityIndicator size="large" color={primaryColor} style={{ marginVertical: 30 }} />
            ) : trimestreActivities.length === 0 ? (
              <Text style={{ color: theme.subText, textAlign: 'center', marginVertical: 20 }}>
                No hay actividades registradas en el Plan Trimestral.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 360, marginTop: 10 }}>
                {trimestreActivities.map((act, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.trimestreActivityRow, { borderColor: theme.border, backgroundColor: isDarkMode ? '#27272a' : '#f8fafc' }]}
                    onPress={() => handleImportFromTrimestre(act)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.trimestreActTitle, { color: theme.text }]}>{act.title || act.name}</Text>
                      <Text style={{ fontSize: 11, color: theme.subText }}>
                        📅 {act.date || 'Sin fecha'} • 📍 {act.location || 'Sin lugar'}
                      </Text>
                    </View>
                    <Text style={{ color: primaryColor, fontWeight: 'bold', fontSize: 12 }}>Importar →</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              onPress={() => setShowTrimestreModal(false)}
            >
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE SELECTOR DE FECHA (CALENDARIO INTERACTIVO) */}
      <Modal visible={showDatePickerModal} animationType="fade" transparent onRequestClose={() => setShowDatePickerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarModal, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Calendar size={20} color={primaryColor} />
                <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Seleccionar Fecha</Text>
              </View>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)} style={{ padding: 4 }}>
                <X size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* Accesos rápidos de fecha */}
            <View style={styles.quickDateRow}>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: primaryColor + '18', borderColor: primaryColor }]}
                onPress={() => handleSelectQuickDate('today')}
              >
                <Text style={[styles.quickDateChipText, { color: primaryColor }]}>📅 Hoy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: '#16a34a18', borderColor: '#16a34a' }]}
                onPress={() => handleSelectQuickDate('next_saturday')}
              >
                <Text style={[styles.quickDateChipText, { color: '#16a34a' }]}>⚜️ Próx. Sábado</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickDateChip, { backgroundColor: '#2563eb18', borderColor: '#2563eb' }]}
                onPress={() => handleSelectQuickDate('next_sunday')}
              >
                <Text style={[styles.quickDateChipText, { color: '#2563eb' }]}>🏕️ Próx. Domingo</Text>
              </TouchableOpacity>
            </View>

            {/* Navegación de Mes y Año */}
            <View style={styles.calendarNavRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                <ChevronLeft size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.calMonthTitle, { color: theme.text }]}>
                {MONTH_NAMES[calendarMonth]} {calendarYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                <ChevronRight size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Encabezado Días de la Semana */}
            <View style={styles.calWeekHeader}>
              {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
                <Text key={i} style={[styles.calWeekDayText, { color: theme.subText }]}>{d}</Text>
              ))}
            </View>

            {/* Cuadrícula de días del mes */}
            <View style={styles.calGrid}>
              {(() => {
                const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay();
                const totalDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                const slots = [];

                for (let i = 0; i < firstDayOfMonth; i++) {
                  slots.push(<View key={`empty-${i}`} style={styles.calDayCell} />);
                }

                for (let day = 1; day <= totalDaysInMonth; day++) {
                  const mm = String(calendarMonth + 1).padStart(2, '0');
                  const dd = String(day).padStart(2, '0');
                  const cellDateStr = `${calendarYear}-${mm}-${dd}`;
                  const isSelected = date === cellDateStr;
                  const isToday = new Date().toISOString().split('T')[0] === cellDateStr;

                  slots.push(
                    <TouchableOpacity
                      key={`day-${day}`}
                      style={[
                        styles.calDayCell,
                        isSelected && { backgroundColor: primaryColor, borderRadius: 20 },
                        !isSelected && isToday && { borderWidth: 1, borderColor: primaryColor, borderRadius: 20 }
                      ]}
                      onPress={() => handleSelectDate(calendarYear, calendarMonth, day)}
                    >
                      <Text
                        style={[
                          styles.calDayText,
                          { color: isSelected ? '#ffffff' : theme.text },
                          isSelected && { fontWeight: 'bold' }
                        ]}
                      >
                        {day}
                      </Text>
                    </TouchableOpacity>
                  );
                }

                return slots;
              })()}
            </View>

            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginTop: 16 }]}
              onPress={() => setShowDatePickerModal(false)}
            >
              <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE VISTA PREVIA E IMPRESIÓN OFICIAL */}
      <ProgramaPdfPreviewModal
        visible={showPreviewModal}
        programa={currentProgramaData}
        onClose={() => setShowPreviewModal(false)}
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
  backBtn: { padding: 6, marginRight: 6 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  headerRightActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewIconBtn: { padding: 8, borderRadius: 8 },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveHeaderBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  scrollBody: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  importTrimestreBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  importBannerTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  card: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeading: { fontSize: 14, fontWeight: 'bold', marginBottom: 12 },
  fieldGroup: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  fieldLabelSmall: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  textInput: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textInputSmall: {
    height: 36,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  textArea: {
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  textAreaSmall: {
    height: 55,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  rowTwo: { flexDirection: 'row' },
  labelWithAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sinodalToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  sinodalToggleText: { fontSize: 11 },
  fixedUnitBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  fixedUnitText: { fontSize: 13 },
  fixedUnitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sinodalBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  unitSelectorRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  unitChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitChipText: { fontSize: 10 },
  activeBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  activeBadgeTitle: { fontSize: 13, fontWeight: 'bold' },
  activeBadgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  addSmallBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addSmallBtnText: { fontSize: 12, fontWeight: 'bold' },
  dynamicListRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dynamicInput: {
    flex: 1,
    height: 38,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  countBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  subTextHint: { fontSize: 11, marginBottom: 10, lineHeight: 16 },
  sdgGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sdgChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  sdgChipText: { fontSize: 11, fontWeight: '500' },
  areaAccordion: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    overflow: 'hidden',
  },
  areaAccordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  areaTitle: { fontSize: 13, fontWeight: 'bold' },
  areaBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, marginLeft: 8 },
  areaBody: { padding: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  selectedIndicatorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 6,
  },
  selectedIndicatorText: { fontSize: 11, flex: 1, marginRight: 6, lineHeight: 15 },
  indicatorActionsRow: { marginTop: 8 },
  btnPickOfficial: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 8,
  },
  btnPickOfficialText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  addScheduleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addScheduleBtnText: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' },
  scheduleCardItem: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  scheduleItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scheduleItemIndex: { fontWeight: 'bold', fontSize: 13 },
  mainSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
    elevation: 3,
  },
  mainSaveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  indicatorPickerModal: {
    width: '100%',
    maxWidth: 550,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalHeaderTitle: { fontSize: 15, fontWeight: 'bold' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
  },
  indicatorOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  indicatorOptionText: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  customAddBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  customAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalBtn: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  trimestreActivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  trimestreActTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 2 },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
  },
  calendarModal: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 16,
    maxHeight: '90%',
  },
  quickDateRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 10,
    flexWrap: 'wrap',
  },
  quickDateChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  quickDateChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  calendarNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 6,
  },
  calNavBtn: {
    padding: 6,
    borderRadius: 6,
  },
  calMonthTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  calWeekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 6,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  calWeekDayText: {
    width: 38,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  calDayCell: {
    width: '14.28%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  calDayText: {
    fontSize: 13,
  },
});
