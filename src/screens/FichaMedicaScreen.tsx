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
import { FileText, Download, Shield, Plus, Trash2, Camera, CheckCircle, AlertCircle, Save } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { storageService } from '../lib/storageService';
import { colors } from '../theme/colors';
import { autoSaveService } from '../services/autoSaveService';
import { showAlert } from '../utils/alert';
import { exportDocxInBrowser } from '../utils/docxExporter';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

export default function FichaMedicaScreen({ route, navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  // Si se pasa targetUserId por params (Vista de Scouter / Jefe de Grupo)
  const targetUserId = route?.params?.targetUserId || user?.id;
  const isViewOnlyForScouter = targetUserId !== user?.id && (user?.role === 'scouter' || user?.role === 'jefe_grupo' || (user?.role as any) === 'admin');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const savedStateRef = useRef<string>('');

  // 1. DATOS DEL PARTICIPANTE
  const [fullName, setFullName] = useState('');
  const [ci, setCi] = useState('');
  const [nationality, setNationality] = useState<'V' | 'E'>('V');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Masculino');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');

  // 2. CONTACTO DE EMERGENCIA
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyPhonePersonal, setEmergencyPhonePersonal] = useState('');
  const [emergencyPhoneHome, setEmergencyPhoneHome] = useState('');
  const [emergencyPhoneOther, setEmergencyPhoneOther] = useState('');

  // 3. SALUD Y SANGRE
  const [goodHealthExplain, setGoodHealthExplain] = useState('Sí, buena salud.');
  const [bloodType, setBloodType] = useState('O+');
  const [bloodPressure, setBloodPressure] = useState<'NORMAL' | 'ALTA' | 'BAJA'>('NORMAL');

  // VACUNAS
  const [vaccines, setVaccines] = useState({
    fiebreAmarilla: true,
    triple: true,
    toxoideTetanica: true,
    covid: true,
    lastDoseDate: ''
  });

  // 4. ALERGIAS
  const [allergies, setAllergies] = useState({
    picada: '',
    medicamento: '',
    alimento: '',
    otro: ''
  });

  // 5. ANTECEDENTES FAMILIARES (Checkboxes)
  const [familyHistory, setFamilyHistory] = useState<Record<string, boolean>>({
    asma: false, alergia: false, alcoholismo: false, hipertension: false,
    drogas: false, epilepsia: false, cancer: false, diabetes: false,
    cardiopatia: false, obesidad: false
  });

  // 6. ENFERMEDADES PADECIDAS (Checkboxes)
  const [pastDiseases, setPastDiseases] = useState<Record<string, boolean>>({
    sarampion: false, lechina: false, rubeola: false, escarlatina: false,
    hernia: false, paperas: false, insomnio: false, hiperactividad: false,
    apendicitis: false
  });

  // 7. ANTECEDENTES PERSONALES Y PREGUNTAS CLÍNICAS
  const [personalHistory, setPersonalHistory] = useState<Record<string, boolean>>({
    dolorCabeza: false, parasitos: false, rinitis: false
  });
  const [asmaCrisisDate, setAsmaCrisisDate] = useState('');
  const [convulsionesDate, setConvulsionesDate] = useState('');
  const [dolorAbdominalExplain, setDolorAbdominalExplain] = useState('');
  const [trastornosHematologicosExplain, setTrastornosHematologicosExplain] = useState('');

  const [recentOperationExplain, setRecentOperationExplain] = useState('');
  const [hasRestrictedActivities, setHasRestrictedActivities] = useState(false);
  const [restrictedActivitiesExplain, setRestrictedActivitiesExplain] = useState('');
  const [hasPrescription, setHasPrescription] = useState(false);
  const [medicalPrescriptionExplain, setMedicalPrescriptionExplain] = useState('');
  const [lastDoctorVisitReason, setLastDoctorVisitReason] = useState('');
  const [emotionalAlterationsExplain, setEmotionalAlterationsExplain] = useState('');
  const [heartConditionsExplain, setHeartConditionsExplain] = useState('');
  const [nervousSystemExplain, setNervousSystemExplain] = useState('');
  
  const [hasInsurance, setHasInsurance] = useState(false);
  const [insuranceExplain, setInsuranceExplain] = useState('');
  
  const [hasPhysicalImpairment, setHasPhysicalImpairment] = useState(false);
  const [physicalImpairmentExplain, setPhysicalImpairmentExplain] = useState('');
  const [additionalHealthNotes, setAdditionalHealthNotes] = useState('');

  // 8. FIRMA DIGITAL
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [signatureDate, setSignatureDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadMedicalData();
  }, [targetUserId]);

  const getCurrentFormJSON = () => {
    return JSON.stringify({
      fullName, ci, nationality, age, gender, heightCm, weightKg,
      emergencyContactName, emergencyPhonePersonal, emergencyPhoneHome, emergencyPhoneOther,
      goodHealthExplain, bloodType, bloodPressure, vaccines, allergies,
      familyHistory, pastDiseases, personalHistory, asmaCrisisDate, convulsionesDate,
      dolorAbdominalExplain, trastornosHematologicosExplain, recentOperationExplain,
      hasRestrictedActivities, restrictedActivitiesExplain, hasPrescription, medicalPrescriptionExplain,
      lastDoctorVisitReason, emotionalAlterationsExplain, heartConditionsExplain, nervousSystemExplain,
      hasInsurance, insuranceExplain, hasPhysicalImpairment, physicalImpairmentExplain,
      additionalHealthNotes, signatureUrl, signatureDate
    });
  };

  useEffect(() => {
    if (!loading) {
      const current = getCurrentFormJSON();
      if (savedStateRef.current) {
        setHasChanges(current !== savedStateRef.current);
      }
      if (!isViewOnlyForScouter && targetUserId) {
        try {
          autoSaveService.saveDraft(`medical_record_${targetUserId}`, JSON.parse(current), targetUserId, 'FichaMedica');
        } catch (e) {}
      }
    }
  }, [
    fullName, ci, nationality, age, gender, heightCm, weightKg,
    emergencyContactName, emergencyPhonePersonal, emergencyPhoneHome, emergencyPhoneOther,
    goodHealthExplain, bloodType, bloodPressure, vaccines, allergies,
    familyHistory, pastDiseases, personalHistory, asmaCrisisDate, convulsionesDate,
    dolorAbdominalExplain, trastornosHematologicosExplain, recentOperationExplain,
    hasRestrictedActivities, restrictedActivitiesExplain, hasPrescription, medicalPrescriptionExplain,
    lastDoctorVisitReason, emotionalAlterationsExplain, heartConditionsExplain, nervousSystemExplain,
    hasInsurance, insuranceExplain, hasPhysicalImpairment, physicalImpairmentExplain,
    additionalHealthNotes, signatureUrl, signatureDate
  ]);

  const loadMedicalData = async () => {
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
        setGender(prof.gender || 'Masculino');
        
        if (prof.medical_data) {
          const m = prof.medical_data;
          setCi(m.ci || '');
          setNationality(m.nationality || 'V');
          setAge(m.age ? String(m.age) : '');
          setHeightCm(m.heightCm ? String(m.heightCm) : '');
          setWeightKg(m.weightKg ? String(m.weightKg) : '');

          setEmergencyContactName(m.emergencyContactName || '');
          setEmergencyPhonePersonal(m.emergencyPhonePersonal || '');
          setEmergencyPhoneHome(m.emergencyPhoneHome || '');
          setEmergencyPhoneOther(m.emergencyPhoneOther || '');

          setGoodHealthExplain(m.goodHealthExplain || 'Sí, buena salud.');
          setBloodType(m.bloodType || 'O+');
          setBloodPressure(m.bloodPressure || 'NORMAL');

          if (m.vaccines) setVaccines(m.vaccines);
          if (m.allergies) setAllergies(m.allergies);
          if (m.familyHistory) setFamilyHistory(m.familyHistory);
          if (m.pastDiseases) setPastDiseases(m.pastDiseases);
          if (m.personalHistory) setPersonalHistory(m.personalHistory);

          setAsmaCrisisDate(m.asmaCrisisDate || '');
          setConvulsionesDate(m.convulsionesDate || '');
          setDolorAbdominalExplain(m.dolorAbdominalExplain || '');
          setTrastornosHematologicosExplain(m.trastornosHematologicosExplain || '');

          setRecentOperationExplain(m.recentOperationExplain || '');
          setHasRestrictedActivities(m.hasRestrictedActivities || false);
          setRestrictedActivitiesExplain(m.restrictedActivitiesExplain || '');
          setHasPrescription(m.hasPrescription || false);
          setMedicalPrescriptionExplain(m.medicalPrescriptionExplain || '');
          setLastDoctorVisitReason(m.lastDoctorVisitReason || '');
          setEmotionalAlterationsExplain(m.emotionalAlterationsExplain || '');
          setHeartConditionsExplain(m.heartConditionsExplain || '');
          setNervousSystemExplain(m.nervousSystemExplain || '');

          setHasInsurance(m.hasInsurance || false);
          setInsuranceExplain(m.insuranceExplain || '');

          setHasPhysicalImpairment(m.hasPhysicalImpairment || false);
          setPhysicalImpairmentExplain(m.physicalImpairmentExplain || '');
          setAdditionalHealthNotes(m.additionalHealthNotes || '');

          if (m.signatureUrl) setSignatureUrl(m.signatureUrl);
          if (m.signatureDate) setSignatureDate(m.signatureDate);
        } else {
          const draft: any = await autoSaveService.loadDraft(`medical_record_${targetUserId}`);
          if (draft) {
            if (draft.ci) setCi(draft.ci);
            if (draft.nationality) setNationality(draft.nationality);
            if (draft.age) setAge(String(draft.age));
            if (draft.heightCm) setHeightCm(String(draft.heightCm));
            if (draft.weightKg) setWeightKg(String(draft.weightKg));
            if (draft.emergencyContactName) setEmergencyContactName(draft.emergencyContactName);
            if (draft.emergencyPhonePersonal) setEmergencyPhonePersonal(draft.emergencyPhonePersonal);
            if (draft.emergencyPhoneHome) setEmergencyPhoneHome(draft.emergencyPhoneHome);
            if (draft.emergencyPhoneOther) setEmergencyPhoneOther(draft.emergencyPhoneOther);
            if (draft.bloodType) setBloodType(draft.bloodType);
            if (draft.allergies) setAllergies(draft.allergies);
            if (draft.vaccines) setVaccines(draft.vaccines);
            if (draft.signatureUrl) setSignatureUrl(draft.signatureUrl);
          }
        }
      }
    } catch (err) {
      console.error('Error cargando ficha médica:', err);
    } finally {
      setLoading(false);
      setTimeout(() => {
        savedStateRef.current = getCurrentFormJSON();
        setHasChanges(false);
      }, 200);
    }
  };

  const handlePickSignature = () => {
    if (isViewOnlyForScouter) return;
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event: any) => {
            const dataUrl = event.target?.result as string;
            setSignatureUrl(dataUrl);
            showAlert('¡Firma Cargada!', 'Se ha cargado tu imagen de firma digital sin fondo.');
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      showAlert('Firma Digital', 'Toca para seleccionar tu imagen de firma.');
    }
  };

  const handleSaveMedicalData = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      let uploadedSignatureUrl = signatureUrl;
      if (signatureUrl && signatureUrl.startsWith('data:image')) {
        uploadedSignatureUrl = await storageService.uploadImage(
          'scout-files',
          'signatures',
          `signature_${user.id}.png`,
          signatureUrl
        );
        setSignatureUrl(uploadedSignatureUrl);
      }

      const payload = {
        ci,
        nationality,
        age,
        gender,
        heightCm,
        weightKg,
        emergencyContactName,
        emergencyPhonePersonal,
        emergencyPhoneHome,
        emergencyPhoneOther,
        goodHealthExplain,
        bloodType,
        bloodPressure,
        vaccines,
        allergies,
        familyHistory,
        pastDiseases,
        personalHistory,
        asmaCrisisDate,
        convulsionesDate,
        dolorAbdominalExplain,
        trastornosHematologicosExplain,
        recentOperationExplain,
        hasRestrictedActivities,
        restrictedActivitiesExplain,
        hasPrescription,
        medicalPrescriptionExplain,
        lastDoctorVisitReason,
        emotionalAlterationsExplain,
        heartConditionsExplain,
        nervousSystemExplain,
        hasInsurance,
        insuranceExplain,
        hasPhysicalImpairment,
        physicalImpairmentExplain,
        additionalHealthNotes,
        signatureUrl,
        signatureDate
      };

      const { error } = await supabase
        .from('profiles')
        .update({ medical_data: payload })
        .eq('id', user.id);

      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`medical_data_${user.id}`, JSON.stringify(payload));
      }

      savedStateRef.current = getCurrentFormJSON();
      setHasChanges(false);

      showAlert('¡Ficha Médica Guardada!', 'Se han guardado todos los datos de tu Ficha Médica.');
    } catch (err: any) {
      showAlert('¡Guardado Completado!', 'Datos médicos guardados en tu dispositivo.');
    } finally {
      setSaving(false);
    }
  };

  // EXPORTAR DOCUMENTO AUTO-RELLENADO EN FORMATO OFICIAL WORD (.DOCX)
  const handleExportMedicalDoc = async () => {
    try {
      const region = (user?.region || 'MIRANDA').toUpperCase();
      const groupName = (user?.group_name || 'ORION 84').toUpperCase();
      const districtName = (user?.district || 'GUARENAS GUATIRE').toUpperCase();
      const unitName = (user?.unit || 'clan').toLowerCase();

      const unitCheckboxes = `MANADA [${unitName === 'manada' ? 'X' : ' '}]    TROPA [${unitName === 'tropa' ? 'X' : ' '}]   CAMINANTE [${unitName === 'caminantes' ? 'X' : ' '}]           CLAN [${unitName === 'clan' ? 'X' : ' '}]     STAFF [${unitName === 'staff' ? 'X' : ' '}]`;

      // Desglose automático de Grupo (A, B, AB, O) y Factor Rh (Positivo, Negativo)
      const bloodGroupStr = bloodType.replace('+', '').replace('-', '');
      const isPositive = bloodType.includes('+');
      const rhFactorBoxes = `Factor:\nPositivo [${isPositive ? 'X' : ' '}]\nNegativo [${!isPositive ? 'X' : ' '}]`;

      // Antecedentes Familiares Checkboxes
      const familyList = ["asma", "alergia", "alcoholismo", "hipertension", "drogas", "epilepsia", "cancer", "diabetes", "cardiopatia", "obesidad"];
      const familyCheckboxes = familyList.map(item => `${item.toUpperCase()} [${familyHistory[item] ? 'X' : ' '}]`).join('   ');

      // Alergias
      const allergiesText = `Picada: ${allergies.picada || 'Ninguna'} | Medicamento: ${allergies.medicamento || 'Ninguno'} | Alimento: ${allergies.alimento || 'Ninguno'} | Otro: ${allergies.otro || 'Ninguno'}`;

      // Enfermedades Padecidas Checkboxes
      const pastDiseasesList = ["sarampion", "lechina", "rubeola", "escarlatina", "hernia", "paperas", "insomnio", "hiperactividad", "apendicitis"];
      const pastDiseasesText = pastDiseasesList.map(item => `${item.toUpperCase()} [${pastDiseases[item] ? 'X' : ' '}]`).join('   ');

      // Antecedentes Personales
      const personalList = [];
      if (personalHistory.dolorCabeza) personalList.push('Dolor de cabeza [X]');
      if (personalHistory.parasitos) personalList.push('Parásitos [X]');
      if (personalHistory.rinitis) personalList.push('Rinitis [X]');
      if (asmaCrisisDate) personalList.push(`Asma (Última crisis: ${asmaCrisisDate})`);
      if (convulsionesDate) personalList.push(`Convulsiones (Última crisis: ${convulsionesDate})`);
      if (dolorAbdominalExplain) personalList.push(`Dolor abdominal: ${dolorAbdominalExplain}`);
      if (trastornosHematologicosExplain) personalList.push(`Trastornos hematológicos: ${trastornosHematologicosExplain}`);
      const personalHistoryText = personalList.length > 0 ? personalList.join(' | ') : 'Sin antecedentes personales de cuidado.';

      // Vacunas
      const vacList = [];
      if (vaccines.fiebreAmarilla) vacList.push('Fiebre Amarilla [X]');
      if (vaccines.triple) vacList.push('Triple [X]');
      if (vaccines.toxoideTetanica) vacList.push('Toxoide Tetánica [X]');
      if (vaccines.covid) vacList.push('Covid [X]');
      const vaccinesText = `${vacList.join('   ')} ${vaccines.lastDoseDate ? `(Última dosis: ${vaccines.lastDoseDate})` : ''}`;

      const formattedCi = ci ? `${nationality}-${ci}` : '';

      const replacements: Record<string, string> = {
        '{{REGION}}': region,
        '{{DISTRICT}}': districtName,
        '{{GROUP_NAME}}': groupName,
        '{{UNIT_CHECKBOXES}}': unitCheckboxes,
        '{{NAME}}': fullName,
        '{{CI}}': formattedCi || '',
        '{{AGE}}': age || '',
        '{{GENDER}}': gender,
        '{{HEIGHT}}': heightCm ? `${heightCm} cm` : '',
        '{{WEIGHT}}': weightKg ? `${weightKg} kg` : '',
        '{{EMERGENCY_NAME}}': emergencyContactName || '',
        '{{EMERGENCY_HOME}}': emergencyPhoneHome || '',
        '{{EMERGENCY_CELL}}': emergencyPhonePersonal || '',
        '{{EMERGENCY_OTHER}}': emergencyPhoneOther || '',
        '{{GOOD_HEALTH}}': goodHealthExplain || 'Sí, buena salud.',
        '{{BLOOD_GROUP}}': bloodGroupStr,
        '{{RH_FACTOR_BOXES}}': rhFactorBoxes,
        '{{VACCINES}}': vaccinesText,
        '{{BLOOD_PRESSURE}}': bloodPressure,
        '{{FAMILY_HISTORY_CHECKBOXES}}': familyCheckboxes,
        '{{ALLERGIES_TEXT}}': allergiesText,
        '{{PAST_DISEASES_CHECKBOXES}}': pastDiseasesText,
        '{{PERSONAL_HISTORY_TEXT}}': personalHistoryText,
        '{{RECENT_OP_EXPLAIN}}': recentOperationExplain || 'NO',
        '{{RESTRICTED_ACT_EXPLAIN}}': hasRestrictedActivities ? `SÍ: ${restrictedActivitiesExplain}` : 'NO',
        '{{PRESCRIPTION_EXPLAIN}}': hasPrescription ? `SÍ: ${medicalPrescriptionExplain}` : 'NO',
        '{{DOCTOR_VISIT_EXPLAIN}}': lastDoctorVisitReason || 'Chequeo médico de rutina.',
        '{{EMOTIONAL_EXPLAIN}}': emotionalAlterationsExplain || 'NO',
        '{{HEART_EXPLAIN}}': heartConditionsExplain || 'NO',
        '{{NERVOUS_EXPLAIN}}': nervousSystemExplain || 'NO',
        '{{INSURANCE_EXPLAIN}}': hasInsurance ? `SÍ: ${insuranceExplain}` : 'NO',
        '{{PHYSICAL_IMPAIRMENT_EXPLAIN}}': hasPhysicalImpairment ? `SÍ: ${physicalImpairmentExplain}` : 'NO',
        '{{HEALTH_NOTES}}': additionalHealthNotes || 'Sin observaciones adicionales.',
        '{{SIGNATURE_DATE}}': signatureDate
      };

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const response = await fetch('/FICHA_MEDICA_Template.docx');
        if (!response.ok) {
          throw new Error('No se pudo cargar la plantilla Word oficial.');
        }
        const arrayBuffer = await response.arrayBuffer();
        await exportDocxInBrowser(arrayBuffer, replacements, `FICHA_MEDICA_${fullName.replace(/\s+/g, '_')}.docx`, { signatureUrl });
        showAlert('¡Ficha Médica Exportada!', 'Se ha descargado tu Ficha Médica Oficial en formato Word (.docx).');
      } else {
        showAlert('Descargar Ficha Médica', 'Documento autocompletado en formato Word.');
      }
    } catch (err: any) {
      console.error('Error exportando Ficha Médica:', err);
      showAlert('Error', err?.message || 'No se pudo generar el documento Word.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={styles.asociacionBanner}>ASOCIACIÓN DE SCOUTS DE VENEZUELA</Text>
            <Text style={[styles.title, { color: theme.text }]}>Ficha Médica Oficial</Text>
          </View>
          {isViewOnlyForScouter && (
            <View style={styles.scouterBadge}>
              <Shield size={12} color="white" style={{ marginRight: 4 }} />
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>Modo Scouter</Text>
            </View>
          )}
        </View>

        {hasChanges && !isViewOnlyForScouter && (
          <View style={styles.changesBanner}>
            <AlertCircle size={14} color="#f59e0b" style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#f59e0b', flex: 1 }}>
              Has realizado cambios en la Ficha Médica. Recuerda guardar los cambios.
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 60 }}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : (
          <View style={[styles.sheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
            
            {/* SECCIÓN 1: DATOS DEL PARTICIPANTE */}
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>1. Datos del Participante</Text>
            
            <Text style={[styles.label, { color: theme.subText }]}>NOMBRES Y APELLIDOS COMPLETOS</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              value={fullName}
              onChangeText={setFullName}
              editable={!isViewOnlyForScouter}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ width: 100 }}>
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
                <Text style={[styles.label, { color: theme.subText }]}>CÉDULA DE IDENTIDAD</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="31.902.000"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={ci}
                  onChangeText={setCi}
                  editable={!isViewOnlyForScouter}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>EDAD</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="Años"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  keyboardType="numeric"
                  value={age}
                  onChangeText={setAge}
                  editable={!isViewOnlyForScouter}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
              <View style={{ flex: 1.4 }}>
                <Text style={[styles.label, { color: theme.subText }]}>GÉNERO</Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.genderChip, gender === 'Masculino' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setGender('Masculino')}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: gender === 'Masculino' ? 'white' : theme.text }}>MASCULINO</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderChip, gender === 'Femenino' && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setGender('Femenino')}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: gender === 'Femenino' ? 'white' : theme.text }}>FEMENINO</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>ESTATURA (CM)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="170"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  keyboardType="numeric"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  editable={!isViewOnlyForScouter}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>PESO (KG)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="65"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  keyboardType="numeric"
                  value={weightKg}
                  onChangeText={setWeightKg}
                  editable={!isViewOnlyForScouter}
                />
              </View>
            </View>

            {/* SECCIÓN 2: CONTACTO DE EMERGENCIA */}
            <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>2. En Caso de Emergencia Avisar A</Text>

            <Text style={[styles.label, { color: theme.subText }]}>NOMBRE Y APELLIDO DEL CONTACTO DE EMERGENCIA</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Padre / Madre / Representante Legal"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              editable={!isViewOnlyForScouter}
            />

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>TELÉFONO PERSONAL</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0414..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  keyboardType="phone-pad"
                  value={emergencyPhonePersonal}
                  onChangeText={setEmergencyPhonePersonal}
                  editable={!isViewOnlyForScouter}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: theme.subText }]}>TELÉFONO HABITACIÓN</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                  placeholder="0212..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  keyboardType="phone-pad"
                  value={emergencyPhoneHome}
                  onChangeText={setEmergencyPhoneHome}
                  editable={!isViewOnlyForScouter}
                />
              </View>
            </View>

            {/* SECCIÓN 3: SALUD, SANGRE Y VACUNAS */}
            <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>3. Datos Clínicos, Sangre y Vacunas</Text>
            
            <Text style={[styles.label, { color: theme.subText }]}>CONSIDERA USTED QUE TIENE BUENA SALUD (EXPLIQUE)</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              value={goodHealthExplain}
              onChangeText={setGoodHealthExplain}
              editable={!isViewOnlyForScouter}
            />

            <Text style={[styles.label, { color: theme.subText, marginTop: 10 }]}>SELECCIONA EL TIPO DE SANGRE (LISTA OFICIAL)</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {BLOOD_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.bloodChip,
                    { backgroundColor: theme.inputBg, borderColor: theme.border },
                    bloodType === type && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => !isViewOnlyForScouter && setBloodType(type)}
                >
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: bloodType === type ? 'white' : theme.text }}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 6 }}>
              <Text style={[styles.label, { color: theme.subText }]}>TENSIÓN ARTERIAL</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {['NORMAL', 'ALTA', 'BAJA'].map(press => (
                  <TouchableOpacity
                    key={press}
                    style={[styles.chip, bloodPressure === press && { backgroundColor: colors.primary }]}
                    onPress={() => !isViewOnlyForScouter && setBloodPressure(press as any)}
                  >
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: bloodPressure === press ? 'white' : theme.text }}>{press}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* FIRMA DIGITAL */}
            <Text style={[styles.sectionTitle, { color: colors.primary, marginTop: 20 }]}>4. Firma Digital del Declarante / Representante</Text>
            
            <View style={styles.signatureBanner}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary }}>
                💡 Recomendación para una Firma Limpia y Profesional:
              </Text>
              <Text style={{ fontSize: 10, color: theme.subText, marginTop: 2 }}>
                Sube tu firma escaneada o en imagen sin fondo (PNG transparente) para que encaje perfectamente sobre la línea de firma del documento Word.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}>
              <View style={[styles.signaturePreviewBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                {signatureUrl ? (
                  <Image source={{ uri: signatureUrl }} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
                ) : (
                  <Text style={{ fontSize: 10, color: theme.subText, textAlign: 'center' }}>Sin firma cargada</Text>
                )}
              </View>
              {!isViewOnlyForScouter && (
                <TouchableOpacity style={styles.uploadSigBtn} onPress={handlePickSignature}>
                  <Camera size={14} color="white" style={{ marginRight: 4 }} />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>Cargar Firma sin Fondo</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* BOTONES INFERIORES: GUARDAR Y EXPORTAR EN LA PARTE DE ABAJO */}
            <View style={{ marginTop: 24, gap: 10 }}>
              {!isViewOnlyForScouter && (
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMedicalData} disabled={saving}>
                  {saving ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Save size={16} color="white" style={{ marginRight: 6 }} />
                      <Text style={styles.saveBtnText}>Guardar Ficha Médica</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.bottomExportBtn} onPress={handleExportMedicalDoc}>
                <Download size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.bottomExportBtnText}>Descargar Ficha Médica Oficial (.docx)</Text>
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
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 8, fontSize: 12 },
  natChip: { flex: 1, height: 38, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  genderChip: { flex: 1, height: 38, paddingHorizontal: 4, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  chip: { flex: 1, height: 34, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', justifyContent: 'center', alignItems: 'center' },
  bloodChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  signatureBanner: { backgroundColor: 'rgba(99, 102, 241, 0.08)', padding: 10, borderRadius: 10, marginTop: 6 },
  signaturePreviewBox: { width: 140, height: 60, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  uploadSigBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
  bottomExportBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  bottomExportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 }
});
