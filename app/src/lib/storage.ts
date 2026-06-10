import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Offline cache (PRD Appendix B): the current plan, profile, completions, and
 * recent chat are persisted locally so the app opens from the yard with no
 * connectivity. AsyncStorage maps to localStorage on web.
 */

const PREFIX = "lawnmind:";

export async function loadJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Cache write failures are non-fatal by design.
  }
}

export async function removeKey(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export const StorageKeys = {
  profile: "profile",
  plan: "plan",
  completedTasks: "completedTasks",
  chatHistory: "chatHistory",
  treatmentHistory: "treatmentHistory",
} as const;
