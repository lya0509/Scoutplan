import React from 'react';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors } from '../theme/colors';
import { UserScoutAvatar } from '../components/UserScoutAvatar';
import { Moon, Sun } from 'lucide-react-native';

// Pantallas del Drawer
import ProfileScreen from '../screens/ProfileScreen';
import PlanProgresivoScreen from '../screens/PlanProgresivoScreen';
import ActivityCenterScreen from '../screens/ActivityCenterScreen';
import CalendarScreen from '../screens/CalendarScreen';
import ScoutDashboardScreen from '../screens/ScoutDashboardScreen';
import CertificateUploadScreen from '../screens/CertificateUploadScreen';
import QuarterlyPlanScreen from '../screens/QuarterlyPlanScreen';
import TemporalDriveScreen from '../screens/TemporalDriveScreen';
import FichaMedicaScreen from '../screens/FichaMedicaScreen';
import CurriculumScoutScreen from '../screens/CurriculumScoutScreen';
import NudosManualScreen from '../screens/NudosManualScreen';
import CancioneroScreen from '../screens/CancioneroScreen';

const Drawer = createDrawerNavigator();

function HeaderThemeButton() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  return (
    <TouchableOpacity
      style={styles.headerThemeBtn}
      onPress={toggleDarkMode}
      activeOpacity={0.8}
    >
      {isDarkMode ? (
        <Sun size={20} color="#f59e0b" />
      ) : (
        <Moon size={20} color="#ffffff" />
      )}
    </TouchableOpacity>
  );
}

function CustomDrawerContent(props: any) {
  const { user, signOut } = useAuth();
  const { isDarkMode } = useTheme();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <DrawerContentScrollView 
      {...props} 
      contentContainerStyle={{ backgroundColor: isDarkMode ? '#000000' : '#ffffff', paddingBottom: 20 }}
    >
      <View style={[styles.drawerHeader, { backgroundColor: isDarkMode ? '#000000' : colors.primary, borderBottomWidth: isDarkMode ? 1 : 0, borderBottomColor: '#27272a' }]}>
        <View style={styles.avatarContainer}>
          <UserScoutAvatar unit={user?.unit || undefined} role={user?.role} size={72} />
        </View>
        <Text style={styles.userName}>{user?.name || 'Scout'}</Text>
        <Text style={styles.userUnit}>{user?.group_name ? `${user.group_name} • ${user?.unit?.toUpperCase() || ''}` : 'Sin Grupo'}</Text>
      </View>
      
      <View style={{ paddingTop: 10, backgroundColor: isDarkMode ? '#000000' : '#ffffff' }}>
        <DrawerItemList {...props} />
      </View>

      <View style={[styles.drawerFooter, { backgroundColor: isDarkMode ? '#000000' : '#ffffff', borderTopColor: isDarkMode ? '#27272a' : '#f0f0f0' }]}>
        <DrawerItem
          label="Cerrar sesión"
          onPress={handleSignOut}
          labelStyle={{ color: '#ef4444', fontWeight: 'bold' }}
        />
      </View>
    </DrawerContentScrollView>
  );
}

export default function DrawerNavigator() {
  const { isDarkMode } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: isDarkMode ? '#000000' : colors.primary },
        headerTintColor: '#fff',
        headerRight: () => <HeaderThemeButton />,
        drawerStyle: { backgroundColor: isDarkMode ? '#000000' : '#ffffff' },
        drawerActiveBackgroundColor: colors.primary,
        drawerActiveTintColor: '#ffffff',
        drawerInactiveTintColor: isDarkMode ? '#e4e4e7' : '#333333',
      }}
    >
      <Drawer.Screen name="Resumen" component={ScoutDashboardScreen} options={{ drawerLabel: 'Inicio' }} />
      <Drawer.Screen name="Perfil" component={ProfileScreen} />
      <Drawer.Screen name="PlanProgresivo" component={PlanProgresivoScreen} options={{ drawerLabel: 'Plan Progresivo', title: 'Plan Progresivo' }} />
      <Drawer.Screen name="PlanTrimestralDrawer" component={QuarterlyPlanScreen} options={{ drawerLabel: 'Plan Trimestral', title: 'Plan Trimestral' }} />
      <Drawer.Screen name="TemporalDriveDrawer" component={TemporalDriveScreen} options={{ drawerLabel: 'Drive de Fotos', title: 'Drive de Fotos' }} />
      <Drawer.Screen name="FichaMedicaDrawer" component={FichaMedicaScreen} options={{ drawerLabel: 'Ficha Médica Scout', title: 'Ficha Médica Scout' }} />
      <Drawer.Screen name="CurriculumScoutDrawer" component={CurriculumScoutScreen} options={{ drawerLabel: 'Currículum Scout Joven', title: 'Currículum Scout Joven' }} />
      <Drawer.Screen name="NudosManualDrawer" component={NudosManualScreen} options={{ drawerLabel: 'Manual de Nudos (Offline)', title: 'Manual de Nudos y Amarres' }} />
      <Drawer.Screen name="CancioneroDrawer" component={CancioneroScreen} options={{ drawerLabel: 'Cancionero y Oraciones (Offline)', title: 'Cancionero & Oraciones Scout' }} />
      <Drawer.Screen name="CertificadosDrawer" component={CertificateUploadScreen} options={{ drawerLabel: 'Mis Certificados', title: 'Mis Certificados' }} />
      <Drawer.Screen name="CentroActividades" component={ActivityCenterScreen} options={{ drawerLabel: 'Centro de Actividades', title: 'Actividades' }} />
      <Drawer.Screen name="Calendario" component={CalendarScreen} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerHeader: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    marginBottom: 10,
  },
  userName: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userUnit: {
    color: '#e0d4f7',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '600'
  },
  headerThemeBtn: {
    marginRight: 16,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  drawerFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
});
