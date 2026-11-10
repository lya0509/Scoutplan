import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Linking,
  Platform
} from 'react-native';
import {
  Compass,
  Search,
  ChevronRight,
  BookOpen,
  Shield,
  Sparkles,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Award,
  Flame,
  HandMetal,
  MapPin,
  HeartPulse,
  X,
  AlertTriangle,
  Info,
  Play,
  Video,
  Image as ImageIcon,
  Eye,
  FileText,
  ExternalLink,
  WifiOff,
  Wifi,
  ChevronLeft,
  Maximize2
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { colors } from '../theme/colors';
import { navigateBackOrHome } from '../utils/navigationHelper';
import { ManualVisualDiagram } from '../components/ManualVisualDiagram';
import { styles, modalStyles } from './nudosManual/styles';

import { MANUALS_DATA, ManualItem, ManualSectionKey, ModalTabKey } from '../data/manualsData';
export type { ManualSectionKey, ModalTabKey, VisualStep, MultimediaImage, MultimediaData, ManualItem } from '../data/manualsData';

export default function NudosManualScreen({ navigation }: any) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  const { user } = useAuth();

  const [activeSection, setActiveSection] = useState<ManualSectionKey>('nudos');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<ManualItem | null>(null);

  // Tabs internas del modal de técnica: Escrito | Visual | Multimedia
  const [modalTab, setModalTab] = useState<ModalTabKey>('escrito');
  const [visualStepIndex, setVisualStepIndex] = useState<number>(0);
  const [isPlayingWebVideo, setIsPlayingWebVideo] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Checklist de pasos practicados por el scout
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  const toggleStepChecked = (itemKey: string, stepIdx: number) => {
    const key = `${itemKey}_step_${stepIdx}`;
    setCheckedSteps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(selectedItem !== null, () => {
    if (lightboxImage) {
      setLightboxImage(null);
    } else {
      setSelectedItem(null);
      setIsPlayingWebVideo(false);
      setVisualStepIndex(0);
      setModalTab('escrito');
    }
  });

  const handleOpenItem = (item: ManualItem) => {
    setSelectedItem(item);
    setModalTab('escrito');
    setVisualStepIndex(0);
    setIsPlayingWebVideo(false);
  };

  const handleOpenVideoExternal = (embedId?: string, queryTitle?: string) => {
    const targetUrl = embedId
      ? `https://www.youtube.com/watch?v=${embedId}`
      : `https://www.youtube.com/results?search_query=scout+${encodeURIComponent(queryTitle || 'nudos y amarres')}`;
    
    Linking.openURL(targetUrl).catch(err => {
      console.warn('No se pudo abrir el enlace de video:', err);
    });
  };

  const SECTIONS_CONFIG: { id: ManualSectionKey; label: string; icon: string }[] = [
    { id: 'nudos', label: 'Nudos y Amarres', icon: '🪢' },
    { id: 'fogatas', label: 'Fogatas y Fuego', icon: '🔥' },
    { id: 'senas', label: 'Lengua de Señas', icon: '🤟' },
    { id: 'pistas', label: 'Pistas y Rastreo', icon: '🧭' },
    { id: 'primeros_auxilios', label: 'Primeros Auxilios', icon: '🩹' },
  ];

  const filteredItems = MANUALS_DATA.filter(item => {
    const matchesSection = item.section === activeSection;
    if (!matchesSection) return false;

    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.summary.toLowerCase().includes(query) ||
      item.categoryTag.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query)
    );
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA PRINCIPAL */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <TouchableOpacity
          style={{
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 5,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9',
            marginBottom: 10,
            gap: 6
          }}
          onPress={() => navigateBackOrHome(navigation, user?.role)}
        >
          <ArrowLeft size={16} color={theme.text} />
          <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.text }}>Volver</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <View style={[styles.badgePill, { backgroundColor: '#16a34a15', borderColor: '#16a34a' }]}>
            <WifiOff size={11} color="#16a34a" />
            <Text style={[styles.badgePillText, { color: '#16a34a' }]}>100% OFFLINE DISPONIBLE</Text>
          </View>
          <View style={[styles.badgePill, { backgroundColor: '#ef444415', borderColor: '#ef4444' }]}>
            <Video size={11} color="#ef4444" />
            <Text style={[styles.badgePillText, { color: '#ef4444' }]}>VIDEOS & MULTIMEDIA</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: theme.text, marginTop: 4 }]}>Manuales y Técnicas Scout</Text>
        <Text style={[styles.subTitle, { color: theme.subText }]}>
          Guías paso a paso escritas y visuales para campamento, más videos y galería técnica.
        </Text>

        {/* BUSCADOR UNIVERSAL */}
        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
          <Search size={16} color={isDarkMode ? '#71717a' : '#a1a1aa'} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Buscar por técnica, nudo, fogata, seña o auxilio..."
            placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={theme.subText} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SUBMENÚ DE SECCIONES (TABS HORIZONTALES) */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: isDarkMode ? '#18181b' : '#fafafa' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sectionTabsContainer}>
          {SECTIONS_CONFIG.map(sec => {
            const isActive = activeSection === sec.id;
            return (
              <TouchableOpacity
                key={sec.id}
                style={[
                  styles.sectionTabBtn,
                  { backgroundColor: theme.cardBg, borderColor: theme.border },
                  isActive && { backgroundColor: primaryColor, borderColor: primaryColor }
                ]}
                onPress={() => {
                  setActiveSection(sec.id);
                  setSearch('');
                }}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 15, marginRight: 5 }}>{sec.icon}</Text>
                <Text
                  style={[
                    styles.sectionTabText,
                    { color: isActive ? '#ffffff' : theme.text, fontWeight: isActive ? 'bold' : '600' }
                  ]}
                >
                  {sec.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BANNER ESPECIAL SI ESTÁ EN NUDOS: ESPECIALIDAD ASV */}
      {activeSection === 'nudos' && (
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: isDarkMode ? '#1e1b4b' : '#ede9fe',
              borderColor: '#8b5cf6',
              borderWidth: 1.5,
              borderRadius: 14,
              padding: 12,
              gap: 12,
              elevation: 1
            }}
            onPress={() => navigation.navigate('Especialidades')}
            activeOpacity={0.8}
          >
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' }}>
              <Award size={20} color="#ffffff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: isDarkMode ? '#c4b5fd' : '#6d28d9' }}>
                🏅 Especialidad Oficial: Maniobra con Cuerdas
              </Text>
              <Text style={{ fontSize: 12, color: theme.subText, marginTop: 1 }}>
                Revisa los requisitos ASV para obtener la insignia de especialidad.
              </Text>
            </View>
            <ChevronRight size={18} color="#8b5cf6" />
          </TouchableOpacity>
        </View>
      )}

      {/* LISTADO DE ITEMS DEL MANUAL ACTIVO */}
      <ScrollView style={{ flex: 1, padding: 16 }} contentContainerStyle={{ paddingBottom: 40 }}>
        {filteredItems.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <Info size={36} color={theme.subText} style={{ marginBottom: 10 }} />
            <Text style={{ fontWeight: 'bold', fontSize: 15, color: theme.text }}>
              No se encontraron resultados
            </Text>
            <Text style={{ color: theme.subText, fontSize: 12, marginTop: 4, textAlign: 'center' }}>
              Intenta buscar con otra palabra clave o limpia el buscador.
            </Text>
          </View>
        ) : (
          filteredItems.map(item => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.manualCard,
                { backgroundColor: theme.cardBg, borderColor: theme.border }
              ]}
              onPress={() => handleOpenItem(item)}
              activeOpacity={0.8}
            >
              <View style={[styles.manualIconBox, { backgroundColor: isDarkMode ? '#27272a' : 'rgba(99, 102, 241, 0.1)' }]}>
                <Text style={{ fontSize: 26 }}>{item.icon}</Text>
              </View>

              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={[styles.manualName, { color: theme.text }]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.difficulty && (
                    <View
                      style={[
                        styles.diffBadge,
                        {
                          backgroundColor:
                            item.difficulty === 'Básico' || item.difficulty === 'Esencial'
                              ? isDarkMode ? '#064e3b' : '#dcfce7'
                              : isDarkMode ? '#451a03' : '#fef3c7'
                        }
                      ]}
                    >
                      <Text
                        style={[
                          styles.diffBadgeText,
                          {
                            color:
                              item.difficulty === 'Básico' || item.difficulty === 'Esencial'
                                ? isDarkMode ? '#86efac' : '#15803d'
                                : isDarkMode ? '#fde68a' : '#b45309'
                          }
                        ]}
                      >
                        {item.difficulty}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Categoría y Badges multimedia disponibles */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                  <View style={[styles.catTagBadge, { backgroundColor: primaryColor + '15' }]}>
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: theme.accentText }}>
                      {item.categoryTag}
                    </Text>
                  </View>

                  <View style={[styles.miniFeaturePill, isDarkMode && { backgroundColor: 'rgba(74, 222, 128, 0.12)' }]}>
                    <FileText size={10} color={isDarkMode ? '#4ade80' : '#16a34a'} />
                    <Text style={[styles.miniFeatureText, { color: isDarkMode ? '#4ade80' : '#16a34a' }]}>Escrito</Text>
                  </View>

                  <View style={[styles.miniFeaturePill, isDarkMode && { backgroundColor: 'rgba(56, 189, 248, 0.12)' }]}>
                    <Eye size={10} color={isDarkMode ? '#38bdf8' : '#0284c7'} />
                    <Text style={[styles.miniFeatureText, { color: isDarkMode ? '#38bdf8' : '#0284c7' }]}>Visual</Text>
                  </View>

                  {!!item.multimedia?.videoEmbedId && (
                    <View style={[styles.miniFeaturePill, { backgroundColor: '#ef444415' }]}>
                      <Video size={10} color="#ef4444" />
                      <Text style={[styles.miniFeatureText, { color: isDarkMode ? '#f87171' : '#ef4444' }]}>Video</Text>
                    </View>
                  )}
                </View>

                <Text style={[styles.manualSummary, { color: theme.subText }]} numberOfLines={2}>
                  {item.summary}
                </Text>
              </View>

              <ChevronRight size={18} color={isDarkMode ? '#71717a' : '#94a3b8'} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* ==================================================== */}
      {/* MODAL DETALLADO DE LA TÉCNICA CON LAS 3 PESTAÑAS      */}
      {/* 1. ESCRITO | 2. VISUAL OFFLINE | 3. MULTIMEDIA/VIDEO  */}
      {/* ==================================================== */}
      {selectedItem && (
        <Modal
          visible={selectedItem !== null}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setSelectedItem(null);
            setIsPlayingWebVideo(false);
          }}
        >
          <View style={modalStyles.overlay}>
            <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', borderColor: theme.border }]}>
              
              {/* HEADER DEL MODAL */}
              <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 }}>
                  <Text style={{ fontSize: 28, marginRight: 10 }}>{selectedItem.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[modalStyles.title, { color: theme.text }]} numberOfLines={1}>
                      {selectedItem.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.accentText, fontWeight: 'bold' }}>
                      {selectedItem.categoryTag} {selectedItem.difficulty ? `• Nivel ${selectedItem.difficulty}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedItem(null);
                    setIsPlayingWebVideo(false);
                  }}
                  style={{ padding: 6, borderRadius: 8, backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9' }}
                >
                  <X size={20} color={theme.subText} />
                </TouchableOpacity>
              </View>

              {/* BARRA DE PESTAÑAS: ESCRITO / VISUAL / MULTIMEDIA */}
              <View style={[modalStyles.tabBar, { borderBottomColor: theme.border, backgroundColor: isDarkMode ? '#202024' : '#f8fafc' }]}>
                <TouchableOpacity
                  style={[
                    modalStyles.tabBtn,
                    modalTab === 'escrito' && { borderBottomColor: primaryColor, borderBottomWidth: 2.5 }
                  ]}
                  onPress={() => setModalTab('escrito')}
                >
                  <FileText size={15} color={modalTab === 'escrito' ? primaryColor : theme.subText} />
                  <Text
                    style={[
                      modalStyles.tabBtnText,
                      { color: modalTab === 'escrito' ? primaryColor : theme.subText, fontWeight: modalTab === 'escrito' ? 'bold' : '600' }
                    ]}
                  >
                    Guía Escrita
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.tabBtn,
                    modalTab === 'visual' && { borderBottomColor: primaryColor, borderBottomWidth: 2.5 }
                  ]}
                  onPress={() => setModalTab('visual')}
                >
                  <Eye size={15} color={modalTab === 'visual' ? primaryColor : theme.subText} />
                  <Text
                    style={[
                      modalStyles.tabBtnText,
                      { color: modalTab === 'visual' ? primaryColor : theme.subText, fontWeight: modalTab === 'visual' ? 'bold' : '600' }
                    ]}
                  >
                    Visual (Offline)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.tabBtn,
                    modalTab === 'multimedia' && { borderBottomColor: '#ef4444', borderBottomWidth: 2.5 }
                  ]}
                  onPress={() => setModalTab('multimedia')}
                >
                  <Video size={15} color={modalTab === 'multimedia' ? '#ef4444' : theme.subText} />
                  <Text
                    style={[
                      modalStyles.tabBtnText,
                      { color: modalTab === 'multimedia' ? '#ef4444' : theme.subText, fontWeight: modalTab === 'multimedia' ? 'bold' : '600' }
                    ]}
                  >
                    Video y Fotos
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 18 }} contentContainerStyle={{ paddingBottom: 40 }}>
                
                {/* ==================================================== */}
                {/* PESTAÑA 1: GUÍA ESCRITA (OFFLINE)                    */}
                {/* ==================================================== */}
                {modalTab === 'escrito' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <WifiOff size={14} color="#16a34a" />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#16a34a' }}>
                        MODO ESCRITO 100% OFFLINE (DISPONIBLE SIN CONEXIÓN)
                      </Text>
                    </View>

                    {/* Explicación y Uso */}
                    <Text style={[modalStyles.sectionLabel, { color: theme.accentText }]}>DESCRIPCIÓN Y USO SCOUT</Text>
                    <Text style={[modalStyles.useText, { color: theme.text }]}>{selectedItem.description}</Text>

                    {/* Pasos de ejecución con checklist interactivo de práctica */}
                    {selectedItem.steps && selectedItem.steps.length > 0 && (
                      <View style={{ marginTop: 18 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={[modalStyles.sectionLabel, { color: theme.accentText, marginBottom: 0 }]}>
                            PASO A PASO EXPLICADO
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.subText }}>Toca para marcar tu avance</Text>
                        </View>

                        {selectedItem.steps.map((st, idx) => {
                          const isDone = !!checkedSteps[`${selectedItem.id}_step_${idx}`];
                          return (
                            <TouchableOpacity
                              key={idx}
                              style={[
                                modalStyles.stepRow,
                                isDone && { opacity: 0.7 }
                              ]}
                              onPress={() => toggleStepChecked(selectedItem.id, idx)}
                              activeOpacity={0.7}
                            >
                              {isDone ? (
                                <CheckCircle2 size={18} color="#16a34a" style={{ marginTop: 2, marginRight: 10 }} />
                              ) : (
                                <Circle size={18} color={theme.subText} style={{ marginTop: 2, marginRight: 10 }} />
                              )}
                              <Text
                                style={[
                                  modalStyles.stepText,
                                  { color: theme.text, textDecorationLine: isDone ? 'line-through' : 'none' }
                                ]}
                              >
                                {st}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {/* Consejos prácticos de patrulla */}
                    {selectedItem.tips && selectedItem.tips.length > 0 && (
                      <View style={[modalStyles.tipBox, { backgroundColor: isDarkMode ? '#1e293b' : '#eff6ff', borderColor: '#3b82f6' }]}>
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#2563eb', marginBottom: 4 }}>
                          💡 CONSEJOS DE PATRULLA / SCOUTER:
                        </Text>
                        {selectedItem.tips.map((t, idx) => (
                          <Text key={idx} style={{ fontSize: 12, color: isDarkMode ? '#bfdbfe' : '#1e40af', marginBottom: 2 }}>
                            • {t}
                          </Text>
                        ))}
                      </View>
                    )}

                    {/* Advertencia de seguridad */}
                    {!!selectedItem.safety && (
                      <View style={[modalStyles.tipBox, { backgroundColor: isDarkMode ? '#451a03' : '#fef2f2', borderColor: '#ef4444' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                          <AlertTriangle size={14} color="#ef4444" />
                          <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ef4444' }}>
                            PRECAUCIÓN DE SEGURIDAD:
                          </Text>
                        </View>
                        <Text style={{ fontSize: 12, color: isDarkMode ? '#fecaca' : '#991b1b' }}>
                          {selectedItem.safety}
                        </Text>
                      </View>
                    )}

                    {/* Acceso directo a ver el esquema visual */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 20,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: primaryColor + '15',
                        borderWidth: 1,
                        borderColor: primaryColor
                      }}
                      onPress={() => setModalTab('visual')}
                    >
                      <Eye size={16} color={primaryColor} />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.accentText }}>
                        Ver Esquema Visual Paso a Paso (Offline)
                      </Text>
                      <ChevronRight size={16} color={primaryColor} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* ==================================================== */}
                {/* PESTAÑA 2: ESQUEMA VISUAL PASO A PASO (100% OFFLINE)  */}
                {/* ==================================================== */}
                {modalTab === 'visual' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <WifiOff size={14} color="#16a34a" />
                        <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#16a34a' }}>
                          ESQUEMA VECTORIAL OFFLINE
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: theme.subText }}>Sin internet ni descargas</Text>
                    </View>

                    {/* DIAGRAMA VECTORIAL SVG */}
                    <ManualVisualDiagram
                      itemId={selectedItem.id}
                      stepIndex={visualStepIndex}
                      isDarkMode={isDarkMode}
                      primaryColor={primaryColor}
                    />

                    {/* SELECTOR DE PASOS VISUALES */}
                    <View style={{ marginTop: 12 }}>
                      <Text style={[modalStyles.sectionLabel, { color: theme.accentText, marginBottom: 8 }]}>
                        SELECCIONA LA ETAPA DE CONSTRUCCIÓN:
                      </Text>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 6 }}>
                        <TouchableOpacity
                          style={[
                            modalStyles.visualStepPill,
                            { backgroundColor: theme.cardBg, borderColor: theme.border },
                            visualStepIndex === 0 && { backgroundColor: primaryColor, borderColor: primaryColor }
                          ]}
                          onPress={() => setVisualStepIndex(0)}
                        >
                          <Text
                            style={[
                              modalStyles.visualStepPillText,
                              { color: visualStepIndex === 0 ? '#ffffff' : theme.text }
                            ]}
                          >
                            ✓ Vista Final
                          </Text>
                        </TouchableOpacity>

                        {(selectedItem.visualSteps || [
                          { stepNumber: 1, title: 'Paso 1', instruction: 'Inicio de la técnica' },
                          { stepNumber: 2, title: 'Paso 2', instruction: 'Desarrollo de vueltas' },
                          { stepNumber: 3, title: 'Paso 3', instruction: 'Remate y tensión' }
                        ]).map(vs => {
                          const isActive = visualStepIndex === vs.stepNumber;
                          return (
                            <TouchableOpacity
                              key={vs.stepNumber}
                              style={[
                                modalStyles.visualStepPill,
                                { backgroundColor: theme.cardBg, borderColor: theme.border },
                                isActive && { backgroundColor: primaryColor, borderColor: primaryColor }
                              ]}
                              onPress={() => setVisualStepIndex(vs.stepNumber)}
                            >
                              <Text
                                style={[
                                  modalStyles.visualStepPillText,
                                  { color: isActive ? '#ffffff' : theme.text }
                                ]}
                              >
                                Paso {vs.stepNumber}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>

                      {/* EXPLICACIÓN ESPECÍFICA DEL PASO SELECCIONADO */}
                      {visualStepIndex > 0 && selectedItem.visualSteps && (
                        <View style={[modalStyles.stepDetailCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.accentText, marginBottom: 4 }}>
                            {selectedItem.visualSteps[visualStepIndex - 1]?.title || `Paso ${visualStepIndex}`}
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                            {selectedItem.visualSteps[visualStepIndex - 1]?.instruction}
                          </Text>
                          {!!selectedItem.visualSteps[visualStepIndex - 1]?.callout && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                              <Sparkles size={13} color="#eab308" />
                              <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDarkMode ? '#fde047' : '#ca8a04' }}>
                                Clave: {selectedItem.visualSteps[visualStepIndex - 1]?.callout}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}

                      {visualStepIndex === 0 && (
                        <View style={[modalStyles.stepDetailCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
                          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#16a34a', marginBottom: 4 }}>
                            ✓ Resultado Final Azocado
                          </Text>
                          <Text style={{ fontSize: 12, color: theme.text, lineHeight: 18 }}>
                            {selectedItem.summary}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Botón para saltar a video y fotos */}
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        marginTop: 18,
                        padding: 12,
                        borderRadius: 12,
                        backgroundColor: '#ef444415',
                        borderWidth: 1,
                        borderColor: '#ef4444'
                      }}
                      onPress={() => setModalTab('multimedia')}
                    >
                      <Play size={16} color="#ef4444" />
                      <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#ef4444' }}>
                        Ver Video Demostrativo y Fotos Reales
                      </Text>
                      <ChevronRight size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* ==================================================== */}
                {/* PESTAÑA 3: MULTIMEDIA (VIDEO DEMOSTRATIVO & IMÁGENES) */}
                {/* ==================================================== */}
                {modalTab === 'multimedia' && (
                  <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <Wifi size={14} color="#3b82f6" />
                      <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#3b82f6' }}>
                        MULTIMEDIA (REQUIERE CONEXIÓN DE DATOS O WIFI)
                      </Text>
                    </View>

                    {/* SECCIÓN DE VIDEO DEMOSTRATIVO */}
                    <Text style={[modalStyles.sectionLabel, { color: '#ef4444' }]}>VIDEO TUTORIAL DEMOSTRATIVO</Text>
                    
                    <View style={[modalStyles.videoCard, { backgroundColor: isDarkMode ? '#1e1b4b15' : '#fef2f2', borderColor: '#fca5a5' }]}>
                      
                      {/* REPRODUCTOR EN WEB O TARJETA DE REPRODUCCIÓN */}
                      {Platform.OS === 'web' && isPlayingWebVideo && selectedItem.multimedia?.videoEmbedId ? (
                        <View style={{ width: '100%', height: 210, borderRadius: 12, overflow: 'hidden', marginBottom: 10, backgroundColor: '#000000' }}>
                          {/* @ts-ignore iframe for web */}
                          <iframe
                            src={`https://www.youtube.com/embed/${selectedItem.multimedia.videoEmbedId}?autoplay=1&rel=0`}
                            title={selectedItem.multimedia.videoTitle || selectedItem.name}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100%', height: '100%', border: 'none' }}
                          />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={modalStyles.videoThumbBox}
                          onPress={() => {
                            if (Platform.OS === 'web' && selectedItem.multimedia?.videoEmbedId) {
                              setIsPlayingWebVideo(true);
                            } else {
                              handleOpenVideoExternal(selectedItem.multimedia?.videoEmbedId, selectedItem.name);
                            }
                          }}
                          activeOpacity={0.85}
                        >
                          <View style={modalStyles.videoPlayBtn}>
                            <Play size={26} color="#ffffff" fill="#ffffff" style={{ marginLeft: 3 }} />
                          </View>
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold', marginTop: 8 }}>
                            Toca para ver el video demostrativo
                          </Text>
                          {!!selectedItem.multimedia?.videoDuration && (
                            <View style={modalStyles.durationBadge}>
                              <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>
                                ⏱️ {selectedItem.multimedia.videoDuration}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      )}

                      <View style={{ paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text, marginBottom: 2 }}>
                          {selectedItem.multimedia?.videoTitle || `Tutorial: ${selectedItem.name}`}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
                          Fuente: {selectedItem.multimedia?.videoChannel || 'Escultismo y Pionerismo Scout'}
                        </Text>

                        {/* BOTONES DE ACCIÓN PARA EL VIDEO */}
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                          {Platform.OS === 'web' && selectedItem.multimedia?.videoEmbedId && (
                            <TouchableOpacity
                              style={[modalStyles.actionVideoBtn, { backgroundColor: isPlayingWebVideo ? '#64748b' : '#ef4444' }]}
                              onPress={() => setIsPlayingWebVideo(!isPlayingWebVideo)}
                            >
                              <Play size={14} color="#ffffff" />
                              <Text style={modalStyles.actionVideoBtnText}>
                                {isPlayingWebVideo ? 'Cerrar Reproductor' : 'Reproducir en App'}
                              </Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            style={[modalStyles.actionVideoBtn, { backgroundColor: '#dc2626' }]}
                            onPress={() => handleOpenVideoExternal(selectedItem.multimedia?.videoEmbedId, selectedItem.name)}
                          >
                            <ExternalLink size={14} color="#ffffff" />
                            <Text style={modalStyles.actionVideoBtnText}>Abrir en YouTube</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[modalStyles.actionVideoBtn, { backgroundColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]}
                            onPress={() => handleOpenVideoExternal(undefined, selectedItem.name)}
                          >
                            <Search size={14} color={theme.text} />
                            <Text style={[modalStyles.actionVideoBtnText, { color: theme.text }]}>Más videos</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* GALERÍA DE IMÁGENES / ILUSTRACIONES */}
                    <Text style={[modalStyles.sectionLabel, { color: theme.accentText, marginTop: 22 }]}>
                      GALERÍA DE IMÁGENES E ILUSTRACIONES
                    </Text>

                    {selectedItem.multimedia?.images && selectedItem.multimedia.images.length > 0 ? (
                      <View style={{ gap: 12 }}>
                        {selectedItem.multimedia.images.map((img, idx) => (
                          <TouchableOpacity
                            key={idx}
                            style={[modalStyles.imageCard, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}
                            onPress={() => setLightboxImage(img.url)}
                            activeOpacity={0.85}
                          >
                            <Image
                              source={{ uri: img.url }}
                              style={modalStyles.imageThumb}
                              resizeMode="contain"
                            />
                            <View style={modalStyles.imageCaptionBox}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: theme.text }}>
                                {img.caption}
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                                <Maximize2 size={12} color={primaryColor} />
                                <Text style={{ fontSize: 12, color: theme.accentText, fontWeight: 'bold' }}>
                                  Toca para ampliar imagen
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      <View style={[modalStyles.imageFallbackBox, { borderColor: theme.border }]}>
                        <ImageIcon size={32} color={theme.subText} style={{ marginBottom: 8 }} />
                        <Text style={{ fontSize: 13, fontWeight: 'bold', color: theme.text }}>
                          Diagramas visuales disponibles en la pestaña "Visual (Offline)"
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.subText, marginTop: 4, textAlign: 'center' }}>
                          Los esquemas paso a paso vectoriales ya están cargados y funcionan sin conexión.
                        </Text>
                        <TouchableOpacity
                          style={{ marginTop: 10, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: primaryColor }}
                          onPress={() => setModalTab('visual')}
                        >
                          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Ver Esquema Visual</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                  </View>
                )}

              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* LIGHTBOX MODAL PARA VER IMAGEN EN PANTALLA COMPLETA */}
      {!!lightboxImage && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLightboxImage(null)}>
          <View style={modalStyles.lightboxOverlay}>
            <TouchableOpacity style={modalStyles.lightboxCloseBtn} onPress={() => setLightboxImage(null)}>
              <X size={26} color="#ffffff" />
            </TouchableOpacity>
            <Image
              source={{ uri: lightboxImage }}
              style={modalStyles.lightboxImage}
              resizeMode="contain"
            />
          </View>
        </Modal>
      )}

    </View>
  );
}
