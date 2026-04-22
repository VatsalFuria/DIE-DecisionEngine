/**
 * context/DecisionContext.tsx
 * ────────────────────────────
 * Global state for the entire DIE application.
 * Manages current session, wizard step, loading states, and audit/sensitivity reports.
 */

"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  DecisionState,
  AuditReport,
  SensitivityReport,
  SessionStatus,
} from "@/lib/types";
import { generateSessionId, saveSession, loadSession } from "@/lib/storage";

// ─── Context Type ─────────────────────────────────────────────────────────

export type StepName =
  | "category"
  | "ingest"
  | "review"
  | "score"
  | "sensitivity"
  | "audit";

export interface DecisionContextType {
  // ── Session ────────────────────────────────────────────────────────────
  sessionId: string;
  decisionState: DecisionState | null;
  setDecisionState: (state: DecisionState | null) => void;
  createNewSession: (title: string) => void;
  loadSessionFromStorage: (sessionId: string) => void;

  // ── Wizard Navigation ──────────────────────────────────────────────────
  currentStep: StepName;
  goToStep: (step: StepName) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // ── Loading & Errors ───────────────────────────────────────────────────
  isLoading: boolean;
  loadingMessage: string;
  setLoading: (isLoading: boolean, message?: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;

  // ── Audit ──────────────────────────────────────────────────────────────
  auditReport: AuditReport | null;
  isAuditOpen: boolean;
  openAudit: (report: AuditReport) => void;
  closeAudit: () => void;
  auditLoading: boolean;
  setAuditLoading: (loading: boolean) => void;

  // ── Sensitivity ────────────────────────────────────────────────────────
  sensitivityReport: SensitivityReport | null;
  isSensitivityOpen: boolean;
  openSensitivity: (report: SensitivityReport) => void;
  closeSensitivity: () => void;
  sensitivityLoading: boolean;
  setSensitivityLoading: (loading: boolean) => void;

  // ── Persistence ────────────────────────────────────────────────────────
  saveCurrentSession: () => void;
}

const DecisionContext = createContext<DecisionContextType | undefined>(undefined);

// ─── Provider Component ────────────────────────────────────────────────────

export function DecisionProvider({ children }: { children: React.ReactNode }) {
  // Session state
  const [sessionId, setSessionId] = useState<string>("");
  const [decisionState, setDecisionStateInternal] = useState<DecisionState | null>(null);

  // Wizard navigation
  const [currentStep, setCurrentStep] = useState<StepName>("category");

  // Loading & errors
  const [isLoading, setIsLoadingInternal] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setErrorInternal] = useState<string | null>(null);

  // Audit
  const [auditReport, setAuditReport] = useState<AuditReport | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);

  // Sensitivity
  const [sensitivityReport, setSensitivityReport] = useState<SensitivityReport | null>(null);
  const [isSensitivityOpen, setIsSensitivityOpen] = useState(false);
  const [sensitivityLoading, setSensitivityLoadingInternal] = useState(false);

  // ── Session Management ─────────────────────────────────────────────────

  const createNewSession = useCallback((title: string) => {
    const newSessionId = generateSessionId();
    const newState: DecisionState = {
      session_id: newSessionId,
      title,
      criteria: [],
      products: [],
      scores: null,
      rankings: null,
      scoring_method: null,
      harmonization_log: [],
      status: SessionStatus.PENDING,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setSessionId(newSessionId);
    setDecisionStateInternal(newState);
    setCurrentStep("ingest");
    setErrorInternal(null);
  }, []);

  const loadSessionFromStorage = useCallback((id: string) => {
    const loaded = loadSession(id);
    if (loaded) {
      setSessionId(id);
      setDecisionStateInternal(loaded);
      // Infer step from state
      if (loaded.scores) {
        setCurrentStep("score");
      } else if (loaded.products.length > 0 && loaded.criteria.length > 0) {
        setCurrentStep("review");
      } else {
        setCurrentStep("ingest");
      }
    }
  }, []);

  const setDecisionState = useCallback((state: DecisionState | null) => {
    setDecisionStateInternal(state);
  }, []);

  const saveCurrentSession = useCallback(() => {
    if (decisionState) {
      const updated: DecisionState = {
        ...decisionState,
        updated_at: new Date().toISOString(),
      };
      setDecisionStateInternal(updated);
      saveSession(updated);
    }
  }, [decisionState]);

  // ── Navigation ─────────────────────────────────────────────────────────

  const STEP_ORDER: StepName[] = ["category", "ingest", "review", "score"];

  const goToStep = useCallback((step: StepName) => {
    setCurrentStep(step);
  }, []);

  const goToNextStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex < STEP_ORDER.length - 1) {
      setCurrentStep(STEP_ORDER[currentIndex + 1]);
    }
  }, [currentStep]);

  const goToPreviousStep = useCallback(() => {
    const currentIndex = STEP_ORDER.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(STEP_ORDER[currentIndex - 1]);
    }
  }, [currentStep]);

  // ── Loading & Errors ───────────────────────────────────────────────────

  const setLoading = useCallback((isLoading: boolean, message: string = "") => {
    setIsLoadingInternal(isLoading);
    setLoadingMessage(message);
  }, []);

  const setError = useCallback((error: string | null) => {
    setErrorInternal(error);
  }, []);

  const clearError = useCallback(() => {
    setErrorInternal(null);
  }, []);

  // ── Audit ──────────────────────────────────────────────────────────────

  const openAudit = useCallback((report: AuditReport) => {
    setAuditReport(report);
    setIsAuditOpen(true);
  }, []);

  const closeAudit = useCallback(() => {
    setIsAuditOpen(false);
  }, []);

  // ── Sensitivity ────────────────────────────────────────────────────────

  const openSensitivity = useCallback((report: SensitivityReport) => {
    setSensitivityReport(report);
    setIsSensitivityOpen(true);
  }, []);

  const closeSensitivity = useCallback(() => {
    setIsSensitivityOpen(false);
  }, []);

  const setSensitivityLoading = useCallback((loading: boolean) => {
    setSensitivityLoadingInternal(loading);
  }, []);

  // ── Context Value ──────────────────────────────────────────────────────

  const value: DecisionContextType = {
    // Session
    sessionId,
    decisionState,
    setDecisionState,
    createNewSession,
    loadSessionFromStorage,

    // Wizard
    currentStep,
    goToStep,
    goToNextStep,
    goToPreviousStep,

    // Loading & errors
    isLoading,
    loadingMessage,
    setLoading,
    error,
    setError,
    clearError,

    // Audit
    auditReport,
    isAuditOpen,
    openAudit,
    closeAudit,
    auditLoading,
    setAuditLoading,

    // Sensitivity
    sensitivityReport,
    isSensitivityOpen,
    openSensitivity,
    closeSensitivity,
    sensitivityLoading,
    setSensitivityLoading,

    // Persistence
    saveCurrentSession,
  };

  return (
    <DecisionContext.Provider value={value}>
      {children}
    </DecisionContext.Provider>
  );
}

// ─── Hook to use context ───────────────────────────────────────────────────

export function useDecision(): DecisionContextType {
  const context = useContext(DecisionContext);
  if (!context) {
    throw new Error("useDecision must be used within a DecisionProvider");
  }
  return context;
}
