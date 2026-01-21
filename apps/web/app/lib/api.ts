import axios from "axios";
import { events } from "fetch-event-stream";

import { API_BASE } from "~/lib/config";

import type { AxiosProgressEvent } from 'axios'


export interface UploadItem {
  id: string;
  path: string;
  table: string;
  schema: Record<string, string>;
}

export type UploadResponse = UploadItem[];

export interface ApiResponse<T> {
  code: number;
  data: T | null;
  msg: string;
}

export interface SSEMessage {
  action: "load" | "analysis" | "generate" | "execute";
  status: "start" | "done" | "error";
  data?: {
    schemas?: Record<string, Record<string, string>>;
    content?: string | Record<string, unknown>;
    message?: string;
    output_file?: string;
    formulas?: string;
  };
}

export async function uploadFiles(files: File[], onProgress?: (progress: number) => void): Promise<UploadResponse> {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  try {
    const res = await axios.post<ApiResponse<UploadResponse>>(`${API_BASE}/excel/upload`, formData, {
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

interface ProcessExcelOptions {
  body: {
    query: string;
    file_ids: string[];
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

