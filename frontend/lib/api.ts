/**
 * api.ts
 * ──────
 * Typed fetch wrapper for all DIE backend endpoints.
 * Handles errors, timeouts, and serialization.
 */

import {
  DecisionState,
  AuditReport,
  SensitivityReport,
  SmartPasteRequest,
  SmartPasteResponse,
  ScoreRequest,
  ScoreResponse,
  AuditRequest,
  SensitivityRequest,
  ApiResponse,
} from "./types";
import { API_BASE_URL, API_TIMEOUT_MS } from "./constants";

// ─── Helper: fetch with timeout ────────────────────────────────────────────

async function fetchWithTimeout<T>(
  url: string,
  options?: RequestInit,
  timeoutMs: number = API_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      throw new Error(
        `HTTP ${response.status}: ${errorBody || response.statusText}`
      );
    }

    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Helper: structured error response ─────────────────────────────────────

function apiError(
  message: string,
  details?: unknown,
  statusCode?: number
): ApiResponse<never> {
  return {
    error: true,
    message,
    details,
    statusCode,
  } as any;
}

function apiSuccess<T>(data: T): ApiResponse<T> {
  return {
    error: false,
    data,
  };
}

// ─── Public API functions ─────────────────────────────────────────────────

/**
 * Extract products and criteria from unstructured text using LLM.
 */
export async function processSmartPaste(
  category: string,
  rawText: string,
  model?: string
): Promise<ApiResponse<DecisionState>> {
  try {
    const payload: SmartPasteRequest = {
      category,
      raw_text: rawText,
      ...(model && { model }),
    };

    const response = await fetchWithTimeout<SmartPasteResponse>(
      `${API_BASE_URL}/process-smart-paste`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      // Longer timeout for LLM inference (especially on CPU)
      model === "qwen2.5:7b" ? 180000 : 120000
    );

    return apiSuccess(response.decision_state);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(
      `Failed to extract products: ${message}`,
      err,
      500
    );
  }
}

/**
 * Score products using weighted sum or TOPSIS.
 */
export async function scoreDecision(
  state: DecisionState,
  method: "weighted_sum" | "topsis" = "weighted_sum"
): Promise<ApiResponse<DecisionState>> {
  try {
    const payload: ScoreRequest = {
      decision_state: state,
      method,
    };

    const response = await fetchWithTimeout<ScoreResponse>(
      `${API_BASE_URL}/score`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    return apiSuccess(response.decision_state);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(`Failed to score products: ${message}`, err, 500);
  }
}

/**
 * Run bias audit on a scored DecisionState.
 */
export async function auditDecision(
  state: DecisionState,
  model?: string
): Promise<ApiResponse<AuditReport>> {
  try {
    const payload: AuditRequest = {
      decision_state: state,
      ...(model && { model }),
    };

    const response = await fetchWithTimeout<AuditReport>(
      `${API_BASE_URL}/audit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      model === "qwen2.5:7b" ? 120000 : 60000
    );

    return apiSuccess(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(`Audit failed: ${message}`, err, 500);
  }
}

/**
 * Sensitivity analysis: compute tipping points per criterion.
 */
export async function sensitivityAnalysis(
  state: DecisionState
): Promise<ApiResponse<SensitivityReport>> {
  try {
    const payload: SensitivityRequest = {
      decision_state: state,
    };

    const response = await fetchWithTimeout<SensitivityReport>(
      `${API_BASE_URL}/sensitivity`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      // Sensitivity analysis is deterministic, should be fast
      30000
    );

    return apiSuccess(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return apiError(`Sensitivity analysis failed: ${message}`, err, 500);
  }
}

// ─── Convenience functions ────────────────────────────────────────────────

/**
 * Check if backend is reachable.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/docs`, {
      method: "HEAD",
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Format error message for display to user.
 */
export function formatApiError(response: ApiResponse<unknown>): string {
  if (response.error) {
    return response.message || "An unknown error occurred";
  }
  return "";
}
