/**
 * components/steps/Step2Ingest.tsx
 * ───────────────────────────────
 * Second step: feed data via Smart Paste (LLM extraction) or Manual entry.
 */

"use client";

import React, { useState, useCallback } from "react";
import { useDecision } from "@/context/DecisionContext";
import { DecisionState } from "@/lib/types";
import { processSmartPaste, formatApiError } from "@/lib/api";
import {
  STRINGS,
  COLOR_TOKENS,
  FONTS,
  LLM_MODELS,
  MIN_SMART_PASTE_LENGTH,
} from "@/lib/constants";

type IngestMode = "smart_paste" | "manual";

export function Step2Ingest() {
  const { decisionState, setDecisionState, setLoading, setError, goToNextStep } = useDecision();

  const [mode, setMode] = useState<IngestMode>("smart_paste");
  const [rawText, setRawText] = useState("");
  const [selectedModel, setSelectedModel] = useState(LLM_MODELS[0].value);

  const title = decisionState?.title || "Decision";
  const isSmartPasteValid = rawText.trim().length >= MIN_SMART_PASTE_LENGTH;

  // ── Smart Paste Handler ────────────────────────────────────────────────

  const handleExtract = useCallback(async () => {
    if (!isSmartPasteValid || !decisionState) return;

    setLoading(true, STRINGS.STEP2_EXTRACTING);
    setError(null);

    const result = await processSmartPaste(title, rawText, selectedModel);

    if (result.error) {
      setError(formatApiError(result));
      setLoading(false);
    } else {
      // Update decision state with extracted products & criteria
      const extracted = result.data;
      setDecisionState({
        ...decisionState,
        products: extracted.products,
        criteria: extracted.criteria,
        harmonization_log: extracted.harmonization_log,
      });
      setLoading(false);
      goToNextStep();
    }
  }, [
    decisionState,
    title,
    rawText,
    selectedModel,
    isSmartPasteValid,
    setLoading,
    setError,
    setDecisionState,
    goToNextStep,
  ]);

  // ── Manual Mode: Placeholder for future implementation ─────────────────

  const renderSmartPaste = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Model selector */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontFamily: FONTS.mono,
            color: COLOR_TOKENS.amber,
            letterSpacing: "0.15em",
            marginBottom: "8px",
            textTransform: "uppercase",
          }}
        >
          {STRINGS.STEP2_MODEL_LABEL}
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            fontSize: "13px",
            fontFamily: FONTS.body,
            background: COLOR_TOKENS.surface,
            border: `1px solid ${COLOR_TOKENS.border}`,
            borderRadius: "6px",
            color: COLOR_TOKENS.text,
            outline: "none",
          }}
        >
          {LLM_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Text area */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: "12px",
            fontFamily: FONTS.mono,
            color: COLOR_TOKENS.amber,
            letterSpacing: "0.15em",
            marginBottom: "8px",
            textTransform: "uppercase",
          }}
        >
          Product Data
        </label>
        <textarea
          placeholder={STRINGS.STEP2_PASTE_PLACEHOLDER}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          style={{
            width: "100%",
            minHeight: "250px",
            padding: "14px 16px",
            fontSize: "13px",
            fontFamily: FONTS.mono,
            background: COLOR_TOKENS.surface,
            border: `1px solid ${COLOR_TOKENS.border}`,
            borderRadius: "6px",
            color: COLOR_TOKENS.text,
            outline: "none",
            resize: "vertical",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = COLOR_TOKENS.teal;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = COLOR_TOKENS.border;
          }}
        />
        <p
          style={{
            fontSize: "11px",
            color: COLOR_TOKENS.muted,
            marginTop: "6px",
            fontFamily: FONTS.mono,
          }}
        >
          {rawText.length} / 50000 characters
          {isSmartPasteValid ? " ✓" : " (min 50 characters)"}
        </p>
      </div>

      {/* Extract button */}
      <button
        onClick={handleExtract}
        disabled={!isSmartPasteValid}
        style={{
          padding: "12px 20px",
          fontSize: "13px",
          fontFamily: FONTS.mono,
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          background: isSmartPasteValid
            ? `linear-gradient(135deg, ${COLOR_TOKENS.amber}, ${COLOR_TOKENS.teal})`
            : COLOR_TOKENS.border,
          color: isSmartPasteValid ? COLOR_TOKENS.bg : COLOR_TOKENS.muted,
          border: "none",
          borderRadius: "6px",
          cursor: isSmartPasteValid ? "pointer" : "not-allowed",
          transition: "all 0.3s",
        }}
        onMouseEnter={(e) => {
          if (isSmartPasteValid) {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = `0 8px 12px ${COLOR_TOKENS.amber}30`;
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "none";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {STRINGS.STEP2_EXTRACT}
      </button>
    </div>
  );

  const renderManual = () => (
    <div
      style={{
        padding: "30px",
        background: `${COLOR_TOKENS.border}20`,
        borderRadius: "8px",
        textAlign: "center",
        color: COLOR_TOKENS.muted,
      }}
    >
      <p style={{ fontSize: "14px", marginBottom: "10px" }}>
        Manual entry mode coming soon.
      </p>
      <p style={{ fontSize: "12px", color: COLOR_TOKENS.muted }}>
        For now, use Smart Paste or check back later.
      </p>
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: COLOR_TOKENS.bg,
        padding: "40px 20px",
        fontFamily: FONTS.body,
        color: COLOR_TOKENS.text,
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "32px",
              fontWeight: 600,
              marginBottom: "12px",
              fontFamily: FONTS.display,
              letterSpacing: "-0.02em",
            }}
          >
            Feed Your Data
          </h1>
          <p style={{ fontSize: "14px", color: COLOR_TOKENS.muted, lineHeight: 1.6 }}>
            Paste product specs, reviews, or comparison tables. Our AI will extract
            and harmonize the data automatically.
          </p>
        </div>

        {/* Mode Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "30px",
            borderBottom: `1px solid ${COLOR_TOKENS.border}`,
            paddingBottom: "0px",
          }}
        >
          {["smart_paste", "manual"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m as IngestMode)}
              style={{
                padding: "12px 16px",
                fontSize: "12px",
                fontFamily: FONTS.mono,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                background: "none",
                border: "none",
                color: mode === m ? COLOR_TOKENS.amber : COLOR_TOKENS.muted,
                cursor: "pointer",
                borderBottom:
                  mode === m ? `2px solid ${COLOR_TOKENS.amber}` : "2px solid transparent",
                transition: "all 0.2s",
              }}
            >
              {m === "smart_paste" ? "🤖 Smart Paste" : "✏️ Manual Entry"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ marginBottom: "40px" }}>
          {mode === "smart_paste" ? renderSmartPaste() : renderManual()}
        </div>

        {/* Step indicator */}
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: COLOR_TOKENS.muted,
            fontFamily: FONTS.mono,
          }}
        >
          Step 2 of 4 · Feed your data
        </p>
      </div>
    </div>
  );
}
