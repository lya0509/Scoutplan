import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import HelpFloatingFAB from '../components/HelpFloatingFAB';
import { supabase } from '../lib/supabaseClient';
import { colors, UNIT_COLORS } from '../theme/colors';
import {
  Globe, MapPin, Compass, Users, Award, Calendar, Calendar as CalendarIcon,
  Moon, Sun, FileText, ChevronRight, ChevronDown, ChevronUp, Camera, BookOpen,
  Palette, Plus, X, Shield, ShieldCheck, Flag, Sparkles, Download, Printer,
  Search, CheckCircle2, AlertTriangle, Clock, RefreshCw, Eye, Building, LogOut
} from 'lucide-react-native';
import { showAlert } from '../utils/alert';
import { ThemeCustomizerModal } from '../components/ThemeCustomizerModal';
import {
  exportCensoExcel, exportPadronMedicoExcel, exportMembresiasExcel, printDocumentHTML, MemberRecord
} from '../utils/exportHelpers';

const REGIONS_DATA: { id: string; label: string }[] = [
  { id: 'miranda', label: 'Región Miranda' },
  { id: 'capital', label: 'Región Capital' },
  { id: 'aragua', label: 'Región Aragua' },
  { id: 'carabobo', label: 'Región Carabobo' },
  { id: 'zulia', label: 'Región Zulia' },
  { id: 'lara', label: 'Región Lara' },
  { id: 'bolivar', label: 'Región Bolívar' },
  { id: 'anzoategui', label: 'Región Anzoátegui' },
  { id: 'tachira', label: 'Región Táchira' },
  { id: 'merida', label: 'Región Mérida' },
  { id: 'nueva_esparta', label: 'Región Nueva Esparta' },
];

export default function ComisionadoDashboardScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { isDarkMode, theme, primaryColor, toggleDarkMode } = useTheme();

  const role = user?.role || 'nacional';
  const isNacional = role === 'nacional' || role === 'admin';
  const isRegional = role === 'comisionado_regional';
  const isDistrital = role === 'comisionado_distrital';

  const [showCustomizer, setShowCustomizer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);

  // Filtros territoriales
  const [selectedRegion, setSelectedRegion] = useState<string>(isNacional ? 'all' : (user?.region || 'miranda'));
  const [selectedDistrict, setSelectedDistrict] = useState<string>(isDistrital ? (user?.district || 'all') : 'all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales
  const [showCensoModal, setShowCensoModal] = useState(false);
  const [showPadronMedicoModal, setShowPadronMedicoModal] = useState(false);
  const [showSemaforoModal, setShowSemaforoModal] = useState(false);
  const [showGruposModal, setShowGruposModal] = useState(false);

  // Acordeón de Grupos
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (grpName: string) => {
    setExpandedGroups(prev => ({ ...prev, [grpName]: !prev[grpName] }));
  };

  useFocusEffect(
    useCallback(() => {
      loadTerritorialData();
    }, [user?.role, user?.region, user?.district])
  );

  const loadTerritorialData = async () => {
    setLoading(true);
    try {
      let query = supabase.from('profiles').select('*').order('name', { ascending: true });

      // Aplicar restricciones según nivel
      if (isRegional && user?.region) {
        query = query.eq('region', user.region);
      } else if (isDistrital && user?.district) {
        query = query.eq('district', user.district);
      }

      const { data, error } = await query;
      if (!error && data) {
        setAllProfiles(data);
      }
    } catch (e) {
      console.warn('Error cargando perfiles territoriales:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado reactivo de perfiles según selectores territoriales
  const filteredProfiles = useMemo(() => {
    return allProfiles.filter(p => {
      if (selectedRegion !== 'all' && (p.region || '').toLowerCase() !== selectedRegion.toLowerCase()) {
        return false;
      }
      if (selectedDistrict !== 'all' && (p.district || '').toLowerCase() !== selectedDistrict.toLowerCase()) {
        return false;
      }
      if (selectedGroup !== 'all' && (p.group_name || '').toLowerCase() !== selectedGroup.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchCi = (p.cedula || '').includes(q);
        const matchGrp = (p.group_name || '').toLowerCase().includes(q);
        if (!matchName && !matchCi && !matchGrp) return false;
      }
      return true;
    });
  }, [allProfiles, selectedRegion, selectedDistrict, selectedGroup, searchQuery]);

  // Lista única de Grupos en el filtro actual
  const uniqueGroups = useMemo(() => {
    const grpSet = new Set<string>();
    filteredProfiles.forEach(p => {
      if (p.group_name) grpSet.add(p.group_name);
    });
    return Array.from(grpSet).sort();
  }, [filteredProfiles]);

  // Estadísticas del territorio
  const territorialStats = useMemo(() => {
    const youth = filteredProfiles.filter(p => p.role === 'scout');
    const leaders = filteredProfiles.filter(p => p.role === 'scouter' || p.role === 'jefe_grupo' || p.role.includes('comisionado'));
    const today = new Date();

    let activeCarnet = 0;
    let expiredCarnet = 0;
    let pendingCarnet = 0;

    filteredProfiles.forEach(p => {
      if (p.membership_status === 'pending_approval' || p.membership_status === 'pending') {
        pendingCarnet++;
      } else if (p.membership_expires_at) {
        const diff = Math.ceil((new Date(p.membership_expires_at).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diff >= 0) activeCarnet++;
        else expiredCarnet++;
      } else {
        expiredCarnet++;
      }
    });

    return {
      totalMembers: filteredProfiles.length,
      totalYouth: youth.length,
      totalLeaders: leaders.length,
      totalGroups: uniqueGroups.length,
      activeCarnet,
      expiredCarnet,
      pendingCarnet
    };
  }, [filteredProfiles, uniqueGroups]);

  const getLevelBadgeInfo = () => {
    if (isNacional) {
      return {
        icon: <Globe size={18} color="#ffffff" />,
        title: 'DIRECCIÓN NACIONAL SCOUT',
        subtitle: 'Asociación de Scouts de Venezuela • Supervisión Nacional',
        themeColor: '#4f46e5'
      };
    }
    if (isRegional) {
      return {
        icon: <MapPin size={18} color="#ffffff" />,
        title: `COMISIÓN REGIONAL: ${(user?.region || 'MIRANDA').toUpperCase()}`,
        subtitle: 'Supervisión de Distritos y Grupos Scouts Regionales',
        themeColor: '#059669'
      };
    }
    return {
      icon: <Compass size={18} color="#ffffff" />,
      title: `COMISIÓN DISTRITAL: ${(user?.district || 'DISTRITO').toUpperCase()}`,
      subtitle: `Región ${(user?.region || 'Miranda').toUpperCase()} • Supervisión de Grupos`,
      themeColor: '#d97706'
    };
  };

  const levelInfo = getLevelBadgeInfo();
  const territorialTitle = isNacional ? 'Nivel Nacional' : isRegional ? `Región ${user?.region || ''}` : `Distrito ${user?.district || ''}`;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* CABECERA TERRITORIAL */}
        <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : levelInfo.themeColor }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              {levelInfo.icon}
              <Text style={styles.badgeText}>{levelInfo.title}</Text>
            </View>
            <Text style={styles.subtitle}>{levelInfo.subtitle}</Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => setShowCustomizer(true)}>
              <Palette color="#ffffff" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={toggleDarkMode}>
              {isDarkMode ? <Sun color="#f59e0b" size={20} /> : <Moon color="white" size={20} />}
            </TouchableOpacity>
          </View>
        </View>

        {/* SELECTORES DE ALCANCE TERRITORIAL */}
        <View style={[styles.filterCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.subText, marginBottom: 8, textTransform: 'uppercase' }}>
            🌐 FILTRO DE JURISDICCIÓN TERRITORIAL
          </Text>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {/* Si es Nacional, permite elegir Región */}
            {isNacional && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                <TouchableOpacity
                  style={[styles.scopeChip, selectedRegion === 'all' && { backgroundColor: levelInfo.themeColor, borderColor: levelInfo.themeColor }]}
                  onPress={() => setSelectedRegion('all')}
                >
                  <Text style={[styles.scopeChipText, { color: selectedRegion === 'all' ? 'white' : theme.text }]}>
                    🇻🇪 Todo el País
                  </Text>
                </TouchableOpacity>
                {REGIONS_DATA.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.scopeChip, selectedRegion === r.id && { backgroundColor: levelInfo.themeColor, borderColor: levelInfo.themeColor }]}
                    onPress={() => setSelectedRegion(r.id)}
                  >
                    <Text style={[styles.scopeChipText, { color: selectedRegion === r.id ? 'white' : theme.text }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Selector de Grupo */}
            {uniqueGroups.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.scopeChip, selectedGroup === 'all' && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                  onPress={() => setSelectedGroup('all')}
                >
                  <Text style={[styles.scopeChipText, { color: selectedGroup === 'all' ? 'white' : theme.text }]}>
                    🏢 Todos los Grupos ({uniqueGroups.length})
                  </Text>
                </TouchableOpacity>
                {uniqueGroups.map(grp => (
                  <TouchableOpacity
                    key={grp}
                    style={[styles.scopeChip, selectedGroup === grp && { backgroundColor: primaryColor, borderColor: primaryColor }]}
                    onPress={() => setSelectedGroup(grp)}
                  >
                    <Text style={[styles.scopeChipText, { color: selectedGroup === grp ? 'white' : theme.text }]}>
                      {grp}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* BARRA DE HERRAMIENTAS TERRITORIALES */}
        <View style={{ paddingVertical: 8, paddingHorizontal: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: '#9333ea' }]}
              onPress={() => setShowCensoModal(true)}
              activeOpacity={0.8}
            >
              <Users size={16} color="white" />
              <Text style={styles.toolBtnText}>Censo Territorial</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: '#dc2626' }]}
              onPress={() => setShowPadronMedicoModal(true)}
              activeOpacity={0.8}
            >
              <ShieldCheck size={16} color="white" />
              <Text style={styles.toolBtnText}>Padrón Médico</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: '#d97706' }]}
              onPress={() => setShowSemaforoModal(true)}
              activeOpacity={0.8}
            >
              <Clock size={16} color="white" />
              <Text style={styles.toolBtnText}>Semáforo Carnets ({territorialStats.pendingCarnet})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => navigation.navigate('CalendarStandalone')}
              activeOpacity={0.8}
            >
              <CalendarIcon size={16} color={primaryColor} />
              <Text style={[styles.toolBtnText, { color: theme.text }]}>Calendario</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toolBtn, { backgroundColor: theme.cardBg, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => navigation.navigate('Documentos')}
              activeOpacity={0.8}
            >
              <BookOpen size={16} color={primaryColor} />
              <Text style={[styles.toolBtnText, { color: theme.text }]}>Guías ASV</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={primaryColor} style={{ marginTop: 40 }} />
        ) : (
          <View style={{ padding: 16 }}>

            {/* TARJETAS DE INDICADORES TERRITORIALES */}
            <View style={styles.statsGrid}>
              <View style={[styles.kpiCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Building color={levelInfo.themeColor} size={24} />
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{territorialStats.totalGroups}</Text>
                <Text style={[styles.kpiLabel, { color: theme.subText }]}>Grupos Scouts</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Users color={colors.primary} size={24} />
                <Text style={[styles.kpiNumber, { color: theme.text }]}>{territorialStats.totalYouth}</Text>
                <Text style={[styles.kpiLabel, { color: theme.subText }]}>Jóvenes Scouts</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Shield color="#4f46e5" size={24} />
                <Text style={[styles.kpiNumber, { color: '#4f46e5' }]}>{territorialStats.totalLeaders}</Text>
                <Text style={[styles.kpiLabel, { color: theme.subText }]}>Dirigentes</Text>
              </View>

              <View style={[styles.kpiCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <CheckCircle2 color="#16a34a" size={24} />
                <Text style={[styles.kpiNumber, { color: '#16a34a' }]}>{territorialStats.activeCarnet}</Text>
                <Text style={[styles.kpiLabel, { color: theme.subText }]}>Carnets Activos</Text>
              </View>
            </View>

            {/* DIRECTORIO DE GRUPOS EN EL TERRITORIO */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                🏢 Grupos Scouts en Jurisdicción ({uniqueGroups.length})
              </Text>
              <Text style={{ fontSize: 11, color: theme.subText }}>{filteredProfiles.length} miembros totales</Text>
            </View>

            {uniqueGroups.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Text style={{ color: theme.subText, fontStyle: 'italic' }}>
                  No se encontraron grupos registrados para el filtro territorial seleccionado.
                </Text>
              </View>
            ) : (
              uniqueGroups.map(grpName => {
                const groupMembers = filteredProfiles.filter(p => p.group_name === grpName);
                const scoutsCount = groupMembers.filter(p => p.role === 'scout').length;
                const scoutersCount = groupMembers.filter(p => p.role === 'scouter' || p.role === 'jefe_grupo').length;
                const jefe = groupMembers.find(p => p.role === 'jefe_grupo');
                const isExpanded = !!expandedGroups[grpName];

                return (
                  <View key={grpName} style={[styles.groupCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                    <TouchableOpacity
                      style={styles.groupHeader}
                      onPress={() => toggleGroup(grpName)}
                      activeOpacity={0.8}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Building size={16} color={levelInfo.themeColor} />
                          <Text style={[styles.groupTitle, { color: theme.text }]}>{grpName}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                          {scoutsCount} Scouts • {scoutersCount} Dirigentes {jefe ? `• Jefe: ${jefe.name}` : ''}
                        </Text>
                      </View>
                      {isExpanded ? <ChevronUp size={20} color={theme.subText} /> : <ChevronDown size={20} color={theme.subText} />}
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.groupBody, { borderTopColor: theme.border }]}>
                        {groupMembers.map(m => (
                          <View key={m.id} style={[styles.memberMiniRow, { borderColor: theme.border }]}>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                              <Text style={{ fontSize: 10, color: theme.subText }}>
                                {(m.unit || 'General').toUpperCase()} • {m.role === 'jefe_grupo' ? 'Jefe de Grupo' : m.role === 'scouter' ? 'Dirigente' : 'Scout'}
                                {m.cedula ? ` • C.I: ${m.cedula}` : ''}
                              </Text>
                            </View>
                            <TouchableOpacity
                              style={[styles.viewProfileBtn, { backgroundColor: primaryColor }]}
                              onPress={() => navigation.navigate('ScoutFullProfile', { scoutId: m.id })}
                            >
                              <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>Perfil</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* BOTÓN CERRAR SESIÓN */}
            <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
              <LogOut size={16} color={colors.error} />
              <Text style={styles.logoutBtnText}>Cerrar Sesión Territorial</Text>
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL: CENSO TERRITORIAL (Excel + PDF)                                   */}
      {/* ========================================================================= */}
      <Modal visible={showCensoModal} transparent animationType="slide" onRequestClose={() => setShowCensoModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxWidth: 880, maxHeight: '92%' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Users color="#9333ea" size={22} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[modalStyles.title, { color: theme.text }]}>Censo y Nómina Territorial</Text>
                  <Text style={{ fontSize: 11, color: theme.subText }}>{territorialTitle} • {filteredProfiles.length} Miembros Registrados</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowCensoModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14, flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#15803d' }]}
                onPress={() => exportCensoExcel(filteredProfiles, `Territorial_${territorialTitle}`)}
              >
                <Download size={16} color="white" />
                <Text style={styles.modalActionBtnText}>Exportar a Excel (.XLS)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: levelInfo.themeColor }]}
                onPress={() => {
                  const headers = ['#', 'Nombre Completo', 'Cédula', 'Grupo', 'Rama', 'Rol', 'Teléfono', 'Carnet'];
                  const rows = filteredProfiles.map((m, idx) => [
                    idx + 1,
                    m.name || 'Sin Nombre',
                    m.cedula || 'N/A',
                    m.group_name || 'Sin Grupo',
                    (m.unit || 'General').toUpperCase(),
                    m.role,
                    m.phone || 'N/A',
                    m.membership_status === 'approved' ? `Vigente (${m.membership_expires_at || ''})` : 'Sin Registro'
                  ]);
                  printDocumentHTML(`CENSO TERRITORIAL • ${territorialTitle.toUpperCase()}`, 'ASOCIACIÓN DE SCOUTS DE VENEZUELA', 'Dirección Territorial', headers, rows, levelInfo.themeColor);
                }}
              >
                <Printer size={16} color="white" />
                <Text style={styles.modalActionBtnText}>Imprimir / Guardar PDF</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 16 }}>
              {filteredProfiles.map((m, idx) => (
                <View key={m.id} style={[styles.tableRow, { backgroundColor: isDarkMode ? '#1f1f23' : '#f8fafc', borderColor: theme.border }]}>
                  <Text style={[styles.tableIndex, { color: theme.subText }]}>{idx + 1}</Text>
                  <View style={{ flex: 2 }}>
                    <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                    <Text style={{ fontSize: 10, color: theme.subText }}>C.I: {m.cedula || 'N/A'} • {m.group_name}</Text>
                  </View>
                  <View style={{ flex: 1.5 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: primaryColor }}>{(m.unit || 'General').toUpperCase()}</Text>
                    <Text style={{ fontSize: 10, color: theme.subText }}>{m.role}</Text>
                  </View>
                  <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 10, color: m.membership_status === 'approved' ? '#16a34a' : '#dc2626', fontWeight: 'bold' }}>
                      {m.membership_status === 'approved' ? '✓ Carnet' : 'Sin Carnet'}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: PADRÓN MÉDICO TERRITORIAL (Excel + PDF)                           */}
      {/* ========================================================================= */}
      <Modal visible={showPadronMedicoModal} transparent animationType="slide" onRequestClose={() => setShowPadronMedicoModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxWidth: 880, maxHeight: '92%' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ShieldCheck color="#dc2626" size={22} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[modalStyles.title, { color: theme.text }]}>Padrón Médico Territorial de Contingencia</Text>
                  <Text style={{ fontSize: 11, color: theme.subText }}>Registro médico para eventos distritales, regionales y nacionales</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowPadronMedicoModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14, flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#15803d' }]}
                onPress={() => exportPadronMedicoExcel(filteredProfiles, `Padron_Medico_${territorialTitle}`)}
              >
                <Download size={16} color="white" />
                <Text style={styles.modalActionBtnText}>Exportar a Excel (.XLS)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#dc2626' }]}
                onPress={() => {
                  const headers = ['#', 'Scout / Dirigente', 'Grupo', 'Tipo Sangre', 'Alergias', 'Contacto Emergencia', 'Teléfono'];
                  const rows = filteredProfiles.map((m, idx) => {
                    const med = m.medical_data || {};
                    return [
                      idx + 1,
                      m.name,
                      m.group_name || 'Sin Grupo',
                      med.bloodType || 'S/R',
                      med.allergies ? (med.allergies.medicamento || med.allergies.alimento || 'Ninguna') : 'Ninguna',
                      med.emergencyContactName || 'N/A',
                      med.emergencyPhonePersonal || m.phone || 'N/A'
                    ];
                  });
                  printDocumentHTML(`PADRÓN MÉDICO • ${territorialTitle.toUpperCase()}`, 'REGISTRO DE CONTINGENCIA Y SALUD', 'Dirección Territorial', headers, rows, '#dc2626');
                }}
              >
                <Printer size={16} color="white" />
                <Text style={styles.modalActionBtnText}>Imprimir / Guardar PDF</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 16 }}>
              {filteredProfiles.map((m, idx) => {
                const med = m.medical_data || {};
                return (
                  <View key={m.id} style={[styles.tableRow, { backgroundColor: isDarkMode ? '#1f1f23' : '#f8fafc', borderColor: theme.border }]}>
                    <Text style={[styles.tableIndex, { color: theme.subText }]}>{idx + 1}</Text>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                      <Text style={{ fontSize: 10, color: theme.subText }}>{m.group_name} • {(m.unit || 'General').toUpperCase()}</Text>
                    </View>
                    <View style={{ width: 50, alignItems: 'center' }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#dc2626' }}>{med.bloodType || 'S/R'}</Text>
                    </View>
                    <View style={{ flex: 2, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, color: theme.text, fontWeight: 'bold' }}>{med.emergencyContactName || 'Representante'}</Text>
                      <Text style={{ fontSize: 10, color: primaryColor }}>📞 {med.emergencyPhonePersonal || m.phone || 'Sin tlf'}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SEMÁFORO DE MEMBRESÍAS TERRITORIAL                                 */}
      {/* ========================================================================= */}
      <Modal visible={showSemaforoModal} transparent animationType="slide" onRequestClose={() => setShowSemaforoModal(false)}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxWidth: 880, maxHeight: '92%' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Clock color="#d97706" size={22} style={{ marginRight: 8 }} />
                <View>
                  <Text style={[modalStyles.title, { color: theme.text }]}>Semáforo y Control de Membresías Territorial</Text>
                  <Text style={{ fontSize: 11, color: theme.subText }}>Monitoreo de carnet ASV por grupo y región</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowSemaforoModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 14 }}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: '#15803d' }]}
                onPress={() => exportMembresiasExcel(filteredProfiles, `Control_Membresias_${territorialTitle}`)}
              >
                <Download size={16} color="white" />
                <Text style={styles.modalActionBtnText}>Exportar Reporte a Excel (.XLS)</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ paddingHorizontal: 16 }}>
              {filteredProfiles.map((m, idx) => {
                const hasDate = !!m.membership_expires_at;
                const isPending = m.membership_status === 'pending_approval' || m.membership_status === 'pending';
                let statusLabel = '🔴 Sin Carnet';
                let statusColor = '#dc2626';

                if (isPending) {
                  statusLabel = '⏳ Por Aprobar';
                  statusColor = '#9333ea';
                } else if (hasDate) {
                  const diff = Math.ceil((new Date(m.membership_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  if (diff > 30) {
                    statusLabel = `🟢 Vigente (${diff}d)`;
                    statusColor = '#16a34a';
                  } else if (diff >= 0) {
                    statusLabel = `🟡 Vence (${diff}d)`;
                    statusColor = '#d97706';
                  }
                }

                return (
                  <View key={m.id} style={[styles.tableRow, { backgroundColor: isDarkMode ? '#1f1f23' : '#f8fafc', borderColor: theme.border }]}>
                    <Text style={[styles.tableIndex, { color: theme.subText }]}>{idx + 1}</Text>
                    <View style={{ flex: 2 }}>
                      <Text style={[styles.memberName, { color: theme.text }]}>{m.name}</Text>
                      <Text style={{ fontSize: 10, color: theme.subText }}>{m.group_name} • {(m.unit || 'General').toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1.5, alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 11, fontWeight: 'bold', color: statusColor }}>{statusLabel}</Text>
                      <Text style={{ fontSize: 10, color: theme.subText }}>{m.membership_expires_at || 'Sin fecha'}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <HelpFloatingFAB />
      <ThemeCustomizerModal visible={showCustomizer} onClose={() => setShowCustomizer(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgeText: { fontSize: 14, fontWeight: 'bold', color: 'white', letterSpacing: 0.5 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  iconBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },

  filterCard: { margin: 16, marginBottom: 8, padding: 12, borderRadius: 14, borderWidth: 1 },
  scopeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#d1d5db', marginRight: 6 },
  scopeChipText: { fontSize: 11, fontWeight: '600' },

  toolBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12, gap: 6 },
  toolBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '48%', padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  kpiNumber: { fontSize: 22, fontWeight: 'bold', marginTop: 4 },
  kpiLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },

  sectionTitle: { fontSize: 15, fontWeight: 'bold' },
  emptyBox: { padding: 24, borderRadius: 14, borderWidth: 1, alignItems: 'center' },

  groupCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  groupTitle: { fontSize: 14, fontWeight: 'bold' },
  groupBody: { padding: 10, borderTopWidth: 1 },

  memberMiniRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(150,150,150,0.1)' },
  memberName: { fontSize: 12, fontWeight: 'bold' },
  viewProfileBtn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },

  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 24, padding: 12, gap: 8 },
  logoutBtnText: { color: colors.error, fontWeight: 'bold', fontSize: 13 },

  modalActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, gap: 6 },
  modalActionBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  tableRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6 },
  tableIndex: { fontSize: 11, fontWeight: 'bold', width: 24 }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  sheet: { width: '100%', borderRadius: 20, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' }
});
