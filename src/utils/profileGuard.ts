import { Profile } from '../types/progression';
import { showAlert } from './alert';

export function isProfileIncomplete(user: Profile | null): boolean {
  if (!user) return true;
  
  const nameValid = !!user.name && user.name.trim() !== '' && user.name.trim() !== 'Usuario Scout';
  const groupValid = !!user.group_name && user.group_name.trim() !== '' && user.group_name.trim() !== 'Sin Grupo';
  const unitValid = !!user.unit && user.unit.trim() !== '' && user.unit.trim() !== 'Sin Unidad';
  
  return !nameValid || !groupValid || !unitValid;
}

export function checkProfileCompletion(user: Profile | null, navigation?: any): boolean {
  if (isProfileIncomplete(user)) {
    showAlert(
      'Perfil Incompleto ⚠️',
      'Debes completar tus datos personales en tu Perfil (Nombre Completo, Grupo Scout y Unidad) para poder realizar esta acción. Actualmente tu cuenta está en modo Solo Lectura.',
      [
        {
          text: 'Ir a Mi Perfil 👤',
          onPress: () => {
            if (navigation && navigation.navigate) {
              navigation.navigate('Profile');
            }
          }
        },
        { text: 'Entendido', style: 'cancel' }
      ]
    );
    return false;
  }
  return true;
}
