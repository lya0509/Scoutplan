import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

import ScoutDashboardScreen from '../screens/ScoutDashboardScreen';
import ScouterDashboardScreen from '../screens/ScouterDashboardScreen';
import JefeGrupoScreen from '../screens/JefeGrupoScreen';
import StageDetailScreen from '../screens/StageDetailScreen';
import ScouterReviewScreen from '../screens/ScouterReviewScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CatalogSelectorScreen from '../screens/CatalogSelectorScreen';
import CertificateUploadScreen from '../screens/CertificateUploadScreen';
import ScoutFullProfileScreen from '../screens/ScoutFullProfileScreen';
import QuarterlyPlanScreen from '../screens/QuarterlyPlanScreen';
import TemporalDriveScreen from '../screens/TemporalDriveScreen';
import FichaMedicaScreen from '../screens/FichaMedicaScreen';
import CurriculumScoutScreen from '../screens/CurriculumScoutScreen';
import NudosManualScreen from '../screens/NudosManualScreen';
import CancioneroScreen from '../screens/CancioneroScreen';

import DrawerNavigator from './DrawerNavigator';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6a1b9a" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, animation: 'slide_from_right' }}>
        {!user ? (
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Registro' }} />
          </Stack.Group>
        ) : (
          <Stack.Group>
            {user.role === 'scout' && (
              <>
                <Stack.Screen name="Drawer" component={DrawerNavigator} />
                <Stack.Screen name="StageDetail" component={StageDetailScreen} options={{ headerShown: true, title: 'Detalle de Etapa' }} />
              </>
            )}

            {user.role === 'scouter' && (
              <>
                <Stack.Screen name="ScouterDashboard" component={ScouterDashboardScreen} />
                <Stack.Screen name="ScouterReview" component={ScouterReviewScreen} options={{ headerShown: true, title: 'Revisión de Scout' }} />
                <Stack.Screen name="CalendarStandalone" component={CalendarScreen} options={{ headerShown: true, title: 'Calendario de Unidad' }} />
              </>
            )}

            {user.role === 'jefe_grupo' && (
              <>
                <Stack.Screen name="JefeDashboard" component={JefeGrupoScreen} />
                <Stack.Screen name="CalendarStandalone" component={CalendarScreen} options={{ headerShown: true, title: 'Calendario de Grupo' }} />
              </>
            )}

            {/* Rutas compartidas por cualquier usuario autenticado */}
            <Stack.Screen name="CatalogSelector" component={CatalogSelectorScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CertificateUpload" component={CertificateUploadScreen} options={{ headerShown: false }} />
            <Stack.Screen name="ScoutFullProfile" component={ScoutFullProfileScreen} options={{ headerShown: true, title: 'Perfil Completo del Scout' }} />
            <Stack.Screen name="QuarterlyPlan" component={QuarterlyPlanScreen} options={{ headerShown: true, title: 'Plan Trimestral' }} />
            <Stack.Screen name="TemporalDrive" component={TemporalDriveScreen} options={{ headerShown: true, title: 'Drive de Fotos' }} />
            <Stack.Screen name="FichaMedica" component={FichaMedicaScreen} options={{ headerShown: true, title: 'Ficha Médica Scout' }} />
            <Stack.Screen name="CurriculumScout" component={CurriculumScoutScreen} options={{ headerShown: true, title: 'Currículo Scout Joven' }} />
            <Stack.Screen name="NudosManual" component={NudosManualScreen} options={{ headerShown: true, title: 'Manual de Nudos (Offline)' }} />
            <Stack.Screen name="Cancionero" component={CancioneroScreen} options={{ headerShown: true, title: 'Cancionero Scout (Offline)' }} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
