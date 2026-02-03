import NiceModal from '@ebay/nice-modal-react';
import { useNavigate } from "react-router";
import { LogOut, MessageCircle, Settings, User } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { logout } from "~/api/auth";
import { useAuthStore } from "~/stores/auth";
import UserProfileDialog from "~/components/user-profile-dialog";

export const UserMenu = () => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      clearUser();
      navigate("/login");
    } catch (error) {
      console.error("登出失败:", error);
      clearUser();
      navigate("/login");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="打开账户菜单"
          className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand/20 bg-brand-muted shadow-sm transition-all duration-200 hover:border-brand/50 hover:shadow-[0_0_0_3px_rgba(16,185,129,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/70"
        >
          {/* 光晕效果 */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-full bg-brand/0 blur-md transition-colors duration-200 group-hover:bg-brand/30"
          />
          <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full ring-2 ring-brand/20 bg-brand-muted">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-4 w-4 text-brand-dark" />
            )}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-60 overflow-hidden rounded-xl border border-brand/10 bg-white/95 p-0 shadow-lg shadow-brand/5 backdrop-blur-md"
      >
        {/* 顶部用户信息 */}
        <div className="flex items-center gap-3 border-b border-brand/10 px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-900">
                {user.username}
              </span>
            </div>
            <p className="truncate text-xs text-gray-500">
              {user.accounts.email}
            </p>
          </div>
          <span className="rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-medium text-brand-dark">
            Beta
          </span>
        </div>

        {/* 主菜单 */}
        <div className="space-y-1.5 px-1.5 py-2 text-sm text-gray-700">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-brand-muted cursor-pointer"
            onClick={() => NiceModal.show(UserProfileDialog)}
          >
            <User className="h-4 w-4 text-brand" />
            <span>个人信息</span>
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-brand-muted cursor-pointer"
          >
            <Settings className="h-4 w-4 text-brand" />
            <span>设置</span>
          </button>



          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 hover:bg-brand-muted"
          >
            <MessageCircle className="h-4 w-4 text-brand" />
            <span>反馈</span>
          </button>


        </div>

        {/* 偏好设置 */}
        {/* <div className="border-y border-emerald-50 px-4 py-2.5">
          <p className="mb-2 text-sm font-medium text-gray-500">
            偏好设置
          </p>

          <div className="space-y-2 text-sm text-gray-700">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <SunMedium className="h-3.5 w-3.5 text-emerald-600" />
                <span>Theme</span>
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                System
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <Languages className="h-3.5 w-3.5 text-emerald-600" />
                <span>Language</span>
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                Auto
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5">
                <LayoutPanelLeft className="h-3.5 w-3.5 text-emerald-600" />
                <span>Chat Position</span>
              </span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                Left
              </span>
            </div>
          </div>
        </div> */}
        <div className="border-t p-1">
          {/* 登出 */}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center justify-between gap-2 p-2.5 rounded text-sm text-error hover:bg-error/10 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              <span>退出登录</span>
            </span>
          </button>
        </div>


      </PopoverContent>
    </Popover >
  );
};

