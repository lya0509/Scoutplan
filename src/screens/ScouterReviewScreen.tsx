import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { CheckSquare, Square, CheckCircle } from 'lucide-react-native';
import { dataService } from '../lib/dataService';
import { useTheme } from '../context/ThemeContext';
import { stagesData } from '../data/progressionTemplate';
import { colors } from '../theme/colors';
import { showAlert } from '../utils/alert';

export default function ScouterReviewScreen({ route, navigation }: any) {
  const { scoutId, stageId, scoutName } = route.params;
  const { isDarkMode, theme } = useTheme();
  
  const stageTemplate = stagesData.find(s => s.id === stageId);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!stageTemplate) return;
    const loadedChecks: Record<string, boolean> = {};
    for (const req of stageTemplate.requirements) {
      loadedChecks[req.id] = await dataService.getRequirement(scoutId, stageId, req.id);
    }
    setChecks(loadedChecks);
    setLoading(false);
  };

  const toggleCheck = async (reqId: string) => {
    const newValue = !checks[reqId];
    setChecks(prev => ({ ...prev, [reqId]: newValue }));
    await dataService.toggleRequirement(scoutId, stageId, reqId, newValue);
  };

  const [confirmStep, setConfirmStep] = useState<'none' | 'approve' | 'reject'>('none');

  const handleApprove = async () => {
    const allChecked = stageTemplate?.requirements.every(req => checks[req.id]);
    
    if (confirmStep === 'none') {
      setConfirmStep(allChecked ? 'approve' : 'reject');
      return;
    }

    if (confirmStep === 'reject') {
      await dataService.rejectStage(scoutId, stageId);
      showAlert('Ficha Devuelta', 'Se ha devuelto la ficha al scout para que complete los requisitos faltantes.');
      navigation.goBack();
    } else if (confirmStep === 'approve') {
      await dataService.approveStage(scoutId, stageId);
      showAlert('¡Etapa Aprobada!', 'La etapa ha sido aprobada exitosamente y el scout ha sido notificado.');
      navigation.goBack();
    }
  };

  const getButtonText = () => {
    if (confirmStep === 'approve') return '¿SEGURO? HAZ CLIC PARA APROBAR';
    if (confirmStep === 'reject') return '¿SEGURO? HAZ CLIC PARA DEVOLVER FICHA';
    return 'APROBAR Y FINALIZAR';
  };

  if (loading || !stageTemplate) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.subText }}>Cargando requisitos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, isDarkMode && { backgroundColor: '#121214', borderBottomWidth: 1, borderBottomColor: '#27272a' }]}>
        <Text style={styles.subtitle}>Revisando ficha de:</Text>
        <Text style={styles.title}>{scoutName}</Text>

        {/* BOTONES DE ACCESO A FICHA MÉDICA Y CURRÍCULUM DEL SCOUT */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => navigation.navigate('FichaMedica', { targetUserId: scoutId })}
          >
            <Text style={styles.viewDocBtnText}>📋 Ver Ficha Médica</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewDocBtn}
            onPress={() => navigation.navigate('CurriculumScout', { targetUserId: scoutId })}
          >
            <Text style={styles.viewDocBtnText}>📜 Ver Currículum Scout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.scroll}>
        <Text style={[styles.instructionText, { color: theme.subText }]}>
          Toca cualquier requisito que consideres incorrecto para desmarcarlo. Si desmarcas algo, la etapa le será devuelta.
        </Text>

        {stageTemplate.requirements.map(req => {
          const isChecked = checks[req.id];
          return (
            <TouchableOpacity 
              key={req.id} 
              style={[
                styles.reqRow, 
                { backgroundColor: theme.cardBg, borderColor: theme.border },
                !isChecked && (isDarkMode ? styles.reqRowErrorDark : styles.reqRowError)
              ]}
              onPress={() => toggleCheck(req.id)}
              activeOpacity={0.7}
            >
              {isChecked ? (
                <CheckSquare color={colors.primary} size={24} />
              ) : (
                <Square color={colors.error} size={24} />
              )}
              <Text style={[
                styles.reqText, 
                { color: theme.text },
                !isChecked && styles.reqTextError
              ]}>
                {req.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.cardBg, borderTopColor: theme.border }]}>
        <TouchableOpacity 
          style={[
            styles.approveButton, 
            confirmStep === 'reject' && { backgroundColor: colors.warning }
          ]} 
          onPress={handleApprove}
        >
          <CheckCircle color="white" size={24} style={{ marginRight: 10 }} />
          <Text style={styles.approveButtonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, backgroundColor: colors.primary, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  subtitle: { fontSize: 14, color: '#e0e0e0', marginBottom: 4 },
  scroll: { flex: 1, padding: 20 },
  instructionText: { fontSize: 14, marginBottom: 20, fontStyle: 'italic', textAlign: 'center' },
  reqRow: { 
    flexDirection: 'row', alignItems: 'center', 
    padding: 16, borderRadius: 12, marginBottom: 10,
    borderWidth: 1
  },
  reqRowError: { borderColor: colors.error, backgroundColor: '#fef2f2' },
  reqRowErrorDark: { borderColor: '#ef4444', backgroundColor: '#450a0a' },
  reqText: { fontSize: 15, marginLeft: 15, flex: 1 },
  reqTextError: { color: colors.error, textDecorationLine: 'line-through' },
  footer: { padding: 20, borderTopWidth: 1 },
  approveButton: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  approveButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },
  viewDocBtn: { backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'white' },
  viewDocBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 }
});
