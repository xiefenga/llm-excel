import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import {
  getProviders,
  createProvider,
  updateProvider,
  deleteProvider,
  getModels,
  createModel,
  updateModel,
  deleteModel,
  getCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  getStageRoutes,
  upsertStageRoute,
  deleteStageRoute,
} from "~/lib/llm-api";
import type {
  ProviderCreatePayload,
  ProviderUpdatePayload,
  ModelCreatePayload,
  ModelUpdatePayload,
  CredentialCreatePayload,
  CredentialUpdatePayload,
  StageRouteUpsertPayload,
} from "~/lib/llm-types";

// ==================== Query Keys ====================

const keys = {
  providers: ["llm", "providers"] as const,
  models: (providerId?: string) =>
    providerId ? (["llm", "models", providerId] as const) : (["llm", "models"] as const),
  credentials: (providerId?: string) =>
    providerId ? (["llm", "credentials", providerId] as const) : (["llm", "credentials"] as const),
  stageRoutes: ["llm", "stageRoutes"] as const,
};

// ==================== Providers ====================

export function useProviders() {
  return useQuery({
    queryKey: keys.providers,
    queryFn: getProviders,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProviderCreatePayload) => createProvider(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.providers });
    },
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProviderUpdatePayload }) =>
      updateProvider(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.providers });
    },
  });
}

export function useDeleteProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProvider(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.providers });
    },
  });
}

// ==================== Models ====================

export function useModels(providerId?: string) {
  return useQuery({
    queryKey: keys.models(providerId),
    queryFn: () => getModels(providerId),
    enabled: !!providerId,
  });
}

export function useCreateModel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ModelCreatePayload) => createModel(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.models(variables.provider_id) });
    },
  });
}

export function useUpdateModel(providerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModelUpdatePayload }) =>
      updateModel(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.models(providerId) });
    },
  });
}

export function useDeleteModel(providerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.models(providerId) });
    },
  });
}

// ==================== Credentials ====================

export function useCredentials(providerId?: string) {
  return useQuery({
    queryKey: keys.credentials(providerId),
    queryFn: () => getCredentials(providerId),
    enabled: !!providerId,
  });
}

export function useCreateCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CredentialCreatePayload) => createCredential(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: keys.credentials(variables.provider_id) });
    },
  });
}

export function useUpdateCredential(providerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CredentialUpdatePayload }) =>
      updateCredential(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.credentials(providerId) });
    },
  });
}

export function useDeleteCredential(providerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.credentials(providerId) });
    },
  });
}

// ==================== Stage Routes ====================

export function useStageRoutes() {
  return useQuery({
    queryKey: keys.stageRoutes,
    queryFn: getStageRoutes,
  });
}

export function useUpsertStageRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ stage, payload }: { stage: string; payload: StageRouteUpsertPayload }) =>
      upsertStageRoute(stage, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.stageRoutes });
    },
  });
}

export function useDeleteStageRoute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stage: string) => deleteStageRoute(stage),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.stageRoutes });
    },
  });
}
