import { create } from "zustand";
import type { VotexReport, ProvisioningRequest, ServerMetrics } from "../types";

export type ProvisioningStatus = "idle" | "testing" | "provisioning" | "success" | "error";

interface AppState {
  vpsConfig: ProvisioningRequest;
  status: ProvisioningStatus;
  progress: number;
  logs: string[];
  report: VotexReport | null;
  metrics: ServerMetrics | null;
  error: string | null;
  isConnected: boolean | null;
  
  // Actions
  setVpsConfig: (config: Partial<ProvisioningRequest>) => void;
  setStatus: (status: ProvisioningStatus) => void;
  setProgress: (progress: number) => void;
  appendLog: (log: string) => void;
  clearLogs: () => void;
  setReport: (report: VotexReport | null) => void;
  setMetrics: (metrics: ServerMetrics | null) => void;
  setError: (error: string | null) => void;
  setIsConnected: (connected: boolean | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  vpsConfig: {
    host: "",
    port: 22,
    username: "root",
    password: "",
  },
  status: "idle",
  progress: 0,
  logs: [],
  report: null,
  metrics: null,
  error: null,
  isConnected: null,

  setVpsConfig: (newConfig) =>
    set((state) => ({ vpsConfig: { ...state.vpsConfig, ...newConfig } })),
  setStatus: (status) => set({ status }),
  setProgress: (progress) => set({ progress }),
  appendLog: (log) =>
    set((state) => ({
      logs: [...state.logs, log],
    })),
  clearLogs: () => set({ logs: [], progress: 0, error: null }),
  setReport: (report) => set({ report }),
  setMetrics: (metrics) => set({ metrics }),
  setError: (error) => set({ error }),
  setIsConnected: (isConnected) => set({ isConnected }),
  reset: () =>
    set({
      status: "idle",
      progress: 0,
      logs: [],
      report: null,
      error: null,
      isConnected: null,
    }),
}));
