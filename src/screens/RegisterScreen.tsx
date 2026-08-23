import React, { useState, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, TextInput, 
  ScrollView, ActivityIndicator, Modal, FlatList
} from 'react-native';
import { CheckCircle, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { validateEmail } from '../utils/emailValidator';
import { useTheme } from '../context/ThemeContext';

const REGIONS_LIST = [
  { id: 'miranda', label: 'Región Miranda' },
  { id: 'capital', label: 'Región Capital' },
  { id: 'amazonas', label: 'Región Amazonas' },
  { id: 'anzoategui', label: 'Región Anzoátegui' },
  { id: 'apure', label: 'Región Apure' },
  { id: 'aragua', label: 'Región Aragua' },
  { id: 'barinas', label: 'Región Barinas' },
  { id: 'bolivar', label: 'Región Bolívar' },
  { id: 'carabobo', label: 'Región Carabobo' },
  { id: 'cojedes', label: 'Región Cojedes' },
  { id: 'delta_amacuro', label: 'Región Delta Amacuro' },
  { id: 'falcon', label: 'Región Falcón' },
  { id: 'guarico', label: 'Región Guárico' },
  { id: 'lara', label: 'Región Lara' },
  { id: 'merida', label: 'Región Mérida' },
  { id: 'monagas', label: 'Región Monagas' },
  { id: 'nueva_esparta', label: 'Región Nueva Esparta' },
  { id: 'portuguesa', label: 'Región Portuguesa' },
  { id: 'sucre', label: 'Región Sucre' },
  { id: 'tachira', label: 'Región Táchira' },
  { id: 'trujillo', label: 'Región Trujillo' },
  { id: 'vargas', label: 'Región Vargas (La Guaira)' },
  { id: 'yaracuy', label: 'Región Yaracuy' },
  { id: 'zulia', label: 'Región Zulia' },
];

const DISTRICTS_DATA: Record<string, { id: string; label: string }[]> = {
  miranda: [
    { id: 'guarenas_guatire', label: 'Distrito Guarenas-Guatire' },
    { id: 'altos_mirandinos', label: 'Distrito Altos Mirandinos' },
    { id: 'otro_distrito', label: 'Otro Distrito' },
  ],
};

const DEFAULT_DISTRICTS = [
  { id: 'otro_distrito', label: 'Otro Distrito' },
];

const GROUPS_DATA: Record<string, { id: string; label: string }[]> = {
  guarenas_guatire: [
    { id: 'Grupo Orión #84', label: 'Grupo Scout Orión #84' },
    { id: 'Grupo Alianza', label: 'Grupo Scout Alianza' },
    { id: 'Grupo Mafeking', label: 'Grupo Scout Mafeking' },
    { id: 'Grupo Gamma', label: 'Grupo Scout Gamma' },
    { id: 'Grupo Sirio', label: 'Grupo Scout Sirio' },
    { id: 'Grupo Aquatiri', label: 'Grupo Scout Aquatiri' },
    { id: 'Otro Grupo Scout', label: 'Otro Grupo Scout' },
  ],
};

const DEFAULT_GROUPS = [
  { id: 'Grupo Orión #84', label: 'Grupo Scout Orión #84' },
  { id: 'Otro Grupo Scout', label: 'Otro Grupo Scout' },
];

const UNITS = [
  { id: 'manada',    label: 'Manada',     color: '#ffb300' },
  { id: 'tropa',     label: 'Tropa',      color: '#43a047' },
  { id: 'comunidad', label: 'Caminantes', color: '#1e88e5' },
  { id: 'clan',      label: 'Clan',       color: '#e53935' },
];

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1949 }, (_, i) => 1950 + i).reverse();
const DAYS  = Array.from({ length: 31 }, (_, i) => i + 1);

const ITEM_HEIGHT = 48;

function WheelColumn({ items, selected, onSelect, labelFn }: {
  items: (number | string)[];
  selected: number | string;
  onSelect: (v: number | string) => void;
  labelFn?: (v: number | string) => string;
}) {
  const flatRef = useRef<FlatList>(null);
  const selectedIndex = items.indexOf(selected);
  const { isDarkMode } = useTheme();

  const renderLabel = (v: number | string) => labelFn ? labelFn(v) : String(v);

  return (
    <View style={wheelStyles.column}>
      <View style={wheelStyles.selectionLines} pointerEvents="none">
        <View style={wheelStyles.selectionLine} />
        <View style={[wheelStyles.selectionLine, { marginTop: ITEM_HEIGHT - 1 }]} />
      </View>

      <FlatList
        ref={flatRef}
        data={items}
        keyExtractor={(item) => String(item)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        initialScrollIndex={selectedIndex >= 0 ? selectedIndex : 0}
        getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
        ListHeaderComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
        ListFooterComponent={<View style={{ height: ITEM_HEIGHT * 2 }} />}
        onScroll={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          if (index >= 0 && index < items.length && items[index] !== selected) {
            onSelect(items[index]);
          }
        }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT);
          if (index >= 0 && index < items.length) {
            onSelect(items[index]);
          }
        }}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              style={wheelStyles.item}
              onPress={() => {
                onSelect(item);
                const idx = items.indexOf(item);
                flatRef.current?.scrollToIndex({ index: idx, animated: true });
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                wheelStyles.itemText, 
                isDarkMode && { color: '#52525b' },
                isSelected && wheelStyles.itemTextSelected
              ]}>
                {renderLabel(item)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  column: { flex: 1, height: ITEM_HEIGHT * 5, overflow: 'hidden' },
  selectionLines: { 
    position: 'absolute', top: ITEM_HEIGHT * 2, left: 0, right: 0, 
    zIndex: 10, pointerEvents: 'none'
  },
  selectionLine: { height: 1, backgroundColor: colors.primary, opacity: 0.5 },
  item: { height: ITEM_HEIGHT, justifyContent: 'center', alignItems: 'center' },
  itemText: { fontSize: 17, color: '#aaa' },
  itemTextSelected: { fontSize: 20, fontWeight: 'bold', color: colors.primary },
});

function SelectorGrid({ options, selected, onSelect, isDarkMode }: {
  options: { id: string; label: string; color?: string }[];
  selected: string;
  onSelect: (id: string) => void;
  isDarkMode: boolean;
}) {
  return (
    <View style={chipStyles.grid}>
      {options.map(opt => {
        const isSelected = selected === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[
              chipStyles.chip,
              {
                backgroundColor: isDarkMode ? '#27272a' : '#f8f8f8',
                borderColor: isDarkMode ? '#3f3f46' : '#ddd',
              },
              isSelected && { backgroundColor: opt.color || colors.primary, borderColor: opt.color || colors.primary }
            ]}
            onPress={() => onSelect(isSelected ? '' : opt.id)}
            activeOpacity={0.7}
          >
            {isSelected && <CheckCircle size={13} color="white" style={{ marginRight: 5 }} />}
            <Text style={[
              chipStyles.chipText, 
              { color: isDarkMode ? '#a1a1aa' : '#555' },
              isSelected && { color: 'white', fontWeight: 'bold' }
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5,
  },
  chipText: { fontSize: 14 },
});

export default function RegisterScreen({ navigation }: any) {
  const { isDarkMode, theme } = useTheme();
  
  const [name, setName]         = useState('');
  const [cedula, setCedula]     = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const today = new Date();
  const [pickerDay,   setPickerDay]   = useState<number>(today.getDate());
  const [pickerMonth, setPickerMonth] = useState<number>(today.getMonth() + 1);
  const [pickerYear,  setPickerYear]  = useState<number>(today.getFullYear() - 10);
  const [birthDate,   setBirthDate]   = useState('');
  const [showPicker,  setShowPicker]  = useState(false);
  const [selectedRegion, setSelectedRegion] = useState('miranda');
  const [selectedDistrict, setSelectedDistrict] = useState('guarenas_guatire');
  const [selectedGroup,  setSelectedGroup]  = useState('');
  const [selectedUnit,   setSelectedUnit]   = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [suggestedEmail, setSuggestedEmail] = useState<string | null>(null);

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    setSelectedDistrict('');
    setSelectedGroup('');
    setFormError(null);
  };

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrict(districtId);
    setSelectedGroup('');
    setFormError(null);
  };

  const districtOptions = selectedRegion ? (DISTRICTS_DATA[selectedRegion] || DEFAULT_DISTRICTS) : [];
  const groupOptions    = selectedDistrict ? (GROUPS_DATA[selectedDistrict] || DEFAULT_GROUPS) : [];

  const confirmDate = () => {
    const mm = String(pickerMonth).padStart(2, '0');
    const dd = String(pickerDay).padStart(2, '0');
    setBirthDate(`${pickerYear}-${mm}-${dd}`);
    setShowPicker(false);
    setFormError(null);
  };

  const formatBirthDisplay = () => {
    if (!birthDate) return '';
    const [y, m, d] = birthDate.split('-');
    return `${d} de ${MONTHS[parseInt(m) - 1]} de ${y}`;
  };

  const executeRegistration = async (emailToUse: string) => {
    setLoading(true);
    setFormError(null);

    try {
      const assignedUnit = selectedUnit || 'clan';
      const assignedGroup = selectedGroup || 'Grupo Scout Orión #84';
      const assignedDistrict = selectedDistrict || 'Distrito Guarenas-Guatire';

      // 1. Registro en Supabase
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: emailToUse,
        password: password,
        options: {
          data: {
            name: name.trim(),
            cedula: cedula.trim(),
            email: emailToUse,
            role: 'scout',
            unit: assignedUnit,
            group_name: assignedGroup,
            region: selectedRegion,
            district: assignedDistrict,
            birth_date: birthDate,
          },
        },
      });

      if (signUpData?.user) {
        const profilePayload = {
          id: signUpData.user.id,
          name: name.trim(),
          cedula: cedula.trim(),
          email: emailToUse,
          role: 'scout',
          unit: assignedUnit,
          group_name: assignedGroup,
          region: selectedRegion,
          district: assignedDistrict,
          birth_date: birthDate,
        };
        try {
          await supabase.from('profiles').upsert(profilePayload);
          await supabase.from('profiles').update(profilePayload).eq('id', signUpData.user.id);
        } catch (e) {
          console.warn('Aviso guardando perfil inicial:', e);
        }
      }

      if (error) {
        setLoading(false);
        let msg = error.message;
        const errLower = error.message.toLowerCase();
        
        if (errLower.includes('email signups are disabled') || errLower.includes('signups are disabled')) {
          msg = 'El registro de usuarios por Email está desactivado en Supabase. Actívalo en el Dashboard.';
        } else if (errLower.includes('rate limit')) {
          msg = 'Límite de envíos alcanzado en Supabase. Desactiva "Confirm email" en Auth Providers.';
        }

        setFormError(msg);
        return;
      }

      // 2. Autologin inmediato
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: emailToUse,
        password,
      });

      setLoading(false);

      if (loginError) {
        if (loginError.message.toLowerCase().includes('email not confirmed')) {
          setFormError('¡Cuenta creada! Por favor revisa tu correo para confirmarla antes de ingresar.');
        } else {
          setFormError(`Cuenta creada. Ingresa con tus datos: ${loginError.message}`);
        }
        navigation.navigate('Login');
      }
    } catch (e: any) {
      setLoading(false);
      setFormError(e?.message || 'No se pudo completar el registro.');
    }
  };

  const handleRegister = async () => {
    setFormError(null);
    const missingFields = [];
    if (!name.trim()) missingFields.push('Nombre y Apellido');
    if (!cedula.trim()) missingFields.push('Cédula de Identidad');
    if (!email.trim()) missingFields.push('Correo Electrónico');
    if (!password) missingFields.push('Contraseña');
    if (!birthDate) missingFields.push('Fecha de Nacimiento');
    if (!selectedRegion) missingFields.push('Región Scout');
    if (!selectedDistrict) missingFields.push('Distrito Scout');
    if (!selectedGroup) missingFields.push('Grupo Scout');
    if (!selectedUnit) missingFields.push('Unidad / Rama');

    if (missingFields.length > 0) {
      setFormError(`Faltan campos obligatorios: ${missingFields.join(', ')}.`);
      return;
    }

    const validation = validateEmail(email);

    if (!validation.isValid) {
      if (validation.suggestedEmail) {
        setSuggestedEmail(validation.suggestedEmail);
        return;
      } else {
        setFormError(validation.errorMessage || 'El correo electrónico no es válido.');
        return;
      }
    }

    await executeRegistration(email.trim().toLowerCase());
  };

  const dynamicStyles = {
    screenWrapper: {
      backgroundColor: isDarkMode ? '#121214' : '#eaebed',
    },
    container: {
      backgroundColor: isDarkMode ? '#121214' : '#ffffff',
      borderColor: isDarkMode ? '#27272a' : 'transparent',
      borderWidth: isDarkMode ? 1 : 0
    },
    title: {
      color: isDarkMode ? '#f4f4f5' : colors.primary,
    },
    label: {
      color: isDarkMode ? '#f4f4f5' : '#444',
    },
    input: {
      backgroundColor: isDarkMode ? '#27272a' : '#fff',
      borderColor: isDarkMode ? '#3f3f46' : '#ddd',
      color: isDarkMode ? '#f4f4f5' : '#000',
    },
    modalCard: {
      backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
      borderColor: isDarkMode ? '#27272a' : '#e5e7eb',
    },
    modalText: {
      color: isDarkMode ? '#f4f4f5' : '#111827',
    },
    dividerLine: {
      backgroundColor: isDarkMode ? '#3f3f46' : '#ddd',
    },
    dividerText: {
      color: isDarkMode ? '#a1a1aa' : '#888',
    }
  };

  return (
    <View style={[styles.screenWrapper, dynamicStyles.screenWrapper]}>
      <ScrollView
        style={[styles.container, dynamicStyles.container]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerContainer}>
          <Text style={[styles.title, dynamicStyles.title]}>DATOS DEL SCOUT</Text>
          <Text style={[styles.subtitle, isDarkMode && { color: '#a1a1aa' }]}>Completa tu perfil para empezar</Text>
        </View>

        {formError ? (
          <View style={styles.errorCard}>
            <AlertCircle size={20} color="#dc2626" style={{ marginRight: 10 }} />
            <Text style={styles.errorCardText}>{formError}</Text>
          </View>
        ) : null}

        <View style={styles.formGroup}>
          <Text style={[styles.label, dynamicStyles.label]}>Nombre y Apellido <Text style={styles.required}>*</Text></Text>
          <TextInput 
            style={[styles.input, dynamicStyles.input]} 
            placeholder="Ej: Juan Pérez" 
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={name} 
            onChangeText={(v) => { setName(v); setFormError(null); }} 
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, dynamicStyles.label]}>Cédula de Identidad <Text style={styles.required}>*</Text></Text>
          <TextInput 
            style={[styles.input, dynamicStyles.input]} 
            placeholder="Ej: V-12.345.678 / 12345678" 
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={cedula} 
            onChangeText={(v) => { setCedula(v); setFormError(null); }} 
            keyboardType="default"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, dynamicStyles.label]}>Correo Electrónico <Text style={styles.required}>*</Text></Text>
          <TextInput 
            style={[styles.input, dynamicStyles.input]} 
            placeholder="correo@ejemplo.com" 
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={email} 
            onChangeText={(v) => { setEmail(v); setFormError(null); }} 
            keyboardType="email-address" 
            autoCapitalize="none" 
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, dynamicStyles.label]}>Contraseña <Text style={styles.required}>*</Text></Text>
          <View style={[styles.passwordWrapper, dynamicStyles.input]}>
            <TextInput 
              style={[styles.input, dynamicStyles.input, { flex: 1, borderWidth: 0 }]} 
              placeholder="Mínimo 6 caracteres" 
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={password} 
              onChangeText={(v) => { setPassword(v); setFormError(null); }} 
              secureTextEntry={!showPassword} 
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword ? (
                <EyeOff size={20} color={isDarkMode ? '#a1a1aa' : '#71717a'} />
              ) : (
                <Eye size={20} color={isDarkMode ? '#a1a1aa' : '#71717a'} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, dynamicStyles.label]}>Fecha de Nacimiento <Text style={styles.required}>*</Text></Text>
          <TouchableOpacity style={[styles.input, styles.dateButton, dynamicStyles.input]} onPress={() => setShowPicker(true)}>
            {birthDate ? (
              <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '600' }}>{formatBirthDisplay()}</Text>
            ) : (
              <Text style={{ color: isDarkMode ? '#71717a' : '#aaa', fontSize: 15 }}>Toca para seleccionar fecha de nacimiento</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, dynamicStyles.dividerLine]} />
          <Text style={[styles.dividerText, dynamicStyles.dividerText]}>ESTRUCTURA Y GRUPO SCOUT</Text>
          <View style={[styles.dividerLine, dynamicStyles.dividerLine]} />
        </View>

        {/* SELECCIÓN DE REGIÓN */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, dynamicStyles.label]}>Región Scout <Text style={styles.required}>*</Text></Text>
          <SelectorGrid options={REGIONS_LIST} selected={selectedRegion} onSelect={handleRegionChange} isDarkMode={isDarkMode} />
        </View>

        {/* SELECCIÓN DE DISTRITO */}
        {selectedRegion !== '' && (
          <View style={styles.formGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Distrito Scout <Text style={styles.required}>*</Text></Text>
            <SelectorGrid 
              options={districtOptions} 
              selected={selectedDistrict} 
              onSelect={handleDistrictChange} 
              isDarkMode={isDarkMode}
            />
          </View>
        )}

        {/* SELECCIÓN DE GRUPO SCOUT */}
        {selectedDistrict !== '' && (
          <View style={styles.formGroup}>
            <Text style={[styles.label, dynamicStyles.label]}>Grupo Scout <Text style={styles.required}>*</Text></Text>
            <SelectorGrid 
              options={groupOptions} 
              selected={selectedGroup} 
              onSelect={(id) => { setSelectedGroup(id); setFormError(null); }} 
              isDarkMode={isDarkMode}
            />
          </View>
        )}

        {/* SELECCIÓN DE UNIDAD */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, dynamicStyles.label]}>Unidad / Rama <Text style={styles.required}>*</Text></Text>
          <SelectorGrid 
            options={UNITS} 
            selected={selectedUnit} 
            onSelect={(id) => { setSelectedUnit(id); setFormError(null); }} 
            isDarkMode={isDarkMode}
          />
          {selectedUnit === 'manada' && (
            <View style={{ backgroundColor: 'rgba(99, 102, 241, 0.12)', borderLeftWidth: 4, borderLeftColor: colors.primary, padding: 12, borderRadius: 8, marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', fontSize: 12, color: colors.primary }}>🐾 Registro de Unidad Manada (Perfil del Representante):</Text>
              <Text style={{ fontSize: 11, color: isDarkMode ? '#e4e4e7' : '#4b5563', marginTop: 4, lineHeight: 16 }}>
                Esta cuenta será administrada por el padre o representante. Si tu hijo(a) avanza en el futuro a Tropa, Caminantes o Clan, podrán actualizar el correo electrónico registrado en cualquier momento para mantener la misma cuenta e historial scout.
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleRegister} disabled={loading}>
          {loading
            ? <ActivityIndicator color="white" />
            : <Text style={styles.submitButtonText}>CREAR MI CUENTA E INGRESAR</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={[styles.backButtonText, isDarkMode && { color: '#a1a1aa' }]}>Cancelar y volver al Login</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL CORRECCIÓN DE CORREO */}
      <Modal visible={suggestedEmail !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[modalStyles.card, dynamicStyles.modalCard]}>
            <AlertCircle size={40} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[modalStyles.title, dynamicStyles.modalText]}>¿Escribiste bien tu correo?</Text>
            <Text style={[modalStyles.desc, isDarkMode && { color: '#a1a1aa' }]}>
              Parece que ingresaste un error de tipeo ({email}). ¿Deseas corregirlo automáticamente a:
            </Text>
            <Text style={modalStyles.suggestedText}>{suggestedEmail}</Text>

            <View style={modalStyles.btnRow}>
              <TouchableOpacity 
                style={[modalStyles.btnSecondary, isDarkMode && { backgroundColor: '#27272a' }]} 
                onPress={() => {
                  const target = email.trim().toLowerCase();
                  setSuggestedEmail(null);
                  executeRegistration(target);
                }}
              >
                <Text style={[modalStyles.btnSecondaryText, isDarkMode && { color: '#a1a1aa' }]}>No, dejar {email}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={modalStyles.btnPrimary} 
                onPress={() => {
                  if (suggestedEmail) {
                    setEmail(suggestedEmail);
                    setSuggestedEmail(null);
                    executeRegistration(suggestedEmail);
                  }
                }}
              >
                <Text style={modalStyles.btnPrimaryText}>Corregir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PICKER FECHA DE NACIMIENTO */}
      <Modal visible={showPicker} animationType="slide" transparent>
        <View style={pickerStyles.overlay}>
          <View style={[pickerStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[pickerStyles.header, { borderBottomColor: isDarkMode ? '#27272a' : '#f0f0f0' }]}>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Text style={pickerStyles.cancel}>Cancelar</Text>
              </TouchableOpacity>
              <Text style={[pickerStyles.title, { color: theme.text }]}>Fecha de Nacimiento</Text>
              <TouchableOpacity onPress={confirmDate}>
                <Text style={pickerStyles.confirm}>Confirmar</Text>
              </TouchableOpacity>
            </View>

            <View style={pickerStyles.columnLabels}>
              <Text style={pickerStyles.colLabel}>DÍA</Text>
              <Text style={pickerStyles.colLabel}>MES</Text>
              <Text style={pickerStyles.colLabel}>AÑO</Text>
            </View>

            <View style={[pickerStyles.wheelsRow, { backgroundColor: isDarkMode ? '#27272a' : '#fafafa' }]}>
              <WheelColumn
                items={DAYS}
                selected={pickerDay}
                onSelect={(v) => setPickerDay(v as number)}
              />
              <View style={[pickerStyles.separator, { backgroundColor: isDarkMode ? '#3f3f46' : '#eee' }]} />
              <WheelColumn
                items={Array.from({ length: 12 }, (_, i) => i + 1)}
                selected={pickerMonth}
                onSelect={(v) => setPickerMonth(v as number)}
                labelFn={(v) => MONTHS[(v as number) - 1]}
              />
              <View style={[pickerStyles.separator, { backgroundColor: isDarkMode ? '#3f3f46' : '#eee' }]} />
              <WheelColumn
                items={YEARS}
                selected={pickerYear}
                onSelect={(v) => setPickerYear(v as number)}
              />
            </View>

            <View style={[pickerStyles.preview, { borderTopColor: isDarkMode ? '#27272a' : '#f0f0f0' }]}>
              <Text style={pickerStyles.previewText}>
                {String(pickerDay).padStart(2, '0')} de {MONTHS[pickerMonth - 1]} de {pickerYear}
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1 },
  container: {
    flex: 1,
    width: '100%', maxWidth: 480, alignSelf: 'center',
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  scrollContent: { padding: 28, paddingTop: 40, paddingBottom: 60 },
  headerContainer: { marginBottom: 24, alignItems: 'center' },
  title: { fontSize: 22, fontWeight: 'bold', letterSpacing: 2 },
  subtitle: { fontSize: 14, color: colors.textLight, marginTop: 4 },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: 14,
    borderRadius: 12,
    marginBottom: 20
  },
  errorCardText: {
    flex: 1,
    color: '#991b1b',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18
  },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, marginBottom: 8, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  required: { color: colors.error },
  input: {
    padding: 15, borderRadius: 12,
    fontSize: 15, borderWidth: 1,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingRight: 10
  },
  eyeBtn: {
    padding: 8
  },
  dateButton: { justifyContent: 'center', minHeight: 52 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  submitButton: {
    backgroundColor: colors.primary, padding: 18, borderRadius: 14,
    alignItems: 'center', marginTop: 28,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  submitButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1.5 },
  backButton: { alignItems: 'center', marginTop: 20, padding: 10 },
  backButtonText: { fontSize: 14, textDecorationLine: 'underline' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});

const modalStyles = StyleSheet.create({
  card: { width: '100%', maxWidth: 400, borderRadius: 20, padding: 24, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 10 },
  suggestedText: { fontSize: 16, fontWeight: 'bold', color: colors.primary, marginBottom: 20 },
  btnRow: { flexDirection: 'row', width: '100%', gap: 10 },
  btnSecondary: { flex: 1, paddingVertical: 12, backgroundColor: '#f1f5f9', borderRadius: 10, alignItems: 'center' },
  btnSecondaryText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
  btnPrimary: { flex: 1, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' },
  btnPrimaryText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingBottom: 40, paddingTop: 8,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: 'bold' },
  cancel: { fontSize: 16, color: colors.textLight },
  confirm: { fontSize: 16, color: colors.primary, fontWeight: 'bold' },
  columnLabels: {
    flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  colLabel: {
    flex: 1, textAlign: 'center', fontSize: 11,
    fontWeight: '700', color: '#bbb', letterSpacing: 1,
  },
  wheelsRow: {
    flexDirection: 'row', paddingHorizontal: 20,
    marginHorizontal: 16, borderRadius: 16,
  },
  separator: { width: 1, marginVertical: 10 },
  preview: {
    alignItems: 'center', paddingVertical: 14, marginTop: 8,
    borderTopWidth: 1, marginHorizontal: 20,
  },
  previewText: { fontSize: 16, color: colors.primary, fontWeight: '600' },
});
