import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  Platform
} from 'react-native';
import { Camera, Image as ImageIcon, Clock, Plus, Trash2, Download, X, Share2, ShieldAlert, Sparkles, FolderPlus, Info, Eye, Lock, Globe } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { storageService } from '../lib/storageService';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { checkProfileCompletion } from '../utils/profileGuard';

interface DrivePhoto {
  id: string;
  url: string;
  type?: 'image' | 'video';
  fileName?: string;
  uploaderName: string;
  createdAt: string;
}

interface PhotoAlbum {
  id: string;
  title: string;
  unit: string;
  visibility: 'public' | 'private';
  expiresAt: number; // Timestamp en ms
  durationDays: number;
  photos: DrivePhoto[];
  createdBy: string;
}

export default function TemporalDriveScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isDarkMode, theme } = useTheme();

  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<PhotoAlbum | null>(null);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState<DrivePhoto | null>(null);
  const [showVisibilityInfo, setShowVisibilityInfo] = useState(false);

  // Formulario Crear Álbum
  const [newTitle, setNewTitle] = useState('');
  const [durationDays, setDurationDays] = useState<number>(3); // Defecto 3 días (Máx 7)
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMockAlbums();
  }, []);

  const loadMockAlbums = () => {
    setAlbums([]);
  };

  const getTimeRemaining = (expiresAt: number) => {
    const diff = expiresAt - Date.now();
    if (diff <= 0) return ' Caducado (Borrando...)';
    const hoursTotal = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hoursTotal / 24);
    const hours = hoursTotal % 24;
    if (days > 0) return `${days}d ${hours}h restantes`;
    return `${hours}h restantes`;
  };

  const handleOpenCreateModal = () => {
    if (!checkProfileCompletion(user, navigation)) return;
    setShowCreateModal(true);
  };

  const handleCreateAlbum = () => {
    if (!checkProfileCompletion(user, navigation)) return;

    if (!newTitle.trim()) {
      showAlert('Nombre requerido', 'Por favor ingresa un nombre para el álbum temporal.');
      return;
    }

    const maxDays = Math.min(Math.max(durationDays, 1), 7);
    const expiresAt = Date.now() + (maxDays * 24 * 60 * 60 * 1000);

    const newAlb: PhotoAlbum = {
      id: `alb_${Date.now()}`,
      title: newTitle.trim(),
      unit: user?.unit || 'clan',
      visibility: visibility,
      durationDays: maxDays,
      expiresAt: expiresAt,
      createdBy: user?.name || 'Scout',
      photos: []
    };

    setAlbums(prev => [newAlb, ...prev]);
    setNewTitle('');
    setVisibility('public');
    setShowCreateModal(false);
    showAlert(
      '¡Álbum Creado!',
      `El álbum "${newAlb.title}" (${visibility === 'public' ? 'Público' : 'Privado de ' + (user?.unit || 'Unidad')}) estará disponible a máxima calidad durante ${maxDays} días.`
    );
  };

  const handlePickMedia = async () => {
    if (!checkProfileCompletion(user, navigation)) return;
    if (!selectedAlbum) return;

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const rawFiles: File[] = Array.from(e.target.files || []);
        if (rawFiles.length === 0) return;

        setUploading(true);
        const newPhotos: DrivePhoto[] = [];

        for (const file of rawFiles) {
          const isVideo = file.type.startsWith('video');
          const dataUrl = await new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = (evt: any) => res(evt.target.result);
            r.readAsDataURL(file);
          });

          const publicUrl = await storageService.uploadImage(
            'scout-files',
            'drive_photos',
            file.name,
            dataUrl
          );

          newPhotos.push({
            id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            url: publicUrl || dataUrl,
            type: isVideo ? 'video' : 'image',
            fileName: file.name,
            uploaderName: user?.name || 'Scout',
            createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          });
        }

        setAlbums(prev => prev.map(alb => {
          if (alb.id === selectedAlbum.id) {
            const updated = { ...alb, photos: [...alb.photos, ...newPhotos] };
            setSelectedAlbum(updated);
            return updated;
          }
          return alb;
        }));

        setUploading(false);
        showAlert('¡Archivos Subidos!', `Se agregaron ${newPhotos.length} fotos/videos al álbum.`);
      };
      input.click();
    }
  };

  const handleDownloadPhoto = (url: string) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Foto_Scout_Orión84_${Date.now()}.jpg`;
      link.target = '_blank';
      link.click();
      showAlert('Descarga Iniciada', 'La fotografía se está descargando en máxima resolución original.');
    } else {
      showAlert('Guardar Fotografía', 'Mantén presionada la foto para guardarla en la galería de tu teléfono.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      
      {/* CABECERA DRIVE TEMPORAL */}
      <View style={[styles.header, { backgroundColor: isDarkMode ? '#121214' : 'white', borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.badgeBanner}>⚡ ALMACENAMIENTO A MÁXIMA CALIDAD ORIGINAL</Text>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Drive de Fotos</Text>
            <Text style={[styles.headerSub, { color: theme.subText }]}>
              Subida de recuerdos en alta resolución de actividades y campamentos.
            </Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreateModal(true)}>
            <FolderPlus size={16} color="white" style={{ marginRight: 6 }} />
            <Text style={styles.createBtnText}>Nuevo Álbum</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* VISTA PRINCIPAL: SI HAY ÁLBUM SELECCIONADO O LISTA DE ÁLBUMES */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {selectedAlbum ? (
          
          /* DETALLE DE UN ÁLBUM SELECCIONADO */
          <View>
            <TouchableOpacity style={styles.backLinkBtn} onPress={() => setSelectedAlbum(null)}>
              <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>← Volver a todos los álbumes</Text>
            </TouchableOpacity>

            <View style={[styles.albumHeaderCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[styles.albumHeaderTitle, { color: theme.text }]}>{selectedAlbum.title}</Text>
                <View style={styles.timerBadge}>
                  <Clock size={12} color="#d97706" style={{ marginRight: 4 }} />
                  <Text style={styles.timerBadgeText}>{getTimeRemaining(selectedAlbum.expiresAt)}</Text>
                </View>
              </View>

              <Text style={[styles.albumHeaderSub, { color: theme.subText }]}>
                Creado por: {selectedAlbum.createdBy} • Caducidad fijada a {selectedAlbum.durationDays} días
              </Text>

              <TouchableOpacity style={styles.uploadPhotosBtn} onPress={handlePickMedia} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Camera size={16} color="white" style={{ marginRight: 6 }} />
                    <Text style={styles.uploadPhotosBtnText}>Subir Fotos o Videos (Máx 50MB)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* GRILLA DE FOTOGRAFÍAS Y VIDEOS */}
            <Text style={[styles.sectionHeading, { color: theme.text }]}>
              Fotos y Videos ({selectedAlbum.photos.length})
            </Text>

            {selectedAlbum.photos.length === 0 ? (
              <View style={[styles.emptyPhotosCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <ImageIcon size={36} color={theme.subText} />
                <Text style={{ color: theme.subText, marginTop: 8 }}>Aún no hay contenido en este álbum.</Text>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: 'bold', marginTop: 4 }}>
                  Toca "+ Subir Fotos o Videos" para compartir recuerdos de la actividad.
                </Text>
              </View>
            ) : (
              <View style={styles.photoGrid}>
                {selectedAlbum.photos.map(photo => (
                  <TouchableOpacity
                    key={photo.id}
                    style={[styles.photoCard, { borderColor: theme.border }]}
                    onPress={() => setShowPhotoModal(photo)}
                  >
                    {photo.type === 'video' ? (
                      <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 24 }}>🎥</Text>
                        <Text style={{ fontSize: 10, color: 'white', fontWeight: 'bold', marginTop: 4 }}>VIDEO</Text>
                      </View>
                    ) : (
                      <Image source={{ uri: photo.url }} style={styles.photoThumb} />
                    )}
                    <View style={styles.photoInfoOverlay}>
                      <Text style={styles.photoUploader} numberOfLines={1}>
                        {photo.type === 'video' ? '🎥 ' : ''}{photo.uploaderName}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

        ) : (

          /* LISTA DE ÁLBUMES TEMPORALES ACTIVOS */
          <View>
            <Text style={[styles.sectionHeading, { color: theme.text }]}>Álbumes de Eventos Activos ({albums.length})</Text>

            {albums.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}>
                <Clock size={40} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No hay álbumes temporales creados</Text>
                <Text style={[styles.emptySub, { color: theme.subText }]}>
                  Crea un álbum para tu próximo campamento o actividad y comparte fotos en alta calidad.
                </Text>
              </View>
            ) : (
              albums.map(alb => (
                <TouchableOpacity
                  key={alb.id}
                  style={[styles.albumRowCard, { backgroundColor: theme.cardBg, borderColor: theme.border }]}
                  onPress={() => setSelectedAlbum(alb)}
                  activeOpacity={0.8}
                >
                  <View style={styles.albumCoverMini}>
                    {alb.photos.length > 0 ? (
                      <Image source={{ uri: alb.photos[0].url }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <ImageIcon size={24} color="white" />
                    )}
                  </View>

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.albumRowTitle, { color: theme.text }]}>{alb.title}</Text>
                    <Text style={[styles.albumRowSub, { color: theme.subText }]}>
                      {alb.photos.length} fotos • Creado por {alb.createdBy}
                    </Text>
                    <View style={styles.timerBadgeInline}>
                      <Clock size={11} color="#d97706" style={{ marginRight: 4 }} />
                      <Text style={styles.timerBadgeText}>{getTimeRemaining(alb.expiresAt)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>

        )}
      </ScrollView>

      {/* MODAL CREAR NUEVO ÁLBUM TEMPORAL */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white' }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <Text style={[modalStyles.title, { color: theme.text }]}>Nuevo Álbum Temporal de Fotos</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={24} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <Text style={[modalStyles.label, { color: theme.subText }]}>NOMBRE DE LA ACTIVIDAD O EVENTO *</Text>
              <TextInput
                style={[modalStyles.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
                placeholder="Ej: Aniversario Grupo Orión / Campamento Playa"
                placeholderTextColor={isDarkMode ? '#71717a' : '#a1a1aa'}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={[modalStyles.label, { color: theme.subText, marginTop: 14 }]}>
                DURACIÓN / TEMPORIZADOR DE BORRADO AUTOMÁTICO
              </Text>
              <Text style={{ fontSize: 12, color: theme.subText, marginBottom: 10 }}>
                Selecciona cuántos días estará disponible el álbum antes de ser borrado automáticamente (Máximo 7 días).
              </Text>

              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3, 5, 7].map(days => (
                  <TouchableOpacity
                    key={days}
                    style={[
                      modalStyles.daysChip,
                      { backgroundColor: theme.inputBg, borderColor: theme.border },
                      durationDays === days && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => setDurationDays(days)}
                  >
                    <Text style={{ fontSize: 13, fontWeight: 'bold', color: durationDays === days ? 'white' : theme.text }}>
                      {days} {days === 1 ? 'Día' : 'Días'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* SECCIÓN VISIBILIDAD DE ÁLBUM */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 6 }}>
                <Text style={[modalStyles.label, { color: theme.subText, marginBottom: 0 }]}>
                  VISIBILIDAD DEL ÁLBUM *
                </Text>
                <TouchableOpacity
                  style={{ marginLeft: 8, padding: 2 }}
                  onPress={() => setShowVisibilityInfo(true)}
                >
                  <Info size={18} color={colors.primary} />
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <TouchableOpacity
                  style={[
                    modalStyles.daysChip,
                    { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, paddingVertical: 10 },
                    visibility === 'public' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setVisibility('public')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Globe size={15} color={visibility === 'public' ? 'white' : theme.text} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: visibility === 'public' ? 'white' : theme.text }}>
                      Público (Grupo)
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    modalStyles.daysChip,
                    { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, paddingVertical: 10 },
                    visibility === 'private' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setVisibility('private')}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Lock size={15} color={visibility === 'private' ? 'white' : theme.text} style={{ marginRight: 6 }} />
                    <Text style={{ fontSize: 12, fontWeight: 'bold', color: visibility === 'private' ? 'white' : theme.text }}>
                      Privado (Unidad)
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={modalStyles.submitBtn} onPress={handleCreateAlbum}>
                <Text style={modalStyles.submitBtnText}>Crear Álbum Temporal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL INFORMACIÓN DE VISIBILIDAD (i) */}
      <Modal visible={showVisibilityInfo} transparent animationType="fade">
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.sheet, { backgroundColor: isDarkMode ? '#18181b' : 'white', maxWidth: 420 }]}>
            <View style={[modalStyles.header, { borderBottomColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Info size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={[modalStyles.title, { color: theme.text, fontSize: 16 }]}>Explicación de Visibilidad</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVisibilityInfo(false)}>
                <X color={isDarkMode ? '#a1a1aa' : '#64748b'} size={22} />
              </TouchableOpacity>
            </View>

            <View style={{ padding: 20 }}>
              <View style={{ marginBottom: 16, backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Globe size={18} color="#16a34a" style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: 'bold', fontSize: 14, color: theme.text }}>🌐 Álbum Público (Todo el Grupo)</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.subText, lineHeight: 18 }}>
                  Cualquier integrante de tu Grupo Scout (Manada, Tropa, Caminantes, Clan Rover y Scouters) podrá acceder a este álbum, ver las fotos y descargarlas en alta calidad.
                </Text>
              </View>

              <View style={{ backgroundColor: isDarkMode ? '#27272a' : '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Lock size={18} color="#d97706" style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: 'bold', fontSize: 14, color: theme.text }}>🔒 Álbum Privado (Solo tu Unidad)</Text>
                </View>
                <Text style={{ fontSize: 13, color: theme.subText, lineHeight: 18 }}>
                  Únicamente los miembros registrados en tu misma unidad (ej: <Text style={{ fontWeight: 'bold', color: colors.primary }}>{(user?.unit || 'tu unidad').toUpperCase()}</Text>) tendrán acceso a ver y subir contenido en este álbum.
                </Text>
              </View>

              <TouchableOpacity
                style={[modalStyles.submitBtn, { marginTop: 20 }]}
                onPress={() => setShowVisibilityInfo(false)}
              >
                <Text style={modalStyles.submitBtnText}>Entendido</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL VER FOTO A PANTALLA COMPLETA */}
      <Modal visible={showPhotoModal !== null} transparent animationType="fade">
        <View style={modalStyles.fullPhotoOverlay}>
          <TouchableOpacity style={modalStyles.closeFullPhotoBtn} onPress={() => setShowPhotoModal(null)}>
            <X size={28} color="white" />
          </TouchableOpacity>

          {showPhotoModal && (
            <View style={{ width: '100%', alignItems: 'center' }}>
              {showPhotoModal.type === 'video' ? (
                Platform.OS === 'web' && typeof document !== 'undefined' ? (
                  // @ts-ignore - HTML video tag en React Web
                  <video
                    src={showPhotoModal.url}
                    controls
                    autoPlay
                    style={{ width: '90%', maxHeight: 420, borderRadius: 14, backgroundColor: '#000' }}
                  />
                ) : (
                  <View style={{ width: '90%', height: 260, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', borderRadius: 14 }}>
                    <Text style={{ fontSize: 40 }}>🎥</Text>
                    <Text style={{ color: 'white', fontWeight: 'bold', marginTop: 10 }}>Vista previa de video en móvil</Text>
                  </View>
                )
              ) : (
                <Image source={{ uri: showPhotoModal.url }} style={modalStyles.fullPhotoImage} resizeMode="contain" />
              )}

              <View style={modalStyles.fullPhotoFooter}>
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>
                  {showPhotoModal.type === 'video' ? '🎥 Video' : '📷 Foto'} subido por {showPhotoModal.uploaderName}
                </Text>
                <Text style={{ color: '#a1a1aa', fontSize: 12 }}>{showPhotoModal.createdAt}</Text>
                <TouchableOpacity
                  style={modalStyles.downloadBtn}
                  onPress={() => handleDownloadPhoto(showPhotoModal.url)}
                >
                  <Download size={16} color="white" style={{ marginRight: 6 }} />
                  <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                    Descargar {showPhotoModal.type === 'video' ? 'Video' : 'Foto'} en Máxima Calidad
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 18, borderBottomWidth: 1 },
  badgeBanner: { fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 0.5, marginBottom: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSub: { fontSize: 12, marginTop: 2, maxWidth: 280 },
  createBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  createBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  backLinkBtn: { marginBottom: 14 },
  albumHeaderCard: { padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 16 },
  albumHeaderTitle: { fontSize: 16, fontWeight: 'bold' },
  albumHeaderSub: { fontSize: 12, marginTop: 4 },
  timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timerBadgeInline: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 4 },
  timerBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#d97706' },
  uploadPhotosBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, marginTop: 14 },
  uploadPhotosBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  sectionHeading: { fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  emptyCard: { padding: 30, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 10 },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  emptyPhotosCard: { padding: 30, borderRadius: 16, borderWidth: 1, alignItems: 'center' },

  albumRowCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  albumCoverMini: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  albumRowTitle: { fontSize: 14, fontWeight: 'bold' },
  albumRowSub: { fontSize: 12, marginTop: 2 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photoCard: { width: '48%', height: 140, borderRadius: 14, borderWidth: 1, overflow: 'hidden', backgroundColor: '#000' },
  photoThumb: { width: '100%', height: '100%' },
  photoInfoOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6 },
  photoUploader: { color: 'white', fontSize: 11, fontWeight: 'bold' }
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  title: { fontSize: 16, fontWeight: 'bold' },
  label: { fontSize: 11, fontWeight: '800', marginBottom: 4 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 13 },
  daysChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  submitBtn: { backgroundColor: colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center', marginTop: 20 },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 },

  fullPhotoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  closeFullPhotoBtn: { position: 'absolute', top: 40, right: 20, zIndex: 10 },
  fullPhotoImage: { width: '90%', height: '70%' },
  fullPhotoFooter: { alignItems: 'center', marginTop: 14 },
  downloadBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 12 }
});
