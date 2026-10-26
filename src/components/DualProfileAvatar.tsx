import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { Camera, Sparkles, Maximize2, Trash2, X, ChevronLeft, ChevronRight, Upload, RefreshCw } from 'lucide-react-native';
import { UserScoutAvatar } from './UserScoutAvatar';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';
import { pickImageUniversal } from '../utils/filePicker';

interface Props {
  scoutAvatarUrl?: string | null;
  customAvatarUrl?: string | null;
  unit?: string;
  role?: string;
  size?: number;
  editable?: boolean;
  onPhotoChange?: (type: 'scout' | 'custom', newUrl: string) => Promise<void>;
  onDeletePhoto?: (type: 'scout' | 'custom') => Promise<void>;
  showTabs?: boolean;
}

export function DualProfileAvatar({
  scoutAvatarUrl,
  customAvatarUrl,
  unit = 'manada',
  role = 'scout',
  size = 110,
  editable = false,
  onPhotoChange,
  onDeletePhoto,
  showTabs,
}: Props) {
  const { isDarkMode, primaryColor } = useTheme();

  // Inicializar en la foto disponible (preferir la que esté cargada si la otra está vacía)
  const [activeTab, setActiveTab] = useState<'scout' | 'custom'>(() => {
    if (!scoutAvatarUrl && customAvatarUrl) return 'custom';
    return 'scout';
  });
  const [uploading, setUploading] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const touchStartX = useRef(0);

  // Sincronizar pestaña si los props llegan asíncronamente desde Supabase
  useEffect(() => {
    if (!scoutAvatarUrl && customAvatarUrl && activeTab === 'scout') {
      setActiveTab('custom');
    }
  }, [scoutAvatarUrl, customAvatarUrl]);

  // La foto activa SIEMPRE se corresponde directamente con activeTab
  const currentPhotoUrl = activeTab === 'scout' ? scoutAvatarUrl : customAvatarUrl;
  const hasBothPhotos = !!(scoutAvatarUrl && customAvatarUrl);

  // Mostrar pestañas en el perfil principal o cuando se solicite explícitamente (size >= 70)
  const shouldShowTabs = showTabs !== undefined ? showTabs : (size >= 70);

  const toggleTab = (e?: any) => {
    if (e && e.stopPropagation) {
      try { e.stopPropagation(); } catch {}
    }
    setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout');
  };

  const handlePickImage = (targetType: 'scout' | 'custom' = activeTab) => {
    if (!editable || !onPhotoChange) return;

    setUploading(true);
    pickImageUniversal(async (compressedDataUrl) => {
      try {
        await onPhotoChange(targetType, compressedDataUrl);
        showAlert(
          'Foto Actualizada',
          targetType === 'scout'
            ? 'Se ha guardado tu Foto Institucional Scout.'
            : 'Se ha guardado tu Foto Personal.'
        );
      } catch (err: any) {
        showAlert('Error', err?.message || 'No se pudo guardar la foto de perfil.');
      } finally {
        setUploading(false);
      }
    }, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.85
    });
  };

  const handleDeleteCurrentPhoto = async () => {
    if (!onDeletePhoto) return;
    setShowZoomModal(false);
    await onDeletePhoto(activeTab);
  };

  return (
    <View style={styles.wrapper}>
      {/* PESTAÑAS SELECTORAS EXPLÍCITAS (Visibles en perfiles para que cualquier usuario pueda alternar) */}
      {shouldShowTabs && (
        <View style={[styles.tabsRow, { backgroundColor: isDarkMode ? '#1e1e24' : '#e2e8f0' }]}>
          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'scout' && [styles.tabPillActive, { backgroundColor: primaryColor }]
            ]}
            onPress={() => setActiveTab('scout')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabPillText,
              { color: activeTab === 'scout' ? '#ffffff' : (isDarkMode ? '#a1a1aa' : '#64748b') },
              activeTab === 'scout' && styles.tabPillTextActive
            ]}>
              ⚜️ Foto Scout {scoutAvatarUrl ? '✓' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tabPill,
              activeTab === 'custom' && [styles.tabPillActive, { backgroundColor: '#10b981' }]
            ]}
            onPress={() => setActiveTab('custom')}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.tabPillText,
              { color: activeTab === 'custom' ? '#ffffff' : (isDarkMode ? '#a1a1aa' : '#64748b') },
              activeTab === 'custom' && styles.tabPillTextActive
            ]}>
              ✨ Foto Personal {customAvatarUrl ? '✓' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CONTENEDOR CIRCULAR DEL AVATAR */}
      <View style={{ position: 'relative' }}>
        <TouchableOpacity
          onPress={() => {
            // Siempre permitir abrir el visor lightbox a pantalla completa
            setShowZoomModal(true);
          }}
          activeOpacity={0.85}
          style={[
            styles.avatarContainer,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: activeTab === 'scout' ? primaryColor : '#10b981',
              backgroundColor: isDarkMode ? '#18181b' : '#f4f4f5',
            },
          ]}
        >
          {uploading ? (
            <ActivityIndicator size="small" color={primaryColor} />
          ) : currentPhotoUrl ? (
            <Image
              key={activeTab + (currentPhotoUrl || '')}
              source={{ uri: currentPhotoUrl }}
              style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }}
              resizeMode="cover"
            />
          ) : activeTab === 'scout' ? (
            <UserScoutAvatar unit={unit} role={role} size={size - 6} />
          ) : (
            <View style={[styles.customPlaceholder, { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 }]}>
              <Sparkles size={size * 0.35} color="#10b981" />
              <Text style={[styles.customPlaceholderText, { color: isDarkMode ? '#a1a1aa' : '#71717a' }]}>
                {size < 60 ? 'Personal' : 'Foto Personal'}
              </Text>
            </View>
          )}

          {/* Badge de cámara para edición directa */}
          {editable && (
            <TouchableOpacity
              style={[
                styles.cameraBadge,
                {
                  backgroundColor: activeTab === 'scout' ? primaryColor : '#10b981',
                  borderColor: isDarkMode ? '#18181b' : '#ffffff',
                },
              ]}
              onPress={() => handlePickImage(activeTab)}
              activeOpacity={0.85}
            >
              <Camera size={13} color="#ffffff" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* MINI BADGE DE ALTERNAR FOTO PARA TARJETAS COMPACTAS (Rovers, Miembros, Listados) */}
        {!shouldShowTabs && hasBothPhotos && (
          <TouchableOpacity
            style={[
              styles.miniSwitchBadge,
              {
                backgroundColor: activeTab === 'scout' ? '#10b981' : primaryColor,
                borderColor: isDarkMode ? '#18181b' : '#ffffff',
              }
            ]}
            onPress={toggleTab}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.miniSwitchBadgeText}>
              {activeTab === 'scout' ? '✨' : '⚜️'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* BOTONES DE ACCIÓN DIRECTOS Y ETIQUETA CLARA (Solo en modo editable por el usuario dueño) */}
      {editable && (
        <View style={styles.actionSection}>
          <Text style={[styles.activeHint, { color: isDarkMode ? '#a1a1aa' : '#64748b' }]}>
            {activeTab === 'scout'
              ? 'Retrato oficial para Carnet y Registros'
              : 'Foto o avatar libre para tu perfil'}
          </Text>

          <View style={styles.buttonsGroup}>
            <TouchableOpacity
              style={[
                styles.uploadBtn,
                { backgroundColor: activeTab === 'scout' ? primaryColor : '#10b981' }
              ]}
              onPress={() => handlePickImage(activeTab)}
              activeOpacity={0.8}
            >
              <Upload size={13} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.uploadBtnText}>
                {currentPhotoUrl
                  ? (activeTab === 'scout' ? 'Cambiar Foto Scout' : 'Cambiar Foto Personal')
                  : (activeTab === 'scout' ? 'Subir Foto Scout' : 'Subir Foto Personal')}
              </Text>
            </TouchableOpacity>

            {!!currentPhotoUrl && onDeletePhoto && (
              <TouchableOpacity
                style={[styles.deleteMiniBtn, { backgroundColor: isDarkMode ? '#27272a' : '#fee2e2' }]}
                onPress={handleDeleteCurrentPhoto}
                activeOpacity={0.8}
              >
                <Trash2 size={13} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* MODAL DE ZOOM / LIGHTBOX A PANTALLA COMPLETA */}
      <Modal
        visible={showZoomModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowZoomModal(false)}
      >
        <View style={styles.zoomOverlay}>
          {/* Cabecera del visor con selector interactivo de ambas fotos */}
          <View style={styles.zoomHeader}>
            <View style={styles.zoomTabsRow}>
              <TouchableOpacity
                style={[
                  styles.zoomTabPill,
                  activeTab === 'scout' && [styles.zoomTabPillActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setActiveTab('scout')}
                activeOpacity={0.8}
              >
                <Text style={[styles.zoomTabText, activeTab === 'scout' && styles.zoomTabTextActive]}>
                  ⚜️ Foto Scout {scoutAvatarUrl ? '●' : '(Vacía)'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.zoomTabPill,
                  activeTab === 'custom' && [styles.zoomTabPillActive, { backgroundColor: '#10b981' }]
                ]}
                onPress={() => setActiveTab('custom')}
                activeOpacity={0.8}
              >
                <Text style={[styles.zoomTabText, activeTab === 'custom' && styles.zoomTabTextActive]}>
                  ✨ Foto Personal {customAvatarUrl ? '●' : '(Vacía)'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.zoomCloseBtn}
              onPress={() => setShowZoomModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Subtítulo descriptivo */}
          <View style={{ alignItems: 'center', marginVertical: 6 }}>
            <Text style={styles.zoomSubtitle}>
              {activeTab === 'scout'
                ? '⚜️ Retrato Oficial con Uniforme Scout'
                : '✨ Fotografía Personal o Avatar Libre'}
            </Text>
          </View>

          {/* Imagen a gran resolución con flechas de alternar y gesto táctil para "mover" */}
          <View
            style={styles.zoomImageContainer}
            onTouchStart={(e) => {
              touchStartX.current = e?.nativeEvent?.pageX || e?.nativeEvent?.touches?.[0]?.pageX || 0;
            }}
            onTouchEnd={(e) => {
              const touchEndX = e?.nativeEvent?.pageX || e?.nativeEvent?.changedTouches?.[0]?.pageX || 0;
              const diff = touchEndX - touchStartX.current;
              if (Math.abs(diff) > 40) {
                setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout');
              }
            }}
          >
            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={() => setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout')}
              activeOpacity={0.7}
              accessibilityLabel="Ver foto anterior"
            >
              <ChevronLeft size={30} color="white" />
            </TouchableOpacity>

            {currentPhotoUrl ? (
              <Image
                key={activeTab + (currentPhotoUrl || '')}
                source={{ uri: currentPhotoUrl }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.zoomImage, styles.zoomPlaceholderContainer]}>
                {activeTab === 'scout' ? (
                  <>
                    <UserScoutAvatar unit={unit} role={role} size={140} />
                    <Text style={styles.zoomPlaceholderTitle}>Sin Foto Scout Oficial</Text>
                    <Text style={styles.zoomPlaceholderSub}>No se ha subido aún el retrato oficial con uniforme.</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={64} color="#10b981" />
                    <Text style={styles.zoomPlaceholderTitle}>Sin Foto Personal</Text>
                    <Text style={styles.zoomPlaceholderSub}>No se ha registrado una imagen o foto personalizada.</Text>
                  </>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={() => setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout')}
              activeOpacity={0.7}
              accessibilityLabel="Ver foto siguiente"
            >
              <ChevronRight size={30} color="white" />
            </TouchableOpacity>
          </View>

          {/* Indicador de posición (Puntos) */}
          <View style={styles.dotsRow}>
            <TouchableOpacity
              onPress={() => setActiveTab('scout')}
              style={[styles.dot, activeTab === 'scout' ? [styles.dotActive, { backgroundColor: primaryColor }] : styles.dotInactive]}
            />
            <TouchableOpacity
              onPress={() => setActiveTab('custom')}
              style={[styles.dot, activeTab === 'custom' ? [styles.dotActive, { backgroundColor: '#10b981' }] : styles.dotInactive]}
            />
          </View>

          {/* Barra de Acciones Inferior */}
          <View style={styles.zoomActions}>
            <TouchableOpacity
              style={[
                styles.zoomActionBtn,
                { backgroundColor: activeTab === 'scout' ? '#10b981' : primaryColor }
              ]}
              onPress={() => setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout')}
              activeOpacity={0.8}
            >
              <RefreshCw size={15} color="white" />
              <Text style={styles.zoomActionBtnText}>
                {activeTab === 'scout' ? 'Ver Foto Personal ✨' : 'Ver Foto Scout ⚜️'}
              </Text>
            </TouchableOpacity>

            {editable && onPhotoChange && (
              <TouchableOpacity
                style={[styles.zoomActionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => {
                  setShowZoomModal(false);
                  setTimeout(() => handlePickImage(activeTab), 300);
                }}
                activeOpacity={0.8}
              >
                <Camera size={15} color="white" />
                <Text style={styles.zoomActionBtnText}>Cambiar Foto</Text>
              </TouchableOpacity>
            )}

            {onDeletePhoto && !!currentPhotoUrl && (
              <TouchableOpacity
                style={[styles.zoomActionBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleDeleteCurrentPhoto}
                activeOpacity={0.8}
              >
                <Trash2 size={15} color="white" />
                <Text style={styles.zoomActionBtnText}>Eliminar Foto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.zoomActionBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
              onPress={() => setShowZoomModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.zoomActionBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 3,
    marginBottom: 12,
    alignSelf: 'center',
  },
  tabPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabPillActive: {
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabPillTextActive: {
    fontWeight: '700',
  },
  avatarContainer: {
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  miniSwitchBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 4,
    zIndex: 10,
  },
  miniSwitchBadgeText: {
    fontSize: 11,
    lineHeight: 13,
  },
  customPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  customPlaceholderText: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 2,
  },
  actionSection: {
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
  },
  activeHint: {
    fontSize: 11,
    marginBottom: 6,
    textAlign: 'center',
  },
  buttonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  uploadBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteMiniBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 50 : 25,
    paddingHorizontal: 16,
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    gap: 8,
  },
  zoomTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  zoomTabPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  zoomTabPillActive: {
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  zoomTabText: {
    color: '#e4e4e7',
    fontSize: 12,
    fontWeight: '600',
  },
  zoomTabTextActive: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  zoomSubtitle: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    textAlign: 'center',
  },
  zoomCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  zoomImageContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 14,
    gap: 8,
  },
  navArrowBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 10,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomImage: {
    flex: 1,
    maxWidth: 380,
    height: 380,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomPlaceholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
  },
  zoomPlaceholderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 14,
    textAlign: 'center',
  },
  zoomPlaceholderSub: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 20,
  },
  dotInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  zoomActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  zoomActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  zoomActionBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
