/**
 * 用户信息卡片组件
 * 用于在管理员界面展示用户的完整信息
 */

import { useState } from "react";
import { Mail, Calendar, Clock, Shield, ChevronDown, ChevronUp } from "lucide-react";
import dayjs from "dayjs";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import type { UserDetail } from "~/lib/api";
import type { RoleInfo } from "~/lib/permission-api";

export interface UserInfoCardProps {
  /** 用户详细信息 */
  user?: UserDetail;
  /** 是否显示加载状态 */
  isLoading?: boolean;
  /** 是否有角色分配权限 */
  canAssignRoles?: boolean;
  /** 所有可用角色（来自 getRoles） */
  availableRoles?: RoleInfo[];
  /** 当前选中的角色 ID 列表 */
  selectedRoleIds?: string[];
  /** 切换角色选中状态 */
  onToggleRole?: (roleId: string) => void;
  /** 保存角色分配 */
  onSaveRoles?: () => void;
  /** 是否正在保存 */
  isSaving?: boolean;
}

/** 用户状态映射 */
const STATUS_MAP = {
  0: { label: "正常", variant: "success" as const },
  1: { label: "禁用", variant: "destructive" as const },
  2: { label: "未激活", variant: "warning" as const },
};

/** 用户信息卡片组件 */
const UserInfoCard = ({
  user,
  isLoading = false,
  canAssignRoles = false,
  availableRoles = [],
  selectedRoleIds = [],
  onToggleRole,
  onSaveRoles,
  isSaving = false,
}: UserInfoCardProps) => {
  const [roleExpanded, setRoleExpanded] = useState(false);

  // 如果没有用户数据且不在加载中，不渲染任何内容
  if (!isLoading && !user) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">用户信息</CardTitle>
          <CardDescription>加载用户信息中...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-200"></div>
              <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                <div className="h-3 w-24 bg-slate-200 rounded"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusInfo = STATUS_MAP[user.status as keyof typeof STATUS_MAP] || { label: "未知", variant: "outline" as const };
  const formattedCreated = dayjs(user.created_at).format("YYYY-MM-DD HH:mm");
  const formattedLastLogin = user.last_login_at ? dayjs(user.last_login_at).format("YYYY-MM-DD HH:mm") : "从未登录";

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">用户信息</CardTitle>
        <CardDescription>用户的完整信息，包括邮箱、状态和注册时间</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar || "/storage/llm-excel/__SYS__/default_avatar.png"} />
            <AvatarFallback>{user.username?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-base truncate">{user.username}</h3>
              <Badge variant={statusInfo.variant} className="text-xs">
                {statusInfo.label}
              </Badge>
              {/* 角色标签 */}
              <div className="flex items-center gap-1 ml-1 relative">
                {user.roles.length > 0 ? (
                  user.roles.map((role) => (
                    <Badge key={role.id} variant="outline" className="text-xs">
                      {role.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">无角色</span>
                )}
                {/* 角色分配按钮 */}
                {canAssignRoles && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-5 px-1.5 text-xs gap-0.5"
                    onClick={() => setRoleExpanded(!roleExpanded)}
                  >
                    更改角色
                    {roleExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                )}
                {/* 角色分配下拉 - 绝对定位紧贴按钮 */}
                {roleExpanded && canAssignRoles && (
                  <div className="absolute top-full left-0 z-50 mt-1 w-[200px] rounded-lg border bg-popover shadow-lg p-2 space-y-1">
                    {availableRoles.map((role) => (
                      <div
                        key={role.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-accent"
                        onClick={() => {
                          onToggleRole?.(role.id);
                          onSaveRoles?.();
                        }}
                      >
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={() => {
                            onToggleRole?.(role.id);
                            onSaveRoles?.();
                          }}
                        />
                        <Label htmlFor={`role-${role.id}`} className="cursor-pointer flex-1 leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{role.name}</span>
                            {role.is_system && (
                              <span className="rounded bg-blue-100 px-1 py-0.5 text-xs text-blue-700">系统</span>
                            )}
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm text-muted-foreground truncate">{user.email || "未绑定邮箱"}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">用户ID</div>
              <div className="font-mono text-xs truncate" title={user.id}>{user.id}</div>
            </div>
          </div>

          {user.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">邮箱地址</div>
                <div className="truncate" title={user.email}>{user.email}</div>
              </div>
            </div>
          )}

          {/* 注册时间 */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">注册时间</div>
              <div>{formattedCreated}</div>
            </div>
          </div>

          {/* 最后登录时间 */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <div className="text-xs text-muted-foreground">最后登录</div>
              <div>{formattedLastLogin}</div>
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
};

export default UserInfoCard;
