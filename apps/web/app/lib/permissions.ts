/**
 * 权限系统 - 前端
 */

export enum Permissions {
  // ==================== 会话管理 ====================
  THREAD_READ = "thread:read",
  THREAD_READ_ALL = "thread:read:all",
  THREAD_WRITE = "thread:write",
  THREAD_UPDATE = "thread:update",
  THREAD_DELETE = "thread:delete",
  THREAD_DELETE_ALL = "thread:delete:all",

  // ==================== 文件管理 ====================
  FILE_UPLOAD = "file:upload",
  FILE_READ = "file:read",
  FILE_READ_ALL = "file:read:all",
  FILE_DELETE = "file:delete",
  FILE_DOWNLOAD = "file:download",

  // ==================== Excel 处理 ====================
  EXCEL_PROCESS = "excel:process",
  EXCEL_PREVIEW = "excel:preview",
  EXCEL_DOWNLOAD = "excel:download",

  // ==================== 异常追踪 ====================
  BTRACK_READ = "btrack:read",
  BTRACK_READ_ALL = "btrack:read:all",
  BTRACK_EXPORT = "btrack:export",
  BTRACK_UPDATE = "btrack:update",

  // ==================== 用户管理 ====================
  USER_READ = "user:read",
  USER_CREATE = "user:create",
  USER_UPDATE = "user:update",
  USER_DELETE = "user:delete",
  USER_ASSIGN_ROLE = "user:assign_role",

  // ==================== 角色管理 ====================
  ROLE_READ = "role:read",
  ROLE_CREATE = "role:create",
  ROLE_UPDATE = "role:update",
  ROLE_DELETE = "role:delete",
  ROLE_ASSIGN_PERMISSION = "role:assign_permission",

  // ==================== 权限管理 ====================
  PERMISSION_READ = "permission:read",
  PERMISSION_MANAGE = "permission:manage",

  // ==================== 系统管理 ====================
  SYSTEM_SETTINGS = "system:settings",
  SYSTEM_LOGS = "system:logs",
  SYSTEM_ALL = "system:*",

  // ==================== 超级权限 ====================
  ALL = "*:*",
}
