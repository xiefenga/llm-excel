import { Plus } from "lucide-react";

import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";

interface Props {
  onNewChat: () => void;
}



const AppHeader = ({ onNewChat }: Props) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-100 bg-linear-to-r from-emerald-50 via-white to-blue-50 backdrop-blur-sm">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo 和标题 */}
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <h1 className="text-xl font-bold bg-linear-to-r from-emerald-700 to-blue-700 bg-clip-text text-transparent">
            LLM Excel
          </h1>
        </div>

        {/* 新对话按钮 */}
        <Button
          size="sm"
          variant="outline"
          onClick={onNewChat}
          className="gap-1.5 border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300"
        >
          <Plus className="h-4 w-4" />
          新对话
        </Button>
      </div>
    </header>
  )
}

export default AppHeader;