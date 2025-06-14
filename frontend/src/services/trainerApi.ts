import {
  TrainerConversation,
  TrainerChatRequest,
  TrainerChatResponse,
  DailyMetrics,
  CreateDailyMetricsDTO,
  DailyMacros,
  CreateDailyMacrosDTO,
  WorkoutSession,
  CreateWorkoutSessionDTO,
  TrainerSettings,
  UpdateTrainerSettingsDTO
} from '../types/trainer';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class TrainerApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}/api/trainer${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Chat methods
  async getConversation(): Promise<TrainerConversation> {
    return this.makeRequest<TrainerConversation>('/conversation');
  }

  async sendMessage(request: TrainerChatRequest): Promise<TrainerChatResponse> {
    return this.makeRequest<TrainerChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Metrics methods
  async getMetrics(date?: string): Promise<DailyMetrics | null> {
    const endpoint = date ? `/metrics/${date}` : '/metrics';
    return this.makeRequest<DailyMetrics | null>(endpoint);
  }

  async updateMetrics(metrics: CreateDailyMetricsDTO): Promise<DailyMetrics> {
    return this.makeRequest<DailyMetrics>('/metrics', {
      method: 'POST',
      body: JSON.stringify(metrics),
    });
  }

  // Macros methods
  async getMacros(date?: string): Promise<DailyMacros | null> {
    const endpoint = date ? `/macros/${date}` : '/macros';
    return this.makeRequest<DailyMacros | null>(endpoint);
  }

  async updateMacros(macros: CreateDailyMacrosDTO): Promise<DailyMacros> {
    return this.makeRequest<DailyMacros>('/macros', {
      method: 'POST',
      body: JSON.stringify(macros),
    });
  }

  // Settings methods
  async getSettings(): Promise<TrainerSettings> {
    return this.makeRequest<TrainerSettings>('/settings');
  }

  async updateSettings(settings: UpdateTrainerSettingsDTO): Promise<TrainerSettings> {
    return this.makeRequest<TrainerSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Workout methods
  async getWorkouts(limit?: number, offset?: number): Promise<WorkoutSession[]> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());
    if (offset !== undefined) params.append('offset', offset.toString());
    
    const query = params.toString();
    const endpoint = query ? `/workouts?${query}` : '/workouts';
    
    return this.makeRequest<WorkoutSession[]>(endpoint);
  }

  async createWorkout(workout: CreateWorkoutSessionDTO): Promise<WorkoutSession> {
    return this.makeRequest<WorkoutSession>('/workouts', {
      method: 'POST',
      body: JSON.stringify(workout),
    });
  }

  // Utility methods
  getTodayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  parseDate(dateString: string): Date {
    return new Date(dateString);
  }
}

export const trainerApi = new TrainerApiService();
export default trainerApi;