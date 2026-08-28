import React, { useState, useEffect } from 'react';
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
import { Compass, Edit3, MessageSquare, Plus, CheckCircle, AlertCircle, X, Shield, Calendar as CalendarIcon, Trash2, Check, Eye, Download, ChevronLeft, ChevronRight, Copy, FileSpreadsheet, History } from 'lucide-react-native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { supabase } from '../lib/supabaseClient';
import { notificationService } from '../services/notificationService';
import { QUARTERS } from '../data/trimestresData';
import { colors, UNIT_COLORS } from '../theme/colors';
import { showAlert } from '../utils/alert';

interface ActivityRow {
  id: string;
  month: string;
  day: string;
  activity: string;
  place: string;
  responsible: string;
  planB?: string;
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

export default function QuarterlyPlanScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1');
  // Año actual en tiempo real en todo momento
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [unitFilter, setUnitFilter] = useState<string>('all');
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

  const isScouter = user?.role === 'scouter' || user?.role === 'jefe_grupo';
  const isJefeGrupo = user?.role === 'jefe_grupo';

  const currentMonths = MONTH_NAMES_BY_QUARTER[selectedQuarter] || [];
  const activeQuarterObj = QUARTERS.find(q => q.id === selectedQuarter);

  useEffect(() => {
    loadData();

    // Sincronización en tiempo real vía WebSockets (estilo WhatsApp)
    const channel = supabase
      .channel(`realtime_quarterly_plans_${selectedQuarter}_${selectedYear}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quarterly_plans' },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedQuarter, selectedYear, unitFilter]);

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

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const targetUnit = isScouter && unitFilter !== 'all' ? unitFilter : (user.unit || 'clan');
      const plan = await dataService.getUnitSharedQuarterlyPlan(
        user.group_name || '',
        targetUnit,
        selectedQuarter,
        selectedYear
      ) || await dataService.getQuarterlyPlan(user.id, selectedQuarter, selectedYear);

      setScoutPlan(plan);
      if (plan) {
        setElaboratedBy(plan.elaborated_by || user.name || '');
        setGeneralObjective(plan.general_objectives || plan.goals || '');
        setTrimestreGoalsList(parseStringToList(plan.trimestre_goals));
        setSpecificObjectivesList(parseStringToList(plan.specific_objectives));
        if (plan.educational_areas) setEducationalAreas(plan.educational_areas);
        if (plan.monthly_activities && Array.isArray(plan.monthly_activities)) {
          setActivities(plan.monthly_activities);
        } else {
          setActivities([]);
        }
      } else {
        setElaboratedBy(user.name || '');
        setGeneralObjective('');
        setTrimestreGoalsList(['']);
        setSpecificObjectivesList(['']);
        setActivities([]);
      }
    } catch (err) {
      console.error('Error cargando plan trimestral compartido:', err);
    } finally {
      setLoading(false);
    }
  };

  // CARGAR HISTÓRICO ANUAL DE TRIMESTRES
  const openHistoryModal = async () => {
    if (!user) return;
    setHistoryModalVisible(true);
    setLoadingHistory(true);
    try {
      const history = await dataService.getQuarterlyPlansHistory(user.id);
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
    const unitName = (user?.unit || 'CLAN').toUpperCase();
    const monthAbbr = QUARTER_MONTH_ABBR[selectedQuarter] || 'ABR.MAY.JUN';
    const monthFullText = QUARTER_MONTH_FULL_TEXT[selectedQuarter] || 'ABRIL, MAYO Y JUNIO';
    const fileName = `TRIMESTRE ${unitName} ${monthAbbr}.xls`;

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
    const unitName = (user?.unit || 'Clan').toUpperCase();
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

  // Manejadores para Listas Dinámicas
  const handleAddListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const handleUpdateListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleRemoveListItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  // Manejadores para Actividades
  const handleAddActivity = (monthName: string) => {
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
    setActivities(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  const handleRemoveActivity = (id: string) => {
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const toggleArea = (key: string) => {
    setEducationalAreas(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const openDayCalendarPicker = (actId: string, monthName: string) => {
    setTargetActId(actId);
    setTargetMonthName(monthName);
    setDayPickerVisible(true);
  };

  const handleSaveScoutPlan = async () => {
    if (!user) return;
    const goalsStr = trimestreGoalsList.filter(s => s.trim().length > 0).join('\n');
    const specificStr = specificObjectivesList.filter(s => s.trim().length > 0).join('\n');

    if (!generalObjective.trim() && !goalsStr) {
      showAlert('Campo Requerido', 'Por favor ingresa las metas o el objetivo general de este trimestre.');
      return;
    }

    const targetUnit = isScouter && unitFilter !== 'all' ? unitFilter : (user.unit || 'clan');

    setSavingScout(true);
    try {
      await dataService.saveQuarterlyPlan({
        scout_id: user.id,
        group_name: user.group_name || 'Grupo Scout Orión #84',
        unit: targetUnit,
        quarter: selectedQuarter,
        year: selectedYear,
        elaborated_by: elaboratedBy.trim() || user.name,
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
        message: `${elaboratedBy.trim() || user.name} ha actualizado las metas y actividades del Plan Trimestral de ${targetUnit.toUpperCase()}.`,
        type: 'plan'
      }).catch(() => {});

      setScouterEditUnlocked(false);
      showAlert('¡Plan Trimestral Guardado!', `Se han actualizado las actividades de la unidad para el ${selectedQuarter}. Creado/Modificado por: ${elaboratedBy || user.name}.`);
      loadData();
    } catch (err: any) {
      showAlert('Error al guardar', err?.message || 'No se pudo guardar el plan trimestral.');
    } finally {
      setSavingScout(false);
    }
  };

  // CONFIRMACIÓN DOBLE PARA DESBLOQUEAR EDICIÓN DEL PLAN COMPARTIDO DE LA UNIDAD
  const handleConfirmUnlockEdit = () => {
    const unitName = (user?.unit || 'CLAN').toUpperCase();
    const confirmMsg = `¿Estás seguro de modificar el Plan Trimestral compartido de la Unidad (${unitName})?\n\nCualquier cambio que realices actualizará las actividades para todos los jóvenes y scouters de tu unidad.`;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(confirmMsg)) {
        setScouterEditUnlocked(true);
      }
    } else {
      Alert.alert(
        '¿Editar Plan Trimestral de Unidad?',
        confirmMsg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sí, deseo editar', onPress: () => setScouterEditUnlocked(true) }
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

    if (user) {
      await dataService.saveQuarterlyPlan({
        scout_id: user.id,
        quarter: selectedQuarter,
        year: selectedYear,
        elaborated_by: user.name || '',
        general_objectives: '',
        trimestre_goals: '',
        specific_objectives: '',
        educational_areas: { corporalidad: false, creatividad: false, afectividad: false, espiritualidad: false, caracter: false, sociabilidad: false },
        monthly_activities: []
      });
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
        {/* BANNER DE ASOCIACIÓN */}
        <View style={styles.asociacionBanner}>
          <Text style={styles.asociacionText}>ASOCIACIÓN DE SCOUTS DE VENEZUELA</Text>
          <Text style={styles.asociacionSub}>REGIÓN MIRANDA / DISTRITO GUARENAS-GUATIRE • GRUPO SCOUT ORIÓN #84</Text>
        </View>

        {/* TÍTULO Y SELECTOR DE AÑO / HISTÓRICO */}
        <View style={styles.headerMainRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            TRIMESTRE DE {(user?.unit || 'CLAN').toUpperCase()}
          </Text>

          <View style={styles.yearAndHistoryGroup}>
            <View style={[styles.yearSelectorRow, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
              <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)} style={styles.yearArrowBtn}>
                <ChevronLeft size={16} color={colors.primary} />
              </TouchableOpacity>
              <Text style={[styles.yearText, { color: theme.text }]}>{selectedYear}</Text>
              <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)} style={styles.yearArrowBtn}>
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
        {!isScouter && (
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
        )}

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
                onPress={() => setSelectedQuarter(q.id)}
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

        {/* FILTROS POR UNIDAD PARA JEFE DE GRUPO */}
        {isJefeGrupo && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4, marginBottom: 8 }}>
            <TouchableOpacity
              style={[styles.filterChip, unitFilter === 'all' && styles.filterChipActive]}
              onPress={() => setUnitFilter('all')}
            >
              <Text style={[styles.filterChipText, unitFilter === 'all' && styles.filterChipTextActive]}>
                Todas las Unidades
              </Text>
            </TouchableOpacity>
            {Object.keys(UNIT_COLORS).map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.filterChip, unitFilter === u && { backgroundColor: UNIT_COLORS[u] }]}
                onPress={() => setUnitFilter(u)}
              >
                <Text style={[styles.filterChipText, unitFilter === u && { color: 'white', fontWeight: 'bold' }]}>
                  {u.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
                <Text style={{ fontWeight: 'bold', fontSize: 13, color: colors.primary }}>
                  📌 Plan Trimestral Único de la Unidad ({(user?.unit || 'CLAN').toUpperCase()}) — {selectedQuarter}
                </Text>
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
                    onChangeText={setElaboratedBy}
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
                onChangeText={setGeneralObjective}
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
                        <View key={act.id} style={[styles.activityRowCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
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

                          <View style={{ flexDirection: 'row', gap: 6 }}>
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
                        </View>
                      ))
                    )}
                  </View>
                );
              })}

              {scoutPlan?.scouter_feedback ? (
                <View style={[styles.feedbackBox, { backgroundColor: isDarkMode ? '#27272a' : '#fef3c7' }]}>
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
                  TRIMESTRE DE {(user?.unit || 'CLAN').toUpperCase()} — {activeQuarterObj?.name?.toUpperCase()} ({selectedYear})
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
                          <View key={i} style={[styles.previewTableActRow, { borderColor: theme.border }]}>
                            <Text style={[styles.previewTableDay, { color: colors.primary }]}>Día {act.day || '-'}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.previewTableActTitle, { color: theme.text }]}>{act.activity || 'Sin título'}</Text>
                              <Text style={[styles.previewTableActSub, { color: theme.subText }]}>
                                Lugar: {act.place || 'Sede'} • Responsable: {act.responsible || 'Rovers'}
                              </Text>
                            </View>
                          </View>
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
