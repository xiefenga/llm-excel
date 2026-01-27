import { Menu, X, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router";

import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";

import { useAuthStore } from "~/stores/auth";

import { logout } from "~/api/auth";

interface Props {
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}

const AppHeader = ({ sidebarOpen, onSidebarOpenChange }: Props) => {
  const navigate = useNavigate();
  const { user, clearUser } = useAuthStore();

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
    <header className="sticky top-0 z-40 w-full border-b border-emerald-100/80 bg-white/80 backdrop-blur-md shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left: Logo and Menu */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onSidebarOpenChange(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="切换侧边栏"
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-gray-700" />
            ) : (
              <Menu className="w-5 h-5 text-gray-700" />
            )}
          </button>
          <div className="flex items-center gap-1">
            <Logo size={40} />
            <h1 className="text-2xl font-bold bg-linear-to-r from-emerald-700 via-teal-700 to-blue-700 bg-clip-text text-transparent">
              LLM Excel
            </h1>
          </div>
        </div>

        {/* Right: User Info and Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 text-sm text-gray-700">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-8 h-8 rounded-full ring-2 ring-emerald-100"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 flex items-center justify-center ring-2 ring-emerald-100">
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
              )}
              <span className="font-medium">{user.username}</span>
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={handleLogout}
            className="gap-1.5 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">登出</span>
          </Button>
        </div>
      </div>
    </header>
  )
}

export default AppHeader;