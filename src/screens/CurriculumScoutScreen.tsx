import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  Platform
} from 'react-native';
import { Award, FileText, Download, User, Briefcase, GraduationCap, Compass, CheckCircle, Plus, Trash2, Camera, Shield, Save, AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { dataService } from '../lib/dataService';
import { storageService } from '../lib/storageService';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { exportDocxInBrowser } from '../utils/docxExporter';
import { navigateBackOrHome } from '../utils/navigationHelper';
import { pickImageUniversal } from '../utils/filePicker';

export default function CurriculumScoutScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  // Si se pasa targetUserId por params (Vista de Scouter / Jefe de Grupo)
  const targetUserId = route?.params?.targetUserId || user?.id;
  const isViewOnlyForScouter = targetUserId !== user?.id && (user?.role === 'scouter' || user?.role === 'jefe_grupo' || (user?.role as any) === 'admin');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingCerts, setSyncingCerts] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const savedStateRef = useRef<string>('');

  // FOTO DE PERFIL DEL SCOUT
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // 1. DATOS PERSONALES
  const [fullName, setFullName] = useState('');
  const [ci, setCi] = useState('');
  const [nationality, setNationality] = useState<'V' | 'E'>('V');
  const [civilStatus, setCivilStatus] = useState('Soltero(a)');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [address, setAddress] = useState('');
  const [phoneHome, setPhoneHome] = useState('');
  const [phoneCell, setPhoneCell] = useState('');
  const [religion, setReligion] = useState('');
  const [email, setEmail] = useState('');

  // ESTUDIA / TRABAJA TOGGLES
  const [isStudying, setIsStudying] = useState(true);
  const [studyInstitution, setStudyInstitution] = useState('');
  const [studyCourse, setStudyCourse] = useState('');

  const [isWorking, setIsWorking] = useState(false);
  const [workInstitution, setWorkInstitution] = useState('');
  const [workPosition, setWorkPosition] = useState('');
  const [occupation, setOccupation] = useState('Estudiante');

  const [sports, setSports] = useState('');
  const [canSwim, setCanSwim] = useState(true);
  const [hobbies, setHobbies] = useState('');
  const [skills, setSkills] = useState('');

  // 2. DATOS SCOUTS Y UNIDADES PERTENECIDAS
  const [joinDate, setJoinDate] = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [pastGroups, setPastGroups] = useState('Grupo Scout Orión #84');
  
  const [unitsBelonged, setUnitsBelonged] = useState({
    manada: true,
    tropa: true,
    caminante: true,
    clan: true
  });

  const [unitAdvancements, setUnitAdvancements] = useState({
    manada: '',
    tropa: '',
    caminante: '',
    clan: ''
  });

  // 3. CURSOS DE LIDERAZGO SCOUT
  const [pfBronce, setPfBronce] = useState({ date: '', director: '', certDate: '' });
  const [pfPlata, setPfPlata] = useState({ date: '', director: '', certDate: '' });
  const [pfOro, setPfOro] = useState({ date: '', director: '', certDate: '' });
  const [horquetaCert, setHorquetaCert] = useState({ date: '', director: '', certDate: '' });
  const [remoCert, setRemoCert] = useState({ date: '', director: '', certDate: '' });
  const [canoaCert, setCanoaCert] = useState({ date: '', director: '', certDate: '' });

  // 4. TABLAS DINÁMICAS (Talleres, Condecoraciones, Eventos, Programas Mundiales)
  const [workshopsList, setWorkshopsList] = useState<{ title: string; date: string; director: string }[]>([]);
  const [distinctionsList, setDistinctionsList] = useState<{ title: string; date: string }[]>([]);
  const [eventsList, setEventsList] = useState<{ title: string; role: string; date: string }[]>([]);
  const [worldProgramsList, setWorldProgramsList] = useState<{ title: string; role: string; date: string }[]>([
    { title: 'Tribu de la Tierra', role: 'Participante', date: '2026' }
  ]);

  useEffect(() => {
    loadCurriculumData();
  }, [targetUserId]);

  const getCurrentFormJSON = () => {
    return JSON.stringify({
      fullName, ci, nationality, civilStatus, birthDate, birthPlace, address,
      phoneHome, phoneCell, religion, email, isStudying, studyInstitution, studyCourse,
      isWorking, workInstitution, workPosition, occupation, sports, canSwim, hobbies, skills,
      joinDate, promiseDate, pastGroups, unitsBelonged, unitAdvancements,
      pfBronce, pfPlata, pfOro, horquetaCert, remoCert, canoaCert,
      workshopsList, distinctionsList, eventsList, worldProgramsList, photoUrl
    });
  };

  useEffect(() => {
    if (!loading && savedStateRef.current) {
      const current = getCurrentFormJSON();
      setHasChanges(current !== savedStateRef.current);
    }
  }, [
    fullName, ci, nationality, civilStatus, birthDate, birthPlace, address,
    phoneHome, phoneCell, religion, email, isStudying, studyInstitution, studyCourse,
    isWorking, workInstitution, workPosition, occupation, sports, canSwim, hobbies, skills,
    joinDate, promiseDate, pastGroups, unitsBelonged, unitAdvancements,
    pfBronce, pfPlata, pfOro, horquetaCert, remoCert, canoaCert,
    workshopsList, distinctionsList, eventsList, worldProgramsList, photoUrl
  ]);

  const loadCurriculumData = async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .single();

      if (prof) {
        setFullName(prof.name || '');
        setBirthDate(prof.birth_date || '');
        setPromiseDate(prof.promise_date || '');
        setJoinDate(prof.join_date || '');
        setPhoneCell(prof.phone || '');
        setEmail(prof.email || '');

        const localStr = (typeof window !== 'undefined' && window.localStorage) ? window.localStorage.getItem(`curriculum_data_${targetUserId}`) : null;
        const localData = localStr ? JSON.parse(localStr) : null;
        const c = prof.curriculum_data || localData;

        // Cargar foto de perfil priorizando avatar_url o photoUrl guardada
        const effectivePhoto = (c && c.photoUrl) ? c.photoUrl : (prof.avatar_url || null);
        if (effectivePhoto) setPhotoUrl(effectivePhoto);

        if (c) {
          setCi(c.ci || '');
          setNationality(c.nationality || 'V');
          setCivilStatus(c.civilStatus || 'Soltero(a)');
          setBirthPlace(c.birthPlace || '');
          setAddress(c.address || '');
          setPhoneHome(c.phoneHome || '');
          setReligion(c.religion || '');
          setIsStudying(c.isStudying !== undefined ? c.isStudying : true);
          setStudyInstitution(c.studyInstitution || '');
          setStudyCourse(c.studyCourse || '');
          setIsWorking(c.isWorking !== undefined ? c.isWorking : false);
          setWorkInstitution(c.workInstitution || '');
          setWorkPosition(c.workPosition || '');
          setOccupation(c.occupation || (c.isWorking ? 'Empleado(a)' : 'Estudiante'));
          setSports(c.sports || '');
          setCanSwim(c.canSwim !== undefined ? c.canSwim : true);
          setHobbies(c.hobbies || '');
          setSkills(c.skills || '');
          if (c.unitsBelonged) setUnitsBelonged(c.unitsBelonged);
          if (c.unitAdvancements) setUnitAdvancements(c.unitAdvancements);
          if (c.pfBronce) setPfBronce(c.pfBronce);
          if (c.pfPlata) setPfPlata(c.pfPlata);
          if (c.pfOro) setPfOro(c.pfOro);
          if (c.horquetaCert) setHorquetaCert(c.horquetaCert);
          if (c.remoCert) setRemoCert(c.remoCert);
          if (c.canoaCert) setCanoaCert(c.canoaCert);
          if (c.workshopsList) setWorkshopsList(c.workshopsList);
          if (c.distinctionsList) setDistinctionsList(c.distinctionsList);
          if (c.eventsList) setEventsList(c.eventsList);
          if (c.worldProgramsList) setWorldProgramsList(c.worldProgramsList);
        }
      }
    } catch (err) {
      console.error('Error cargando currículum scout:', err);
    } finally {
      setLoading(false);
      setTimeout(() => {
        savedStateRef.current = getCurrentFormJSON();
        setHasChanges(false);
      }, 200);
    }
  };

  const handlePickPhoto = () => {
    if (isViewOnlyForScouter) return;
    pickImageUniversal(async (dataUrl) => {
      setPhotoUrl(dataUrl);

      try {
        // 1. Subida inmediata a Supabase Storage CDN
        const uploadedUrl = await storageService.uploadImage(
          'scout-files',
          'avatars',
          `avatar_${user?.id || 'guest'}.png`,
          dataUrl
        );

        const finalPhotoUrl = uploadedUrl || dataUrl;
        setPhotoUrl(finalPhotoUrl);

        if (user?.id) {
          // 2. Actualizar avatar_url en Supabase
          await supabase
            .from('profiles')
            .update({ avatar_url: finalPhotoUrl })
            .eq('id', user.id);

          // 3. Actualizar curriculum_data en localStorage y Supabase
          const localKey = `curriculum_data_${user.id}`;
          const existingStr = typeof window !== 'undefined' ? window.localStorage?.getItem(localKey) : null;
          const existingObj = existingStr ? JSON.parse(existingStr) : {};
          existingObj.photoUrl = finalPhotoUrl;
          if (typeof window !== 'undefined') {
            window.localStorage?.setItem(localKey, JSON.stringify(existingObj));
          }

          await supabase
            .from('profiles')
            .update({ curriculum_data: existingObj })
            .eq('id', user.id);
        }
      } catch (err) {
        console.error('Error auto-guardando foto:', err);
      }

      showAlert('¡Foto Guardada!', 'Tu foto de perfil se ha guardado exitosamente y se estampará en el documento Word.');
    });
  };

  const handleSyncCertificates = async () => {
    if (!targetUserId) return;
    setSyncingCerts(true);
    try {
      const res = await dataService.syncAllCertificatesToCurriculum(targetUserId);
      if (res.curriculum) {
        showAlert(
          '¡Certificados Sincronizados!',
          `Se han importado exitosamente ${res.count} acreditaciones (Cursos de Liderazgo, Programas Mundiales, Especialidades y Talleres) a tu Currículum Scout con sus respectivas fechas.`
        );
        loadCurriculumData();
      } else {
        showAlert('Información', 'No se encontraron certificados pendientes para importar.');
      }
    } catch (e: any) {
      showAlert('Aviso', 'Error al sincronizar certificados: ' + e?.message);
    } finally {
      setSyncingCerts(false);
    }
  };

  const handleSaveCurriculum = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let uploadedPhotoUrl = photoUrl;
      if (photoUrl && photoUrl.startsWith('data:image')) {
        uploadedPhotoUrl = await storageService.uploadImage(
          'scout-files',
          'avatars',
          `avatar_${user.id}.png`,
          photoUrl
        );
        setPhotoUrl(uploadedPhotoUrl);
      }

      const payload = {
        photoUrl: uploadedPhotoUrl,
        ci,
        nationality,
        civilStatus,
        birthPlace,
        address,
        phoneHome,
        religion,
        isStudying,
        studyInstitution: isStudying ? studyInstitution : '',
        studyCourse: isStudying ? studyCourse : '',
        isWorking,
        workInstitution: isWorking ? workInstitution : '',
        workPosition: isWorking ? workPosition : '',
        occupation: isWorking ? (workPosition || 'Empleado(a)') : 'Estudiante',
        sports,
        canSwim,
        hobbies,
        skills,
        unitsBelonged,
        unitAdvancements,
        pfBronce,
        pfPlata,
        pfOro,
        horquetaCert,
        remoCert,
        canoaCert,
        workshopsList,
        distinctionsList,
        eventsList,
        worldProgramsList
      };

      const updateData: any = { curriculum_data: payload };
      if (uploadedPhotoUrl) {
        updateData.avatar_url = uploadedPhotoUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`curriculum_data_${user.id}`, JSON.stringify(payload));
      }

      savedStateRef.current = getCurrentFormJSON();
      setHasChanges(false);

      showAlert('¡Currículum Guardado!', 'Se han guardado todos los datos de tu Currículum Scout Joven.');
    } catch (err: any) {
      showAlert('¡Guardado Completado!', 'Datos del currículum guardados localmente en tu dispositivo.');
    } finally {
      setSaving(false);
    }
  };

  // EXPORTAR CURRÍCULUM SCOUT AUTO-RELLENADO EN FORMATO OFICIAL WORD (.DOCX)
  const handleExportCurriculumDoc = async () => {
    try {
      const replacements: Record<string, string> = {
        '{{NAME}}': fullName || '',
        '{{CI}}': ci ? `${nationality}-${ci}` : '',
        '{{NAT_V}}': nationality === 'V' ? '[X]' : '[ ]',
        '{{NAT_E}}': nationality === 'E' ? '[X]' : '[ ]',
        '{{CIVIL_STATUS}}': civilStatus || '',
        '{{BIRTH_DATE}}': birthDate || '',
        '{{BIRTH_PLACE}}': birthPlace || '',
        '{{ADDRESS}}': address || '',
        '{{PHONE_HOME}}': phoneHome || '',
        '{{PHONE_CELL}}': phoneCell || '',
        '{{RELIGION}}': religion || '',
        '{{EMAIL}}': email || '',
        '{{OCCUPATION}}': isWorking ? (workPosition || 'Empleado(a)') : 'Estudiante',
        '{{STUDY_INST}}': isStudying ? studyInstitution : '',
        '{{STUDY_COURSE}}': isStudying ? studyCourse : '',
        '{{WORK_INST}}': isWorking ? workInstitution : '',
        '{{WORK_POS}}': isWorking ? workPosition : '',
        '{{SPORTS}}': sports || '',
        '{{CAN_SWIM}}': canSwim ? 'Si' : 'No',
        '{{HOBBIES}}': hobbies || '',
        '{{SKILLS}}': skills || '',
        '{{JOIN_DATE}}': joinDate || '',
        '{{PROMISE_DATE}}': promiseDate || '',
        '{{CURRENT_UNIT}}': (user?.unit || 'CLAN').toUpperCase(),
        '{{PAST_GROUPS}}': pastGroups || '',

        // Perteneció a Unidad Checkboxes
        '{{MANADA_CHECK}}': unitsBelonged.manada ? '[X]' : '[ ]',
        '{{TROPA_CHECK}}': unitsBelonged.tropa ? '[X]' : '[ ]',
        '{{CAMINANTE_CHECK}}': unitsBelonged.caminante ? '[X]' : '[ ]',
        '{{CLAN_CHECK}}': unitsBelonged.clan ? '[X]' : '[ ]',

        // Adelantos Obtenidos
        '{{MANADA_ADVANCEMENT}}': unitAdvancements.manada || '',
        '{{TROPA_ADVANCEMENT}}': unitAdvancements.tropa || '',
        '{{CAMINANTE_ADVANCEMENT}}': unitAdvancements.caminante || '',
        '{{CLAN_ADVANCEMENT}}': unitAdvancements.clan || '',

        // Cursos Realizados
        '{{PF_BRONCE_DATE}}': pfBronce.date || '',
        '{{PF_BRONCE_DIR}}': pfBronce.director || '',
        '{{PF_BRONCE_CERT}}': pfBronce.certDate || '',

        '{{PF_PLATA_DATE}}': pfPlata.date || '',
        '{{PF_PLATA_DIR}}': pfPlata.director || '',
        '{{PF_PLATA_CERT}}': pfPlata.certDate || '',

        '{{PF_ORO_DATE}}': pfOro.date || '',
        '{{PF_ORO_DIR}}': pfOro.director || '',
        '{{PF_ORO_CERT}}': pfOro.certDate || '',

        '{{HORQUETA_DATE}}': horquetaCert.date || '',
        '{{HORQUETA_DIR}}': horquetaCert.director || '',
        '{{HORQUETA_CERT}}': horquetaCert.certDate || '',

        '{{REMO_DATE}}': remoCert.date || '',
        '{{REMO_DIR}}': remoCert.director || '',
        '{{REMO_CERT}}': remoCert.certDate || '',

        '{{CANOA_DATE}}': canoaCert.date || '',
        '{{CANOA_DIR}}': canoaCert.director || '',
        '{{CANOA_CERT}}': canoaCert.certDate || '',
      };

      // Rellenar Talleres o Cursos Realizados (hasta 5)
      for (let i = 1; i <= 5; i++) {
        const item = workshopsList[i - 1];
        replacements[`{{WORKSHOP_NAME_${i}}}`] = item?.title || '';
        replacements[`{{WORKSHOP_DATE_${i}}}`] = item?.date || '';
        replacements[`{{WORKSHOP_DIR_${i}}}`] = item?.director || '';
      }

      // Rellenar Condecoraciones y Distinciones (hasta 6)
      for (let i = 1; i <= 6; i++) {
        const item = distinctionsList[i - 1];
        replacements[`{{DISTINCTION_NAME_${i}}}`] = item?.title || '';
        replacements[`{{DISTINCTION_DATE_${i}}}`] = item?.date || '';
      }

      // Rellenar Eventos y Actividades Participadas (hasta 6)
      for (let i = 1; i <= 6; i++) {
        const item = eventsList[i - 1];
        replacements[`{{EVENT_NAME_${i}}}`] = item?.title || '';
        replacements[`{{EVENT_ROLE_${i}}}`] = item?.role || '';
        replacements[`{{EVENT_DATE_${i}}}`] = item?.date || '';
      }

      // Rellenar Proyectos y Programas Mundiales (hasta 8)
      for (let i = 1; i <= 8; i++) {
        const item = worldProgramsList[i - 1];
        replacements[`{{PROGRAM_NAME_${i}}}`] = item?.title || '';
        replacements[`{{PROGRAM_ROLE_${i}}}`] = item?.role || '';
        replacements[`{{PROGRAM_DATE_${i}}}`] = item?.date || '';
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const response = await fetch('/Curriculum_Scout_Template.docx');
        if (!response.ok) {
          throw new Error('No se pudo cargar la plantilla Word del Currículum.');
        }
        const arrayBuffer = await response.arrayBuffer();
        await exportDocxInBrowser(arrayBuffer, replacements, `CURRICULUM_SCOUT_${fullName.replace(/\s+/g, '_')}.docx`, { photoUrl });
        showAlert('¡Currículum Exportado!', 'Se ha descargado tu Currículum Scout Joven en formato Word (.docx).');
      } else {
        showAlert('Descargar Currículum', 'Documento autocompletado en formato Word.');
      }
    } catch (err: any) {
      console.error('Error exportando Currículum:', err);
      showAlert('Error', err?.message || 'No se pudo generar el documento Word.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
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
          {isViewOnlyForScouter && (
            <View style={styles.scouterBadge}>
              <Shield size={12} color="white" style={{ marginRight: 4 }} />
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>Modo Scouter</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.asociacionBanner}>ASOCIACIÓN DE SCOUTS DE VENEZUELA</Text>
            <Text style={[styles.title, { color: theme.text }]}>Currículum Scout Joven</Text>
          </View>
        </View>

        {hasChanges && !isViewOnlyForScouter && (
          <View style={styles.changesBanner}>
            <AlertCircle size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#f59e0b', flex: 1 }}>
              Has realizado cambios en tu Currículum. Recuerda guardar los cambios.
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : (
          <View style={[styles.sheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            
            {/* SUBIDA DE FOTO DE PERFIL */}
            <View style={styles.photoUploadCard}>
              <View style={styles.photoBox}>
                {photoUrl ? (
                  <Image source={{ uri: photoUrl }} style={styles.photoImg} />
                ) : (
                  <User size={32} color="#a1a1aa" />
                )}
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 13, color: theme.text }}>FOTO DE LA PERSONA</Text>
                <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                  Se estampará en el recuadro superior derecho del documento Word.
                </Text>
                {!isViewOnlyForScouter && (
                  <TouchableOpacity style={styles.uploadPhotoBtn} onPress={handlePickPhoto}>
                    <Camera size={12} color="white" style={{ marginRight: 4 }} />
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>Cargar Foto</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* BOTÓN INTELIGENTE DE SINCRONIZACIÓN DE CERTIFICADOS */}
            {!isViewOnlyForScouter && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isDarkMode ? '#1e1b4b' : '#f5f3ff', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#8b5cf6', marginVertical: 14 }}
                onPress={handleSyncCertificates}
                disabled={syncingCerts}
                activeOpacity={0.8}
              >
                <Award size={22} color="#8b5cf6" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>
                    📥 Sincronizar desde mis Certificados Subidos
                  </Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#a78bfa' : '#7c3aed', marginTop: 2 }}>
                    Importa de 1 clic tus Cursos (Horqueta, Remo, Canoa), Programas Mundiales (Tribu de la Tierra, Scout Solar, Enseñas) y Especialidades con sus fechas.
                  </Text>
                </View>
                {syncingCerts ? (
                  <ActivityIndicator size="small" color="#8b5cf6" style={{ marginLeft: 8 }} />
                ) : (
                  <View style={{ backgroundColor: '#8b5cf6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginLeft: 8 }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>Sincronizar</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 4 }]}>1. Datos Personales</Text>

            <Text style={[styles.label, { color: theme.subText }]}>APELLIDOS Y NOMBRES COMPLETOS</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              value={fullName}
              onChangeText={setFullName}
              editable={!isViewOnlyForScouter}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>CÉDULA DE IDENTIDAD</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Ej: 31.902.000"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={ci}
                  onChangeText={setCi}
                  editable={!isViewOnlyForScouter}
                />
              </View>

              <View style={{ width: 110 }}>
                <Text style={[styles.label, { color: theme.subText }]}>NACIONALIDAD</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity
                    style={[styles.natChip, nationality === 'V' && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setNationality('V')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: nationality === 'V' ? 'white' : theme.text }}>V</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.natChip, nationality === 'E' && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setNationality('E')}
                  >
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: nationality === 'E' ? 'white' : theme.text }}>E</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>ESTADO CIVIL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  value={civilStatus}
                  onChangeText={setCivilStatus}
                  editable={!isViewOnlyForScouter}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>FECHA DE NACIMIENTO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={birthDate}
                  onChangeText={setBirthDate}
                  editable={!isViewOnlyForScouter}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>LUGAR DE NACIMIENTO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Ej: Caracas, Miranda"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={birthPlace}
                  onChangeText={setBirthPlace}
                  editable={!isViewOnlyForScouter}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: theme.subText, marginTop: 8 }]}>DIRECCIÓN DE HABITACIÓN</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Municipio, Parroquia..."
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={address}
              onChangeText={setAddress}
              editable={!isViewOnlyForScouter}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>TELÉFONO FIJO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0212..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={phoneHome}
                  onChangeText={setPhoneHome}
                  editable={!isViewOnlyForScouter}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>TELÉFONO CELULAR</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0412..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={phoneCell}
                  onChangeText={setPhoneCell}
                  editable={!isViewOnlyForScouter}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>RELIGIÓN</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Ej: Católica"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={religion}
                  onChangeText={setReligion}
                  editable={!isViewOnlyForScouter}
                />
              </View>
            </View>

            {/* CHECK: ¿ESTUDIA? */}
            <View style={{ marginTop: 12, backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>¿ACTUALMENTE ESTUDIA?</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.checkBtn, isStudying && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setIsStudying(true)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: isStudying ? 'white' : theme.text }}>SÍ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.checkBtn, !isStudying && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setIsStudying(false)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: !isStudying ? 'white' : theme.text }}>NO</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isStudying && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.subText }]}>INSTITUCIÓN DONDE ESTUDIA</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="Ej: UCV, Colegio..."
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={studyInstitution}
                      onChangeText={setStudyInstitution}
                      editable={!isViewOnlyForScouter}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.subText }]}>CURSO / CARRERA</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="Ej: Ingeniería, 5to Año"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={studyCourse}
                      onChangeText={setStudyCourse}
                      editable={!isViewOnlyForScouter}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* CHECK: ¿TRABAJA? */}
            <View style={{ marginTop: 10, backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>¿ACTUALMENTE TRABAJA?</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.checkBtn, isWorking && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setIsWorking(true)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: isWorking ? 'white' : theme.text }}>SÍ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.checkBtn, !isWorking && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setIsWorking(false)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: !isWorking ? 'white' : theme.text }}>NO</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {isWorking && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.subText }]}>LUGAR DONDE TRABAJA</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="Empresa / Institución"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={workInstitution}
                      onChangeText={setWorkInstitution}
                      editable={!isViewOnlyForScouter}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: theme.subText }]}>CARGO</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="Ej: Asistente, Diseñador"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={workPosition}
                      onChangeText={setWorkPosition}
                      editable={!isViewOnlyForScouter}
                    />
                  </View>
                </View>
              )}
            </View>

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>PRACTICA ALGÚN DEPORTE</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Fútbol, Natación..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={sports}
                  onChangeText={setSports}
                  editable={!isViewOnlyForScouter}
                />
              </View>

              <View style={{ width: 120 }}>
                <Text style={[styles.label, { color: theme.subText }]}>SABE NADAR</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity
                    style={[styles.swimChip, canSwim && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setCanSwim(true)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: canSwim ? 'white' : theme.text }}>SÍ</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.swimChip, !canSwim && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setCanSwim(false)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: !canSwim ? 'white' : theme.text }}>NO</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* SECCIONES SEPARADAS: HOBBIES Y HABILIDADES */}
            <Text style={[styles.label, { color: theme.subText, marginTop: 10 }]}>HOBBIES O AFICIONES</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Lectura, Música, Acampar, Senderismo..."
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={hobbies}
              onChangeText={setHobbies}
              editable={!isViewOnlyForScouter}
            />

            <Text style={[styles.label, { color: theme.subText, marginTop: 8 }]}>COMPETENCIAS O HABILIDADES</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Liderazgo, Primeros Auxilios, Pionerismo, Idiomas..."
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={skills}
              onChangeText={setSkills}
              editable={!isViewOnlyForScouter}
            />

            {/* SECCIÓN 2: DATOS SCOUTS Y TRAYECTORIA POR UNIDAD */}
            <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>2. Datos Scouts y Unidades Pertenecidas</Text>

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>INGRESO AL MOVIMIENTO</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={joinDate}
                  onChangeText={setJoinDate}
                  editable={!isViewOnlyForScouter}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>FECHA DE PROMESA</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="DD/MM/AAAA"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={promiseDate}
                  onChangeText={setPromiseDate}
                  editable={!isViewOnlyForScouter}
                />
              </View>
            </View>

            <Text style={[styles.label, { color: theme.subText, marginTop: 10 }]}>UNIDADES A LAS QUE PERTENECIÓ Y ADELANTOS OBTENIDOS</Text>
            <View style={{ gap: 8, marginTop: 4 }}>
              {[
                { key: 'manada', title: 'Manada', placeholder: 'Ej. Lobo saltarín' },
                { key: 'tropa', title: 'Tropa', placeholder: 'Ej. Explorador' },
                { key: 'caminante', title: 'Caminante', placeholder: 'Ej. Caminadores' },
                { key: 'clan', title: 'Clan', placeholder: 'Ej. Descubridor' }
              ].map(u => {
                const isChecked = (unitsBelonged as any)[u.key];
                return (
                  <View key={u.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TouchableOpacity
                      style={[styles.unitCheckChip, isChecked && { backgroundColor: colors.primary }]}
                      onPress={() => !isViewOnlyForScouter && setUnitsBelonged(prev => ({ ...prev, [u.key]: !(prev as any)[u.key] }))}
                    >
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: isChecked ? 'white' : theme.text }}>
                        {isChecked ? '✓ ' : ' '}{u.title}
                      </Text>
                    </TouchableOpacity>
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                      placeholder={u.placeholder}
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={(unitAdvancements as any)[u.key]}
                      onChangeText={val => setUnitAdvancements(prev => ({ ...prev, [u.key]: val }))}
                      editable={!isViewOnlyForScouter}
                    />
                  </View>
                );
              })}
            </View>

            {/* SECCIÓN 3: CURSOS */}
            <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>3. Cursos</Text>

            {[
              { label: 'Punta de Flecha en Bronce', state: pfBronce, setter: setPfBronce },
              { label: 'Punta de Flecha en Plata', state: pfPlata, setter: setPfPlata },
              { label: 'Punta de Flecha en Oro', state: pfOro, setter: setPfOro },
              { label: 'Horqueta', state: horquetaCert, setter: setHorquetaCert },
              { label: 'Remo', state: remoCert, setter: setRemoCert },
              { label: 'Canoa', state: canoaCert, setter: setCanoaCert }
            ].map((c, idx) => (
              <View key={idx} style={{ backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.primary, marginBottom: 6 }}>{c.label}</Text>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.subText, marginBottom: 2 }}>F. Realización</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                        value={c.state.date}
                        onChangeText={v => c.setter(prev => ({ ...prev, date: v }))}
                        editable={!isViewOnlyForScouter}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.subText, marginBottom: 2 }}>F. Certificación</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                        placeholder="DD/MM/AAAA"
                        placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                        value={c.state.certDate}
                        onChangeText={v => c.setter(prev => ({ ...prev, certDate: v }))}
                        editable={!isViewOnlyForScouter}
                      />
                    </View>
                  </View>
                  <View style={{ minWidth: 0 }}>
                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: theme.subText, marginBottom: 2 }}>Director del Curso</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                      placeholder="Nombre del Director"
                      placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                      value={c.state.director}
                      onChangeText={v => c.setter(prev => ({ ...prev, director: v }))}
                      editable={!isViewOnlyForScouter}
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* SECCIÓN 4: TALLERES O CURSOS REALIZADOS */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0 }]}>4. Talleres o Cursos Realizados</Text>
              {!isViewOnlyForScouter && (
                <TouchableOpacity
                  style={styles.addMiniBtn}
                  onPress={() => setWorkshopsList(prev => [...prev, { title: '', date: '', director: '' }])}
                >
                  <Plus size={12} color="white" />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10, marginLeft: 2 }}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>

            {workshopsList.map((w, idx) => (
              <View key={idx} style={{ backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: theme.border, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Nombre del Taller (Ej: A Salvo del Peligro)"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={w.title}
                    onChangeText={v => setWorkshopsList(prev => prev.map((item, i) => i === idx ? { ...item, title: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                  {!isViewOnlyForScouter && (
                    <TouchableOpacity onPress={() => setWorkshopsList(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Fecha"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={w.date}
                    onChangeText={v => setWorkshopsList(prev => prev.map((item, i) => i === idx ? { ...item, date: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Director"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={w.director}
                    onChangeText={v => setWorkshopsList(prev => prev.map((item, i) => i === idx ? { ...item, director: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                </View>
              </View>
            ))}

            {/* SECCIÓN 5: CONDECORACIONES Y DISTINCIONES */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0 }]}>5. Condecoraciones y Distinciones</Text>
              {!isViewOnlyForScouter && (
                <TouchableOpacity
                  style={styles.addMiniBtn}
                  onPress={() => setDistinctionsList(prev => [...prev, { title: '', date: '' }])}
                >
                  <Plus size={12} color="white" />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10, marginLeft: 2 }}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>

            {distinctionsList.map((d, idx) => (
              <View key={idx} style={{ flexDirection: 'row', gap: 6, marginTop: 6, alignItems: 'center' }}>
                <TextInput
                  style={[styles.input, { flex: 3, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Nombre de la Condecoración"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={d.title}
                  onChangeText={v => setDistinctionsList(prev => prev.map((item, i) => i === idx ? { ...item, title: v } : item))}
                  editable={!isViewOnlyForScouter}
                />
                <TextInput
                  style={[styles.input, { flex: 1.5, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Fecha"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={d.date}
                  onChangeText={v => setDistinctionsList(prev => prev.map((item, i) => i === idx ? { ...item, date: v } : item))}
                  editable={!isViewOnlyForScouter}
                />
                {!isViewOnlyForScouter && (
                  <TouchableOpacity onPress={() => setDistinctionsList(prev => prev.filter((_, i) => i !== idx))}>
                    <Trash2 size={18} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* SECCIÓN 6: EVENTOS Y ACTIVIDADES PARTICIPADAS */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0 }]}>6. Eventos y Actividades Participadas</Text>
              {!isViewOnlyForScouter && (
                <TouchableOpacity
                  style={styles.addMiniBtn}
                  onPress={() => setEventsList(prev => [...prev, { title: '', role: '', date: '' }])}
                >
                  <Plus size={12} color="white" />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10, marginLeft: 2 }}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>

            {eventsList.map((e, idx) => (
              <View key={idx} style={{ backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: theme.border, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Nombre del Evento (Ej: Moot, Jamboree)"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={e.title}
                    onChangeText={v => setEventsList(prev => prev.map((item, i) => i === idx ? { ...item, title: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                  {!isViewOnlyForScouter && (
                    <TouchableOpacity onPress={() => setEventsList(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Cargo (Ej: Participante)"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={e.role}
                    onChangeText={v => setEventsList(prev => prev.map((item, i) => i === idx ? { ...item, role: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Fecha"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={e.date}
                    onChangeText={v => setEventsList(prev => prev.map((item, i) => i === idx ? { ...item, date: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                </View>
              </View>
            ))}

            {/* SECCIÓN 7: PROYECTOS Y PROGRAMAS MUNDIALES */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <Text style={[styles.sectionTitle, { color: colors.primary, marginBottom: 0 }]}>7. Programas Mundiales y Proyectos</Text>
              {!isViewOnlyForScouter && (
                <TouchableOpacity
                  style={styles.addMiniBtn}
                  onPress={() => setWorldProgramsList(prev => [...prev, { title: '', role: '', date: '' }])}
                >
                  <Plus size={12} color="white" />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10, marginLeft: 2 }}>Agregar</Text>
                </TouchableOpacity>
              )}
            </View>

            {worldProgramsList.map((wp, idx) => (
              <View key={idx} style={{ backgroundColor: theme.inputBg, padding: 10, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: theme.border, gap: 6, overflow: 'hidden' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Nombre del Programa (Ej: Tribu de la Tierra)"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={wp.title}
                    onChangeText={v => setWorldProgramsList(prev => prev.map((item, i) => i === idx ? { ...item, title: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                  {!isViewOnlyForScouter && (
                    <TouchableOpacity onPress={() => setWorldProgramsList(prev => prev.filter((_, i) => i !== idx))}>
                      <Trash2 size={18} color="#ef4444" />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <TextInput
                    style={[styles.input, { flex: 3, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Cargo (Ej: Participante)"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={wp.role}
                    onChangeText={v => setWorldProgramsList(prev => prev.map((item, i) => i === idx ? { ...item, role: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1.5, backgroundColor: theme.cardBg, color: theme.text, borderColor: theme.border }]}
                    placeholder="Fecha"
                    placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                    value={wp.date}
                    onChangeText={v => setWorldProgramsList(prev => prev.map((item, i) => i === idx ? { ...item, date: v } : item))}
                    editable={!isViewOnlyForScouter}
                  />
                </View>
              </View>
            ))}

            {/* BOTONES INFERIORES: GUARDAR Y EXPORTAR EN LA PARTE DE ABAJO */}
            <View style={{ marginTop: 24, gap: 10 }}>
              {!isViewOnlyForScouter && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveCurriculum} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Save size={16} color="white" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Guardar Datos del Currículum</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.bottomExportBtn} onPress={handleExportCurriculumDoc}>
                <Download size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.bottomExportBtnText}>Descargar Currículum Oficial (.docx)</Text>
              </TouchableOpacity>
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  asociacionBanner: { fontSize: 12, fontWeight: '900', color: colors.primary, letterSpacing: 0.5 },
  title: { fontSize: 17, fontWeight: 'bold', marginTop: 2 },
  scouterBadge: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  exportHeaderBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  exportHeaderBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  changesBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: 8, borderRadius: 8, marginTop: 8 },

  sheet: { borderRadius: 18, padding: 18, borderWidth: 1 },
  photoUploadCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.08)', padding: 12, borderRadius: 14, marginBottom: 10 },
  photoBox: { width: 64, height: 72, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  photoImg: { width: '100%', height: '100%' },
  uploadPhotoBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 6, alignSelf: 'flex-start' },

  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 8, fontSize: 12 },
  natChip: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  checkBtn: { width: 44, height: 28, borderRadius: 6, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  swimChip: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  unitCheckChip: { width: 90, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  addMiniBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  bottomExportBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomExportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
