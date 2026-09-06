import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  PanResponder,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import { Camera, Sparkles, Maximize2, Trash2, X, ChevronLeft, ChevronRight, Upload } from 'lucide-react-native';
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
}: Props) {
  const { isDarkMode, primaryColor } = useTheme();
  const [activeTab, setActiveTab] = useState<'scout' | 'custom'>('scout');
  const [uploading, setUploading] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);

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

  const currentPhotoUrl = editable
    ? (activeTab === 'scout' ? scoutAvatarUrl : customAvatarUrl)
    : (customAvatarUrl || scoutAvatarUrl);

  const handleDeleteCurrentPhoto = async () => {
    if (!onDeletePhoto) return;
    setShowZoomModal(false);
    await onDeletePhoto(activeTab);
  };

  return (
    <View style={styles.wrapper}>
      {/* PESTAÑAS SELECTORAS EXPLÍCITAS (Solo cuando es editable en Mi Perfil) */}
      {editable && (
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
            ⚜️ Foto Scout
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
            ✨ Foto Personal
          </Text>
        </TouchableOpacity>
      </View>
      )}

      {/* CONTENEDOR CIRCULAR DEL AVATAR */}
      <TouchableOpacity
        onPress={() => {
          if (currentPhotoUrl) {
            setShowZoomModal(true);
          } else if (editable) {
            handlePickImage(activeTab);
          }
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
              Foto Personal
            </Text>
          </View>
        )}

        {/* Badge de cámara */}
        {editable && (
          <View
            style={[
              styles.cameraBadge,
              {
                backgroundColor: activeTab === 'scout' ? primaryColor : '#10b981',
                borderColor: isDarkMode ? '#18181b' : '#ffffff',
              },
            ]}
          >
            <Camera size={14} color="#ffffff" />
          </View>
        )}
      </TouchableOpacity>

      {/* BOTONES DE ACCIÓN DIRECTOS Y ETIQUETA CLARA */}
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

            {currentPhotoUrl && onDeletePhoto && (
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
          {/* Cabecera del visor */}
          <View style={styles.zoomHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Maximize2 size={18} color="white" />
              <Text style={styles.zoomTitle}>
                {activeTab === 'scout' ? '⚜️ Foto Institucional Scout' : '✨ Foto de Perfil Personal'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.zoomCloseBtn}
              onPress={() => setShowZoomModal(false)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <X size={22} color="white" />
            </TouchableOpacity>
          </View>

          {/* Imagen a gran resolución con flechas de alternar foto */}
          <View style={styles.zoomImageContainer}>
            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={() => setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout')}
            >
              <ChevronLeft size={28} color="white" />
            </TouchableOpacity>

            {currentPhotoUrl ? (
              <Image
                source={{ uri: currentPhotoUrl }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.zoomImage, { justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={{ color: '#ffffff', opacity: 0.7 }}>Sin foto cargada</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.navArrowBtn}
              onPress={() => setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout')}
            >
              <ChevronRight size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Barra de Acciones Inferior */}
          <View style={styles.zoomActions}>
            <TouchableOpacity
              style={[styles.zoomActionBtn, { backgroundColor: activeTab === 'scout' ? primaryColor : '#10b981' }]}
              onPress={() => setActiveTab(prev => prev === 'scout' ? 'custom' : 'scout')}
            >
              <Text style={styles.zoomActionBtnText}>
                {activeTab === 'scout' ? 'Ver Foto Personal ➡️' : '⬅️ Ver Foto Scout'}
              </Text>
            </TouchableOpacity>

            {editable && onPhotoChange && (
              <TouchableOpacity
                style={[styles.zoomActionBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={() => {
                  setShowZoomModal(false);
                  setTimeout(() => handlePickImage(activeTab), 300);
                }}
              >
                <Camera size={16} color="white" />
                <Text style={styles.zoomActionBtnText}>Cambiar Foto</Text>
              </TouchableOpacity>
            )}

            {onDeletePhoto && currentPhotoUrl && (
              <TouchableOpacity
                style={[styles.zoomActionBtn, { backgroundColor: '#ef4444' }]}
                onPress={handleDeleteCurrentPhoto}
              >
                <Trash2 size={16} color="white" />
                <Text style={styles.zoomActionBtnText}>Eliminar Foto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.zoomActionBtn, { backgroundColor: 'rgba(255,255,255,0.18)' }]}
              onPress={() => setShowZoomModal(false)}
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
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  customPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  customPlaceholderText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
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
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'space-between',
    paddingVertical: Platform.OS === 'ios' ? 50 : 25,
    paddingHorizontal: 16,
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  zoomTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
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
    marginVertical: 20,
    gap: 8,
  },
  navArrowBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: 8,
    borderRadius: 24,
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
    borderRadius: 12,
  },
  zoomActionBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
});
