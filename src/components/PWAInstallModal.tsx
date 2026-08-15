import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  ScrollView
} from 'react-native';
import { Download, X, Smartphone, CheckCircle, Share2, PlusSquare, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

interface Props {
  visible: boolean;
  onClose: () => void;
}

// Variable global para capturar el evento de instalación nativo en Web
let deferredInstallPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => {
    e.preventDefault();
    deferredInstallPrompt = e;
  });
}

export function PWAInstallModal({ visible, onClose }: Props) {
  const { isDarkMode, theme, primaryColor } = useTheme();
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isRunningStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(isRunningStandalone);

      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    }
  }, [visible]);

  const handleNativeInstall = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showAlert('🎉 ¡Instalación Iniciada!', 'La aplicación de Plan Progresivo Scout se ha instalado en tu dispositivo.');
        deferredInstallPrompt = null;
        onClose();
      }
    } else if (isIOS) {
      // Instrucciones en pantalla para iOS Safari
    } else {
      showAlert(
        'Instalar Aplicación 📲',
        'En el menú de 3 puntos (⋮) de tu navegador Chrome o Edge, selecciona "Instalar aplicación" o "Añadir a la pantalla principal".'
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff', borderColor: theme.border }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, { backgroundColor: primaryColor + '20' }]}>
                <Smartphone size={22} color={primaryColor} />
              </View>
              <Text style={[styles.title, { color: theme.text }]}>Instalar Aplicación</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 20 }}>
            {isStandalone ? (
              <View style={[styles.installedBox, { backgroundColor: isDarkMode ? '#14532d' : '#dcfce7', borderColor: '#16a34a' }]}>
                <CheckCircle size={28} color="#16a34a" style={{ marginBottom: 8 }} />
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDarkMode ? '#86efac' : '#15803d', textAlign: 'center' }}>
                  ✓ ¡Aplicación ya instalada!
                </Text>
                <Text style={{ fontSize: 12, color: isDarkMode ? '#dcfce7' : '#166534', textAlign: 'center', marginTop: 4 }}>
                  Estás utilizando la versión nativa e independiente de Plan Progresivo Scout.
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.description, { color: theme.text }]}>
                  Instala la aplicación en tu teléfono o PC para acceder sin barras de navegación, con carga instantánea y soporte 100% offline en campamentos.
                </Text>

                {deferredInstallPrompt ? (
                  <TouchableOpacity
                    style={[styles.primaryInstallBtn, { backgroundColor: primaryColor }]}
                    onPress={handleNativeInstall}
                    activeOpacity={0.85}
                  >
                    <Download size={20} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryInstallBtnText}>Instalar Aplicación Ahora</Text>
                  </TouchableOpacity>
                ) : isIOS ? (
                  <View style={[styles.iosInstructions, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
                    <Text style={[styles.iosTitle, { color: primaryColor }]}>🍎 Pasos para iPhone / iPad (Safari):</Text>
                    
                    <View style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: primaryColor }]}>
                        <Text style={styles.stepNumText}>1</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text }]}>
                        Toca el botón <Text style={{ fontWeight: 'bold' }}>Compartir</Text> (ícono de cuadro con flecha ⎋) en la barra inferior de Safari.
                      </Text>
                    </View>

                    <View style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: primaryColor }]}>
                        <Text style={styles.stepNumText}>2</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text }]}>
                        Desplázate hacia abajo y selecciona <Text style={{ fontWeight: 'bold' }}>"Añadir a la pantalla de inicio"</Text> ➕.
                      </Text>
                    </View>

                    <View style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: primaryColor }]}>
                        <Text style={styles.stepNumText}>3</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text }]}>
                        Toca <Text style={{ fontWeight: 'bold' }}>"Añadir"</Text> arriba a la derecha. ¡Listo! Se abrirá como app 100% independiente.
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={[styles.iosInstructions, { backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', borderColor: theme.border }]}>
                    <Text style={[styles.iosTitle, { color: primaryColor }]}>🤖 Pasos para Android (Chrome / Samsung):</Text>
                    
                    <View style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: primaryColor }]}>
                        <Text style={styles.stepNumText}>1</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text }]}>
                        Toca el menú de <Text style={{ fontWeight: 'bold' }}>tres puntos (⋮)</Text> en la esquina superior de tu navegador.
                      </Text>
                    </View>

                    <View style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: primaryColor }]}>
                        <Text style={styles.stepNumText}>2</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text }]}>
                        Selecciona <Text style={{ fontWeight: 'bold' }}>"Instalar aplicación"</Text> o <Text style={{ fontWeight: 'bold' }}>"Añadir a pantalla de inicio"</Text>.
                      </Text>
                    </View>

                    <View style={styles.stepRow}>
                      <View style={[styles.stepNum, { backgroundColor: primaryColor }]}>
                        <Text style={styles.stepNumText}>3</Text>
                      </View>
                      <Text style={[styles.stepText, { color: theme.text }]}>
                        Confirma tocando <Text style={{ fontWeight: 'bold' }}>"Instalar"</Text>. La app aparecerá con su ícono en tu menú de aplicaciones.
                      </Text>
                    </View>
                  </View>
                )}
              </>
            )}

            <TouchableOpacity style={styles.understoodBtn} onPress={onClose}>
              <Text style={[styles.understoodText, { color: theme.subText }]}>Cerrar</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    maxHeight: '90%'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBox: {
    padding: 8,
    borderRadius: 12,
    marginRight: 10
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold'
  },
  closeBtn: {
    padding: 6
  },
  body: {
    padding: 20
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16
  },
  installedBox: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16
  },
  primaryInstallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 16
  },
  primaryInstallBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 15
  },
  iosInstructions: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16
  },
  iosTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 12
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1
  },
  stepNumText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  stepText: {
    fontSize: 12,
    lineHeight: 18,
    flex: 1
  },
  understoodBtn: {
    alignItems: 'center',
    paddingVertical: 10
  },
  understoodText: {
    fontSize: 13,
    fontWeight: '600'
  }
});
