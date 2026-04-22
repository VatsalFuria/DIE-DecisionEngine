/**
 * types.ts
 * ────────
 * Single source of truth for TypeScript interfaces.
 * All types mirror the backend Python Pydantic models in decision.py, auditor.py, scoring.py
 */

// ─── Enumerations ──────────────────────────────────────────────────────────

export enum OptimizationDirection {
  MAXIMIZE = "maximize",
  MINIMIZE = "minimize",
}

export enum CriterionType {
  NUMERIC = "numeric",
  CATEGORICAL = "categorical",
  BOOLEAN = "boolean",
}

export enum SessionStatus {
  PENDING = "pending",
  HARMONIZING = "harmonizing",
  READY = "ready",
  SCORED = "scored",
  ERROR = "error",
}

// ─── Sub-models ────────────────────────────────────────────────────────────

export interface HarmonizedValue {
  raw_value: string;
  numeric_value: number | null;
  unit: string | null;
  conversion_note: string | null;
  confidence: number; // [0, 1]
}

// ─── Core domain models ────────────────────────────────────────────────────

export interface Criterion {
  id: string;
  name: string;
  description?: string | null;
  weight: number; // [0, 1]
  direction: OptimizationDirection;
  criterion_type: CriterionType;
  unit_hint?: string | null;
  ordinal_scale?: string[] | null;
}

export interface Product {
  id: string;
  name: string;
  source_url?: string | null;
  raw_features: Record<string, string>;
  features: Record<string, HarmonizedValue>;
  metadata?: Record<string, unknown>;
}

// ─── Top-level session model ──────────────────────────────────────────────

export interface DecisionState {
  session_id: string;
  title: string;
  criteria: Criterion[];
  products: Product[];

  // Output fields
  scores: Record<string, number> | null;
  rankings: string[] | null; // Product IDs sorted by score
  scoring_method: string | null;
  harmonization_log: string[];

  // Lifecycle
  status: SessionStatus;
  created_at: string; // ISO datetime
  updated_at: string;
}

// ─── Audit Report Types ────────────────────────────────────────────────────

export interface PreferenceContradiction {
  criterion_name: string;
  severity: "low" | "medium" | "high";
  observation: string;
  implication: string;
}

export interface TradeoffLine {
  criterion_name: string;
  direction: "gain" | "loss" | "neutral";
  delta_description: string;
  delta_pct: number;
}

export interface TradeoffSummary {
  chosen_product: string;
  headline: string;
  lines: TradeoffLine[];
  overall_verdict: string;
}

export interface StressTestQuestion {
  question: string;
  targets_bias: string;
  follow_up_hint: string;
}

export interface AuditReport {
  session_id: string;
  chosen_product: string;
  runner_up: string;
  contradictions: PreferenceContradiction[];
  contradiction_summary: string;
  tradeoff_summary: TradeoffSummary;
  stress_test_questions: StressTestQuestion[];
  audit_confidence: number; // [0, 1]
  auditor_notes: string[];
}

// ─── Sensitivity Analysis Types ────────────────────────────────────────────

export interface TippingPoint {
  criterion_id: string;
  criterion_name: string;
  current_weight: number;
  delta_to_swap: number | null;
  tipping_weight: number | null;
  percent_change: number | null;
  is_stable: boolean;
}

export interface SensitivityReport {
  session_id: string;
  scoring_method: string;
  rank1_product: string;
  rank2_product: string;
  tipping_points: TippingPoint[];
  stability_index: number; // [0, 1]
  most_fragile_criterion_id: string | null;
  most_fragile_delta: number | null;
}

// ─── API Request/Response Types ────────────────────────────────────────────

export interface SmartPasteRequest {
  category: string;
  raw_text: string;
  model?: string;
}

export interface SmartPasteResponse {
  decision_state: DecisionState;
  extraction_debug?: object;
}

export interface ScoreRequest {
  decision_state: DecisionState;
  method: "weighted_sum" | "topsis";
}

export interface ScoreResponse {
  decision_state: DecisionState;
  method_used: string;
}

export interface AuditRequest {
  decision_state: DecisionState;
  model?: string;
}

export interface SensitivityRequest {
  decision_state: DecisionState;
}

// ─── Frontend-only types ──────────────────────────────────────────────────

export type StepName =
  | "category"
  | "ingest"
  | "review"
  | "score"
  | "sensitivity"
  | "audit";

export interface IngestMode {
  type: "smart_paste" | "manual" | "csv_upload";
}

export interface WizardState {
  step: StepName;
  decisionState: DecisionState | null;
  isLoading: boolean;
  loadingMessage?: string;
  error: string | null;
}

export interface AuditUIState {
  report: AuditReport | null;
  isOpen: boolean;
  isLoading: boolean;
}

export interface SensitivityUIState {
  report: SensitivityReport | null;
  isOpen: boolean;
  isLoading: boolean;
}

// ─── API Error Response ────────────────────────────────────────────────────

export interface ApiError {
  error: true;
  message: string;
  details?: unknown;
  statusCode?: number;
}

export interface ApiSuccess<T> {
  error: false;
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ─── Type guards ──────────────────────────────────────────────────────────

export function isApiError<T>(res: ApiResponse<T>): res is ApiError {
  return res.error === true;
}

export function isApiSuccess<T>(res: ApiResponse<T>): res is ApiSuccess<T> {
  return res.error === false;
}
