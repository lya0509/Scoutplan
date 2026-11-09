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
  Lock,
  Unlock,
  GripVertical,
  Check,
  Send
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
import { notificationService } from '../services/notificationService';
import { showAlert } from '../utils/alert';
import { todayLocal } from '../utils/dateLocal';
import { styles } from './programaEditor/styles';
import { DatePickerModal } from './programaEditor/DatePickerModal';
import { IndicatorPickerModal } from './programaEditor/IndicatorPickerModal';

export default function ProgramaScoutEditorScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme, primaryColor } = useTheme();

  const existingPrograma: ProgramaScout | undefined = route.params?.programa;
  const passedInitialDate = route.params?.initialDate;
  const passedInitialTitle = route.params?.initialTitle;
  const passedInitialPlace = route.params?.initialPlace;
  const passedInitialUnit = route.params?.initialUnit;
  const passedPlanActivityId = route.params?.planActivityId;
  const passedIsExtraordinary = route.params?.isExtraordinary;
  const passedInitialActivityType = route.params?.initialActivityType;
  const passedInitialQuarter = route.params?.initialQuarter;

  const userUnit = (passedInitialUnit || user?.unit || existingPrograma?.unit || 'clan').toLowerCase() as 'manada' | 'tropa' | 'caminantes' | 'clan';

  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTrimestreModal, setShowTrimestreModal] = useState(false);
  const [trimestreActivities, setTrimestreActivities] = useState<any[]>([]);
  const [loadingTrimestre, setLoadingTrimestre] = useState(false);

  // Estados principales del programa
  const [id, setId] = useState(existingPrograma?.id || `prog_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);
  const [planActivityId, setPlanActivityId] = useState<string | undefined>(
    existingPrograma?.planActivityId || passedPlanActivityId
  );
  const [isExtraordinary, setIsExtraordinary] = useState<boolean>(
    existingPrograma?.isExtraordinary ?? (passedIsExtraordinary || false)
  );
  const [title, setTitle] = useState(existingPrograma?.title || passedInitialTitle || '');
  const [date, setDate] = useState(existingPrograma?.date || passedInitialDate || todayLocal());
  const [location, setLocation] = useState(existingPrograma?.location || passedInitialPlace || '');
  const [activityType, setActivityType] = useState(
    existingPrograma?.activityType || passedInitialActivityType || (passedIsExtraordinary ? 'Otros / Extraordinaria' : '')
  );
  const isJefe = user?.role === 'jefe_grupo' || (user?.role as string) === 'jefatura' || user?.role === 'admin';
  const isScouter = user?.role === 'scouter';
  const canSwitchBaseUnit = isJefe || isScouter;

  const [unit, setUnit] = useState<'manada' | 'tropa' | 'caminantes' | 'clan'>(userUnit);
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

  // Control de cambios sin guardar y modales de confirmación / guardado
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardConfirmModal, setShowDiscardConfirmModal] = useState(false);
  const [showSaveOptionsModal, setShowSaveOptionsModal] = useState(false);
  const [activeReorderItemId, setActiveReorderItemId] = useState<string | null>(null);

  // Permisos de previsualización para el boceto
  const [previewGuias, setPreviewGuias] = useState(false);

  // Estados para el Selector Interactivo de Horario (Reloj / Rueda)
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [timePickerTargetItemId, setTimePickerTargetItemId] = useState<string | null>(null);
  const [timePickerTab, setTimePickerTab] = useState<'start' | 'end'>('start');
  const [startHour, setStartHour] = useState(8);
  const [startMinute, setStartMinute] = useState(30);
  const [startAmPm, setStartAmPm] = useState<'am' | 'pm'>('am');
  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(15);
  const [endAmPm, setEndAmPm] = useState<'am' | 'pm'>('am');

  const pendingNavigationActionRef = React.useRef<any>(null);
  const isSavingSuccessRef = React.useRef(false);

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(showPreviewModal, () => setShowPreviewModal(false));
  useModalBackHandler(showTrimestreModal, () => setShowTrimestreModal(false));
  useModalBackHandler(showDatePickerModal, () => setShowDatePickerModal(false));
  useModalBackHandler(showDiscardConfirmModal, () => setShowDiscardConfirmModal(false));
  useModalBackHandler(showSaveOptionsModal, () => setShowSaveOptionsModal(false));
  useModalBackHandler(showTimePickerModal, () => setShowTimePickerModal(false));

  // Intercepción con React Navigation (botón físico de Android, swipe gesture y goBack)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (!hasUnsavedChanges || isSavingSuccessRef.current) {
        return;
      }
      e.preventDefault();
      pendingNavigationActionRef.current = e.data.action;
      setShowDiscardConfirmModal(true);
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  const handleSelectDate = (newDate: string) => {
    setDate(newDate);
    setHasUnsavedChanges(true);
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
  const [expandedArea, setExpandedArea] = useState<GrowthAreaKey | null>('corporalidad');

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
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
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
    if (item.location || item.place) setLocation(item.location || item.place);
    if (item.type || item.activity_type) setActivityType(item.type || item.activity_type);
    if (item.objective || item.description) setGeneralObjective(item.objective || item.description);
    if (item.responsible) setParticipantProjection(`Responsable: ${item.responsible}`);
    if (item.id) setPlanActivityId(item.id);
    setIsExtraordinary(false);
    setHasUnsavedChanges(true);
    setShowTrimestreModal(false);
    showAlert('Importado con Éxito', `Se importó "${item.title || item.name || item.activity || 'la actividad'}" desde el Plan Trimestral.`);
  };

  // Manejadores de Objetivos Específicos
  const handleAddObjective = () => {
    setSpecificObjectives([...specificObjectives, '']);
    setHasUnsavedChanges(true);
  };
  const handleUpdateObjective = (text: string, index: number) => {
    const updated = [...specificObjectives];
    updated[index] = text;
    setSpecificObjectives(updated);
    setHasUnsavedChanges(true);
  };
  const handleRemoveObjective = (index: number) => {
    setSpecificObjectives(specificObjectives.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // Manejadores de Metas Específicas
  const handleAddMeta = () => {
    setSpecificMetas([...specificMetas, '']);
    setHasUnsavedChanges(true);
  };
  const handleUpdateMeta = (text: string, index: number) => {
    const updated = [...specificMetas];
    updated[index] = text;
    setSpecificMetas(updated);
    setHasUnsavedChanges(true);
  };
  const handleRemoveMeta = (index: number) => {
    setSpecificMetas(specificMetas.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  // Manejador de ODS (Toggle selección)
  const handleToggleSDG = (number: number) => {
    if (selectedSDGs.includes(number)) {
      setSelectedSDGs(selectedSDGs.filter(n => n !== number));
    } else {
      setSelectedSDGs([...selectedSDGs, number]);
    }
    setHasUnsavedChanges(true);
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
      setHasUnsavedChanges(true);
    }
  };

  const handleRemoveIndicator = (area: GrowthAreaKey, index: number) => {
    const currentList = indicators[area] || [];
    setIndicators({
      ...indicators,
      [area]: currentList.filter((_, i) => i !== index)
    });
    setHasUnsavedChanges(true);
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
    setHasUnsavedChanges(true);
  };

  const handleUpdateScheduleRow = (id: string, field: keyof ActivityScheduleItem, value: string) => {
    setSchedule(
      schedule.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
    setHasUnsavedChanges(true);
  };

  const handleRemoveScheduleRow = (id: string) => {
    if (schedule.length <= 1) {
      showAlert('Aviso', 'El cronograma debe tener al menos una actividad.');
      return;
    }
    setSchedule(schedule.filter(item => item.id !== id));
    setHasUnsavedChanges(true);
  };

  // Reordenar actividades del cronograma (Subir / Bajar / Desplazar)
  const handleMoveScheduleItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= schedule.length) return;
    const newSchedule = [...schedule];
    const temp = newSchedule[index];
    newSchedule[index] = newSchedule[targetIndex];
    newSchedule[targetIndex] = temp;
    setSchedule(newSchedule);
    setHasUnsavedChanges(true);
  };

  // Manejadores del Selector de Horario (Reloj y Rueda)
  const parseTimeStr = (str: string, defaultH: number, defaultM: number, defaultAmPm: 'am' | 'pm') => {
    if (!str) return { h: defaultH, m: defaultM, ap: defaultAmPm };
    const clean = str.trim().toLowerCase();
    const match = clean.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!match) return { h: defaultH, m: defaultM, ap: defaultAmPm };
    const rawH = parseInt(match[1], 10);
    let m = parseInt(match[2], 10);
    if (isNaN(m) || m < 0 || m > 59) m = defaultM;
    let ap: 'am' | 'pm' = match[3] ? (match[3].toLowerCase() as any) : defaultAmPm;

    let h = rawH;
    if (rawH === 0) {
      h = 12;
      ap = 'am';
    } else if (rawH >= 13 && rawH <= 23) {
      h = rawH - 12;
      ap = 'pm';
    } else if (rawH === 12) {
      h = 12;
      if (!match[3]) ap = 'pm';
    } else if (isNaN(rawH) || rawH < 1 || rawH > 12) {
      h = defaultH;
    }
    return { h, m, ap };
  };

  const openTimePickerForItem = (item: ActivityScheduleItem) => {
    setTimePickerTargetItemId(item.id);
    setTimePickerTab('start');
    if (item.timeRange && item.timeRange.includes('-')) {
      const parts = item.timeRange.split('-');
      const startParsed = parseTimeStr(parts[0], 8, 30, 'am');
      const endParsed = parseTimeStr(parts[1], 9, 15, 'am');
      setStartHour(startParsed.h);
      setStartMinute(startParsed.m);
      setStartAmPm(startParsed.ap);
      setEndHour(endParsed.h);
      setEndMinute(endParsed.m);
      setEndAmPm(endParsed.ap);
    } else {
      setStartHour(8);
      setStartMinute(30);
      setStartAmPm('am');
      setEndHour(9);
      setEndMinute(15);
      setEndAmPm('am');
    }
    setShowTimePickerModal(true);
  };

  const applyPresetDuration = (minsToAdd: number) => {
    let h24 = startHour % 12;
    if (startAmPm === 'pm') h24 += 12;
    const totalStartMins = h24 * 60 + startMinute;
    const totalEndMins = (totalStartMins + minsToAdd) % (24 * 60);

    const endH24 = Math.floor(totalEndMins / 60);
    const endM = totalEndMins % 60;
    const endAp: 'am' | 'pm' = endH24 >= 12 ? 'pm' : 'am';
    let endH12 = endH24 % 12;
    if (endH12 === 0) endH12 = 12;

    setEndHour(endH12);
    setEndMinute(endM);
    setEndAmPm(endAp);
  };

  const calculateEstimatedDuration = () => {
    let start24 = startHour % 12;
    if (startAmPm === 'pm') start24 += 12;
    const startMins = start24 * 60 + startMinute;

    let end24 = endHour % 12;
    if (endAmPm === 'pm') end24 += 12;
    let endMins = end24 * 60 + endMinute;

    if (endMins < startMins) {
      endMins += 24 * 60;
    }

    const diff = endMins - startMins;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    if (hours > 0 && mins > 0) return `${hours} h ${mins} min`;
    if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
    return `${mins} min`;
  };

  const handleSaveSelectedTime = () => {
    if (!timePickerTargetItemId) return;
    const pad = (n: number) => String(n).padStart(2, '0');
    const startStr = `${pad(startHour)}:${pad(startMinute)} ${startAmPm}`;
    const endStr = `${pad(endHour)}:${pad(endMinute)} ${endAmPm}`;
    const finalRange = `${startStr} - ${endStr}`;
    handleUpdateScheduleRow(timePickerTargetItemId, 'timeRange', finalRange);
    setShowTimePickerModal(false);
  };

  // Confirmación al descartar cambios
  const handleConfirmDiscard = () => {
    setShowDiscardConfirmModal(false);
    setHasUnsavedChanges(false);
    isSavingSuccessRef.current = true;
    if (!existingPrograma) {
      autoSaveService.removeDraft('active_programa_draft').catch(() => {});
    }
    if (pendingNavigationActionRef.current) {
      navigation.dispatch(pendingNavigationActionRef.current);
    } else {
      navigation.goBack();
    }
  };

  const handleBackPress = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirmModal(true);
    } else {
      navigation.goBack();
    }
  };

  // Validaciones
  const completedAreasCount = Object.keys(GROWTH_AREAS).filter(
    k => (indicators[k as GrowthAreaKey] || []).length > 0
  ).length;

  const handleSave = () => {
    setShowSaveOptionsModal(true);
  };

  const executeSaveWithStatus = async (targetStatus: 'draft' | 'published') => {
    setShowSaveOptionsModal(false);
    setShowDiscardConfirmModal(false);
    const finalTitle = title.trim() || 'Programa de Actividades Scout';
    const finalDate = date.trim() || todayLocal();
    const finalLocation = location.trim() || 'Lugar por definir';
    const finalActivityType = activityType.trim() || 'Actividad Scout';
    const finalProjection = participantProjection.trim() || '4 Jóvenes';

    // Permisos de previsualización para el boceto
    const previewRolesList = targetStatus === 'draft'
      ? ['scouter', 'jefatura', 'jefe_grupo', ...(previewGuias ? ['guias', 'scout', 'clan', 'caminantes', 'jovenes'] : [])]
      : ['all', 'scouter', 'jefatura', 'scout', 'jefe_grupo'];

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
        creatorName: user?.name || (user as any)?.full_name || 'Scouter / Rover',
        groupName: user?.group_name || 'Grupo Scout Orión #84',
        planActivityId,
        isExtraordinary,
        status: targetStatus,
        previewRoles: previewRolesList,
        createdAt: existingPrograma?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await programaService.savePrograma(programaToSave);
      await autoSaveService.removeDraft('active_programa_draft');

      // Notificación automática solo si se publica oficialmente
      if (targetStatus === 'published') {
        notificationService.sendNotification({
          senderId: user?.id,
          groupName: user?.group_name || undefined,
          unit: unit,
          title: `📋 ¡Nuevo Programa Scout Publicado!`,
          message: `${title || 'Actividad Scout'} para el ${date} (${unit.toUpperCase()}). Ya puedes ver la ficha técnica, horarios y materiales.`,
          type: 'program'
        }).catch(() => {});
      }

      setSaving(false);
      setHasUnsavedChanges(false);
      isSavingSuccessRef.current = true;
      
      const titleMsg = targetStatus === 'draft' ? 'Boceto Guardado' : 'Programa Publicado';
      const statusMsg = targetStatus === 'draft'
        ? '📝 El programa se guardó como boceto preliminar. Está disponible para Scouters y Jefatura (y roles autorizados).'
        : (completedAreasCount >= 6
            ? '🎉 Programa publicado y validado oficialmente con las 6 áreas de crecimiento.'
            : `🚀 Programa publicado exitosamente (${completedAreasCount}/6 áreas completadas).`);

      const handleExitAfterSave = () => {
        if (pendingNavigationActionRef.current) {
          navigation.dispatch(pendingNavigationActionRef.current);
          pendingNavigationActionRef.current = null;
        } else if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('ProgramaScout');
        }
      };

      showAlert(titleMsg, statusMsg, [
        {
          text: 'Aceptar',
          onPress: handleExitAfterSave
        }
      ]);

      if (Platform.OS === 'web') {
        setTimeout(handleExitAfterSave, 1200);
      }
    } catch (err: any) {
      setSaving(false);
      console.error('Error al guardar programa:', err);
      showAlert('Aviso', 'El programa se ha guardado localmente en tu dispositivo.');
      setHasUnsavedChanges(false);
      isSavingSuccessRef.current = true;

      if (pendingNavigationActionRef.current) {
        navigation.dispatch(pendingNavigationActionRef.current);
        pendingNavigationActionRef.current = null;
      } else if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('ProgramaScout');
      }
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
    planActivityId,
    isExtraordinary,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* HEADER DE LA PANTALLA */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBackPress}>
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
        {/* BADGES INFORMATIVOS DE VINCULACIÓN AL PLAN TRIMESTRAL O EXTRAORDINARIA */}
        {planActivityId ? (
          <View style={{ backgroundColor: isDarkMode ? '#064e3b' : '#dcfce7', borderWidth: 1, borderColor: '#16a34a', padding: 12, borderRadius: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
            <Calendar size={18} color="#16a34a" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDarkMode ? '#86efac' : '#15803d' }}>
                📅 Actividad Vinculada al Plan Trimestral {passedInitialQuarter ? `(${passedInitialQuarter})` : ''}
              </Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#bbf7d0' : '#166534', marginTop: 1 }}>
                Esta ficha técnica corresponde al cronograma oficial de la unidad.
              </Text>
            </View>
          </View>
        ) : isExtraordinary ? (
          <View style={{ backgroundColor: isDarkMode ? '#3b0764' : '#faf5ff', borderWidth: 1, borderColor: '#9333ea', padding: 12, borderRadius: 12, marginBottom: 14, flexDirection: 'row', alignItems: 'center' }}>
            <Sparkles size={18} color="#9333ea" style={{ marginRight: 8 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDarkMode ? '#d8b4fe' : '#7e22ce' }}>
                🏕️ Actividad Extraordinaria / Otros
              </Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#e9d5ff' : '#6b21a8', marginTop: 1 }}>
                Programa independiente fuera del Plan Trimestral regular.
              </Text>
            </View>
          </View>
        ) : null}

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
          <Text style={[styles.sectionHeading, { color: theme.accentText }]}>📋 1. Datos Generales de la Actividad</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Título / Nombre de la Actividad *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: Hermandad Scout / Presentación de Proyectos"
              placeholderTextColor={theme.subText}
              value={title}
              onChangeText={txt => {
                setTitle(txt);
                setHasUnsavedChanges(true);
              }}
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
                onChangeText={txt => {
                  setLocation(txt);
                  setHasUnsavedChanges(true);
                }}
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
                onChangeText={txt => {
                  setActivityType(txt);
                  setHasUnsavedChanges(true);
                }}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Proyección Participantes</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: 4 Jóvenes"
                placeholderTextColor={theme.subText}
                value={participantProjection}
                onChangeText={txt => {
                  setParticipantProjection(txt);
                  setHasUnsavedChanges(true);
                }}
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
              canSwitchBaseUnit ? (
                <View style={[styles.sinodalBox, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: primaryColor }]}>
                  <Text style={{ fontSize: 11, color: theme.subText, marginBottom: 8 }}>
                    Selecciona la rama para este programa (como Scouter/Jefatura puedes elegir cualquiera):
                  </Text>
                  <View style={styles.unitSelectorRow}>
                    {(['manada', 'tropa', 'caminantes', 'clan'] as const).map(u => {
                      const isSelected = unit === u;
                      return (
                        <TouchableOpacity
                          key={u}
                          style={[
                            styles.unitChip,
                            isSelected && { backgroundColor: primaryColor, borderColor: primaryColor },
                            { borderColor: theme.border }
                          ]}
                          onPress={() => {
                            setUnit(u);
                            setSelectedUnits([u]);
                            setHasUnsavedChanges(true);
                          }}
                        >
                          <Text
                            style={[
                              styles.unitChipText,
                              isSelected ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }
                            ]}
                          >
                            {isSelected ? `✓ ${u.toUpperCase()}` : u.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ) : (
                /* MODO NORMAL: Tu unidad fijada */
                <View style={[styles.fixedUnitBox, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
                  <Text style={[styles.fixedUnitText, { color: theme.accentText }]}>
                    ⚜️ Rama: <Text style={{ fontWeight: 'bold' }}>{unit.toUpperCase()}</Text>
                  </Text>
                  <View style={[styles.fixedUnitBadge, { backgroundColor: primaryColor }]}>
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>Tu Unidad</Text>
                  </View>
                </View>
              )
            ) : (
              /* MODO SINODAL: Selección múltiple con tu unidad bloqueada */
              <View style={[styles.sinodalBox, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: '#7c3aed' }]}>
                <Text style={{ fontSize: 11, color: theme.subText, marginBottom: 8 }}>
                  Selecciona las otras unidades participantes (tu unidad <Text style={{ fontWeight: 'bold', color: theme.accentText }}>{unit.toUpperCase()}</Text> está fija):
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
          <Text style={[styles.sectionHeading, { color: theme.accentText }]}>🎯 2. Objetivos y Metas</Text>

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.text }]}>Objetivo General</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
              placeholder="Describe el propósito formativo central de la actividad..."
              placeholderTextColor={theme.subText}
              multiline
              numberOfLines={3}
              value={generalObjective}
              onChangeText={txt => {
                setGeneralObjective(txt);
                setHasUnsavedChanges(true);
              }}
            />
          </View>

          {/* Objetivos Específicos */}
          <View style={styles.fieldGroup}>
            <View style={styles.labelWithAction}>
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Objetivos Específicos</Text>
              <TouchableOpacity style={styles.addSmallBtn} onPress={handleAddObjective}>
                <Plus size={14} color={primaryColor} />
                <Text style={[styles.addSmallBtnText, { color: theme.accentText }]}>Agregar</Text>
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
                <Text style={[styles.addSmallBtnText, { color: theme.accentText }]}>Agregar</Text>
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
            <Text style={[styles.sectionHeading, { color: theme.accentText }]}>🌍 3. Objetivos de Desarrollo Sostenible (ODS)</Text>
            <View style={[styles.countBadge, { backgroundColor: primaryColor + '20' }]}>
              <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 11 }}>
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
            <Text style={[styles.sectionHeading, { color: theme.accentText }]}>📊 4. Indicadores de Logro Oficiales</Text>
            <View style={[styles.countBadge, { backgroundColor: completedAreasCount === 6 ? '#dcfce7' : '#fee2e2' }]}>
              <Text style={{ color: completedAreasCount === 6 ? '#15803d' : '#b91c1c', fontWeight: 'bold', fontSize: 11 }}>
                {completedAreasCount}/6 Áreas Listas
              </Text>
            </View>
          </View>

          <Text style={[styles.subTextHint, { color: theme.subText }]}>
            Selecciona al menos 1 indicador en cada una de las 6 áreas para{' '}
            <Text style={{ fontWeight: 'bold', color: theme.accentText }}>
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
                        onPress={() => setIndicatorPickerArea(area.key)}
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
            <Text style={[styles.sectionHeading, { color: theme.accentText }]}>⏱️ 5. Cronograma de Actividades</Text>
            <TouchableOpacity style={[styles.addScheduleBtn, { backgroundColor: primaryColor }]} onPress={handleAddScheduleRow}>
              <Plus size={14} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.addScheduleBtnText}>Agregar Actividad</Text>
            </TouchableOpacity>
          </View>

          {schedule.map((item, index) => {
            const isBeingReordered = activeReorderItemId === item.id;
            return (
              <View
                key={item.id}
                style={[
                  styles.scheduleCardItem,
                  { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: isBeingReordered ? primaryColor : theme.border },
                  isBeingReordered && {
                    transform: [{ scale: 1.025 }],
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.35,
                    shadowRadius: 10,
                    elevation: 10,
                    borderWidth: 2,
                    zIndex: 99
                  }
                ]}
              >
                {/* Cabecera del item con Reordenamiento */}
                <View style={styles.scheduleItemHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.dragGripBtn, { backgroundColor: isBeingReordered ? primaryColor : (primaryColor + '18') }]}
                      onLongPress={() => setActiveReorderItemId(isBeingReordered ? null : item.id)}
                      onPress={() => setActiveReorderItemId(isBeingReordered ? null : item.id)}
                      activeOpacity={0.7}
                    >
                      <GripVertical size={16} color={isBeingReordered ? '#ffffff' : primaryColor} />
                      <Text style={[styles.scheduleItemIndex, { color: isBeingReordered ? '#ffffff' : primaryColor }]}>#{index + 1}</Text>
                    </TouchableOpacity>

                    {/* Botones de subida y bajada rápida */}
                    <View style={styles.reorderButtonsRow}>
                      <TouchableOpacity
                        style={[
                          styles.reorderArrowBtn,
                          { opacity: index === 0 ? 0.3 : 1, backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }
                        ]}
                        disabled={index === 0}
                        onPress={() => handleMoveScheduleItem(index, 'up')}
                      >
                        <ChevronUp size={16} color={theme.text} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.reorderArrowBtn,
                          { opacity: index === schedule.length - 1 ? 0.3 : 1, backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }
                        ]}
                        disabled={index === schedule.length - 1}
                        onPress={() => handleMoveScheduleItem(index, 'down')}
                      >
                        <ChevronDown size={16} color={theme.text} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {isBeingReordered ? (
                      <View style={[styles.reorderingBanner, { backgroundColor: primaryColor }]}>
                        <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold' }}>En movimiento</Text>
                      </View>
                    ) : (
                      <Text style={{ fontSize: 10, color: theme.subText }}>Mantén presionado para mover</Text>
                    )}
                    <TouchableOpacity onPress={() => handleRemoveScheduleRow(item.id)} style={{ padding: 4 }}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Si está en modo activo de reordenamiento por Long Press: barra de ayuda visual */}
                {isBeingReordered && (
                  <View style={[styles.reorderActiveBar, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}>
                    <Text style={{ fontSize: 11, color: theme.accentText, fontWeight: 'bold' }}>
                      ✨ Moviendo actividad #{index + 1}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                      {index > 0 && (
                        <TouchableOpacity
                          style={[styles.movePositionBtn, { backgroundColor: primaryColor }]}
                          onPress={() => handleMoveScheduleItem(index, 'up')}
                        >
                          <ChevronUp size={14} color="#ffffff" />
                          <Text style={styles.movePositionBtnText}>Mover arriba (#{index})</Text>
                        </TouchableOpacity>
                      )}
                      {index < schedule.length - 1 && (
                        <TouchableOpacity
                          style={[styles.movePositionBtn, { backgroundColor: primaryColor }]}
                          onPress={() => handleMoveScheduleItem(index, 'down')}
                        >
                          <ChevronDown size={14} color="#ffffff" />
                          <Text style={styles.movePositionBtnText}>Mover abajo (#{index + 2})</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.movePositionBtn, { backgroundColor: '#16a34a' }]}
                        onPress={() => setActiveReorderItemId(null)}
                      >
                        <Check size={14} color="#ffffff" />
                        <Text style={styles.movePositionBtnText}>Listo</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.rowTwo}>
                  <View style={[styles.fieldGroup, { flex: 1, marginRight: 6 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={[styles.fieldLabelSmall, { color: theme.text }]}>Horario (AM/PM)</Text>
                      <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 1, paddingHorizontal: 4 }}
                        onPress={() => openTimePickerForItem(item)}
                      >
                        <Clock size={11} color={primaryColor} />
                        <Text style={{ fontSize: 10, color: theme.accentText, fontWeight: 'bold' }}>Reloj</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => openTimePickerForItem(item)}
                      style={[
                        styles.textInputSmall,
                        {
                          backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
                          borderColor: theme.border,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: item.timeRange ? theme.text : theme.subText,
                          fontWeight: item.timeRange ? '600' : 'normal'
                        }}
                        numberOfLines={1}
                      >
                        {item.timeRange || 'Seleccionar horario...'}
                      </Text>
                      <Clock size={13} color={primaryColor} />
                    </TouchableOpacity>
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
            );
          })}
        </View>

        {/* 6. SECCIÓN: NOTAS IMPORTANTES */}
        <View style={[styles.card, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={[styles.sectionHeading, { color: theme.accentText }]}>📝 6. Notas Importantes / Recomendaciones</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', color: theme.text, borderColor: theme.border }]}
            placeholder="Ej: Cada Rover debe tener dominio del tema. Traer hidratación y uniforme completo..."
            placeholderTextColor={theme.subText}
            multiline
            numberOfLines={3}
            value={importantNotes}
            onChangeText={txt => {
              setImportantNotes(txt);
              setHasUnsavedChanges(true);
            }}
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
      <IndicatorPickerModal
        area={indicatorPickerArea}
        units={activeUnitsForIndicators}
        unitsLabel={isSinodal ? selectedUnits.map(u => u.toUpperCase()).join(' + ') + ' (Sinodal)' : unit.toUpperCase()}
        stages={activeStages}
        selected={indicatorPickerArea ? indicators[indicatorPickerArea] || [] : []}
        onAdd={(text) => indicatorPickerArea && handleAddIndicator(indicatorPickerArea, text)}
        onRemove={(text) => {
          if (!indicatorPickerArea) return;
          setIndicators({
            ...indicators,
            [indicatorPickerArea]: (indicators[indicatorPickerArea] || []).filter(t => t !== text)
          });
          setHasUnsavedChanges(true);
        }}
        onClose={() => setIndicatorPickerArea(null)}
      />

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
                    <Text style={{ color: theme.accentText, fontWeight: 'bold', fontSize: 12 }}>Importar →</Text>
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
      <DatePickerModal
        visible={showDatePickerModal}
        value={date}
        onSelect={handleSelectDate}
        onClose={() => setShowDatePickerModal(false)}
      />

      {/* MODAL DE VISTA PREVIA E IMPRESIÓN OFICIAL */}
      <ProgramaPdfPreviewModal
        visible={showPreviewModal}
        programa={currentProgramaData}
        onClose={() => setShowPreviewModal(false)}
      />

      {/* MODAL DE CONFIRMACIÓN AL DESCARTAR CAMBIOS (Gesto Atrás / Botón Volver) */}
      <Modal visible={showDiscardConfirmModal} animationType="fade" transparent onRequestClose={() => setShowDiscardConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.discardModalCard, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: isDarkMode ? '#451a03' : '#fef3c7', justifyContent: 'center', alignItems: 'center', marginBottom: 10 }}>
                <AlertTriangle size={28} color="#d97706" />
              </View>
              <Text style={[styles.discardTitle, { color: theme.text }]}>¿Salir sin guardar cambios?</Text>
            </View>

            <Text style={[styles.discardText, { color: theme.subText, textAlign: 'center' }]}>
              Tienes modificaciones en este programa de actividades. Si sales ahora, los cambios no guardados se perderán.
            </Text>

            <TouchableOpacity
              style={[styles.discardBtn, { backgroundColor: primaryColor }]}
              onPress={() => setShowDiscardConfirmModal(false)}
            >
              <Text style={[styles.discardBtnText, { color: '#ffffff' }]}>Seguir editando</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.discardBtn, { backgroundColor: isDarkMode ? '#332211' : '#fef3c7', borderWidth: 1, borderColor: '#f59e0b' }]}
              onPress={() => executeSaveWithStatus('draft')}
            >
              <Text style={[styles.discardBtnText, { color: '#d97706' }]}>Guardar como boceto y salir</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.discardBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
              onPress={handleConfirmDiscard}
            >
              <Text style={[styles.discardBtnText, { color: '#ef4444' }]}>Descartar cambios y salir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL DE OPCIONES DE GUARDADO (Boceto vs Publicación Final) */}
      <Modal visible={showSaveOptionsModal} animationType="slide" transparent onRequestClose={() => setShowSaveOptionsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.saveOptionsModalSheet, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <Text style={[styles.saveOptionsModalTitle, { color: theme.text }]}>Guardar Programa de Actividades</Text>
              <TouchableOpacity onPress={() => setShowSaveOptionsModal(false)} style={{ padding: 4 }}>
                <X size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 16 }}>
              Selecciona si deseas guardar un boceto preliminar de trabajo o publicar el programa oficial para la unidad:
            </Text>

            <ScrollView style={{ maxHeight: 440 }}>
              {/* OPCIÓN 1: GUARDAR COMO BOCETO */}
              <View style={[styles.saveOptionCard, { backgroundColor: isDarkMode ? '#27272a' : '#fefce8', borderColor: '#f59e0b' }]}>
                <View style={[styles.saveOptionBadge, { backgroundColor: '#f59e0b25' }]}>
                  <Text style={[styles.saveOptionBadgeText, { color: '#d97706' }]}>📝 BOCETO / BORRADOR</Text>
                </View>
                <Text style={[styles.saveOptionTitle, { color: theme.text }]}>Guardar como Boceto</Text>
                <Text style={[styles.saveOptionDesc, { color: theme.subText }]}>
                  No se publicará para toda la unidad aún. Quedará guardado de forma privada para que puedas seguir editándolo.
                </Text>

                {/* Apartado de Previsualización y Permisos */}
                <View style={[styles.previewRoleBox, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
                  <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                    ¿Quiénes pueden previsualizar este boceto?
                  </Text>
                  
                  {/* Rol Scouters y Jefe de Grupo (Siempre activo y bloqueado con candado) */}
                  <View style={styles.previewRoleRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Lock size={13} color="#16a34a" />
                      <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>Scouter y jefe de grupo</Text>
                    </View>
                    <View style={{ backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#15803d' }}>✓ Siempre Activo</Text>
                    </View>
                  </View>

                  {/* Rol Jóvenes autorizados */}
                  <TouchableOpacity
                    style={[styles.previewRoleRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.border }]}
                    onPress={() => setPreviewGuias(!previewGuias)}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <Users size={13} color={primaryColor} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>Jóvenes autorizados</Text>
                        <Text style={{ fontSize: 10, color: theme.subText }}>Permitir a otros jóvenes de la unidad revisar el boceto</Text>
                      </View>
                    </View>
                    <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: previewGuias ? primaryColor : theme.subText, backgroundColor: previewGuias ? primaryColor : 'transparent', justifyContent: 'center', alignItems: 'center' }}>
                      {previewGuias && <Check size={13} color="#ffffff" />}
                    </View>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.btnOptionExecute, { backgroundColor: '#d97706' }]}
                  onPress={() => executeSaveWithStatus('draft')}
                  disabled={saving}
                >
                  <Save size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnOptionExecuteText}>Guardar Boceto</Text>
                </TouchableOpacity>
              </View>

              {/* OPCIÓN 2: GUARDAR Y PUBLICAR OFICIALMENTE */}
              <View style={[styles.saveOptionCard, { backgroundColor: isDarkMode ? '#27272a' : '#f0fdf4', borderColor: '#16a34a' }]}>
                <View style={[styles.saveOptionBadge, { backgroundColor: '#16a34a25' }]}>
                  <Text style={[styles.saveOptionBadgeText, { color: '#16a34a' }]}>🚀 PUBLICACIÓN OFICIAL</Text>
                </View>
                <Text style={[styles.saveOptionTitle, { color: theme.text }]}>Guardar y Publicar Final</Text>
                <Text style={[styles.saveOptionDesc, { color: theme.subText }]}>
                  El programa quedará disponible de inmediato para todos los integrantes de la unidad, scouters y jefatura, y se enviará la notificación oficial.
                </Text>

                <TouchableOpacity
                  style={[styles.btnOptionExecute, { backgroundColor: '#16a34a' }]}
                  onPress={() => executeSaveWithStatus('published')}
                  disabled={saving}
                >
                  <Send size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnOptionExecuteText}>Publicar Programa Final</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE SELECTOR DE HORARIO INTERACTIVO (RELOJ Y RUEDA) */}
      <Modal visible={showTimePickerModal} animationType="slide" transparent onRequestClose={() => setShowTimePickerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.timePickerModalCard, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Clock size={20} color={primaryColor} />
                <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Horario de Actividad</Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimePickerModal(false)} style={{ padding: 4 }}>
                <X size={20} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* Pestañas: Hora de Inicio y Hora de Fin */}
            <View style={[styles.timePickerTabRow, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
              <TouchableOpacity
                style={[
                  styles.timePickerTabBtn,
                  timePickerTab === 'start' && { backgroundColor: primaryColor }
                ]}
                onPress={() => setTimePickerTab('start')}
              >
                <Text style={[styles.timePickerTabSub, timePickerTab === 'start' ? { color: '#ffffffcc' } : { color: theme.subText }]}>
                  Inicio
                </Text>
                <Text style={[styles.timePickerTabMain, timePickerTab === 'start' ? { color: '#ffffff' } : { color: theme.text }]}>
                  {String(startHour).padStart(2, '0')}:{String(startMinute).padStart(2, '0')} {startAmPm.toUpperCase()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.timePickerTabBtn,
                  timePickerTab === 'end' && { backgroundColor: primaryColor }
                ]}
                onPress={() => setTimePickerTab('end')}
              >
                <Text style={[styles.timePickerTabSub, timePickerTab === 'end' ? { color: '#ffffffcc' } : { color: theme.subText }]}>
                  Fin
                </Text>
                <Text style={[styles.timePickerTabMain, timePickerTab === 'end' ? { color: '#ffffff' } : { color: theme.text }]}>
                  {String(endHour).padStart(2, '0')}:{String(endMinute).padStart(2, '0')} {endAmPm.toUpperCase()}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Display grande de la hora activa con selector AM / PM */}
              <View style={[styles.activeTimeDisplayCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
                <View style={{ alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 11, color: theme.subText, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 'bold' }}>
                    {timePickerTab === 'start' ? 'Hora de Inicio' : 'Hora de Fin'}
                  </Text>
                  <Text style={[styles.largeClockDigits, { color: theme.accentText }]}>
                    {String(timePickerTab === 'start' ? startHour : endHour).padStart(2, '0')}:{String(timePickerTab === 'start' ? startMinute : endMinute).padStart(2, '0')}
                  </Text>
                </View>

                {/* Selector AM / PM */}
                <View style={[styles.amPmSelector, { borderColor: theme.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.amPmBtn,
                      (timePickerTab === 'start' ? startAmPm : endAmPm) === 'am' && { backgroundColor: primaryColor }
                    ]}
                    onPress={() => {
                      if (timePickerTab === 'start') setStartAmPm('am');
                      else setEndAmPm('am');
                    }}
                  >
                    <Text style={[
                      styles.amPmBtnText,
                      (timePickerTab === 'start' ? startAmPm : endAmPm) === 'am' ? { color: '#ffffff' } : { color: theme.text }
                    ]}>AM</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.amPmBtn,
                      (timePickerTab === 'start' ? startAmPm : endAmPm) === 'pm' && { backgroundColor: primaryColor }
                    ]}
                    onPress={() => {
                      if (timePickerTab === 'start') setStartAmPm('pm');
                      else setEndAmPm('pm');
                    }}
                  >
                    <Text style={[
                      styles.amPmBtnText,
                      (timePickerTab === 'start' ? startAmPm : endAmPm) === 'pm' ? { color: '#ffffff' } : { color: theme.text }
                    ]}>PM</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Rueda de Horas (1 a 12) */}
              <View style={styles.timeSectionBlock}>
                <Text style={[styles.timeSectionTitle, { color: theme.text }]}>🕐 Horas (1 a 12)</Text>
                <View style={styles.hoursGrid}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => {
                    const isSelected = (timePickerTab === 'start' ? startHour : endHour) === h;
                    return (
                      <TouchableOpacity
                        key={h}
                        style={[
                          styles.hourCircleBtn,
                          isSelected
                            ? { backgroundColor: primaryColor, borderColor: primaryColor }
                            : { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }
                        ]}
                        onPress={() => {
                          if (timePickerTab === 'start') setStartHour(h);
                          else setEndHour(h);
                        }}
                      >
                        <Text style={[styles.hourCircleText, isSelected ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }]}>
                          {h}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Rueda de Minutos (00 a 55 en saltos de 5, y ajuste fino +-1 min) */}
              <View style={styles.timeSectionBlock}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={[styles.timeSectionTitle, { color: theme.text }]}>⏱️ Minutos</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={[styles.minuteAdjustBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }]}
                      onPress={() => {
                        if (timePickerTab === 'start') {
                          setStartMinute(prev => (prev === 0 ? 59 : prev - 1));
                        } else {
                          setEndMinute(prev => (prev === 0 ? 59 : prev - 1));
                        }
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold' }}>-1 min</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.minuteAdjustBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }]}
                      onPress={() => {
                        if (timePickerTab === 'start') {
                          setStartMinute(prev => (prev === 59 ? 0 : prev + 1));
                        } else {
                          setEndMinute(prev => (prev === 59 ? 0 : prev + 1));
                        }
                      }}
                    >
                      <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold' }}>+1 min</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.minutesGrid}>
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(m => {
                    const isSelected = (timePickerTab === 'start' ? startMinute : endMinute) === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.minuteChipBtn,
                          isSelected
                            ? { backgroundColor: primaryColor, borderColor: primaryColor }
                            : { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border }
                        ]}
                        onPress={() => {
                          if (timePickerTab === 'start') setStartMinute(m);
                          else setEndMinute(m);
                        }}
                      >
                        <Text style={[styles.minuteChipText, isSelected ? { color: '#ffffff', fontWeight: 'bold' } : { color: theme.text }]}>
                          :{String(m).padStart(2, '0')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Botones de Duración Rápida (Presets scouts automáticos para Hora Fin) */}
              <View style={[styles.timeSectionBlock, { borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 10 }]}>
                <Text style={[styles.timeSectionTitle, { color: theme.text }]}>⚡ Duración Rápida (Calcula Hora Fin)</Text>
                <View style={styles.presetsRow}>
                  {[
                    { label: '+15 min', mins: 15 },
                    { label: '+30 min', mins: 30 },
                    { label: '+45 min', mins: 45 },
                    { label: '+1 hora', mins: 60 },
                    { label: '+1h 30m', mins: 90 },
                    { label: '+2 horas', mins: 120 }
                  ].map(preset => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetChip, { backgroundColor: primaryColor + '15', borderColor: primaryColor }]}
                      onPress={() => applyPresetDuration(preset.mins)}
                    >
                      <Text style={[styles.presetChipText, { color: theme.accentText }]}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Resumen de Duración */}
              <View style={[styles.durationSummaryBox, { backgroundColor: isDarkMode ? '#27272a' : '#f0fdf4', borderColor: '#16a34a' }]}>
                <Clock size={14} color="#16a34a" />
                <Text style={{ fontSize: 12, color: theme.text, flex: 1 }}>
                  Horario: <Text style={{ fontWeight: 'bold', color: theme.accentText }}>
                    {String(startHour).padStart(2, '0')}:{String(startMinute).padStart(2, '0')} {startAmPm} - {String(endHour).padStart(2, '0')}:{String(endMinute).padStart(2, '0')} {endAmPm}
                  </Text> • Duración: <Text style={{ fontWeight: 'bold', color: '#16a34a' }}>{calculateEstimatedDuration()}</Text>
                </Text>
              </View>
            </ScrollView>

            {/* Botones de Acción */}
            <View style={styles.timePickerActionRow}>
              <TouchableOpacity
                style={[styles.timePickerCancelBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                onPress={() => setShowTimePickerModal(false)}
              >
                <Text style={{ color: theme.subText, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.timePickerApplyBtn, { backgroundColor: primaryColor }]}
                onPress={handleSaveSelectedTime}
              >
                <Check size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13 }}>Aplicar Horario</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
