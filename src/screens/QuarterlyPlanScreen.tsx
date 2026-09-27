import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Platform,
  Alert
} from 'react-native';
import { Compass, Edit3, MessageSquare, Plus, CheckCircle, AlertCircle, X, Shield, Calendar as CalendarIcon, Trash2, Check, Eye, Download, ChevronLeft, ChevronRight, Copy, FileSpreadsheet, History, ArrowLeft } from 'lucide-react-native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { dataService } from '../lib/dataService';
import { supabase } from '../lib/supabaseClient';
import { notificationService } from '../services/notificationService';
import { autoSaveService } from '../services/autoSaveService';
import { programaService } from '../lib/programaService';
import { QUARTERS } from '../data/trimestresData';
import { colors, UNIT_COLORS } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { navigateBackOrHome } from '../utils/navigationHelper';

interface ActivityRow {
  id: string;
  month: string;
  day: string;
  activity: string;
  place: string;
  responsible: string;
  planB?: string;
  isModified?: boolean;
  originalActivity?: string;
  modifiedReason?: string;
  status?: 'programada' | 'realizada' | 'modificada' | 'suspendida';
  programId?: string;
}

const MONTH_NAMES_BY_QUARTER: Record<string, string[]> = {
  Q1: ['Enero', 'Febrero', 'Marzo'],
  Q2: ['Abril', 'Mayo', 'Junio'],
  Q3: ['Julio', 'Agosto', 'Septiembre'],
  Q4: ['Octubre', 'Noviembre', 'Diciembre'],
};

const ALL_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const getInitialDateForMonth = (monthName: string, year: number): string => {
  const idx = ALL_MONTHS.indexOf(monthName);
  const mStr = String(idx >= 0 ? idx + 1 : 1).padStart(2, '0');
  return `${year}-${mStr}-15`;
};

export default function QuarterlyPlanScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const isScouter = user?.role === 'scouter' || user?.role === 'jefe_grupo';
  const isJefeGrupo = user?.role === 'jefe_grupo';

  // Unidad inicial calculada inteligentemente según rol y parámetros de ruta
  const userUnitStr = (user?.unit as string) || '';
  const isYouthUnit = userUnitStr === 'clan' || userUnitStr === 'tropa' || userUnitStr === 'manada' || userUnitStr === 'comunidad' || userUnitStr === 'caminantes';
  const defaultUnit = route?.params?.unit || (isYouthUnit ? (userUnitStr === 'caminantes' ? 'comunidad' : userUnitStr) : 'clan');

  const [selectedQuarter, setSelectedQuarter] = useState<string>(route?.params?.quarter || 'Q1');
  // Año actual en tiempo real en todo momento
  const [selectedYear, setSelectedYear] = useState<number>(route?.params?.year || new Date().getFullYear());
  const [unitFilter, setUnitFilter] = useState<string>(defaultUnit);
  const [loading, setLoading] = useState(true);

  // Selector de Vista: Edición (edit) o Previsualización Oficial (preview)
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // Selector de Día con Calendario
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [targetActId, setTargetActId] = useState<string | null>(null);
  const [targetMonthName, setTargetMonthName] = useState<string>('Enero');

  // Modal de Histórico Anual
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [historyPlans, setHistoryPlans] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal de Modificación / Reprogramación de Actividad ("Modificado a...")
  const [modifyModalVisible, setModifyModalVisible] = useState(false);
  const [actToModify, setActToModify] = useState<ActivityRow | null>(null);
  const [newActivityName, setNewActivityName] = useState('');
  const [modificationReason, setModificationReason] = useState('');

  // Estados de Evaluación CIP de Fin de Ciclo
  const [evaluationConclusions, setEvaluationConclusions] = useState('');
  const [evaluationGoalsReached, setEvaluationGoalsReached] = useState('');

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(dayPickerVisible, () => setDayPickerVisible(false));
  useModalBackHandler(historyModalVisible, () => setHistoryModalVisible(false));
  useModalBackHandler(modifyModalVisible, () => setModifyModalVisible(false));

  // Campos del Documento Oficial Scout
  const [elaboratedBy, setElaboratedBy] = useState('');
  const [generalObjective, setGeneralObjective] = useState(''); // ÚNICO OBJETIVO GENERAL
  const [trimestreGoalsList, setTrimestreGoalsList] = useState<string[]>(['']);
  const [specificObjectivesList, setSpecificObjectivesList] = useState<string[]>(['']);

  // 6 Áreas de Crecimiento Educativo
  const [educationalAreas, setEducationalAreas] = useState<Record<string, boolean>>({
    corporalidad: true,
    creatividad: true,
    afectividad: true,
    espiritualidad: true,
    caracter: true,
    sociabilidad: true,
  });

  // Actividades por Mes
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  const [scoutPlan, setScoutPlan] = useState<any>(null);
  const [savingScout, setSavingScout] = useState(false);

  // Estados para modo Scouter / Jefe de Grupo
  const [unitPlans, setUnitPlans] = useState<any[]>([]);
  const [selectedScoutItem, setSelectedScoutItem] = useState<any>(null);
  const [scouterFeedback, setScouterFeedback] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [scouterEditUnlocked, setScouterEditUnlocked] = useState(false);

  useModalBackHandler(selectedScoutItem !== null, () => setSelectedScoutItem(null));

  const currentMonths = MONTH_NAMES_BY_QUARTER[selectedQuarter] || [];
  const activeQuarterObj = QUARTERS.find(q => q.id === selectedQuarter);

  // Obtener de forma infalible la unidad activa actual
  const getActiveUnit = useCallback((): string => {
    if (unitFilter && unitFilter !== 'all') {
      return unitFilter;
    }
    const uStr = (user?.unit as string) || '';
    if (uStr === 'clan' || uStr === 'tropa' || uStr === 'manada' || uStr === 'comunidad' || uStr === 'caminantes') {
      return uStr === 'caminantes' ? 'comunidad' : uStr;
    }
    return 'clan';
  }, [unitFilter, user?.unit]);

  // Referencias para control infalible de cambios y prevención de sobreescritura
  const parseStringToList = (val: any): string[] => {
    if (!val) return [''];
    if (Array.isArray(val)) return val.length > 0 ? val : [''];
    if (typeof val === 'string') {
      const split = val.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      return split.length > 0 ? split : [val];
    }
    return [''];
  };

  const getDefaultActivitiesForQuarter = (quarterId: string, userName: string): ActivityRow[] => {
    const months = MONTH_NAMES_BY_QUARTER[quarterId] || ['Mes 1', 'Mes 2', 'Mes 3'];
    const m1 = months[0];
    const m2 = months[1];
    const m3 = months[2];

    return [
      { id: String(Date.now() + 1), month: m1, day: '5', activity: 'Marea de plástico', place: 'Sede', responsible: userName || 'Rovers' },
      { id: String(Date.now() + 2), month: m1, day: '12', activity: 'Marea de plástico', place: 'Sede', responsible: userName || 'Rovers' },
      { id: String(Date.now() + 3), month: m1, day: '26', activity: 'Marea de plástico', place: 'Playa', responsible: 'Scter. Julio / Scter. Lizbeth' },

      { id: String(Date.now() + 4), month: m2, day: '3', activity: 'Recolección de fondos', place: 'Parcela 25', responsible: 'Scter. Julio / Scter. Lizbeth' },
      { id: String(Date.now() + 5), month: m2, day: '10', activity: 'Museo del Transporte / Scout', place: 'Caracas', responsible: 'Scter. Julio / Scter. Lizbeth' },
      { id: String(Date.now() + 6), month: m2, day: '17', activity: 'Noche de Rover', place: 'Hoyo de la puerta', responsible: userName || 'Rovers' },

      { id: String(Date.now() + 7), month: m3, day: '7', activity: 'Excursión con Tropa', place: 'Valle Arriba', responsible: 'Scter. Julio / Scter. Lizbeth' },
      { id: String(Date.now() + 8), month: m3, day: '14', activity: 'Aniversario de Orión', place: 'Paramacay', responsible: 'Scter. Julio / Scter. Lizbeth' },
      { id: String(Date.now() + 9), month: m3, day: '28', activity: 'Fuego y cocina', place: 'Playa', responsible: 'Scter. Julio / Scter. Lizbeth' },
    ];
  };

  // Referencias para control infalible de cambios y prevención de sobreescritura
  const isDirtyRef = useRef(false);
  const loadedQuarterRef = useRef<string>(selectedQuarter);
  const loadedYearRef = useRef<number>(selectedYear);
  const loadedUnitRef = useRef<string>('clan');
  const hasLoadedOnceRef = useRef(false);

  const getDraftKey = (quarter?: string, year?: number, unit?: string) => {
    const q = quarter || selectedQuarter;
    const y = year || selectedYear;
    const targetUnit = unit || getActiveUnit();
    return `quarterly_${user?.group_name || 'default'}_${targetUnit}_${q}_${y}`;
  };

  const loadData = async (force: boolean = false) => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Si es una recarga de fondo y hay cambios locales activos, NO sobreescribir
    if (!force && isDirtyRef.current) {
      console.log('[QuarterlyPlan] Omitiendo recarga de fondo porque hay cambios locales activos sin guardar.');
      return;
    }

    const targetUnit = getActiveUnit();
    loadedQuarterRef.current = selectedQuarter;
    loadedYearRef.current = selectedYear;
    loadedUnitRef.current = targetUnit;

    const draftKey = getDraftKey(selectedQuarter, selectedYear, targetUnit);

    // 1. CARGA INMEDIATA LOCAL-FIRST (0ms de espera perceptiva)
    let foundLocal = false;
    try {
      let localDraft: any = await autoSaveService.loadDraft(draftKey);
      if (!localDraft) {
        try {
          const oldRaw = await AsyncStorage.getItem(`@draft_${draftKey}`);
          if (oldRaw) localDraft = JSON.parse(oldRaw);
        } catch {}
      }

      if (localDraft) {
        foundLocal = true;
        setElaboratedBy(localDraft.elaboratedBy || localDraft.elaborated_by || '');
        setGeneralObjective(localDraft.generalObjective || localDraft.general_objectives || localDraft.goals || '');
        setTrimestreGoalsList(parseStringToList(localDraft.trimestreGoalsList || localDraft.trimestre_goals));
        setSpecificObjectivesList(parseStringToList(localDraft.specificObjectivesList || localDraft.specific_objectives));
        if (localDraft.educationalAreas || localDraft.educational_areas) {
          setEducationalAreas(localDraft.educationalAreas || localDraft.educational_areas);
        }
        const acts = localDraft.activities || localDraft.monthly_activities;
        if (acts && Array.isArray(acts)) {
          setActivities(acts);
        }
        // Desactivar spinner de inmediato para que el usuario nunca espere a la base de datos
        setLoading(false);
      }
    } catch (localErr) {
      console.warn('Aviso cargando borrador local:', localErr);
    }

    // Si no había borrador local y es primera carga, mostrar spinner mientras consulta red
    if (force && !foundLocal && !hasLoadedOnceRef.current) {
      setLoading(true);
    }

    try {
      // 2. Cargar plan compartido desde Supabase con timeout de seguridad (3.5s)
      const fetchPromise = (async () => {
        const shared = await dataService.getUnitSharedQuarterlyPlan(
          user.group_name || '',
          targetUnit,
          selectedQuarter,
          selectedYear
        );
        if (shared) return shared;
        return await dataService.getQuarterlyPlan(user.id, selectedQuarter, selectedYear);
      })();

      const timeoutPromise = new Promise<null>((res) => setTimeout(() => res(null), 3500));
      const remotePlan: any = await Promise.race([fetchPromise, timeoutPromise]);

      hasLoadedOnceRef.current = true;

      // Si el usuario comenzó a escribir mientras la red respondía, NO pisar sus cambios
      if (isDirtyRef.current) {
        return;
      }

      // Re-verificar si hay borrador local
      let currentLocal: any = await autoSaveService.loadDraft(draftKey);
      let chosenData: any = null;

      // AUTORIDAD DE DATOS COMPARTIDOS:
      // Si existe un remotePlan en Supabase, ese es el plan oficial y colaborativo de la unidad.
      // Un borrador local no guardado solo se prioriza si el usuario estaba editando activamente.
      if (remotePlan) {
        chosenData = remotePlan;
        setScoutPlan(remotePlan);
      } else if (currentLocal) {
        chosenData = currentLocal;
        setScoutPlan(null);
      }

      if (chosenData) {
        // PRESERVAR EL AUTOR / SCOUTER OFICIAL:
        // Si el plan compartido en la nube tiene elaborado_by, ESE es el autor legítimo del Scouter.
        // JAMÁS reemplazarlo por user.name si otro usuario simplemente está visualizando o editando.
        const officialElaboratedBy = remotePlan?.elaborated_by || chosenData.elaborated_by || chosenData.elaboratedBy || '';
        setElaboratedBy(officialElaboratedBy || (isScouter ? (user.name || '') : 'Jefatura de Unidad'));
        setGeneralObjective(chosenData.general_objectives || chosenData.generalObjective || chosenData.goals || '');
        setTrimestreGoalsList(parseStringToList(chosenData.trimestre_goals || chosenData.trimestreGoalsList));
        setSpecificObjectivesList(parseStringToList(chosenData.specific_objectives || chosenData.specificObjectivesList));
        if (chosenData.educational_areas || chosenData.educationalAreas) {
          setEducationalAreas(chosenData.educational_areas || chosenData.educationalAreas);
        }
        const acts = chosenData.monthly_activities || chosenData.activities;
        if (acts && Array.isArray(acts)) {
          setActivities(acts);
        } else {
          setActivities([]);
        }

        // Mantener la fecha original de actualización para no sobrepasar la nube artificialmente
        autoSaveService.saveDraftImmediate(
          draftKey,
          {
            elaboratedBy: officialElaboratedBy || chosenData.elaborated_by || chosenData.elaboratedBy || '',
            generalObjective: chosenData.general_objectives || chosenData.generalObjective || chosenData.goals || '',
            trimestreGoalsList: parseStringToList(chosenData.trimestre_goals || chosenData.trimestreGoalsList),
            specificObjectivesList: parseStringToList(chosenData.specific_objectives || chosenData.specificObjectivesList),
            educationalAreas: chosenData.educational_areas || chosenData.educationalAreas,
            activities: acts || [],
            savedAt: remotePlan?.updated_at || chosenData.savedAt || new Date().toISOString()
          },
          user.id,
          'QuarterlyPlan'
        );
      } else if (!foundLocal) {
        // Inicializar limpio si no existe plan ni borrador
        setScoutPlan(null);
        setElaboratedBy(isScouter ? (user.name || '') : '');
        setGeneralObjective('');
        setTrimestreGoalsList(['']);
        setSpecificObjectivesList(['']);
        setActivities([]);
      }

      isDirtyRef.current = false;
    } catch (err) {
      console.error('Error cargando plan trimestral:', err);
      // Fallback ante fallo de red
      try {
        const localDraft: any = await autoSaveService.loadDraft(draftKey);
        if (localDraft) {
          setElaboratedBy(localDraft.elaboratedBy || user.name || '');
          setGeneralObjective(localDraft.generalObjective || '');
          setTrimestreGoalsList(localDraft.trimestreGoalsList || ['']);
          setSpecificObjectivesList(localDraft.specificObjectivesList || ['']);
          if (localDraft.educationalAreas) setEducationalAreas(localDraft.educationalAreas);
          if (localDraft.activities) setActivities(localDraft.activities);
          isDirtyRef.current = false;
        }
      } catch (e) {}
    } finally {
      setLoading(false);
      hasLoadedOnceRef.current = true;
    }
  };

  // Disyuntor de emergencia: garantizar que loading JAMÁS permanezca activo más de 2.5 segundos
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);
    return () => clearTimeout(safetyTimer);
  }, [selectedQuarter, selectedYear, unitFilter]);

  useEffect(() => {
    // Si el usuario tenía cambios en el trimestre/año anterior sin guardar, persistirlos de inmediato
    if (isDirtyRef.current && user) {
      const prevQ = loadedQuarterRef.current;
      const prevY = loadedYearRef.current;
      const prevU = loadedUnitRef.current;
      if (prevQ && prevY) {
        const prevKey = getDraftKey(prevQ, prevY, prevU);
        autoSaveService.saveDraftImmediate(
          prevKey,
          {
            elaboratedBy,
            generalObjective,
            trimestreGoalsList,
            specificObjectivesList,
            educationalAreas,
            activities,
            savedAt: new Date().toISOString()
          },
          user.id,
          'QuarterlyPlan'
        );
      }
    }

    loadData(true);

    // Sincronización en tiempo real vía WebSockets (estilo WhatsApp)
    const channel = supabase
      .channel(`realtime_quarterly_plans_${selectedQuarter}_${selectedYear}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quarterly_plans' },
        (payload) => {
          // PROTECCIÓN CRÍTICA: Si el usuario tiene cambios activos en pantalla,
          // JAMÁS sobreescribir sus campos en segundo plano
          if (isDirtyRef.current) {
            console.log('[Realtime] Cambio detectado en Supabase, pero el usuario está editando activamente.');
            return;
          }
          const rec = payload.new as any;
          if (!rec || (rec.quarter === selectedQuarter && Number(rec.year) === Number(selectedYear))) {
            loadData(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.unit, user?.group_name, selectedQuarter, selectedYear, unitFilter]);

  // Auto-guardado local en segundo plano mientras el usuario escribe
  useEffect(() => {
    // Solo auto-guardar si no estamos cargando datos iniciales Y el usuario ha hecho cambios activos
    if (!user || loading || !isDirtyRef.current) return;

    const currentQ = loadedQuarterRef.current || selectedQuarter;
    const currentY = loadedYearRef.current || selectedYear;
    const currentU = loadedUnitRef.current || getActiveUnit();
    const key = `quarterly_${user.group_name || 'default'}_${currentU}_${currentQ}_${currentY}`;

    autoSaveService.saveDraft(
      key,
      {
        elaboratedBy,
        generalObjective,
        trimestreGoalsList,
        specificObjectivesList,
        educationalAreas,
        activities,
        savedAt: new Date().toISOString()
      },
      user.id,
      'QuarterlyPlan'
    );
  }, [elaboratedBy, generalObjective, trimestreGoalsList, specificObjectivesList, educationalAreas, activities, user?.id]);

  // CARGAR HISTÓRICO ANUAL DE TRIMESTRES
  const openHistoryModal = async () => {
    if (!user) return;
    setHistoryModalVisible(true);
    setLoadingHistory(true);
    try {
      const history = await dataService.getQuarterlyPlansHistory(user.id, user.group_name || undefined, getActiveUnit());
      setHistoryPlans(history);
    } catch (e) {
      console.error('Error cargando historial:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  // MAPAS DE CONFIGURACIÓN OFICIAL SCOUT EXCEL
  const QUARTER_MONTH_ABBR: Record<string, string> = {
    Q1: 'ENE.FEB.MAR',
    Q2: 'ABR.MAY.JUN',
    Q3: 'JUL.AGO.SEP',
    Q4: 'OCT.NOV.DIC',
  };

  const QUARTER_MONTH_FULL_TEXT: Record<string, string> = {
    Q1: 'ENERO, FEBRERO Y MARZO',
    Q2: 'ABRIL, MAYO Y JUNIO',
    Q3: 'JULIO, AGOSTO Y SEPTIEMBRE',
    Q4: 'OCTUBRE, NOVIEMBRE Y DICIEMBRE',
  };

  // EXPORTAR A EXCEL CON DISEÑO COMPLETO (COLORES, BORDES Y CELDAS COMBINADAS)
  const handleExportToExcel = () => {
    const unitName = getActiveUnit().toUpperCase();
    const monthAbbr = QUARTER_MONTH_ABBR[selectedQuarter] || 'ABR.MAY.JUN';
    const monthFullText = QUARTER_MONTH_FULL_TEXT[selectedQuarter] || 'ABRIL, MAYO Y JUNIO';
    const fileName = `TRIMESTRE_${unitName}_${selectedQuarter}_${selectedYear}.xls`;

    const e = educationalAreas;
    const cleanGenObj = (generalObjective || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cleanGoals = trimestreGoalsList.filter(s => s.trim()).join('. ').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cleanSpecifics = specificObjectivesList.filter(s => s.trim()).join('. ').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
<style>
  table { border-collapse: collapse; font-family: Calibri, Arial, sans-serif; font-size: 11pt; width: 100%; }
  td, th { border: 1px solid #000000; padding: 6px; vertical-align: middle; }
  .header-title { font-weight: bold; font-size: 12pt; text-align: left; background-color: #ffffff; }
  .header-grey { background-color: #a6a6a6; font-weight: bold; text-align: center; font-size: 12pt; border: 2px solid #000000; }
  .table-header { background-color: #e2e8f0; font-weight: bold; text-align: center; }
  .cell-center { text-align: center; }
  .cell-bold { font-weight: bold; }
  .box-check { border: 2px solid #000000; text-align: center; font-weight: bold; }
  .separator-row { height: 12px; background-color: #ffffff; border-left: none; border-right: none; }
</style>
</head>
<body>
<table>
  <tr><td colspan="13" class="header-title" style="font-size: 13pt;"><b>ASOCIACION DE SCOUTS DE VENEZUELA</b></td></tr>
  <tr><td colspan="13" class="header-title">REGION MIRANDA / DISTRITO GUARENAS - GUATIRE</td></tr>
  <tr><td colspan="13" class="header-title">GRUPO SCOUT ORION # 84</td></tr>
  <tr><td colspan="13" class="header-grey" style="font-size: 14pt; padding: 8px;">TRIMESTRE DE ${unitName}</td></tr>
  <tr>
    <td colspan="11" class="cell-bold">MESES: ${monthFullText}</td>
    <td class="cell-bold" style="text-align: right;">Año:</td>
    <td class="cell-center cell-bold">${selectedYear}</td>
  </tr>
  <tr>
    <td colspan="2" class="cell-bold">Elaborado por:</td>
    <td colspan="11">${elaboratedBy || user?.name || ''}</td>
  </tr>
  <tr style="height: 60px;">
    <td colspan="6" style="vertical-align: top; padding: 8px;"><b>Metas del trimestre:</b> ${cleanGoals}</td>
    <td colspan="7" style="vertical-align: top; padding: 8px;"><b>Objetivos del Trimestre:</b> ${cleanGenObj}</td>
  </tr>
  <tr style="height: 45px;">
    <td colspan="13" style="vertical-align: top; padding: 8px;"><b>objetivos especificos:</b> ${cleanSpecifics}</td>
  </tr>
  <tr><td colspan="13" class="header-grey">Objetivos Educativos</td></tr>
  <tr>
    <td class="cell-bold">Corporalidad:</td>
    <td class="cell-center">${e.corporalidad ? 'Si' : 'No'}</td>
    <td class="box-check">${e.corporalidad ? '✓' : ''}</td>
    <td class="cell-center">${e.corporalidad ? '' : 'No'}</td>
    <td style="border: none;"></td>
    <td class="cell-bold">Creatividad </td>
    <td class="cell-center">${e.creatividad ? 'si' : 'no'}</td>
    <td style="border: none;"></td>
    <td class="box-check">${e.creatividad ? '✓' : ''}</td>
    <td class="cell-center">${e.creatividad ? '' : 'no'}</td>
    <td colspan="3" style="border: none;"></td>
  </tr>
  <tr>
    <td class="cell-bold">Afectividad:</td>
    <td class="cell-center">${e.afectividad ? 'Si' : 'No'}</td>
    <td class="box-check">${e.afectividad ? '✓' : ''}</td>
    <td class="cell-center">${e.afectividad ? '' : 'No'}</td>
    <td style="border: none;"></td>
    <td class="cell-bold">Espiritualidad </td>
    <td class="cell-center">${e.espiritualidad ? 'si' : 'no'}</td>
    <td style="border: none;"></td>
    <td class="box-check">${e.espiritualidad ? '✓' : ''}</td>
    <td class="cell-center">${e.espiritualidad ? '' : 'no'}</td>
    <td colspan="3" style="border: none;"></td>
  </tr>
  <tr>
    <td class="cell-bold">Carácter:</td>
    <td class="cell-center">${e.caracter ? 'Si' : 'No'}</td>
    <td class="box-check">${e.caracter ? '✓' : ''}</td>
    <td class="cell-center">${e.caracter ? '' : 'No'}</td>
    <td style="border: none;"></td>
    <td class="cell-bold">Sociabilidad </td>
    <td class="cell-center">${e.sociabilidad ? 'si' : 'no'}</td>
    <td style="border: none;"></td>
    <td class="box-check">${e.sociabilidad ? '✓' : ''}</td>
    <td class="cell-center">${e.sociabilidad ? '' : 'no'}</td>
    <td colspan="3" style="border: none;"></td>
  </tr>
  <tr><td colspan="13" class="header-grey">ACTIVIDADES POR MES</td></tr>
  <tr class="table-header">
    <td>MES</td>
    <td>DÍA</td>
    <td colspan="4">ACTIVIDAD</td>
    <td colspan="3">LUGAR</td>
    <td colspan="2">RESPONSABLE</td>
    <td>PLAN B</td>
    <td>TIPO</td>
  </tr>`;

    currentMonths.forEach(m => {
      const mActs = activities.filter(a => a.month === m);
      if (mActs.length > 0) {
        mActs.forEach((a, idx) => {
          html += `<tr>`;
          if (idx === 0) {
            html += `<td rowspan="${mActs.length}" class="cell-center cell-bold" style="font-size: 12pt; background-color: #fafafa;">${m.toLowerCase()}</td>`;
          }
          html += `<td class="cell-center">${a.day || ''}</td>
            <td colspan="4" class="cell-center">${a.activity || ''}</td>
            <td colspan="3" class="cell-center">${a.place || ''}</td>
            <td colspan="2" class="cell-center">${a.responsible || ''}</td>
            <td>${a.planB || ''}</td>
            <td></td>
          </tr>`;
        });
      } else {
        html += `<tr>
          <td class="cell-center cell-bold">${m.toLowerCase()}</td>
          <td class="cell-center"></td>
          <td colspan="4"></td>
          <td colspan="3"></td>
          <td colspan="2"></td>
          <td></td>
          <td></td>
        </tr>`;
      }
      html += `<tr class="separator-row"><td colspan="13" style="border-left:none; border-right:none; border-top: 2px solid #000; border-bottom: 2px solid #000;"></td></tr>`;
    });

    html += `</table></body></html>`;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      showAlert('¡Excel con Diseño Exportado!', `Se ha generado el archivo Excel con colores, bordes y celdas combinadas: ${fileName}`);
    } else {
      showAlert('Función Web', 'La exportación con diseño avanzado Excel está disponible en la versión web.');
    }
  };

  // COPIAR RESUMEN FORMATO WHATSAPP CON EMOJIS
  const handleCopyForWhatsApp = () => {
    const unitName = getActiveUnit().toUpperCase();
    const qName = activeQuarterObj?.name || 'Primer Trimestre';

    let text = `*ASOCIACIÓN DE SCOUTS DE VENEZUELA*\n`;
    text += `*REGIÓN MIRANDA / DISTRITO GUARENAS-GUATIRE • GRUPO SCOUT ORIÓN #84*\n`;
    text += `⚜️ *TRIMESTRE DE ${unitName} — ${qName.toUpperCase()} (${selectedYear})*\n\n`;
    text += `👤 *Elaborado por:* ${elaboratedBy || user?.name}\n`;
    text += `📅 *Meses:* ${activeQuarterObj?.months}\n\n`;

    text += `🎯 *OBJETIVO GENERAL DEL TRIMESTRE:*\n`;
    text += `${generalObjective || 'Sin especificar'}\n\n`;

    const especs = specificObjectivesList.filter(s => s.trim());
    if (especs.length > 0) {
      text += `💡 *OBJETIVOS ESPECÍFICOS:*\n`;
      especs.forEach((s, i) => { text += `${i + 1}. ${s}\n`; });
      text += `\n`;
    }

    const metas = trimestreGoalsList.filter(s => s.trim());
    if (metas.length > 0) {
      text += `📌 *METAS DEL TRIMESTRE:*\n`;
      metas.forEach((g, i) => { text += `${i + 1}. ${g}\n`; });
      text += `\n`;
    }

    text += `🏃 *OBJETIVOS EDUCATIVOS (6 ÁREAS):*\n`;
    const areasStr = Object.entries(educationalAreas)
      .map(([k, v]) => `${k.charAt(0).toUpperCase() + k.slice(1)}: ${v ? 'SÍ ✓' : 'NO ✗'}`)
      .join(' | ');
    text += `${areasStr}\n\n`;

    text += `📆 *CRONOGRAMA DE ACTIVIDADES:*\n`;
    currentMonths.forEach(m => {
      text += `\n*${m.toUpperCase()}:*\n`;
      const mActs = activities.filter(a => a.month === m);
      if (mActs.length === 0) {
        text += `• Sin actividades programadas\n`;
      } else {
        mActs.forEach(a => {
          text += `• Día ${a.day}: ${a.activity} (Lugar: ${a.place} | Resp: ${a.responsible})\n`;
        });
      }
    });

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      try {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      } catch (e) {}
    }

    showAlert('¡Copiado para WhatsApp!', 'El resumen del plan trimestral se ha copiado al portapapeles. ¡Listo para pegar en tu grupo de WhatsApp!');
  };

  // Transiciones seguras para cambiar de trimestre, año o unidad sin perder cambios
  const handleSelectQuarter = async (qId: string) => {
    if (qId === selectedQuarter) return;
    if (isDirtyRef.current && user) {
      const prevKey = getDraftKey(loadedQuarterRef.current, loadedYearRef.current, loadedUnitRef.current);
      await autoSaveService.saveDraftImmediate(prevKey, {
        elaboratedBy,
        generalObjective,
        trimestreGoalsList,
        specificObjectivesList,
        educationalAreas,
        activities,
        savedAt: new Date().toISOString()
      }, user.id, 'QuarterlyPlan');
    }
    isDirtyRef.current = false;
    setSelectedQuarter(qId);
  };

  const handleChangeYear = async (delta: number) => {
    if (isDirtyRef.current && user) {
      const prevKey = getDraftKey(loadedQuarterRef.current, loadedYearRef.current, loadedUnitRef.current);
      await autoSaveService.saveDraftImmediate(prevKey, {
        elaboratedBy,
        generalObjective,
        trimestreGoalsList,
        specificObjectivesList,
        educationalAreas,
        activities,
        savedAt: new Date().toISOString()
      }, user.id, 'QuarterlyPlan');
    }
    isDirtyRef.current = false;
    setSelectedYear(y => y + delta);
  };

  const handleSelectUnitFilter = async (u: string) => {
    if (u === unitFilter) return;
    if (isDirtyRef.current && user) {
      const prevKey = getDraftKey(loadedQuarterRef.current, loadedYearRef.current, loadedUnitRef.current);
      await autoSaveService.saveDraftImmediate(prevKey, {
        elaboratedBy,
        generalObjective,
        trimestreGoalsList,
        specificObjectivesList,
        educationalAreas,
        activities,
        savedAt: new Date().toISOString()
      }, user.id, 'QuarterlyPlan');
    }
    isDirtyRef.current = false;
    setUnitFilter(u);
  };

  // Manejadores para Listas Dinámicas
  const handleAddListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    isDirtyRef.current = true;
    setter(prev => [...prev, '']);
  };

  const handleUpdateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    isDirtyRef.current = true;
    setter(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleRemoveListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    isDirtyRef.current = true;
    setter(prev => prev.filter((_, i) => i !== index));
  };

  // Manejadores para Actividades
  const handleAddActivity = (monthName: string) => {
    isDirtyRef.current = true;
    const newAct: ActivityRow = {
      id: String(Date.now()),
      month: monthName,
      day: '15',
      activity: '',
      place: 'Sede',
      responsible: user?.name || 'Rovers / Scouter',
      planB: ''
    };
    setActivities(prev => [...prev, newAct]);
  };

  const handleUpdateActivity = (id: string, field: keyof ActivityRow, value: string) => {
    isDirtyRef.current = true;
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleRemoveActivity = (id: string) => {
    isDirtyRef.current = true;
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const toggleArea = (key: string) => {
    isDirtyRef.current = true;
    setEducationalAreas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openDayCalendarPicker = (actId: string, monthName: string) => {
    setTargetActId(actId);
    setTargetMonthName(monthName);
    setDayPickerVisible(true);
  };

  // Manejadores para Modificar / Reprogramar Actividades ("Modificado a...")
  const handleOpenModifyModal = (act: ActivityRow) => {
    setActToModify(act);
    setNewActivityName(act.activity);
    setModificationReason(act.modifiedReason || '');
    setModifyModalVisible(true);
  };

  const handleApplyModification = () => {
    if (!actToModify || !newActivityName.trim()) {
      showAlert('Campo requerido', 'Por favor ingresa el nuevo nombre de la actividad.');
      return;
    }
    isDirtyRef.current = true;
    setActivities(prev => prev.map(a => {
      if (a.id === actToModify.id) {
        return {
          ...a,
          isModified: true,
          originalActivity: a.originalActivity || a.activity,
          activity: newActivityName.trim(),
          modifiedReason: modificationReason.trim() || 'Ajuste de programa / Fuerza mayor',
          status: 'modificada'
        };
      }
      return a;
    }));
    setModifyModalVisible(false);
    showAlert('Actividad Reprogramada', `La actividad ha sido modificada a "${newActivityName.trim()}". Se mantendrá el registro de la actividad original.`);
  };

  const handleRevertModification = (actId: string) => {
    isDirtyRef.current = true;
    setActivities(prev => prev.map(a => {
      if (a.id === actId && a.originalActivity) {
        return {
          ...a,
          activity: a.originalActivity,
          isModified: false,
          originalActivity: undefined,
          modifiedReason: undefined,
          status: 'programada'
        };
      }
      return a;
    }));
    showAlert('Restaurado', 'La actividad ha sido restaurada a su versión original.');
  };

  const handleNavigateToPrograma = async (act: ActivityRow) => {
    const monthMap: Record<string, string> = {
      enero: '01', febrero: '02', marzo: '03', abril: '04',
      mayo: '05', junio: '06', julio: '07', agosto: '08',
      septiembre: '09', octubre: '10', noviembre: '11', diciembre: '12'
    };
    const mNum = monthMap[act.month.toLowerCase()] || '01';
    const dayStr = String(act.day || '15').padStart(2, '0');
    const targetDate = `${selectedYear}-${mNum}-${dayStr}`;
    const targetUnit = getActiveUnit();

    try {
      const allPrograms = await programaService.getProgramas();
      const existing = allPrograms.find(p => 
        (p.planActivityId && p.planActivityId === act.id) ||
        (p.importantNotes && p.importantNotes.includes(`[PLAN_ACT_ID:${act.id}]`)) ||
        (p.title && p.title.trim().toLowerCase() === act.activity.trim().toLowerCase() && p.unit === targetUnit)
      );
      if (existing) {
        navigation.navigate('ProgramaScoutEditor', { programa: existing });
        return;
      }
    } catch (e) {}

    navigation.navigate('ProgramaScoutEditor', {
      initialDate: targetDate,
      initialTitle: act.activity,
      initialPlace: act.place,
      initialUnit: targetUnit,
      initialQuarter: selectedQuarter,
      initialYear: selectedYear,
      planActivityId: act.id
    });
  };

  const handleSaveScoutPlan = async () => {
    if (!user) return;
    const goalsStr = trimestreGoalsList.filter(s => s.trim().length > 0).join('\n');
    const specificStr = specificObjectivesList.filter(s => s.trim().length > 0).join('\n');

    if (!generalObjective.trim() && !goalsStr) {
      showAlert('Campo Requerido', 'Por favor ingresa las metas o el objetivo general de este trimestre.');
      return;
    }

    const targetUnit = getActiveUnit();
    const finalAuthor = elaboratedBy.trim() || scoutPlan?.elaborated_by || user.name || 'Jefatura Scout';

    setSavingScout(true);
    const draftKey = getDraftKey(selectedQuarter, selectedYear, targetUnit);

    // 1. Guardado inmediato e infalible en almacenamiento local del dispositivo
    await autoSaveService.saveDraftImmediate(
      draftKey,
      {
        elaboratedBy: finalAuthor,
        generalObjective: generalObjective.trim(),
        trimestreGoalsList,
        specificObjectivesList,
        educationalAreas,
        activities,
        savedAt: new Date().toISOString()
      },
      user.id,
      'QuarterlyPlan'
    );

    // Marcar limpio para evitar sobreescrituras
    isDirtyRef.current = false;

    try {
      await dataService.saveQuarterlyPlan({
        scout_id: user.id,
        group_name: user.group_name || 'Grupo Scout Orión #84',
        unit: targetUnit,
        quarter: selectedQuarter,
        year: selectedYear,
        elaborated_by: finalAuthor,
        general_objectives: generalObjective.trim(),
        trimestre_goals: goalsStr,
        specific_objectives: specificStr,
        educational_areas: educationalAreas,
        monthly_activities: activities
      });

      // Enviar notificación instantánea en vivo a todos los miembros de la unidad
      notificationService.sendNotification({
        senderId: user.id,
        groupName: user.group_name || undefined,
        unit: targetUnit,
        title: `📑 Plan Trimestral (${selectedQuarter}) Actualizado`,
        message: `${finalAuthor} ha actualizado las metas y actividades del Plan Trimestral de ${targetUnit.toUpperCase()}.`,
        type: 'plan'
      }).catch(() => {});

      setScouterEditUnlocked(false);
      showAlert('¡Plan Trimestral Guardado!', `Se han actualizado las actividades de la unidad para el ${selectedQuarter}. Elaborado por: ${finalAuthor}.`);
    } catch (err: any) {
      console.warn('Aviso guardando en Supabase (modo offline):', err);
      showAlert(
        '¡Guardado en tu Dispositivo!',
        'Hubo una interrupción en la conexión a internet con el servidor, pero tu Plan Trimestral se guardó de forma segura en tu dispositivo. Se sincronizará automáticamente con la nube al reconectar.'
      );
    } finally {
      setSavingScout(false);
    }
  };

  // CONFIRMACIÓN DOBLE PARA DESBLOQUEAR EDICIÓN DEL PLAN COMPARTIDO DE LA UNIDAD
  const handleConfirmUnlockEdit = () => {
    const unitName = getActiveUnit().toUpperCase();
    const confirmMsg = `¿Estás seguro de modificar el Plan Trimestral compartido de la Unidad (${unitName})?\n\nCualquier cambio que realices actualizará las actividades para todos los jóvenes y scouters de tu unidad.`;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(confirmMsg)) {
        isDirtyRef.current = true;
        setScouterEditUnlocked(true);
      }
    } else {
      Alert.alert(
        '¿Editar Plan Trimestral de Unidad?',
        confirmMsg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sí, deseo editar', 
            onPress: () => {
              isDirtyRef.current = true;
              setScouterEditUnlocked(true);
            } 
          }
        ]
      );
    }
  };

  // LIMPIAR TRIMESTRE CON CONFIRMACIÓN DOBLE DE SEGURIDAD
  const handleClearQuarter = () => {
    const qName = selectedQuarter === 'Q1' ? 'Trimestre 1 (Ene-Mar)' : selectedQuarter === 'Q2' ? 'Trimestre 2 (Abr-Jun)' : selectedQuarter === 'Q3' ? 'Trimestre 3 (Jul-Sep)' : 'Trimestre 4 (Oct-Dic)';

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirm1 = window.confirm(`¿Quieres limpiar el ${qName}? Se vaciarán las actividades y objetivos de este trimestre.`);
      if (confirm1) {
        setTimeout(() => {
          const confirm2 = window.confirm(`⚠️ ¿ESTÁS SÚPER MEGA SEGURO de borrar todo el ${qName}? Esta acción NO se puede deshacer.`);
          if (confirm2) {
            executeClearQuarter();
          }
        }, 150);
      }
    } else {
      Alert.alert(
        `Limpiar ${qName}`,
        `¿Quieres limpiar el ${qName}? Se vaciarán las actividades y objetivos de este trimestre.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                `⚠️ Confirmación Final`,
                `¿Estás SÚPER MEGA SEGURO de borrar todo el ${qName}? Esta acción NO se puede deshacer.`,
                [
                  { text: 'No, cancelar', style: 'cancel' },
                  { text: 'Sí, borrar todo', style: 'destructive', onPress: executeClearQuarter }
                ]
              );
            }
          }
        ]
      );
    }
  };

  const executeClearQuarter = async () => {
    isDirtyRef.current = false;
    setGeneralObjective('');
    setTrimestreGoalsList(['']);
    setSpecificObjectivesList(['']);
    setEducationalAreas({
      corporalidad: false,
      creatividad: false,
      afectividad: false,
      espiritualidad: false,
      caracter: false,
      sociabilidad: false
    });
    setActivities([]);

    const targetUnit = getActiveUnit();
    const draftKey = getDraftKey(selectedQuarter, selectedYear, targetUnit);
    await autoSaveService.removeDraft(draftKey);

    if (user) {
      try {
        await dataService.saveQuarterlyPlan({
          scout_id: user.id,
          group_name: user.group_name || 'Grupo Scout Orión #84',
          unit: targetUnit,
          quarter: selectedQuarter,
          year: selectedYear,
          elaborated_by: user.name || '',
          general_objectives: '',
          trimestre_goals: '',
          specific_objectives: '',
          educational_areas: { corporalidad: false, creatividad: false, afectividad: false, espiritualidad: false, caracter: false, sociabilidad: false },
          monthly_activities: []
        });
      } catch (e) {}
    }

    showAlert('Trimestre Limpiado', `Se ha vaciado el plan del ${selectedQuarter} exitosamente.`);
  };

  const handleSavePlanByScouter = async (newStatus: string) => {
    if (!selectedScoutItem?.scout?.id) return;
    const goalsStr = trimestreGoalsList.filter(s => s.trim().length > 0).join('\n');
    const specificStr = specificObjectivesList.filter(s => s.trim().length > 0).join('\n');

    setReviewing(true);
    try {
      const savedPlan = await dataService.saveQuarterlyPlan({
        scout_id: selectedScoutItem.scout.id,
        quarter: selectedQuarter,
        year: selectedYear,
        elaborated_by: elaboratedBy.trim() || selectedScoutItem.scout.name,
        general_objectives: generalObjective.trim(),
        trimestre_goals: goalsStr,
        specific_objectives: specificStr,
        educational_areas: educationalAreas,
        monthly_activities: activities
      });

      if (savedPlan?.id) {
        await dataService.updateQuarterlyPlanByScouter(
          savedPlan.id,
          scouterFeedback.trim(),
          newStatus
        );
      }

      showAlert('Plan Trimestral Actualizado', `El plan trimestral de ${selectedScoutItem.scout.name} se ha guardado como ${newStatus}.`);
      setSelectedScoutItem(null);
      setScouterFeedback('');
      loadData();
    } catch (err: any) {
      showAlert('Error al guardar', err?.message || 'No se pudo actualizar el plan trimestral.');
    } finally {
      setReviewing(false);
    }
  };

  const openScoutPlanModal = (item: any) => {
    setSelectedScoutItem(item);
    setScouterEditUnlocked(false);
    if (item.plan) {
      setElaboratedBy(item.plan.elaborated_by || item.scout.name || '');
      setGeneralObjective(item.plan.general_objectives || item.plan.goals || '');
      setTrimestreGoalsList(parseStringToList(item.plan.trimestre_goals));
      setSpecificObjectivesList(parseStringToList(item.plan.specific_objectives));
      if (item.plan.educational_areas) setEducationalAreas(item.plan.educational_areas);
      if (item.plan.monthly_activities && Array.isArray(item.plan.monthly_activities) && item.plan.monthly_activities.length > 0) {
        setActivities(item.plan.monthly_activities);
      } else {
        setActivities(getDefaultActivitiesForQuarter(selectedQuarter, item.scout.name || ''));
      }
      setScouterFeedback(item.plan.scouter_feedback || '');
    } else {
      setElaboratedBy(item.scout.name || '');
      setGeneralObjective('Lograr iniciar este año de la mejor manera, cumpliendo los objetivos de los programas mundiales, conectarnos con otros grupos scout y conocer, guiar, ayudar a los nuevos integrantes.');
      setTrimestreGoalsList(['Lograr que se cumplan las ambiciones de las salidas, conseguir próximos adelantos, obtener fondos para la unidad y que el 80% del trimestre se cumpla.']);
      setSpecificObjectivesList(['Reforzar los conocimientos de cada rover, hacer de este planeta un mundo mejor y que el 80% de los jóvenes participen.']);
      setEducationalAreas({ corporalidad: true, creatividad: true, afectividad: true, espiritualidad: true, caracter: true, sociabilidad: true });
      setActivities(getDefaultActivitiesForQuarter(selectedQuarter, item.scout.name || ''));
      setScouterFeedback('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA OFICIAL ASOCIACIÓN DE SCOUTS */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 8,
              backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
              gap: 6
            }}
            onPress={() => navigateBackOrHome(navigation, user?.role)}
          >
            <ArrowLeft size={16} color={theme.text} />
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Volver</Text>
          </TouchableOpacity>
        </View>

        {/* BANNER DE ASOCIACIÓN */}
        <View style={styles.asociacionBanner}>
          <Text style={styles.asociacionText}>ASOCIACIÓN DE SCOUTS DE VENEZUELA</Text>
          <Text style={styles.asociacionSub}>REGIÓN MIRANDA / DISTRITO GUARENAS-GUATIRE • GRUPO SCOUT ORIÓN #84</Text>
        </View>

        {/* TÍTULO Y SELECTOR DE AÑO / HISTÓRICO */}
        <View style={styles.headerMainRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            TRIMESTRE DE {getActiveUnit().toUpperCase()}
          </Text>

          <View style={styles.yearAndHistoryGroup}>
            <View style={[styles.yearSelectorRow, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <TouchableOpacity onPress={() => handleChangeYear(-1)} style={styles.yearArrowBtn}>
                <ChevronLeft size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: theme.text }]}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => handleChangeYear(1)} style={styles.yearArrowBtn}>
                <ChevronRight size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.historyBtnHeader, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: colors.primary }]} onPress={openHistoryModal}>
              <History size={14} color={colors.primary} style={{ marginRight: 4 }} />
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 12 }}>Histórico</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BARRA DE BOTONES DE ACCIÓN: WHATSAPP, EXCEL, LIMPIEZA Y MODO EDICIÓN/VISTA PREVIA */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={[styles.actionPillBtn, { backgroundColor: '#10b981' }]} onPress={handleCopyForWhatsApp}>
            <Copy size={14} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.actionPillBtnText}>Copiar WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionPillBtn, { backgroundColor: '#059669' }]} onPress={handleExportToExcel}>
            <FileSpreadsheet size={14} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.actionPillBtnText}>Exportar Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionPillBtn, { backgroundColor: '#ef4444' }]} onPress={handleClearQuarter}>
            <Trash2 size={14} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.actionPillBtnText}>Limpiar Trimestre</Text>
          </TouchableOpacity>

          <View style={[styles.modeToggleGroup, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.modeToggleBtn, viewMode === 'edit' && { backgroundColor: colors.primary }]}
              onPress={() => setViewMode('edit')}
            >
              <Edit3 size={13} color={viewMode === 'edit' ? 'white' : theme.subText} style={{ marginRight: 4 }} />
              <Text style={[styles.modeToggleText, { color: viewMode === 'edit' ? 'white' : theme.subText, fontWeight: viewMode === 'edit' ? 'bold' : 'normal' }]}>Edición</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeToggleBtn, viewMode === 'preview' && { backgroundColor: colors.primary }]}
              onPress={() => setViewMode('preview')}
            >
              <Eye size={13} color={viewMode === 'preview' ? 'white' : theme.subText} style={{ marginRight: 4 }} />
              <Text style={[styles.modeToggleText, { color: viewMode === 'preview' ? 'white' : theme.subText, fontWeight: viewMode === 'preview' ? 'bold' : 'normal' }]}>Vista Previa</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* PESTAÑAS DE SELECCIÓN DE TRIMESTRES (TRIMESTRE 1, 2, 3, 4) */}
        <View style={styles.quarterTabsContainer}>
          {QUARTERS.map(q => {
            const isActive = selectedQuarter === q.id;
            return (
              <TouchableOpacity
                key={q.id}
                style={[
                  styles.quarterTabCard,
                  { backgroundColor: theme.inputBg, borderColor: theme.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => handleSelectQuarter(q.id)}
              >
                <Text style={[
                  styles.quarterTabCardText,
                  { color: theme.subText },
                  isActive && { color: 'white', fontWeight: 'bold' }
                ]}>
                  {q.shortName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FILTROS POR UNIDAD PARA SCOUTER Y JEFE DE GRUPO */}
        {isScouter && (
          <View style={{ marginTop: 4, marginBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
              {[
                { id: 'manada', label: '🐺 MANADA', color: UNIT_COLORS.manada || '#ffb300' },
                { id: 'tropa', label: '⚜️ TROPA', color: UNIT_COLORS.tropa || '#43a047' },
                { id: 'comunidad', label: '🧭 COMUNIDAD', color: UNIT_COLORS.comunidad || '#1e88e5' },
                { id: 'clan', label: '🔴 CLAN', color: UNIT_COLORS.clan || '#e53935' }
              ].map(u => {
                const isActive = getActiveUnit() === u.id;
                return (
                  <TouchableOpacity
                    key={u.id}
                    style={[
                      styles.filterChip,
                      { borderColor: u.color, borderWidth: 1.5 },
                      isActive ? { backgroundColor: u.color } : { backgroundColor: theme.inputBg }
                    ]}
                    onPress={() => handleSelectUnitFilter(u.id)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      isActive ? { color: 'white', fontWeight: '900' } : { color: theme.text, fontWeight: 'bold' }
                    ]}>
                      {u.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        <View style={[styles.quarterInfoCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.quarterName, { color: theme.text }]}>{activeQuarterObj?.name}</Text>
            <Text style={[styles.quarterMonths, { color: colors.primary }]}>{activeQuarterObj?.months}</Text>
          </View>
        </View>
      </View>

      {/* CONTENIDO PRINCIPAL */}
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : (
          viewMode === 'edit' ? (
            /* PLAN TRIMESTRAL ÚNICO Y COMPARTIDO DE LA UNIDAD */
            <View style={[styles.documentSheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              
              {/* BANNER PLAN COMPARTIDO DE UNIDAD */}
              <View style={{ backgroundColor: isDarkMode ? '#1e1b4b' : 'rgba(99, 102, 241, 0.12)', borderLeftWidth: 4, borderLeftColor: colors.primary, padding: 14, borderRadius: 10, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 13, color: colors.primary }}>
                    📌 Plan Trimestral Único de la Unidad ({getActiveUnit().toUpperCase()}) — {selectedQuarter}
                  </Text>
                  <View style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#10b981' }}>
                    <Text style={{ fontSize: 10, color: '#10b981', fontWeight: 'bold' }}>💾 Auto-guardado activo</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: theme.subText, marginTop: 4 }}>
                  ✍️ Creado / Modificado por: <Text style={{ fontWeight: 'bold', color: theme.text }}>{elaboratedBy || user?.name || 'Unidad Scout'}</Text>
                </Text>
              </View>

              {/* BOTÓN DE DESBLOQUEO DE EDICIÓN CON CONFIRMACIÓN DOBLE */}
              {!scouterEditUnlocked ? (
                <TouchableOpacity
                  style={{
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                    elevation: 2,
                  }}
                  onPress={handleConfirmUnlockEdit}
                >
                  <Edit3 size={16} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                    ✏️ ¿Deseas modificar las actividades de este Plan Trimestral?
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ backgroundColor: 'rgba(22, 163, 74, 0.15)', borderWidth: 1, borderColor: '#16a34a', padding: 10, borderRadius: 10, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 12 }}>
                    🔓 Edición Desbloqueada (Modo Colaborativo de Unidad)
                  </Text>
                  <TouchableOpacity onPress={() => setScouterEditUnlocked(false)}>
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>Bloquear</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.sheetTopRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.label, { color: theme.subText }]}>ELABORADO POR *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Nombre del Joven / Rover / Dirigente"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={elaboratedBy}
                    onChangeText={val => {
                      isDirtyRef.current = true;
                      setElaboratedBy(val);
                    }}
                    editable={scouterEditUnlocked}
                  />
                </View>
                <View style={{ width: 90 }}>
                  <Text style={[styles.label, { color: theme.subText }]}>AÑO *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, textAlign: 'center' }]}
                    value={String(selectedYear)}
                    editable={false}
                  />
                </View>
              </View>

              {scoutPlan?.status && (
                <View style={[
                  styles.statusBanner,
                  scoutPlan.status === 'Aprobado' ? styles.bannerApproved : styles.bannerPending
                ]}>
                  <Text style={styles.statusBannerText}>
                    ESTADO DEL DOCUMENTO: {scoutPlan.status.toUpperCase()}
                  </Text>
                </View>
              )}

              {/* SECCIÓN 1: OBJETIVOS Y METAS DEL TRIMESTRE */}
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>1. Objetivos y Metas del Trimestre</Text>
              
              {/* 1. CAMPO: OBJETIVO GENERAL DEL TRIMESTRE */}
              <Text style={[styles.label, { color: theme.subText }]}>OBJETIVO GENERAL DEL TRIMESTRE *</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: Lograr iniciar este trimestre de la mejor manera, cumpliendo los objetivos de los programas mundiales, conectarnos con otros grupos scout..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                numberOfLines={3}
                value={generalObjective}
                onChangeText={val => {
                  isDirtyRef.current = true;
                  setGeneralObjective(val);
                }}
                editable={scouterEditUnlocked}
              />

              {/* 2. LISTA DINÁMICA DE OBJETIVOS ESPECÍFICOS */}
              <Text style={[styles.label, { color: theme.subText, marginTop: 14 }]}>OBJETIVOS ESPECÍFICOS</Text>
              {specificObjectivesList.map((specItem, idx) => (
                <View key={idx} style={styles.dynamicRow}>
                  <Text style={[styles.itemBulletIndex, { color: colors.primary }]}>{idx + 1}.</Text>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    placeholder={`Objetivo Específico #${idx + 1}...`}
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={specItem}
                    onChangeText={val => handleUpdateListItem(setSpecificObjectivesList, idx, val)}
                    editable={scouterEditUnlocked}
                  />
                  {specificObjectivesList.length > 1 && scouterEditUnlocked && (
                    <TouchableOpacity onPress={() => handleRemoveListItem(setSpecificObjectivesList, idx)} style={styles.deleteListItemBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {scouterEditUnlocked && (
                <TouchableOpacity style={styles.addDynamicBtn} onPress={() => handleAddListItem(setSpecificObjectivesList)}>
                  <Plus size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.addDynamicBtnText, { color: colors.primary }]}>+ Agregar otro Objetivo Específico</Text>
                </TouchableOpacity>
              )}

              {/* 3. LISTA DINÁMICA DE METAS DEL TRIMESTRE */}
              <Text style={[styles.label, { color: theme.subText, marginTop: 14 }]}>METAS DEL TRIMESTRE</Text>
              {trimestreGoalsList.map((goalItem, idx) => (
                <View key={idx} style={styles.dynamicRow}>
                  <Text style={[styles.itemBulletIndex, { color: colors.primary }]}>{idx + 1}.</Text>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    placeholder={`Meta del Trimestre #${idx + 1}...`}
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={goalItem}
                    onChangeText={val => handleUpdateListItem(setTrimestreGoalsList, idx, val)}
                    editable={scouterEditUnlocked}
                  />
                  {trimestreGoalsList.length > 1 && scouterEditUnlocked && (
                    <TouchableOpacity onPress={() => handleRemoveListItem(setTrimestreGoalsList, idx)} style={styles.deleteListItemBtn}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {scouterEditUnlocked && (
                <TouchableOpacity style={styles.addDynamicBtn} onPress={() => handleAddListItem(setTrimestreGoalsList)}>
                  <Plus size={14} color={colors.primary} style={{ marginRight: 4 }} />
                  <Text style={[styles.addDynamicBtnText, { color: colors.primary }]}>+ Agregar otra Meta del Trimestre</Text>
                </TouchableOpacity>
              )}

              {/* SECCIÓN 2: OBJETIVOS EDUCATIVOS (6 ÁREAS SCOUT) */}
              <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>
                2. Objetivos Educativos (6 Áreas de Crecimiento Scout)
              </Text>

              <View style={styles.areasGrid}>
                {[
                  { key: 'corporalidad', label: 'Corporalidad' },
                  { key: 'creatividad', label: 'Creatividad' },
                  { key: 'afectividad', label: 'Afectividad' },
                  { key: 'espiritualidad', label: 'Espiritualidad' },
                  { key: 'caracter', label: 'Carácter' },
                  { key: 'sociabilidad', label: 'Sociabilidad' },
                ].map(area => {
                  const isChecked = !!educationalAreas[area.key];
                  return (
                    <TouchableOpacity
                      key={area.key}
                      style={[
                        styles.areaChipBtn,
                        { backgroundColor: theme.inputBg, borderColor: theme.border },
                        isChecked && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => toggleArea(area.key)}
                    >
                      <Text style={[
                        styles.areaChipText,
                        { color: theme.subText },
                        isChecked && { color: 'white', fontWeight: 'bold' }
                      ]}>
                        {isChecked ? '✓ ' : '✗ '}{area.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* SECCIÓN 3: ACTIVIDADES POR MES */}
              <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>
                3. Cronograma de Actividades por Mes
              </Text>

              {currentMonths.map(monthName => {
                const monthActs = activities.filter(a => a.month === monthName);

                return (
                  <View key={monthName} style={[styles.monthBlock, { backgroundColor: isDarkMode ? '#18181b' : '#f8fafc', borderColor: theme.border }]}>
                    <View style={styles.monthHeaderRow}>
                      <Text style={[styles.monthTitleText, { color: theme.text }]}>{monthName.toUpperCase()}</Text>
                      <TouchableOpacity
                        style={styles.addActBtn}
                        onPress={() => handleAddActivity(monthName)}
                      >
                        <Plus size={14} color="white" style={{ marginRight: 4 }} />
                        <Text style={styles.addActBtnText}>Agregar Actividad</Text>
                      </TouchableOpacity>
                    </View>

                    {monthActs.length === 0 ? (
                      <Text style={[styles.noActText, { color: theme.subText }]}>No hay actividades registradas en {monthName}.</Text>
                    ) : (
                      monthActs.map(act => (
                        <View key={act.id} style={[styles.activityRowCard, { backgroundColor: theme.cardBg, borderColor: act.isModified ? '#f59e0b' : theme.border }]}>
                          {/* BADGE DE MODIFICACIÓN / TRAZABILIDAD */}
                          {act.isModified && (
                            <View style={{ backgroundColor: isDarkMode ? '#451a03' : '#fef3c7', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#fde68a', marginBottom: 8 }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#b45309' }}>
                                  ⚠️ Actividad Modificada (Original: {act.originalActivity})
                                </Text>
                                <TouchableOpacity onPress={() => handleRevertModification(act.id)} style={{ backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, color: '#b45309', fontWeight: 'bold' }}>↩️ Revertir</Text>
                                </TouchableOpacity>
                              </View>
                              {act.modifiedReason ? (
                                <Text style={{ fontSize: 10, color: '#92400e', marginTop: 2 }}>
                                  Motivo: {act.modifiedReason}
                                </Text>
                              ) : null}
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                            <TouchableOpacity
                              style={[styles.dayPickerBtn, { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0', borderColor: theme.border }]}
                              onPress={() => openDayCalendarPicker(act.id, act.month)}
                              activeOpacity={0.8}
                            >
                              <CalendarIcon size={13} color={colors.primary} style={{ marginRight: 4 }} />
                              <Text style={[styles.dayPickerBtnText, { color: theme.text }]}>
                                {act.day ? `Día ${act.day}` : 'Día'}
                              </Text>
                            </TouchableOpacity>

                            <TextInput
                              style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                              placeholder="Nombre de la Actividad"
                              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                              value={act.activity}
                              onChangeText={val => handleUpdateActivity(act.id, 'activity', val)}
                            />
                            <TouchableOpacity
                              style={styles.deleteActBtn}
                              onPress={() => handleRemoveActivity(act.id)}
                            >
                              <Trash2 size={16} color="#ef4444" />
                            </TouchableOpacity>
                          </View>

                          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6 }}>
                            <TextInput
                              style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                              placeholder="Lugar (Sede, Playa...)"
                              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                              value={act.place}
                              onChangeText={val => handleUpdateActivity(act.id, 'place', val)}
                            />
                            <TextInput
                              style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                              placeholder="Responsable"
                              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                              value={act.responsible}
                              onChangeText={val => handleUpdateActivity(act.id, 'responsible', val)}
                            />
                          </View>

                          {/* BARRA DE ACCIONES POR ACTIVIDAD: MODIFICAR / VINCULAR PROGRAMA */}
                          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                            {!act.isModified && (
                              <TouchableOpacity
                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#27272a' : '#fef3c7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#fde68a' }}
                                onPress={() => handleOpenModifyModal(act)}
                              >
                                <Text style={{ fontSize: 11, color: '#b45309', fontWeight: 'bold' }}>🔄 Modificar Actividad</Text>
                              </TouchableOpacity>
                            )}

                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#9333ea', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                              onPress={() => handleNavigateToPrograma(act)}
                            >
                              <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>📝 Ficha de Programa</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                );
              })}

              {/* SECCIÓN 4: EVALUACIÓN DE CUMPLIMIENTO DE CICLO DE PROGRAMA (CIP) */}
              <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 26 }]}>
                4. Evaluación de Cumplimiento de Ciclo de Programa (CIP)
              </Text>

              {/* TARJETAS DE MÉTRICAS DE CUMPLIMIENTO */}
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 12 }}>
                <View style={[styles.trafficCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border, flex: 1, padding: 8, borderRadius: 10, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>{activities.length}</Text>
                  <Text style={{ fontSize: 10, color: theme.subText, textAlign: 'center' }}>Total Programadas</Text>
                </View>

                <View style={[styles.trafficCard, { backgroundColor: '#dcfce7', borderColor: '#16a34a', flex: 1, padding: 8, borderRadius: 10, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#15803d' }}>
                    {activities.filter(a => !a.isModified).length}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#166534', textAlign: 'center' }}>Sin Cambios</Text>
                </View>

                <View style={[styles.trafficCard, { backgroundColor: '#fef3c7', borderColor: '#d97706', flex: 1, padding: 8, borderRadius: 10, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#b45309' }}>
                    {activities.filter(a => a.isModified).length}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#92400e', textAlign: 'center' }}>Modificadas</Text>
                </View>

                <View style={[styles.trafficCard, { backgroundColor: '#e0e7ff', borderColor: '#4f46e5', flex: 1.2, padding: 8, borderRadius: 10, alignItems: 'center' }]}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#4338ca' }}>
                    {activities.length > 0 ? Math.round(((activities.filter(a => !a.isModified).length) / activities.length) * 100) : 100}%
                  </Text>
                  <Text style={{ fontSize: 10, color: '#3730a3', textAlign: 'center' }}>Cumplimiento</Text>
                </View>
              </View>

              {/* CONCLUSIONES Y LECCIONES APRENDIDAS */}
              <Text style={[styles.inputLabel, { color: theme.subText, marginTop: 8 }]}>
                CONCLUSIONES Y LECCIONES APRENDIDAS (ASAMBLEA / CONSEJO DE RAMA)
              </Text>
              <TextInput
                style={[styles.input, { height: 80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, textAlignVertical: 'top', marginBottom: 12 }]}
                placeholder="¿Qué actividades fueron las favoritas de los jóvenes? ¿Qué aprendizajes pedagógicos y logísticos quedan para el siguiente trimestre?"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                value={evaluationConclusions}
                onChangeText={setEvaluationConclusions}
              />

              <Text style={[styles.inputLabel, { color: theme.subText }]}>
                METAS Y ADELANTOS EDUCATIVOS ALCANZADOS
              </Text>
              <TextInput
                style={[styles.input, { height: 65, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, textAlignVertical: 'top' }]}
                placeholder="Insignias de etapa aprobadas, especialidades entregadas, proyectos de servicio completados..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                value={evaluationGoalsReached}
                onChangeText={setEvaluationGoalsReached}
              />

              {scoutPlan?.scouter_feedback ? (
                <View style={[styles.feedbackBox, { backgroundColor: isDarkMode ? '#27272a' : '#fef3c7', marginTop: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <MessageSquare size={16} color="#d97706" style={{ marginRight: 6 }} />
                    <Text style={{ fontWeight: 'bold', color: '#d97706', fontSize: 12 }}>Observaciones del Scouter:</Text>
                  </View>
                  <Text style={{ color: theme.text, fontSize: 13 }}>{scoutPlan.scouter_feedback}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.saveSubmitBtn}
                onPress={handleSaveScoutPlan}
                disabled={savingScout}
              >
                {savingScout ? <ActivityIndicator color="white" /> : <Text style={styles.saveSubmitText}>Guardar Plan Trimestral Oficial</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            /* VISTA SCOUT: MODO PREVISUALIZACIÓN OFICIAL E IMPRESIÓN DIGITAL */
            <View style={[styles.previewSheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              
              <View style={styles.previewHeaderBorder}>
                <Text style={styles.asociacionText}>ASOCIACIÓN DE SCOUTS DE VENEZUELA</Text>
                <Text style={styles.asociacionSub}>REGIÓN MIRANDA / DISTRITO GUARENAS-GUATIRE • GRUPO SCOUT ORIÓN #84</Text>
                <Text style={[styles.previewTitle, { color: theme.text }]}>
                  TRIMESTRE DE {getActiveUnit().toUpperCase()} — {activeQuarterObj?.name?.toUpperCase()} ({selectedYear})
                </Text>
              </View>

              <View style={[styles.previewInfoGrid, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  <Text style={{ fontWeight: 'bold' }}>Elaborado por: </Text>{elaboratedBy || user?.name || 'Scout'}
                </Text>
                <Text style={{ color: theme.text, fontSize: 13 }}>
                  <Text style={{ fontWeight: 'bold' }}>Meses: </Text>{activeQuarterObj?.months}
                </Text>
              </View>

              {/* OBJETIVO GENERAL PREVIEW */}
              <View style={styles.previewSection}>
                <Text style={[styles.previewSectionHeading, { color: colors.primary }]}>OBJETIVO GENERAL DEL TRIMESTRE</Text>
                <Text style={[styles.previewListItem, { color: theme.text, fontStyle: generalObjective ? 'normal' : 'italic' }]}>
                  {generalObjective || 'Sin objetivo general ingresado.'}
                </Text>
              </View>

              {/* METAS DEL TRIMESTRE PREVIEW */}
              <View style={styles.previewSection}>
                <Text style={[styles.previewSectionHeading, { color: colors.primary }]}>METAS DEL TRIMESTRE</Text>
                {trimestreGoalsList.filter(s => s.trim()).length === 0 ? (
                  <Text style={{ color: theme.subText, fontStyle: 'italic' }}>Sin metas ingresadas.</Text>
                ) : (
                  trimestreGoalsList.filter(s => s.trim()).map((g, i) => (
                    <Text key={i} style={[styles.previewListItem, { color: theme.text }]}>
                      • {g}
                    </Text>
                  ))
                )}
              </View>

              {/* OBJETIVOS ESPECÍFICOS PREVIEW */}
              <View style={styles.previewSection}>
                <Text style={[styles.previewSectionHeading, { color: colors.primary }]}>OBJETIVOS ESPECÍFICOS</Text>
                {specificObjectivesList.filter(s => s.trim()).length === 0 ? (
                  <Text style={{ color: theme.subText, fontStyle: 'italic' }}>Sin objetivos específicos ingresados.</Text>
                ) : (
                  specificObjectivesList.filter(s => s.trim()).map((spec, i) => (
                    <Text key={i} style={[styles.previewListItem, { color: theme.text }]}>
                      • {spec}
                    </Text>
                  ))
                )}
              </View>

              {/* 6 ÁREAS EDUCATIVAS PREVIEW */}
              <View style={styles.previewSection}>
                <Text style={[styles.previewSectionHeading, { color: colors.primary }]}>OBJETIVOS EDUCATIVOS (6 ÁREAS DE CRECIMIENTO)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {[
                    { key: 'corporalidad', label: 'Corporalidad' },
                    { key: 'creatividad', label: 'Creatividad' },
                    { key: 'afectividad', label: 'Afectividad' },
                    { key: 'espiritualidad', label: 'Espiritualidad' },
                    { key: 'caracter', label: 'Carácter' },
                    { key: 'sociabilidad', label: 'Sociabilidad' },
                  ].map(area => {
                    const isChecked = !!educationalAreas[area.key];
                    return (
                      <View
                        key={area.key}
                        style={[
                          styles.previewAreaBadge,
                          { backgroundColor: isChecked ? colors.primary + '15' : theme.inputBg, borderColor: isChecked ? colors.primary : theme.border }
                        ]}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: isChecked ? colors.primary : theme.subText }}>
                          {isChecked ? '✓ ' : '✗ '}{area.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* TABLA DE CRONOGRAMA DE ACTIVIDADES PREVIEW */}
              <View style={styles.previewSection}>
                <Text style={[styles.previewSectionHeading, { color: colors.primary }]}>ACTIVIDADES POR MES</Text>
                
                {currentMonths.map(mName => {
                  const mActs = activities.filter(a => a.month === mName);
                  return (
                    <View key={mName} style={{ marginTop: 8 }}>
                      <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 12, marginBottom: 4 }}>
                        {mName.toUpperCase()}
                      </Text>
                      {mActs.length === 0 ? (
                        <Text style={{ color: theme.subText, fontSize: 11, fontStyle: 'italic' }}>No hay actividades registradas.</Text>
                      ) : (
                        mActs.map((act, i) => (
                          <TouchableOpacity
                            key={act.id || i}
                            style={[
                              styles.previewTableActRow,
                              {
                                borderColor: theme.border,
                                backgroundColor: isDarkMode ? '#1f2937' : '#f8fafc'
                              }
                            ]}
                            onPress={() => handleNavigateToPrograma(act)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.previewTableDay, { color: colors.primary }]}>Día {act.day || '-'}</Text>
                            <View style={{ flex: 1, paddingRight: 6 }}>
                              <Text style={[styles.previewTableActTitle, { color: theme.text }]}>{act.activity || 'Sin título'}</Text>
                              <Text style={[styles.previewTableActSub, { color: theme.subText }]}>
                                Lugar: {act.place || 'Sede'} • Responsable: {act.responsible || 'Rovers'}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#9333ea',
                                paddingHorizontal: 10,
                                paddingVertical: 6,
                                borderRadius: 8,
                                gap: 4
                              }}
                              onPress={() => handleNavigateToPrograma(act)}
                            >
                              <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>📝 Ficha de Programa</Text>
                            </TouchableOpacity>
                          </TouchableOpacity>
                        ))
                      )}
                    </View>
                  );
                })}
              </View>

            </View>
          )
        )}
      </ScrollView>

      {/* MODAL HISTÓRICO ANUAL DE TRIMESTRES */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[modalStyles.title, { color: theme.text }]}>Histórico Anual de Trimestres</Text>
                <Text style={[modalStyles.subTitle, { color: theme.subText }]}>Planes Trimestrales Registrados</Text>
              </View>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {loadingHistory ? (
                <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 20 }} />
              ) : historyPlans.length === 0 ? (
                <Text style={{ color: theme.subText, textAlign: 'center', marginVertical: 20 }}>
                  No hay trimestres anteriores registrados.
                </Text>
              ) : (
                historyPlans.map((hp, idx) => {
                  const qObj = QUARTERS.find(q => q.id === hp.quarter);
                  return (
                    <TouchableOpacity
                      key={hp.id || idx}
                      style={[styles.historyRowCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                      onPress={() => {
                        setSelectedQuarter(hp.quarter);
                        setSelectedYear(hp.year);
                        setHistoryModalVisible(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: 'bold', color: theme.text, fontSize: 15 }}>
                          {qObj?.shortName || hp.quarter} ({hp.year})
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.subText, marginTop: 2 }}>
                          {hp.general_objectives || hp.goals || 'Sin objetivo principal'}
                        </Text>
                      </View>
                      <View style={[styles.statusChip, { backgroundColor: colors.primary + '15', borderColor: colors.primary }]}>
                        <Text style={[styles.statusChipText, { color: colors.primary }]}>{hp.status || 'Guardado'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL FORMULACIÓN Y REVISIÓN CON CAMPO ÚNICO Y LISTAS DINÁMICAS SCOUTER/JEFE DE GRUPO */}
      <Modal visible={selectedScoutItem !== null} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[modalStyles.title, { color: theme.text }]}>
                  {activeQuarterObj?.shortName} — {selectedScoutItem?.scout?.name}
                </Text>
                <Text style={[modalStyles.subTitle, { color: theme.subText }]}>
                  Unidad: {selectedScoutItem?.scout?.unit?.toUpperCase()} • Formulación y Evaluación
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedScoutItem(null)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={[modalStyles.label, { color: theme.subText }]}>ELABORADO POR:</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                value={elaboratedBy}
                onChangeText={setElaboratedBy}
                editable={scouterEditUnlocked}
              />

              {/* CAMPO ÚNICO OBJETIVO GENERAL DEL TRIMESTRE */}
              <Text style={[modalStyles.label, { color: theme.subText, marginTop: 12 }]}>OBJETIVO GENERAL DEL TRIMESTRE:</Text>
              <TextInput
                style={[modalStyles.input, { height: 60, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Objetivo General del Trimestre"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                value={generalObjective}
                onChangeText={setGeneralObjective}
                editable={scouterEditUnlocked}
              />

              {/* LISTA DINÁMICA METAS */}
              <Text style={[modalStyles.label, { color: theme.subText, marginTop: 12 }]}>METAS DEL TRIMESTRE:</Text>
              {trimestreGoalsList.map((goal, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <TextInput
                    style={[modalStyles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    placeholder={`Meta del Trimestre #${idx + 1}`}
                    value={goal}
                    onChangeText={val => handleUpdateListItem(setTrimestreGoalsList, idx, val)}
                    editable={scouterEditUnlocked}
                  />
                  {scouterEditUnlocked && trimestreGoalsList.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveListItem(setTrimestreGoalsList, idx)}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {scouterEditUnlocked && (
                <TouchableOpacity onPress={() => handleAddListItem(setTrimestreGoalsList)} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>+ Agregar otra Meta</Text>
                </TouchableOpacity>
              )}

              {/* LISTA DINÁMICA OBJETIVOS ESPECÍFICOS */}
              <Text style={[modalStyles.label, { color: theme.subText }]}>OBJETIVOS ESPECÍFICOS:</Text>
              {specificObjectivesList.map((spec, idx) => (
                <View key={idx} style={{ flexDirection: 'row', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                  <TextInput
                    style={[modalStyles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                    placeholder={`Objetivo Específico #${idx + 1}`}
                    value={spec}
                    onChangeText={val => handleUpdateListItem(setSpecificObjectivesList, idx, val)}
                    editable={scouterEditUnlocked}
                  />
                  {scouterEditUnlocked && specificObjectivesList.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveListItem(setSpecificObjectivesList, idx)}>
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {scouterEditUnlocked && (
                <TouchableOpacity onPress={() => handleAddListItem(setSpecificObjectivesList)} style={{ marginBottom: 12 }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold' }}>+ Agregar otro Objetivo Específico</Text>
                </TouchableOpacity>
              )}

              {/* CRONOGRAMA DE ACTIVIDADES EN EL MODAL */}
              <Text style={[modalStyles.label, { color: theme.subText, marginTop: 14 }]}>2. CRONOGRAMA DE ACTIVIDADES:</Text>
              {currentMonths.map(monthName => {
                const monthActs = activities.filter(a => a.month === monthName);
                return (
                  <View key={monthName} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>{monthName.toUpperCase()}</Text>
                      {scouterEditUnlocked && (
                        <TouchableOpacity onPress={() => handleAddActivity(monthName)}>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>+ Agregar</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {monthActs.map(act => (
                      <View key={act.id} style={{ padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.border, marginBottom: 6 }}>
                        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4, alignItems: 'center' }}>
                          <TouchableOpacity
                            style={[styles.dayPickerBtn, { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0', borderColor: theme.border }]}
                            onPress={() => scouterEditUnlocked && openDayCalendarPicker(act.id, act.month)}
                            activeOpacity={0.8}
                          >
                            <CalendarIcon size={13} color={colors.primary} style={{ marginRight: 4 }} />
                            <Text style={[styles.dayPickerBtnText, { color: theme.text }]}>
                              {act.day ? `Día ${act.day}` : 'Día'}
                            </Text>
                          </TouchableOpacity>

                          <TextInput
                            style={[modalStyles.input, { flex: 1, padding: 6, fontSize: 12, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                            placeholder="Nombre de la Actividad"
                            value={act.activity}
                            onChangeText={val => handleUpdateActivity(act.id, 'activity', val)}
                            editable={scouterEditUnlocked}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}

              {/* BOTÓN PARA HABILITAR EDICIÓN DE SCOUTER CON CONFIRMACIÓN */}
              {!scouterEditUnlocked ? (
                <TouchableOpacity
                  style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', borderWidth: 1, borderColor: colors.primary, padding: 12, borderRadius: 12, alignItems: 'center', marginTop: 16 }}
                  onPress={() => {
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      if (window.confirm('¿Deseas habilitar la edición del plan trimestral de este joven como Scouter?')) {
                        setScouterEditUnlocked(true);
                      }
                    } else {
                      Alert.alert('Modificar Plan', '¿Deseas habilitar la edición del plan trimestral de este joven como Scouter?', [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Habilitar Edición', onPress: () => setScouterEditUnlocked(true) }
                      ]);
                    }
                  }}
                >
                  <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>✏️ ¿Deseas modificar las actividades de este Plan Trimestral?</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ backgroundColor: '#fef3c7', padding: 10, borderRadius: 10, marginTop: 16 }}>
                  <Text style={{ color: '#92400e', fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
                    🔓 MODO EDICIÓN DE DIRIGENTE ACTIVO (Puedes modificar actividades u objetivos)
                  </Text>
                </View>
              )}

              <Text style={[modalStyles.label, { color: theme.subText, marginTop: 14 }]}>OBSERVACIONES Y RECOMENDACIONES DEL DIRIGENTE:</Text>
              <TextInput
                style={[modalStyles.input, { height: 70, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Escribe recomendaciones u observaciones para el joven..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                value={scouterFeedback}
                onChangeText={setScouterFeedback}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 30 }}>
                <TouchableOpacity
                  style={[modalStyles.btnAction, { backgroundColor: '#f59e0b' }]}
                  onPress={() => handleSavePlanByScouter('Con Observaciones')}
                  disabled={reviewing}
                >
                  <Text style={modalStyles.btnActionText}>Guardar con Observaciones</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[modalStyles.btnAction, { backgroundColor: '#16a34a' }]}
                  onPress={() => handleSavePlanByScouter('Aprobado')}
                  disabled={reviewing}
                >
                  <Text style={modalStyles.btnActionText}>Aprobar Plan Trimestral</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DE REPROGRAMACIÓN / MODIFICACIÓN DE ACTIVIDAD ("MODIFICADO A...") */}
      <Modal visible={modifyModalVisible} transparent animationType="fade" onRequestClose={() => setModifyModalVisible(false)}>
        <View style={modalStyles.overlayPicker}>
          <View style={[modalStyles.cardPicker, { backgroundColor: isDarkMode ? '#18181b' : 'white', borderColor: theme.border, maxWidth: 420 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Edit3 size={18} color="#d97706" style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                  Modificar / Reprogramar
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModifyModalVisible(false)} style={{ padding: 4 }}>
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#fef3c7', padding: 10, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#fde68a' }}>
              <Text style={{ fontSize: 11, color: '#92400e', fontWeight: 'bold' }}>
                📌 Actividad Planificada Originalmente:
              </Text>
              <Text style={{ fontSize: 13, color: '#b45309', fontWeight: 'bold', marginTop: 2 }}>
                {actToModify?.originalActivity || actToModify?.activity}
              </Text>
              <Text style={{ fontSize: 11, color: '#92400e', marginTop: 2 }}>
                Fecha: {actToModify?.month} (Día {actToModify?.day})
              </Text>
            </View>

            <Text style={[styles.label, { color: theme.subText, marginTop: 4 }]}>NUEVO NOMBRE DE LA ACTIVIDAD *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
              placeholder="Ej: Reunión de Nudos y Juegos en Sede"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={newActivityName}
              onChangeText={setNewActivityName}
            />

            <Text style={[styles.label, { color: theme.subText, marginTop: 4 }]}>MOTIVO DEL CAMBIO / AJUSTE *</Text>
            <TextInput
              style={[styles.input, { height: 65, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginBottom: 16, textAlignVertical: 'top' }]}
              placeholder="Ej: Condiciones climáticas / Mantenimiento de instalaciones / Fuerza mayor"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              multiline
              value={modificationReason}
              onChangeText={setModificationReason}
            />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={{ flex: 1, padding: 12, borderRadius: 10, backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0', alignItems: 'center' }}
                onPress={() => setModifyModalVisible(false)}
              >
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1.5, padding: 12, borderRadius: 10, backgroundColor: '#d97706', alignItems: 'center' }}
                onPress={handleApplyModification}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Guardar Cambio</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PICKER DE CALENDARIO PARA SELECCIONAR EL DÍA DE LA ACTIVIDAD DENTRO DEL AÑO Y MES CORRESPONDIENTE */}
      <Modal visible={dayPickerVisible} transparent animationType="fade">
        <View style={modalStyles.overlayPicker}>
          <View style={[modalStyles.cardPicker, { backgroundColor: isDarkMode ? '#18181b' : 'white', borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                Seleccionar Día ({targetMonthName} {selectedYear})
              </Text>
              <TouchableOpacity onPress={() => setDayPickerVisible(false)}>
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <RNCalendar
              current={getInitialDateForMonth(targetMonthName, selectedYear)}
              onDayPress={(dayData: DateData) => {
                const selectedDayNum = String(parseInt(dayData.day.toString(), 10));
                if (targetActId) {
                  handleUpdateActivity(targetActId, 'day', selectedDayNum);
                }
                setDayPickerVisible(false);
              }}
              theme={{
                calendarBackground: isDarkMode ? '#18181b' : '#ffffff',
                textSectionTitleColor: isDarkMode ? '#a1a1aa' : '#b6c1cd',
                selectedDayBackgroundColor: colors.primary,
                todayTextColor: colors.primary,
                dayTextColor: isDarkMode ? '#ffffff' : '#2d4150',
                arrowColor: colors.primary,
                monthTextColor: isDarkMode ? '#ffffff' : colors.primary,
                textDayFontWeight: 'bold',
                textMonthFontWeight: 'bold',
              }}
            />
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  asociacionBanner: { marginBottom: 6 },
  asociacionText: { fontSize: 13, fontWeight: '900', color: colors.primary, letterSpacing: 0.5 },
  asociacionSub: { fontSize: 10, fontWeight: 'bold', color: '#64748b' },
  title: { fontSize: 17, fontWeight: 'bold' },
  headerMainRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12, flexWrap: 'wrap', gap: 10 },
  yearAndHistoryGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  yearSelectorRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  yearArrowBtn: { padding: 3 },
  yearText: { fontSize: 13, fontWeight: 'bold', marginHorizontal: 4 },

  historyBtnHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  historyBtnHeaderText: { fontSize: 11, fontWeight: 'bold', color: colors.primary },

  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  actionPillBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionPillBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  modeToggleGroup: { flexDirection: 'row', borderRadius: 10, padding: 3, borderWidth: 1 },
  modeToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  modeToggleText: { fontSize: 12 },

  quarterTabsContainer: { flexDirection: 'row', gap: 8, marginTop: 4, marginBottom: 8 },
  quarterTabCard: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center' },
  quarterTabCardText: { fontSize: 12 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e2e8f0', marginRight: 8 },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: 'white', fontWeight: 'bold' },

  quarterInfoCard: { padding: 12, borderRadius: 14, borderWidth: 1 },
  quarterName: { fontSize: 14, fontWeight: 'bold' },
  quarterMonths: { fontSize: 12, fontWeight: 'bold' },

  documentSheet: { borderRadius: 18, padding: 18, borderWidth: 1, marginBottom: 16 },
  sheetTopRow: { flexDirection: 'row', marginBottom: 14 },
  statusBanner: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 14 },
  statusBannerText: { fontWeight: 'bold', fontSize: 11 },
  bannerApproved: { backgroundColor: '#dcfce7', color: '#16a34a' },
  bannerPending: { backgroundColor: '#fef3c7', color: '#d97706' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 4, marginTop: 10 },
  inputLabel: { fontSize: 11, fontWeight: '800', marginBottom: 4, marginTop: 10 },
  trafficCard: { borderRadius: 10, borderWidth: 1 },
  input: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 13 },
  textArea: { height: 75, textAlignVertical: 'top' },

  dynamicRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  itemBulletIndex: { fontSize: 13, fontWeight: 'bold', width: 18 },
  deleteListItemBtn: { padding: 6 },
  addDynamicBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  addDynamicBtnText: { fontSize: 12, fontWeight: 'bold' },

  areasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  areaChipBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1 },
  areaChipText: { fontSize: 12 },

  monthBlock: { padding: 12, borderRadius: 14, borderWidth: 1, marginTop: 10 },
  monthHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthTitleText: { fontSize: 13, fontWeight: 'bold', letterSpacing: 0.5 },
  addActBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  addActBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  noActText: { fontSize: 11, fontStyle: 'italic', marginVertical: 4 },
  activityRowCard: { padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  dayPickerBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  dayPickerBtnText: { fontSize: 12, fontWeight: 'bold' },
  deleteActBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },

  feedbackBox: { marginTop: 14, padding: 12, borderRadius: 12 },
  saveSubmitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  saveSubmitText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  // PREVISUALIZACIÓN OFICIAL STYLES
  previewSheet: { borderRadius: 18, padding: 20, borderWidth: 1, marginBottom: 16 },
  previewHeaderBorder: { borderBottomWidth: 2, borderBottomColor: colors.primary, paddingBottom: 10, marginBottom: 12 },
  previewTitle: { fontSize: 15, fontWeight: '900', marginTop: 6, letterSpacing: 0.5 },
  previewInfoGrid: { borderBottomWidth: 1, paddingBottom: 10, marginBottom: 14 },
  previewSection: { marginBottom: 16 },
  previewSectionHeading: { fontSize: 12, fontWeight: 'bold', letterSpacing: 0.5, marginBottom: 4 },
  previewListItem: { fontSize: 13, marginVertical: 2, paddingLeft: 4 },
  previewAreaBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  previewTableActRow: { padding: 8, borderRadius: 8, borderWidth: 1, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewTableDay: { fontSize: 12, fontWeight: 'bold', width: 50 },
  previewTableActTitle: { fontSize: 13, fontWeight: 'bold' },
  previewTableActSub: { fontSize: 11, marginTop: 2 },

  historyRowCard: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  sectionHeading: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  emptyCard: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  scoutPlanRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  avatarMini: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  avatarMiniText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  scoutRowName: { fontSize: 15, fontWeight: 'bold' },
  scoutRowSub: { fontSize: 12, marginTop: 2 },
  noPlanWarningText: { fontSize: 11, fontStyle: 'italic', marginTop: 2 },
  unitBadgeMini: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  unitBadgeMiniText: { color: 'white', fontSize: 9, fontWeight: 'bold' },
  statusChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusChipText: { fontSize: 10, fontWeight: 'bold' }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 17, fontWeight: 'bold' },
  subTitle: { fontSize: 12, marginTop: 2 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 4, marginTop: 10 },
  input: { borderRadius: 10, borderWidth: 1, padding: 10, fontSize: 13 },
  textArea: { height: 75, textAlignVertical: 'top' },
  btnAction: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  btnActionText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  overlayPicker: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  cardPicker: { width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1, padding: 16 }
});
