import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, ActivityIndicator
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { Edit2, ShieldCheck, AlertTriangle, Plus, Camera, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { UserScoutAvatar } from '../components/UserScoutAvatar';
import { DualProfileAvatar } from '../components/DualProfileAvatar';
import { CarnetScoutModal } from '../components/CarnetScoutModal';
import NotificationHeaderBell from '../components/NotificationHeaderBell';
import { storageService } from '../lib/storageService';
import { showAlert } from '../utils/alert';
import { navigateBackOrHome } from '../utils/navigationHelper';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ITEM_H  = 44;
const CY      = new Date().getFullYear();
const YEARS   = Array.from({ length: CY - 1949 }, (_, i) => 1950 + i).reverse();
const DAYS    = Array.from({ length: 31 }, (_, i) => i + 1);

function WheelColumn({ items, selected, onSelect, labelFn }: {
  items: (number | string)[];
  selected: number | string;
  onSelect: (v: number | string) => void;
  labelFn?: (v: number | string) => string;
}) {
  const label = (v: number | string) => labelFn ? labelFn(v) : String(v);
  return (
    <View style={{ flex: 1, maxHeight: ITEM_H * 5, overflow: 'hidden' }}>
      <FlatList
        data={items}
        keyExtractor={v => String(v)}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        initialScrollIndex={Math.max(0, items.indexOf(selected))}
        getItemLayout={(_, i) => ({ length: ITEM_H, offset: ITEM_H * i, index: i })}
        ListHeaderComponent={<View style={{ height: ITEM_H * 2 }} />}
        ListFooterComponent={<View style={{ height: ITEM_H * 2 }} />}
        onScroll={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (idx >= 0 && idx < items.length && items[idx] !== selected) onSelect(items[idx]);
        }}
        scrollEventThrottle={16}
        onMomentumScrollEnd={e => {
          const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
          if (idx >= 0 && idx < items.length) onSelect(items[idx]);
        }}
        renderItem={({ item }) => {
          const sel = item === selected;
          return (
            <TouchableOpacity
              style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}
              onPress={() => onSelect(item)}
            >
              <Text style={{ fontSize: sel ? 18 : 15, fontWeight: sel ? 'bold' : 'normal',
                color: sel ? colors.primary : '#bbb' }}>
                {label(item)}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

function DatePickerModal({ visible, title, day, month, year,
  onDay, onMonth, onYear, onConfirm, onCancel }: {
  visible: boolean; title: string;
  day: number; month: number; year: number;
  onDay: (v: number) => void; onMonth: (v: number) => void; onYear: (v: number) => void;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.header}>
            <TouchableOpacity onPress={onCancel}><Text style={mStyles.cancel}>Cancelar</Text></TouchableOpacity>
            <Text style={mStyles.title}>{title}</Text>
            <TouchableOpacity onPress={onConfirm}><Text style={mStyles.confirm}>Guardar</Text></TouchableOpacity>
          </View>
          <View style={mStyles.labels}>
            {['DÍA','MES','AÑO'].map(l => <Text key={l} style={mStyles.colLabel}>{l}</Text>)}
          </View>
          <View style={mStyles.wheels}>
            <WheelColumn items={DAYS} selected={day} onSelect={v => onDay(+v)} />
            <View style={mStyles.sep} />
            <WheelColumn items={Array.from({length:12},(_,i)=>i+1)} selected={month}
              onSelect={v => onMonth(+v)} labelFn={v => MONTHS[+v-1]} />
            <View style={mStyles.sep} />
            <WheelColumn items={YEARS} selected={year} onSelect={v => onYear(+v)} />
          </View>
          <Text style={mStyles.preview}>
            {String(day).padStart(2,'0')} de {MONTHS[month-1]} de {year}
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function EditRow({ label, value, onEdit, placeholder = 'Toca para agregar', highlight = false, readonly = false, isDarkMode = false }: {
  label: string; value: string; onEdit?: () => void;
  placeholder?: string; highlight?: boolean; readonly?: boolean; isDarkMode?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        rowStyles.row, 
        { borderBottomColor: isDarkMode ? '#27272a' : '#f5f5f5' },
        highlight && (isDarkMode ? rowStyles.rowHighlightDark : rowStyles.rowHighlight)
      ]}
      onPress={onEdit}
      disabled={readonly}
      activeOpacity={readonly ? 1 : 0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={[rowStyles.label, { color: isDarkMode ? '#a1a1aa' : colors.textLight }]}>{label}</Text>
        <Text style={[
          rowStyles.value,
          { color: isDarkMode ? '#f4f4f5' : '#222222' },
          !value && { color: isDarkMode ? '#fbbf24' : '#888888', fontStyle: 'italic', fontWeight: 'bold' }
        ]}>
          {value || placeholder}
        </Text>
      </View>
      {!readonly && <Edit2 size={16} color={highlight ? (isDarkMode ? '#fbbf24' : colors.primary) : (isDarkMode ? '#a1a1aa' : '#888888')} />}
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1 },
  rowHighlight: { backgroundColor: '#faf5ff', borderRadius: 8, paddingHorizontal: 10, marginHorizontal: -10 },
  rowHighlightDark: { backgroundColor: '#3b0764', borderRadius: 8, paddingHorizontal: 10, marginHorizontal: -10 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '500' },
});

function ProfileProgress({ pct, isDarkMode = false }: { pct: number; isDarkMode?: boolean }) {
  const barColor = pct === 100 ? '#22c55e' : pct >= 60 ? colors.primary : '#f59e0b';
  return (
    <View style={[progStyles.wrapper, { backgroundColor: isDarkMode ? '#18181b' : 'white', borderColor: isDarkMode ? '#27272a' : 'transparent', borderWidth: isDarkMode ? 1 : 0 }]}>
      <View style={progStyles.top}>
        <Text style={[progStyles.label, { color: isDarkMode ? '#ffffff' : '#333333' }]}>Completitud del perfil</Text>
        <Text style={[progStyles.pct, { color: barColor }]}>{pct}%</Text>
      </View>
      <View style={[progStyles.barBg, { backgroundColor: isDarkMode ? '#27272a' : '#eee' }]}>
        <View style={[progStyles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
      </View>
      {pct < 100 && <Text style={[progStyles.hint, { color: isDarkMode ? '#a1a1aa' : colors.textLight }]}>Completa tus datos para llegar al 100% ✨</Text>}
    </View>
  );
}

const progStyles = StyleSheet.create({
  wrapper: { marginHorizontal: 20, marginBottom: 14, padding: 18, borderRadius: 16, elevation: 3 },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  label: { fontWeight: '700', fontSize: 14 },
  pct: { fontWeight: 'bold', fontSize: 16 },
  barBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 4 },
  hint: { fontSize: 12, fontStyle: 'italic' },
});

export default function ProfileScreen({ navigation }: any) {
  const { user, refreshProfile, updateUserProfile } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [cedula,      setCedula]      = useState('');
  const [birthDate,   setBirthDate]   = useState('');
  const [promiseDate, setPromiseDate] = useState('');
  const [joinDate,    setJoinDate]    = useState('');
  const [phone,       setPhone]       = useState('');
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);

  const [showPromisePicker, setShowPromisePicker] = useState(false);
  const [showJoinPicker,    setShowJoinPicker]    = useState(false);
  const [showBirthPicker,   setShowBirthPicker]   = useState(false);
  const [showPhoneEdit,     setShowPhoneEdit]     = useState(false);
  const [showCedulaEdit,    setShowCedulaEdit]    = useState(false);
  const [phoneInput,        setPhoneInput]        = useState('');
  const [cedulaInput,       setCedulaInput]       = useState('');
  const [showCarnetModal,   setShowCarnetModal]   = useState(false);

  const todayY = new Date().getFullYear();
  const [pDay, setPDay] = useState(1);  const [pMonth, setPMonth] = useState(1);  const [pYear, setPYear] = useState(todayY);
  const [jDay, setJDay] = useState(1);  const [jMonth, setJMonth] = useState(1);  const [jYear, setJYear] = useState(todayY);
  const [bDay, setBDay] = useState(1);  const [bMonth, setBMonth] = useState(1);  const [bYear, setBYear] = useState(2010);

  const [membershipExpiresAt, setMembershipExpiresAt] = useState('');
  const [membershipStatus,    setMembershipStatus]    = useState('');
  const [membershipRejectedReason, setMembershipRejectedReason] = useState('');

  const [scoutAvatarUrl, setScoutAvatarUrl] = useState(user?.avatar_url || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState(user?.custom_avatar_url || '');

  useFocusEffect(useCallback(() => { loadProfile(); }, []));

  const loadProfile = async () => {
    setLoading(true);
    if (!user?.id) { setLoading(false); return; }

    // 1. Inicializar de inmediato con los datos del usuario en memoria/AsyncStorage
    if (user.cedula) setCedula(user.cedula);
    if (user.birth_date) setBirthDate(user.birth_date);
    if (user.promise_date) setPromiseDate(user.promise_date);
    if (user.join_date) setJoinDate(user.join_date);
    if (user.phone) setPhone(user.phone);
    if (user.avatar_url) setScoutAvatarUrl(user.avatar_url);
    if (user.custom_avatar_url) setCustomAvatarUrl(user.custom_avatar_url);
    if (user.membership_status) setMembershipStatus(user.membership_status);
    if (user.membership_expires_at) setMembershipExpiresAt(user.membership_expires_at);

    if (user.birth_date) {
      const [y,m,d] = user.birth_date.split('-');
      if (y && m && d) { setBYear(+y); setBMonth(+m); setBDay(+d); }
    }
    if (user.promise_date) {
      const [y,m,d] = user.promise_date.split('-');
      if (y && m && d) { setPYear(+y); setPMonth(+m); setPDay(+d); }
    }
    if (user.join_date) {
      const [y,m,d] = user.join_date.split('-');
      if (y && m && d) { setJYear(+y); setJMonth(+m); setJDay(+d); }
    }

    // 2. Consultar Supabase DB
    try {
      const { data } = await supabase
        .from('profiles')
        .select('promise_date, birth_date, join_date, phone, cedula, membership_expires_at, membership_status, membership_rejected_reason, avatar_url, custom_avatar_url')
        .eq('id', user.id)
        .single();
      if (data) {
        if (data.cedula) setCedula(data.cedula);
        if (data.birth_date) setBirthDate(data.birth_date);
        if (data.promise_date) setPromiseDate(data.promise_date);
        if (data.join_date) setJoinDate(data.join_date);
        if (data.phone) setPhone(data.phone);
        if (data.membership_expires_at) setMembershipExpiresAt(data.membership_expires_at);
        if (data.membership_status) setMembershipStatus(data.membership_status);
        if (data.membership_rejected_reason) setMembershipRejectedReason(data.membership_rejected_reason);
        setScoutAvatarUrl(data.avatar_url || '');
        setCustomAvatarUrl(data.custom_avatar_url || '');

        if (data.birth_date) {
          const [y,m,d] = data.birth_date.split('-');
          if (y && m && d) { setBYear(+y); setBMonth(+m); setBDay(+d); }
        }
        if (data.promise_date) {
          const [y,m,d] = data.promise_date.split('-');
          if (y && m && d) { setPYear(+y); setPMonth(+m); setPDay(+d); }
        }
        if (data.join_date) {
          const [y,m,d] = data.join_date.split('-');
          if (y && m && d) { setJYear(+y); setJMonth(+m); setJDay(+d); }
        }
      }
    } catch (e) {
      console.warn('Modo offline en loadProfile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = async (type: 'scout' | 'custom', newUrl: string) => {
    if (!user?.id) return;
    const fieldToUpdate = type === 'scout' ? 'avatar_url' : 'custom_avatar_url';
    if (type === 'scout') {
      setScoutAvatarUrl(newUrl);
    } else {
      setCustomAvatarUrl(newUrl);
    }
    await updateUserProfile({ [fieldToUpdate]: newUrl });

    try {
      const fileName = `${type}_avatar_${user.id}_${Date.now()}.jpg`;
      const uploadedUrl = await storageService.uploadImage(
        'scout-files',
        `avatars/${user.id}`,
        fileName,
        newUrl
      );

      await supabase.from('profiles').update({ [fieldToUpdate]: uploadedUrl }).eq('id', user.id);
      await updateUserProfile({ [fieldToUpdate]: uploadedUrl });
      await refreshProfile();
    } catch (err: any) {
      console.warn('Error subiendo foto de perfil:', err);
    }
  };

  const handleDeletePhoto = async (type: 'scout' | 'custom') => {
    if (!user?.id) return;
    const fieldToUpdate = type === 'scout' ? 'avatar_url' : 'custom_avatar_url';
    if (type === 'scout') {
      setScoutAvatarUrl('');
    } else {
      setCustomAvatarUrl('');
    }
    await updateUserProfile({ [fieldToUpdate]: null });
    try {
      await supabase.from('profiles').update({ [fieldToUpdate]: null }).eq('id', user.id);
      await refreshProfile();
      showAlert('Foto Eliminada', 'Se ha eliminado la foto de perfil.');
    } catch (err: any) {
      console.warn('Error eliminando foto de perfil:', err);
    }
  };

  const calcCompletion = () => {
    const requiredFields = [
      user?.name,
      user?.email,
      user?.unit,
      user?.group_name,
      cedula || user?.cedula,
      birthDate || user?.birth_date,
      promiseDate || user?.promise_date,
      joinDate || user?.join_date,
      phone || user?.phone,
      scoutAvatarUrl || user?.avatar_url || customAvatarUrl || user?.custom_avatar_url,
    ];
    const filled = requiredFields.filter(f => f && String(f).trim().length > 0).length;
    return Math.round((filled / requiredFields.length) * 100);
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d} de ${MONTHS[+m - 1]} de ${y}`;
  };

  const saveField = async (field: string, val: string) => {
    if (!user?.id) return;
    setSaving(true);
    
    // 1. Guardar de inmediato en estado de la app y caché local
    await updateUserProfile({ [field]: val });

    // 2. Guardar en Supabase Auth metadata
    try {
      await supabase.auth.updateUser({ data: { [field]: val } });
    } catch (e) {
      console.warn('Aviso guardando user_metadata:', e);
    }

    // 3. Guardar en Supabase DB tabla profiles
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ [field]: val })
        .eq('id', user.id);
      if (error) {
        console.warn('Aviso guardando en tabla profiles:', error.message);
      }
    } catch (e) {
      console.warn('Excepción guardando en profiles:', e);
    }

    setSaving(false);
    await refreshProfile();
  };

  const confirmBirth = () => {
    const val = `${bYear}-${String(bMonth).padStart(2,'0')}-${String(bDay).padStart(2,'0')}`;
    setBirthDate(val);
    setShowBirthPicker(false);
    saveField('birth_date', val);
  };

  const confirmPromise = () => {
    const val = `${pYear}-${String(pMonth).padStart(2,'0')}-${String(pDay).padStart(2,'0')}`;
    setPromiseDate(val);
    setShowPromisePicker(false);
    saveField('promise_date', val);
  };

  const confirmJoin = () => {
    const val = `${jYear}-${String(jMonth).padStart(2,'0')}-${String(jDay).padStart(2,'0')}`;
    setJoinDate(val);
    setShowJoinPicker(false);
    saveField('join_date', val);
  };

  const confirmPhone = () => {
    setPhone(phoneInput);
    setShowPhoneEdit(false);
    saveField('phone', phoneInput);
  };

  const confirmCedula = () => {
    setCedula(cedulaInput);
    setShowCedulaEdit(false);
    saveField('cedula', cedulaInput);
  };

  const handleAvatarPress = () => {
    showAlert(
      '📷 Foto de Perfil Institucional',
      '⚠️ ADVERTENCIA INSTITUCIONAL: La foto de perfil debe ser un retrato oficial de frente, con fondo claro y vestimenta/pañoleta scout adecuada para documentos oficiales y Carnet Scout.'
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const completion = calcCompletion();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* TARJETA DE CABECERA CON AVATAR DUAL SWIPEABLE */}
      <View style={[styles.headerCard, isDarkMode && { backgroundColor: '#121214', borderBottomColor: '#27272a' }]}>
        <View style={{ width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          {navigation?.canGoBack?.() ? (
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
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Volver</Text>
            </TouchableOpacity>
          ) : <View />}
          <NotificationHeaderBell />
        </View>
        <View style={{ marginBottom: 12 }}>
          <DualProfileAvatar
            scoutAvatarUrl={scoutAvatarUrl}
            customAvatarUrl={customAvatarUrl}
            unit={user?.unit || undefined}
            role={user?.role}
            size={96}
            editable={true}
            onPhotoChange={handlePhotoChange}
            onDeletePhoto={handleDeletePhoto}
          />
        </View>
        <Text style={[styles.name, { color: theme.text }]}>{user?.name || 'Scout'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.badgeRow}>
          <View style={styles.unitBadge}>
            <Text style={styles.unitBadgeText}>
              {(user?.unit || 'Manada').toUpperCase()}
            </Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>
              {user?.role === 'nacional' || user?.role === 'admin'
                ? 'DIRECCIÓN NACIONAL'
                : user?.role === 'comisionado_regional'
                ? 'COMISIONADO REGIONAL'
                : user?.role === 'comisionado_distrital'
                ? 'COMISIONADO DISTRITAL'
                : user?.role === 'jefe_grupo'
                ? 'JEFE DE GRUPO'
                : user?.role === 'scouter'
                ? 'DIRIGENTE SCOUTER'
                : 'SCOUT'}
            </Text>
          </View>
          {membershipStatus === 'approved' && (
            <View style={[styles.roleBadge, { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#16a34a' }]}>
              <Text style={{ color: '#15803d', fontWeight: 'bold', fontSize: 11 }}>
                ✓ MEMBRESÍA ACTIVA
              </Text>
            </View>
          )}
        </View>

        {/* ÚNICAMENTE CUANDO SE APRUEBE LA MEMBRESÍA/CARNET SE MUESTRA EL BOTÓN VERIFICADO */}
        {membershipStatus === 'approved' && (
          <TouchableOpacity
            style={[styles.carnetTriggerBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCarnetModal(true)}
          >
            <ShieldCheck size={18} color="white" style={{ marginRight: 6 }} />
            <Text style={[styles.carnetTriggerText, { color: 'white' }]}>
              🪪 VER Y DESCARGAR CARNET SCOUT OFICIAL ✓
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* BARRA DE COMPLETITUD */}
      <ProfileProgress pct={completion} isDarkMode={isDarkMode} />

      {/* SECCIÓN 1: DATOS SCOUT */}
      <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.sectionHeader, { color: isDarkMode ? '#c084fc' : colors.primary }]}>INFORMACIÓN SCOUT</Text>

        <EditRow
          label="Cédula de Identidad"
          value={cedula}
          onEdit={() => { setCedulaInput(cedula); setShowCedulaEdit(true); }}
          placeholder="Añadir Cédula de Identidad"
          highlight={!cedula}
          isDarkMode={isDarkMode}
        />

        <EditRow
          label="Región"
          value={user?.region ? user.region.toUpperCase() : ''}
          readonly
          isDarkMode={isDarkMode}
        />
        <EditRow
          label="Distrito Scout"
          value={user?.district ? user.district.toUpperCase() : 'GUARENAS GUATIRE'}
          readonly
          isDarkMode={isDarkMode}
        />
        <EditRow
          label="Grupo Scout"
          value={user?.group_name ? (user.group_name.trim().toLowerCase().startsWith('grupo') ? user.group_name.trim() : `Grupo ${user.group_name.trim()}`) : ''}
          readonly
          isDarkMode={isDarkMode}
        />
        <EditRow
          label="Unidad Actual"
          value={user?.unit ? user.unit.toUpperCase() : ''}
          readonly
          isDarkMode={isDarkMode}
        />
        <EditRow
          label="Fecha de Promesa"
          value={formatDateDisplay(promiseDate)}
          onEdit={() => setShowPromisePicker(true)}
          placeholder="Añadir fecha de Promesa"
          highlight={!promiseDate}
          isDarkMode={isDarkMode}
        />
        <EditRow
          label="Ingreso a la Unidad"
          value={formatDateDisplay(joinDate)}
          onEdit={() => setShowJoinPicker(true)}
          placeholder="Añadir fecha de ingreso"
          highlight={!joinDate}
          isDarkMode={isDarkMode}
        />
      </View>

      {/* SECCIÓN 2: CARNET Y ESTADO DE MEMBRESÍA */}
      <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.sectionHeader, { color: isDarkMode ? '#c084fc' : colors.primary }]}>ESTADO DE MEMBRESÍA Y CARNET</Text>

        {membershipStatus === 'approved' ? (
          <View style={[styles.cardAvailableBox, { backgroundColor: isDarkMode ? '#14532d' : '#dcfce7', borderColor: '#16a34a' }]}>
            <Text style={{ fontWeight: 'bold', color: isDarkMode ? '#86efac' : '#15803d', fontSize: 13 }}>
              ✓ MEMBRESÍA REGISTRADA Y APROBADA
            </Text>
            <Text style={{ color: isDarkMode ? '#f4f4f5' : '#334155', fontSize: 12, marginTop: 4 }}>
              Válida hasta el: <Text style={{ fontWeight: 'bold' }}>{membershipExpiresAt}</Text>
            </Text>
          </View>
        ) : membershipStatus === 'pending_approval' ? (
          <View style={[styles.cardMissingBox, { backgroundColor: isDarkMode ? '#451a03' : '#fef3c7', borderColor: '#d97706' }]}>
            <Text style={{ fontWeight: 'bold', color: isDarkMode ? '#fcd34d' : '#b45309', fontSize: 13, marginBottom: 4 }}>
              ⏳ MEMBRESÍA EN ESPERA DE APROBACIÓN
            </Text>
            <Text style={{ color: isDarkMode ? '#f4f4f5' : '#451a03', fontSize: 12, lineHeight: 18 }}>
              Tu Scouter asignó la fecha <Text style={{ fontWeight: 'bold' }}>{membershipExpiresAt}</Text>. La Jefatura de Grupo la aprobará en breve.
            </Text>
          </View>
        ) : membershipStatus === 'rejected' ? (
          <View style={[styles.cardMissingBox, { backgroundColor: isDarkMode ? '#450a0a' : '#fee2e2', borderColor: '#ef4444' }]}>
            <Text style={{ fontWeight: 'bold', color: isDarkMode ? '#fca5a5' : '#991b1b', fontSize: 13, marginBottom: 4 }}>
              ❌ MEMBRESÍA RECHAZADA
            </Text>
            <Text style={{ color: isDarkMode ? '#f4f4f5' : '#7f1d1d', fontSize: 12, lineHeight: 18 }}>
              Motivo: {membershipRejectedReason || 'No especificado por Jefatura'}. Por favor consulta con tu Scouter de Unidad.
            </Text>
          </View>
        ) : (
          <View style={[styles.cardMissingBox, { backgroundColor: isDarkMode ? '#1e1b4b' : '#eff6ff', borderColor: '#3b82f6' }]}>
            <Text style={{ fontWeight: 'bold', color: isDarkMode ? '#93c5fd' : '#1d4ed8', fontSize: 13, marginBottom: 4 }}>
              📋 SIN REGISTRO DE MEMBRESÍA
            </Text>
            <Text style={{ color: isDarkMode ? '#f4f4f5' : '#1e3a8a', fontSize: 12, lineHeight: 18 }}>
              Tu Scouter de Unidad debe registrar y asignar tu fecha de vencimiento de membresía scout.
            </Text>
          </View>
        )}
      </View>

      {/* SECCIÓN 3: DATOS PERSONALES */}
      <View style={[styles.section, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
        <Text style={[styles.sectionHeader, { color: isDarkMode ? '#c084fc' : colors.primary }]}>DATOS PERSONALES</Text>

        <EditRow
          label="Fecha de Nacimiento"
          value={formatDateDisplay(birthDate)}
          onEdit={() => setShowBirthPicker(true)}
          placeholder="Añadir fecha de nacimiento"
          highlight={!birthDate}
          isDarkMode={isDarkMode}
        />
        <EditRow
          label="Teléfono de Contacto"
          value={phone}
          onEdit={() => { setPhoneInput(phone); setShowPhoneEdit(true); }}
          placeholder="Añadir teléfono"
          highlight={!phone}
          isDarkMode={isDarkMode}
        />
      </View>

      {saving && (
        <View style={styles.savingOverlay}>
          <ActivityIndicator color="white" />
          <Text style={{ color: 'white', marginTop: 8, fontWeight: 'bold' }}>Guardando cambios...</Text>
        </View>
      )}

      <DatePickerModal
        visible={showBirthPicker}
        title="Fecha de Nacimiento"
        day={bDay} month={bMonth} year={bYear}
        onDay={setBDay} onMonth={setBMonth} onYear={setBYear}
        onConfirm={confirmBirth}
        onCancel={() => setShowBirthPicker(false)}
      />

      <DatePickerModal
        visible={showPromisePicker}
        title="Fecha de Promesa Scout"
        day={pDay} month={pMonth} year={pYear}
        onDay={setPDay} onMonth={setPMonth} onYear={setPYear}
        onConfirm={confirmPromise}
        onCancel={() => setShowPromisePicker(false)}
      />

      <DatePickerModal
        visible={showJoinPicker}
        title="Fecha de Ingreso a la Unidad"
        day={jDay} month={jMonth} year={jYear}
        onDay={setJDay} onMonth={setJMonth} onYear={setJYear}
        onConfirm={confirmJoin}
        onCancel={() => setShowJoinPicker(false)}
      />

      <Modal visible={showPhoneEdit} transparent animationType="fade">
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, { padding: 24, borderRadius: 20 }]}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 12 }}>Teléfono de Contacto</Text>
            <TextInput
              style={{ backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20 }}
              placeholder="Ej: +58 412 1234567"
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowPhoneEdit(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmPhone} style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCedulaEdit} transparent animationType="fade">
        <View style={mStyles.overlay}>
          <View style={[mStyles.sheet, { padding: 24, borderRadius: 20 }]}>
            <Text style={{ fontSize: 17, fontWeight: 'bold', marginBottom: 12 }}>Cédula de Identidad</Text>
            <TextInput
              style={{ backgroundColor: '#f5f5f5', borderRadius: 10, padding: 12, fontSize: 15, marginBottom: 20 }}
              placeholder="Ej: V-12.345.678 / 12345678"
              value={cedulaInput}
              onChangeText={setCedulaInput}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
              <TouchableOpacity onPress={() => setShowCedulaEdit(false)} style={{ padding: 10 }}>
                <Text style={{ color: '#888' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmCedula} style={{ backgroundColor: colors.primary, padding: 10, borderRadius: 8 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <CarnetScoutModal
        visible={showCarnetModal}
        user={user ? { ...user, cedula } : null}
        onClose={() => setShowCarnetModal(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: 'white', alignItems: 'center', padding: 24,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 16,
  },
  avatarCircle: { marginBottom: 12 },
  name: { fontSize: 22, fontWeight: 'bold' },
  email: { fontSize: 13, color: colors.textLight, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  unitBadge: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  unitBadgeText: { color: colors.primary, fontWeight: 'bold', fontSize: 12 },
  roleBadge: { backgroundColor: '#f3f4f6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleBadgeText: { color: '#4b5563', fontWeight: 'bold', fontSize: 12 },

  carnetTriggerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, marginTop: 16, width: '100%'
  },
  carnetTriggerText: { fontWeight: 'bold', fontSize: 12 },

  section: {
    marginHorizontal: 20, marginBottom: 16, padding: 20, borderRadius: 16,
    borderWidth: 1, elevation: 2,
  },
  sectionHeader: {
    fontSize: 12, fontWeight: '800', color: colors.primary,
    letterSpacing: 1, marginBottom: 8,
  },
  cardAvailableBox: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  cardMissingBox: { padding: 14, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  savingOverlay: {
    position: 'absolute', top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
});

const mStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, paddingTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 16, fontWeight: 'bold', color: colors.text },
  cancel: { fontSize: 15, color: colors.textLight },
  confirm: { fontSize: 15, color: colors.primary, fontWeight: 'bold' },
  labels: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12 },
  colLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#bbb' },
  wheels: { flexDirection: 'row', paddingHorizontal: 20, backgroundColor: '#fafafa', marginHorizontal: 16, borderRadius: 16 },
  sep: { width: 1, backgroundColor: '#eee', marginVertical: 8 },
  preview: { textAlign: 'center', paddingTop: 14, color: colors.primary, fontWeight: 'bold', fontSize: 15 },
});
