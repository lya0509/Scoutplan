import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '../context/NotificationContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import NotificationCenterModal from './NotificationCenterModal';

interface NotificationHeaderBellProps {
  size?: number;
  color?: string;
  style?: any;
}

export default function NotificationHeaderBell({ size = 22, color, style }: NotificationHeaderBellProps) {
  const { unreadCount } = useNotifications();
  const { isDarkMode, theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  const iconColor = color || (isDarkMode ? '#ffffff' : '#1e293b');

  return (
    <>
      <TouchableOpacity
        style={[styles.bellBtn, style]}
        onPress={() => setModalVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Bell size={size} color={iconColor} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <NotificationCenterModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    position: 'relative',
    padding: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ef4444',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  }
});
