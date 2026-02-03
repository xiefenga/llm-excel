import { HelpCircle, Settings, Languages, Moon } from "lucide-react";

import { Logo } from "~/components/logo";

import type { PropsWithChildren } from "react";



export function AuthLayout({ children }: PropsWithChildren) {
  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{
        background: 'linear-gradient(154deg, #07070915 30%, hsl(142, 60%, 50% / 30%) 48%, #07070915 64%)'
      }}
    >
      {/* Top Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between relative z-20">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <Logo size={40} />
          <h1 className="text-xl font-bold text-gray-900">LLM Excel</h1>
        </div>

        {/* Right Icons */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/50 rounded-lg transition-colors" title="帮助">
            <HelpCircle className="w-5 h-5 text-gray-700" />
          </button>
          <button className="p-2 hover:bg-white/50 rounded-lg transition-colors" title="设置">
            <Settings className="w-5 h-5 text-gray-700" />
          </button>
          <button className="p-2 hover:bg-white/50 rounded-lg transition-colors" title="语言">
            <Languages className="w-5 h-5 text-gray-700" />
          </button>
          <button className="p-2 hover:bg-white/50 rounded-lg transition-colors" title="主题">
            <Moon className="w-5 h-5 text-gray-700" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-muted/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-teal/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="w-full max-w-md relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
