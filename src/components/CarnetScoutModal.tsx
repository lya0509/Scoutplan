import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform
} from 'react-native';
import { X, Download, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { Profile } from '../types/progression';
import { useTheme } from '../context/ThemeContext';
import { useModalBackHandler } from '../hooks/useBackHandler';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';
import { ScoutQRCode } from './ScoutQRCode';
import { SecureImage } from './SecureImage';
import { daysUntil, formatDateEs } from '../utils/dateLocal';

interface CarnetScoutModalProps {
  visible: boolean;
  user: Profile | null;
  onClose: () => void;
}

export const CarnetScoutModal: React.FC<CarnetScoutModalProps> = ({
  visible,
  user,
  onClose
}) => {
  const { isDarkMode, theme } = useTheme();

  // Soporte universal para gestos de retroceso en Android, iOS y PWA
  useModalBackHandler(visible, onClose);
  const [photoFailed, setPhotoFailed] = useState(false);

  if (!user) return null;

  // Foto del carnet: la scout con uniforme; si no hay (o no carga), la personal
  const carnetPhoto = (!photoFailed && user.avatar_url) || user.custom_avatar_url || null;

  const isMembershipApproved = user.membership_status === 'approved' && !!user.membership_expires_at;
  // La anualidad la cobra la ASV; aquí solo se muestra si la fecha registrada ya pasó.
  const daysLeft = isMembershipApproved ? daysUntil(user.membership_expires_at) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isActive = isMembershipApproved && !isExpired;
  const expiryDate = isMembershipApproved ? formatDateEs(user.membership_expires_at!) : 'Pendiente de Aprobación';
  const banner = isExpired
    ? { bg: '#fef2f2', border: '#fecaca', title: '#b91c1c', text: '#991b1b', label: 'ANUALIDAD VENCIDA',
        detail: `Venció el ${expiryDate}. Renueva tu inscripción anual con la ASV y pide a tu Scouter que registre la nueva fecha.` }
    : isActive
      ? { bg: '#f0fdf4', border: '#bbf7d0', title: '#15803d', text: '#166534', label: 'MEMBRESÍA ACTIVA Y APROBADA POR JEFATURA',
          detail: daysLeft !== null && daysLeft <= 30 ? `Válida hasta el ${expiryDate} (vence en ${daysLeft} ${daysLeft === 1 ? 'día' : 'días'}).` : `Válida hasta el ${expiryDate}.` }
      : { bg: '#fffbeb', border: '#fef08a', title: '#b45309', text: '#92400e', label: 'MEMBRESÍA PENDIENTE DE VALIDACIÓN POR JEFATURA',
          detail: 'Tu Scouter de Unidad o Jefe de Grupo debe aprobar tu fecha de membresía para validar la credencial.' };

  const handleDownloadCarnet = () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      window.print();
    } else {
      showAlert('Carnet Scout', 'Mantén presionada la pantalla para guardar o tomar captura de tu carnet oficial.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
          {/* HEADER MODAL */}
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldCheck size={24} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>Carnet Scout Oficial ASV</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={24} color={theme.subText} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
            {/* AVISO ESTADO DE MEMBRESÍA */}
            <View style={[styles.statusBanner, { backgroundColor: banner.bg, borderColor: banner.border }]}>
              {isActive ? (
                <CheckCircle2 size={18} color="#16a34a" style={{ marginRight: 8 }} />
              ) : (
                <AlertCircle size={18} color={isExpired ? '#dc2626' : '#d97706'} style={{ marginRight: 8 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: banner.title }}>{banner.label}</Text>
                <Text style={{ fontSize: 11, color: banner.text, marginTop: 2 }}>{banner.detail}</Text>
              </View>
            </View>

            {/* VISTA PREVIA DEL CARNET SCOUT (ANVERSO) */}
            <Text style={styles.sideLabel}>ANVERSO (FRENTE DE CREDENCIAL)</Text>
            <View style={styles.carnetBox}>
              {/* Franja Superior Morada */}
              <View style={styles.carnetTopBanner}>
                <View style={styles.worldScoutLogoBox}>
                  <Text style={styles.worldScoutText}>WORLD SCOUTING ⚜️</Text>
                </View>
                <Text style={styles.asvTitle}>Asociación de Scouts de Venezuela</Text>
              </View>

              {/* Cuerpo de Datos */}
              <View style={styles.carnetBody}>
                {/* Cuadro de Foto */}
                <View style={styles.photoContainer}>
                  {carnetPhoto ? (
                    <SecureImage source={{ uri: carnetPhoto }} style={styles.photoImg} onError={() => setPhotoFailed(true)} />
                  ) : (
                    <View style={styles.photoPlaceholder}>
                      <Text style={{ fontSize: 10, color: '#6b7280', fontWeight: 'bold' }}>FOTO</Text>
                    </View>
                  )}
                </View>

                {/* Campos del Scout */}
                <View style={styles.infoFields}>
                  <Text style={styles.fieldLabelText}>Nombre y Apellido:</Text>
                  <Text style={styles.fieldValText}>{user.name}</Text>

                  <Text style={[styles.fieldLabelText, { marginTop: 4 }]}>Cédula:</Text>
                  <Text style={styles.fieldValText}>{user.cedula || 'V-00.000.000'}</Text>

                  <Text style={[styles.fieldLabelText, { marginTop: 4 }]}>Grupo:</Text>
                  <Text style={styles.fieldValText}>{(user.group_name || 'SIN GRUPO').toUpperCase()}</Text>

                  <Text style={[styles.fieldLabelText, { marginTop: 4 }]}>Distrito:</Text>
                  <Text style={styles.fieldValText}>{(user.district || 'GUARENAS GUATIRE').toUpperCase()}</Text>

                  <Text style={[styles.fieldLabelText, { marginTop: 4 }]}>Región:</Text>
                  <Text style={styles.fieldValText}>{(user.region || 'MIRANDA').toUpperCase()}</Text>
                </View>
              </View>

              {/* Pie con Membresía */}
              <View style={styles.carnetFooterPattern}>
                <Text style={[styles.membershipText, isExpired && { color: '#b91c1c' }]}>
                  {isExpired ? '*Anualidad vencida el: ' : '*Membresía válida hasta el: '}<Text style={{ fontWeight: 'bold' }}>{expiryDate}</Text>
                </Text>
              </View>

              {/* Sello de vencida sobre el carnet */}
              {isExpired && (
                <View pointerEvents="none" style={styles.expiredStampWrap} accessibilityLabel="Anualidad vencida">
                  <View style={styles.expiredStamp}>
                    <Text style={styles.expiredStampText}>VENCIDA</Text>
                  </View>
                </View>
              )}
            </View>

            {/* VISTA PREVIA DEL CARNET SCOUT (REVERSO) */}
            <Text style={[styles.sideLabel, { marginTop: 24 }]}>REVERSO (RESPALDO LEGAL Y CONTACTO)</Text>
            <View style={[styles.carnetBox, { backgroundColor: '#ffffff' }]}>
              {/* Barra Geométrica */}
              <View style={styles.carnetTopPattern} />

              <View style={styles.carnetReverseBody}>
                {/* Columna QR & Extravío */}
                <View style={{ width: '45%', alignItems: 'center' }}>
                  <View style={styles.qrImg}>
                    <ScoutQRCode value={`https://scoutplan.vercel.app/verificar/${user.id}`} size={100} />
                  </View>
                  <Text style={styles.lostText}>
                    Se agradece en caso de extravío notificarlo a través de:{'\n'}
                    Correo: operaciones@scouts.org.ve{'\n'}
                    Telf: 0212-951.56.13
                  </Text>
                </View>

                {/* Columna Texto Acreditación & Firma */}
                <View style={{ width: '50%', paddingLeft: 8 }}>
                  <Text style={styles.accreditationText}>
                    La Asociación de Scouts de Venezuela, por medio de la presente credencial, acredita en el territorio nacional a su titular, como miembro activo de la institución.
                  </Text>

                  <View style={styles.signatureBox}>
                    <Text style={styles.sigScript}>César David González Pérez</Text>
                    <View style={styles.sigLine} />
                    <Text style={styles.sigTitle}>CÉSAR DAVID GONZÁLEZ PÉREZ</Text>
                    <Text style={styles.sigSub}>DIRECTOR EJECUTIVO NACIONAL</Text>
                  </View>
                </View>
              </View>

              <View style={styles.carnetBottomPattern}>
                <Text style={{ fontSize: 20 }}>⚜️</Text>
              </View>
            </View>

            {/* BOTÓN DESCARGAR */}
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadCarnet}>
              <Download size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.downloadBtnText}>Descargar Carnet Scout (HD / Imprimir)</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: { width: '100%', maxWidth: 520, borderRadius: 20, maxHeight: '90%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1 },
  modalTitle: { fontSize: 17, fontWeight: 'bold' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, width: '100%', marginBottom: 16 },
  sideLabel: { fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 1, marginBottom: 8, alignSelf: 'flex-start' },

  expiredStampWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  expiredStamp: { borderWidth: 3, borderColor: '#dc2626', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.75)', transform: [{ rotate: '-14deg' }] },
  expiredStampText: { color: '#dc2626', fontSize: 30, fontWeight: '900', letterSpacing: 4 },
  carnetBox: {
    width: 360,
    height: 220,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#612499',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  carnetTopBanner: { backgroundColor: '#612499', paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  worldScoutLogoBox: { flexDirection: 'row', alignItems: 'center' },
  worldScoutText: { color: 'white', fontWeight: 'bold', fontSize: 10 },
  asvTitle: { color: 'white', fontWeight: 'bold', fontSize: 11 },

  carnetBody: { flexDirection: 'row', padding: 10, flex: 1 },
  photoContainer: { width: 90, height: 110, borderRadius: 10, borderWidth: 3, borderColor: '#612499', overflow: 'hidden', backgroundColor: '#f3f4f6' },
  photoImg: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  infoFields: { marginLeft: 12, flex: 1, justifyContent: 'center' },
  fieldLabelText: { fontSize: 9, color: '#4b5563', fontWeight: '600' },
  fieldValText: { fontSize: 12, fontWeight: 'bold', color: '#111827', marginTop: -2 },

  carnetFooterPattern: { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#faf5ff', alignItems: 'flex-end' },
  membershipText: { fontSize: 10, color: '#111827' },

  carnetTopPattern: { height: 8, backgroundColor: '#612499' },
  carnetReverseBody: { flexDirection: 'row', padding: 10, flex: 1, alignItems: 'center' },
  qrImg: { width: 100, height: 100 },
  lostText: { fontSize: 7, color: '#4b5563', marginTop: 4, textAlign: 'center', lineHeight: 9 },

  accreditationText: { fontSize: 8, color: '#1f2937', lineHeight: 11 },
  signatureBox: { marginTop: 8, alignItems: 'center' },
  sigScript: { fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Snell Roundhand' : 'serif', fontStyle: 'italic', color: '#1e1b4b' },
  sigLine: { height: 1, width: 120, backgroundColor: '#374151', marginVertical: 2 },
  sigTitle: { fontSize: 7, fontWeight: 'bold', color: '#111827' },
  sigSub: { fontSize: 6, color: '#6b7280' },

  carnetBottomPattern: { position: 'absolute', bottom: 6, right: 10 },

  downloadBtn: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 14, width: '100%', marginTop: 24 },
  downloadBtnText: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});
