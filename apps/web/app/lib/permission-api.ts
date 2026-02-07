/**
 * 角色和用户管理 API
 */

import axios from "axios";
import { API_BASE } from "~/lib/config";

export interface PermissionInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
}

export interface RoleInfo {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_system: boolean;
  permission_count: number;
}

export interface RoleDetail {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_system: boolean;
  permissions: PermissionInfo[];
}

export interface UserListItem {
  id: string;
  username: string;
  avatar: string | null;
  status: number;
  role_count: number;
  roles: RoleInfo[];
  created_at: string;
  last_login_at: string | null;
}

export interface UserListResponse {
  items: UserListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface UserRoleInfo {
  user_id: string;
  username: string;
  roles: RoleInfo[];
}

export interface ApiResponse<T> {
  code: number;
  data: T | null;
  msg: string;
}

// 获取角色列表
export async function getRoles(): Promise<RoleInfo[]> {
  try {
    const res = await axios.get<ApiResponse<RoleInfo[]>>(`${API_BASE}/roles`);
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

// 获取角色详情
export async function getRoleDetail(roleId: string): Promise<RoleDetail> {
  try {
    const res = await axios.get<ApiResponse<RoleDetail>>(`${API_BASE}/roles/${roleId}`);
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "获取失败");
    }
    if (!res.data.data) {
      throw new Error("角色不存在");
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

// 获取用户列表
export async function getUsers(params: {
  limit?: number;
  offset?: number;
} = {}): Promise<UserListResponse> {
  try {
    const res = await axios.get<ApiResponse<UserListResponse>>(`${API_BASE}/users`, {
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

// 获取用户角色
export async function getUserRoles(userId: string): Promise<UserRoleInfo> {
  try {
    const res = await axios.get<ApiResponse<UserRoleInfo>>(`${API_BASE}/roles/user/${userId}`);
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

// 分配角色
export async function assignRoles(userId: string, roleIds: string[]): Promise<void> {
  try {
    const res = await axios.post<ApiResponse<null>>(`${API_BASE}/roles/assign`, {
      user_id: userId,
      role_ids: roleIds,
    });
    if (res.data.code !== 0) {
      throw new Error(res.data.msg || "分配失败");
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.msg || error.response?.data?.detail || error.message || "分配失败";
      throw new Error(errorMessage);
    }
    throw new Error("分配失败");
  }
}

// 获取所有权限
export async function getAllPermissions(): Promise<PermissionInfo[]> {
  try {
    const res = await axios.get<ApiResponse<PermissionInfo[]>>(`${API_BASE}/roles/permissions/all`);
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
