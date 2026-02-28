import axios from "axios";

import { API_BASE } from "~/lib/config";
import type { ApiResponse } from "~/lib/api";
import type {
  LLMProvider,
  LLMModel,
  LLMCredential,
  LLMStageRoute,
  ProviderCreatePayload,
  ProviderUpdatePayload,
  ModelCreatePayload,
  ModelUpdatePayload,
  CredentialCreatePayload,
  CredentialUpdatePayload,
  StageRouteUpsertPayload,
} from "~/lib/llm-types";

// ==================== Providers ====================

export async function getProviders(): Promise<LLMProvider[]> {
  try {
    const res = await axios.get<ApiResponse<LLMProvider[]>>(`${API_BASE}/llm/providers`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    return res.data.data || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function createProvider(payload: ProviderCreatePayload): Promise<LLMProvider> {
  try {
    const res = await axios.post<ApiResponse<LLMProvider>>(`${API_BASE}/llm/providers`, payload);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "创建失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "创建失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function updateProvider(providerId: string, payload: ProviderUpdatePayload): Promise<LLMProvider> {
  try {
    const res = await axios.patch<ApiResponse<LLMProvider>>(`${API_BASE}/llm/providers/${providerId}`, payload);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "更新失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "更新失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function deleteProvider(providerId: string): Promise<void> {
  try {
    const res = await axios.delete<ApiResponse<null>>(`${API_BASE}/llm/providers/${providerId}`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "删除失败");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "删除失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

// ==================== Models ====================

export async function getModels(providerId?: string): Promise<LLMModel[]> {
  try {
    const params = providerId ? { provider_id: providerId } : {};
    const res = await axios.get<ApiResponse<LLMModel[]>>(`${API_BASE}/llm/models`, { params });
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    return res.data.data || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function createModel(payload: ModelCreatePayload): Promise<LLMModel> {
  try {
    const res = await axios.post<ApiResponse<LLMModel>>(`${API_BASE}/llm/models`, payload);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "创建失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "创建失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function updateModel(modelId: string, payload: ModelUpdatePayload): Promise<LLMModel> {
  try {
    const res = await axios.patch<ApiResponse<LLMModel>>(`${API_BASE}/llm/models/${modelId}`, payload);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "更新失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "更新失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function deleteModel(modelId: string): Promise<void> {
  try {
    const res = await axios.delete<ApiResponse<null>>(`${API_BASE}/llm/models/${modelId}`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "删除失败");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "删除失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

// ==================== Credentials ====================

export async function getCredentials(providerId?: string): Promise<LLMCredential[]> {
  try {
    const params = providerId ? { provider_id: providerId } : {};
    const res = await axios.get<ApiResponse<LLMCredential[]>>(`${API_BASE}/llm/credentials`, { params });
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    return res.data.data || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function createCredential(payload: CredentialCreatePayload): Promise<LLMCredential> {
  try {
    const res = await axios.post<ApiResponse<LLMCredential>>(`${API_BASE}/llm/credentials`, payload);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "创建失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "创建失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function updateCredential(credentialId: string, payload: CredentialUpdatePayload): Promise<LLMCredential> {
  try {
    const res = await axios.patch<ApiResponse<LLMCredential>>(`${API_BASE}/llm/credentials/${credentialId}`, payload);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "更新失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "更新失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function deleteCredential(credentialId: string): Promise<void> {
  try {
    const res = await axios.delete<ApiResponse<null>>(`${API_BASE}/llm/credentials/${credentialId}`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "删除失败");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "删除失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

// ==================== Stage Routes ====================

export async function getStageRoutes(): Promise<LLMStageRoute[]> {
  try {
    const res = await axios.get<ApiResponse<LLMStageRoute[]>>(`${API_BASE}/llm/routes`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    return res.data.data || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function upsertStageRoute(stage: string, payload: StageRouteUpsertPayload): Promise<LLMStageRoute> {
  try {
    const res = await axios.put<ApiResponse<LLMStageRoute>>(`${API_BASE}/llm/routes/${stage}`, payload);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "保存失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "保存失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}

export async function deleteStageRoute(stage: string): Promise<void> {
  try {
    const res = await axios.delete<ApiResponse<null>>(`${API_BASE}/llm/routes/${stage}`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "删除失败");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "删除失败";
      throw new Error(errorMessage);
    }
    throw error;
  }
}
