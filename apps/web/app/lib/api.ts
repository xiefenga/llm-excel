import axios from "axios";
import { events } from "fetch-event-stream";

import { API_BASE } from "~/lib/config";

import type { AxiosProgressEvent } from 'axios'


export interface UploadItem {
  id: string;
  path: string;
  filename: string;
  content_type: string | null
}

export type UploadResponse = UploadItem[];

export interface ApiResponse<T> {
  code: number;
  data: T | null;
  msg: string;
}

export interface BTrackItem {
  id: string;
  reporter_id: string;
  reporter_name: string;
  created_at: string;
  steps: Array<Record<string, unknown>>;
  generation_prompt: string;
  errors: string[];
  thread_turn_id: string;
  cause: string | null;
  fixed: boolean;
}

export interface BTrackListResponse {
  items: BTrackItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface SSEMessage {
  action: "load" | "analysis" | "generate" | "execute";
  status: "start" | "done" | "error";
  data?: {
    schemas?: Record<string, Record<string, string>>;
    content?: string | Record<string, unknown>;
    message?: string;
    output_file?: string;
    strategy?: string;
    manual_steps?: string;
    turn_id?: string;
    thread_id?: string;
  };
}

// ============ Fixture 相关类型 ============

export interface FixtureGroup {
  id: string;
  name: string;
  description: string;
  scenario_count: number;
}

export interface FixtureScenarioSummary {
  id: string;
  name: string;
  group: string;
  tags: string[];
  case_count: number;
}

export interface FixtureListResponse {
  groups: FixtureGroup[];
  scenarios: FixtureScenarioSummary[];
}

export interface FixtureDataset {
  file: string;
  description: string;
}

export interface FixtureCaseSummary {
  id: string;
  name: string;
  prompt: string;
  tags: string[];
}

export interface FixtureScenarioDetail {
  id: string;
  name: string;
  description: string;
  group: string;
  tags: string[];
  datasets: FixtureDataset[];
  cases: FixtureCaseSummary[];
}

// Fixture SSE 事件类型
export interface FixtureSSEMeta {
  scenario_id: string;
  case_id: string;
  case_name: string;
  prompt: string;
}

export interface FixtureSSEStep {
  step: string;
  stage_id?: string;  // 阶段实例唯一标识（重试时每次生成新 id）
  status: "running" | "streaming" | "done" | "error";
  delta?: string;
  output?: unknown;
  error?: string;
}

export interface FixtureSSEComplete {
  success: boolean;
  errors?: string[];
  output_file?: string;
}

export interface FixtureSSEError {
  message: string;
}

// 获取 Fixture 列表
export async function getFixtureList(): Promise<FixtureListResponse> {
  try {
    const res = await axios.get<FixtureListResponse>(`${API_BASE}/fixture/list`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw new Error("获取失败");
  }
}

// 获取场景详情
export async function getFixtureScenario(scenarioId: string): Promise<FixtureScenarioDetail> {
  try {
    const res = await axios.get<FixtureScenarioDetail>(`${API_BASE}/fixture/scenario/${scenarioId}`);
    return res.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw new Error("获取失败");
  }
}

// 运行 Fixture 测试用例 (SSE)
interface RunFixtureOptions {
  scenarioId: string;
  caseId: string;
  streamLlm?: boolean;
  events: {
    onMeta?: (data: FixtureSSEMeta) => void;
    onStep?: (data: FixtureSSEStep) => void;
    onComplete?: (data: FixtureSSEComplete) => void;
    onError?: (data: FixtureSSEError) => void;
    onFinally?: () => void;
  };
}

interface RunFixturePromise extends Promise<void> {
  abort: () => void;
}

export const runFixtureCase = ({ scenarioId, caseId, streamLlm = true, events: { onMeta, onStep, onComplete, onError, onFinally } }: RunFixtureOptions): RunFixturePromise => {
  const controller = new AbortController();

  const trigger = async () => {
    try {
      const url = new URL(`${window.location.origin}${API_BASE}/fixture/run/${scenarioId}/${caseId}`);
      url.searchParams.set("stream_llm", String(streamLlm));

      const res = await fetch(url.toString(), {
        method: "POST",
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("请求失败");
      }

      for await (const event of events(res, controller.signal)) {
        if (!event.data) continue;

        try {
          const data = JSON.parse(event.data);

          // 根据 event.event 分发不同的处理器
          switch (event.event) {
            case "meta":
              onMeta?.(data as FixtureSSEMeta);
              break;
            case "complete":
              onComplete?.(data as FixtureSSEComplete);
              break;
            case "error":
              onError?.(data as FixtureSSEError);
              break;
            default:
              // 默认是步骤事件
              onStep?.(data as FixtureSSEStep);
              break;
          }
        } catch {
          // ignore parse errors
        }
      }
    } catch (err) {
      const error = err as Error;
      if (error.name !== "AbortError") {
        onError?.({ message: error.message });
      }
    } finally {
      onFinally?.();
    }
  };

  const process: RunFixturePromise = trigger() as RunFixturePromise;
  process.abort = () => controller.abort();
  return process;
};

export async function uploadFiles(files: File[], onProgress?: (progress: number) => void): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    const res = await axios.post<ApiResponse<UploadResponse>>(`${API_BASE}/file/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent: AxiosProgressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    const response = res.data;
    if (response.code !== 0) {
      throw new Error(response.msg || "上传失败");
    }

    if (!response.data) {
      throw new Error("响应数据为空");
    }

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      // 尝试从统一响应格式中提取错误信息
      const responseData = error.response?.data;
      if (responseData && typeof responseData === 'object' && 'msg' in responseData) {
        throw new Error(responseData.msg as string);
      }
      // 兼容旧的错误格式
      const errorMessage = error.response?.data?.detail || error.response?.data?.msg || error.message || "上传失败";
      throw new Error(errorMessage);
    }
    throw new Error("上传失败");
  }
}

// 线程相关类型
export interface ThreadListItem {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  turn_count: number;
}

/** 步骤记录（与 STEPS_STORAGE_SPEC 对齐） */
export interface ThreadTurnStep {
  step: string;
  status: string;
  output?: Record<string, unknown>;
  error?: { code: string; message: string };
  started_at?: string;
  completed_at?: string;
}

export interface ThreadTurn {
  id: string;
  turn_number: number;
  user_query: string;
  status: string;
  /** 步骤数组（核心数据） */
  steps: ThreadTurnStep[];
  created_at: string;
  completed_at?: string | null;
  file_ids?: string[];
  files?: { id: string; filename: string; path: string }[];
}

export interface ThreadDetail {
  id: string;
  title: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  turns: ThreadTurn[];
}

// 获取 BTrack 列表
export async function getBTracks(params: {
  limit?: number;
  offset?: number;
  fixed?: boolean;
} = {}): Promise<BTrackListResponse> {
  try {
    const res = await axios.get<ApiResponse<BTrackListResponse>>(`${API_BASE}/btracks`, {
      params,
    });
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    if (!res.data.data) {
      throw new Error("响应数据为空");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw new Error("获取失败");
  }
}

// 导出 BTrack 数据
export async function exportBTracks(params: {
  fixed?: boolean;
} = {}): Promise<void> {
  try {
    const res = await axios.get(`${API_BASE}/btracks/export`, {
      params,
      responseType: 'blob',
    });

    // 创建下载链接
    const blob = new Blob([res.data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // 从响应头获取文件名，如果没有则使用默认名称
    const contentDisposition = res.headers['content-disposition'];
    let filename = `btracks_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "导出失败";
      throw new Error(errorMessage);
    }
    throw new Error("导出失败");
  }
}

// ============ 认证相关 ============

export interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
  status: number;
  accounts: {
    email: string;
  };
  roles: string[];
  permissions: string[];
  created_at: string;
  last_login_at: string | null;
}

// 获取当前用户信息
export async function getUserInfo(): Promise<UserInfo> {
  try {
    const res = await axios.get<ApiResponse<UserInfo>>(`${API_BASE}/auth/me`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取用户信息失败");
    }
    if (!res.data.data) {
      throw new Error("用户信息不存在");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取用户信息失败";
      throw new Error(errorMessage);
    }
    throw new Error("获取用户信息失败");
  }
}

// ============ 线程管理 ============

// 获取线程列表
export async function getThreads(): Promise<ThreadListItem[]> {
  try {
    const res = await axios.get<ApiResponse<ThreadListItem[]>>(`${API_BASE}/threads`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    return res.data.data || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw new Error("获取失败");
  }
}

// 获取线程详情
export async function getThreadDetail(threadId: string): Promise<ThreadDetail> {
  try {
    const res = await axios.get<ApiResponse<ThreadDetail>>(`${API_BASE}/threads/${threadId}`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    if (!res.data.data) {
      throw new Error("线程不存在");
    }
    return res.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "获取失败";
      throw new Error(errorMessage);
    }
    throw new Error("获取失败");
  }
}

// 删除线程
export async function deleteThread(threadId: string): Promise<void> {
  try {
    const res = await axios.delete<ApiResponse<null>>(`${API_BASE}/threads/${threadId}`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "删除失败");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "删除失败";
      throw new Error(errorMessage);
    }
    throw new Error("删除失败");
  }
}

// 重命名线程
export async function renameThread(threadId: string, title: string): Promise<void> {
  try {
    const res = await axios.patch<ApiResponse<null>>(`${API_BASE}/threads/${threadId}`, { title });
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "重命名失败");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "重命名失败";
      throw new Error(errorMessage);
    }
    throw new Error("重命名失败");
  }
}

interface ProcessExcelOptions {
  body: {
    query: string;
    file_ids: string[];
    thread_id?: string;
  }
  events: {
    onStart?: () => void;
    onMessage?: (msg: SSEMessage) => void;
    onError?: (error: Error) => void;
    onSuccess?: () => void;
    onFinally?: () => void;
  }
}

interface ProcessPromise extends Promise<void> {
  abort: () => void;
}


export const processExcel = ({ body, events: { onStart, onMessage, onError, onSuccess, onFinally } }: ProcessExcelOptions) => {
  const controller = new AbortController();

  const trigger = async () => {
    try {
      const res = await fetch(`${API_BASE}/excel/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      onStart?.();

      if (!res.ok) {
        throw new Error("请求失败");
      }

      for await (const event of events(res, controller.signal)) {
        if (!event.data) {
          continue;
        }
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data as SSEMessage);
        } catch {
          // ignore parse errors
        }
      }
      onSuccess?.();
    } catch (err) {
      const error = err as Error;
      if (error.name !== "AbortError") {
        onError?.(error);
      }
    } finally {
      onFinally?.();
    }
  }

  const process: ProcessPromise = trigger() as ProcessPromise;

  process.abort = () => controller.abort();

  return process;
}

