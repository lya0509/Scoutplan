import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
  Platform
} from 'react-native';
import {
  Bell,
  X,
  CheckCheck,
  Award,
  ShieldCheck,
  Calendar,
  FileText,
  Sparkles,
  AlertTriangle,
  Play,
  CheckCircle2,
  Radio
} from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { notificationService, AppNotification } from '../services/notificationService';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { colors } from '../theme/colors';

interface NotificationCenterModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationCenterModal({ visible, onClose }: NotificationCenterModalProps) {
  const {
    notifications,
    unreadCount,
    pushStatus,
    requestPushPermission,
    markAsRead,
    markAllAsRead,
    refreshNotifications
  } = useNotifications();
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(visible, onClose);

  React.useEffect(() => {
    if (visible) {
      refreshNotifications();
    }
  }, [visible, refreshNotifications]);

  const [activeTab, setActiveTab] = useState<'inbox' | 'test'>('inbox');
  const [testingType, setTestingType] = useState<string | null>(null);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'badge':
        return <Award size={18} color="#f59e0b" />;
      case 'membership':
        return <ShieldCheck size={18} color="#10b981" />;
      case 'calendar':
        return <Calendar size={18} color="#6366f1" />;
      case 'program':
        return <FileText size={18} color="#9333ea" />;
      case 'plan':
        return <Sparkles size={18} color="#3b82f6" />;
      case 'alert':
        return <AlertTriangle size={18} color="#ef4444" />;
      default:
        return <Bell size={18} color="#6366f1" />;
    }
  };

  const getTagColor = (type: AppNotification['type']) => {
    switch (type) {
      case 'badge': return '#f59e0b';
      case 'membership': return '#10b981';
      case 'calendar': return '#6366f1';
      case 'program': return '#9333ea';
      case 'plan': return '#3b82f6';
      case 'alert': return '#ef4444';
      default: return '#6366f1';
    }
  };

  const formatNotificationTime = (isoString?: string) => {
    if (!isoString) return 'Reciente';
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);

      if (diffMins < 1) return 'Hace un momento';
      if (diffMins < 60) return `Hace ${diffMins} min`;
      if (diffHours < 24) return `Hace ${diffHours} h`;
      return `${date.getDate()}/${date.getMonth() + 1} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch {
      return 'Reciente';
    }
  };

  const runLiveTest = async (
    type: AppNotification['type'],
    title: string,
    message: string
  ) => {
    if (!user) return;
    setTestingType(type);
    setTestSuccessMessage(null);

    try {
      // Disparar push y sonido localmente
      notificationService.triggerSystemPushNotification(title, message);

      await notificationService.sendNotification({
        senderId: user.id,
        receiverId: user.id, // Directo para prueba instantánea
        groupName: user.group_name || undefined,
        unit: user.unit || undefined,
        title,
        message,
        type
      });

      setTestSuccessMessage(`¡Notificación y Push enviados con éxito! Sonido reproducido y banner activo.`);
      refreshNotifications();
    } catch (e: any) {
      setTestSuccessMessage(`Error en prueba: ${e?.message || 'Fallo de conexión'}`);
    } finally {
      setTestingType(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
          
          {/* CABECERA */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.bellIconBox}>
                <Bell size={20} color={colors.primary} />
                {unreadCount > 0 && (
                  <View style={styles.unreadBadgeMini}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Notificaciones Scout</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <Radio size={12} color="#10b981" />
                  <Text style={{ fontSize: 10, color: '#10b981', fontWeight: 'bold' }}>
                    WebSockets + Smart Polling Activo
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          {/* PESTAÑAS DE NAVEGACIÓN */}
          <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'inbox' && styles.tabBtnActive]}
              onPress={() => setActiveTab('inbox')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'inbox' ? colors.primary : theme.subText }]}>
                📥 Bandeja ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === 'test' && styles.tabBtnActive]}
              onPress={() => setActiveTab('test')}
            >
              <Text style={[styles.tabBtnText, { color: activeTab === 'test' ? colors.primary : theme.subText }]}>
                🧪 Probar en Vivo (Push y Sonido)
              </Text>
            </TouchableOpacity>
          </View>

          {/* CONTENIDO */}
          <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 24 }}>
            {/* TARJETA DE ESTADO DE PERMISOS PUSH DEL SISTEMA */}
            {pushStatus !== 'granted' ? (
              <View style={{
                backgroundColor: isDarkMode ? '#27272a' : '#fef3c7',
                borderColor: '#f59e0b',
                borderWidth: 1,
                padding: 12,
                borderRadius: 12,
                marginBottom: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10
              }}>
                <Bell size={22} color="#f59e0b" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: isDarkMode ? '#fbbf24' : '#92400e' }}>
                    Activar Push del Sistema
                  </Text>
                  <Text style={{ fontSize: 10, color: isDarkMode ? '#d4d4d8' : '#78350f', marginTop: 2 }}>
                    Para recibir avisos en la barra de tu teléfono o PC cuando la app esté minimizada.
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#f59e0b',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8
                  }}
                  onPress={requestPushPermission}
                >
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 11 }}>
                    Activar
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{
                backgroundColor: isDarkMode ? '#14532d' : '#dcfce7',
                borderColor: '#22c55e',
                borderWidth: 1,
                padding: 10,
                borderRadius: 12,
                marginBottom: 14,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8
              }}>
                <CheckCircle2 size={16} color="#16a34a" />
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: isDarkMode ? '#86efac' : '#15803d', flex: 1 }}>
                  Push del Sistema y Sonido Activados ✅
                </Text>
              </View>
            )}
            {activeTab === 'inbox' ? (
              <View>
                {/* BARRA DE ACCIONES RÁPIDAS */}
                {notifications.length > 0 && (
                  <View style={styles.inboxActions}>
                    <Text style={{ fontSize: 11, color: theme.subText }}>
                      {unreadCount} sin leer de {notifications.length} total
                    </Text>
                    <TouchableOpacity
                      style={styles.markAllBtn}
                      onPress={markAllAsRead}
                    >
                      <CheckCheck size={14} color={colors.primary} style={{ marginRight: 4 }} />
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: 'bold' }}>
                        Marcar todo leído
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {notifications.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Bell size={44} color={theme.subText} style={{ opacity: 0.4, marginBottom: 12 }} />
                    <Text style={[styles.emptyTitle, { color: theme.text }]}>No tienes notificaciones pendientes</Text>
                    <Text style={[styles.emptySub, { color: theme.subText }]}>
                      Cuando un dirigente apruebe tus insignias, se programe una actividad o se actualice tu unidad, recibirás un aviso instantáneo aquí.
                    </Text>
                    <TouchableOpacity
                      style={[styles.testPromptBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}
                      onPress={() => setActiveTab('test')}
                    >
                      <Play size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={{ fontSize: 12, color: colors.primary, fontWeight: 'bold' }}>
                        Ir al Banco de Pruebas para enviar una notificación
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  notifications.map((notif) => (
                    <TouchableOpacity
                      key={notif.id}
                      style={[
                        styles.notifItem,
                        {
                          backgroundColor: notif.read
                            ? (isDarkMode ? '#18181b' : '#f9fafb')
                            : (isDarkMode ? '#27272a' : '#ffffff'),
                          borderColor: notif.read ? theme.border : getTagColor(notif.type),
                          borderLeftWidth: notif.read ? 1 : 4,
                        }
                      ]}
                      onPress={() => markAsRead(notif.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.notifIconWrap, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
                        {getIconForType(notif.type)}
                      </View>

                      <View style={{ flex: 1, marginLeft: 10, marginRight: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text
                            style={[
                              styles.notifItemTitle,
                              { color: theme.text, fontWeight: notif.read ? '600' : 'bold' }
                            ]}
                            numberOfLines={1}
                          >
                            {notif.title}
                          </Text>
                          <Text style={{ fontSize: 10, color: theme.subText }}>
                            {formatNotificationTime(notif.created_at)}
                          </Text>
                        </View>

                        <Text style={[styles.notifItemMsg, { color: theme.subText }]} numberOfLines={3}>
                          {notif.message}
                        </Text>

                        {notif.unit && (
                          <View style={{ flexDirection: 'row', marginTop: 4 }}>
                            <View style={[styles.unitTag, { backgroundColor: isDarkMode ? '#3f3f46' : '#e4e4e7' }]}>
                              <Text style={{ fontSize: 9, fontWeight: 'bold', color: theme.text }}>
                                ⚜️ {notif.unit.toUpperCase()}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>

                      {!notif.read && (
                        <View style={styles.unreadDot} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : (
              /* BANCO DE PRUEBAS EN VIVO */
              <View style={styles.testSuite}>
                <View style={[styles.testIntroCard, { backgroundColor: isDarkMode ? '#1e1b4b' : 'rgba(99, 102, 241, 0.12)' }]}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: colors.primary }}>
                    🧪 Simulador de Notificaciones en Tiempo Real
                  </Text>
                  <Text style={{ fontSize: 11, color: isDarkMode ? '#e4e4e7' : '#4b5563', marginTop: 4, lineHeight: 16 }}>
                    Haz clic en cualquiera de los siguientes botones para emitir una notificación real por WebSockets. Podrás ver el banner flotante superior aparecer al instante en tu pantalla y en cualquier dispositivo conectado.
                  </Text>
                </View>

                {testSuccessMessage && (
                  <View style={styles.successBox}>
                    <CheckCircle2 size={16} color="#10b981" style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, color: '#10b981', fontWeight: 'bold', flex: 1 }}>
                      {testSuccessMessage}
                    </Text>
                  </View>
                )}

                {/* BOTÓN 1: ALERTA GENERAL */}
                <TouchableOpacity
                  style={[styles.testCardBtn, { borderColor: '#6366f1' }]}
                  onPress={() => runLiveTest(
                    'info',
                    '🔔 Notificación de Prueba del Sistema',
                    '¡El sistema de WebSockets está funcionando al 100% en tiempo real!'
                  )}
                  disabled={testingType !== null}
                >
                  <View style={[styles.testBtnIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Bell size={20} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.testBtnTitle, { color: theme.text }]}>1. Alerta Instantánea del Sistema</Text>
                    <Text style={[styles.testBtnDesc, { color: theme.subText }]}>Prueba básica de entrega WebSocket</Text>
                  </View>
                  {testingType === 'info' ? <ActivityIndicator color="#6366f1" /> : <Play size={16} color="#6366f1" />}
                </TouchableOpacity>

                {/* BOTÓN 2: APROBACIÓN DE INSIGNIA / ADELANTO */}
                <TouchableOpacity
                  style={[styles.testCardBtn, { borderColor: '#f59e0b' }]}
                  onPress={() => runLiveTest(
                    'badge',
                    '🎖️ ¡Felicidades! Insignia Aprobada',
                    `Tu Scouter ha aprobado tu etapa de adelanto scout en la unidad ${(user?.unit || 'Clan').toUpperCase()}.`
                  )}
                  disabled={testingType !== null}
                >
                  <View style={[styles.testBtnIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                    <Award size={20} color="#f59e0b" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.testBtnTitle, { color: theme.text }]}>2. Aprobación de Insignia / Adelanto</Text>
                    <Text style={[styles.testBtnDesc, { color: theme.subText }]}>Simula aprobación de ficha por parte de Scouter</Text>
                  </View>
                  {testingType === 'badge' ? <ActivityIndicator color="#f59e0b" /> : <Play size={16} color="#f59e0b" />}
                </TouchableOpacity>

                {/* BOTÓN 3: ACTIVIDAD DE CALENDARIO */}
                <TouchableOpacity
                  style={[styles.testCardBtn, { borderColor: '#6366f1' }]}
                  onPress={() => runLiveTest(
                    'calendar',
                    '📅 Nueva Actividad de Grupo Programada',
                    'Asamblea de Grupo y Gran Fogata Scout este sábado a las 3:00 PM en la Sede.'
                  )}
                  disabled={testingType !== null}
                >
                  <View style={[styles.testBtnIconBox, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
                    <Calendar size={20} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.testBtnTitle, { color: theme.text }]}>3. Nueva Actividad en Calendario</Text>
                    <Text style={[styles.testBtnDesc, { color: theme.subText }]}>Simula evento publicado por Jefatura</Text>
                  </View>
                  {testingType === 'calendar' ? <ActivityIndicator color="#6366f1" /> : <Play size={16} color="#6366f1" />}
                </TouchableOpacity>

                {/* BOTÓN 4: PLAN TRIMESTRAL */}
                <TouchableOpacity
                  style={[styles.testCardBtn, { borderColor: '#3b82f6' }]}
                  onPress={() => runLiveTest(
                    'plan',
                    '📑 Plan Trimestral Actualizado',
                    `Se han actualizado las metas y el cronograma del Plan Trimestral de ${(user?.unit || 'Clan').toUpperCase()}.`
                  )}
                  disabled={testingType !== null}
                >
                  <View style={[styles.testBtnIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Sparkles size={20} color="#3b82f6" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.testBtnTitle, { color: theme.text }]}>4. Plan Trimestral de Unidad</Text>
                    <Text style={[styles.testBtnDesc, { color: theme.subText }]}>Simula edición colaborativa de metas de trimestre</Text>
                  </View>
                  {testingType === 'plan' ? <ActivityIndicator color="#3b82f6" /> : <Play size={16} color="#3b82f6" />}
                </TouchableOpacity>

                {/* BOTÓN 5: MEMBRESÍA Y CARNET */}
                <TouchableOpacity
                  style={[styles.testCardBtn, { borderColor: '#10b981' }]}
                  onPress={() => runLiveTest(
                    'membership',
                    '🛡️ Membresía y Carnet Oficial Aprobados',
                    'Tu registro institucional anual 2026 ha sido validado con éxito por Jefatura de Grupo.'
                  )}
                  disabled={testingType !== null}
                >
                  <View style={[styles.testBtnIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                    <ShieldCheck size={20} color="#10b981" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.testBtnTitle, { color: theme.text }]}>5. Aprobación de Membresía y Carnet</Text>
                    <Text style={[styles.testBtnDesc, { color: theme.subText }]}>Simula validación de censo institucional</Text>
                  </View>
                  {testingType === 'membership' ? <ActivityIndicator color="#10b981" /> : <Play size={16} color="#10b981" />}
                </TouchableOpacity>

                {/* BOTÓN 6: ALERTA MÉDICA */}
                <TouchableOpacity
                  style={[styles.testCardBtn, { borderColor: '#ef4444' }]}
                  onPress={() => runLiveTest(
                    'alert',
                    '🩺 Ficha Médica de Emergencia Actualizada',
                    'Se han registrado nuevas indicaciones de alergias y contactos de emergencia.'
                  )}
                  disabled={testingType !== null}
                >
                  <View style={[styles.testBtnIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                    <AlertTriangle size={20} color="#ef4444" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.testBtnTitle, { color: theme.text }]}>6. Alerta Médica de Emergencia</Text>
                    <Text style={[styles.testBtnDesc, { color: theme.subText }]}>Simula actualización de padrón médico</Text>
                  </View>
                  {testingType === 'alert' ? <ActivityIndicator color="#ef4444" /> : <Play size={16} color="#ef4444" />}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 540,
    maxHeight: '85%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  bellIconBox: {
    position: 'relative',
    padding: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  unreadBadgeMini: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  body: {
    padding: 16,
  },
  inboxActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  testPromptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  notifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemTitle: {
    fontSize: 13,
  },
  notifItemMsg: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  unitTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  testSuite: {
    gap: 10,
  },
  testIntroCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 10,
    borderRadius: 10,
  },
  testCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  testBtnIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testBtnTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  testBtnDesc: {
    fontSize: 10,
    marginTop: 2,
  }
});
