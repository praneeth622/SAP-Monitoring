export interface SystemValidationRequest {
  systemName: string;
  description: string;
  systemSource: string;
  username: string;
  password: string;
}

export interface SystemListResponse {
  id: number;
  systemName: string;
  systemType: string;
  pollingStatus: string;
  connectionStatus: string;
  isActive: boolean;
}
