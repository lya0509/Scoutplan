export type Role = 'scout' | 'scouter' | 'jefe_grupo';
export type Unit = 'clan' | 'tropa' | 'caminantes' | 'manada';
export type StageStatus = 'En Progreso' | 'En Revision' | 'Aprobada';

export interface Profile {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cedula?: string | null;
  region?: string | null;
  district?: string | null;
  avatar_url: string | null;
  scout_card_url?: string | null;
  role: Role;
  unit: Unit | null;
  group_name: string | null;
  birth_date?: string | null;
  membership_expires_at?: string | null;
  membership_status?: 'none' | 'pending_approval' | 'approved' | 'rejected' | null;
  membership_rejected_reason?: string | null;
  photo_rejected_reason?: string | null;
}

export interface Requirement {
  id: string;
  text: string;
  type: 'basica' | 'opcional' | 'especialidad' | 'accion_comunitaria' | 'vida_grupo' | 'ciclos' | 'cursos' | 'aire_libre' | 'concursos' | 'personales' | 'checklist';
  level?: 'bronce' | 'plata' | 'oro' | 'doble_oro';
  requiredCount?: number;
}

export interface StageTemplate {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  requirements: Requirement[];
}

export interface StageProgress {
  id: string;
  scout_id: string;
  stage_id: string;
  status: StageStatus;
  updated_at: string;
}

export interface RequirementProgress {
  id: string;
  scout_id: string;
  stage_id: string;
  requirement_id: string;
  completed: boolean;
  updated_at: string;
}

export interface Notification {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  read: boolean;
  created_at: string;
}
