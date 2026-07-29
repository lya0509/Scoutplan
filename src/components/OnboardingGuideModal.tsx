import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Compass, Award, Calendar, FileText, ChevronRight, ChevronLeft, Check, X } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

interface OnboardingGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    icon: Compass,
    title: '¡Bienvenido a tu App Scout!',
    subtitle: 'Asociación de Scouts de Venezuela',
    description: 'Diseñada especialmente para acompañarte en tu crecimiento, insignia a insignia, facilitando el trabajo colaborativo con tus compañeros y Scouters.',
    badge: '⚜️ Guía Rápida - Paso 1 de 4',
    color: colors.primary
  },
  {
    icon: Award,
    title: 'Mi Plan Progresivo',
    subtitle: 'Registro de Insignias y Desafíos',
    description: 'Explora las etapas oficiales (Precursor, Expedicionario, Descubridor, Fundador y Rover Ciudadano). Completa tus retos y envíalos a revisión con un solo toque.',
    badge: '🎯 Avance Scout - Paso 2 de 4',
    color: '#16a34a'
  },
  {
    icon: Calendar,
    title: 'Plan Trimestral Colaborativo',
    subtitle: 'Cronograma Único de Unidad',
    description: 'Toda la unidad comparte un solo Plan Trimestral. Puedes proponer actividades, editar con confirmación doble y exportar la plantilla oficial en Excel.',
    badge: '📅 Unidad - Paso 3 de 4',
    color: '#d97706'
  },
  {
    icon: FileText,
    title: 'Currículum Word & Herramientas Offline',
    subtitle: 'Exportación y Manuales',
    description: 'Genera tu Currículum Scout Joven auto-rellenado en formato Word (.docx) con tu foto. Además, consulta el Manual de Nudos y Cancionero 100% sin internet.',
    badge: '🚀 Herramientas - Paso 4 de 4',
    color: '#7c3aed'
  }
];

export const OnboardingGuideModal: React.FC<OnboardingGuideModalProps> = ({ visible, onClose }) => {
  const { isDarkMode, theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (visible) {
      setCurrentStep(0);
    }
  }, [visible]);

  const step = STEPS[currentStep];
  const StepIcon = step.icon;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: isDarkMode ? '#27272a' : '#e2e8f0' }]}>
          
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
            <X size={20} color={isDarkMode ? '#a1a1aa' : '#64748b'} />
          </TouchableOpacity>

          {/* BADGE DE PASO */}
          <View style={[styles.stepBadge, { backgroundColor: step.color + '18' }]}>
            <Text style={[styles.stepBadgeText, { color: step.color }]}>{step.badge}</Text>
          </View>

          {/* ICONO GRANDE */}
          <View style={[styles.iconCircle, { backgroundColor: step.color + '15', borderColor: step.color + '30' }]}>
            <StepIcon size={44} color={step.color} />
          </View>

          {/* TÍTULO Y DESCRIPCIÓN */}
          <Text style={[styles.title, { color: theme.text }]}>{step.title}</Text>
          <Text style={[styles.subtitle, { color: step.color }]}>{step.subtitle}</Text>
          
          <View style={[styles.descBox, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: isDarkMode ? '#3f3f46' : '#e2e8f0' }]}>
            <Text style={[styles.description, { color: theme.subText }]}>
              {step.description}
            </Text>
          </View>

          {/* PUNTOS DE PROGRESO */}
          <View style={styles.dotsRow}>
            {STEPS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  { backgroundColor: index === currentStep ? step.color : isDarkMode ? '#3f3f46' : '#cbd5e1' },
                  index === currentStep && { width: 22 }
                ]}
              />
            ))}
          </View>

          {/* BOTONES DE NAVEGACIÓN */}
          <View style={styles.actionsRow}>
            {currentStep > 0 ? (
              <TouchableOpacity style={[styles.btnPrev, { borderColor: theme.border }]} onPress={handlePrev}>
                <ChevronLeft size={18} color={theme.text} />
                <Text style={[styles.btnPrevText, { color: theme.text }]}>Anterior</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            <TouchableOpacity
              style={[styles.btnNext, { backgroundColor: step.color }]}
              onPress={handleNext}
              activeOpacity={0.85}
            >
              <Text style={styles.btnNextText}>
                {currentStep === STEPS.length - 1 ? '¡Comenzar Experiencia!' : 'Siguiente'}
              </Text>
              {currentStep === STEPS.length - 1 ? (
                <Check size={18} color="white" style={{ marginLeft: 6 }} />
              ) : (
                <ChevronRight size={18} color="white" style={{ marginLeft: 6 }} />
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  stepBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    marginBottom: 16,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 14,
  },
  descBox: {
    width: '100%',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    width: 8,
    borderRadius: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },
  btnPrev: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnPrevText: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  btnNext: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  btnNextText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
