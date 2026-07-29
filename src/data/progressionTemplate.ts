import { StageTemplate } from '../types/progression';

export const stagesData: StageTemplate[] = [
  {
    id: 'precursor',
    title: 'Precursor',
    description: 'Insignia que representa el inicio de este viaje',
    estimatedTime: '4 a 8 semanas',
    requirements: [
      { id: 'pre_ley', text: 'Ley Scout', type: 'basica' },
      { id: 'pre_promesa', text: 'Promesa Scout', type: 'basica' },
      { id: 'pre_uniforme', text: 'Uniforme Scout', type: 'basica' },
      { id: 'pre_introspeccion', text: 'Introspección (Compromiso Inicial)', type: 'basica' },
      { id: 'pre_campismo', text: 'Campismo Elemental', type: 'basica' },
      { id: 'pre_pionerismo', text: 'Pionerismo Elemental', type: 'basica' },
      { id: 'pre_exploracion', text: 'Exploración Elemental', type: 'basica' },
      { id: 'pre_conservacionismo', text: 'Conservacionismo Elemental', type: 'basica' },
      { id: 'pre_noches', text: 'Noches de Vida al Aire Libre (3 noches)', type: 'aire_libre' }
    ]
  },
  {
    id: 'expedicionario',
    title: 'Expedicionario',
    description: 'Tú que quieres saber ir',
    estimatedTime: '14 meses',
    requirements: [
      { id: 'exp_basicas', text: 'Actividades Básicas (12 cualquier área)', type: 'basica', requiredCount: 12 },
      { id: 'exp_opcionales', text: 'Actividades Opcionales (9 cualquier área)', type: 'opcional', requiredCount: 9 },
      { id: 'exp_esp_bronce', text: 'Especialidades (1 Bronce)', type: 'especialidad', level: 'bronce' },
      { id: 'exp_esp_plata', text: 'Especialidades (1 Plata)', type: 'especialidad', level: 'plata' },
      { id: 'exp_accion_comunitaria', text: 'Acción Comunitaria (4 Créditos)', type: 'accion_comunitaria' },
      { id: 'exp_vg_campamento', text: 'Vida de Grupo (1 Campamento)', type: 'vida_grupo' },
      { id: 'exp_vg_peregrinaje', text: 'Vida de Grupo (1 Peregrinaje)', type: 'vida_grupo' },
      { id: 'exp_vg_proyecto', text: 'Vida de Grupo (1 Proyecto de Servicio)', type: 'vida_grupo' },
      { id: 'exp_cip_distrital', text: 'Ciclos Institucionales (1 Actividad Distrital)', type: 'ciclos' },
      { id: 'exp_cip_regional', text: 'Ciclos Institucionales (1 Actividad Regional)', type: 'ciclos' },
      { id: 'exp_cip_nacional', text: 'Ciclos Institucionales (1 Actividad Nacional)', type: 'ciclos' },
      { id: 'exp_cursos', text: 'Cursos y Talleres (Horqueta en Bronce)', type: 'cursos' },
      { id: 'exp_noches', text: 'Noches de Vida al Aire Libre (7 noches)', type: 'aire_libre' }
    ]
  },
  {
    id: 'descubridor',
    title: 'Descubridor',
    description: 'Para aquellos que buscan ir más allá.',
    estimatedTime: '12 meses',
    requirements: [
      { id: 'des_basicas', text: 'Actividades Básicas (9 cualquier área)', type: 'basica', requiredCount: 9 },
      { id: 'des_opcionales', text: 'Actividades Opcionales (6 cualquier área)', type: 'opcional', requiredCount: 6 },
      { id: 'des_esp_bronce', text: 'Especialidades (1 Bronce)', type: 'especialidad', level: 'bronce' },
      { id: 'des_esp_plata', text: 'Especialidades (1 Plata)', type: 'especialidad', level: 'plata' },
      { id: 'des_accion_comunitaria', text: 'Acción Comunitaria (8 Créditos)', type: 'accion_comunitaria' },
      { id: 'des_vg_campamento', text: 'Vida de Grupo (1 Campamento)', type: 'vida_grupo' },
      { id: 'des_vg_peregrinaje', text: 'Vida de Grupo (1 Peregrinaje)', type: 'vida_grupo' },
      { id: 'des_vg_proyecto', text: 'Vida de Grupo (1 Proyecto de Servicio)', type: 'vida_grupo' },
      { id: 'des_cip_distrital', text: 'Ciclos Institucionales (2 Actividades Distrital)', type: 'ciclos' },
      { id: 'des_cip_regional', text: 'Ciclos Institucionales (2 Actividades Regional)', type: 'ciclos' },
      { id: 'des_cip_nacional', text: 'Ciclos Institucionales (2 Actividades Nacional)', type: 'ciclos' },
      { id: 'des_cursos', text: 'Cursos y Talleres (Remo en Plata)', type: 'cursos' },
      { id: 'des_noches', text: 'Noches de Vida al Aire Libre (10 noches)', type: 'aire_libre' }
    ]
  },
  {
    id: 'fundador',
    title: 'Fundador',
    description: 'Dejando el mundo mejor de como lo encontraste.',
    estimatedTime: '12 meses',
    requirements: [
      { id: 'fun_basicas', text: 'Actividades Básicas (9 cualquier área)', type: 'basica', requiredCount: 9 },
      { id: 'fun_opcionales', text: 'Actividades Opcionales (6 cualquier área)', type: 'opcional', requiredCount: 6 },
      { id: 'fun_personales', text: 'Actividades Personales (3 de su propia creación)', type: 'personales', requiredCount: 3 },
      { id: 'fun_esp_plata', text: 'Especialidades (1 Plata)', type: 'especialidad', level: 'plata' },
      { id: 'fun_esp_oro', text: 'Especialidades (1 Oro)', type: 'especialidad', level: 'oro' },
      { id: 'fun_accion_comunitaria', text: 'Acción Comunitaria (10 Créditos)', type: 'accion_comunitaria' },
      { id: 'fun_vg_campamento', text: 'Vida de Grupo (2 Campamentos)', type: 'vida_grupo' },
      { id: 'fun_vg_peregrinaje', text: 'Vida de Grupo (2 Peregrinajes)', type: 'vida_grupo' },
      { id: 'fun_vg_proyecto', text: 'Vida de Grupo (1 Proyecto de Servicio)', type: 'vida_grupo' },
      { id: 'fun_cip_distrital', text: 'Ciclos Institucionales (3 Actividades Distrital)', type: 'ciclos' },
      { id: 'fun_cip_regional', text: 'Ciclos Institucionales (3 Actividades Regional)', type: 'ciclos' },
      { id: 'fun_cip_nacional', text: 'Ciclos Institucionales (3 Actividades Nacional)', type: 'ciclos' },
      { id: 'fun_cursos', text: 'Cursos y Talleres (Canoa en Oro)', type: 'cursos' },
      { id: 'fun_noches', text: 'Noches de Vida al Aire Libre (12 noches)', type: 'aire_libre' }
    ]
  },
  {
    id: 'rover_ciudadano',
    title: 'Rover Ciudadano',
    description: 'Servicio en la etapa máxima.',
    estimatedTime: 'Indefinido',
    requirements: [
      { id: 'rov_opcionales', text: 'Actividades Opcionales (9 cualquier área)', type: 'opcional', requiredCount: 9 },
      { id: 'rov_personales', text: 'Actividades Personales (3 de su propia creación)', type: 'personales', requiredCount: 3 },
      { id: 'rov_esp_oro', text: 'Especialidades (2 Oro)', type: 'especialidad', level: 'oro' },
      { id: 'rov_accion_comunitaria', text: 'Acción Comunitaria (16 Créditos)', type: 'accion_comunitaria' },
      { id: 'rov_vg_campamento', text: 'Vida de Grupo (2 Campamentos)', type: 'vida_grupo' },
      { id: 'rov_vg_peregrinaje', text: 'Vida de Grupo (3 Peregrinajes)', type: 'vida_grupo' },
      { id: 'rov_vg_proyecto', text: 'Vida de Grupo (1 Proyecto de Servicio)', type: 'vida_grupo' },
      { id: 'rov_cip_distrital', text: 'Ciclos Institucionales (3 Actividades Distrital)', type: 'ciclos' },
      { id: 'rov_cip_regional', text: 'Ciclos Institucionales (3 Actividades Regional)', type: 'ciclos' },
      { id: 'rov_cip_nacional', text: 'Ciclos Institucionales (3 Actividades Nacional)', type: 'ciclos' },
      { id: 'rov_cursos', text: 'Cursos y Talleres (Canoa en Oro)', type: 'cursos' },
      { id: 'rov_noches', text: 'Noches de Vida al Aire Libre (15 noches)', type: 'aire_libre' }
    ]
  }
];
