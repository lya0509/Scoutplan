import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Platform, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import HelpFloatingFAB from '../components/HelpFloatingFAB';
import { supabase } from '../lib/supabaseClient';
import { dataService } from '../lib/dataService';
import { notificationService } from '../services/notificationService';
import { colors, UNIT_COLORS } from '../theme/colors';
import {
  Users, Award, Calendar, Calendar as CalendarIcon, Moon, Sun, FileText,
  ChevronRight, ChevronDown, ChevronUp, Camera, BookOpen, Palette, Plus, X,
  Shield, ShieldCheck, Flag, Sparkles, Download, Printer, Search, CheckCircle2,
  AlertTriangle, Clock, RefreshCw, Eye, CheckCircle, Check, Phone, LogOut
} from 'lucide-react-native';
import { showAlert } from '../utils/alert';
import { ThemeCustomizerModal } from '../components/ThemeCustomizerModal';
import { DualProfileAvatar } from '../components/DualProfileAvatar';
import { useModalBackHandler } from '../hooks/useBackHandler';
import NotificationHeaderBell from '../components/NotificationHeaderBell';
import {
  exportCensoExcel, exportPadronMedicoExcel, exportMembresiasExcel, printDocumentHTML, MemberRecord
} from '../utils/exportHelpers';

function formatDateWithDayOfWeek(dateStr: string): string {
  if (!dateStr) return 'Seleccionar fecha en el calendario';
  try {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    const dateObj = new Date(+y, +m - 1, +d, 12, 0, 0);
    const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const monthName = dateObj.toLocaleDateString('es-ES', { month: 'long' });
    const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `📅 ${capitalizedDay}, ${+d} de ${capitalizedMonth} de ${y}`;
  } catch (e) {
    return dateStr;
  }
}

export default function JefeGrupoScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { isDarkMode, theme, primaryColor, toggleDarkMode } = useTheme();

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allMembers, setAllMembers] = useState<any[]>([]);

  const [stats, setStats] = useState({
    manada: 0,
    tropa: 0,
    comunidad: 0,
    clan: 0,
    scouters: 0,
    insigniasAprobadas: 0
  });

  // Estado de secciones expandidas
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    manada: true,
    tropa: true,
    caminantes: true,
    clan: true,
    jefatura: false
  });

  const toggleSection = (section: string) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // 1. Modal para agregar actividad grupal o asamblea de scouters
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventUnit, setEventUnit] = useState<'grupo' | 'scouters' | 'manada' | 'tropa' | 'comunidad' | 'clan'>('grupo');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

  // 2. Modal Censo y Nómina Oficial
  const [showCensoModal, setShowCensoModal] = useState(false);
  const [censoSearch, setCensoSearch] = useState('');
  const [censoUnitFilter, setCensoUnitFilter] = useState('all');

  // 3. Modal Padrón de Emergencia Médica
  const [showPadronMedicoModal, setShowPadronMedicoModal] = useState(false);
  const [medicoSearch, setMedicoSearch] = useState('');
  const [medicoUnitFilter, setMedicoUnitFilter] = useState('all');

  // 4. Modal Semáforo de Membresías y Carnets
  const [showSemaforoModal, setShowSemaforoModal] = useState(false);
  const [semaforoSearch, setSemaforoSearch] = useState('');
  const [semaforoStatusFilter, setSemaforoStatusFilter] = useState<'all' | 'pending' | 'expiring_1m' | 'expiring_3m' | 'expired' | 'active'>('all');
  const [selectedMemberForMembership, setSelectedMemberForMembership] = useState<any>(null);
  const [membershipDateInput, setMembershipDateInput] = useState('');
  const [showMembershipDatePicker, setShowMembershipDatePicker] = useState(false);
  const [approvingBatch, setApprovingBatch] = useState(false);

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(showAddEventModal, () => setShowAddEventModal(false));
  useModalBackHandler(showCensoModal, () => setShowCensoModal(false));
  useModalBackHandler(showPadronMedicoModal, () => setShowPadronMedicoModal(false));
  useModalBackHandler(showSemaforoModal, () => setShowSemaforoModal(false));

  useFocusEffect(
    useCallback(() => {
      loadStatsAndMembers();
    }, [user?.group_name])
  );

  const loadStatsAndMembers = async () => {
    setLoading(true);
    if (!user?.group_name) {
      setLoading(false);
      return;
    }

    try {
      // 1. Obtener todos los miembros (Scouts, Scouters y Jefatura) del grupo
      const { data: members, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('group_name', user.group_name)
        .order('name', { ascending: true });

      if (!error && members) {
        setAllMembers(members);

        const scoutsOnly = members.filter(m => m.role === 'scout');
        const manada = scoutsOnly.filter(s => s.unit === 'manada').length;
        const tropa = scoutsOnly.filter(s => s.unit === 'tropa').length;
        const comunidad = scoutsOnly.filter(s => s.unit === 'caminantes' || s.unit === 'comunidad').length;
        const clan = scoutsOnly.filter(s => s.unit === 'clan').length;
        const scouters = members.filter(m => m.role === 'scouter' || m.role === 'jefe_grupo').length;

        // 2. Contar insignias aprobadas
        const { count } = await supabase
          .from('stage_progress')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'Aprobada');

        setStats({
          manada,
          tropa,
          comunidad,
          clan,
          scouters,
          insigniasAprobadas: count || 0
        });
      }
    } catch (e) {
      console.warn('Error cargando datos de jefatura:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!eventTitle.trim()) {
      showAlert('Campo obligatorio', 'Por favor ingresa un título para el evento.');
      return;
    }
    if (!eventDate.trim()) {
      showAlert('Campo obligatorio', 'Por favor selecciona una fecha para el evento.');
      return;
    }

    setSavingEvent(true);
    try {
      const { error } = await supabase.from('calendar_events').insert({
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        date: eventDate.trim(),
        unit: eventUnit,
        created_by: user?.id,
      });

      if (error) {
        showAlert('Error al crear evento', error.message);
      } else {
        const destLabel = eventUnit === 'grupo' ? 'Todo el Grupo Scout' : eventUnit === 'scouters' ? 'Solo Scouters (Asamblea)' : eventUnit.toUpperCase();
        showAlert('¡Actividad Creada!', `La actividad "${eventTitle}" ha sido registrada en el calendario para ${destLabel}.`);

        // Enviar notificación en vivo instantánea
        notificationService.sendNotification({
          senderId: user?.id,
          groupName: user?.group_name || undefined,
          unit: eventUnit === 'grupo' ? undefined : eventUnit,
          receiverRole: eventUnit === 'scouters' ? 'scouter' : undefined,
          title: `📅 ${eventTitle}`,
          message: `Nueva actividad programada para el ${formatDateWithDayOfWeek(eventDate)} (${destLabel}).`,
          type: 'calendar'
        }).catch(() => {});

        setShowAddEventModal(false);
        setEventTitle('');
        setEventDesc('');
      }
    } catch (err: any) {
      showAlert('Error', err?.message || 'No se pudo registrar la actividad.');
    } finally {
      setSavingEvent(false);
    }
  };

  // Acciones de Membresías
  const handleApproveMembership = async (memberId: string) => {
    await dataService.approveMembershipDate(memberId);
    showAlert('Membresía Aprobada', 'El carnet del miembro ha sido validado institucionalmente.');

    // Notificación en vivo al Scout
    notificationService.sendNotification({
      senderId: user?.id,
      receiverId: memberId,
      title: '🪪 ¡Membresía y Carnet Aprobados!',
      message: 'Jefatura de Grupo ha validado tu membresía institucional. Ya puedes descargar tu Carnet Scout Oficial.',
      type: 'membership'
    }).catch(() => {});

    loadStatsAndMembers();
  };

  const handleBatchApprove = async () => {
    const pending = allMembers.filter(m => m.membership_status === 'pending_approval' || m.membership_status === 'pending');
    if (pending.length === 0) {
      showAlert('Sin Pendientes', 'No hay solicitudes de membresía pendientes por aprobar.');
      return;
    }

    setApprovingBatch(true);
    try {
      for (const p of pending) {
        await dataService.approveMembershipDate(p.id);
        notificationService.sendNotification({
          senderId: user?.id,
          receiverId: p.id,
          title: '🪪 ¡Membresía Aprobada!',
          message: 'Tu carnet scout oficial ha sido activado por Jefatura de Grupo.',
          type: 'membership'
        }).catch(() => {});
      }
      showAlert('¡Aprobación Masiva Exitosa!', `Se han aprobado institucionalmente ${pending.length} membresías.`);
      loadStatsAndMembers();
    } catch (e: any) {
      showAlert('Error', e?.message || 'Error durante la aprobación masiva.');
    } finally {
      setApprovingBatch(false);
    }
  };

  const handleSaveMembershipDate = async () => {
    if (!selectedMemberForMembership) return;
    const finalDate = membershipDateInput || new Date().toISOString().split('T')[0];
    await dataService.proposeMembershipDate(selectedMemberForMembership.id, finalDate);
    await dataService.approveMembershipDate(selectedMemberForMembership.id);

    notificationService.sendNotification({
      senderId: user?.id,
      receiverId: selectedMemberForMembership.id,
      title: '🪪 Membresía Asignada y Aprobada',
      message: `Tu membresía scout está vigente hasta ${formatDateWithDayOfWeek(finalDate)}.`,
      type: 'membership'
    }).catch(() => {});

    showAlert('Fecha Asignada', `Membresía validada para ${selectedMemberForMembership.name} hasta ${formatDateWithDayOfWeek(finalDate)}`);
    setSelectedMemberForMembership(null);
    loadStatsAndMembers();
  };

  // Cálculos de Semáforo de Membresías
  const today = new Date();
  const semaforoCounts = allMembers.reduce(
    (acc, m) => {
      const isPending = m.membership_status === 'pending_approval' || m.membership_status === 'pending';
      if (isPending) {
        acc.pending++;
        return acc;
      }
      if (!m.membership_expires_at) {
        acc.expired++;
        return acc;
      }
      const expDate = new Date(m.membership_expires_at);
      const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        acc.expired++;
      } else if (diffDays <= 30) {
        acc.expiring_1m++;
      } else if (diffDays <= 90) {
        acc.expiring_3m++;
      } else {
        acc.active++;
      }
      return acc;
    },
    { active: 0, expiring_3m: 0, expiring_1m: 0, expired: 0, pending: 0 }
  );

  // Filtrado de Censo
  const filteredCensoMembers = allMembers.filter(m => {
    const matchQuery = (m.name || '').toLowerCase().includes(censoSearch.toLowerCase()) || (m.cedula || '').includes(censoSearch);
    const u = (m.unit || '').toLowerCase();
    const isJefe = m.role === 'jefe_grupo' || u === 'grupo' || u === 'jefatura';
    
    let matchUnit = true;
    if (censoUnitFilter === 'jefatura' || censoUnitFilter === 'grupo') {
      matchUnit = isJefe;
    } else if (censoUnitFilter === 'clan') {
      matchUnit = (u === 'clan') && !isJefe;
    } else if (censoUnitFilter === 'manada') {
      matchUnit = (u === 'manada') && !isJefe;
    } else if (censoUnitFilter === 'tropa') {
      matchUnit = (u === 'tropa') && !isJefe;
    } else if (censoUnitFilter === 'caminantes') {
      matchUnit = (u === 'caminantes' || u === 'comunidad') && !isJefe;
    } else if (censoUnitFilter !== 'all') {
      matchUnit = u === censoUnitFilter.toLowerCase();
    }
    return matchQuery && matchUnit;
  });

  // Filtrado de Padrón Médico
  const filteredMedicoMembers = allMembers.filter(m => {
    const matchQuery = (m.name || '').toLowerCase().includes(medicoSearch.toLowerCase()) || (m.cedula || '').includes(medicoSearch);
    const u = (m.unit || '').toLowerCase();
    const isJefe = m.role === 'jefe_grupo' || u === 'grupo' || u === 'jefatura';

    let matchUnit = true;
    if (medicoUnitFilter === 'jefatura' || medicoUnitFilter === 'grupo') {
      matchUnit = isJefe;
    } else if (medicoUnitFilter === 'clan') {
      matchUnit = (u === 'clan') && !isJefe;
    } else if (medicoUnitFilter === 'manada') {
      matchUnit = (u === 'manada') && !isJefe;
    } else if (medicoUnitFilter === 'tropa') {
      matchUnit = (u === 'tropa') && !isJefe;
    } else if (medicoUnitFilter === 'caminantes') {
      matchUnit = (u === 'caminantes' || u === 'comunidad') && !isJefe;
    } else if (medicoUnitFilter !== 'all') {
      matchUnit = u === medicoUnitFilter.toLowerCase();
    }
    return matchQuery && matchUnit;
  });

  // Filtrado de Semáforo
  const filteredSemaforoMembers = allMembers.filter(m => {
    const matchQuery = (m.name || '').toLowerCase().includes(semaforoSearch.toLowerCase()) || (m.cedula || '').includes(semaforoSearch);
    if (!matchQuery) return false;

    const isPending = m.membership_status === 'pending_approval' || m.membership_status === 'pending';
    if (semaforoStatusFilter === 'pending') return isPending;

    if (!m.membership_expires_at) return semaforoStatusFilter === 'all' || semaforoStatusFilter === 'expired';

    const expDate = new Date(m.membership_expires_at);
    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (semaforoStatusFilter === 'expired') return diffDays < 0;
    if (semaforoStatusFilter === 'expiring_1m') return diffDays >= 0 && diffDays <= 30;
    if (semaforoStatusFilter === 'expiring_3m') return diffDays > 30 && diffDays <= 90;
    if (semaforoStatusFilter === 'active') return diffDays > 90 && !isPending;

    return true;
  });

  // Filtrado de miembros por Rama y Rol para el acordeón principal
  const getBranchData = (branchKey: string) => {
    const isManada = branchKey === 'manada';
    const isTropa = branchKey === 'tropa';
    const isCaminantes = branchKey === 'caminantes';
    const isClan = branchKey === 'clan';

    const branchMembers = allMembers.filter(m => {
      const u = (m.unit || '').toLowerCase();
      if (isManada) return u === 'manada';
      if (isTropa) return u === 'tropa';
      if (isCaminantes) return u === 'caminantes' || u === 'comunidad';
      if (isClan) return u === 'clan';
      return false;
    });

    const scouters = branchMembers.filter(m => m.role === 'scouter');
    const youth = branchMembers.filter(m => m.role === 'scout');

    if (isManada) {
      const lobatos = youth.filter(s => {
        const g = (s.gender || '').toLowerCase();
        return g !== 'femenino' && g !== 'f' && g !== 'mujer';
      });
      const lobeznas = youth.filter(s => {
        const g = (s.gender || '').toLowerCase();
        return g === 'femenino' || g === 'f' || g === 'mujer';
      });
      return { scouters, lobatos, lobeznas, totalYouth: youth.length };
    }

    return { scouters, youth, totalYouth: youth.length };
  };

  const renderMemberCard = (member: any, roleSubtitle: string, isScouterRole: boolean = false) => {
    const isApproved = member.membership_status === 'approved';

    return (
      <View key={member.id} style={[styles.memberCard, { backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ marginRight: 12 }}>
            <DualProfileAvatar
              scoutAvatarUrl={member.avatar_url}
              customAvatarUrl={member.custom_avatar_url}
              unit={member.unit || 'clan'}
              role={member.role || (isScouterRole ? 'scouter' : 'scout')}
              size={46}
              editable={false}
            />
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
              <Text style={[styles.memberName, { color: theme.text }]}>{member.name}</Text>
              {isScouterRole && (
                <View style={{ backgroundColor: 'rgba(79, 70, 229, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#4f46e5' }}>
                  <Text style={{ fontSize: 10, color: '#6366f1', fontWeight: 'bold' }}>👔 DIRIGENTE</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
              {roleSubtitle} {member.cedula ? `• C.I: ${member.cedula}` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.profileBtn, { backgroundColor: isScouterRole ? '#4f46e5' : primaryColor }]}
            onPress={() => navigation.navigate('ScoutFullProfile', { scoutId: member.id })}
          >
            <Text style={styles.profileBtnText}>Ver Perfil</Text>
            <ChevronRight size={14} color="white" />
          </TouchableOpacity>
        </View>

        {/* ACCESOS DIRECTOS */}
        <View style={styles.docActionsRow}>
          <TouchableOpacity
            style={[styles.miniDocBtn, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: primaryColor }]}
            onPress={() => navigation.navigate('FichaMedica', { targetUserId: member.id })}
          >
            <Text style={{ fontSize: 13, marginRight: 4 }}>📋</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: primaryColor }}>Ficha Médica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.miniDocBtn, { backgroundColor: 'rgba(99, 102, 241, 0.12)', borderColor: primaryColor }]}
            onPress={() => navigation.navigate('CurriculumScout', { targetUserId: member.id })}
          >
            <Text style={{ fontSize: 13, marginRight: 4 }}>📜</Text>
            <Text style={{ fontSize: 11, fontWeight: 'bold', color: primaryColor }}>Currículum</Text>
          </TouchableOpacity>

          {isApproved && (
            <View style={[styles.miniDocBtn, { backgroundColor: '#dcfce7', borderColor: '#16a34a' }]}>
              <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#15803d' }}>✓ Carnet Activo</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const manadaData = getBranchData('manada');
  const tropaData = getBranchData('tropa');
  const caminantesData = getBranchData('caminantes');
  const clanData = getBranchData('clan');
  const jefaturaMembers = allMembers.filter(m => m.role === 'jefe_grupo');

  const { width } = useWindowDimensions();
  const isDesktop = width > 768;

  const quickToolButtons = (
    <>
      {/* BOTÓN DESTACADO PARA AGREGAR ACTIVIDADES GRUPALES / ASAMBLEAS */}
      <TouchableOpacity
        style={[styles.primaryActionBtn, { backgroundColor: primaryColor }]}
        onPress={() => setShowAddEventModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={18} color="#ffffff" />
        <Text style={styles.primaryActionBtnText}>+ Nueva Actividad / Asamblea</Text>
      </TouchableOpacity>

      {/* 1. CENSO Y NÓMINA OFICIAL */}
      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => setShowCensoModal(true)}
        activeOpacity={0.8}
      >
        <Users size={18} color="#9333ea" />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>📊 Censo y Nómina</Text>
      </TouchableOpacity>

      {/* 2. PADRÓN DE EMERGENCIA MÉDICA */}
      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => setShowPadronMedicoModal(true)}
        activeOpacity={0.8}
      >
        <ShieldCheck size={18} color="#dc2626" />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>🏥 Padrón Médico</Text>
      </TouchableOpacity>

      {/* 3. SEMÁFORO DE MEMBRESÍAS Y CARNETS */}
      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => setShowSemaforoModal(true)}
        activeOpacity={0.8}
      >
        <Clock size={18} color="#d97706" />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>
          🚦 Semáforo Carnets {semaforoCounts.pending > 0 ? `(${semaforoCounts.pending})` : ''}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => navigation.navigate('ProgramaScout')}
        activeOpacity={0.8}
      >
        <Calendar size={18} color={primaryColor} />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>Programas Oficiales</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => navigation.navigate('CalendarStandalone')}
        activeOpacity={0.8}
      >
        <CalendarIcon size={18} color={primaryColor} />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>Calendario General</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => navigation.navigate('QuarterlyPlan', { unit: 'clan' })}
        activeOpacity={0.8}
      >
        <FileText size={18} color={primaryColor} />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>Planes Trimestrales</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => navigation.navigate('Documentos')}
        activeOpacity={0.8}
      >
        <BookOpen size={18} color={primaryColor} />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>Documentos & PDFs</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.quickToolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
        onPress={() => navigation.navigate('TemporalDrive')}
        activeOpacity={0.8}
      >
        <Camera size={18} color={primaryColor} />
        <Text style={[styles.quickToolBtnText, { color: theme.text }]}>Drive Fotos</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 40 }}>
      
        {/* CABECERA JEFE DE GRUPO */}
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : primaryColor }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Panel Jefe de Grupo</Text>
            <Text style={styles.subtitle}>Grupo Scout: {user?.group_name || 'Grupo Orión #84'}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <NotificationHeaderBell color="#ffffff" style={styles.iconBtn} />

            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={() => setShowCustomizer(true)}
              activeOpacity={0.8}
            >
              <Palette color="#ffffff" size={20} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.iconBtn} 
              onPress={toggleDarkMode}
              activeOpacity={0.8}
            >
              {isDarkMode ? <Sun color="#f59e0b" size={20} /> : <Moon color="white" size={20} />}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.iconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.25)' }]} 
              onPress={signOut}
              activeOpacity={0.8}
            >
              <LogOut color="#ef4444" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* BARRA DE ACCIONES RÁPIDAS Y HERRAMIENTAS INSTITUCIONALES (WRAP EN ESCRITORIO) */}
        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          {isDesktop ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
              {quickToolButtons}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
              {quickToolButtons}
            </ScrollView>
          )}
        </View>
        
        {loading ? (
          <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ padding: 16 }}>

            {/* TARJETAS DE ESTADÍSTICAS */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Users color={colors.primary} size={28} />
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {stats.manada + stats.tropa + stats.comunidad + stats.clan}
                </Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Jóvenes Scouts</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Shield color="#4f46e5" size={28} />
                <Text style={[styles.statNumber, { color: '#4f46e5' }]}>{stats.scouters}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Dirigentes & Jefatura</Text>
              </View>

              <View style={[styles.statCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Award color="#f59e0b" size={28} />
                <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.insigniasAprobadas}</Text>
                <Text style={[styles.statLabel, { color: theme.subText }]}>Insignias Aprobadas</Text>
              </View>
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 14, marginBottom: 12 }]}>
              🌳 Estructura y Miembros del Grupo ({allMembers.length})
            </Text>

            {/* 1. ACORDEÓN: 🟡 MANADA DE LOBATOS Y LOBEZNAS */}
            <View style={[styles.accordionSection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.accordionHeader, { borderLeftColor: UNIT_COLORS.manada }]}
                onPress={() => toggleSection('manada')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accordionTitle, { color: theme.text }]}>🟡 MANADA DE LOBATOS Y LOBEZNAS</Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                    {manadaData.scouters.length} Scouters • {manadaData.totalYouth} Niños/as
                  </Text>
                </View>
                {expanded.manada ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
              </TouchableOpacity>

              {expanded.manada && (
                <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
                  <Text style={styles.subCategoryTitle}>👔 Scouters / Dirigentes de Manada ({manadaData.scouters.length})</Text>
                  {manadaData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouters registrados en Manada.</Text>
                  ) : (
                    manadaData.scouters.map(s => renderMemberCard(s, 'Dirigente de Manada / Akela', true))
                  )}

                  <Text style={[styles.subCategoryTitle, { marginTop: 12 }]}>🐺 Lobatos ({manadaData.lobatos?.length || 0})</Text>
                  {manadaData.lobatos?.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay lobatos registrados.</Text>
                  ) : (
                    manadaData.lobatos?.map(s => renderMemberCard(s, 'Lobato • Manada'))
                  )}

                  <Text style={[styles.subCategoryTitle, { marginTop: 12 }]}>🐺 Lobeznas ({manadaData.lobeznas?.length || 0})</Text>
                  {manadaData.lobeznas?.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay lobeznas registradas.</Text>
                  ) : (
                    manadaData.lobeznas?.map(s => renderMemberCard(s, 'Lobezna • Manada'))
                  )}
                </View>
              )}
            </View>

            {/* 2. ACORDEÓN: 🟢 TROPA SCOUT */}
            <View style={[styles.accordionSection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.accordionHeader, { borderLeftColor: UNIT_COLORS.tropa }]}
                onPress={() => toggleSection('tropa')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accordionTitle, { color: theme.text }]}>🟢 TROPA SCOUT</Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                    {tropaData.scouters.length} Scouters • {tropaData.totalYouth} Scouts
                  </Text>
                </View>
                {expanded.tropa ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
              </TouchableOpacity>

              {expanded.tropa && (
                <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
                  <Text style={styles.subCategoryTitle}>👔 Scouters de Tropa ({tropaData.scouters.length})</Text>
                  {tropaData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouters registrados en Tropa.</Text>
                  ) : (
                    tropaData.scouters.map(s => renderMemberCard(s, 'Dirigente de Tropa', true))
                  )}

                  <Text style={[styles.subCategoryTitle, { marginTop: 12 }]}>⚜️ Scouts ({tropaData.youth?.length || 0})</Text>
                  {tropaData.youth?.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouts registrados en Tropa.</Text>
                  ) : (
                    tropaData.youth?.map(s => renderMemberCard(s, 'Scout • Tropa'))
                  )}
                </View>
              )}
            </View>

            {/* 3. ACORDEÓN: 🔵 CAMINANTES / COMUNIDAD */}
            <View style={[styles.accordionSection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.accordionHeader, { borderLeftColor: UNIT_COLORS.comunidad }]}
                onPress={() => toggleSection('caminantes')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accordionTitle, { color: theme.text }]}>🔵 CAMINANTES / COMUNIDAD</Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                    {caminantesData.scouters.length} Scouters • {caminantesData.totalYouth} Caminantes
                  </Text>
                </View>
                {expanded.caminantes ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
              </TouchableOpacity>

              {expanded.caminantes && (
                <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
                  <Text style={styles.subCategoryTitle}>👔 Scouters de Caminantes ({caminantesData.scouters.length})</Text>
                  {caminantesData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouters registrados en Caminantes.</Text>
                  ) : (
                    caminantesData.scouters.map(s => renderMemberCard(s, 'Dirigente de Caminantes', true))
                  )}

                  <Text style={[styles.subCategoryTitle, { marginTop: 12 }]}>🧭 Caminantes ({caminantesData.youth?.length || 0})</Text>
                  {caminantesData.youth?.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay jóvenes registrados en Caminantes.</Text>
                  ) : (
                    caminantesData.youth?.map(s => renderMemberCard(s, 'Caminante • Comunidad'))
                  )}
                </View>
              )}
            </View>

            {/* 4. ACORDEÓN: 🔴 CLAN ROVER */}
            <View style={[styles.accordionSection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.accordionHeader, { borderLeftColor: UNIT_COLORS.clan }]}
                onPress={() => toggleSection('clan')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accordionTitle, { color: theme.text }]}>🔴 CLAN ROVER</Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                    {clanData.scouters.length} Scouters • {clanData.totalYouth} Rovers
                  </Text>
                </View>
                {expanded.clan ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
              </TouchableOpacity>

              {expanded.clan && (
                <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
                  <Text style={styles.subCategoryTitle}>👔 Scouters de Clan ({clanData.scouters.length})</Text>
                  {clanData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouters registrados en Clan.</Text>
                  ) : (
                    clanData.scouters.map(s => renderMemberCard(s, 'Scouter de Clan / Rover', true))
                  )}

                  <Text style={[styles.subCategoryTitle, { marginTop: 12 }]}>🚩 Rovers ({clanData.youth?.length || 0})</Text>
                  {clanData.youth?.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay rovers registrados en el Clan.</Text>
                  ) : (
                    clanData.youth?.map(s => renderMemberCard(s, 'Rover Scout • Clan'))
                  )}
                </View>
              )}
            </View>

            {/* 5. ACORDEÓN: ⚜️ JEFATURA Y CONSEJO DE GRUPO */}
            <View style={[styles.accordionSection, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[styles.accordionHeader, { borderLeftColor: '#8e24aa' }]}
                onPress={() => toggleSection('jefatura')}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.accordionTitle, { color: theme.text }]}>⚜️ JEFATURA Y CONSEJO DE GRUPO</Text>
                  <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                    {jefaturaMembers.length} Miembros de Jefatura
                  </Text>
                </View>
                {expanded.jefatura ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
              </TouchableOpacity>

              {expanded.jefatura && (
                <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
                  <Text style={styles.subCategoryTitle}>👑 Jefes y Subjefes de Grupo ({jefaturaMembers.length})</Text>
                  {jefaturaMembers.map(j => renderMemberCard(j, 'Jefatura de Grupo', true))}
                </View>
              )}
            </View>

            {/* BOTÓN CERRAR SESIÓN DE JEFATURA */}
            <TouchableOpacity 
              style={[styles.logoutBtn, { borderColor: isDarkMode ? '#3f3f46' : '#fee2e2', backgroundColor: isDarkMode ? '#27272a' : '#fef2f2' }]} 
              onPress={signOut}
              activeOpacity={0.8}
            >
              <LogOut size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Cerrar Sesión de Jefe de Grupo</Text>
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: CENSO Y NÓMINA OFICIAL DEL GRUPO                                */}
      {/* ========================================================================= */}
      <Modal visible={showCensoModal} transparent animationType="slide" onRequestClose={() => setShowCensoModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxWidth: 840, maxHeight: '92%' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Users color="#9333ea" size={22} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[modalStyles.title, { color: theme.text }]}>Censo y Nómina Oficial del Grupo</Text>
                  <Text style={{ fontSize: 11, color: theme.subText }}>{user?.group_name || 'Grupo Scout'} • {filteredCensoMembers.length} Miembros filtrados</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCensoModal(false)} style={{ padding: 6 }}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              {/* BUSCADOR */}
              <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border, marginBottom: 8 }]}>
                <Search size={16} color={theme.subText} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Buscar por nombre o cédula..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={censoSearch}
                  onChangeText={setCensoSearch}
                />
                {censoSearch ? (
                  <TouchableOpacity onPress={() => setCensoSearch('')}>
                    <X size={16} color={theme.subText} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* BOTONES DE EXPORTACIÓN */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.exportBtn, { flex: 1, backgroundColor: '#15803d' }]}
                  onPress={() => exportCensoExcel(filteredCensoMembers, user?.group_name || 'Grupo Scout')}
                >
                  <Download size={15} color="white" />
                  <Text style={styles.exportBtnText}>Excel (.XLS)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportBtn, { flex: 1, backgroundColor: primaryColor }]}
                  onPress={() => {
                    const headers = ['#', 'Nombre Completo', 'Cédula', 'Rol', 'Rama', 'Género', 'F. Nac.', 'F. Promesa', 'Teléfono', 'Carnet'];
                    const rows = filteredCensoMembers.map((m, idx) => {
                      const isJefe = m.role === 'jefe_grupo' || m.unit === 'grupo' || m.unit === 'jefatura';
                      return [
                        idx + 1,
                        m.name || 'Sin Nombre',
                        m.cedula || 'N/A',
                        m.role === 'jefe_grupo' ? 'Jefe de Grupo' : m.role === 'scouter' ? 'Scouter' : 'Scout',
                        isJefe ? 'JEFATURA' : (m.unit || 'General').toUpperCase(),
                        m.gender || 'N/A',
                        m.birth_date || 'N/A',
                        m.promise_date || 'N/A',
                        m.phone || 'N/A',
                        m.membership_status === 'approved' ? `Vigente (${m.membership_expires_at || ''})` : 'Sin Registro'
                      ];
                    });
                    printDocumentHTML('CENSO Y NÓMINA OFICIAL DE MIEMBROS', 'REGISTRO INSTITUCIONAL SCOUT', user?.group_name || 'Grupo Scout', headers, rows, primaryColor);
                  }}
                >
                  <Printer size={15} color="white" />
                  <Text style={styles.exportBtnText}>PDF / Imprimir</Text>
                </TouchableOpacity>
              </View>

              {/* FILTROS POR RAMA */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {[
                  { id: 'all', label: 'Todas las Ramas' },
                  { id: 'manada', label: '🟡 Manada' },
                  { id: 'tropa', label: '🟢 Tropa' },
                  { id: 'caminantes', label: '🔵 Caminantes' },
                  { id: 'clan', label: '🔴 Clan' },
                  { id: 'jefatura', label: '⚜️ Jefatura' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterTag,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      censoUnitFilter === item.id && { backgroundColor: primaryColor, borderColor: primaryColor }
                    ]}
                    onPress={() => setCensoUnitFilter(item.id)}
                  >
                    <Text style={[styles.filterTagText, { color: theme.subText }, censoUnitFilter === item.id && { color: 'white', fontWeight: 'bold' }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* TABLA DE CENSO */}
            <ScrollView style={{ paddingHorizontal: 16 }}>
              {filteredCensoMembers.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 30, color: theme.subText, fontStyle: 'italic' }}>
                  No se encontraron miembros con los filtros seleccionados.
                </Text>
              ) : (
                filteredCensoMembers.map((m, idx) => {
                  const isJefe = m.role === 'jefe_grupo' || m.unit === 'grupo' || m.unit === 'jefatura';
                  return (
                    <View key={m.id} style={[styles.tableRow, { backgroundColor: isDarkMode ? '#1f1f23' : '#f8fafc', borderColor: theme.border }]}>
                      <Text style={[styles.tableIndex, { color: theme.subText }]}>{idx + 1}</Text>
                      <View style={{ flex: 2 }}>
                        <Text style={[styles.tableMainText, { color: theme.text }]}>{m.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.subText }}>C.I: {m.cedula || 'Sin C.I.'}</Text>
                      </View>
                      <View style={{ flex: 1.5 }}>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: isJefe ? '#9333ea' : primaryColor }}>
                          {isJefe ? 'JEFATURA' : (m.unit || 'General').toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 10, color: theme.subText }}>{m.role === 'scouter' ? 'Dirigente' : m.role === 'jefe_grupo' ? 'Jefe Grupo' : 'Scout'}</Text>
                      </View>
                      <View style={{ flex: 1.5 }}>
                        <Text style={{ fontSize: 11, color: theme.text }}>Prom: {m.promise_date || 'N/A'}</Text>
                        <Text style={{ fontSize: 10, color: theme.subText }}>Nac: {m.birth_date || 'N/A'}</Text>
                      </View>
                      <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, color: theme.text, fontWeight: '500' }}>{m.phone || 'Sin tlf'}</Text>
                        <Text style={{ fontSize: 10, color: m.membership_status === 'approved' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                          {m.membership_status === 'approved' ? '✓ Carnet' : 'Sin Carnet'}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: PADRÓN DE EMERGENCIA MÉDICA Y SALUD                            */}
      {/* ========================================================================= */}
      <Modal visible={showPadronMedicoModal} transparent animationType="slide" onRequestClose={() => setShowPadronMedicoModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxWidth: 880, maxHeight: '92%' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldCheck color="#dc2626" size={22} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[modalStyles.title, { color: theme.text }]}>Padrón de Emergencia Médica y Contactos</Text>
                  <Text style={{ fontSize: 11, color: theme.subText }}>Registro médico prioritario para salidas y campamentos • {filteredMedicoMembers.length} Miembros</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPadronMedicoModal(false)} style={{ padding: 6 }}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              {/* BUSCADOR */}
              <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border, marginBottom: 8 }]}>
                <Search size={16} color={theme.subText} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Buscar scout, alergia o tipo de sangre..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={medicoSearch}
                  onChangeText={setMedicoSearch}
                />
                {medicoSearch ? (
                  <TouchableOpacity onPress={() => setMedicoSearch('')}>
                    <X size={16} color={theme.subText} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* BOTONES DE EXPORTACIÓN */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.exportBtn, { flex: 1, backgroundColor: '#15803d' }]}
                  onPress={() => exportPadronMedicoExcel(filteredMedicoMembers, user?.group_name || 'Grupo Scout')}
                >
                  <Download size={15} color="white" />
                  <Text style={styles.exportBtnText}>Excel (.XLS)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.exportBtn, { flex: 1, backgroundColor: '#dc2626' }]}
                  onPress={() => {
                    const headers = ['#', 'Scout / Dirigente', 'Rama', 'Tipo Sangre', 'Alergias', 'Contacto Emergencia', 'Teléfono', 'Seguro'];
                    const rows = filteredMedicoMembers.map((m, idx) => {
                      const med = m.medical_data || {};
                      const isJefe = m.role === 'jefe_grupo' || m.unit === 'grupo' || m.unit === 'jefatura';
                      const isAdult = m.role === 'scouter' || m.role === 'jefe_grupo' || isJefe;
                      let allergies = 'Ninguna';
                      if (med.allergies) {
                        const list = [];
                        if (med.allergies.medicamento) list.push(`Med: ${med.allergies.medicamento}`);
                        if (med.allergies.alimento) list.push(`Alim: ${med.allergies.alimento}`);
                        if (med.allergies.picada) list.push(`Picada: ${med.allergies.picada}`);
                        if (list.length > 0) allergies = list.join(', ');
                      }
                      return [
                        idx + 1,
                        m.name,
                        isJefe ? 'JEFATURA' : (m.unit || 'General').toUpperCase(),
                        med.bloodType || 'Sin Registrar',
                        allergies,
                        med.emergencyContactName || (isAdult ? 'Número de Contacto' : 'Representante'),
                        med.emergencyPhonePersonal || med.emergencyPhoneHome || m.phone || 'N/A',
                        med.hasInsurance ? 'Sí' : 'No'
                      ];
                    });
                    printDocumentHTML('PADRÓN DE EMERGENCIA MÉDICA Y SALUD', 'FICHA OFICIAL DE CONTINGENCIA Y CAMPAMENTOS', user?.group_name || 'Grupo Scout', headers, rows, '#dc2626');
                  }}
                >
                  <Printer size={15} color="white" />
                  <Text style={styles.exportBtnText}>PDF / Imprimir</Text>
                </TouchableOpacity>
              </View>

              {/* FILTROS POR RAMA */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {[
                  { id: 'all', label: 'Todas las Ramas' },
                  { id: 'manada', label: '🟡 Manada' },
                  { id: 'tropa', label: '🟢 Tropa' },
                  { id: 'caminantes', label: '🔵 Caminantes' },
                  { id: 'clan', label: '🔴 Clan' },
                  { id: 'jefatura', label: '⚜️ Jefatura' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.filterTag,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      medicoUnitFilter === item.id && { backgroundColor: '#dc2626', borderColor: '#dc2626' }
                    ]}
                    onPress={() => setMedicoUnitFilter(item.id)}
                  >
                    <Text style={[styles.filterTagText, { color: theme.subText }, medicoUnitFilter === item.id && { color: 'white', fontWeight: 'bold' }]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* TABLA DE PADRÓN MÉDICO */}
            <ScrollView style={{ paddingHorizontal: 16 }}>
              {filteredMedicoMembers.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 30, color: theme.subText, fontStyle: 'italic' }}>
                  No hay registros médicos que coincidan con la búsqueda.
                </Text>
              ) : (
                filteredMedicoMembers.map((m, idx) => {
                  const med = m.medical_data || {};
                  const isJefe = m.role === 'jefe_grupo' || m.unit === 'grupo' || m.unit === 'jefatura';
                  const isAdult = m.role === 'scouter' || m.role === 'jefe_grupo' || isJefe;
                  const blood = med.bloodType || 'S/R';
                  const hasAllergies = med.allergies && (med.allergies.medicamento || med.allergies.alimento || med.allergies.picada);
                  const contactPhone = med.emergencyPhonePersonal || med.emergencyPhoneHome || m.phone || '';

                  return (
                    <View key={m.id} style={[styles.tableRow, { backgroundColor: isDarkMode ? '#1f1f23' : '#f8fafc', borderColor: theme.border }]}>
                      <Text style={[styles.tableIndex, { color: theme.subText }]}>{idx + 1}</Text>
                      <View style={{ flex: 2 }}>
                        <Text style={[styles.tableMainText, { color: theme.text }]}>{m.name}</Text>
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: isJefe ? '#9333ea' : theme.subText }}>
                          {isJefe ? 'JEFATURA' : (m.unit || 'General').toUpperCase()}
                        </Text>
                        {isAdult && (
                          <Text style={{ fontSize: 10, color: theme.subText, fontWeight: '500' }}>
                            {m.role === 'jefe_grupo' ? 'Scouter / Jefe Grupo' : 'Scouter'}
                          </Text>
                        )}
                      </View>

                      {/* BADGE SANGRE */}
                      <View style={{ width: 60, alignItems: 'center', justifyContent: 'center' }}>
                        <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5' }}>
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#b91c1c' }}>{blood}</Text>
                        </View>
                      </View>

                      {/* ALERGIAS */}
                      <View style={{ flex: 2, paddingHorizontal: 6 }}>
                        <Text style={{ fontSize: 11, color: hasAllergies ? '#dc2626' : theme.subText, fontWeight: hasAllergies ? 'bold' : 'normal' }}>
                          {hasAllergies ? `⚠️ ${med.allergies.medicamento || med.allergies.alimento || 'Alergia'}` : 'Sin Alergias'}
                        </Text>
                      </View>

                      {/* CONTACTO DE EMERGENCIA / NÚMERO DE CONTACTO */}
                      <View style={{ flex: 2.2, alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, color: theme.text, fontWeight: 'bold' }}>
                          {med.emergencyContactName ? med.emergencyContactName : (isAdult ? 'Número de Contacto' : 'Representante')}
                        </Text>
                        <Text style={{ fontSize: 11, color: primaryColor, fontWeight: '500' }}>📞 {contactPhone || 'Sin tlf'}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: SEMÁFORO DE MEMBRESÍAS Y CARNETS ASV                           */}
      {/* ========================================================================= */}
      <Modal visible={showSemaforoModal} transparent animationType="slide" onRequestClose={() => setShowSemaforoModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxWidth: 840, maxHeight: '92%' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock color="#d97706" size={22} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[modalStyles.title, { color: theme.text }]}>Semáforo Institucional de Membresías y Carnets</Text>
                  <Text style={{ fontSize: 11, color: theme.subText }}>Control de vigencia y aprobación de carnet ASV • Total: {allMembers.length} Miembros</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowSemaforoModal(false)} style={{ padding: 6 }}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
              {/* TARJETAS DEL SEMÁFORO (INCLUYENDO TOTALITARIO) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }} style={{ marginBottom: 12 }}>
                {/* 0. TODOS LOS MIEMBROS (TOTALITARIO) */}
                <TouchableOpacity
                  style={[
                    styles.trafficCard, 
                    { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', borderColor: theme.border, minWidth: 95 }, 
                    semaforoStatusFilter === 'all' && styles.trafficCardActive
                  ]}
                  onPress={() => setSemaforoStatusFilter('all')}
                >
                  <Text style={[styles.trafficNumber, { color: theme.text }]}>{allMembers.length}</Text>
                  <Text style={[styles.trafficLabel, { color: theme.text }]}>📋 Todos</Text>
                </TouchableOpacity>

                {/* 1. VIGENTES (> 3 MESES / > 90 DÍAS) */}
                <TouchableOpacity
                  style={[styles.trafficCard, { backgroundColor: '#dcfce7', borderColor: '#16a34a', minWidth: 110 }, semaforoStatusFilter === 'active' && styles.trafficCardActive]}
                  onPress={() => setSemaforoStatusFilter(semaforoStatusFilter === 'active' ? 'all' : 'active')}
                >
                  <Text style={[styles.trafficNumber, { color: '#15803d' }]}>{semaforoCounts.active}</Text>
                  <Text style={[styles.trafficLabel, { color: '#166534' }]}>🟢 Vigentes (&gt;3m)</Text>
                </TouchableOpacity>

                {/* 2. POR VENCER (3 MESES / 31-90 DÍAS) */}
                <TouchableOpacity
                  style={[styles.trafficCard, { backgroundColor: '#fef9c3', borderColor: '#ca8a04', minWidth: 115 }, semaforoStatusFilter === 'expiring_3m' && styles.trafficCardActive]}
                  onPress={() => setSemaforoStatusFilter(semaforoStatusFilter === 'expiring_3m' ? 'all' : 'expiring_3m')}
                >
                  <Text style={[styles.trafficNumber, { color: '#854d0e' }]}>{semaforoCounts.expiring_3m}</Text>
                  <Text style={[styles.trafficLabel, { color: '#713f12' }]}>🟡 Por Vencer (3m)</Text>
                </TouchableOpacity>

                {/* 3. A PUNTO DE VENCER (1 MES / 0-30 DÍAS) */}
                <TouchableOpacity
                  style={[styles.trafficCard, { backgroundColor: '#ffedd5', borderColor: '#ea580c', minWidth: 115 }, semaforoStatusFilter === 'expiring_1m' && styles.trafficCardActive]}
                  onPress={() => setSemaforoStatusFilter(semaforoStatusFilter === 'expiring_1m' ? 'all' : 'expiring_1m')}
                >
                  <Text style={[styles.trafficNumber, { color: '#c2410c' }]}>{semaforoCounts.expiring_1m}</Text>
                  <Text style={[styles.trafficLabel, { color: '#9a3412' }]}>🟠 Por Vencer (30d)</Text>
                </TouchableOpacity>

                {/* 4. VENCIDAS O SIN FECHA */}
                <TouchableOpacity
                  style={[styles.trafficCard, { backgroundColor: '#fee2e2', borderColor: '#dc2626', minWidth: 120 }, semaforoStatusFilter === 'expired' && styles.trafficCardActive]}
                  onPress={() => setSemaforoStatusFilter(semaforoStatusFilter === 'expired' ? 'all' : 'expired')}
                >
                  <Text style={[styles.trafficNumber, { color: '#b91c1c' }]}>{semaforoCounts.expired}</Text>
                  <Text style={[styles.trafficLabel, { color: '#991b1b' }]}>🔴 Vencidas / S.F</Text>
                </TouchableOpacity>

                {/* 5. POR APROBAR */}
                <TouchableOpacity
                  style={[styles.trafficCard, { backgroundColor: '#f3e8ff', borderColor: '#9333ea', minWidth: 105 }, semaforoStatusFilter === 'pending' && styles.trafficCardActive]}
                  onPress={() => setSemaforoStatusFilter(semaforoStatusFilter === 'pending' ? 'all' : 'pending')}
                >
                  <Text style={[styles.trafficNumber, { color: '#7e22ce' }]}>{semaforoCounts.pending}</Text>
                  <Text style={[styles.trafficLabel, { color: '#6b21a8' }]}>⏳ Por Aprobar</Text>
                </TouchableOpacity>
              </ScrollView>

              {/* BOTÓN APROBACIÓN MASIVA EN LOTE SI HAY PENDIENTES */}
              {semaforoCounts.pending > 0 && (
                <TouchableOpacity
                  style={[styles.batchApproveBtn, { backgroundColor: '#9333ea' }]}
                  onPress={handleBatchApprove}
                  disabled={approvingBatch}
                >
                  {approvingBatch ? <ActivityIndicator color="white" /> : (
                    <>
                      <CheckCircle2 size={16} color="white" style={{ marginRight: 6 }} />
                      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 12 }}>
                        Aprobar Todas las {semaforoCounts.pending} Membresías Pendientes en Lote
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* BUSCADOR */}
              <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border, marginBottom: 8 }]}>
                <Search size={16} color={theme.subText} />
                <TextInput
                  style={[styles.searchInput, { color: theme.text }]}
                  placeholder="Buscar por nombre..."
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={semaforoSearch}
                  onChangeText={setSemaforoSearch}
                />
                {semaforoSearch ? (
                  <TouchableOpacity onPress={() => setSemaforoSearch('')}>
                    <X size={16} color={theme.subText} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* BOTÓN DE EXPORTACIÓN Y CONTADOR */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.exportBtn, { flex: 1, backgroundColor: '#15803d' }]}
                  onPress={() => exportMembresiasExcel(allMembers, user?.group_name || 'Grupo Scout')}
                >
                  <Download size={15} color="white" />
                  <Text style={styles.exportBtnText}>Exportar Todos a Excel ({allMembers.length} Miembros .XLS)</Text>
                </TouchableOpacity>
              </View>

              {/* BARRA INDICADORA DE FILTRO Y TOTAL */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>
                  Listado: {filteredSemaforoMembers.length} de {allMembers.length} personas
                  {semaforoStatusFilter !== 'all' ? ` (${semaforoStatusFilter === 'active' ? '🟢 Vigentes' : semaforoStatusFilter === 'expiring_3m' ? '🟡 Por Vencer 3m' : semaforoStatusFilter === 'expiring_1m' ? '🟠 Por Vencer 30d' : semaforoStatusFilter === 'expired' ? '🔴 Vencidas/S.F' : '⏳ Por Aprobar'})` : ''}
                </Text>
                {semaforoStatusFilter !== 'all' && (
                  <TouchableOpacity 
                    style={{ backgroundColor: primaryColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }} 
                    onPress={() => setSemaforoStatusFilter('all')}
                  >
                    <Text style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>✕ Ver Todos ({allMembers.length})</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* TABLA DE SEMÁFORO */}
            <ScrollView style={{ paddingHorizontal: 16 }}>
              {filteredSemaforoMembers.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 30, color: theme.subText, fontStyle: 'italic' }}>
                  No hay registros con este estado de semáforo.
                </Text>
              ) : (
                filteredSemaforoMembers.map((m, idx) => {
                  const isPending = m.membership_status === 'pending_approval' || m.membership_status === 'pending';
                  const hasDate = !!m.membership_expires_at;
                  let statusBadge = { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', label: '🔴 Vencida / S.F' };

                  if (isPending) {
                    statusBadge = { bg: '#f3e8ff', border: '#d8b4fe', text: '#7e22ce', label: '⏳ Por Aprobar' };
                  } else if (hasDate) {
                    const expDate = new Date(m.membership_expires_at);
                    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    if (diffDays < 0) {
                      statusBadge = { bg: '#fee2e2', border: '#fca5a5', text: '#b91c1c', label: `🔴 Vencida (${Math.abs(diffDays)}d)` };
                    } else if (diffDays <= 30) {
                      statusBadge = { bg: '#ffedd5', border: '#fdba74', text: '#c2410c', label: `🟠 Vence en ${diffDays}d` };
                    } else if (diffDays <= 90) {
                      statusBadge = { bg: '#fef9c3', border: '#fde047', text: '#a16207', label: `🟡 Vence en ${diffDays}d (3m)` };
                    } else {
                      statusBadge = { bg: '#dcfce7', border: '#86efac', text: '#15803d', label: `🟢 Vigente (${diffDays}d)` };
                    }
                  }

                  return (
                    <View key={m.id} style={[styles.tableRow, { backgroundColor: isDarkMode ? '#1f1f23' : '#f8fafc', borderColor: theme.border }]}>
                      <Text style={[styles.tableIndex, { color: theme.subText }]}>{idx + 1}</Text>
                      <View style={{ flex: 2 }}>
                        <Text style={[styles.tableMainText, { color: theme.text }]}>{m.name}</Text>
                        <Text style={{ fontSize: 11, color: theme.subText }}>{(m.unit || 'General').toUpperCase()}</Text>
                      </View>

                      {/* BADGE DE SEMÁFORO */}
                      <View style={{ flex: 1.8, alignItems: 'center' }}>
                        <View style={{ backgroundColor: statusBadge.bg, borderColor: statusBadge.border, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: 'bold', color: statusBadge.text }}>{statusBadge.label}</Text>
                        </View>
                        <Text style={{ fontSize: 10, color: theme.subText, marginTop: 2 }}>{m.membership_expires_at || 'Sin fecha'}</Text>
                      </View>

                      {/* BOTONES DE ACCIÓN */}
                      <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                        {isPending && (
                          <TouchableOpacity
                            style={{ backgroundColor: '#16a34a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center' }}
                            onPress={() => handleApproveMembership(m.id)}
                          >
                            <Check size={14} color="white" style={{ marginRight: 2 }} />
                            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>Aprobar</Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={{ backgroundColor: isDarkMode ? '#27272a' : '#e2e8f0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}
                          onPress={() => {
                            setSelectedMemberForMembership(m);
                            setMembershipDateInput(m.membership_expires_at || new Date().toISOString().split('T')[0]);
                            setShowMembershipDatePicker(true);
                          }}
                        >
                          <Text style={{ color: theme.text, fontSize: 11, fontWeight: 'bold' }}>📅 Asignar</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PICKER DE CALENDARIO PARA ASIGNAR MEMBRESÍA */}
      <Modal visible={showMembershipDatePicker} transparent animationType="fade" onRequestClose={() => setShowMembershipDatePicker(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 18, borderRadius: 20, maxWidth: 380, width: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock size={18} color={primaryColor} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                  Vigencia de Membresía
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMembershipDatePicker(false)} style={{ padding: 4 }}>
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
              Asignando a: <Text style={{ fontWeight: 'bold', color: theme.text }}>{selectedMemberForMembership?.name}</Text>
            </Text>

            <RNCalendar
              current={membershipDateInput || new Date().toISOString().split('T')[0]}
              markedDates={{
                [membershipDateInput || '']: { selected: true, selectedColor: primaryColor }
              }}
              onDayPress={(day: DateData) => {
                setMembershipDateInput(day.dateString);
              }}
              theme={{
                calendarBackground: isDarkMode ? '#18181b' : '#ffffff',
                textSectionTitleColor: isDarkMode ? '#a1a1aa' : '#64748b',
                selectedDayBackgroundColor: primaryColor,
                todayTextColor: primaryColor,
                dayTextColor: isDarkMode ? '#ffffff' : '#1e293b',
                arrowColor: primaryColor,
                monthTextColor: isDarkMode ? '#ffffff' : primaryColor,
                textDayFontWeight: 'bold',
                textMonthFontWeight: 'bold',
              }}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setShowMembershipDatePicker(false)} style={{ padding: 10 }}>
                <Text style={{ color: theme.subText }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: primaryColor, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 }}
                onPress={() => {
                  setShowMembershipDatePicker(false);
                  handleSaveMembershipDate();
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Validar Membresía</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR ACTIVIDAD GRUPAL / ASAMBLEA                             */}
      {/* ========================================================================= */}
      <Modal visible={showAddEventModal} transparent animationType="slide" onRequestClose={() => setShowAddEventModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Flag color={primaryColor} size={20} style={{ marginRight: 8 }} />
                <Text style={[modalStyles.title, { color: theme.text }]}>Crear Actividad / Asamblea</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddEventModal(false)} style={{ padding: 6 }}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={[modalStyles.label, { color: theme.subText }]}>TÍTULO DEL EVENTO *</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: Asamblea General de Dirigentes / Campamento Grupal"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={eventTitle}
                onChangeText={setEventTitle}
              />

              <Text style={[modalStyles.label, { color: theme.subText }]}>DESTINO / VISIBILIDAD DEL EVENTO *</Text>
              <View style={modalStyles.scopeRow}>
                {[
                  { id: 'grupo', label: '⚜️ Todo el Grupo' },
                  { id: 'scouters', label: '👥 Solo Scouters (Asamblea)' },
                  { id: 'manada', label: '🟡 Manada' },
                  { id: 'tropa', label: '🟢 Tropa' },
                  { id: 'comunidad', label: '🔵 Caminantes' },
                  { id: 'clan', label: '🔴 Clan' }
                ].map(item => (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      modalStyles.scopeChip,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      eventUnit === item.id && { backgroundColor: UNIT_COLORS[item.id] || primaryColor, borderColor: UNIT_COLORS[item.id] || primaryColor }
                    ]}
                    onPress={() => setEventUnit(item.id as any)}
                  >
                    <Text style={[
                      modalStyles.scopeChipText,
                      { color: theme.subText },
                      eventUnit === item.id && { color: 'white', fontWeight: 'bold' }
                    ]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {eventUnit === 'scouters' && (
                <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#eef2ff', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#6366f1', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: '#4f46e5', fontWeight: 'bold' }}>
                    🔒 Visibilidad Privada: Este evento SOLO lo verán Jefatura y Scouters. Los jóvenes scouts NO lo verán.
                  </Text>
                </View>
              )}

              <Text style={[modalStyles.label, { color: theme.subText }]}>FECHA DEL EVENTO *</Text>
              <TouchableOpacity
                style={[
                  modalStyles.input,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    marginBottom: 10
                  }
                ]}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.8}
              >
                <CalendarIcon size={18} color={primaryColor} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontSize: 13, fontWeight: 'bold' }}>
                    {formatDateWithDayOfWeek(eventDate)}
                  </Text>
                  <Text style={{ color: theme.subText, fontSize: 11 }}>
                    Toca para ver el calendario (Lunes a Domingo)
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={[modalStyles.label, { color: theme.subText }]}>LUGAR Y DETALLES (OPCIONAL)</Text>
              <TextInput
                style={[modalStyles.input, { height: 75, backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Lugar de encuentro, orden del día, materiales requeridos..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                value={eventDesc}
                onChangeText={setEventDesc}
              />

              <TouchableOpacity
                style={[modalStyles.saveBtn, { backgroundColor: primaryColor }]}
                onPress={handleSaveEvent}
                disabled={savingEvent}
              >
                {savingEvent ? <ActivityIndicator color="white" /> : <Text style={modalStyles.saveBtnText}>Publicar en Calendario</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignItems: 'center', paddingVertical: 12, marginBottom: 20 }}
                onPress={() => setShowAddEventModal(false)}
              >
                <Text style={{ color: theme.subText, fontWeight: 'bold', fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL PICKER DE CALENDARIO PARA ACTIVIDAD GRUPAL */}
      <Modal visible={showDatePicker} transparent animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', padding: 18, borderRadius: 20, maxWidth: 380, width: '92%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Flag size={18} color={primaryColor} style={{ marginRight: 6 }} />
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                  Seleccionar Fecha del Evento
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ padding: 4 }}>
                <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
              </TouchableOpacity>
            </View>

            <RNCalendar
              current={eventDate}
              markedDates={{
                [eventDate]: { selected: true, selectedColor: primaryColor }
              }}
              onDayPress={(day: DateData) => {
                setEventDate(day.dateString);
                setShowDatePicker(false);
              }}
              theme={{
                calendarBackground: isDarkMode ? '#18181b' : '#ffffff',
                textSectionTitleColor: isDarkMode ? '#a1a1aa' : '#64748b',
                selectedDayBackgroundColor: primaryColor,
                todayTextColor: primaryColor,
                dayTextColor: isDarkMode ? '#ffffff' : '#1e293b',
                arrowColor: primaryColor,
                monthTextColor: isDarkMode ? '#ffffff' : primaryColor,
                textDayFontWeight: 'bold',
                textMonthFontWeight: 'bold',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* BOTÓN FLOTANTE DE AYUDA Y REPORTES */}
      <HelpFloatingFAB />

      <ThemeCustomizerModal
        visible={showCustomizer}
        onClose={() => setShowCustomizer(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 8,
    elevation: 3
  },
  primaryActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  quickToolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  quickToolBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  statLabel: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold' },

  accordionSection: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden'
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderLeftWidth: 6
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5
  },
  accordionBody: {
    padding: 14,
    borderTopWidth: 1
  },
  subCategoryTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9333ea',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4
  },
  emptySubText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#94a3b8',
    marginBottom: 8,
    paddingLeft: 6
  },

  memberCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8
  },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15
  },
  memberName: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8
  },
  profileBtnText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    marginRight: 2
  },
  docActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)'
  },
  miniDocBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1
  },

  // Estilos de Herramientas de Censo, Padrón y Semáforo
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6
  },
  exportBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 11
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 6
  },
  filterTagText: {
    fontSize: 11
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6
  },
  tableIndex: {
    fontSize: 11,
    fontWeight: 'bold',
    width: 24
  },
  tableMainText: {
    fontSize: 13,
    fontWeight: 'bold'
  },
  trafficCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  trafficCardActive: {
    borderWidth: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  trafficNumber: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  trafficLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center'
  },
  batchApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8
  },
  logoutBtnText: {
    color: '#ef4444',
    fontWeight: 'bold',
    fontSize: 13
  }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', maxWidth: 520, borderRadius: 20, overflow: 'hidden', maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 13 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  scopeChip: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10, borderWidth: 1 },
  scopeChipText: { fontSize: 11, fontWeight: '600' },
  saveBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 16, marginBottom: 8 },
  saveBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
