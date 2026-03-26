// Shared types for virtual-speaker-web

export interface HelloResponse {
  message: string;
  timestamp: string;
  service: string;
}

export interface ApiResponse<T = unknown> {
  data: T;
  success: boolean;
  error?: string;
}
