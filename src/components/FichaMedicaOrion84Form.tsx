import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Download, Save, AlertCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { autoSaveService } from '../services/autoSaveService';
import { showAlert } from '../utils/alert';
import { colors } from '../theme/colors';
import { downloadFichaOrion84Pdf } from '../lib/fichaOrion84PdfGenerator';
import {
  ORION84_SECTIONS,
  Orion84Field,
  Orion84Values,
  emptyOrion84Values,
} from '../data/fichaMedicaOrion84Layout';

interface Props {
  targetUserId: string;
  readOnly: boolean;
  theme: any;
  isDarkMode: boolean;
  /** Perfil en caché (AuthContext) para autocompletar si Supabase no responde (sin conexión). */
  fallbackProfile?: any;
}

const humanize = (v?: string | null) =>
  (v || '')
    .replace(/_/g, ' ')
    .replace(/(^|\s)(\S)/g, (_m, sp, c) => sp + c.toUpperCase())
    .trim();

const formatDate = (v?: string | null) => {
  const m = (v || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v || '';
};

const RAMA_BY_UNIT: Record<string, string> = {
  manada: 'Manada',
  tropa: 'Tropa',
  caminantes: 'Caminante',
  comunidad: 'Caminante',
  clan: 'Clan',
};

const yes = (b?: boolean) => (b === undefined ? '' : b ? 'Sí' : 'No');

/** Autocompleta con los datos del perfil y de la Ficha Médica Scout ya guardada. */
function prefillFromProfile(prof: any): Orion84Values {
  const v = emptyOrion84Values();
  const words = (prof?.name || '').trim().split(/\s+/).filter(Boolean);
  const half = words.length >= 4 ? 2 : 1;
  v.nombres = words.slice(0, half).join(' ');
  v.apellidos = words.slice(half).join(' ');

  const m = prof?.medical_data || {};
  const rawCi = prof?.cedula || m.ci || '';
  v.cedula = rawCi && !/^[VE]-/i.test(rawCi) ? `${m.nationality || 'V'}-${rawCi}` : rawCi;
  v.sexo = prof?.gender || m.gender || '';
  v.fechaNacimiento = formatDate(prof?.birth_date);
  v.grupo = prof?.group_name || '';
  v.distrito = humanize(prof?.district);
  v.region = humanize(prof?.region);
  v.telefono = prof?.phone || '';
  v.correo = prof?.email || '';
  v.rama = RAMA_BY_UNIT[(prof?.unit || '').toLowerCase()] || '';

  if (prof?.medical_data) {
    v.grupoSanguineo = m.bloodType || '';
    v.peso = m.weightKg ? `${m.weightKg} kg` : '';
    v.estatura = m.heightCm ? `${m.heightCm} cm` : '';
    v.buenaSalud = m.goodHealthExplain ? (/^s[ií]/i.test(m.goodHealthExplain) ? 'Sí' : 'No') : '';
    v.alergias = Object.values(m.allergies || {}).filter(Boolean).join(', ');
    v.asma = m.asmaCrisisDate ? 'Sí' : '';
    v.convulsiones = m.convulsionesDate ? 'Sí' : '';
    const past = m.pastDiseases || {};
    v.apendicitis = yes(past.apendicitis);
    v.hernias = yes(past.hernia);
    v.insomnio = yes(past.insomnio);
    v.paperas = yes(past.paperas);
    v.sarampion = yes(past.sarampion);
    v.rubeola = yes(past.rubeola);
    v.escarlatina = yes(past.escarlatina);
    v.antecedentesFamiliares = Object.entries(m.familyHistory || {})
      .filter(([, on]) => on)
      .map(([k]) => humanize(k))
      .join(', ');
    v.enfermedadAccidenteOperacion = m.recentOperationExplain || '';
    v.actividadesRestringidas = m.hasRestrictedActivities ? `Sí: ${m.restrictedActivitiesExplain || ''}` : '';
    v.medicamentoRegular = m.hasPrescription ? `Sí: ${m.medicalPrescriptionExplain || ''}` : '';
    v.problemasCorazon = m.heartConditionsExplain || '';
    v.sistemaNervioso = m.nervousSystemExplain || '';
    v.tratamientoPsicologico = m.emotionalAlterationsExplain || '';
    v.tensionAltaBaja = m.bloodPressure === 'ALTA' ? 'Alta' : m.bloodPressure === 'BAJA' ? 'Baja' : m.bloodPressure ? 'No' : '';
    v.seguroMedico = m.hasInsurance === undefined ? '' : yes(m.hasInsurance);
    v.seguroDetalle = m.insuranceExplain || '';
    v.observaciones = m.additionalHealthNotes || '';
    const vac = m.vaccines || {};
    v.vacunasRecientes = [
      vac.fiebreAmarilla && 'Fiebre amarilla',
      vac.triple && 'Triple',
      vac.toxoideTetanica && 'Toxoide tetánico',
      vac.covid && 'COVID-19',
    ].filter(Boolean).join(', ') + (vac.lastDoseDate ? ` (última dosis: ${vac.lastDoseDate})` : '');
    v.antitetanica = vac.toxoideTetanica ? `Sí${vac.lastDoseDate ? `, ${vac.lastDoseDate}` : ''}` : '';
    v.emergenciaNombre = m.emergencyContactName || '';
    v.emergenciaTelefono = m.emergencyPhonePersonal || m.emergencyPhoneHome || '';
  }
  return v;
}

export default function FichaMedicaOrion84Form({ targetUserId, readOnly, theme, isDarkMode, fallbackProfile }: Props) {
  const [values, setValues] = useState<Orion84Values>(emptyOrion84Values());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const savedJsonRef = useRef('');
  const draftKey = `orion84_record_${targetUserId}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetUserId)
          .maybeSingle();
        const prof = data || fallbackProfile;
        let loaded: Orion84Values;
        const saved = prof?.medical_data?.orion84;
        if (saved) {
          loaded = { ...emptyOrion84Values(), ...saved };
          setSavedAt(saved.updatedAt || null);
        } else {
          loaded = prefillFromProfile(prof);
          const draft = readOnly ? null : await autoSaveService.loadDraft<Orion84Values>(draftKey);
          if (draft) loaded = { ...loaded, ...draft };
        }
        delete (loaded as any).updatedAt;
        if (!cancelled) {
          setValues(loaded);
          savedJsonRef.current = saved ? JSON.stringify(loaded) : '';
          setHasChanges(!saved);
        }
      } catch (err) {
        console.error('Error cargando Ficha Médica Orión 84:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId]);

  const setField = (key: string, value: string) => {
    if (readOnly) return;
    const next = { ...values, [key]: value };
    setValues(next);
    setHasChanges(JSON.stringify(next) !== savedJsonRef.current);
    autoSaveService.saveDraft(draftKey, next, targetUserId, 'FichaMedicaOrion84');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Se relee medical_data para no pisar la Ficha Médica Scout guardada en el mismo campo.
      const { data: current, error: readError } = await supabase
        .from('profiles')
        .select('medical_data')
        .eq('id', targetUserId)
        .single();
      if (readError) throw readError;
      const updatedAt = new Date().toISOString();
      const merged = { ...(current?.medical_data || {}), orion84: { ...values, updatedAt } };
      const { error } = await supabase.from('profiles').update({ medical_data: merged }).eq('id', targetUserId);
      if (error) throw error;
      savedJsonRef.current = JSON.stringify(values);
      setHasChanges(false);
      setSavedAt(updatedAt);
      autoSaveService.removeDraft(draftKey);
      showAlert('¡Ficha Orión 84 guardada!', 'Tus datos quedaron guardados en tu perfil.');
    } catch (err: any) {
      console.error('Error guardando Ficha Médica Orión 84:', err);
      showAlert(
        'No se pudo guardar',
        'Tus datos siguen como borrador en este dispositivo. Revisa tu conexión e inténtalo de nuevo.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!values.nombres.trim() || !values.apellidos.trim()) {
      showAlert('Faltan datos', 'Completa al menos tus nombres y apellidos antes de descargar la ficha.');
      return;
    }
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      showAlert('Descarga disponible en la web', 'Abre la aplicación desde el navegador para descargar el PDF.');
      return;
    }
    setExporting(true);
    try {
      const safeName = `${values.nombres}_${values.apellidos}`.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_');
      await downloadFichaOrion84Pdf(values, `FICHA_MEDICA_ORION84_${safeName}.pdf`);
      showAlert('¡Ficha descargada!', 'Se descargó la Ficha Médica Orión 84 en PDF, lista para entregar.');
    } catch (err: any) {
      console.error('Error exportando Ficha Médica Orión 84:', err);
      showAlert('Error', err?.message || 'No se pudo generar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  const renderChoice = (field: Orion84Field) => (
    <View style={styles.chipRow}>
      {(field.options || []).map((opt) => {
        const active = values[field.key] === opt;
        return (
          <TouchableOpacity
            key={opt}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[
              styles.chip,
              { backgroundColor: theme.inputBg, borderColor: theme.border },
              active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => setField(field.key, active ? '' : opt)}
            disabled={readOnly}
          >
            <Text style={{ fontSize: 12, fontWeight: 'bold', color: active ? 'white' : theme.text }}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderField = (field: Orion84Field) => {
    const isChoice = field.type !== 'text';
    // Campos cortos en cuadrícula (1 columna en teléfono, varias en pantallas anchas); preguntas largas a lo ancho.
    const isShort = field.type === 'yesno' || (!field.multiline && field.label.length <= 40 && (field.options?.length || 0) <= 4);
    return (
      <View key={field.key} style={field.type === 'yesno' ? styles.yesNoItem : isShort ? styles.gridItem : styles.fullItem}>
        <Text style={[styles.label, { color: theme.subText }]}>{field.label.toUpperCase()}</Text>
        {isChoice ? (
          renderChoice(field)
        ) : (
          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border },
              field.multiline && { minHeight: 60, textAlignVertical: 'top' },
            ]}
            value={values[field.key]}
            onChangeText={(t) => setField(field.key, t)}
            placeholder={field.placeholder}
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            multiline={field.multiline}
            editable={!readOnly}
            accessibilityLabel={field.label}
          />
        )}
      </View>
    );
  };

  // El morado de marca casi no contrasta sobre el fondo oscuro: allí se usa un violeta claro.
  const accent = isDarkMode ? '#c4b5fd' : colors.primary;

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />;
  }

  return (
    <View style={[styles.sheet, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
      <View style={styles.introBanner}>
        <Text style={{ fontSize: 12, fontWeight: 'bold', color: accent }}>
          Formato del Grupo Scout Orión 84 (Información General y Ficha Médica)
        </Text>
        <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
          Los datos se completaron con tu perfil y tu Ficha Médica Scout. Revísalos, guarda y descarga el PDF listo para entregar.
        </Text>
      </View>

      {hasChanges && !readOnly && (
        <View style={styles.changesBanner}>
          <AlertCircle size={14} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#f59e0b', flex: 1 }}>
            {savedAt ? 'Tienes cambios sin guardar.' : 'Esta ficha todavía no está guardada en tu perfil.'}
          </Text>
        </View>
      )}

      {ORION84_SECTIONS.map((section) => (
        <View key={section.title} style={{ marginTop: 18 }}>
          <Text style={[styles.sectionTitle, { color: accent }]}>{section.title}</Text>
          <View style={styles.grid}>{section.fields.map(renderField)}</View>
        </View>
      ))}

      {!!savedAt && (
        <Text style={{ fontSize: 11, color: theme.subText, marginTop: 16 }}>
          Última vez guardada: {new Date(savedAt).toLocaleString('es-VE')}
        </Text>
      )}

      <View style={{ marginTop: 20, gap: 10 }}>
        {!readOnly && (
          <TouchableOpacity accessibilityRole="button" style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Save size={16} color="white" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Guardar Ficha Orión 84</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        <TouchableOpacity accessibilityRole="button" style={styles.exportBtn} onPress={handleExport} disabled={exporting}>
          {exporting ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Download size={18} color="white" style={{ marginRight: 8 }} />
              <Text style={[styles.btnText, { fontSize: 15 }]}>Descargar Ficha Orión 84 (PDF)</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { borderRadius: 18, padding: 18, borderWidth: 1, maxWidth: 850, width: '100%', alignSelf: 'center' },
  introBanner: { backgroundColor: 'rgba(97, 36, 153, 0.08)', padding: 10, borderRadius: 10 },
  changesBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: 8, borderRadius: 8, marginTop: 10 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 4, marginTop: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 8, fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, minWidth: 48, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14 },
  gridItem: { flexGrow: 1, flexBasis: 220, minWidth: 0 },
  yesNoItem: { flexGrow: 1, flexBasis: 130, minWidth: 0 },
  fullItem: { flexBasis: '100%' },
  saveBtn: { backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  exportBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },
});
