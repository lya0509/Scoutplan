import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { UploadCloud, Award, Trash2, X, AlertTriangle, Image as ImageIcon, Sparkles, Download, Maximize2, ArrowLeft, Calendar as CalendarIcon, Check, CheckCircle } from 'lucide-react-native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { dataService } from '../lib/dataService';
import { certificateCategories, specialtyAreas, specialtyLevels, wosmProgramsList } from '../data/specialtiesData';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';

const LEVEL_COLORS: Record<string, string> = {
  bronce: '#cd7f32',
  plata: '#94a3b8',
  oro: '#eab308',
};

export default function CertificateUploadScreen({ route, navigation }: any) {
  const returnToStage = route?.params?.returnToStage; // { stageId, reqId, reqText, level }
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [certificates, setCertificates] = useState<any[]>([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(returnToStage?.level ? 'especialidades' : 'especialidades');
  const [area, setArea] = useState(specialtyAreas[0].id);
  const [level, setLevel] = useState(returnToStage?.level || 'bronce');
  const [fileUrl, setFileUrl] = useState('');

  // Fecha de expedición / realización del certificado
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [syncWithCurriculum, setSyncWithCurriculum] = useState(true);

  const [activeFilter, setActiveFilter] = useState('TODAS');

  // Modal para ver certificado a pantalla completa y descargar
  const [viewModalCert, setViewModalCert] = useState<any>(null);

  const [deleteModalCert, setDeleteModalCert] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    loadCertificates();
  }, [user]);

  const loadCertificates = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await dataService.getCertificates(user.id);
      setCertificates(data);
    } catch (err) {
      console.error('Error cargando certificados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFileFromDevice = () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const rawResult = String(event.target.result);
              const img = new (window as any).Image();
              img.src = rawResult;
              img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                  if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                  }
                } else {
                  if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                  }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                setFileUrl(resizedDataUrl);
              };
              img.onerror = () => {
                setFileUrl(rawResult);
              };
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      showAlert('Selección de Archivo', 'Ingresa la URL o pega la imagen de tu certificado.');
    }
  };

  const handleDownloadCertificate = (cert: any) => {
    if (!cert?.file_url) {
      showAlert('Sin Archivo', 'Este certificado no posee un archivo de imagen adjunto.');
      return;
    }

    if (Platform.OS === 'web') {
      const link = document.createElement('a');
      link.href = cert.file_url;
      link.download = `${cert.title ? cert.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'certificado'}_acreditacion.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showAlert('¡Descarga Iniciada!', `Guardando "${cert.title}" en tu dispositivo.`);
    } else {
      showAlert('Enlace de Certificado', `URL de descarga del certificado: ${cert.file_url}`);
    }
  };

  const handleUpload = async () => {
    if (!user) {
      showAlert('Sesión Requerida', 'Debes estar autenticado para guardar una acreditación.');
      return;
    }
    if (!title.trim()) {
      showAlert('Campo Requerido', 'Por favor ingresa un título o selecciona una especialidad.');
      return;
    }

    setUploading(true);

    try {
      const isSpec = category === 'especialidades';
      const simUrl = fileUrl || 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=500&q=80';

      const createdCert = await dataService.uploadCertificate(
        user.id,
        title.trim(),
        category,
        isSpec ? level : null,
        simUrl,
        issueDate
      );

      if (returnToStage && user?.id) {
        await dataService.toggleRequirement(user.id, returnToStage.stageId, returnToStage.reqId, true);
        await AsyncStorage.setItem(
          `@scout_req_linked_${user.id}_${returnToStage.stageId}_${returnToStage.reqId}`,
          JSON.stringify({ certTitle: title.trim(), level: isSpec ? level : null, date: issueDate })
        );
        showAlert('¡Requisito Vinculado!', `Se ha registrado "${title.trim()}" y marcado tu requisito en la etapa.`);
        setShowFormModal(false);
        navigation.navigate('StageDetail', { stageId: returnToStage.stageId });
        return;
      }

      const msg = syncWithCurriculum
        ? 'Tu acreditación ha sido guardada y sincronizada automáticamente con tu Currículum Scout (Hoja de Vida).'
        : 'Tu acreditación ha sido registrada correctamente.';

      showAlert('¡Acreditación Guardada!', msg);
      setShowFormModal(false);
      setTitle('');
      setFileUrl('');
      loadCertificates();
    } catch (error: any) {
      console.error('Error al guardar acreditación:', error);
      showAlert('Error al guardar', error?.message || 'No se pudo guardar la acreditación.');
    } finally {
      setUploading(false);
    }
  };

  const handleSelectForRequirement = async (cert: any) => {
    if (!returnToStage || !user?.id) return;
    try {
      await dataService.toggleRequirement(user.id, returnToStage.stageId, returnToStage.reqId, true);
      await AsyncStorage.setItem(
        `@scout_req_linked_${user.id}_${returnToStage.stageId}_${returnToStage.reqId}`,
        JSON.stringify({ certId: cert.id, certTitle: cert.title, level: cert.level, date: cert.date || cert.created_at })
      );
      showAlert('¡Especialidad Vinculada!', `Has vinculado "${cert.title}" a tu requisito "${returnToStage.reqText}".`);
      navigation.navigate('StageDetail', { stageId: returnToStage.stageId });
    } catch (err: any) {
      showAlert('Error', err?.message || 'No se pudo vincular la especialidad.');
    }
  };

  const handleDeleteCertificate = async () => {
    if (!deleteModalCert) return;

    const isDeletingOwn = deleteModalCert.scout_id === user?.id;
    if (!isDeletingOwn && isScouter && !deleteReason.trim()) {
      showAlert('Motivo Requerido', 'Debes escribir una explicación de por qué estás eliminando este documento.');
      return;
    }

    try {
      await dataService.deleteCertificate(
        deleteModalCert.id,
        deleteModalCert.scout_id,
        deleteModalCert.title,
        isDeletingOwn ? '' : deleteReason.trim()
      );

      showAlert(
        'Certificado Eliminado',
        isDeletingOwn
          ? `Has eliminado "${deleteModalCert.title}" correctamente.`
          : 'Se ha eliminado la acreditación y notificado al joven.'
      );
      setDeleteModalCert(null);
      setViewModalCert(null);
      setDeleteReason('');
      loadCertificates();
    } catch (error: any) {
      showAlert('Error', error?.message || 'No se pudo eliminar el documento.');
    }
  };

  const currentAreaObj = specialtyAreas.find(a => a.id === area);

  const filteredCerts = certificates.filter(c => {
    if (activeFilter === 'TODAS') return true;
    return c.category?.toLowerCase() === activeFilter.toLowerCase();
  });

  const isScouter = user?.role === 'scouter' || user?.role === 'jefe_grupo';

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Cabecera */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          {navigation?.canGoBack() && (
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginRight: 10 }}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={16} color={theme.text} style={{ marginRight: 4 }} />
              <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.text }}>Volver</Text>
            </TouchableOpacity>
          )}
          <Text style={[styles.title, { color: theme.text, flex: 1 }]}>Mis Acreditaciones e Iniciativas</Text>
        </View>

        {returnToStage && (
          <View style={{ backgroundColor: isDarkMode ? '#1e1b4b' : '#f5f3ff', borderWidth: 1.5, borderColor: '#8b5cf6', borderRadius: 12, padding: 12, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Sparkles size={18} color="#8b5cf6" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDarkMode ? '#c4b5fd' : '#6d28d9', flex: 1 }}>
                Vinculando para: {returnToStage.reqText}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: isDarkMode ? '#a78bfa' : '#7c3aed', marginTop: 4 }}>
              Toca "Vincular a este Requisito" en cualquiera de tus certificados o sube uno nuevo para marcar la etapa.
            </Text>
          </View>
        )}

        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Especialidades (Bronce/Plata/Oro), Iniciativas de Programa Nacionales (ej: Enseñas) y Cursos.
        </Text>

        <TouchableOpacity 
          style={styles.uploadBtn}
          onPress={() => setShowFormModal(true)}
        >
          <UploadCloud color="white" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.uploadBtnText}>
            {returnToStage ? `Subir y Vincular para ${returnToStage.reqText}` : 'Agregar Acreditación / Iniciativa'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filtros horizontales */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, activeFilter === 'TODAS' && styles.filterChipActive]}
            onPress={() => setActiveFilter('TODAS')}
          >
            <Text style={[styles.filterChipText, activeFilter === 'TODAS' && styles.filterChipTextActive]}>
              TODAS ({certificates.length})
            </Text>
          </TouchableOpacity>

          {certificateCategories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.filterChip, activeFilter === cat.id && styles.filterChipActive]}
              onPress={() => setActiveFilter(cat.id)}
            >
              <Text style={[styles.filterChipText, activeFilter === cat.id && styles.filterChipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de Acreditaciones */}
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
        ) : filteredCerts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Award size={48} color={isDarkMode ? '#52525b' : '#cbd5e1'} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Sin acreditaciones registradas</Text>
            <Text style={[styles.emptyDesc, { color: theme.subText }]}>
              Aún no has agregado diplomas o certificados en esta categoría.
            </Text>
          </View>
        ) : (
          filteredCerts.map(cert => {
            const catObj = certificateCategories.find(c => c.id === cert.category);
            const levelObj = specialtyLevels.find(l => l.id === cert.level);
            const levelColor = LEVEL_COLORS[cert.level] || colors.primary;

            return (
              <TouchableOpacity 
                key={cert.id} 
                style={[styles.certCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => setViewModalCert(cert)}
                activeOpacity={0.8}
              >
                <View style={styles.certCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.catBadgeRow}>
                      <Text style={styles.catBadgeText}>{catObj?.name || 'ACREDITACIÓN'}</Text>
                      {levelObj && (
                        <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
                          <Text style={styles.levelBadgeText}>{levelObj.name}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.certTitle, { color: theme.text }]}>{cert.title}</Text>
                    {cert.area ? (
                      <Text style={[styles.certArea, { color: theme.subText }]}>Área: {cert.area}</Text>
                    ) : null}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDownloadCertificate(cert);
                      }}
                    >
                      <Download size={18} color={colors.primary} />
                    </TouchableOpacity>

                    {(isScouter || cert.scout_id === user?.id) && (
                      <TouchableOpacity 
                        style={styles.actionIconBtn} 
                        onPress={(e) => {
                          e.stopPropagation();
                          setDeleteModalCert(cert);
                        }}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {returnToStage && (
                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#10b981',
                      paddingVertical: 9,
                      paddingHorizontal: 12,
                      borderRadius: 10,
                      marginTop: 10,
                      gap: 6
                    }}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleSelectForRequirement(cert);
                    }}
                  >
                    <CheckCircle size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                      ✅ Vincular a este Requisito
                    </Text>
                  </TouchableOpacity>
                )}

                {cert.file_url ? (
                  <View style={styles.imagePreviewWrapper}>
                    <Image source={{ uri: cert.file_url }} style={styles.previewImage} resizeMode="cover" />
                    <View style={styles.zoomHintOverlay}>
                      <Maximize2 size={14} color="white" style={{ marginRight: 4 }} />
                      <Text style={styles.zoomHintText}>Toca para ver completo y descargar</Text>
                    </View>
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* MODAL 1: VISUALIZACIÓN A PANTALLA COMPLETA DEL CERTIFICADO Y DESCARGA */}
      <Modal visible={viewModalCert !== null} transparent animationType="fade">
        <View style={viewerStyles.overlay}>
          <View style={[viewerStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[viewerStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[viewerStyles.title, { color: theme.text }]} numberOfLines={1}>
                  {viewModalCert?.title}
                </Text>
                <Text style={[viewerStyles.subTitle, { color: theme.subText }]}>
                  Documento / Diploma Acreditado
                </Text>
              </View>
              <TouchableOpacity onPress={() => setViewModalCert(null)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              {viewModalCert?.file_url ? (
                <View style={viewerStyles.fullImageWrapper}>
                  <Image
                    source={{ uri: viewModalCert.file_url }}
                    style={viewerStyles.fullImage}
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View style={viewerStyles.noImageCard}>
                  <Text style={{ color: theme.subText }}>Sin vista previa de imagen.</Text>
                </View>
              )}

              <View style={viewerStyles.btnActionRow}>
                <TouchableOpacity
                  style={viewerStyles.downloadBtn}
                  onPress={() => handleDownloadCertificate(viewModalCert)}
                >
                  <Download size={18} color="white" style={{ marginRight: 8 }} />
                  <Text style={viewerStyles.downloadBtnText}>Descargar Certificado</Text>
                </TouchableOpacity>

                {(isScouter || viewModalCert?.scout_id === user?.id) && (
                  <TouchableOpacity
                    style={viewerStyles.deleteActionBtn}
                    onPress={() => {
                      setDeleteModalCert(viewModalCert);
                    }}
                  >
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL FORMULARIO AGREGAR ACREDITACIÓN */}
      <Modal visible={showFormModal} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <Text style={[modalStyles.title, { color: theme.text }]}>Nueva Acreditación / Iniciativa</Text>
              <TouchableOpacity onPress={() => setShowFormModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={[modalStyles.label, { color: theme.subText }]}>CATEGORÍA *</Text>
              <View style={modalStyles.chipGrid}>
                {certificateCategories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      modalStyles.chipBtn,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      category === cat.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => {
                      setCategory(cat.id);
                      setTitle('');
                    }}
                  >
                    <Text style={[
                      modalStyles.chipBtnText,
                      { color: theme.subText },
                      category === cat.id && { color: 'white', fontWeight: 'bold' }
                    ]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {category === 'especialidades' && (
                <>
                  <Text style={[modalStyles.label, { color: theme.subText }]}>ÁREA DE ESPECIALIDAD *</Text>
                  <View style={modalStyles.chipGrid}>
                    {specialtyAreas.map(a => (
                      <TouchableOpacity
                        key={a.id}
                        style={[
                          modalStyles.chipBtn,
                          { backgroundColor: theme.inputBg, borderColor: theme.border },
                          area === a.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setArea(a.id)}
                      >
                        <Text style={[
                          modalStyles.chipBtnText,
                          { color: theme.subText },
                          area === a.id && { color: 'white', fontWeight: 'bold' }
                        ]}>
                          {a.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[modalStyles.label, { color: theme.subText }]}>SELECCIONA O ESCRIBE LA ESPECIALIDAD *</Text>
                  <View style={modalStyles.quickSuggestBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Sparkles size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={modalStyles.suggestLabel}>Especialidades Oficiales de {currentAreaObj?.name}:</Text>
                    </View>
                    <View style={modalStyles.chipGrid}>
                      {currentAreaObj?.items.map(item => (
                        <TouchableOpacity
                          key={item}
                          style={[
                            modalStyles.itemPill,
                            { backgroundColor: theme.inputBg, borderColor: theme.border },
                            title === item && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                          onPress={() => setTitle(item)}
                        >
                          <Text style={[
                            modalStyles.itemPillText,
                            { color: theme.subText },
                            title === item && { color: 'white', fontWeight: 'bold' }
                          ]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={[modalStyles.label, { color: theme.subText }]}>NIVEL ALCANZADO *</Text>
                  <View style={modalStyles.chipGrid}>
                    {specialtyLevels.map(lvl => {
                      const lvlColor = LEVEL_COLORS[lvl.id] || colors.primary;
                      return (
                        <TouchableOpacity
                          key={lvl.id}
                          style={[
                            modalStyles.chipBtn,
                            { backgroundColor: theme.inputBg, borderColor: theme.border },
                            level === lvl.id && { backgroundColor: lvlColor, borderColor: lvlColor }
                          ]}
                          onPress={() => setLevel(lvl.id)}
                        >
                          <Text style={[
                            modalStyles.chipBtnText,
                            { color: theme.subText },
                            level === lvl.id && { color: 'white', fontWeight: 'bold' }
                          ]}>
                            {lvl.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {(category === 'programas_mundiales' || category === 'iniciativas_programa') && (
                <>
                  <Text style={[modalStyles.label, { color: theme.subText }]}>SELECCIONA EL PROGRAMA MUNDIAL / INICIATIVA *</Text>
                  <View style={modalStyles.chipGrid}>
                    {wosmProgramsList.map(prog => (
                      <TouchableOpacity
                        key={prog}
                        style={[
                          modalStyles.itemPill,
                          { backgroundColor: theme.inputBg, borderColor: theme.border },
                          title === prog && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => setTitle(prog)}
                      >
                        <Text style={[
                          modalStyles.itemPillText,
                          { color: theme.subText },
                          title === prog && { color: 'white', fontWeight: 'bold' }
                        ]}>
                          {prog}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={[modalStyles.label, { color: theme.subText }]}>NOMBRE O TÍTULO PERSONALIZADO *</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, marginBottom: 12 }]}
                placeholder="Ej: Especialidad de Campismo / Primeros Auxilios"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={title}
                onChangeText={setTitle}
              />

              {/* FECHA DE OBTENCIÓN / EXPEDICIÓN */}
              <Text style={[modalStyles.label, { color: theme.subText }]}>FECHA DE OBTENCIÓN / APROBACIÓN *</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}
                  onPress={() => setShowDatePickerModal(true)}
                  activeOpacity={0.8}
                >
                  <CalendarIcon size={16} color={colors.primary} style={{ marginRight: 6 }} />
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: 'bold' }}>
                    {issueDate || 'Seleccionar fecha'}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  style={[modalStyles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="AAAA-MM-DD"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={issueDate}
                  onChangeText={setIssueDate}
                />
              </View>

              {/* MODAL PICKER DE CALENDARIO PARA SELECCIONAR FECHA DE EXPEDICIÓN */}
              <Modal visible={showDatePickerModal} transparent animationType="fade" onRequestClose={() => setShowDatePickerModal(false)}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                  <View style={{ width: '100%', maxWidth: 360, backgroundColor: isDarkMode ? '#18181b' : 'white', borderRadius: 20, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                        Fecha del Certificado
                      </Text>
                      <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                        <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
                      </TouchableOpacity>
                    </View>

                    <RNCalendar
                      current={issueDate || new Date().toISOString().split('T')[0]}
                      onDayPress={(dayData: DateData) => {
                        setIssueDate(dayData.dateString);
                        setShowDatePickerModal(false);
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

              {/* TOGGLE DE SINCRONIZACIÓN CON EL CURRÍCULUM */}
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: syncWithCurriculum ? (isDarkMode ? '#1e1b4b' : '#f5f3ff') : (isDarkMode ? '#27272a' : '#f8fafc'), padding: 12, borderRadius: 12, borderWidth: 1, borderColor: syncWithCurriculum ? '#8b5cf6' : theme.border, marginBottom: 14 }}
                onPress={() => setSyncWithCurriculum(prev => !prev)}
                activeOpacity={0.8}
              >
                <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: syncWithCurriculum ? '#8b5cf6' : 'transparent', borderWidth: 1.5, borderColor: syncWithCurriculum ? '#8b5cf6' : theme.subText, justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
                  {syncWithCurriculum && <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>✓</Text>}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                    Sincronizar con mi Currículum Scout
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                    Inserta automáticamente esta acreditación y su fecha en tu Hoja de Vida Scout oficial.
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={[modalStyles.label, { color: theme.subText }]}>FOTO O ADJUNTO DEL CERTIFICADO (OPCIONAL)</Text>
              
              <TouchableOpacity
                style={[modalStyles.deviceFileBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: colors.primary }]}
                onPress={handleSelectFileFromDevice}
                activeOpacity={0.8}
              >
                <ImageIcon size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[modalStyles.deviceFileBtnText, { color: colors.primary }]}>
                  📂 Seleccionar Foto/Diploma desde tu Dispositivo
                </Text>
              </TouchableOpacity>

              <Text style={{ fontSize: 11, color: theme.subText, marginVertical: 6, textAlign: 'center' }}>
                — o pega directamente la URL o enlace —
              </Text>

              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="https://ejemplo.com/certificado.jpg"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={fileUrl}
                onChangeText={setFileUrl}
              />

              {fileUrl ? (
                <View style={modalStyles.previewBox}>
                  <Text style={[modalStyles.previewText, { color: theme.subText }]}>VISTA PREVIA CARGADA:</Text>
                  <Image source={{ uri: fileUrl }} style={modalStyles.previewImg} resizeMode="cover" />
                </View>
              ) : null}

              <TouchableOpacity
                style={modalStyles.saveSubmitBtn}
                onPress={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={modalStyles.saveSubmitText}>Guardar Acreditación</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL ELIMINACIÓN DE CERTIFICADO */}
      <Modal visible={deleteModalCert !== null} transparent animationType="fade" onRequestClose={() => setDeleteModalCert(null)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { padding: 24, borderRadius: 20, backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <AlertTriangle size={40} color="#ef4444" />
              <Text style={[modalStyles.title, { color: theme.text, marginTop: 8 }]}>
                {deleteModalCert?.scout_id === user?.id ? '¿Eliminar tu Acreditación?' : 'Eliminar Acreditación'}
              </Text>
              <Text style={{ fontSize: 13, color: theme.subText, textAlign: 'center', marginTop: 4 }}>
                {deleteModalCert?.scout_id === user?.id
                  ? `¿Estás seguro de que deseas eliminar "${deleteModalCert?.title}"? Se borrará de tus registros.`
                  : 'Se notificará al joven con el motivo que indiques a continuación.'}
              </Text>
            </View>

            {deleteModalCert?.scout_id !== user?.id && isScouter && (
              <>
                <Text style={[modalStyles.label, { color: theme.subText }]}>MOTIVO DE LA ELIMINACIÓN (OBLIGATORIO) *</Text>
                <TextInput
                  style={[modalStyles.input, { height: 80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Ej: El archivo adjunto no es legible / falta completar el nivel Plata"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  multiline
                  value={deleteReason}
                  onChangeText={setDeleteReason}
                />
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', alignItems: 'center' }}
                onPress={() => setDeleteModalCert(null)}
              >
                <Text style={{ color: theme.subText, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center' }}
                onPress={handleDeleteCertificate}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>
                  {deleteModalCert?.scout_id === user?.id ? 'Sí, Eliminar' : 'Confirmar Eliminación'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 13, marginTop: 2, lineHeight: 18, marginBottom: 14 },
  uploadBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  uploadBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  filterSection: { paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e2e8f0' },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: 'white', fontWeight: 'bold' },

  certCard: { borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, elevation: 2 },
  certCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  catBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  catBadgeText: { fontSize: 10, fontWeight: 'bold', color: colors.primary, backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  certTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  certArea: { fontSize: 12, marginTop: 4 },
  actionIconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 20 },
  imagePreviewWrapper: { marginTop: 14, borderRadius: 12, overflow: 'hidden', height: 160, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  zoomHintOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  zoomHintText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  emptyCard: { borderRadius: 16, padding: 36, alignItems: 'center', borderWidth: 1, marginTop: 20 },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center' }
});

const viewerStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  sheet: { borderRadius: 24, overflow: 'hidden', maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subTitle: { fontSize: 12, marginTop: 2 },
  fullImageWrapper: { width: '100%', height: 340, borderRadius: 16, overflow: 'hidden', marginVertical: 12 },
  fullImage: { width: '100%', height: '100%' },
  noImageCard: { height: 150, justifyContent: 'center', alignItems: 'center' },
  btnActionRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 20 },
  downloadBtn: { flex: 1, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  downloadBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
  deleteActionBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, justifyContent: 'center', alignItems: 'center' }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6, marginTop: 14 },
  input: { borderRadius: 12, borderWidth: 1, padding: 14, fontSize: 14 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chipBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  chipBtnText: { fontSize: 12 },
  quickSuggestBox: { marginTop: 8, padding: 10, borderRadius: 12, backgroundColor: 'rgba(107, 33, 168, 0.05)' },
  suggestLabel: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  itemPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  itemPillText: { fontSize: 11 },
  deviceFileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 12, borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4 },
  deviceFileBtnText: { fontSize: 13, fontWeight: 'bold' },
  previewBox: { marginTop: 10, borderRadius: 12, overflow: 'hidden' },
  previewText: { fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  previewImg: { width: '100%', height: 120, borderRadius: 8 },
  saveSubmitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, marginBottom: 30 },
  saveSubmitText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
