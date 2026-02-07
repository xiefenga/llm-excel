import { useState } from "react";
import { useLocation } from "react-router";

import AppHeader from "~/components/app-header";
import ThreadSidebar from "~/components/thread-sidebar";

import type { PropsWithChildren } from "react";

export function AppLayout({ children }: PropsWithChildren) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // threads 或 threads/:id 才显示 sidebar
  const location = useLocation();
  const isThreadPage = location.pathname.startsWith("/threads");

  return (
    <div className="h-screen flex flex-col bg-linear-to-br from-slate-50 via-brand-muted/30 to-brand-teal/10">
      {/* Header */}
      <AppHeader sidebarOpen={sidebarOpen} onSidebarOpenChange={setSidebarOpen} />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - 弱化的历史任务列表 */}
        {isThreadPage && (
          <div className="hidden lg:block lg:w-64 shrink-0">
            <ThreadSidebar isOpen={true} />
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && isThreadPage && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/20 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="lg:hidden fixed inset-y-0 left-0 z-50">
              <ThreadSidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />
            </div>
          </>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
