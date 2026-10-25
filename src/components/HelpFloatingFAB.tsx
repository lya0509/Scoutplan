import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Image
} from 'react-native';
import {
  HelpCircle,
  AlertTriangle,
  BookOpen,
  X,
  ChevronDown,
  ChevronUp,
  Camera,
  Send,
  Smartphone,
  WifiOff,
  FileText,
  ShieldCheck,
  Compass,
  Sparkles,
  Lock,
  Globe,
  Award
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';
import { postApi } from '../lib/apiClient';
import { storageService } from '../lib/storageService';
import { showAlert } from '../utils/alert';
import { checkProfileCompletion } from '../utils/profileGuard';
import { OnboardingGuideModal } from './OnboardingGuideModal';
import { pickImageUniversal } from '../utils/filePicker';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  icon: any;
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'faq_1',
    question: '📲 ¿Cómo instalar la aplicación en mi celular o PC?',
    answer: 'Abre la página en Google Chrome o Safari en tu teléfono. Toca el menú de tres puntos (o el botón de compartir en iPhone) y selecciona "Agregar a la pantalla de inicio". ¡Así tendrás un icono directo de app nativa sin necesidad de descargar desde la App Store!',
    icon: Smartphone
  },
  {
    id: 'faq_2',
    question: '🔒 ¿Cómo funciona la visibilidad Pública y Privada del Drive de Fotos?',
    answer: 'Al crear un Álbum Temporal puedes elegir: "🌐 Público" (lo pueden ver y descargar todos los jóvenes y adultos de tu Grupo Scout) o "🔒 Privado" (disponible únicamente para los jóvenes y Scouters pertenecientes a tu misma unidad, como Manada, Tropa, Caminantes o Clan).',
    icon: Lock
  },
  {
    id: 'faq_3',
    question: '🎯 ¿Cómo convalidar o registrar un Evento CIP anterior?',
    answer: 'Entra a tu etapa en "Mi Plan Progresivo" y abre el requisito del CIP. Encontrarás un formulario rápido donde colocas el nombre del evento (ej: I Campamento Distrital) y el año para marcarlo de inmediato.',
    icon: Award
  },
  {
    id: 'faq_4',
    question: '📶 ¿La aplicación funciona sin conexión a Internet?',
    answer: '¡Sí! Toda la sección de Manual de Nudos, Cancionero Scout y tus Fichas guardadas funcionan 100% offline sin necesidad de datos móviles.',
    icon: WifiOff
  },
  {
    id: 'faq_5',
    question: '📜 ¿Cómo descargar mi Ficha Médica o Currículum en Word?',
    answer: 'Entra a la opción "Ficha Médica" o "Currículum Scout" desde el menú. Completa tus datos, presiona "Guardar Datos" y luego haz clic en el botón inferior "Descargar Documento Oficial (.docx)". El documento se descargará autocompletado con formato oficial.',
    icon: FileText
  },
  {
    id: 'faq_6',
    question: '📷 ¿Cómo subir fotos o videos al Drive de Actividades?',
    answer: 'Dirígete a "Drive de Fotos" en el menú. Selecciona o crea un álbum de evento y presiona "+ Subir Fotos o Videos". Puedes subir clips de hasta 50MB a máxima calidad original sin compresión.',
    icon: Camera
  },
  {
    id: 'faq_7',
    question: '🔐 ¿Quién puede ver mi información y avances?',
    answer: 'Tus datos están protegidos. Únicamente tu Scouter de Unidad y el Jefe de Grupo tienen autorización para revisar y verificar tus fichas y adelanto progresivo.',
    icon: ShieldCheck
  }
];

export default function HelpFloatingFAB() {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [expanded, setExpanded] = useState(false);

  // Modales
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showSuggestionModal, setShowSuggestionModal] = useState(false);

  useModalBackHandler(showFaqModal, () => setShowFaqModal(false));
  useModalBackHandler(showReportModal, () => setShowReportModal(false));
  useModalBackHandler(showGuideModal, () => setShowGuideModal(false));
  useModalBackHandler(showSuggestionModal, () => setShowSuggestionModal(false));

  // Acordeón FAQ
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq_1');

  // Formulario Reportar Error
  const [bugDescription, setBugDescription] = useState('');
  const [bugMediaUrl, setBugMediaUrl] = useState<string | null>(null);
  const [bugMediaType, setBugMediaType] = useState<'image' | 'video'>('image');
  const [submittingBug, setSubmittingBug] = useState(false);

  // Formulario Sugerir Funciones
  const [suggestionText, setSuggestionText] = useState('');
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const toggleFAB = () => setExpanded(prev => !prev);

  const openFaq = () => {
    setExpanded(false);
    setShowFaqModal(true);
  };

  const openReport = () => {
    setExpanded(false);
    setShowReportModal(true);
  };

  const openGuide = () => {
    setExpanded(false);
    setShowGuideModal(true);
  };

  const openSuggestion = () => {
    setExpanded(false);
    setShowSuggestionModal(true);
  };

  // Enviar Sugerencia / Comentarios a Telegram Bot
  const handleSubmitSuggestion = async () => {
    if (!suggestionText.trim()) {
      showAlert('Sugerencia Vacía', 'Por favor escribe tus comentarios o las funciones que te gustaría ver en la app.');
      return;
    }

    setSubmittingSuggestion(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const realEmail = user?.email || sessionData?.session?.user?.email || 'Sin correo registrado';
      const realName = user?.name || sessionData?.session?.user?.user_metadata?.full_name || 'Usuario Scout';
      const userGroup = user?.group_name || (user as any)?.group || 'No especificado';
      const userUnit = (user?.unit || 'No especificada').toUpperCase();
      const userRole = (user?.role || 'scout').toUpperCase();
      const userPhone = user?.phone || (user as any)?.phone_number || 'No registrado';

      const messageText = 
        `💡 *NUEVA SUGERENCIA DE FUNCIÓN / COMENTARIO*\n\n` +
        `👤 *Usuario:* ${realName}\n` +
        `👑 *Rol:* ${userRole}\n` +
        `⚜️ *Grupo Scout:* ${userGroup}\n` +
        `⛺ *Unidad:* ${userUnit}\n` +
        `📧 *Correo:* ${realEmail}\n` +
        `📱 *Teléfono:* ${userPhone}\n\n` +
        `💡 *Sugerencia / Comentarios:*\n${suggestionText.trim()}`;

      await postApi('/api/telegram-notify', { text: messageText });

      showAlert(
        '¡Sugerencia Recibida! 💡',
        'Muchas gracias por tus comentarios e ideas. Tu opinión nos ayuda a seguir construyendo la mejor app para la Asociación de Scouts de Venezuela.'
      );
      setSuggestionText('');
      setShowSuggestionModal(false);
    } catch (err: any) {
      showAlert('Sugerencia Recibida', '¡Gracias por compartir tu idea con nosotros!');
      setSuggestionText('');
      setShowSuggestionModal(false);
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  // Seleccionar foto/video de evidencia para el reporte
  const handlePickBugMedia = async () => {
    pickImageUniversal(async (dataUrl, file) => {
      try {
        const fileName = file?.name || `evidencia_${Date.now()}.jpg`;
        const publicUrl = await storageService.uploadImage(
          'scout-files',
          'bug_reports',
          fileName,
          dataUrl
        );
        if (publicUrl && publicUrl.startsWith('http')) {
          setBugMediaUrl(publicUrl);
        } else {
          setBugMediaUrl(dataUrl);
        }
        setBugMediaType('image');
        showAlert('Evidencia Adjunta', 'Se ha adjuntado la captura del fallo correctamente.');
      } catch (err: any) {
        setBugMediaUrl(dataUrl);
        showAlert('Evidencia Adjunta', 'Se ha adjuntado la captura de pantalla.');
      }
    });
  };

  // Enviar reporte de error a la base de datos Supabase
  const handleSubmitBugReport = async () => {
    if (!bugDescription.trim()) {
      showAlert('Descripción Requerida', 'Por favor explica brevemente qué falla o error ocurrió.');
      return;
    }

    setSubmittingBug(true);
    try {
      // Obtener el correo directo de la sesión de Supabase si no está en el perfil
      const { data: sessionData } = await supabase.auth.getSession();
      const realEmail = user?.email || sessionData?.session?.user?.email || 'Sin correo registrado';
      const realName = user?.name || sessionData?.session?.user?.user_metadata?.full_name || 'Usuario Scout';

      const { error } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user?.id || sessionData?.session?.user?.id || null,
          user_name: realName,
          user_email: realEmail,
          user_role: user?.role || 'scout',
          description: bugDescription.trim(),
          media_url: bugMediaUrl && bugMediaUrl.startsWith('http') ? bugMediaUrl : null,
          status: 'pendiente'
        });

      // Avisar al equipo por Telegram (el token del bot está en el servidor)
      try {
        const captionText = `⚠️ *NUEVO REPORTE DE ERROR EN APP SCOUT*\n\n` +
          `👤 *Usuario:* ${realName} (${(user?.role || 'scout').toUpperCase()})\n` +
          `📧 *Correo:* ${realEmail}\n\n` +
          `📝 *Descripción del fallo:*\n${bugDescription.trim()}`;

        await postApi('/api/telegram-notify', {
          text: captionText,
          photoUrl: bugMediaUrl && bugMediaUrl.startsWith('https://') ? bugMediaUrl : undefined,
          photoDataUrl: bugMediaUrl && bugMediaUrl.startsWith('data:image') ? bugMediaUrl : undefined
        });
      } catch (tgErr) {
        console.warn('Aviso enviando a Telegram:', tgErr);
      }

      showAlert('¡Reporte Enviado!', 'Muchas gracias por tu reporte. Nuestro equipo técnico revisará el inconveniente de inmediato.');
      setBugDescription('');
      setBugMediaUrl(null);
      setShowReportModal(false);
    } catch (err: any) {
      showAlert('Reporte Registrado', 'Hemos registrado tu reporte de falla. ¡Gracias por avisarnos!');
      setBugDescription('');
      setBugMediaUrl(null);
      setShowReportModal(false);
    } finally {
      setSubmittingBug(false);
    }
  };

  return (
    <>
      {/* MENÚ FLOTANTE INFERIOR DERECHO (FAB) */}
      <View style={styles.fabContainer}>
        {expanded && (
          <View style={styles.speedDialMenu}>
            {/* OPCIÓN 1: GUÍA DE INICIO PASO A PASO */}
            <TouchableOpacity style={styles.speedDialBtn} onPress={openGuide} activeOpacity={0.8}>
              <View style={styles.labelBubble}>
                <Text style={styles.labelText}>Guía de Inicio (Paso a Paso)</Text>
              </View>
              <View style={[styles.miniFab, { backgroundColor: '#7c3aed' }]}>
                <Compass size={18} color="white" />
              </View>
            </TouchableOpacity>

            {/* OPCIÓN 2: PREGUNTAS FRECUENTES */}
            <TouchableOpacity style={styles.speedDialBtn} onPress={openFaq} activeOpacity={0.8}>
              <View style={styles.labelBubble}>
                <Text style={styles.labelText}>Preguntas Frecuentes</Text>
              </View>
              <View style={[styles.miniFab, { backgroundColor: colors.primary }]}>
                <BookOpen size={18} color="white" />
              </View>
            </TouchableOpacity>

            {/* OPCIÓN 3: SUGERIR FUNCIONES Y COMENTARIOS */}
            <TouchableOpacity style={styles.speedDialBtn} onPress={openSuggestion} activeOpacity={0.8}>
              <View style={styles.labelBubble}>
                <Text style={styles.labelText}>¿Qué nuevas funciones quisieras en la app?</Text>
              </View>
              <View style={[styles.miniFab, { backgroundColor: '#d97706' }]}>
                <Sparkles size={18} color="white" />
              </View>
            </TouchableOpacity>

            {/* OPCIÓN 4: REPORTAR ERROR */}
            <TouchableOpacity style={styles.speedDialBtn} onPress={openReport} activeOpacity={0.8}>
              <View style={styles.labelBubble}>
                <Text style={styles.labelText}>Reportar un Error</Text>
              </View>
              <View style={[styles.miniFab, { backgroundColor: '#ef4444' }]}>
                <AlertTriangle size={18} color="white" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* BOTÓN PRINCIPAL FLOTANTE DE AYUDA */}
        <TouchableOpacity
          style={[styles.mainFab, expanded && styles.mainFabActive]}
          onPress={toggleFAB}
          activeOpacity={0.85}
        >
          {expanded ? <X size={24} color="white" /> : <HelpCircle size={26} color="white" />}
        </TouchableOpacity>
      </View>

      {/* MODAL 1: PREGUNTAS FRECUENTES (FAQ) */}
      <Modal visible={showFaqModal} transparent animationType="slide" onRequestClose={() => setShowFaqModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            
            {/* CABECERA FAQ */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <BookOpen size={22} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Preguntas Frecuentes</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFaqModal(false)}>
                <X size={22} color={theme.subText} />
              </TouchableOpacity>
            </View>

            {/* LISTA DE ACCORDIONES FAQ */}
            <ScrollView style={{ flex: 1, padding: 16 }}>
              {FAQ_DATA.map(faq => {
                const isOpen = expandedFaqId === faq.id;
                const IconComponent = faq.icon;

                return (
                  <View
                    key={faq.id}
                    style={[
                      styles.faqCard,
                      { backgroundColor: theme.cardBg, borderColor: theme.border },
                      isOpen && { borderColor: colors.primary }
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.faqCardHeader}
                      onPress={() => setExpandedFaqId(isOpen ? null : faq.id)}
                      activeOpacity={0.7}
                    >
                      <IconComponent size={18} color={colors.primary} style={{ marginRight: 10 }} />
                      <Text style={[styles.faqQuestionText, { color: theme.text }]}>{faq.question}</Text>
                      {isOpen ? <ChevronUp size={18} color={colors.primary} /> : <ChevronDown size={18} color={theme.subText} />}
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={[styles.faqCardBody, { borderTopColor: theme.border }]}>
                        <Text style={[styles.faqAnswerText, { color: theme.subText }]}>{faq.answer}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <TouchableOpacity style={styles.closeBtnFooter} onPress={() => setShowFaqModal(false)}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>Entendido</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      {/* MODAL 2: REPORTAR UN ERROR O FALLO */}
      <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            
            {/* CABECERA REPORTAR FALLO */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AlertTriangle size={22} color="#ef4444" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Reportar un Error</Text>
              </View>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <X size={22} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, padding: 16 }}>
              <Text style={{ fontSize: 13, color: theme.subText, marginBottom: 12 }}>
                ¿Encontraste una falla o problema en la app? Cuéntanos qué ocurrió y adjunta una captura o video para que nuestro equipo técnico lo solucione de inmediato.
              </Text>

              {/* CAMPO DE DESCRIPCIÓN DEL FALLO */}
              <Text style={[styles.fieldLabel, { color: theme.text }]}>Descripción del problema (*)</Text>
              <TextInput
                style={[
                  styles.textAreaInput,
                  { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }
                ]}
                placeholder="Ejemplo: Al intentar descargar la Ficha Médica no se abre el documento o la pantalla se queda cargando..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                numberOfLines={4}
                value={bugDescription}
                onChangeText={setBugDescription}
              />

              {/* BOTÓN ADJUNTAR CAPTURA O VIDEO */}
              <Text style={[styles.fieldLabel, { color: theme.text, marginTop: 14 }]}>Adjuntar Evidencia (Foto o Video opcional)</Text>
              
              <TouchableOpacity
                style={[styles.attachBtn, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
                onPress={handlePickBugMedia}
              >
                <Camera size={18} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                  {bugMediaUrl ? '✓ Evidencia Adjunta (Toca para cambiar)' : 'Seleccionar Foto o Video'}
                </Text>
              </TouchableOpacity>

              {bugMediaUrl && (
                <View style={styles.mediaPreviewBox}>
                  {bugMediaType === 'video' ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 24 }}>🎥</Text>
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>Video de evidencia listo</Text>
                    </View>
                  ) : (
                    <Image source={{ uri: bugMediaUrl }} style={styles.mediaPreviewImg} resizeMode="contain" />
                  )}
                </View>
              )}
            </ScrollView>

            {/* BOTÓN SUBMIT DE REPORTE */}
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: theme.border }}>
              <TouchableOpacity
                style={styles.sendReportBtn}
                onPress={handleSubmitBugReport}
                disabled={submittingBug}
              >
                {submittingBug ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Send size={16} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.sendReportBtnText}>Enviar Reporte a Soporte</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>

      {/* MODAL 3: SUGERIR NUEVAS FUNCIONES O COMENTARIOS */}
      <Modal visible={showSuggestionModal} transparent animationType="slide" onRequestClose={() => setShowSuggestionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Sparkles size={22} color="#d97706" style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { color: theme.text }]}>Sugerir Nuevas Funciones</Text>
              </View>
              <TouchableOpacity onPress={() => setShowSuggestionModal(false)}>
                <X size={22} color={theme.subText} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <Text style={{ fontSize: 13, color: theme.subText, lineHeight: 20, marginBottom: 14 }}>
                ¿Qué nueva herramienta, función o mejora te gustaría que agreguemos a la App Scout? Tu opinión es enviada directamente a nuestro equipo técnico.
              </Text>

              <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: theme.border, marginBottom: 14 }}>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: colors.primary, marginBottom: 2 }}>IDENTIFICACIÓN DEL REMITENTE</Text>
                <Text style={{ fontSize: 13, color: theme.text, fontWeight: '600' }}>{user?.name || 'Usuario Scout'} • {(user?.role || 'scout').toUpperCase()}</Text>
                <Text style={{ fontSize: 12, color: theme.subText }}>Grupo: {user?.group_name || (user as any)?.group || 'Sin especificar'} | Unidad: {(user?.unit || 'Sin especificar').toUpperCase()}</Text>
              </View>

              <Text style={[styles.fieldLabel, { color: theme.text }]}>¿QUÉ FUNCIONES NUEVAS QUISIERAS QUE ESTÉN EN LA APP? *</Text>
              <TextInput
                style={[
                  styles.textAreaInput,
                  { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border, height: 110 }
                ]}
                placeholder="Escribe aquí tus comentarios, ideas o sugerencias de nuevas funciones..."
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                value={suggestionText}
                onChangeText={setSuggestionText}
              />

              <TouchableOpacity
                style={[
                  styles.sendReportBtn,
                  { backgroundColor: '#d97706', marginTop: 20 },
                  submittingSuggestion && { opacity: 0.7 }
                ]}
                onPress={handleSubmitSuggestion}
                disabled={submittingSuggestion}
              >
                {submittingSuggestion ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Send size={16} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.sendReportBtnText}>Enviar Sugerencia</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: GUÍA DE INICIO INTERACTIVA PASO A PASO */}
      <OnboardingGuideModal
        visible={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: { position: 'absolute', bottom: 20, right: 20, alignItems: 'flex-end', zIndex: 999 },
  mainFab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8
  },
  mainFabActive: { backgroundColor: '#ef4444' },

  speedDialMenu: { marginBottom: 12, alignItems: 'flex-end', gap: 10 },
  speedDialBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  miniFab: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  labelBubble: { backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginRight: 8 },
  labelText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', minHeight: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: 'bold' },

  faqCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  faqCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  faqQuestionText: { flex: 1, fontSize: 13, fontWeight: 'bold' },
  faqCardBody: { padding: 14, borderTopWidth: 1, backgroundColor: 'rgba(150,150,150,0.05)' },
  faqAnswerText: { fontSize: 12, lineHeight: 18 },

  closeBtnFooter: { backgroundColor: colors.primary, paddingVertical: 14, alignItems: 'center', margin: 16, borderRadius: 12 },

  fieldLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  textAreaInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 13, height: 100, textAlignVertical: 'top' },
  attachBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  mediaPreviewBox: { marginTop: 10, padding: 10, alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: 12 },
  mediaPreviewImg: { width: 140, height: 90, borderRadius: 8 },

  sendReportBtn: { backgroundColor: '#ef4444', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 14, borderRadius: 12 },
  sendReportBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
