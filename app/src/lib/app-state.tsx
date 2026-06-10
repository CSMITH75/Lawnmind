import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as api from "./api";
import { loadJSON, saveJSON, StorageKeys } from "./storage";
import type { ChatTurn, LawnProfile, WeeklyPlan } from "./types";

export interface TreatmentRecord {
  taskId: string;
  title: string;
  completedAt: string;
}

interface AppState {
  ready: boolean;
  profile: LawnProfile | null;
  plan: WeeklyPlan | null;
  planStale: boolean;
  completedTaskIds: string[];
  treatmentHistory: TreatmentRecord[];
  chatHistory: ChatTurn[];
  saveProfile: (profile: LawnProfile) => Promise<void>;
  refreshPlan: () => Promise<void>;
  completeTask: (taskId: string, title: string) => void;
  appendChat: (turns: ChatTurn[]) => void;
  resetAll: () => Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<LawnProfile | null>(null);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [planStale, setPlanStale] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);
  const [treatmentHistory, setTreatmentHistory] = useState<TreatmentRecord[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);

  // Hydrate from the offline cache, then refresh from the network.
  useEffect(() => {
    (async () => {
      const [p, pl, done, hist, chat] = await Promise.all([
        loadJSON<LawnProfile>(StorageKeys.profile),
        loadJSON<WeeklyPlan>(StorageKeys.plan),
        loadJSON<string[]>(StorageKeys.completedTasks),
        loadJSON<TreatmentRecord[]>(StorageKeys.treatmentHistory),
        loadJSON<ChatTurn[]>(StorageKeys.chatHistory),
      ]);
      if (p) setProfile(p);
      if (pl) setPlan(pl);
      if (done) setCompletedTaskIds(done);
      if (hist) setTreatmentHistory(hist);
      if (chat) setChatHistory(chat);
      setReady(true);
      if (p) {
        try {
          const fresh = await api.generatePlan(p);
          setPlan(fresh);
          setPlanStale(false);
          void saveJSON(StorageKeys.plan, fresh);
        } catch {
          setPlanStale(true); // offline: keep cached plan, show stale indicator
        }
      }
    })();
  }, []);

  const saveProfile = useCallback(async (next: LawnProfile) => {
    setProfile(next);
    void saveJSON(StorageKeys.profile, next);
    try {
      const fresh = await api.generatePlan(next);
      setPlan(fresh);
      setPlanStale(false);
      void saveJSON(StorageKeys.plan, fresh);
    } catch {
      setPlanStale(true);
    }
  }, []);

  const refreshPlan = useCallback(async () => {
    if (!profile) return;
    try {
      const fresh = await api.generatePlan(profile);
      setPlan(fresh);
      setPlanStale(false);
      void saveJSON(StorageKeys.plan, fresh);
    } catch {
      setPlanStale(true);
    }
  }, [profile]);

  const completeTask = useCallback((taskId: string, title: string) => {
    setCompletedTaskIds((prev) => {
      if (prev.includes(taskId)) return prev;
      const next = [...prev, taskId];
      void saveJSON(StorageKeys.completedTasks, next);
      return next;
    });
    setTreatmentHistory((prev) => {
      const next = [{ taskId, title, completedAt: new Date().toISOString() }, ...prev].slice(0, 200);
      void saveJSON(StorageKeys.treatmentHistory, next);
      return next;
    });
  }, []);

  const appendChat = useCallback((turns: ChatTurn[]) => {
    setChatHistory((prev) => {
      const next = [...prev, ...turns].slice(-40);
      void saveJSON(StorageKeys.chatHistory, next);
      return next;
    });
  }, []);

  const resetAll = useCallback(async () => {
    setProfile(null);
    setPlan(null);
    setCompletedTaskIds([]);
    setTreatmentHistory([]);
    setChatHistory([]);
    await Promise.all(
      Object.values(StorageKeys).map((k) => saveJSON(k, null)),
    );
  }, []);

  const value = useMemo(
    () => ({
      ready,
      profile,
      plan,
      planStale,
      completedTaskIds,
      treatmentHistory,
      chatHistory,
      saveProfile,
      refreshPlan,
      completeTask,
      appendChat,
      resetAll,
    }),
    [
      ready,
      profile,
      plan,
      planStale,
      completedTaskIds,
      treatmentHistory,
      chatHistory,
      saveProfile,
      refreshPlan,
      completeTask,
      appendChat,
      resetAll,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAppState must be used within AppStateProvider");
  return ctx;
}
