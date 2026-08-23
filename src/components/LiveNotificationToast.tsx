import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import {
  Award, ShieldCheck, Calendar, FileText, Sparkles, AlertTriangle, Bell, X, ChevronRight
} from 'lucide-react-native';

export default function LiveNotificationToast() {
  const { activeToast, dismissToast } = useNotifications();
  const { isDarkMode, theme } = useTheme();

  if (!activeToast) return null;

  const getTypeIcon = () => {
    switch (activeToast.type) {
      case 'badge':
        return <Award size={20} color="#f59e0b" />;
      case 'membership':
        return <ShieldCheck size={20} color="#10b981" />;
      case 'calendar':
        return <Calendar size={20} color="#6366f1" />;
      case 'program':
        return <FileText size={20} color="#9333ea" />;
      case 'plan':
        return <Sparkles size={20} color="#3b82f6" />;
      case 'alert':
        return <AlertTriangle size={20} color="#ef4444" />;
      default:
        return <Bell size={20} color="#6366f1" />;
    }
  };

  const getBorderColor = () => {
    switch (activeToast.type) {
      case 'badge': return '#f59e0b';
      case 'membership': return '#10b981';
      case 'calendar': return '#6366f1';
      case 'program': return '#9333ea';
      case 'plan': return '#3b82f6';
      case 'alert': return '#ef4444';
      default: return '#6366f1';
    }
  };

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      <TouchableOpacity
        style={[
          styles.toastCard,
          {
            backgroundColor: isDarkMode ? '#1e1e24' : '#ffffff',
            borderColor: getBorderColor(),
            shadowColor: getBorderColor(),
          }
        ]}
        onPress={dismissToast}
        activeOpacity={0.9}
      >
        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? '#27272a' : '#f4f4f5' }]}>
          {getTypeIcon()}
        </View>

        <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.toastTitle, { color: theme.text }]} numberOfLines={1}>
              {activeToast.title}
            </Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveBadgeText}>AHORA</Text>
            </View>
          </View>
          <Text style={[styles.toastMessage, { color: theme.subText }]} numberOfLines={2}>
            {activeToast.message}
          </Text>
        </View>

        <TouchableOpacity onPress={dismissToast} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={16} color={theme.subText} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  toastMessage: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  liveBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 8,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
  }
});
