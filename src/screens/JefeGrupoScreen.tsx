import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Calendar as RNCalendar, DateData } from 'react-native-calendars';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import HelpFloatingFAB from '../components/HelpFloatingFAB';
import { supabase } from '../lib/supabaseClient';
import { colors, UNIT_COLORS } from '../theme/colors';
import {
  Users, Award, Calendar, Calendar as CalendarIcon, Moon, Sun, FileText,
  ChevronRight, ChevronDown, ChevronUp, Camera, BookOpen, Palette, Plus, X, Shield, ShieldCheck, Flag, Sparkles
} from 'lucide-react-native';
import { showAlert } from '../utils/alert';
import { ThemeCustomizerModal } from '../components/ThemeCustomizerModal';

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
  const { user } = useAuth();
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

  // Modal para agregar actividad grupal o asamblea de scouters
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventUnit, setEventUnit] = useState<'grupo' | 'scouters' | 'manada' | 'tropa' | 'comunidad' | 'clan'>('grupo');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingEvent, setSavingEvent] = useState(false);

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
          .from('user_requirements')
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

  // Filtrado de miembros por Rama y Rol
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
          <View style={[styles.avatarBox, isScouterRole && { backgroundColor: '#4f46e5' }]}>
            <Text style={styles.avatarText}>{member.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
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
          </View>
        </View>

        {/* BARRA DE ACCIONES RÁPIDAS DE JEFATURA */}
        <View style={{ paddingVertical: 12, paddingHorizontal: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {/* BOTÓN DESTACADO PARA AGREGAR ACTIVIDADES GRUPALES / ASAMBLEAS */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: primaryColor }]}
              onPress={() => setShowAddEventModal(true)}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#ffffff" />
              <Text style={styles.primaryActionBtnText}>+ Nueva Actividad / Asamblea</Text>
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
              onPress={() => navigation.navigate('QuarterlyPlan')}
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
          </ScrollView>
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
                  {/* Scouters de Manada */}
                  <Text style={styles.subCategoryTitle}>👔 Scouters / Dirigentes de Manada ({manadaData.scouters.length})</Text>
                  {manadaData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouters registrados en Manada.</Text>
                  ) : (
                    manadaData.scouters.map(s => renderMemberCard(s, 'Dirigente de Manada / Akela', true))
                  )}

                  {/* Lobatos (Masculinos) */}
                  <Text style={[styles.subCategoryTitle, { marginTop: 12 }]}>🐺 Lobatos ({manadaData.lobatos?.length || 0})</Text>
                  {manadaData.lobatos?.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay lobatos registrados.</Text>
                  ) : (
                    manadaData.lobatos?.map(s => renderMemberCard(s, 'Lobato • Manada'))
                  )}

                  {/* Lobeznas (Femeninas) */}
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
                  {/* Scouters de Tropa */}
                  <Text style={styles.subCategoryTitle}>👔 Scouters de Tropa ({tropaData.scouters.length})</Text>
                  {tropaData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouters registrados en Tropa.</Text>
                  ) : (
                    tropaData.scouters.map(s => renderMemberCard(s, 'Dirigente de Tropa', true))
                  )}

                  {/* Scouts de Tropa */}
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
                  {/* Scouters de Caminantes */}
                  <Text style={styles.subCategoryTitle}>👔 Scouters de Caminantes ({caminantesData.scouters.length})</Text>
                  {caminantesData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay scouters registrados en Caminantes.</Text>
                  ) : (
                    caminantesData.scouters.map(s => renderMemberCard(s, 'Dirigente de Caminantes', true))
                  )}

                  {/* Jóvenes Caminantes */}
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
                    {clanData.scouters.length} Asesores/Scouters • {clanData.totalYouth} Rovers
                  </Text>
                </View>
                {expanded.clan ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
              </TouchableOpacity>

              {expanded.clan && (
                <View style={[styles.accordionBody, { borderTopColor: theme.border }]}>
                  {/* Scouters de Clan */}
                  <Text style={styles.subCategoryTitle}>👔 Scouters / Asesores de Clan ({clanData.scouters.length})</Text>
                  {clanData.scouters.length === 0 ? (
                    <Text style={styles.emptySubText}>No hay asesores registrados en Clan.</Text>
                  ) : (
                    clanData.scouters.map(s => renderMemberCard(s, 'Asesor Rover / Scouter de Clan', true))
                  )}

                  {/* Rovers */}
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

          </View>
        )}
      </ScrollView>

      {/* MODAL REGISTRAR ACTIVIDAD GRUPAL / ASAMBLEA */}
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
