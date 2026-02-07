"""权限系统常量定义"""


class Permissions:
    """权限常量定义"""

    # ==================== 会话管理 ====================
    THREAD_READ = "thread:read"
    THREAD_READ_ALL = "thread:read:all"
    THREAD_WRITE = "thread:write"
    THREAD_UPDATE = "thread:update"
    THREAD_DELETE = "thread:delete"
    THREAD_DELETE_ALL = "thread:delete:all"

    # ==================== 文件管理 ====================
    FILE_UPLOAD = "file:upload"
    FILE_READ = "file:read"
    FILE_READ_ALL = "file:read:all"
    FILE_DELETE = "file:delete"
    FILE_DOWNLOAD = "file:download"

    # ==================== Excel 处理 ====================
    EXCEL_PROCESS = "excel:process"
    EXCEL_PREVIEW = "excel:preview"
    EXCEL_DOWNLOAD = "excel:download"

    # ==================== 异常追踪 ====================
    BTRACK_READ = "btrack:read"
    BTRACK_READ_ALL = "btrack:read:all"
    BTRACK_EXPORT = "btrack:export"
    BTRACK_UPDATE = "btrack:update"

    # ==================== 用户管理 ====================
    USER_READ = "user:read"
    USER_CREATE = "user:create"
    USER_UPDATE = "user:update"
    USER_DELETE = "user:delete"
    USER_ASSIGN_ROLE = "user:assign_role"

    # ==================== 角色管理 ====================
    ROLE_READ = "role:read"
    ROLE_CREATE = "role:create"
    ROLE_UPDATE = "role:update"
    ROLE_DELETE = "role:delete"
    ROLE_ASSIGN_PERMISSION = "role:assign_permission"

    # ==================== 权限管理 ====================
    PERMISSION_READ = "permission:read"
    PERMISSION_MANAGE = "permission:manage"

    # ==================== 系统管理 ====================
    SYSTEM_SETTINGS = "system:settings"
    SYSTEM_LOGS = "system:logs"
    SYSTEM_ALL = "system:*"

    # ==================== 超级权限 ====================
    ALL = "*:*"


# 角色预置权限配置
ROLE_PERMISSIONS = {
    "admin": [
        Permissions.ALL,  # 管理员拥有所有权限
    ],
    "user": [
        # 会话
        Permissions.THREAD_READ,
        Permissions.THREAD_WRITE,
        Permissions.THREAD_UPDATE,
        Permissions.THREAD_DELETE,
        # 文件
        Permissions.FILE_UPLOAD,
        Permissions.FILE_READ,
        Permissions.FILE_DELETE,
        Permissions.FILE_DOWNLOAD,
        # Excel 处理
        Permissions.EXCEL_PROCESS,
        Permissions.EXCEL_PREVIEW,
        Permissions.EXCEL_DOWNLOAD,
        # 异常追踪（仅自己的）
        Permissions.BTRACK_READ,
    ],
    "guest": [
        # 会话（只读）
        Permissions.THREAD_READ,
        # Excel 处理（只读）
        Permissions.EXCEL_PREVIEW,
    ],
    "operator": [
        # 会话（所有）
        Permissions.THREAD_READ,
        Permissions.THREAD_READ_ALL,
        Permissions.THREAD_WRITE,
        Permissions.THREAD_UPDATE,
        # 文件（所有）
        Permissions.FILE_UPLOAD,
        Permissions.FILE_READ,
        Permissions.FILE_READ_ALL,
        Permissions.FILE_DOWNLOAD,
        # Excel 处理
        Permissions.EXCEL_PROCESS,
        Permissions.EXCEL_PREVIEW,
        Permissions.EXCEL_DOWNLOAD,
        # 异常追踪（所有）
        Permissions.BTRACK_READ,
        Permissions.BTRACK_READ_ALL,
        Permissions.BTRACK_EXPORT,
        Permissions.BTRACK_UPDATE,
        # 系统日志
        Permissions.SYSTEM_LOGS,
    ],
}


# 权限描述映射（用于初始化数据库）
PERMISSION_DESCRIPTIONS = {
    # 会话管理
    Permissions.THREAD_READ: "查看自己的会话",
    Permissions.THREAD_READ_ALL: "查看所有用户的会话",
    Permissions.THREAD_WRITE: "创建新会话",
    Permissions.THREAD_UPDATE: "编辑自己的会话",
    Permissions.THREAD_DELETE: "删除自己的会话",
    Permissions.THREAD_DELETE_ALL: "删除任意用户的会话",
    # 文件管理
    Permissions.FILE_UPLOAD: "上传 Excel 文件",
    Permissions.FILE_READ: "查看自己上传的文件",
    Permissions.FILE_READ_ALL: "查看所有用户的文件",
    Permissions.FILE_DELETE: "删除自己的文件",
    Permissions.FILE_DOWNLOAD: "下载文件（包含处理结果）",
    # Excel 处理
    Permissions.EXCEL_PROCESS: "使用 Excel 处理功能",
    Permissions.EXCEL_PREVIEW: "预览处理结果",
    Permissions.EXCEL_DOWNLOAD: "下载处理后的文件",
    # 异常追踪
    Permissions.BTRACK_READ: "查看自己的异常记录",
    Permissions.BTRACK_READ_ALL: "查看所有用户的异常记录",
    Permissions.BTRACK_EXPORT: "导出所有异常记录为 JSON",
    Permissions.BTRACK_UPDATE: "更新异常状态（标记已修复）",
    # 用户管理
    Permissions.USER_READ: "查看用户列表和详情",
    Permissions.USER_CREATE: "创建新用户",
    Permissions.USER_UPDATE: "编辑用户信息",
    Permissions.USER_DELETE: "删除用户",
    Permissions.USER_ASSIGN_ROLE: "为用户分配角色",
    # 角色管理
    Permissions.ROLE_READ: "查看角色列表和详情",
    Permissions.ROLE_CREATE: "创建自定义角色",
    Permissions.ROLE_UPDATE: "编辑角色信息",
    Permissions.ROLE_DELETE: "删除自定义角色（系统角色不可删除）",
    Permissions.ROLE_ASSIGN_PERMISSION: "为角色分配权限",
    # 权限管理
    Permissions.PERMISSION_READ: "查看权限列表和详情",
    Permissions.PERMISSION_MANAGE: "管理权限（创建、编辑、删除）",
    # 系统管理
    Permissions.SYSTEM_SETTINGS: "修改系统配置",
    Permissions.SYSTEM_LOGS: "查看系统日志",
    Permissions.SYSTEM_ALL: "所有系统管理权限",
    # 超级权限
    Permissions.ALL: "所有权限（超级管理员）",
}
