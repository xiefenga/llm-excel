import { useNavigate, useParams } from "react-router";
import { Menu, X, Plus } from "lucide-react";

import { Logo } from "~/components/logo";
import { UserMenu } from "~/components/user-menu";
import { Button } from "~/components/ui/button";

interface Props {
  sidebarOpen: boolean;
  onSidebarOpenChange: (open: boolean) => void;
}

const AppHeader = ({ sidebarOpen, onSidebarOpenChange }: Props) => {
  const navigate = useNavigate();
  const params = useParams();

  // 判断是否在任务详情页
  const isInTask = !!params.id;

  const handleNewTask = () => {
    navigate("/threads");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-brand/20 bg-white/80 backdrop-blur-md shadow-sm">
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

        {/* Right: New Task Button & User Avatar & Menu */}
        <div className="flex items-center gap-3">
          {isInTask && (
            <Button
              onClick={handleNewTask}
              size="sm"
              className="bg-linear-to-r from-brand to-brand-teal hover:from-brand-dark hover:to-brand text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              新建任务
            </Button>
          )}
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export default AppHeader;