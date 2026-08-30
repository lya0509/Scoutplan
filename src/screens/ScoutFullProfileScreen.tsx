import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { dataService } from '../lib/dataService';
import { stagesData } from '../data/progressionTemplate';
import { UserScoutAvatar } from '../components/UserScoutAvatar';
import { DualProfileAvatar } from '../components/DualProfileAvatar';
import { StageBadgeIcon } from '../components/StageBadgeIcon';
import { certificateCategories, specialtyLevels } from '../data/specialtiesData';
import { colors } from '../theme/colors';
import { Trash2, AlertTriangle, Award, CheckCircle, Mail, MapPin, Shield, Download, X, Maximize2, ArrowLeft } from 'lucide-react-native';
import { showAlert } from '../utils/alert';
import { navigateBackOrHome } from '../utils/navigationHelper';

export default function ScoutFullProfileScreen({ route, navigation }: any) {
  const { scoutId } = route.params;
  const { isDarkMode, theme } = useTheme();
  const { user } = useAuth();

  const isScouterOrAdmin = user?.role === 'scouter' || user?.role === 'jefe_grupo' || (user?.role as any) === 'admin';

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [stages, setStages]   = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);

  // Modal para ver certificado a pantalla completa
  const [viewModalCert, setViewModalCert] = useState<any>(null);

  // Modal para eliminar certificado por Scouter
  const [deleteModalCert, setDeleteModalCert] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    loadFullScoutData();
  }, [scoutId]);

  const loadFullScoutData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Perfil
      const { data: profData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', scoutId)
        .single();

      setProfile(profData);

      // 2. Cargar Avance de Etapas
      const { data: stageRows } = await supabase
        .from('stage_progress')
        .select('stage_id, status')
        .eq('scout_id', scoutId);

      const statusMap: Record<string, string> = {};
      stageRows?.forEach(r => { statusMap[r.stage_id] = r.status; });

      let previousApproved = true;
      const enrichedStages = await Promise.all(stagesData.map(async (tmpl) => {
        let status: string;
        if (!previousApproved) {
          status = 'Bloqueada';
        } else {
          status = statusMap[tmpl.id] || 'En Progreso';
        }
        previousApproved = statusMap[tmpl.id] === 'Aprobada';

        // Calcular porcentaje
        let checkedCount = 0;
        for (const req of tmpl.requirements) {
          const isDone = await dataService.getRequirement(scoutId, tmpl.id, req.id);
          if (isDone) checkedCount++;
        }
        const pct = Math.round((checkedCount / tmpl.requirements.length) * 100);

        return {
          ...tmpl,
          status,
          pct
        };
      }));

      setStages(enrichedStages);

      // 3. Cargar Certificados / Acreditaciones
      const certs = await dataService.getCertificates(scoutId);
      setCertificates(certs);

    } catch (err) {
      console.error('Error cargando perfil de scout:', err);
    } finally {
      setLoading(false);
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

  const handleDeleteByScouter = async () => {
    if (!deleteModalCert || !deleteReason.trim()) {
      showAlert('Motivo Requerido', 'Debes ingresar una explicación para la eliminación.');
      return;
    }

    try {
      await dataService.deleteCertificate(
        deleteModalCert.id,
        scoutId,
        deleteModalCert.title,
        deleteReason
      );

      showAlert('Eliminado', 'Se ha eliminado la acreditación y notificado al scout.');
      setDeleteModalCert(null);
      setViewModalCert(null);
      setDeleteReason('');
      loadFullScoutData();
    } catch (err: any) {
      showAlert('Error', err?.message || 'No se pudo eliminar la acreditación.');
    }
  };

  const handleDeleteScoutPhoto = async (type: 'scout' | 'custom') => {
    try {
      await dataService.deleteProfilePhotoWithReason(scoutId, '', type);
      loadFullScoutData();
      showAlert('Foto Eliminada', `Se ha eliminado la ${type === 'custom' ? 'foto personal' : 'foto scout'} del perfil.`);
    } catch (err: any) {
      showAlert('Error', err?.message || 'No se pudo eliminar la foto.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: theme.subText, marginTop: 12 }}>Cargando perfil completo...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      {/* BARRA SUPERIOR DE NAVEGACIÓN (PC Y MÓVIL) */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: isDarkMode ? '#121214' : 'white',
        borderBottomWidth: 1,
        borderBottomColor: theme.border
      }}>
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
          onPress={() => navigateBackOrHome(navigation, user?.role)}
        >
          <ArrowLeft size={16} color={theme.text} />
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>Volver al Panel</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 14, fontWeight: 'bold', color: theme.text }}>
          {isScouterOrAdmin ? 'Ficha del Scout' : 'Perfil Scout'}
        </Text>
      </View>

      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* TARJETA SUPERIOR DE PERFIL DE SCOUT */}
        <View style={[styles.profileHeaderCard, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={styles.avatarRow}>
          <DualProfileAvatar
            scoutAvatarUrl={profile?.avatar_url}
            customAvatarUrl={profile?.custom_avatar_url}
            unit={profile?.unit}
            role="scout"
            size={80}
            editable={isScouterOrAdmin}
            onDeletePhoto={isScouterOrAdmin ? handleDeleteScoutPhoto : undefined}
          />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.scoutName, { color: theme.text }]}>{profile?.name || 'Scout'}</Text>
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>{profile?.unit?.toUpperCase() || 'UNIDAD'}</Text>
            </View>
            <Text style={[styles.scoutSub, { color: theme.subText }]}>{profile?.group_name || 'Grupo Scout'}</Text>
          </View>
        </View>

        <View style={[styles.infoDivider, { backgroundColor: theme.border }]} />

        <View style={styles.detailsGrid}>
          <View style={styles.infoRow}>
            <Mail size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {profile?.email || 'Sin correo registrado'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MapPin size={16} color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.infoText, { color: theme.text }]}>
              {profile?.region ? profile.region.toUpperCase() : 'REGIÓN MIRANDA'}
            </Text>
          </View>

          {profile?.birth_date ? (
            <View style={styles.infoRow}>
              <Shield size={16} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.infoText, { color: theme.text }]}>Nacimiento: {profile.birth_date}</Text>
            </View>
          ) : null}
        </View>

        {/* BOTONES DE DOCUMENTACIÓN OFICIAL DEL SCOUT (FICHA MÉDICA Y CURRÍCULUM) - SOLO PARA SCOUTERS / JEFATURA */}
        {isScouterOrAdmin && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.docBtn, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: colors.primary }]}
              onPress={() => navigation.navigate('FichaMedica', { targetUserId: scoutId })}
            >
              <Text style={{ fontSize: 18, marginRight: 6 }}>📋</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>Ficha Médica</Text>
                <Text style={{ fontSize: 10, color: theme.subText }}>Ver y Descargar Word</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.docBtn, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: colors.primary }]}
              onPress={() => navigation.navigate('CurriculumScout', { targetUserId: scoutId })}
            >
              <Text style={{ fontSize: 18, marginRight: 6 }}>📜</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary }}>Currículum Scout</Text>
                <Text style={{ fontSize: 10, color: theme.subText }}>Ver y Descargar Word</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* SECCIÓN 1: AVANCE EN LAS INSIGNIAS DE ETAPAS */}
      <View style={styles.sectionHeader}>
        <Award size={20} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Insignias y Adelanto Scout</Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {stages.map(st => (
          <View key={st.id} style={[styles.stageRowCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <StageBadgeIcon stageId={st.id} size={42} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.stageTitle, { color: theme.text }]}>{st.title}</Text>
                <Text style={[styles.stageStatusTag, st.status === 'Aprobada' ? styles.tagApproved : st.status === 'En Revision' ? styles.tagReview : styles.tagProgress]}>
                  {st.status}
                </Text>
              </View>

              <View style={styles.progressBox}>
                <View style={[styles.barBg, { backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0' }]}>
                  <View style={[styles.barFill, { width: `${st.pct}%` }]} />
                </View>
                <Text style={[styles.pctText, { color: colors.primary }]}>{st.pct}%</Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* SECCIÓN 2: DOCUMENTOS Y ACREDITACIONES SUBIDOS */}
      <View style={[styles.sectionHeader, { marginTop: 24 }]}>
        <CheckCircle size={20} color={colors.primary} style={{ marginRight: 8 }} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Certificados y Acreditaciones ({certificates.length})
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16 }}>
        {certificates.length === 0 ? (
          <View style={[styles.emptyCertCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            <Text style={{ color: theme.subText, fontStyle: 'italic' }}>El joven no ha subido acreditaciones aún.</Text>
          </View>
        ) : (
          certificates.map(cert => {
            const catObj = certificateCategories.find(c => c.id === cert.category);
            const levelObj = specialtyLevels.find(l => l.id === cert.level);

            return (
              <TouchableOpacity
                key={cert.id}
                style={[styles.certCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                onPress={() => setViewModalCert(cert)}
                activeOpacity={0.8}
              >
                <View style={styles.certCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.catBadge}>{catObj?.name || 'ACREDITACIÓN'}</Text>
                    <Text style={[styles.certTitleText, { color: theme.text }]}>{cert.title}</Text>
                    {levelObj && (
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold', marginTop: 2 }}>
                        Nivel: {levelObj.name}
                      </Text>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.actionIconBtn}
                      onPress={() => handleDownloadCertificate(cert)}
                    >
                      <Download size={18} color={colors.primary} />
                    </TouchableOpacity>

                    {isScouterOrAdmin && (
                      <TouchableOpacity
                        style={styles.actionIconBtn}
                        onPress={() => setDeleteModalCert(cert)}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {cert.file_url ? (
                  <View style={styles.certImgWrapper}>
                    <Image source={{ uri: cert.file_url }} style={styles.certImg} resizeMode="cover" />
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
      </View>

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

                <TouchableOpacity
                  style={viewerStyles.deleteActionBtn}
                  onPress={() => {
                    setDeleteModalCert(viewModalCert);
                  }}
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ELIMINACIÓN DE CERTIFICADO */}
      <Modal visible={deleteModalCert !== null} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <AlertTriangle size={40} color="#ef4444" />
              <Text style={[modalStyles.title, { color: theme.text, marginTop: 8 }]}>Rechazar / Eliminar Documento</Text>
              <Text style={{ fontSize: 13, color: theme.subText, textAlign: 'center', marginTop: 4 }}>
                Se enviará una notificación al joven explicando el motivo.
              </Text>
            </View>

            <Text style={[modalStyles.label, { color: theme.subText }]}>MOTIVO O EXPLICACIÓN (OBLIGATORIO) *</Text>
            <TextInput
              style={[modalStyles.input, { height: 80, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Ej: El archivo adjunto no es legible o falta la firma del sinodal"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              multiline
              value={deleteReason}
              onChangeText={setDeleteReason}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', alignItems: 'center' }}
                onPress={() => setDeleteModalCert(null)}
              >
                <Text style={{ color: theme.subText, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: '#ef4444', alignItems: 'center' }}
                onPress={handleDeleteByScouter}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeaderCard: { margin: 16, borderRadius: 20, padding: 20, borderWidth: 1, elevation: 3 },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  scoutName: { fontSize: 20, fontWeight: 'bold' },
  badgePill: { backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start', marginVertical: 4 },
  badgePillText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  scoutSub: { fontSize: 13 },
  infoDivider: { height: 1, marginVertical: 16 },
  detailsGrid: { marginTop: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 13 },
  docBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1 },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold' },

  stageRowCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  stageTitle: { fontSize: 15, fontWeight: 'bold' },
  stageStatusTag: { fontSize: 10, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  tagApproved: { backgroundColor: '#dcfce7', color: '#16a34a' },
  tagReview: { backgroundColor: '#fef3c7', color: '#d97706' },
  tagProgress: { backgroundColor: '#e0f2fe', color: '#0284c7' },
  progressBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  barBg: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  pctText: { fontSize: 12, fontWeight: 'bold' },

  certCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 12 },
  certCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  catBadge: { fontSize: 10, fontWeight: 'bold', color: colors.primary, backgroundColor: 'rgba(107, 33, 168, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  certTitleText: { fontSize: 15, fontWeight: 'bold' },
  actionIconBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 20 },
  certImgWrapper: { marginTop: 12, borderRadius: 12, overflow: 'hidden', height: 160, position: 'relative' },
  certImg: { width: '100%', height: '100%' },
  zoomHintOverlay: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  zoomHintText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  emptyCertCard: { padding: 20, borderRadius: 14, borderWidth: 1, alignItems: 'center' }
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  sheet: { borderRadius: 20, padding: 24 },
  title: { fontSize: 18, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 6 },
  input: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14 }
});
