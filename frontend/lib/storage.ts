/**
 * storage.ts
 * ──────────
 * localStorage operations for DecisionState persistence.
 * Handles serialization, deserialization, and session management.
 */

import { DecisionState } from "./types";

const STORAGE_PREFIX = "die_";
const SESSIONS_LIST_KEY = `${STORAGE_PREFIX}sessions_list`;
const SESSION_KEY_TEMPLATE = (id: string) => `${STORAGE_PREFIX}session_${id}`;

export interface SessionMetadata {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  productCount: number;
  criteriaCount: number;
}

/**
 * Generate a new UUID for a session.
 */
export function generateSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

/**
 * Save a DecisionState to localStorage.
 * Updates the sessions list metadata.
 */
export function saveSession(state: DecisionState): void {
  if (typeof window === "undefined") return; // SSR guard

  try {
    const key = SESSION_KEY_TEMPLATE(state.session_id);
    localStorage.setItem(key, JSON.stringify(state));

    // Update sessions list
    const metadata: SessionMetadata = {
      id: state.session_id,
      title: state.title,
      createdAt: state.created_at,
      updatedAt: state.updated_at,
      productCount: state.products.length,
      criteriaCount: state.criteria.length,
    };

    const list = loadSessionsList();
    const existingIdx = list.findIndex((s) => s.id === state.session_id);

    if (existingIdx >= 0) {
      list[existingIdx] = metadata;
    } else {
      list.unshift(metadata);
    }

    localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save session:", err);
  }
}

/**
 * Load a DecisionState from localStorage.
 */
export function loadSession(sessionId: string): DecisionState | null {
  if (typeof window === "undefined") return null; // SSR guard

  try {
    const key = SESSION_KEY_TEMPLATE(sessionId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Failed to load session:", err);
    return null;
  }
}

/**
 * List all saved sessions (metadata only, not full state).
 */
export function loadSessionsList(): SessionMetadata[] {
  if (typeof window === "undefined") return [];

  try {
    const data = localStorage.getItem(SESSIONS_LIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.error("Failed to load sessions list:", err);
    return [];
  }
}

/**
 * Delete a session from localStorage.
 */
export function deleteSession(sessionId: string): void {
  if (typeof window === "undefined") return; // SSR guard

  try {
    const key = SESSION_KEY_TEMPLATE(sessionId);
    localStorage.removeItem(key);

    // Update sessions list
    const list = loadSessionsList();
    const filtered = list.filter((s) => s.id !== sessionId);
    localStorage.setItem(SESSIONS_LIST_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to delete session:", err);
  }
}

/**
 * Clear all sessions (dangerous, use with caution).
 */
export function clearAllSessions(): void {
  if (typeof window === "undefined") return;

  try {
    const list = loadSessionsList();
    list.forEach((s) => {
      const key = SESSION_KEY_TEMPLATE(s.id);
      localStorage.removeItem(key);
    });
    localStorage.removeItem(SESSIONS_LIST_KEY);
  } catch (err) {
    console.error("Failed to clear all sessions:", err);
  }
}

/**
 * Export a session as JSON for download.
 */
export function exportSessionAsJson(state: DecisionState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Export a session as CSV (products × criteria matrix).
 */
export function exportSessionAsCsv(state: DecisionState): string {
  const headers = ["Product", ...state.criteria.map((c) => c.name)];

  const rows = state.products.map((p) => {
    const values = state.criteria.map((c) => {
      const hv = p.features[c.id];
      return hv?.raw_value || hv?.numeric_value?.toString() || "N/A";
    });
    return [p.name, ...values];
  });

  // Also append scores if available
  if (state.scores) {
    rows.forEach((row) => {
      const productId = state.products.find((p) => p.name === row[0])?.id;
      const score = productId ? state.scores![productId] : null;
      if (score !== null && score !== undefined) {
        row.push(score.toFixed(6));
      }
    });
    headers.push("Final Score");
  }

  // CSV formatting
  const csvHeaders = headers.map((h) => `"${h}"`).join(",");
  const csvRows = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  return `${csvHeaders}\n${csvRows}`;
}

/**
 * Download a file (JSON or CSV).
 */
export function downloadFile(content: string, filename: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Get storage size in bytes (approximate).
 */
export function getStorageSize(): number {
  if (typeof window === "undefined") return 0;

  let size = 0;
  try {
    const list = loadSessionsList();
    for (const session of list) {
      const key = SESSION_KEY_TEMPLATE(session.id);
      const data = localStorage.getItem(key);
      if (data) {
        size += data.length;
      }
    }
  } catch {
    return 0;
  }
  return size;
}
