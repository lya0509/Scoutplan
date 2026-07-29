import React from 'react';
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
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';

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

  if (!user) return null;

  const isMembershipApproved = user.membership_status === 'approved' && !!user.membership_expires_at;
  const expiryDate = isMembershipApproved ? user.membership_expires_at : 'Pendiente de Aprobación';

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
            <View style={[
              styles.statusBanner,
              { backgroundColor: isMembershipApproved ? '#f0fdf4' : '#fffbeb', borderColor: isMembershipApproved ? '#bbf7d0' : '#fef08a' }
            ]}>
              {isMembershipApproved ? (
                <CheckCircle2 size={18} color="#16a34a" style={{ marginRight: 8 }} />
              ) : (
                <AlertCircle size={18} color="#d97706" style={{ marginRight: 8 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: isMembershipApproved ? '#15803d' : '#b45309' }}>
                  {isMembershipApproved ? 'MEMBRESÍA ACTIVA Y APROBADA POR JEFATURA' : 'MEMBRESÍA PENDIENTE DE VALIDACIÓN POR JEFATURA'}
                </Text>
                <Text style={{ fontSize: 11, color: isMembershipApproved ? '#166534' : '#92400e', marginTop: 2 }}>
                  {isMembershipApproved
                    ? `Válida hasta el: ${expiryDate}`
                    : 'Tu Scouter de Unidad o Jefe de Grupo debe aprobar tu fecha de membresía para validar la credencial.'}
                </Text>
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
                  {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.photoImg} />
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
                <Text style={styles.membershipText}>
                  *Membresía válida hasta el: <Text style={{ fontWeight: 'bold' }}>{expiryDate}</Text>
                </Text>
              </View>
            </View>

            {/* VISTA PREVIA DEL CARNET SCOUT (REVERSO) */}
            <Text style={[styles.sideLabel, { marginTop: 24 }]}>REVERSO (RESPALDO LEGAL Y CONTACTO)</Text>
            <View style={[styles.carnetBox, { backgroundColor: '#ffffff' }]}>
              {/* Barra Geométrica */}
              <View style={styles.carnetTopPattern} />

              <View style={styles.carnetReverseBody}>
                {/* Columna QR & Extravío */}
                <View style={{ width: '45%', alignItems: 'center' }}>
                  <Image
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ASV_SCOUT_${user.id}` }}
                    style={styles.qrImg}
                  />
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
  qrImg: { width: 85, height: 85 },
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
