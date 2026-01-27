import { client } from "~/lib/client";
import type { components } from "~/types/api";

type RegisterParams = components["schemas"]["RegisterParams"];
type LoginParams = components["schemas"]["LoginParams"];
type UpdateUserRequest = components["schemas"]["UpdateUserRequest"];
type ChangePasswordRequest = components["schemas"]["ChangePasswordRequest"];
type BindAccountRequest = components["schemas"]["BindAccountRequest"];
type UserInfo = components["schemas"]["UserInfo"];


type ApiResponse<T> = {
  code: number;
  data: T | null;
  msg: string;
};

/**
 * 用户注册
 */
export async function register(params: RegisterParams): Promise<void> {
  const { data, error, response } = await client.POST("/auth/register", {
    body: params,
  });

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "注册失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "注册失败");
    }
    throw new Error(errorMessage as string);
  }

  if (data && data.code !== 0) {
    throw new Error(data.msg || "注册失败");
  }
}

/**
 * 用户登录
 * token 通过 cookie 返回
 */
export async function login(params: LoginParams): Promise<UserInfo> {
  const { data, error, response } = await client.POST("/auth/login", {
    body: params,
  });

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "登录失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "登录失败");
    }
    throw new Error(errorMessage as string);
  }

  if (!data || data.code !== 0) {
    throw new Error(data?.msg || "登录失败");
  }

  if (!data.data) {
    throw new Error("用户信息为空");
  }

  return data.data;
}

/**
 * 刷新访问令牌
 * 从 cookie 读取 refresh_token，新的 access_token 通过 cookie 返回
 */
export async function refresh(): Promise<void> {
  const { data, error, response } = await client.POST("/auth/refresh");

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "刷新令牌失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "刷新令牌失败");
    }
    throw new Error(errorMessage as string);
  }

  if (data && data.code !== 0) {
    throw new Error(data.msg || "刷新令牌失败");
  }
}

/**
 * 用户登出
 * 从 cookie 读取 refresh_token，并清除所有认证 cookie
 */
export async function logout(): Promise<void> {
  const { data, error, response } = await client.POST("/auth/logout");

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "登出失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "登出失败");
    }
    throw new Error(errorMessage as string);
  }

  if (data && data.code !== 0) {
    throw new Error(data.msg || "登出失败");
  }
}

/**
 * 获取当前用户信息
 */
export async function getCurrentUser(): Promise<UserInfo> {
  const { data, error, response } = await client.GET("/auth/me");

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "获取用户信息失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "获取用户信息失败");
    }
    throw new Error(errorMessage as string);
  }

  if (!data || data.code !== 0) {
    throw new Error(data?.msg || "获取用户信息失败");
  }

  if (!data.data) {
    throw new Error("用户信息为空");
  }

  return data.data;
}

/**
 * 更新用户信息
 */
export async function updateUser(params: UpdateUserRequest): Promise<UserInfo> {
  const { data, error, response } = await client.PUT("/auth/me", {
    body: params,
  });

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "更新用户信息失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "更新用户信息失败");
    }
    throw new Error(errorMessage as string);
  }

  if (!data || data.code !== 0) {
    throw new Error(data?.msg || "更新用户信息失败");
  }

  if (!data.data) {
    throw new Error("用户信息为空");
  }

  return data.data;
}

/**
 * 修改密码
 */
export async function changePassword(params: ChangePasswordRequest): Promise<void> {
  const { data, error, response } = await client.PUT("/auth/password", {
    body: params,
  });

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "修改密码失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "修改密码失败");
    }
    throw new Error(errorMessage as string);
  }

  if (data && data.code !== 0) {
    throw new Error(data.msg || "修改密码失败");
  }
}

/**
 * 绑定新账户
 */
export async function bindAccount(params: BindAccountRequest): Promise<void> {
  const { data, error, response } = await client.POST("/auth/bind-account", {
    body: params,
  });

  if (error) {
    const errorMessage =
      (error as { detail?: string | Array<{ msg: string }> })?.detail ||
      "绑定账户失败";
    if (Array.isArray(errorMessage)) {
      throw new Error(errorMessage[0]?.msg || "绑定账户失败");
    }
    throw new Error(errorMessage as string);
  }

  if (data && data.code !== 0) {
    throw new Error(data.msg || "绑定账户失败");
  }
}
