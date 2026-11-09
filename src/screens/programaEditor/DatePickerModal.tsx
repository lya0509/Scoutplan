// Calendario para elegir la fecha del programa (con accesos rápidos: hoy, próximo sábado/domingo).
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import { todayLocal } from '../../utils/dateLocal';
import { styles } from './styles';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Fecha (AAAA-MM-DD) de hoy, del próximo sábado o del próximo domingo (nunca hoy mismo). */
export function quickDate(type: 'today' | 'next_saturday' | 'next_sunday', now = new Date()): string {
  const d = new Date(now);
  if (type === 'next_saturday') d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  if (type === 'next_sunday') d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7));
  return ymd(d);
}

interface Props {
  visible: boolean;
  /** Fecha elegida (AAAA-MM-DD) o vacío. */
  value: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

export function DatePickerModal({ visible, value, onSelect, onClose }: Props) {
  const { isDarkMode, theme, primaryColor } = useTheme();

  const monthOf = (v: string) => {
    const d = v ? new Date(v + 'T12:00:00') : new Date();
    return isNaN(d.getTime()) ? { y: new Date().getFullYear(), m: new Date().getMonth() } : { y: d.getFullYear(), m: d.getMonth() };
  };
  const [view, setView] = useState(() => monthOf(value));
  // Al abrir, mostrar el mes de la fecha elegida
  useEffect(() => { if (visible) setView(monthOf(value)); }, [visible]);

  const prevMonth = () => setView(v => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }));
  const nextMonth = () => setView(v => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }));

  const firstDayOfMonth = new Date(view.y, view.m, 1).getDay();
  const totalDaysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const today = todayLocal();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.calendarModal, { backgroundColor: isDarkMode ? '#18181b' : '#ffffff' }]}>
          <View style={styles.modalHeaderRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Calendar size={20} color={primaryColor} />
              <Text style={[styles.modalHeaderTitle, { color: theme.text }]}>Seleccionar Fecha</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={20} color={theme.subText} />
            </TouchableOpacity>
          </View>

          {/* Accesos rápidos de fecha */}
          <View style={styles.quickDateRow}>
            <TouchableOpacity
              style={[styles.quickDateChip, { backgroundColor: primaryColor + '18', borderColor: primaryColor }]}
              onPress={() => onSelect(quickDate('today'))}
            >
              <Text style={[styles.quickDateChipText, { color: theme.accentText }]}>📅 Hoy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickDateChip, { backgroundColor: '#16a34a18', borderColor: '#16a34a' }]}
              onPress={() => onSelect(quickDate('next_saturday'))}
            >
              <Text style={[styles.quickDateChipText, { color: '#16a34a' }]}>⚜️ Próx. Sábado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickDateChip, { backgroundColor: '#2563eb18', borderColor: '#2563eb' }]}
              onPress={() => onSelect(quickDate('next_sunday'))}
            >
              <Text style={[styles.quickDateChipText, { color: '#2563eb' }]}>🏕️ Próx. Domingo</Text>
            </TouchableOpacity>
          </View>

          {/* Navegación de Mes y Año */}
          <View style={styles.calendarNavRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
              <ChevronLeft size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.calMonthTitle, { color: theme.text }]}>
              {MONTH_NAMES[view.m]} {view.y}
            </Text>
            <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
              <ChevronRight size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Encabezado Días de la Semana */}
          <View style={styles.calWeekHeader}>
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d, i) => (
              <Text key={i} style={[styles.calWeekDayText, { color: theme.subText }]}>{d}</Text>
            ))}
          </View>

          {/* Cuadrícula de días del mes */}
          <View style={styles.calGrid}>
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <View key={`empty-${i}`} style={styles.calDayCell} />
            ))}
            {Array.from({ length: totalDaysInMonth }, (_, i) => {
              const day = i + 1;
              const cellDateStr = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = value === cellDateStr;
              const isToday = today === cellDateStr;
              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.calDayCell,
                    isSelected && { backgroundColor: primaryColor, borderRadius: 20 },
                    !isSelected && isToday && { borderWidth: 1, borderColor: primaryColor, borderRadius: 20 }
                  ]}
                  onPress={() => onSelect(cellDateStr)}
                >
                  <Text style={[styles.calDayText, { color: isSelected ? '#ffffff' : theme.text }, isSelected && { fontWeight: 'bold' }]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.closeModalBtn, { backgroundColor: isDarkMode ? '#27272a' : '#f1f5f9', marginTop: 16 }]}
            onPress={onClose}
          >
            <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
