import { create } from "zustand";
import { getThreads, deleteThread } from "~/lib/api";

import type { ThreadListItem } from "~/lib/api";

interface ThreadState {
  threads: ThreadListItem[];
  isLoading: boolean;
  error: Error | null;
  loadThreads: () => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  updateThread: (threadId: string, updates: Partial<ThreadListItem>) => void;
  addThread: (thread: ThreadListItem) => void;
  clearThreads: () => void;
}

export const useThreadStore = create<ThreadState>((set, get) => ({
  threads: [],
  isLoading: false,
  error: null,

  loadThreads: async () => {
    try {
      set({ isLoading: true, error: null });
      const data = await getThreads();
      set({ threads: data, isLoading: false });
    } catch (error) {
      console.error("加载线程列表失败:", error);
      set({
        error: error instanceof Error ? error : new Error("加载失败"),
        isLoading: false,
      });
    }
  },

  deleteThread: async (threadId: string) => {
    try {
      await deleteThread(threadId);
      set((state) => ({
        threads: state.threads.filter((t) => t.id !== threadId),
      }));
    } catch (error) {
      console.error("删除失败:", error);
      throw error;
    }
  },

  updateThread: (threadId: string, updates: Partial<ThreadListItem>) => {
    set((state) => ({
      threads: state.threads.map((t) =>
        t.id === threadId ? { ...t, ...updates } : t
      ),
    }));
  },

  addThread: (thread: ThreadListItem) => {
    set((state) => ({
      threads: [thread, ...state.threads],
    }));
  },

  clearThreads: () => {
    set({ threads: [], error: null });
  },
}));
