import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  useWindowDimensions
} from 'react-native';
import { Mail, Lock, Eye, EyeOff, Moon, Sun, KeyRound, CheckCircle2 } from 'lucide-react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const { isDarkMode, toggleDarkMode, theme } = useTheme();

  // Modal para restablecer contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const { width } = useWindowDimensions();
  const isWebLarge = width > 768;

  const handleLogin = async () => {
    if (!email || !password) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Por favor ingresa tu correo y contraseña.');
      } else {
        Alert.alert('Error', 'Por favor ingresa tu correo y contraseña.');
      }
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (error) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Error de Inicio de Sesión: ${error.message}`);
      } else {
        Alert.alert('Error de Inicio de Sesión', error.message);
      }
    }
  };

  const handleResetPassword = async () => {
    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert('Por favor ingresa tu correo electrónico.');
      } else {
        Alert.alert('Error', 'Por favor ingresa tu correo electrónico.');
      }
      return;
    }

    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail);
    setResetLoading(false);

    if (error) {
      if (typeof window !== 'undefined' && window.alert) {
        window.alert(`Error: ${error.message}`);
      } else {
        Alert.alert('Error', error.message);
      }
    } else {
      setResetSuccess(true);
    }
  };

  const dynamicStyles = {
    screenWrapper: {
      backgroundColor: isDarkMode ? '#09090b' : '#eaebed',
    },
    container: {
      backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
      borderColor: isDarkMode ? '#27272a' : '#e4e4e7',
    },
    title: {
      color: isDarkMode ? '#ffffff' : '#1e1b4b',
    },
    inputBg: {
      backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5',
      borderColor: isDarkMode ? '#3f3f46' : '#e4e4e7',
      color: isDarkMode ? '#ffffff' : '#09090b',
    },
    logoBg: {
      backgroundColor: isDarkMode ? '#000000' : theme.primary,
    }
  };

  return (
    <View style={[styles.screenWrapper, dynamicStyles.screenWrapper]}>
      {/* Selector de Modo Claro/Oscuro en la parte superior derecha */}
      <TouchableOpacity 
        style={[styles.themeToggle, { backgroundColor: isDarkMode ? '#27272a' : '#ffffff' }]} 
        onPress={toggleDarkMode}
      >
        {isDarkMode ? (
          <Sun size={20} color="#f59e0b" />
        ) : (
          <Moon size={20} color="#4b5563" />
        )}
      </TouchableOpacity>

      <View style={[styles.container, dynamicStyles.container, isWebLarge && styles.webCard]}>
        
        {/* LOGO VECTORIAL EXTRAÍDO DE TU IMAGEN */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, dynamicStyles.logoBg]}>
            <Image
              source={require('../../assets/scout_fleur_de_lis_clean.png')}
              style={styles.fleurImage}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.appTitle, dynamicStyles.title]}>PLAN PROGRESIVO</Text>
          <Text style={styles.appSubtitle}>Asociación de Scouts de Venezuela</Text>
        </View>

        {/* FORMULARIO */}
        <View style={styles.formContainer}>
          
          {/* Email Input */}
          <Text style={[styles.label, { color: isDarkMode ? '#e4e4e7' : '#4b5563' }]}>Correo Electrónico</Text>
          <View style={[styles.inputWrapper, dynamicStyles.inputBg]}>
            <Mail size={18} color={isDarkMode ? '#a1a1aa' : '#71717a'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: dynamicStyles.inputBg.color }]}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Password Input */}
          <Text style={[styles.label, { color: isDarkMode ? '#e4e4e7' : '#4b5563' }]}>Contraseña</Text>
          <View style={[styles.inputWrapper, dynamicStyles.inputBg]}>
            <Lock size={18} color={isDarkMode ? '#a1a1aa' : '#71717a'} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: dynamicStyles.inputBg.color }]}
              placeholder="••••••••••••"
              placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
              {showPassword ? (
                <EyeOff size={18} color={isDarkMode ? '#a1a1aa' : '#71717a'} />
              ) : (
                <Eye size={18} color={isDarkMode ? '#a1a1aa' : '#71717a'} />
              )}
            </TouchableOpacity>
          </View>

          {/* Enlace ¿Olvidaste tu contraseña? */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => {
              setResetEmail(email);
              setResetSuccess(false);
              setShowForgotModal(true);
            }}
          >
            <Text style={[styles.forgotText, { color: theme.primary }]}>¿Olvidaste tu contraseña?</Text>
          </TouchableOpacity>

          {/* Botón de Ingreso */}
          <TouchableOpacity style={[styles.loginButton, { backgroundColor: theme.primary }]} onPress={handleLogin} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footerContainer}>
          <Text style={{ color: isDarkMode ? '#a1a1aa' : '#71717a', fontSize: 14 }}>¿No tienes cuenta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={[styles.registerText, { color: theme.primary }]}>Regístrate aquí</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* MODAL PARA RESTABLECER CONTRASEÑA */}
      <Modal visible={showForgotModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
            
            {resetSuccess ? (
              <View style={{ alignItems: 'center' }}>
                <CheckCircle2 size={52} color="#10b981" />
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFF' : '#1E293B' }]}>¡Correo Enviado!</Text>
                <Text style={[styles.modalSub, { color: isDarkMode ? '#A1A1AA' : '#64748B' }]}>
                  Revisa tu bandeja de entrada o spam. Te enviamos las instrucciones para crear tu nueva clave.
                </Text>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={() => setShowForgotModal(false)}
                >
                  <Text style={styles.modalConfirmText}>Entendido</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'center' }}>
                <KeyRound size={44} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#FFF' : '#1E293B' }]}>Restablecer Contraseña</Text>
                <Text style={[styles.modalSub, { color: isDarkMode ? '#A1A1AA' : '#64748B' }]}>
                  Ingresa tu correo electrónico asociado a tu cuenta para enviarte un enlace de recuperación.
                </Text>

                <TextInput
                  style={[styles.modalInput, dynamicStyles.inputBg]}
                  placeholder="correo@ejemplo.com"
                  placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity
                    style={styles.modalCancelBtn}
                    onPress={() => setShowForgotModal(false)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSendBtn}
                    onPress={handleResetPassword}
                    disabled={resetLoading}
                  >
                    {resetLoading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.modalSendText}>Enviar Enlace</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  themeToggle: {
    position: 'absolute',
    top: 45,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3
  },
  container: {
    width: '100%',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
  },
  webCard: {
    maxWidth: 420
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    marginBottom: 16
  },
  fleurImage: {
    width: 90,
    height: 90
  },
  appTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    letterSpacing: 1
  },
  appSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600'
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16
  },
  inputIcon: {
    marginRight: 10
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%'
  },
  eyeBtn: {
    padding: 6
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: 16,
    marginTop: -4
  },
  forgotText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600'
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  loginButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5
  },
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Modal Restablecer
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center'
  },
  modalSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20
  },
  modalInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 20
  },
  modalBtnRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between'
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    marginRight: 8
  },
  modalCancelText: {
    color: '#475569',
    fontWeight: 'bold',
    fontSize: 14
  },
  modalSendBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center'
  },
  modalSendText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  modalConfirmBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    marginTop: 16
  },
  modalConfirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14
  },
  installPwaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    width: '100%'
  },
  installPwaBtnText: {
    fontSize: 13,
    fontWeight: '700'
  }
});
