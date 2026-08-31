import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CheckSquare, Square, CheckCircle, ChevronDown, ChevronUp, BookOpen, Flag, Moon, ArrowLeft, Compass, Tent, HeartHandshake, Sparkles } from 'lucide-react-native';
import { dataService } from '../lib/dataService';
import { notificationService } from '../services/notificationService';
import { useTheme } from '../context/ThemeContext';
import { stagesData } from '../data/progressionTemplate';
import { activitiesCatalog } from '../data/activitiesCatalog';
import { NochesAireLibreModal } from '../components/NochesAireLibreModal';
import { VidaGrupoModal } from '../components/VidaGrupoModal';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { navigateBackOrHome } from '../utils/navigationHelper';

export default function ScouterReviewScreen({ route, navigation }: any) {
  const { scoutId, stageId, scoutName } = route.params;
  const { isDarkMode, theme } = useTheme();
  
  const stageTemplate = stagesData.find(s => s.id === stageId);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [completedActivities, setCompletedActivities] = useState<any[]>([]);
  const [cipList, setCipList] = useState<any[]>([]);
  const [cipSelectionsMap, setCipSelectionsMap] = useState<Record<string, any[]>>({});
  const [vidaGrupoMap, setVidaGrupoMap] = useState<Record<string, any[]>>({});
  const [linkedCertMap, setLinkedCertMap] = useState<Record<string, any>>({});
  const [showCatalogDetails, setShowCatalogDetails] = useState<Record<string, boolean>>({});
  const [nightsMap, setNightsMap] = useState<Record<string, any[]>>({});
  const [showNochesModal, setShowNochesModal] = useState(false);
  const [selectedReqForNoches, setSelectedReqForNoches] = useState<any>(null);
  const [showVidaGrupoModal, setShowVidaGrupoModal] = useState(false);
  const [selectedReqForVidaGrupo, setSelectedReqForVidaGrupo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!stageTemplate) return;
    const loadedChecks: Record<string, boolean> = {};
    const loadedNights: Record<string, any[]> = {};
    const loadedVg: Record<string, any[]> = {};
    const loadedCipSels: Record<string, any[]> = {};

    const allLinks = await dataService.getAllLinkedCertificates(scoutId);
    setLinkedCertMap(allLinks || {});

    for (const req of stageTemplate.requirements) {
      loadedChecks[req.id] = await dataService.getRequirement(scoutId, stageId, req.id);

      if (req.type === 'aire_libre' || req.text.toLowerCase().includes('noche')) {
        const logs = await dataService.getNightsLog(scoutId, stageId, req.id);
        loadedNights[req.id] = logs || [];
      }

      if (req.type === 'vida_grupo' || req.text.toLowerCase().includes('peregrinaje') || req.text.toLowerCase().includes('campamento') || req.text.toLowerCase().includes('proyecto de servicio') || req.text.toLowerCase().includes('vida de grupo')) {
        const logs = await dataService.getVidaGrupoLog(scoutId, stageId, req.id);
        loadedVg[req.id] = logs || [];
      }

      if (req.type === 'ciclos' || req.text.toLowerCase().includes('ciclo')) {
        const sels = await dataService.getCipSelections(scoutId, stageId, req.id);
        loadedCipSels[req.id] = sels || [];
      }
    }
    setChecks(loadedChecks);
    setNightsMap(loadedNights);
    setVidaGrupoMap(loadedVg);
    setCipSelectionsMap(loadedCipSels);

    // Obtener IDs de actividades completadas por el Scout
    const completedIds = await dataService.getCompletedCatalogActivityIds(scoutId);
    const matched = activitiesCatalog.filter(act => completedIds.includes(act.id));
    setCompletedActivities(matched);

    // Cargar CIPs de la unidad / registrados por dirigentes o convalidados por el Scout
    const cips = await dataService.getCipEvents();
    setCipList(cips || []);

    setLoading(false);
  };

  const toggleCheck = async (reqId: string) => {
    const newValue = !checks[reqId];
    setChecks(prev => ({ ...prev, [reqId]: newValue }));
    await dataService.toggleRequirement(scoutId, stageId, reqId, newValue);
  };

  const toggleShowDetails = (reqId: string) => {
    setShowCatalogDetails(prev => ({ ...prev, [reqId]: !prev[reqId] }));
  };

  const [confirmStep, setConfirmStep] = useState<'none' | 'approve' | 'reject'>('none');

  const handleApprove = async () => {
    const allChecked = stageTemplate?.requirements.every(req => checks[req.id]);
    
    if (confirmStep === 'none') {
      setConfirmStep(allChecked ? 'approve' : 'reject');
      return;
    }

    if (confirmStep === 'reject') {
      await dataService.rejectStage(scoutId, stageId);
      notificationService.sendNotification({
        receiverId: scoutId,
        title: '📋 Ficha de Etapa Devuelta',
        message: `Tu dirigente ha revisado tu etapa "${stageTemplate?.title || 'Revisión'}" y tiene requisitos pendientes por completar.`,
        type: 'alert'
      }).catch(() => {});
      showAlert('Ficha Devuelta', 'Se ha devuelto la ficha al scout para que complete los requisitos faltantes.');
      navigation.goBack();
    } else if (confirmStep === 'approve') {
      await dataService.approveStage(scoutId, stageId);
      notificationService.sendNotification({
        receiverId: scoutId,
        title: '🎉 ¡Etapa e Insignia Aprobadas!',
        message: `¡Felicidades! Tu dirigente ha aprobado oficialmente tu etapa "${stageTemplate?.title || 'Revisión'}".`,
        type: 'badge'
      }).catch(() => {});
      showAlert('¡Etapa Aprobada!', 'La etapa ha sido aprobada exitosamente y el scout ha sido notificado.');
      navigation.goBack();
    }
  };

  const getButtonText = () => {
    if (confirmStep === 'approve') return '¿SEGURO? HAZ CLIC PARA APROBAR';
    if (confirmStep === 'reject') return '¿SEGURO? HAZ CLIC PARA DEVOLVER FICHA';
    return 'APROBAR Y FINALIZAR';
  };

  if (loading || !stageTemplate) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.subText }}>Cargando requisitos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, isDarkMode && { backgroundColor: '#121214', borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
              gap: 6
            }}
            onPress={() => navigateBackOrHome(navigation, 'scouter')}
          >
            <ArrowLeft size={16} color={theme.text} />
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>Volver al Panel</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Revisando ficha de:</Text>
        <Text style={styles.title}>{scoutName}</Text>

        {/* BOTONES DE ACCESO A FICHA MÉDICA Y CURRÍCULUM DEL SCOUT */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => navigation.navigate('FichaMedica', { targetUserId: scoutId })}
          >
            <Text style={styles.viewDocBtnText}>📋 Ver Ficha Médica</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => navigation.navigate('CurriculumScout', { targetUserId: scoutId })}
          >
            <Text style={styles.viewDocBtnText}>📜 Ver Currículum Scout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <Text style={[styles.instructionText, { color: theme.subText }]}>
          Toca cualquier requisito que consideres incorrecto para desmarcarlo. Si desmarcas algo, la etapa le será devuelta.
        </Text>

        {stageTemplate.requirements.map(req => {
          const isChecked = checks[req.id];
          const isCatalogReq = req.type === 'basica' || req.type === 'opcional';
          const isCipReq = req.type === 'ciclos' || req.text.toLowerCase().includes('ciclo') || req.text.toLowerCase().includes('cip') || req.text.toLowerCase().includes('6p');
          const isNochesReq = req.type === 'aire_libre' || req.text.toLowerCase().includes('noche');
          const isVidaGrupoReq = req.type === 'vida_grupo' || req.text.toLowerCase().includes('peregrinaje') || req.text.toLowerCase().includes('campamento') || req.text.toLowerCase().includes('proyecto de servicio') || req.text.toLowerCase().includes('vida de grupo');
          const isExpanded = !showCatalogDetails[req.id];
          const totalNightsLogged = (nightsMap[req.id] || []).reduce((acc: number, item: any) => acc + (item.nightsCount || 1), 0);
          const reqVgEntries = vidaGrupoMap[req.id] || [];
          const reqCipSelections = cipSelectionsMap[req.id] || [];

          return (
            <View key={req.id} style={{ marginBottom: 10 }}>
              <TouchableOpacity 
                style={[
                  styles.reqRow, 
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                  !isChecked && (isDarkMode ? styles.reqRowErrorDark : styles.reqRowError)
                ]}
                onPress={() => toggleCheck(req.id)}
                activeOpacity={0.7}
              >
                {isChecked ? (
                  <CheckSquare color={colors.primary} size={24} />
                ) : (
                  <Square color={colors.error} size={24} />
                )}
                <View style={{ flex: 1, marginLeft: 15 }}>
                  <Text style={[
                    styles.reqText, 
                    { color: theme.text },
                    !isChecked && styles.reqTextError
                  ]}>
                    {req.text}
                  </Text>
                  
                  {isCatalogReq && (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleShowDetails(req.id);
                      }}
                    >
                      <BookOpen size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>
                        {isExpanded ? 'Ocultar actividades realizadas' : `Ver actividades realizadas (${completedActivities.length})`}
                      </Text>
                      {isExpanded ? <ChevronUp size={14} color={colors.primary} style={{ marginLeft: 2 }} /> : <ChevronDown size={14} color={colors.primary} style={{ marginLeft: 2 }} />}
                    </TouchableOpacity>
                  )}

                  {isCipReq && (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleShowDetails(req.id);
                      }}
                    >
                      <Flag size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>
                        {isExpanded
                          ? 'Ocultar actividades CIP'
                          : `Ver actividades CIP (${(reqCipSelections.length || cipList.length) > 0 ? `${reqCipSelections.length || cipList.length} seleccionadas` : isChecked ? 'convalidadas' : '0 seleccionadas'})`}
                      </Text>
                      {isExpanded ? <ChevronUp size={14} color={colors.primary} style={{ marginLeft: 2 }} /> : <ChevronDown size={14} color={colors.primary} style={{ marginLeft: 2 }} />}
                    </TouchableOpacity>
                  )}

                  {isVidaGrupoReq && (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleShowDetails(req.id);
                      }}
                    >
                      <Compass size={14} color="#8b5cf6" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#8b5cf6' }}>
                        {isExpanded
                          ? 'Ocultar desglose de Vida de Grupo'
                          : `Ver desglose de registros (${reqVgEntries.length > 0 ? `${reqVgEntries.length} de ${req.requiredCount || 1}` : isChecked ? 'convalidado' : `0 de ${req.requiredCount || 1}`})`}
                      </Text>
                      {isExpanded ? <ChevronUp size={14} color="#8b5cf6" style={{ marginLeft: 2 }} /> : <ChevronDown size={14} color="#8b5cf6" style={{ marginLeft: 2 }} />}
                    </TouchableOpacity>
                  )}

                  {isNochesReq && (
                    <TouchableOpacity 
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedReqForNoches(req);
                        setShowNochesModal(true);
                      }}
                    >
                      <Moon size={14} color="#0284c7" style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#0284c7' }}>
                        🏕️ Ver registro de pernoctas ({totalNightsLogged > 0 ? `${totalNightsLogged} de ${req.requiredCount || 10} noches registradas` : isChecked ? `${req.requiredCount || 10} noches convalidadas` : '0 noches registradas'})
                      </Text>
                    </TouchableOpacity>
                  )}

                  {(req.type === 'cursos' || req.type === 'especialidad') && (
                    <View style={{ marginTop: 6 }}>
                      {linkedCertMap[req.id]?.certTitle || linkedCertMap[`${stageId}_${req.id}`]?.certTitle ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Sparkles size={13} color="#10b981" style={{ marginRight: 4 }} />
                          <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 'bold' }}>
                            Acreditación Vinculada: {linkedCertMap[req.id]?.certTitle || linkedCertMap[`${stageId}_${req.id}`]?.certTitle}
                          </Text>
                        </View>
                      ) : (
                        <Text style={{ fontSize: 11, color: theme.subText, fontStyle: 'italic' }}>
                          Sin especialidad o curso formalmente vinculado
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* LISTA DESPLEGABLE DE ACTIVIDADES REALIZADAS */}
              {isCatalogReq && isExpanded && (
                <View style={{ backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, marginTop: -4, marginLeft: 10, marginRight: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                    Actividades del Catálogo realizadas por {scoutName}:
                  </Text>
                  {completedActivities.length === 0 ? (
                    <Text style={{ fontSize: 12, color: theme.subText, fontStyle: 'italic' }}>
                      No se registraron actividades específicas del catálogo para este requisito.
                    </Text>
                  ) : (
                    completedActivities.map((act, index) => (
                      <View key={act.id} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary, marginRight: 6 }}>
                          {index + 1}.
                        </Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                            {act.text}
                          </Text>
                          {act.subArea && (
                            <Text style={{ fontSize: 10, color: theme.subText }}>
                              Área: {act.subArea}
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* LISTA DESPLEGABLE DE ACTIVIDADES CIP SELECCIONADAS / CONVALIDADAS */}
              {isCipReq && isExpanded && (
                <View style={{ backgroundColor: theme.inputBg, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 12, marginTop: -4, marginLeft: 10, marginRight: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text, marginBottom: 8 }}>
                    Actividades CIP seleccionadas por {scoutName} ({reqCipSelections.length} de {req.requiredCount || 1}):
                  </Text>
                  {(reqCipSelections.length > 0 ? reqCipSelections : cipList).length === 0 ? (
                    <Text style={{ fontSize: 12, color: theme.subText, fontStyle: 'italic' }}>
                      No hay eventos CIP registrados o convalidados aún.
                    </Text>
                  ) : (
                    (reqCipSelections.length > 0 ? reqCipSelections : cipList).map((cip, index) => (
                      <View key={cip.id || index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, backgroundColor: theme.cardBg, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
                        <Flag size={16} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
                            {(cip.title || '').replace(/\[6P\s*/gi, '[CIP ').replace(/\b6P\b/gi, 'CIP')}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                            📅 Fecha / Año: {cip.date || 'Sin fecha'} {cip.scope ? `(${cip.scope.toUpperCase()})` : ''}
                          </Text>
                          {cip.description ? (
                            <Text style={{ fontSize: 10, color: theme.subText, fontStyle: 'italic', marginTop: 1 }}>
                              {cip.description.replace(/\b6P\b/gi, 'CIP')}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* LISTA DESPLEGABLE DE REGISTROS DE VIDA DE GRUPO */}
              {isVidaGrupoReq && isExpanded && (
                <View style={{ backgroundColor: theme.inputBg, borderWidth: 1, borderColor: '#8b5cf6', borderRadius: 12, padding: 12, marginTop: -4, marginLeft: 10, marginRight: 10 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#8b5cf6', marginBottom: 8 }}>
                    Desglose de Vida de Grupo ({reqVgEntries.length} de {req.requiredCount || 1} registrados):
                  </Text>
                  {reqVgEntries.length === 0 ? (
                    <Text style={{ fontSize: 12, color: theme.subText, fontStyle: 'italic' }}>
                      El Scout aún no ha registrado los detalles para este requisito.
                    </Text>
                  ) : (
                    reqVgEntries.map((entry, index) => (
                      <View key={entry.id || index} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, backgroundColor: theme.cardBg, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.border }}>
                        {entry.type === 'peregrinaje' ? (
                          <Compass size={18} color={colors.primary} style={{ marginRight: 8, marginTop: 2 }} />
                        ) : entry.type === 'campamento' ? (
                          <Tent size={18} color="#16a34a" style={{ marginRight: 8, marginTop: 2 }} />
                        ) : (
                          <HeartHandshake size={18} color="#8b5cf6" style={{ marginRight: 8, marginTop: 2 }} />
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                            {entry.title || (entry.type === 'peregrinaje' ? `Peregrinaje ${entry.subtype || ''}` : 'Registro de Vida de Grupo')}
                          </Text>
                          {entry.location ? (
                            <Text style={{ fontSize: 11, color: theme.text, marginTop: 2 }}>
                              📍 Destino / Lugar: <Text style={{ fontWeight: 'bold' }}>{entry.location}</Text>
                            </Text>
                          ) : null}
                          <Text style={{ fontSize: 11, color: theme.subText, marginTop: 1 }}>
                            📅 Fecha: {entry.date || 'Sin fecha'} {entry.subtype ? `• Tipo: ${entry.subtype}` : ''}
                          </Text>
                          {entry.description ? (
                            <Text style={{ fontSize: 11, color: theme.subText, fontStyle: 'italic', marginTop: 2 }}>
                              "{entry.description}"
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL DE CONSULTA DE NOCHES PARA EL SCOUTER */}
      {selectedReqForNoches && (
        <NochesAireLibreModal
          visible={showNochesModal}
          onClose={() => setShowNochesModal(false)}
          scoutId={scoutId}
          stageId={stageId}
          reqId={selectedReqForNoches.id}
          reqTitle={selectedReqForNoches.text}
          requiredCount={selectedReqForNoches.requiredCount || 10}
          isReadOnly={true}
        />
      )}

      {/* MODAL DE CONSULTA DE VIDA DE GRUPO PARA EL SCOUTER */}
      {selectedReqForVidaGrupo && (
        <VidaGrupoModal
          visible={showVidaGrupoModal}
          onClose={() => setShowVidaGrupoModal(false)}
          scoutId={scoutId}
          stageId={stageId}
          reqId={selectedReqForVidaGrupo.id}
          reqTitle={selectedReqForVidaGrupo.text}
          requiredCount={selectedReqForVidaGrupo.requiredCount || 1}
          isReadOnly={true}
        />
      )}

      <View style={[styles.footer, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[
            styles.approveButton, 
            confirmStep === 'reject' && { backgroundColor: colors.warning }
          ]} 
          onPress={handleApprove}
        >
          <CheckCircle color="white" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.approveButtonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: colors.primary, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#e0e0e0', marginBottom: 4 },
  scroll: { flex: 1, padding: 20 },
  instructionText: { fontSize: 14, marginBottom: 20, fontStyle: 'italic', textAlign: 'center' },
  reqRow: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 16, borderRadius: 12, marginBottom: 10,
    borderWidth: 1
  },
  reqRowError: { borderColor: colors.error, backgroundColor: '#fef2f2' },
  reqRowErrorDark: { borderColor: '#ef4444', backgroundColor: '#450a0a' },
  reqText: { fontSize: 15, marginLeft: 15, flex: 1 },
  reqTextError: { color: colors.error, textDecorationLine: 'line-through' },
  footer: { padding: 20, borderTopWidth: 1 },
  approveButton: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  approveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  viewDocBtn: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'white' },
  viewDocBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});
