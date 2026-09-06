import React, { useState, useCallback } from 'react';
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
import { CheckSquare, Square, Lock, Send, Flag, X, CheckCircle, Award, Sparkles, Plus, Trash2, LayoutGrid, List, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { supabase } from '../lib/supabaseClient';
import { dataService } from '../lib/dataService';
import { notificationService } from '../services/notificationService';
import { stagesData } from '../data/progressionTemplate';
import { StageBadgeIcon } from '../components/StageBadgeIcon';
import { NochesAireLibreModal } from '../components/NochesAireLibreModal';
import { VidaGrupoModal } from '../components/VidaGrupoModal';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { checkProfileCompletion } from '../utils/profileGuard';
import { navigateBackOrHome } from '../utils/navigationHelper';

export default function StageDetailScreen({ route, navigation }: any) {
  const { stageId } = route.params || { stageId: 'precursor' };
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const stageTemplate = stagesData.find(s => s.id === stageId);

  const [loading, setLoading] = useState(true);
  const [checks, setChecks]   = useState<Record<string, boolean>>({});
  const [status, setStatus]   = useState<string>('En Progreso');
  const [confirming, setConfirming] = useState(false);

  // Modal para seleccionar Eventos CIP (Ciclos Institucionales de Programa)
  const [showCipModal, setShowCipModal] = useState(false);
  const [cipEvents, setCipEvents] = useState<any[]>([]);
  const [selectedReqForCip, setSelectedReqForCip] = useState<any>(null);
  const [loadingCip, setLoadingCip] = useState(false);
  const [selectedCipList, setSelectedCipList] = useState<any[]>([]);
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

  // Formulario rápido para convalidar CIP previo
  const [showFastCipForm, setShowFastCipForm] = useState(false);
  const [fastCipName, setFastCipName] = useState('');
  const [fastCipYear, setFastCipYear] = useState(new Date().getFullYear().toString());
  const [fastCipScope, setFastCipScope] = useState<'distrital' | 'regional' | 'nacional' | 'internacional'>('distrital');

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
      const { data: stageRows } = await supabase
        .from('stage_progress')
        .select('stage_id, status')
        .eq('scout_id', user.id);

      const statusMap: Record<string, string> = {};
      stageRows?.forEach((r: any) => { statusMap[r.stage_id] = r.status; });

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

      const allLinkedCerts = await dataService.getAllLinkedCertificates(user.id);
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
    setLoadingCip(true);
    const events = await dataService.getCipEvents(user?.unit || undefined);
    setCipEvents(events);
    if (user?.id) {
      const sels = await dataService.getCipSelections(user.id, stageId, req.id);
      setSelectedCipList(sels || []);
    }
    setLoadingCip(false);
  };

  const handleToggleCipEvent = async (event: any) => {
    if (!user || !selectedReqForCip || isReadOnly) return;
    const reqCount = selectedReqForCip.requiredCount || 1;
    const exists = selectedCipList.some(e => e.id === event.id || e.title === event.title);

    let updated: any[];
    if (exists) {
      updated = selectedCipList.filter(e => e.id !== event.id && e.title !== event.title);
    } else {
      if (selectedCipList.length >= reqCount) {
        showAlert('Límite alcanzado', `Este requisito pide exactamente ${reqCount} actividad(es). Desmarca una para seleccionar otra.`);
        return;
      }
      updated = [...selectedCipList, event];
    }

    setSelectedCipList(updated);
    await dataService.saveCipSelections(user.id, stageId, selectedReqForCip.id, updated);
    const isDone = updated.length >= reqCount;
    setChecks(prev => ({ ...prev, [selectedReqForCip.id]: isDone }));
    setCipCountMap(prev => ({ ...prev, [selectedReqForCip.id]: updated.length }));
    await dataService.toggleRequirement(user.id, stageId, selectedReqForCip.id, isDone);
  };

  const handleRemoveSelectedCip = async (eventId: string, eventTitle: string) => {
    if (!user || !selectedReqForCip || isReadOnly) return;
    const reqCount = selectedReqForCip.requiredCount || 1;
    const updated = selectedCipList.filter(e => e.id !== eventId && e.title !== eventTitle);
    setSelectedCipList(updated);
    await dataService.saveCipSelections(user.id, stageId, selectedReqForCip.id, updated);
    const isDone = updated.length >= reqCount;
    setChecks(prev => ({ ...prev, [selectedReqForCip.id]: isDone }));
    setCipCountMap(prev => ({ ...prev, [selectedReqForCip.id]: updated.length }));
    await dataService.toggleRequirement(user.id, stageId, selectedReqForCip.id, isDone);
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
              usedMap[link.certTitle.toLowerCase()] = {
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

    const usedIn = usedElsewhereMap[cert.id] || usedElsewhereMap[`${cert.title}_${cert.level || ''}`.toLowerCase()] || usedElsewhereMap[cert.title.toLowerCase()];
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

  const handleQuickToggleCert = async (newVal: boolean) => {
    if (!user || !selectedReqForCert || isReadOnly) return;

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
      showAlert('🔒 Etapa Bloqueada', 'Debes completar y tener aprobada la etapa anterior para poder interactuar con los requisitos de esta etapa.');
      return;
    }

    if (isReadOnly) {
      if (status === 'En Revision') {
        showAlert('⏳ En Revisión', 'Esta etapa se encuentra en revisión por tu dirigente y no puede modificarse.');
      } else if (status === 'Aprobada') {
        showAlert('✅ Etapa Aprobada', 'Esta etapa ya ha sido aprobada.');
      }
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
    await dataService.submitStageForReview(user.id, stageId);
    setStatus('En Revision');

    try {
      await notificationService.sendNotification({
        senderId: user.id,
        groupName: user.group_name || undefined,
        unit: user.unit || undefined,
        receiverRole: 'scouter',
        title: '⚜️ Ficha Enviada a Revisión',
        message: `${user.name || 'Scout'} ha enviado la etapa "${stageTemplate?.title || 'Etapa'}" a revisión.`,
        type: 'badge'
      });
    } catch {}

    showAlert('¡Ficha Enviada!', 'Tu etapa ha sido enviada a revisión por tu dirigente.');
  };

  if (loading || !stageTemplate) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const progress = isBlocked ? 0 : calculateProgress();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* CABECERA */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
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
          <StageBadgeIcon stageId={stageId} size={32} isLocked={isBlocked} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={[styles.title, { color: theme.text }]}>{stageTemplate.title}</Text>
            <Text style={[styles.subtitle, { color: theme.subText }]}>{stageTemplate.estimatedTime}</Text>
          </View>
          <View style={[styles.statusBadge, {
            backgroundColor: status === 'Aprobada'
              ? 'rgba(34, 197, 94, 0.15)'
              : status === 'En Revision'
              ? 'rgba(234, 179, 8, 0.15)'
              : status === 'Bloqueada'
              ? (isDarkMode ? '#27272a' : '#f1f5f9')
              : 'rgba(99, 102, 241, 0.15)',
            borderWidth: status === 'Bloqueada' ? 1 : 0,
            borderColor: isDarkMode ? '#3f3f46' : '#cbd5e1'
          }]}>
            <Text style={[styles.statusText, {
              color: status === 'Aprobada'
                ? '#16a34a'
                : status === 'En Revision'
                ? '#ca8a04'
                : status === 'Bloqueada'
                ? (isDarkMode ? '#94a3b8' : '#64748b')
                : colors.primary
            }]}>
              {status === 'Bloqueada' ? '🔒 Bloqueada' : status}
            </Text>
          </View>
        </View>

        {/* BARRA DE PROGRESO */}
        <View style={styles.progressSection}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.subText }}>
              {isBlocked ? 'Progreso (Etapa bloqueada)' : 'Progreso de la Etapa'}
            </Text>
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: isBlocked ? (isDarkMode ? '#94a3b8' : '#64748b') : colors.primary }}>
              {progress}%
            </Text>
          </View>
          <View style={[styles.progressBarBg, { backgroundColor: theme.inputBg }]}>
            <View style={[styles.progressBarFill, { width: `${progress}%`, backgroundColor: isBlocked ? (isDarkMode ? '#52525b' : '#cbd5e1') : colors.primary }]} />
          </View>
        </View>
      </View>

      {/* LISTA DE REQUISITOS */}
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 100 }}>
        {stageTemplate.requirements.map(req => {
          const isChecked = !!checks[req.id];
          const isVidaGrupo = req.type === 'vida_grupo' || req.text.toLowerCase().includes('peregrinaje') || req.text.toLowerCase().includes('campamento') || req.text.toLowerCase().includes('proyecto de servicio') || req.text.toLowerCase().includes('vida de grupo');
          const isCiclos = req.type === 'ciclos' || req.text.toLowerCase().includes('ciclo');

          return (
            <TouchableOpacity
              key={req.id}
              style={[
                styles.reqRow,
                { backgroundColor: isDarkMode ? '#18181b' : 'white', borderColor: theme.border },
                isChecked && { borderColor: colors.primary, backgroundColor: isDarkMode ? '#1e1b4b' : 'rgba(99, 102, 241, 0.04)' }
              ]}
              onPress={() => handleRequirementClick(req)}
              activeOpacity={0.7}
            >
              <View style={{ marginRight: 12, marginTop: 2 }}>
                {isChecked ? (
                  <CheckSquare color={colors.primary} size={22} />
                ) : (
                  <Square color={isDarkMode ? '#52525b' : '#cbd5e1'} size={22} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.reqText, { color: theme.text }, isChecked && styles.reqTextChecked]}>
                  {req.text}
                </Text>

                {(req.type === 'basica' || req.type === 'opcional') && (
                  <Text style={styles.reqBadge}>Toca para abrir el catálogo</Text>
                )}

                {(req.type === 'cursos' || req.type === 'especialidad') && (
                  <View style={{ marginTop: 4 }}>
                    {linkedCertMap[req.id]?.certTitle ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Sparkles size={12} color="#10b981" style={{ marginRight: 4 }} />
                        <Text style={{ fontSize: 11, color: '#10b981', fontWeight: 'bold' }}>
                          Acreditado: {linkedCertMap[req.id].certTitle}
                        </Text>
                      </View>
                    ) : isChecked ? (
                      <Text style={[styles.reqBadge, { color: colors.primary, fontWeight: 'bold' }]}>
                        ✓ Requisito convalidado en etapa aprobada (Toca para vincular certificado)
                      </Text>
                    ) : (
                      <Text style={styles.reqBadge}>Toca para vincular especialidad / certificado</Text>
                    )}
                  </View>
                )}

                {isCiclos && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={[styles.reqBadge, { color: colors.primary, fontWeight: 'bold' }]}>
                      🚩 {(cipCountMap[req.id] || 0) > 0
                        ? `${cipCountMap[req.id]} / ${req.requiredCount || 1} actividades seleccionadas`
                        : isChecked
                        ? `${req.requiredCount || 1} / ${req.requiredCount || 1} actividades convalidadas`
                        : `0 / ${req.requiredCount || 1} actividades seleccionadas`} (Toca para seleccionar o agregar)
                    </Text>
                  </View>
                )}

                {isVidaGrupo && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={[styles.reqBadge, { color: '#8b5cf6', fontWeight: 'bold' }]}>
                      🏕️ {(vidaGrupoCountMap[req.id] || 0) > 0
                        ? `${vidaGrupoCountMap[req.id]} / ${req.requiredCount || 1} registros guardados`
                        : isChecked
                        ? `${req.requiredCount || 1} / ${req.requiredCount || 1} convalidado en etapa aprobada`
                        : `0 / ${req.requiredCount || 1} registros guardados`} (Toca para ver o agregar)
                    </Text>
                  </View>
                )}

                {(req.type === 'aire_libre' || req.text.toLowerCase().includes('noche')) && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={[styles.reqBadge, { color: '#0ea5e9', fontWeight: 'bold' }]}>
                      🏕️ {(nochesCountMap[req.id] || 0) > 0
                        ? `${nochesCountMap[req.id]} / ${req.requiredCount || 10} noches registradas`
                        : isChecked
                        ? `${req.requiredCount || 10} / ${req.requiredCount || 10} noches convalidadas`
                        : `0 / ${req.requiredCount || 10} noches registradas`} (Toca para ver o agregar fechas)
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* BOTÓN O INFORMACIÓN DE ESTADO INFERIOR */}
      {status === 'Bloqueada' ? (
        <View style={styles.footerAction}>
          <View style={{
            backgroundColor: isDarkMode ? '#18181b' : '#f8fafc',
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#27272a' : '#e2e8f0',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 10
          }}>
            <Lock size={18} color={isDarkMode ? '#94a3b8' : '#64748b'} />
            <Text style={{ fontSize: 12, color: isDarkMode ? '#94a3b8' : '#64748b', flex: 1, fontWeight: '500' }}>
              Esta etapa está en modo de consulta (bloqueada). Se habilitará para registro cuando tu dirigente apruebe la etapa anterior.
            </Text>
          </View>
        </View>
      ) : status === 'Aprobada' ? (
        <View style={styles.footerAction}>
          <View style={{
            backgroundColor: isDarkMode ? '#064e3b' : '#f0fdf4',
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#065f46' : '#86efac',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 10
          }}>
            <CheckCircle size={18} color="#16a34a" />
            <Text style={{ fontSize: 12, color: isDarkMode ? '#6ee7b7' : '#15803d', flex: 1, fontWeight: 'bold' }}>
              🏅 ¡Etapa aprobada por tu dirigente! Puedes consultar todos los requisitos completados.
            </Text>
          </View>
        </View>
      ) : status === 'En Revision' ? (
        <View style={styles.footerAction}>
          <View style={{
            backgroundColor: isDarkMode ? '#451a03' : '#fffbeb',
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: isDarkMode ? '#b45309' : '#fcd34d',
            alignItems: 'center',
            flexDirection: 'row',
            gap: 10
          }}>
            <Sparkles size={18} color="#d97706" />
            <Text style={{ fontSize: 12, color: isDarkMode ? '#fde68a' : '#b45309', flex: 1, fontWeight: 'bold' }}>
              ⏳ Etapa enviada a revisión. Tu dirigente evaluará tus requisitos próximamente.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.footerAction}>
          <TouchableOpacity
            style={[
              styles.sendReviewBtn,
              progress < 100 && styles.sendReviewBtnDisabled
            ]}
            onPress={() => setConfirming(true)}
            disabled={progress < 100}
          >
            <Send size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.sendReviewBtnText}>
              {progress === 100 ? 'ENVIAR ETAPA A REVISIÓN' : 'COMPLETA EL 100% PARA ENVIAR'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 1 }}>
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
                ) : (
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
                      borderWidth: 1,
                      borderColor: theme.border,
                      paddingVertical: 12,
                      paddingHorizontal: 10,
                      borderRadius: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                    onPress={() => handleQuickToggleCert(true)}
                  >
                    <CheckCircle size={16} color={colors.primary} />
                    <Text style={{ color: theme.text, fontWeight: 'bold', fontSize: 12 }}>
                      Marcar Directo
                    </Text>
                  </TouchableOpacity>
                )}
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
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: certFilterLevel === lvl.id ? 'white' : theme.text }}>
                        {lvl.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: certModalViewMode === 'list' ? 'white' : theme.subText }}>
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
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: certModalViewMode === 'grid' ? 'white' : theme.subText }}>
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
                      <Text style={{ fontSize: 11, color: theme.subText, textAlign: 'center', marginTop: 4 }}>
                        Usa el botón superior "Subir Nueva" para adjuntar tu diploma o "Marcar Directo" si ya lo completaste.
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
                              <Image source={{ uri: certImg }} style={modalStyles.gridCertImage} resizeMode="cover" />
                            ) : (
                              <View style={[modalStyles.gridCertFallback, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}>
                                <Award size={28} color={colors.primary} />
                              </View>
                            )}

                            <View style={{ padding: 8, flex: 1, justifyContent: 'space-between' }}>
                              <View>
                                {cert.level && (
                                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.primary, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, marginBottom: 3 }}>
                                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 8 }}>{cert.level.toUpperCase()}</Text>
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
                                <Text style={{ color: usedIn ? theme.subText : 'white', fontWeight: 'bold', fontSize: 10 }}>
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
                          {cert.level && (
                            <View style={{ backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 9 }}>
                                {cert.level.toUpperCase()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 11, color: theme.subText }}>
                          Categoría: {cert.category || 'Especialidad'}
                        </Text>
                        <Text style={modalStyles.eventDate}>
                          Fecha: {cert.date || cert.created_at?.split('T')[0] || 'Registrado'}
                        </Text>
                        {usedIn && (
                          <Text style={{ fontSize: 10, color: '#ef4444', fontWeight: 'bold', marginTop: 3 }}>
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
                          fontSize: 11
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

      {/* MODAL SELECCIÓN EVENTOS CIP (CICLOS INSTITUCIONALES DE PROGRAMA) */}
      <Modal visible={showCipModal} transparent animationType="slide" onRequestClose={() => setShowCipModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Flag color={colors.primary} size={20} style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[modalStyles.title, { color: theme.text }]}>Ciclos Institucionales (CIP)</Text>
                  {selectedReqForCip && (
                    <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>
                      {selectedCipList.length} / {selectedReqForCip.requiredCount || 1} seleccionados
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCipModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              {/* Chips de eventos ya seleccionados */}
              {selectedCipList.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary, marginBottom: 8 }}>
                    ✅ ACTIVIDADES SELECCIONADAS ({selectedCipList.length} / {selectedReqForCip?.requiredCount || 1})
                  </Text>
                  {selectedCipList.map((evt, idx) => (
                    <View key={evt.id || idx} style={{
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      backgroundColor: 'rgba(99,102,241,0.1)', borderRadius: 10, padding: 10, marginBottom: 6, borderWidth: 1, borderColor: colors.primary
                    }}>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: 'bold', color: colors.primary }}>{evt.title}</Text>
                      <TouchableOpacity onPress={() => handleRemoveSelectedCip(evt.id, evt.title)}>
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* BOTÓN Y FORMULARIO DE CONVALIDACIÓN RÁPIDA DE CIP */}
              <View
                style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.08)',
                  borderColor: colors.primary,
                  borderWidth: 1.5,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 16
                }}
              >
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => setShowFastCipForm(prev => !prev)}
                >
                  <View style={{ flex: 1, paddingRight: 6 }}>
                    <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 13 }}>
                      ⚡ + Agregar Actividad / Convalidar CIP Previo
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                      Escribe el nombre y año del CIP en el que participaste.
                    </Text>
                  </View>
                  <Text style={{ fontWeight: 'bold', color: colors.primary, fontSize: 12 }}>
                    {showFastCipForm ? 'Ocultar ▲' : 'Escribir ▼'}
                  </Text>
                </TouchableOpacity>

                {showFastCipForm && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.border, gap: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.text }}>
                      ¿EN QUÉ CIP O EVENTO ESTUVISTE? *
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: theme.cardBg,
                        color: theme.text,
                        borderColor: theme.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 13
                      }}
                      placeholder="Ej: I Campamento Distrital / Indaba Regional"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={fastCipName}
                      onChangeText={setFastCipName}
                    />

                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.text, marginTop: 4 }}>
                      ¿EN QUÉ AÑO PARTICIPASTE? *
                    </Text>
                    <TextInput
                      style={{
                        backgroundColor: theme.cardBg,
                        color: theme.text,
                        borderColor: theme.border,
                        borderWidth: 1,
                        borderRadius: 10,
                        padding: 10,
                        fontSize: 13
                      }}
                      placeholder="Ej: 2024"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={fastCipYear}
                      keyboardType="numeric"
                      onChangeText={setFastCipYear}
                    />

                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: theme.text, marginTop: 4 }}>
                      ALCANCE DEL EVENTO
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(['distrital', 'regional', 'nacional', 'internacional'] as const).map(sc => (
                        <TouchableOpacity
                          key={sc}
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 5,
                            borderRadius: 8,
                            borderWidth: 1,
                            borderColor: fastCipScope === sc ? colors.primary : theme.border,
                            backgroundColor: fastCipScope === sc ? colors.primary : theme.cardBg
                          }}
                          onPress={() => setFastCipScope(sc)}
                        >
                          <Text style={{ fontSize: 10, fontWeight: 'bold', color: fastCipScope === sc ? 'white' : theme.subText }}>
                            {sc.toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <TouchableOpacity
                      style={{
                        backgroundColor: colors.primary,
                        paddingVertical: 12,
                        borderRadius: 10,
                        alignItems: 'center',
                        marginTop: 10
                      }}
                      onPress={async () => {
                        if (!user || !selectedReqForCip) return;
                        if (!fastCipName.trim()) {
                          showAlert('Campo requerido', 'Ingresa el nombre del CIP en el que participaste.');
                          return;
                        }
                        const yearStr = fastCipYear.trim() || new Date().getFullYear().toString();
                        const fullTitle = `${fastCipName.trim()} (${yearStr})`;

                        try {
                          const newEvt = await dataService.createCipEvent({
                            title: fullTitle,
                            scope: fastCipScope,
                            unit: user.unit ? user.unit.toLowerCase() : 'clan',
                            date: `${yearStr}-01-01`,
                            description: `Convalidado por ${user.name || 'Scout'} para ${selectedReqForCip.text}`,
                            created_by: user.id
                          });

                          // Agregar automáticamente a la lista de seleccionados
                          const newEvtObj = { id: newEvt?.id || fullTitle, title: fullTitle, scope: fastCipScope, date: `${yearStr}-01-01` };
                          const updated = [...selectedCipList, newEvtObj];
                          setSelectedCipList(updated);
                          await dataService.saveCipSelections(user.id, stageId, selectedReqForCip.id, updated);
                          const reqCount = selectedReqForCip.requiredCount || 1;
                          const isDone = updated.length >= reqCount;
                          setChecks(prev => ({ ...prev, [selectedReqForCip.id]: isDone }));
                          setCipCountMap(prev => ({ ...prev, [selectedReqForCip.id]: updated.length }));
                          await dataService.toggleRequirement(user.id, stageId, selectedReqForCip.id, isDone);

                          showAlert('¡Actividad Agregada!', `"${fullTitle}" ha sido registrada y seleccionada.`);
                          setFastCipName('');
                          setShowFastCipForm(false);
                        } catch (e: any) {
                          showAlert('Error', e?.message || 'No se pudo agregar la actividad.');
                        }
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                        Agregar y Seleccionar Actividad
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={[modalStyles.subtitle, { color: theme.subText }]}>
                O selecciona un evento CIP publicado por tus dirigentes (puedes seleccionar varios):
              </Text>

              {loadingCip ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
              ) : cipEvents.length === 0 ? (
                <View style={[modalStyles.emptyCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <Text style={[modalStyles.emptyText, { color: theme.subText }]}>
                    No hay Ciclos Institucionales de Programa (CIP) registrados por los dirigentes de tu unidad aún. Usa el botón superior para agregar y convalidar.
                  </Text>
                </View>
              ) : (
                cipEvents.map((evt) => {
                  const displayTitle = (evt.title || '').replace(/\[6P\s*/gi, '[CIP ').replace(/\b6P\b/gi, 'CIP');
                  const displayDesc  = evt.description ? evt.description.replace(/\b6P\b/gi, 'CIP') : '';
                  const isSelected = selectedCipList.some(e => e.id === evt.id || e.title === evt.title);

                  return (
                    <TouchableOpacity
                      key={evt.id}
                      style={[
                        modalStyles.eventCard,
                        {
                          backgroundColor: isSelected ? (isDarkMode ? '#1e1b4b' : 'rgba(99,102,241,0.06)') : theme.cardBg,
                          borderColor: isSelected ? colors.primary : theme.border,
                          borderWidth: isSelected ? 1.5 : 1
                        }
                      ]}
                      onPress={() => handleToggleCipEvent(evt)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[modalStyles.eventTitle, { color: isSelected ? colors.primary : theme.text }]}>{displayTitle}</Text>
                        {displayDesc ? <Text style={[modalStyles.eventDesc, { color: theme.subText }]}>{displayDesc}</Text> : null}
                        <Text style={modalStyles.eventDate}>Fecha: {evt.date}</Text>
                      </View>
                      {isSelected ? (
                        <CheckCircle size={22} color={colors.primary} />
                      ) : (
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.border }} />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>

            {/* Botón de confirmar selección */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
              <TouchableOpacity
                style={[modalStyles.btnPrimary, { paddingVertical: 14 }]}
                onPress={() => setShowCipModal(false)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                  Confirmar Selección ({selectedCipList.length} / {selectedReqForCip?.requiredCount || 1})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL DE CONFIRMACIÓN */}

      <Modal visible={confirming} transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <Send size={40} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[modalStyles.title, { color: theme.text }]}>¿Enviar etapa a revisión?</Text>
            <Text style={[modalStyles.desc, { color: theme.subText }]}>
              Tu dirigente recibirá una notificación para validar y verificar tus requisitos cumplidos.
            </Text>

            <View style={modalStyles.btnRow}>
              <TouchableOpacity
                style={[modalStyles.btnSecondary, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }]}
                onPress={() => setConfirming(false)}
              >
                <Text style={{ color: theme.subText, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={modalStyles.btnPrimary}
                onPress={handleSendToReview}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Enviar</Text>
              </TouchableOpacity>
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
              setChecks(prev => ({ ...prev, [selectedReqForNoches.id]: isCompleted }));
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
            setChecks(prev => ({ ...prev, [selectedReqForVidaGrupo.id]: isCompleted }));
          }}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: 'bold' },
  progressSection: { marginTop: 10 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  scroll: { flex: 1, paddingHorizontal: 16, paddingTop: 12 },
  reqRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderRadius: 14, marginBottom: 10, borderWidth: 1 },
  reqText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  reqTextChecked: { color: colors.primary, fontWeight: 'bold' },
  reqBadge: { fontSize: 11, color: '#9333ea', fontWeight: 'bold', marginTop: 4 },
  footerAction: { padding: 16, paddingBottom: 40 },
  sendReviewBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 14 },
  sendReviewBtnDisabled: { backgroundColor: '#94a3b8' },
  sendReviewBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});

const modalStyles = StyleSheet.create({
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
  eventDate: { fontSize: 11, color: colors.primary, marginTop: 4, fontWeight: 'bold' },

  gridCertCard: { width: '48%', borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginBottom: 10 },
  gridCertImage: { width: '100%', height: 90 },
  gridCertFallback: { width: '100%', height: 90, alignItems: 'center', justifyContent: 'center' },
  gridCertTitle: { fontSize: 12, fontWeight: 'bold', lineHeight: 16 },

  card: { width: '90%', alignSelf: 'center', borderRadius: 20, padding: 24, alignItems: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { flex: 1, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' }
});

