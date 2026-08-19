export interface SDGItem {
  number: number;
  name: string;
  shortName: string;
  color: string;
  icon: string;
}

export const SDG_LIST: SDGItem[] = [
  { number: 1, name: 'Fin de la Pobreza', shortName: 'Pobreza Cero', color: '#e5243b', icon: '🤲' },
  { number: 2, name: 'Hambre Cero', shortName: 'Hambre Cero', color: '#dda63a', icon: '🍲' },
  { number: 3, name: 'Salud y Bienestar', shortName: 'Salud y Bienestar', color: '#4c9f38', icon: '🩺' },
  { number: 4, name: 'Educación de Calidad', shortName: 'Educación', color: '#c5192d', icon: '🎓' },
  { number: 5, name: 'Igualdad de Género', shortName: 'Igualdad de Género', color: '#ff3a21', icon: '⚖️' },
  { number: 6, name: 'Agua Limpia y Saneamiento', shortName: 'Agua Limpia', color: '#26bde2', icon: '💧' },
  { number: 7, name: 'Energía Asequible y No Contaminante', shortName: 'Energía Limpia', color: '#fcc30b', icon: '☀️' },
  { number: 8, name: 'Trabajo Decente y Crecimiento Económico', shortName: 'Trabajo Decente', color: '#a21942', icon: '💼' },
  { number: 9, name: 'Industria, Innovación e Infraestructura', shortName: 'Innovación', color: '#fd6925', icon: '🏗️' },
  { number: 10, name: 'Reducción de las Desigualdades', shortName: 'Menos Desigualdades', color: '#dd1367', icon: '🤝' },
  { number: 11, name: 'Ciudades y Comunidades Sostenibles', shortName: 'Ciudades Sostenibles', color: '#fd9d24', icon: '🏙️' },
  { number: 12, name: 'Producción y Consumo Responsables', shortName: 'Consumo Responsable', color: '#bf8b2e', icon: '♻️' },
  { number: 13, name: 'Acción por el Clima', shortName: 'Acción por el Clima', color: '#3f7e44', icon: '🌍' },
  { number: 14, name: 'Vida Submarina', shortName: 'Vida Submarina', color: '#0a97d9', icon: '🌊' },
  { number: 15, name: 'Vida de Ecosistemas Terrestres', shortName: 'Vida Terrestre', color: '#56c02b', icon: '🌿' },
  { number: 16, name: 'Paz, Justicia e Instituciones Sólidas', shortName: 'Paz y Justicia', color: '#00689d', icon: '🕊️' },
  { number: 17, name: 'Alianzas para lograr los Objetivos', shortName: 'Alianzas', color: '#19486a', icon: '🔗' },
];
