import React, { useState, useCallback } from 'react';
import { liveStyles } from '../theme/liveStyles';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Platform,
  Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CheckSquare, Square, Lock, Send, Clock, Check, ChevronRight, CalendarDays, Undo2, WifiOff, Flag, X, CheckCircle, Award, Sparkles, Plus, Trash2, LayoutGrid, List, ArrowLeft, ExternalLink } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { supabase } from '../lib/supabaseClient';
import { dataService } from '../lib/dataService';
import { stagesData } from '../data/progressionTemplate';
import { StageBadgeIcon } from '../components/StageBadgeIcon';
import { NochesAireLibreModal } from '../components/NochesAireLibreModal';
import { VidaGrupoModal } from '../components/VidaGrupoModal';
import { ActividadesPersonalesModal } from '../components/ActividadesPersonalesModal';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { checkProfileCompletion } from '../utils/profileGuard';
import { navigateBackOrHome } from '../utils/navigationHelper';
import { formatDateEs, humanDuration } from '../utils/dateLocal';
import { SecureImage } from '../components/SecureImage';
import CipStageModal from '../components/CipStageModal';
import { SkeletonScreen } from '../components/Skeleton';
import { Btn, Card, Chip, CheckMark, CountUp, Enter, Notice, Pop, Press, ProgressBar } from '../components/ui';
import { RADIUS, SPACE, TYPE } from '../theme/tokens';
import { useNotifications } from '../context/NotificationContext';

export default function StageDetailScreen({ route, navigation }: any) {
  const { stageId } = route.params || { stageId: 'precursor' };
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const stageTemplate = stagesData.find(s => s.id === stageId);

  const [loading, setLoading] = useState(true);
  const [checks, setChecks]   = useState<Record<string, boolean>>({});
  const [status, setStatus]   = useState<string>('En Progreso');
  const [confirming, setConfirming] = useState(false);
  // Hoja de envío: mensaje opcional para el dirigente; y pantalla de confirmación al terminar
  const [sendNote, setSendNote] = useState('');
  const [sent, setSent] = useState<null | 'ok' | 'queued'>(null);
  const { notifications: allNotifs } = useNotifications();

  // Modal para seleccionar Eventos CIP (Ciclos Institucionales de Programa)
  const [showCipModal, setShowCipModal] = useState(false);
  const [selectedReqForCip, setSelectedReqForCip] = useState<any>(null);
  const [cipCountMap, setCipCountMap] = useState<Record<string, number>>({});

  // Modal para vincular Especialidades / Cursos
  const [showCertModal, setShowCertModal] = useState(false);
  const [userCerts, setUserCerts] = useState<any[]>([]);
  const [selectedReqForCert, setSelectedReqForCert] = useState<any>(null);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [linkedCertMap, setLinkedCertMap] = useState<Record<string, { certId?: string; certTitle: string; level?: string }>>({});
  const [certFilterLevel, setCertFilterLevel] = useState<string>('ALL');
  const [certModalViewMode, setCertModalViewMode] = useState<'list' | 'grid'>('list');
  const [usedElsewhereMap, setUsedElsewhereMap] = useState<Record<string, { stageTitle: string; reqText: string }>>({});

  // Modal para Registro de Noches de Vida al Aire Libre
  const [showNochesModal, setShowNochesModal] = useState(false);
  const [selectedReqForNoches, setSelectedReqForNoches] = useState<any>(null);
  const [nochesCountMap, setNochesCountMap] = useState<Record<string, number>>({});

  // Modal para Vida de Grupo (Peregrinajes, Campamentos, Proyecto de Servicio)
  const [showVidaGrupoModal, setShowVidaGrupoModal] = useState(false);
  const [selectedReqForVidaGrupo, setSelectedReqForVidaGrupo] = useState<any>(null);
  const [vidaGrupoCountMap, setVidaGrupoCountMap] = useState<Record<string, number>>({});
  const [stageDates, setStageDates] = useState<Record<string, string>>({});

  // Estado para Actividades Personales (de creación propia)
  const [showPersonalesModal, setShowPersonalesModal] = useState(false);
  const [selectedReqForPersonales, setSelectedReqForPersonales] = useState<any>(null);
  const [personalesCountMap, setPersonalesCountMap] = useState<Record<string, number>>({});


  useModalBackHandler(showCipModal, () => setShowCipModal(false));
  useModalBackHandler(showCertModal, () => setShowCertModal(false));
  useModalBackHandler(showNochesModal, () => setShowNochesModal(false));
  useModalBackHandler(showVidaGrupoModal, () => setShowVidaGrupoModal(false));
  useModalBackHandler(confirming, () => setConfirming(false));

  useFocusEffect(
    useCallback(() => { loadData(); }, [user, stageId])
  );

  const loadData = async () => {
    if (!user || !stageTemplate) return;
    setLoading(true);
    try {
      // 1. Obtener estado en base a la progresión general
      // Con copia offline: sin red se mantiene la etapa real (no se bloquea todo)
      const statusMap: Record<string, string> = await dataService.getAllStageStatuses(user.id);

      let prevApproved = true;
      let effectiveStatus = 'En Progreso';
      for (const stg of stagesData) {
        const dbStatus = statusMap[stg.id];
        let displayStatus: string;
        if (!prevApproved) {
          displayStatus = 'Bloqueada';
        } else if (dbStatus === 'Aprobada') {
          displayStatus = 'Aprobada';
        } else if (dbStatus === 'En Revision') {
          displayStatus = 'En Revision';
        } else {
          displayStatus = 'En Progreso';
        }
        prevApproved = dbStatus === 'Aprobada';
        if (stg.id === stageId) {
          effectiveStatus = displayStatus;
          break;
        }
      }

      setStatus(effectiveStatus as any);
      const reqChecks: Record<string, boolean> = {};
      const links: Record<string, { certId?: string; certTitle: string; level?: string }> = {};
      const nightsMap: Record<string, number> = {};
      const vgMap: Record<string, number> = {};
      const cipsMap: Record<string, number> = {};
      const personalesMap: Record<string, number> = {};

      const allLinkedCerts = await dataService.getAllLinkedCertificates(user.id);
      dataService.getStageDates(user.id).then(setStageDates).catch(() => {});
      const userCertsList = await dataService.getCertificates(user.id);

      for (const req of stageTemplate.requirements) {
        const val = await dataService.getRequirement(user.id, stageId, req.id);
        reqChecks[req.id] = val;

        if (req.type === 'aire_libre' || req.text.toLowerCase().includes('noche')) {
          try {
            const nights = await dataService.getNightsLog(user.id, stageId, req.id);
            const total = (nights || []).reduce((acc: number, item: any) => acc + (item.nightsCount || 1), 0);
            nightsMap[req.id] = total;
            if (total >= (req.requiredCount || 10)) {
              reqChecks[req.id] = true;
            }
          } catch {}
        }

        if (req.type === 'vida_grupo' || req.text.toLowerCase().includes('peregrinaje') || req.text.toLowerCase().includes('campamento') || req.text.toLowerCase().includes('proyecto de servicio') || req.text.toLowerCase().includes('vida de grupo')) {
          try {
            const vgLogs = await dataService.getVidaGrupoLog(user.id, stageId, req.id);
            const total = (vgLogs || []).length;
            vgMap[req.id] = total;
            if (total >= (req.requiredCount || 1)) {
              reqChecks[req.id] = true;
            }
          } catch {}
        }

        if (req.type === 'personales') {
          try {
            const acts = await dataService.getPersonalActivities(user.id, stageId, req.id);
            const total = (acts || []).length;
            personalesMap[req.id] = total;
            if (total >= (req.requiredCount || 3)) {
              reqChecks[req.id] = true;
            }
          } catch {}
        }

        if (req.type === 'ciclos' || req.text.toLowerCase().includes('ciclo')) {
          try {
            const cipSels = await dataService.getCipSelections(user.id, stageId, req.id);
            const total = (cipSels || []).length;
            cipsMap[req.id] = total;
            if (total >= (req.requiredCount || 1)) {
              reqChecks[req.id] = true;
            }
          } catch {}
        }

        if (req.type === 'cursos' || req.type === 'especialidad') {
          const directLink = allLinkedCerts[`${stageId}_${req.id}`];
          if (directLink && directLink.certTitle) {
            links[req.id] = directLink;
            reqChecks[req.id] = true;
          }
        }
      }
      setChecks(reqChecks);
      setLinkedCertMap(links);
      setNochesCountMap(nightsMap);
      setVidaGrupoCountMap(vgMap);
      setCipCountMap(cipsMap);
      setPersonalesCountMap(personalesMap);
    } catch (err) {
      console.error('Error al cargar avance de etapa:', err);
    } finally {
      setLoading(false);
    }
  };

  const isBlocked = status === 'Bloqueada';
  const isReadOnly = status === 'En Revision' || status === 'Aprobada' || status === 'Bloqueada';

  const openCipModal = async (req: any) => {
    setSelectedReqForCip(req);
    setShowCipModal(true);
  };


  const openCertModal = async (req: any) => {
    setSelectedReqForCert(req);
    setCertFilterLevel(req.level ? req.level.toLowerCase() : 'ALL');
    setShowCertModal(true);
    setLoadingCerts(true);
    if (user?.id) {
      const certs = await dataService.getCertificates(user.id);
      setUserCerts(certs || []);

      const allLinks = await dataService.getAllLinkedCertificates(user.id);

      // Escanear todas las etapas y requisitos para detectar si algún certificado ya fue usado
      const usedMap: Record<string, { stageTitle: string; reqText: string }> = {};
      for (const stg of stagesData) {
        for (const r of stg.requirements) {
          if (stg.id === stageId && r.id === req.id) continue; // No bloquear el requisito actual
          const link = allLinks[`${stg.id}_${r.id}`] || allLinks[r.id];
          if (link) {
            if (link.certId) {
              usedMap[link.certId] = {
                stageTitle: stg.title,
                reqText: r.text
              };
            }
            if (link.certTitle) {
              usedMap[`${link.certTitle}_${link.level || ''}`.toLowerCase()] = {
                stageTitle: stg.title,
                reqText: r.text
              };
            }
          }
        }
      }
      setUsedElsewhereMap(usedMap);
    }
    setLoadingCerts(false);
  };

  const handleSelectCert = async (cert: any) => {
    if (!user || !selectedReqForCert || isReadOnly) return;

    // Mismo criterio que la lista: el certificado exacto, o el mismo título EN EL MISMO NIVEL.
    // (Cocina Bronce y Cocina Plata son insignias distintas: usar una no bloquea la otra.)
    const usedIn = usedElsewhereMap[cert.id] || usedElsewhereMap[`${cert.title}_${cert.level || ''}`.toLowerCase()];
    if (usedIn) {
      showAlert(
        'Certificado Ya Utilizado',
        `Esta acreditación "${cert.title}" ya fue utilizada para completar el requisito "${usedIn.reqText}" en la etapa "${usedIn.stageTitle}". No se puede reutilizar el mismo certificado para múltiples requisitos.`
      );
      return;
    }

    const linkObj = {
      certId: cert.id,
      certTitle: cert.title,
      level: cert.level,
      date: cert.date || cert.created_at
    };

    setChecks(prev => ({ ...prev, [selectedReqForCert.id]: true }));
    setLinkedCertMap(prev => ({
      ...prev,
      [selectedReqForCert.id]: linkObj
    }));

    await dataService.toggleRequirement(user.id, stageId, selectedReqForCert.id, true);
    await dataService.saveLinkedCertificate(user.id, stageId, selectedReqForCert.id, linkObj);

    showAlert('¡Especialidad/Curso Vinculado!', `Has vinculado "${cert.title}" a tu requisito.`);
    setShowCertModal(false);
  };

  // Solo para DESMARCAR. Marcar sin certificado ya no se permite: hay que subirlo y vincularlo.
  const handleQuickToggleCert = async (newVal: boolean) => {
    if (!user || !selectedReqForCert || isReadOnly) return;
    if (newVal) return;

    setChecks(prev => ({ ...prev, [selectedReqForCert.id]: newVal }));
    if (!newVal) {
      setLinkedCertMap(prev => {
        const next = { ...prev };
        delete next[selectedReqForCert.id];
        return next;
      });
      await dataService.saveLinkedCertificate(user.id, stageId, selectedReqForCert.id, null);
    }

    await dataService.toggleRequirement(user.id, stageId, selectedReqForCert.id, newVal);

    showAlert(
      newVal ? '¡Requisito Marcado!' : 'Requisito Desmarcado',
      newVal ? `Has marcado "${selectedReqForCert.text}" como completado.` : `Has desmarcado "${selectedReqForCert.text}".`
    );
    setShowCertModal(false);
  };

  const handleRequirementClick = async (req: any) => {
    if (!checkProfileCompletion(user, navigation)) return;

    if (isBlocked) {
      showAlert('Etapa bloqueada', 'Debes completar y tener aprobada la etapa anterior para poder interactuar con los requisitos de esta etapa.');
      return;
    }

    if (isReadOnly) {
      // Etapa aprobada o en revisión: se puede CONSULTAR lo registrado, sin editar
      const t = req.text.toLowerCase();
      if (req.type === 'basica' || req.type === 'opcional') {
        navigation.navigate('CatalogSelector', {
          stageId, reqId: req.id, reqType: req.reqType || req.type,
          requiredCount: req.requiredCount || 12, stageStatus: status,
        });
        return;
      }
      if (req.type === 'personales') {
        setSelectedReqForPersonales(req);
        setShowPersonalesModal(true);
        return;
      }
      if (req.type === 'vida_grupo' || t.includes('peregrinaje') || t.includes('campamento') || t.includes('proyecto de servicio') || t.includes('vida de grupo')) {
        setSelectedReqForVidaGrupo(req);
        setShowVidaGrupoModal(true);
        return;
      }
      if (req.type === 'aire_libre' || t.includes('noche')) {
        setSelectedReqForNoches(req);
        setShowNochesModal(true);
        return;
      }
      if (req.type === 'ciclos' || t.includes('ciclo')) {
        let sels: any[] = [];
        try { sels = user ? await dataService.getCipSelections(user.id, stageId, req.id) : []; } catch {}
        showAlert(
          `${req.text}`,
          sels.length
            ? sels.map((c: any) => `• ${c.title}${c.date ? ` (${formatDateEs(String(c.date).slice(0, 10))})` : ''}`).join('\n')
            : 'Convalidado al aprobar la etapa (no se registró cuáles actividades fueron).'
        );
        return;
      }
      if (req.type === 'cursos' || req.type === 'especialidad') {
        const link = linkedCertMap[req.id];
        showAlert(
          `${req.text}`,
          link?.certTitle
            ? `Acreditado con: ${link.certTitle}${link.level ? ` (${link.level})` : ''}`
            : 'Convalidado al aprobar la etapa (sin certificado vinculado).'
        );
        return;
      }
      showAlert(
        status === 'Aprobada' ? 'Etapa aprobada' : 'En revisión',
        `${req.text}\n\n${checks[req.id] ? 'Cumplido.' : 'No marcado.'}${status === 'En Revision' ? ' La etapa está en revisión y no se puede modificar.' : ''}`
      );
      return;
    }

    if (req.type === 'basica' || req.type === 'opcional') {
      navigation.navigate('CatalogSelector', {
        stageId,
        reqId: req.id,
        reqType: req.reqType || req.type,
        requiredCount: req.requiredCount || 12,
        stageStatus: status,
      });
      return;
    }

    if (req.type === 'cursos' || req.type === 'especialidad') {
      openCertModal(req);
      return;
    }

    if (req.type === 'ciclos' || req.text.toLowerCase().includes('ciclo') || req.text.toLowerCase().includes('6p')) {
      openCipModal(req);
      return;
    }

    if (req.type === 'vida_grupo' || req.text.toLowerCase().includes('peregrinaje') || req.text.toLowerCase().includes('campamento') || req.text.toLowerCase().includes('proyecto de servicio') || req.text.toLowerCase().includes('vida de grupo')) {
      setSelectedReqForVidaGrupo(req);
      setShowVidaGrupoModal(true);
      return;
    }

    if (req.type === 'personales') {
      setSelectedReqForPersonales(req);
      setShowPersonalesModal(true);
      return;
    }

    if (req.type === 'aire_libre' || req.text.toLowerCase().includes('noche')) {
      setSelectedReqForNoches(req);
      setShowNochesModal(true);
      return;
    }

    const currentVal = !!checks[req.id];
    const newVal = !currentVal;

    setChecks(prev => ({ ...prev, [req.id]: newVal }));
    if (user) {
      await dataService.toggleRequirement(user.id, stageId, req.id, newVal);
    }
  };

  const calculateProgress = () => {
    if (!stageTemplate) return 0;
    const total = stageTemplate.requirements.length;
    if (total === 0) return 0;

    let checkedCount = 0;
    stageTemplate.requirements.forEach(req => {
      if (checks[req.id]) checkedCount++;
    });

    return Math.round((checkedCount / total) * 100);
  };

  const handleSendToReview = async () => {
    if (!user) return;
    if (!checkProfileCompletion(user, navigation)) return;
    setConfirming(false);
    const note = sendNote.trim();
    // El aviso a los dirigentes viaja con el envío: sin red, ambos esperan en la cola
    const res = await dataService.submitStageForReview(user.id, stageId, {
      senderId: user.id,
      groupName: user.group_name || undefined,
      unit: user.unit || undefined,
      receiverRole: 'scouter',
      title: 'Ficha Enviada a Revisión',
      message: `${user.name || 'Scout'} ha enviado la etapa "${stageTemplate?.title || 'Etapa'}" a revisión.${note ? ` Mensaje: ${note}` : ''}`,
      type: 'badge'
    });
    setStatus('En Revision');
    setSendNote('');
    // Pantalla de confirmación (antes era una ventana de aviso del navegador)
    setSent(res?.queued ? 'queued' : 'ok');
  };

  if (loading || !stageTemplate) {
    return (
      <SkeletonScreen variant="list" />
    );
  }

  const progress = isBlocked ? 0 : calculateProgress();
  const totalReqs = stageTemplate.requirements.length;
  const doneReqs = stageTemplate.requirements.filter(r => checks[r.id]).length;
  const missing = totalReqs - doneReqs;
  const stageIdx = stagesData.findIndex(s => s.id === stageId);
  const nextStage = stageIdx >= 0 ? stagesData[stageIdx + 1] : undefined;

  // Etapa devuelta por el dirigente: el último aviso «Devuelta» que nombra esta etapa
  const returnedNotif = status === 'En Progreso'
    ? allNotifs.find(n => /devuelt/i.test(n.title || '') && String(n.message || '').includes(`"${stageTemplate.title}"`))
    : undefined;
  const returnedReason = returnedNotif
    ? (String(returnedNotif.message || '').split(`"${stageTemplate.title}":`)[1] || '').trim()
    : '';

  const statusChip = status === 'Aprobada' ? { label: 'Aprobada', tone: 'ok' as const, Icon: Check }
    : status === 'En Revision' ? { label: 'En revisión', tone: 'warn' as const, Icon: Clock }
    : status === 'Bloqueada' ? { label: 'Bloqueada', tone: 'neutral' as const, Icon: Lock }
    : returnedNotif ? { label: 'Devuelta', tone: 'err' as const, Icon: Undo2 }
    : progress === 100 ? { label: 'Completa', tone: 'accent' as const, Icon: undefined }
    : { label: 'En progreso', tone: 'accent' as const, Icon: undefined };

  /** Línea de ayuda bajo cada requisito: qué hay registrado y qué pasa al tocarlo. */
  const hintFor = (req: any, isChecked: boolean): { text: string; done: boolean } | null => {
    const t = req.text.toLowerCase();
    if (req.type === 'basica' || req.type === 'opcional') {
      return { text: isChecked ? 'Completo · toca para ver el catálogo' : 'Toca para abrir el catálogo', done: isChecked };
    }
    if (req.type === 'cursos' || req.type === 'especialidad') {
      const link = linkedCertMap[req.id];
      if (link?.certTitle) return { text: `Acreditado: ${link.certTitle}`, done: true };
      return isChecked
        ? { text: 'Convalidado · toca para vincular el certificado', done: true }
        : { text: 'Toca para vincular una especialidad o certificado', done: false };
    }
    if (req.type === 'ciclos' || t.includes('ciclo')) {
      const need = req.requiredCount || 1;
      const have = (cipCountMap[req.id] || 0) > 0 ? cipCountMap[req.id] : isChecked ? need : 0;
      return { text: `${have} de ${need} CIP acreditados · toca para ver o pedir uno anterior`, done: have >= need };
    }
    if (req.type === 'vida_grupo' || t.includes('peregrinaje') || t.includes('campamento') || t.includes('proyecto de servicio') || t.includes('vida de grupo')) {
      const need = req.requiredCount || 1;
      const have = vidaGrupoCountMap[req.id] || 0;
      if (have === 0 && isChecked) return { text: 'Convalidado en etapa aprobada', done: true };
      return { text: `${have} de ${need} registros guardados · toca para ver o agregar`, done: have >= need };
    }
    if (req.type === 'personales') {
      const need = req.requiredCount || 3;
      const have = personalesCountMap[req.id] || 0;
      if (have === 0 && isChecked) return { text: 'Marcado · toca para anotar cuáles fueron', done: true };
      return { text: `${have} de ${need} actividades registradas · toca para ver o agregar`, done: have >= need };
    }
    if (req.type === 'aire_libre' || t.includes('noche')) {
      const need = req.requiredCount || 10;
      const have = (nochesCountMap[req.id] || 0) > 0 ? nochesCountMap[req.id] : isChecked ? need : 0;
      return { text: `${have} de ${need} noches registradas · toca para ver o agregar fechas`, done: have >= need };
    }
    return null;
  };

  // ── Confirmación después de enviar ──────────────────────────────────────────────────────
  if (sent) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={styles.sentWrap}>
        <Pop trigger={sent}>
          <Enter style={[styles.sentMark, { backgroundColor: theme.accentSoft }]}>
            <Check size={56} color={theme.accentText} strokeWidth={3} />
          </Enter>
        </Pop>
        <Enter index={2} style={{ alignItems: 'center', gap: SPACE.sm }}>
          <Text style={[TYPE.h1, { color: theme.text, textAlign: 'center' }]} accessibilityRole="header">¡Etapa enviada!</Text>
          <Text style={[TYPE.body, { color: theme.subText, textAlign: 'center' }]}>Tu etapa {stageTemplate.title} ya está en manos de tu dirigente.</Text>
        </Enter>

        <Enter index={3} style={{ alignSelf: 'stretch' }}>
          <Card style={{ gap: SPACE.lg }}>
            <Text style={[TYPE.over, { color: theme.subText }]}>Qué sigue</Text>
            <View style={styles.stepRow}>
              <CheckMark checked />
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.small, { color: theme.text, fontWeight: '600' }]}>Enviada</Text>
                <Text style={[TYPE.tiny, { color: theme.subText }]}>Hoy</Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <View style={[styles.stepIcon, { backgroundColor: theme.accentSoft }]}><Clock size={14} color={theme.accentText} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.small, { color: theme.text, fontWeight: '600' }]}>Tu dirigente la revisa</Text>
                <Text style={[TYPE.tiny, { color: theme.subText }]}>Te llegará un aviso cuando responda.</Text>
              </View>
            </View>
            <View style={styles.stepRow}>
              <CheckMark locked />
              <View style={{ flex: 1 }}>
                <Text style={[TYPE.small, { color: theme.subText, fontWeight: '600' }]}>Insignia y celebración</Text>
                <Text style={[TYPE.tiny, { color: theme.subText }]}>{nextStage ? `Al aprobarse se desbloquea ${nextStage.title}.` : 'Al aprobarse recibes tu insignia.'}</Text>
              </View>
            </View>
          </Card>
        </Enter>

        {sent === 'queued' && (
          <Enter index={4} style={{ alignSelf: 'stretch' }}>
            <Notice tone="warn" Icon={WifiOff}>No hay conexión: quedó guardada en el teléfono y le llegará a tu dirigente cuando tengas internet.</Notice>
          </Enter>
        )}

        <Enter index={5} style={{ alignSelf: 'stretch', gap: SPACE.sm, marginTop: SPACE.sm }}>
          <Btn label="Volver a mi plan" block onPress={() => { setSent(null); navigateBackOrHome(navigation, user?.role); }} />
          <Btn variant="text" label="Ver la etapa" block onPress={() => setSent(null)} />
        </Enter>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* CABECERA */}
      <View style={[styles.header, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <View style={styles.headerRow}>
          <Press onPress={() => navigateBackOrHome(navigation, user?.role)} accessibilityLabel="Volver" style={[styles.backBtn, { backgroundColor: theme.inputBg }]} scaleTo={0.94}>
            <ArrowLeft size={18} color={theme.text} />
            <Text style={[TYPE.tiny, { fontWeight: '700', color: theme.text }]}>Volver</Text>
          </Press>
          <StageBadgeIcon stageId={stageId} size={40} isLocked={isBlocked} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[TYPE.h3, { color: theme.text }]} numberOfLines={1} accessibilityRole="header">{stageTemplate.title}</Text>
            <Text style={[TYPE.tiny, { color: theme.subText }]}>{stageTemplate.estimatedTime}</Text>
          </View>
          <Chip label={statusChip.label} tone={statusChip.tone} Icon={statusChip.Icon} />
        </View>

        {/* LÍNEA DE TIEMPO: cuándo empezó (aprobación de la etapa anterior) y cuándo se aprobó */}
        {(() => {
          const idx = stagesData.findIndex(s => s.id === stageId);
          const startIso = idx > 0 ? stageDates[stagesData[idx - 1].id] : undefined;
          const endIso = stageDates[stageId];
          let text = '';
          if (status === 'Aprobada' && endIso) {
            text = `Aprobada el ${formatDateEs(endIso.slice(0, 10))}`;
            if (startIso) text += ` · ${humanDuration(startIso, endIso)} en la etapa`;
          } else if (status === 'En Revision' && endIso) {
            text = `Enviada a revisión el ${formatDateEs(endIso.slice(0, 10))}`;
            if (startIso) text += ` · ${humanDuration(startIso, endIso)} trabajando en ella`;
          } else if (status !== 'Bloqueada' && startIso) {
            text = `En curso desde el ${formatDateEs(startIso.slice(0, 10))} · ${humanDuration(startIso)}`;
          }
          if (!text) return null;
          return (
            <View style={styles.timeline} accessibilityLabel={text}>
              <CalendarDays size={14} color={theme.subText} />
              <Text style={[TYPE.tiny, { color: theme.subText, flex: 1 }]}>{text}</Text>
            </View>
          );
        })()}

        {/* BARRA DE PROGRESO */}
        <View style={styles.progressSection}>
          <ProgressBar value={progress} style={{ flex: 1 }} />
          <CountUp value={progress} suffix=" %" style={[TYPE.small, { fontWeight: '700', color: isBlocked ? theme.subText : theme.accentText, minWidth: 48, textAlign: 'right' }]} />
        </View>
        <Text style={[TYPE.tiny, { color: theme.subText, marginTop: 4 }]}>
          {isBlocked ? 'Etapa bloqueada: solo consulta' : `${doneReqs} de ${totalReqs} requisitos cumplidos`}
        </Text>
      </View>

      {/* LISTA DE REQUISITOS */}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 24, gap: SPACE.sm }}>
        {/* Etapa devuelta: qué dijo el dirigente y qué corregir */}
        {returnedNotif && (
          <Enter>
            <View style={[styles.returned, { backgroundColor: theme.errSoft, borderColor: theme.errLine }]} accessibilityRole="alert">
              <Undo2 size={20} color={theme.err} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[TYPE.small, { color: theme.err, fontWeight: '700' }]}>Tu dirigente devolvió esta etapa</Text>
                <Text style={[TYPE.small, { color: theme.text }]}>
                  {returnedReason || 'Hay requisitos pendientes por completar.'}
                </Text>
                <Text style={[TYPE.tiny, { color: theme.subText }]}>
                  {missing > 0 ? `Completa ${missing === 1 ? 'el requisito que falta' : `los ${missing} requisitos que faltan`} y vuelve a enviarla.` : 'Revisa lo que te indicó y vuelve a enviarla.'}
                </Text>
              </View>
            </View>
          </Enter>
        )}

        {stageTemplate.requirements.map((req, index) => {
          const isChecked = !!checks[req.id];
          const hint = hintFor(req, isChecked);
          const wasReturned = !!returnedNotif && !isChecked;

          return (
            <Enter key={req.id} index={Math.min(index, 6)}>
              <Press
                onPress={() => handleRequirementClick(req)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isChecked }}
                accessibilityLabel={`${req.text}${hint ? `. ${hint.text}` : ''}`}
                scaleTo={0.985}
                hoverStyle={{ borderColor: theme.primary }}
                style={[
                  styles.reqRow,
                  { backgroundColor: theme.cardBg, borderColor: wasReturned ? theme.errLine : theme.border },
                ]}
              >
                <CheckMark checked={isChecked} locked={isBlocked} error={wasReturned} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[TYPE.small, { color: isBlocked ? theme.subText : theme.text, fontWeight: '600' }]}>
                    {req.text}
                  </Text>
                  {hint && (
                    <Text style={[TYPE.tiny, { color: theme.subText, marginTop: 2 }]}>
                      {hint.text}
                    </Text>
                  )}
                </View>
                <ChevronRight size={18} color={theme.subText} />
              </Press>
            </Enter>
          );
        })}
      </ScrollView>

      {/* BOTÓN O INFORMACIÓN DE ESTADO INFERIOR */}
      <View style={[styles.footerAction, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
        {status === 'Bloqueada' ? (
          <Notice tone="neutral" Icon={Lock}>
            Esta etapa está en modo de consulta (bloqueada). Se habilitará para registro cuando tu dirigente apruebe la etapa anterior.
          </Notice>
        ) : status === 'Aprobada' ? (
          <Notice tone="ok" Icon={CheckCircle}>
            ¡Etapa aprobada por tu dirigente! Puedes consultar todos los requisitos completados.
          </Notice>
        ) : status === 'En Revision' ? (
          <Notice tone="warn" Icon={Clock}>
            Etapa enviada a revisión. Tu dirigente evaluará tus requisitos próximamente.
          </Notice>
        ) : (
          <>
            {/* Al llegar al 100 % el botón «late» una vez para llamar la atención */}
            <Pop trigger={progress === 100}>
              <Btn
                label={returnedNotif ? 'Volver a enviar a revisión' : 'Enviar etapa a revisión'}
                Icon={Send}
                block
                disabled={progress < 100}
                onPress={() => setConfirming(true)}
              />
            </Pop>
            {progress < 100 && (
              <Text style={[TYPE.tiny, { color: theme.subText, textAlign: 'center' }]}>
                {missing === 1 ? 'Te falta 1 requisito para poder enviarla.' : `Te faltan ${missing} requisitos para poder enviarla.`}
              </Text>
            )}
          </>
        )}
      </View>

      {/* MODAL SELECCIÓN / VINCULACIÓN DE ESPECIALIDADES Y CURSOS */}
      <Modal visible={showCertModal} transparent animationType="slide" onRequestClose={() => setShowCertModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxHeight: '85%' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                <Award color={colors.primary} size={22} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.title, { color: theme.text }]} numberOfLines={1}>
                    Vincular Acreditación
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.subText, marginTop: 1 }}>
                    {selectedReqForCert?.text}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCertModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 18 }}>
              {/* OPCIONES RÁPIDAS SUPERIORES */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: colors.primary,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    borderRadius: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                  onPress={() => {
                    const req = selectedReqForCert;
                    setShowCertModal(false);
                    navigation.navigate('CertificateUpload', {
                      returnToStage: {
                        stageId,
                        reqId: req.id,
                        reqText: req.text,
                        level: req.level
                      }
                    });
                  }}
                >
                  <Plus size={16} color="white" />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                    Subir Nueva
                  </Text>
                </TouchableOpacity>

                {checks[selectedReqForCert?.id] ? (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: 'rgba(239, 68, 68, 0.12)',
                      borderWidth: 1,
                      borderColor: '#ef4444',
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                    onPress={() => handleQuickToggleCert(false)}
                  >
                    <Trash2 size={16} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontWeight: 'bold', fontSize: 12 }}>
                      Desmarcar
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* FILTROS DE NIVEL SI ES REQUISITO DE ESPECIALIDAD */}
              {selectedReqForCert?.type === 'especialidad' && (
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                  {[
                    { id: 'ALL', name: 'Todos' },
                    { id: 'bronce', name: 'Bronce' },
                    { id: 'plata', name: 'Plata' },
                    { id: 'oro', name: 'Oro' }
                  ].map(lvl => (
                    <TouchableOpacity
                      key={lvl.id}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: certFilterLevel === lvl.id ? colors.primary : (isDarkMode ? '#27272a' : '#f1f5f9'),
                        borderWidth: 1,
                        borderColor: certFilterLevel === lvl.id ? colors.primary : theme.border
                      }}
                      onPress={() => setCertFilterLevel(lvl.id)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: certFilterLevel === lvl.id ? 'white' : theme.text }}>
                        {lvl.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedReqForCert?.type === 'especialidad' && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: isDarkMode ? '#1e1b4b' : '#ede9fe',
                    borderColor: '#8b5cf6',
                    borderWidth: 1,
                    borderRadius: 10,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    marginBottom: 12,
                    gap: 8,
                    justifyContent: 'center'
                  }}
                  onPress={() => {
                    setShowCertModal(false);
                    navigation.navigate('Especialidades');
                  }}
                  activeOpacity={0.8}
                >
                  <Award size={16} color="#8b5cf6" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>
                    Ver Catálogo y Guías Oficiales de Especialidades (ASV)
                  </Text>
                  <ExternalLink size={14} color="#8b5cf6" />
                </TouchableOpacity>
              )}

              {/* SELECTOR DE VISTA: LISTA VS CUADRÍCULA */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
                  Selecciona tu acreditación:
                </Text>

                <View style={{ flexDirection: 'row', backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0', borderRadius: 10, padding: 2 }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 5,
                      paddingHorizontal: 9,
                      borderRadius: 8,
                      backgroundColor: certModalViewMode === 'list' ? colors.primary : 'transparent',
                      gap: 4
                    }}
                    onPress={() => setCertModalViewMode('list')}
                  >
                    <List size={13} color={certModalViewMode === 'list' ? 'white' : theme.subText} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: certModalViewMode === 'list' ? 'white' : theme.subText }}>
                      Lista
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 5,
                      paddingHorizontal: 9,
                      borderRadius: 8,
                      backgroundColor: certModalViewMode === 'grid' ? colors.primary : 'transparent',
                      gap: 4
                    }}
                    onPress={() => setCertModalViewMode('grid')}
                  >
                    <LayoutGrid size={13} color={certModalViewMode === 'grid' ? 'white' : theme.subText} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: certModalViewMode === 'grid' ? 'white' : theme.subText }}>
                      Cuadrícula
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {(() => {
                const filteredModalCerts = userCerts.filter(cert => {
                  if (!selectedReqForCert) return true;

                  if (selectedReqForCert.type === 'especialidad') {
                    if (cert.category && cert.category !== 'especialidades') return false;
                    if (certFilterLevel !== 'ALL' && cert.level && cert.level.toLowerCase() !== certFilterLevel.toLowerCase()) {
                      return false;
                    }
                    return true;
                  }

                  if (selectedReqForCert.type === 'cursos') {
                    if (cert.category && cert.category === 'cursos') return true;
                    const norm = (cert.title || '').toLowerCase();
                    return norm.includes('horqueta') || norm.includes('remo') || norm.includes('canoa') || norm.includes('taller') || norm.includes('curso');
                  }

                  if (selectedReqForCert.type === 'programas_mundiales') {
                    return cert.category === 'programas_mundiales';
                  }

                  if (selectedReqForCert.type === 'iniciativas_programa') {
                    return cert.category === 'iniciativas_programa';
                  }

                  return true;
                });

                if (loadingCerts) {
                  return <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />;
                }

                if (filteredModalCerts.length === 0) {
                  return (
                    <View style={[modalStyles.emptyCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                      <Award size={36} color={theme.subText} style={{ marginBottom: 8 }} />
                      <Text style={[modalStyles.emptyText, { color: theme.text, fontWeight: 'bold' }]}>
                        No se encontraron certificados para este requisito.
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.subText, textAlign: 'center', marginTop: 4 }}>
                        Usa el botón "Subir Nueva" para subir tu certificado; luego vincúlalo aquí. Sin certificado no se puede marcar.
                      </Text>
                    </View>
                  );
                }

                if (certModalViewMode === 'grid') {
                  return (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 }}>
                      {filteredModalCerts.map((cert) => {
                        const linkedInfo = linkedCertMap[selectedReqForCert?.id];
                        const isSelected = linkedInfo?.certId
                          ? (linkedInfo.certId === cert.id)
                          : (linkedInfo?.certTitle === cert.title && (!linkedInfo?.level || linkedInfo?.level === cert.level));

                        const usedIn = usedElsewhereMap[cert.id] || usedElsewhereMap[`${cert.title}_${cert.level || ''}`.toLowerCase()];
                        const certImg = cert.file_url || cert.image_url;

                        return (
                          <TouchableOpacity
                            key={cert.id}
                            style={[
                              modalStyles.gridCertCard,
                              {
                                backgroundColor: isSelected
                                  ? (isDarkMode ? '#1e1b4b' : '#f5f3ff')
                                  : usedIn
                                  ? (isDarkMode ? '#1c1917' : '#fef2f2')
                                  : theme.cardBg,
                                borderColor: isSelected ? '#8b5cf6' : usedIn ? '#fca5a5' : theme.border,
                                borderWidth: isSelected ? 2 : 1,
                                opacity: usedIn ? 0.75 : 1
                              }
                            ]}
                            onPress={() => !usedIn && handleSelectCert(cert)}
                            disabled={!!usedIn || isReadOnly}
                            activeOpacity={usedIn ? 1 : 0.8}
                          >
                            {certImg ? (
                              <SecureImage source={{ uri: certImg }} style={modalStyles.gridCertImage} resizeMode="cover" />
                            ) : (
                              <View style={[modalStyles.gridCertFallback, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                                <Award size={28} color={colors.primary} />
                              </View>
                            )}

                            <View style={{ padding: 8, flex: 1, justifyContent: 'space-between' }}>
                              <View>
                                {!!cert.level && (
                                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginBottom: 3 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>{cert.level.toUpperCase()}</Text>
                                  </View>
                                )}
                                <Text style={[modalStyles.gridCertTitle, { color: theme.text }]} numberOfLines={2}>
                                  {cert.title}
                                </Text>
                              </View>

                              <View style={{
                                marginTop: 6,
                                paddingVertical: 4,
                                borderRadius: 6,
                                backgroundColor: isSelected ? '#10b981' : usedIn ? (isDarkMode ? '#44403c' : '#e2e8f0') : colors.primary,
                                alignItems: 'center'
                              }}>
                                <Text style={{ color: usedIn ? theme.subText : 'white', fontWeight: 'bold', fontSize: 12 }}>
                                  {isSelected ? '✓ Vinculado' : usedIn ? 'Bloqueado' : 'Vincular'}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                }

                return filteredModalCerts.map((cert) => {
                  const linkedInfo = linkedCertMap[selectedReqForCert?.id];
                  const isSelected = linkedInfo?.certId
                    ? (linkedInfo.certId === cert.id)
                    : (linkedInfo?.certTitle === cert.title && (!linkedInfo?.level || linkedInfo?.level === cert.level));

                  const usedIn = usedElsewhereMap[cert.id] || usedElsewhereMap[`${cert.title}_${cert.level || ''}`.toLowerCase()];

                  return (
                    <TouchableOpacity
                      key={cert.id}
                      style={[
                        modalStyles.eventCard,
                        {
                          backgroundColor: isSelected
                            ? (isDarkMode ? '#1e1b4b' : '#f5f3ff')
                            : usedIn
                            ? (isDarkMode ? '#1c1917' : '#fef2f2')
                            : theme.cardBg,
                          borderColor: isSelected
                            ? '#8b5cf6'
                            : usedIn
                            ? '#fca5a5'
                            : theme.border,
                          borderWidth: isSelected ? 1.5 : 1,
                          opacity: usedIn ? 0.75 : 1
                        }
                      ]}
                      onPress={() => !usedIn && handleSelectCert(cert)}
                      disabled={!!usedIn || isReadOnly}
                      activeOpacity={usedIn ? 1 : 0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                          <Text style={[modalStyles.eventTitle, { color: theme.text }]}>
                            {cert.title}
                          </Text>
                          {!!cert.level && (
                            <View style={{ backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>
                                {cert.level.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: theme.subText }}>
                          Categoría: {cert.category || 'Especialidad'}
                        </Text>
                        <Text style={modalStyles.eventDate}>
                          Fecha: {cert.date || cert.created_at?.split('T')[0] || 'Registrado'}
                        </Text>
                        {usedIn && (
                          <Text style={{ fontSize: 12, color: '#ef4444', fontWeight: 'bold', marginTop: 3 }}>
                            🔒 Utilizado en: {usedIn.stageTitle} — {usedIn.reqText}
                          </Text>
                        )}
                      </View>

                      <View style={{
                        backgroundColor: isSelected
                          ? '#10b981'
                          : usedIn
                          ? (isDarkMode ? '#44403c' : '#e2e8f0')
                          : colors.primary,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        marginLeft: 8
                      }}>
                        <Text style={{
                          color: usedIn ? (isDarkMode ? '#a8a29e' : '#64748b') : 'white',
                          fontWeight: 'bold',
                          fontSize: 12
                        }}>
                          {isSelected ? '✓ Vinculado' : usedIn ? 'Bloqueado' : 'Vincular'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* CIP: lo acredita el Scouter; el joven puede pedir uno anterior a la app (Ley Scout) */}
      <CipStageModal
        visible={showCipModal}
        onClose={() => { setShowCipModal(false); loadData(); }}
        stageId={stageId}
        req={selectedReqForCip}
        isReadOnly={isReadOnly}
      />

      {/* MODAL DE CONFIRMACIÓN */}

      <Modal visible={confirming} transparent animationType="slide" onRequestClose={() => setConfirming(false)}>
        <View style={styles.sheetOverlay}>
          <View style={[styles.sheet, { backgroundColor: theme.cardBg }]} accessibilityViewIsModal>
            <View style={[styles.sheetGrab, { backgroundColor: theme.border }]} />
            <View style={{ gap: SPACE.sm }}>
              <Text style={[TYPE.h2, { color: theme.text }]} accessibilityRole="header">¿Enviar {stageTemplate.title} a revisión?</Text>
              <Text style={[TYPE.small, { color: theme.subText }]}>
                Tu dirigente revisará lo que registraste. Mientras esté en revisión no podrás modificar la etapa.
              </Text>
            </View>
            <View style={[styles.sheetSummary, { backgroundColor: theme.bg, borderColor: theme.border }]}>
              <Text style={[TYPE.small, { color: theme.subText }]}>Requisitos cumplidos</Text>
              <Text style={[TYPE.small, { color: theme.text, fontWeight: '700' }]}>{doneReqs} de {totalReqs}</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={[TYPE.tiny, { color: theme.text, fontWeight: '600' }]}>Mensaje para tu dirigente (opcional)</Text>
              <TextInput
                value={sendNote}
                onChangeText={setSendNote}
                placeholder="Algo que quieras contarle sobre esta etapa"
                placeholderTextColor={theme.subText}
                multiline
                maxLength={300}
                accessibilityLabel="Mensaje para tu dirigente"
                style={[styles.sheetInput, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
              />
            </View>
            <View style={{ gap: SPACE.sm }}>
              <Btn label="Enviar a revisión" Icon={Send} block onPress={handleSendToReview} />
              <Btn variant="secondary" label="Todavía no" block onPress={() => setConfirming(false)} />
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE REGISTRO DE NOCHES DE VIDA AL AIRE LIBRE */}
      {user && selectedReqForNoches && (
        <NochesAireLibreModal
          visible={showNochesModal}
          onClose={() => setShowNochesModal(false)}
          scoutId={user.id}
          stageId={stageId}
          reqId={selectedReqForNoches.id}
          reqTitle={selectedReqForNoches.text}
          requiredCount={selectedReqForNoches.requiredCount || 10}
          isReadOnly={isReadOnly}
          onProgressChange={(totalNights, isCompleted) => {
            if (selectedReqForNoches) {
              setNochesCountMap(prev => ({ ...prev, [selectedReqForNoches.id]: totalNights }));
              if (!isReadOnly) setChecks(prev => ({ ...prev, [selectedReqForNoches.id]: isCompleted }));
            }
          }}
        />
      )}

      {/* MODAL DE VIDA DE GRUPO (Peregrinajes, Campamentos, Proyectos) */}
      {user && selectedReqForVidaGrupo && (
        <VidaGrupoModal
          visible={showVidaGrupoModal}
          onClose={() => setShowVidaGrupoModal(false)}
          scoutId={user.id}
          stageId={stageId}
          reqId={selectedReqForVidaGrupo.id}
          reqTitle={selectedReqForVidaGrupo.text}
          requiredCount={selectedReqForVidaGrupo.requiredCount || 1}
          isReadOnly={isReadOnly}
          onProgressChange={(total: number, isCompleted: boolean) => {
            setVidaGrupoCountMap(prev => ({ ...prev, [selectedReqForVidaGrupo.id]: total }));
            if (!isReadOnly) setChecks(prev => ({ ...prev, [selectedReqForVidaGrupo.id]: isCompleted }));
          }}
        />
      )}

      {/* MODAL DE ACTIVIDADES PERSONALES (de creación propia) */}
      {user && selectedReqForPersonales && (
        <ActividadesPersonalesModal
          visible={showPersonalesModal}
          onClose={() => setShowPersonalesModal(false)}
          scoutId={user.id}
          stageId={stageId}
          reqId={selectedReqForPersonales.id}
          reqTitle={selectedReqForPersonales.text}
          requiredCount={selectedReqForPersonales.requiredCount || 3}
          isReadOnly={isReadOnly}
          onProgressChange={(total, isCompleted) => {
            setPersonalesCountMap(prev => ({ ...prev, [selectedReqForPersonales.id]: total }));
            if (isCompleted !== undefined && !isReadOnly) {
              setChecks(prev => ({ ...prev, [selectedReqForPersonales.id]: isCompleted }));
            }
          }}
        />
      )}

    </View>
  );
}

const styles = liveStyles(() => StyleSheet.create({
  container: { flex: 1 },
  header: { padding: SPACE.lg, borderBottomWidth: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 44, paddingHorizontal: SPACE.md, borderRadius: RADIUS.md },
  timeline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: SPACE.md },
  progressSection: { flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md },
  scroll: { flex: 1, paddingHorizontal: SPACE.lg, paddingTop: SPACE.md },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: SPACE.md, minHeight: 64, paddingVertical: SPACE.md, paddingHorizontal: SPACE.lg, borderRadius: RADIUS.lg, borderWidth: 1 },
  returned: { flexDirection: 'row', gap: SPACE.md, padding: SPACE.lg, borderRadius: RADIUS.lg, borderWidth: 1 },
  footerAction: { padding: SPACE.lg, paddingTop: SPACE.md, borderTopWidth: 1, gap: SPACE.sm },

  // Hoja inferior de envío
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACE.lg, paddingTop: SPACE.md, gap: SPACE.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  sheetGrab: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  sheetSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SPACE.lg, borderRadius: RADIUS.lg, borderWidth: 1 },
  sheetInput: { minHeight: 88, borderWidth: 1.5, borderRadius: RADIUS.md, padding: SPACE.md, fontSize: 16, textAlignVertical: 'top' },

  // Confirmación de envío
  sentWrap: { flexGrow: 1, alignItems: 'center', padding: SPACE.xl, paddingTop: 56, gap: SPACE.xl, width: '100%', maxWidth: 520, alignSelf: 'center' },
  sentMark: { width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.md },
  stepIcon: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
}));

const modalStyles = liveStyles(() => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  emptyCard: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  emptyText: { fontSize: 13, textAlign: 'center' },
  eventCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  eventTitle: { fontSize: 15, fontWeight: 'bold' },
  eventDesc: { fontSize: 12, marginTop: 2 },
  eventDate: { fontSize: 12, color: colors.primary, marginTop: 4, fontWeight: 'bold' },

  gridCertCard: { width: '48%', borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 10 },
  gridCertImage: { width: '100%', height: 90 },
  gridCertFallback: { width: '100%', height: 90, alignItems: 'center', justifyContent: 'center' },
  gridCertTitle: { fontSize: 12, fontWeight: 'bold', lineHeight: 16 },

  card: { width: '90%', alignSelf: 'center', borderRadius: 20, padding: 24, alignItems: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { flex: 1, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' }
}));

