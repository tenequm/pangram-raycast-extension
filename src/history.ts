import { LocalStorage } from "@raycast/api";
import { createHash } from "node:crypto";
import { Detection } from "./pangram";

export const HISTORY_KEY = "detection-history";
const MAX_ENTRIES = 25;

export type HistoryEntry = {
  /** Hash of the analyzed text, so re-checking the same draft updates one entry instead of piling up. */
  id: string;
  checkedAt: number;
  source: string;
  wordCount: number;
  detection: Detection;
};

export const entryId = (text: string) => createHash("sha256").update(text).digest("hex").slice(0, 16);

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

export async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export async function rememberDetection(entry: Omit<HistoryEntry, "id" | "checkedAt">): Promise<void> {
  const id = entryId(entry.detection.text);
  const existing = await loadHistory();
  const withoutDuplicate = existing.filter((candidate) => candidate.id !== id);
  await saveHistory([{ ...entry, id, checkedAt: Date.now() }, ...withoutDuplicate]);
}
