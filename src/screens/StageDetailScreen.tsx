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
  Platform,
  Linking
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { CheckSquare, Square, Lock, Send, Flag, X, CheckCircle, Award, Sparkles, Plus, Trash2 } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { dataService } from '../lib/dataService';
import { notificationService } from '../services/notificationService';
import { stagesData } from '../data/progressionTemplate';
import { StageBadgeIcon } from '../components/StageBadgeIcon';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { checkProfileCompletion } from '../utils/profileGuard';

export default function StageDetailScreen({ route, navigation }: any) {
  const { stageId } = route.params || { stageId: 'precursor' };
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const stageTemplate = stagesData.find(s => s.id === stageId);

  const [loading, setLoading] = useState(true);
  const [checks, setChecks]   = useState<Record<string, boolean>>({});
  const [status, setStatus]   = useState<string>('En Progreso');
  const [confirming, setConfirming] = useState(false);

  // Modal para seleccionar Eventos 6P CIP
  const [showCipModal, setShowCipModal] = useState(false);
  const [cipEvents, setCipEvents] = useState<any[]>([]);
  const [selectedReqForCip, setSelectedReqForCip] = useState<any>(null);
  const [loadingCip, setLoadingCip] = useState(false);

  // Modal para vincular Especialidades / Cursos
  const [showCertModal, setShowCertModal] = useState(false);
  const [userCerts, setUserCerts] = useState<any[]>([]);
  const [selectedReqForCert, setSelectedReqForCert] = useState<any>(null);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [linkedCertMap, setLinkedCertMap] = useState<Record<string, { certId?: string; certTitle: string; level?: string }>>({});
  const [certFilterLevel, setCertFilterLevel] = useState<string>('ALL');
  const [usedElsewhereMap, setUsedElsewhereMap] = useState<Record<string, { stageTitle: string; reqText: string }>>({});

  // Formulario rápido para convalidar CIP previo
  const [showFastCipForm, setShowFastCipForm] = useState(false);
  const [fastCipName, setFastCipName] = useState('');
  const [fastCipYear, setFastCipYear] = useState(new Date().getFullYear().toString());
  const [fastCipScope, setFastCipScope] = useState<'distrital' | 'regional' | 'nacional' | 'internacional'>('distrital');

  useModalBackHandler(showCipModal, () => setShowCipModal(false));
  useModalBackHandler(showCertModal, () => setShowCertModal(false));
  useModalBackHandler(confirming, () => setConfirming(false));

  useFocusEffect(
    useCallback(() => { loadData(); }, [user, stageId])
  );

  const loadData = async () => {
    if (!user || !stageTemplate) return;
    setLoading(true);
    try {
      const stageStatus = await dataService.getStageStatus(user.id, stageId);
      setStatus(stageStatus);

      const reqChecks: Record<string, boolean> = {};
      const links: Record<string, { certId?: string; certTitle: string; level?: string }> = {};

      for (const req of stageTemplate.requirements) {
        const val = await dataService.getRequirement(user.id, stageId, req.id);
        reqChecks[req.id] = val;

        try {
          const linkedStr = await AsyncStorage.getItem(`@scout_req_linked_${user.id}_${stageId}_${req.id}`);
          if (linkedStr) {
            const parsed = JSON.parse(linkedStr);
            links[req.id] = {
              certId: parsed.certId,
              certTitle: parsed.certTitle || parsed.title || '',
              level: parsed.level
            };
          }
        } catch {}
      }
      setChecks(reqChecks);
      setLinkedCertMap(links);
    } catch (err) {
      console.error('Error al cargar avance de etapa:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCipModal = async (req: any) => {
    setSelectedReqForCip(req);
    setShowCipModal(true);
    setLoadingCip(true);
    const events = await dataService.getCipEvents(user?.unit || undefined);
    setCipEvents(events);
    setLoadingCip(false);
  };

  const handleSelectCipEvent = async (event: any) => {
    if (!user || !selectedReqForCip) return;
    
    // Marcar el requisito como completado
    setChecks(prev => ({ ...prev, [selectedReqForCip.id]: true }));
    await dataService.toggleRequirement(user.id, stageId, selectedReqForCip.id, true);

    showAlert('¡Evento CIP Vinculado!', `Se ha registrado "${event.title}" para tu requisito.`);
    setShowCipModal(false);
  };

  const openCertModal = async (req: any) => {
    setSelectedReqForCert(req);
    setCertFilterLevel(req.level ? req.level.toLowerCase() : 'ALL');
    setShowCertModal(true);
    setLoadingCerts(true);
    if (user?.id) {
      const certs = await dataService.getCertificates(user.id);
      setUserCerts(certs || []);

      // Escanear todas las etapas y requisitos para detectar si algún certificado ya fue usado
      const usedMap: Record<string, { stageTitle: string; reqText: string }> = {};
      for (const stg of stagesData) {
        for (const r of stg.requirements) {
          if (stg.id === stageId && r.id === req.id) continue; // No bloquear el requisito actual
          try {
            const linkedStr = await AsyncStorage.getItem(`@scout_req_linked_${user.id}_${stg.id}_${r.id}`);
            if (linkedStr) {
              const parsed = JSON.parse(linkedStr);
              if (parsed.certId) {
                usedMap[parsed.certId] = {
                  stageTitle: stg.title,
                  reqText: r.text
                };
              }
              if (parsed.certTitle) {
                const key = `${parsed.certTitle}_${parsed.level || ''}`.toLowerCase();
                usedMap[key] = {
                  stageTitle: stg.title,
                  reqText: r.text
                };
              }
            }
          } catch {}
        }
      }
      setUsedElsewhereMap(usedMap);
    }
    setLoadingCerts(false);
  };

  const handleSelectCert = async (cert: any) => {
    if (!user || !selectedReqForCert) return;

    const usedIn = usedElsewhereMap[cert.id] || usedElsewhereMap[`${cert.title}_${cert.level || ''}`.toLowerCase()];
    if (usedIn) {
      showAlert(
        'Certificado Ya Utilizado',
        `Esta acreditación "${cert.title}" ya fue utilizada para completar el requisito "${usedIn.reqText}" en la etapa "${usedIn.stageTitle}". No se puede reutilizar el mismo certificado para múltiples requisitos.`
      );
      return;
    }

    setChecks(prev => ({ ...prev, [selectedReqForCert.id]: true }));
    setLinkedCertMap(prev => ({
      ...prev,
      [selectedReqForCert.id]: {
        certId: cert.id,
        certTitle: cert.title,
        level: cert.level
      }
    }));

    await dataService.toggleRequirement(user.id, stageId, selectedReqForCert.id, true);
    await AsyncStorage.setItem(
      `@scout_req_linked_${user.id}_${stageId}_${selectedReqForCert.id}`,
      JSON.stringify({ certId: cert.id, certTitle: cert.title, level: cert.level, date: cert.date || cert.created_at })
    );

    showAlert('¡Especialidad/Curso Vinculado!', `Has vinculado "${cert.title}" a tu requisito.`);
    setShowCertModal(false);
  };

  const handleQuickToggleCert = async (newVal: boolean) => {
    if (!user || !selectedReqForCert) return;

    setChecks(prev => ({ ...prev, [selectedReqForCert.id]: newVal }));
    if (!newVal) {
      setLinkedCertMap(prev => {
        const next = { ...prev };
        delete next[selectedReqForCert.id];
        return next;
      });
      await AsyncStorage.removeItem(`@scout_req_linked_${user.id}_${stageId}_${selectedReqForCert.id}`);
    }

    await dataService.toggleRequirement(user.id, stageId, selectedReqForCert.id, newVal);

    showAlert(
      newVal ? '¡Requisito Marcado!' : 'Requisito Desmarcado',
      newVal ? `Has marcado "${selectedReqForCert.text}" como completado.` : `Has desmarcado "${selectedReqForCert.text}".`
    );
    setShowCertModal(false);
  };

  const handleRequirementClick = async (req: any) => {
    if (isReadOnly) return;
    if (!checkProfileCompletion(user, navigation)) return;

    if (req.type === 'basica' || req.type === 'opcional') {
      navigation.navigate('CatalogSelector', {
        stageId,
        reqId: req.id,
        reqType: req.reqType || req.type,
        requiredCount: req.requiredCount || 12
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

    // Notificar en vivo a los Scouters de la unidad y grupo
    notificationService.sendNotification({
      senderId: user.id,
      groupName: user.group_name || undefined,
      unit: user.unit || undefined,
      receiverRole: 'scouter',
      title: '⚜️ Ficha Enviada a Revisión',
      message: `${user.name} ha completado y enviado su etapa "${stageTemplate?.title || 'Etapa'}" a revisión.`,
      type: 'badge'
    }).catch(() => {});

    showAlert('Enviado a Revisión', 'Tu etapa ha sido enviada al dirigente para su aprobación.');
  };

  const progressPct = calculateProgress();
  const allCompleted = progressPct === 100;
  const isReadOnly = status === 'En Revision' || status === 'Aprobada';

  if (loading || !stageTemplate) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.subText }}>Cargando requisitos...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Cabecera de Etapa */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderBottomColor: theme.border }]}>
        <View style={styles.headerTitleRow}>
          <StageBadgeIcon stageId={stageTemplate.id} size={50} />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={[styles.stageTitle, { color: theme.text }]}>{stageTemplate.title}</Text>
            <Text style={[styles.stageSub, { color: theme.subText }]}>{stageTemplate.description}</Text>
          </View>
        </View>

        <View style={styles.progressRow}>
          <Text style={[styles.progressLabel, { color: theme.subText }]}>Avance de Etapa:</Text>
          <Text style={styles.progressPct}>{progressPct}%</Text>
        </View>

        <View style={[styles.barBg, { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' }]}>
          <View style={[styles.barFill, { width: `${progressPct}%` }]} />
        </View>

        <View style={[
          styles.statusBadge,
          status === 'Aprobada' ? styles.statusApproved :
          status === 'En Revision' ? styles.statusReview :
          styles.statusProgress
        ]}>
          <Text style={styles.statusBadgeText}>Estado: {status}</Text>
        </View>
      </View>

      {/* Lista de Requisitos */}
      <View style={styles.reqList}>
        {stageTemplate.requirements.map((req, idx) => {
          const isChecked = !!checks[req.id];

          return (
            <TouchableOpacity
              key={req.id}
              style={[
                styles.reqCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                isChecked && (isDarkMode ? styles.reqCardCheckedDark : styles.reqCardChecked),
                isReadOnly && styles.reqCardDisabled
              ]}
              onPress={() => handleRequirementClick(req)}
              disabled={isReadOnly}
              activeOpacity={0.7}
            >
              <View style={styles.reqIconWrapper}>
                {isReadOnly && !isChecked ? (
                  <Lock size={22} color={isDarkMode ? '#52525b' : '#aaa'} />
                ) : isChecked ? (
                  <CheckSquare size={22} color={colors.primary} />
                ) : (
                  <Square size={22} color={isDarkMode ? '#71717a' : '#888'} />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[
                  styles.reqText,
                  { color: theme.text },
                  isChecked && styles.reqTextChecked
                ]}>
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
                          Acreditado: {linkedCertMap[req.id].certTitle} {linkedCertMap[req.id]?.level ? `(${linkedCertMap[req.id].level?.toUpperCase()})` : ''}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.reqBadge}>Toca para vincular especialidad / certificado</Text>
                    )}
                  </View>
                )}

                {(req.type === 'ciclos' || req.text.toLowerCase().includes('ciclo')) && (
                  <Text style={[styles.reqBadge, { color: colors.primary }]}>Toca para seleccionar Evento CIP</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* BOTÓN ENVIAR A REVISIÓN */}
      {!isReadOnly && (
        <View style={styles.footerAction}>
          <TouchableOpacity
            style={[
              styles.sendReviewBtn,
              !allCompleted && styles.sendReviewBtnDisabled
            ]}
            onPress={() => setConfirming(true)}
            disabled={!allCompleted}
          >
            <Send size={18} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.sendReviewBtnText}>
              {allCompleted ? 'ENVIAR ETAPA A REVISIÓN' : 'COMPLETA EL 100% PARA ENVIAR'}
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

              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 10 }}>
                Selecciona tu acreditación correspondiente:
              </Text>

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
                      onPress={() => handleSelectCert(cert)}
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

      {/* MODAL SELECCIÓN EVENTOS CIP 6P */}
      <Modal visible={showCipModal} transparent animationType="slide" onRequestClose={() => setShowCipModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Flag color={colors.primary} size={20} style={{ marginRight: 8 }} />
                <Text style={[modalStyles.title, { color: theme.text }]}>Seleccionar Ciclo Institucional de Programa (CIP)</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCipModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
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
                      ⚡ Convalidar CIP Anterior / Previo
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                      Escribe el nombre y año del CIP en el que participaste anteriormente.
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
                          await dataService.createCipEvent({
                            title: fullTitle,
                            scope: fastCipScope,
                            unit: user.unit ? user.unit.toLowerCase() : 'clan',
                            date: `${yearStr}-01-01`,
                            description: `Convalidado por ${user.name || 'Scout'} para ${selectedReqForCip.text}`,
                            created_by: user.id
                          });

                          setChecks(prev => ({ ...prev, [selectedReqForCip.id]: true }));
                          await dataService.toggleRequirement(user.id, stageId, selectedReqForCip.id, true);

                          showAlert('¡CIP Convalidado!', `Se registró correctamente "${fullTitle}". Tu dirigente podrá revisarlo.`);
                          setFastCipName('');
                          setShowFastCipForm(false);
                          setShowCipModal(false);
                        } catch (e: any) {
                          showAlert('Error', e?.message || 'No se pudo convalidar el CIP.');
                        }
                      }}
                    >
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                        Guardar y Convalidar CIP
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={[modalStyles.subtitle, { color: theme.subText }]}>
                O selecciona un evento CIP publicado por tus dirigentes:
              </Text>

              {loadingCip ? (
                <ActivityIndicator color={colors.primary} style={{ marginVertical: 30 }} />
              ) : cipEvents.length === 0 ? (
                <View style={[modalStyles.emptyCard, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <Text style={[modalStyles.emptyText, { color: theme.subText }]}>
                    No hay Ciclos Institucionales de Programa (CIP) registrados por los dirigentes de tu unidad aún. Usa el botón superior de Convalidación Rápida.
                  </Text>
                </View>
              ) : (
                cipEvents.map((evt) => {
                  const displayTitle = (evt.title || '').replace(/\[6P\s*/gi, '[CIP ').replace(/\b6P\b/gi, 'CIP');
                  const displayDesc  = evt.description ? evt.description.replace(/\b6P\b/gi, 'CIP') : '';

                  return (
                    <TouchableOpacity
                      key={evt.id}
                      style={[modalStyles.eventCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                      onPress={() => handleSelectCipEvent(evt)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[modalStyles.eventTitle, { color: theme.text }]}>{displayTitle}</Text>
                        {displayDesc ? <Text style={[modalStyles.eventDesc, { color: theme.subText }]}>{displayDesc}</Text> : null}
                        <Text style={modalStyles.eventDate}>Fecha: {evt.date}</Text>
                      </View>
                      <CheckCircle size={20} color={colors.primary} />
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, borderBottomWidth: 1 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  stageTitle: { fontSize: 22, fontWeight: 'bold' },
  stageSub: { fontSize: 13, marginTop: 2 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18, marginBottom: 6 },
  progressLabel: { fontSize: 13, fontWeight: '600' },
  progressPct: { fontSize: 15, fontWeight: 'bold', color: colors.primary },
  barBg: { height: 10, borderRadius: 5, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 5 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
  statusProgress: { backgroundColor: '#e0f2fe' },
  statusReview: { backgroundColor: '#fef3c7' },
  statusApproved: { backgroundColor: '#dcfce7' },
  statusBadgeText: { fontSize: 12, fontWeight: 'bold', color: '#0369a1' },

  reqList: { padding: 16 },
  reqCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, marginBottom: 10, borderWidth: 1, elevation: 2 },
  reqCardChecked: { backgroundColor: '#faf5ff', borderColor: '#d8b4fe' },
  reqCardCheckedDark: { backgroundColor: '#2e1065', borderColor: '#7c3aed' },
  reqCardDisabled: { opacity: 0.7 },
  reqIconWrapper: { marginRight: 14 },
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

  card: { width: '90%', alignSelf: 'center', borderRadius: 20, padding: 24, alignItems: 'center' },
  desc: { fontSize: 14, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  btnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  btnSecondary: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { flex: 1, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' }
});
