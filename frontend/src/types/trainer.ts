export interface TrainerConversation {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  messages: TrainerMessage[];
}

export interface TrainerMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'trainer';
  content: string;
  createdAt: string;
}

export interface DailyMetrics {
  id: string;
  userId: string;
  date: string;
  bodyWeight?: number;
  bodyFatPct?: number;
  sleepHours?: number;
  fatigueLevel?: number; // 1-5 scale
  mood?: string;
  backComfort?: number; // 0-10 scale
  trainingWindow?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  date: string;
  sessionType: 'UP' | 'LK' | 'UV' | 'LH' | 'Z2' | 'SPR';
  completed: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string;
  sessionId: string;
  name: string;
  category: 'compound' | 'accessory';
  createdAt: string;
  sets: ExerciseSet[];
}

export interface ExerciseSet {
  id: string;
  exerciseId: string;
  weight: number;
  reps: number;
  rpe?: number; // 6-10 scale
  setNumber: number;
  createdAt: string;
}

export interface DailyMacros {
  id: string;
  userId: string;
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrainerSettings {
  id: string;
  userId: string;
  maintenanceKcal: number;
  currentPhase: 'Surplus' | 'Mini-cut';
  mesoWeek: number; // 1-4
  currentPress: string;
  currentHinge: string;
  lastDeloadWeek?: string;
  createdAt: string;
  updatedAt: string;
}

// DTOs for API requests
export interface CreateTrainerMessageDTO {
  content: string;
}

export interface CreateDailyMetricsDTO {
  date: string;
  bodyWeight?: number;
  bodyFatPct?: number;
  sleepHours?: number;
  fatigueLevel?: number;
  mood?: string;
  backComfort?: number;
  trainingWindow?: string;
}

export interface CreateWorkoutSessionDTO {
  date: string;
  sessionType: 'UP' | 'LK' | 'UV' | 'LH' | 'Z2' | 'SPR';
  notes?: string;
  exercises: CreateExerciseDTO[];
}

export interface CreateExerciseDTO {
  name: string;
  category: 'compound' | 'accessory';
  sets: CreateExerciseSetDTO[];
}

export interface CreateExerciseSetDTO {
  weight: number;
  reps: number;
  rpe?: number;
  setNumber: number;
}

export interface CreateDailyMacrosDTO {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UpdateTrainerSettingsDTO {
  maintenanceKcal?: number;
  currentPhase?: 'Surplus' | 'Mini-cut';
  mesoWeek?: number;
  currentPress?: string;
  currentHinge?: string;
  lastDeloadWeek?: string;
}

// Chat request/response types
export interface TrainerChatRequest {
  message: string;
  metrics?: Partial<CreateDailyMetricsDTO>;
  macros?: Partial<CreateDailyMacrosDTO>;
}

export interface TrainerChatResponse {
  message: string;
  todaysPlan?: {
    sessionType?: string;
    macroTargets: {
      kcal_target: number;
      protein_g: number;
      carb_g: number;
      fat_g: number;
    };
  };
  conversation: TrainerConversation;
}

// Rolling data types for the trainer's memory
export interface RollingSessionData {
  lift: string;
  date: string;
  weight: number;
  reps: number;
  sets: number;
  rpe: number;
}

export interface RollingMetricsData {
  weekStart: string;
  avgBodyWeight: number;
  avgBodyFatPct: number;
}

export interface RollingMacrosData {
  date: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MesoTrackerData {
  weekNumber: number; // 1-4
  currentPress: string;
  currentHinge: string;
}