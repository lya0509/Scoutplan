import { GrowthAreaKey } from '../data/achievementIndicatorsData';

export interface ActivityScheduleItem {
  id: string;
  timeRange: string;
  title: string;
  description: string;
  responsible: string;
  materials: string;
}

export interface ProgramaScout {
  id: string;
  title: string;
  date: string;
  location: string;
  activityType: string;
  unit: 'manada' | 'tropa' | 'caminantes' | 'clan';
  isSinodal?: boolean;
  selectedUnits?: ('manada' | 'tropa' | 'caminantes' | 'clan')[];
  participantProjection: string;
  generalObjective: string;
  specificObjectives: string[];
  specificMetas: string[];
  selectedSDGs: number[];
  indicators: Record<GrowthAreaKey, string[]>;
  schedule: ActivityScheduleItem[];
  importantNotes?: string;
  registrationBadgeId?: string;
  createdBy: string;
  creatorName: string;
  groupName?: string;
  planActivityId?: string;
  isExtraordinary?: boolean;
  status?: 'draft' | 'published';
  previewRoles?: string[];
  createdAt: string;
  updatedAt: string;
}
