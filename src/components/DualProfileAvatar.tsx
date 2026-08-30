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
import { Camera, RefreshCw, User, Sparkles, Shield, Maximize2, Trash2, X, Download } from 'lucide-react-native';
import { UserScoutAvatar } from './UserScoutAvatar';
import { useTheme } from '../context/ThemeContext';
import { showAlert } from '../utils/alert';

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

  // Gesto PanResponder para detectar arrastre / swipe horizontal fluido
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 12;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -25) {
          // Deslizar hacia la izquierda -> Foto Personal
          setActiveTab('custom');
        } else if (gestureState.dx > 25) {
          // Deslizar hacia la derecha -> Foto Scout Institucional
          setActiveTab('scout');
        }
      },
    })
  ).current;

  const handlePickImage = () => {
    if (!editable || !onPhotoChange) return;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
          const reader = new FileReader();
          reader.onload = async (event) => {
            const dataUrl = event.target?.result as string;
            if (dataUrl) {
              // Redimensionar imagen a máx 800px para que cargue ultra rápido
              const img = new (window as any).Image();
              img.onload = async () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const maxDim = 800;

                if (width > maxDim || height > maxDim) {
                  if (width > height) {
                    height = Math.round((height * maxDim) / width);
                    width = maxDim;
                  } else {
                    width = Math.round((width * maxDim) / height);
                    height = maxDim;
                  }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

                await onPhotoChange(activeTab, compressedDataUrl);
                setUploading(false);
                showAlert(
                  'Foto Actualizada',
                  activeTab === 'scout'
                    ? 'Se ha guardado tu Foto Institucional Scout.'
                    : 'Se ha guardado tu Foto Personal.'
                );
              };
              img.src = dataUrl;
            }
          };
          reader.readAsDataURL(file);
        } catch (err: any) {
          setUploading(false);
          showAlert('Error', err?.message || 'No se pudo procesar la imagen.');
        }
      };
      input.click();
    } else {
      showAlert('Cambiar Foto', 'Selecciona una imagen desde la galería de tu dispositivo.');
    }
  };

  const currentPhotoUrl = activeTab === 'scout' ? scoutAvatarUrl : customAvatarUrl;

  const handleDeleteCurrentPhoto = async () => {
    if (!onDeletePhoto) return;
    setShowZoomModal(false);
    await onDeletePhoto(activeTab);
  };

  return (
    <View style={styles.wrapper}>
      {/* Contenedor circular con PanResponder para gestos */}
      <TouchableOpacity
        {...panResponder.panHandlers}
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
        onPress={() => {
          if (currentPhotoUrl) {
            setShowZoomModal(true);
          } else if (editable) {
            handlePickImage();
          }
        }}
        activeOpacity={0.85}
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

        {/* Botón flotante para cambiar foto si es editable */}
        {editable && (
          <TouchableOpacity
            style={[
              styles.cameraBadge,
              {
                backgroundColor: activeTab === 'scout' ? primaryColor : '#10b981',
                borderColor: isDarkMode ? '#18181b' : '#ffffff',
              },
            ]}
            onPress={handlePickImage}
            activeOpacity={0.85}
          >
            <Camera size={14} color="#ffffff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>

      {/* Indicador de Tipo de Foto y Deslizador (Swipe Dots) */}
      <View style={styles.indicatorRow}>
        <TouchableOpacity
          style={[
            styles.modePill,
            {
              backgroundColor:
                activeTab === 'scout'
                  ? primaryColor + '20'
                  : isDarkMode
                  ? '#27272a'
                  : '#f1f5f9',
              borderColor: activeTab === 'scout' ? primaryColor : 'transparent',
            },
          ]}
          onPress={() => setActiveTab('scout')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modePillText,
              {
                color: activeTab === 'scout' ? primaryColor : isDarkMode ? '#a1a1aa' : '#64748b',
                fontWeight: activeTab === 'scout' ? 'bold' : 'normal',
              },
            ]}
          >
            ⚜️ Foto Scout
          </Text>
        </TouchableOpacity>

        {/* Indicador de Puntos (Dots) */}
        <View style={styles.dotsContainer}>
          <View
            style={[
              styles.dot,
              { backgroundColor: activeTab === 'scout' ? primaryColor : isDarkMode ? '#52525b' : '#cbd5e1' },
            ]}
          />
          <View
            style={[
              styles.dot,
              { backgroundColor: activeTab === 'custom' ? '#10b981' : isDarkMode ? '#52525b' : '#cbd5e1' },
            ]}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.modePill,
            {
              backgroundColor:
                activeTab === 'custom'
                  ? '#10b98120'
                  : isDarkMode
                  ? '#27272a'
                  : '#f1f5f9',
              borderColor: activeTab === 'custom' ? '#10b981' : 'transparent',
            },
          ]}
          onPress={() => setActiveTab('custom')}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.modePillText,
              {
                color: activeTab === 'custom' ? '#10b981' : isDarkMode ? '#a1a1aa' : '#64748b',
                fontWeight: activeTab === 'custom' ? 'bold' : 'normal',
              },
            ]}
          >
            ✨ Foto Personal
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.gestureTip, { color: isDarkMode ? '#71717a' : '#94a3b8' }]}>
        ↔️ Desliza hacia los lados para alternar | Toca la foto para ampliar
      </Text>

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

          {/* Imagen a gran resolución */}
          <View style={styles.zoomImageContainer}>
            {currentPhotoUrl ? (
              <Image
                source={{ uri: currentPhotoUrl }}
                style={styles.zoomImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {/* Barra de Acciones Inferior */}
          <View style={styles.zoomActions}>
            {editable && onPhotoChange && (
              <TouchableOpacity
                style={[styles.zoomActionBtn, { backgroundColor: primaryColor }]}
                onPress={() => {
                  setShowZoomModal(false);
                  setTimeout(() => handlePickImage(), 300);
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
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  modePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  modePillText: {
    fontSize: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  gestureTip: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  zoomImage: {
    width: '100%',
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
