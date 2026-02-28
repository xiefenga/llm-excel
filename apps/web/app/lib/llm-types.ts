export enum LLMStatus {
  DISABLED = 0,
  ENABLED = 1,
  DEPRECATED = 2,
}

export interface LLMProvider {
  id: string;
  name: string;
  type: string;
  base_url: string | null;
  status: number;
  capabilities: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LLMModel {
  id: string;
  provider_id: string;
  name: string;
  model_id: string;
  limits: Record<string, unknown>;
  defaults: Record<string, unknown>;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface LLMCredential {
  id: string;
  provider_id: string;
  secret_type: string;
  status: number;
  meta: Record<string, unknown>;
  has_secret: boolean;
  secret_masked: string | null;
  created_at: string;
  updated_at: string;
}

export interface LLMStageRoute {
  stage: string;
  provider_id: string;
  model_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Payload types for CRUD operations

export interface ProviderCreatePayload {
  name: string;
  type: string;
  base_url?: string | null;
  status?: number;
  capabilities?: Record<string, unknown>;
}

export interface ProviderUpdatePayload {
  name?: string;
  type?: string;
  base_url?: string | null;
  status?: number;
  capabilities?: Record<string, unknown>;
}

export interface ModelCreatePayload {
  provider_id: string;
  name: string;
  model_id: string;
  limits?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  status?: number;
}

export interface ModelUpdatePayload {
  name?: string;
  model_id?: string;
  limits?: Record<string, unknown>;
  defaults?: Record<string, unknown>;
  status?: number;
}

export interface CredentialCreatePayload {
  provider_id: string;
  secret_type?: string;
  secret_value: string;
  status?: number;
  meta?: Record<string, unknown>;
}

export interface CredentialUpdatePayload {
  secret_type?: string;
  secret_value?: string;
  status?: number;
  meta?: Record<string, unknown>;
}

export interface StageRouteUpsertPayload {
  provider_id: string;
  model_id: string;
  is_active?: boolean;
}
