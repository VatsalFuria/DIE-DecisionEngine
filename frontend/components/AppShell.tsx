"use client";

import type { CSSProperties } from "react";

import { Step1Category } from "@/components/steps/Step1Category";
import { Step2Ingest } from "@/components/steps/Step2Ingest";
import { Step3Review } from "@/components/steps/Step3Review";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { useDecision } from "@/context/DecisionContext";
import { COLOR_TOKENS, FONTS } from "@/lib/constants";

function ResultsView() {
  const { decisionState, goToStep, saveCurrentSession } = useDecision();

  if (!decisionState?.scores || !decisionState.rankings) {
    return (
      <main style={{ padding: 32, color: COLOR_TOKENS.text }}>
        <button onClick={() => goToStep("review")}>Back to review</button>
      </main>
    );
  }

  const productById = new Map(decisionState.products.map((p) => [p.id, p]));

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: 32,
        background: COLOR_TOKENS.bg,
        color: COLOR_TOKENS.text,
        fontFamily: FONTS.body,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ fontSize: 32, marginBottom: 8 }}>
              {decisionState.title}
            </h1>
            <p style={{ color: COLOR_TOKENS.muted }}>
              Ranked with {decisionState.scoring_method || "weighted_sum"}.
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <button
              onClick={() => goToStep("review")}
              style={buttonStyle("secondary")}
            >
              Edit Weights
            </button>
            <button
              onClick={saveCurrentSession}
              style={buttonStyle("primary")}
            >
              Save Session
            </button>
          </div>
        </div>

        <div
          style={{
            border: `1px solid ${COLOR_TOKENS.border}`,
            borderRadius: 8,
            overflow: "hidden",
            background: COLOR_TOKENS.surface,
          }}
        >
          {decisionState.rankings.map((productId, index) => {
            const product = productById.get(productId);
            const score = decisionState.scores?.[productId] ?? 0;
            return (
              <div
                key={productId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1fr 120px",
                  gap: 16,
                  padding: "16px 18px",
                  borderBottom:
                    index === decisionState.rankings!.length - 1
                      ? "none"
                      : `1px solid ${COLOR_TOKENS.border}`,
                }}
              >
                <div style={{ color: COLOR_TOKENS.amber, fontWeight: 700 }}>
                  #{index + 1}
                </div>
                <div>{product?.name || productId}</div>
                <div style={{ fontFamily: FONTS.mono }}>
                  {(score * 100).toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function buttonStyle(kind: "primary" | "secondary"): CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 6,
    border:
      kind === "primary" ? "none" : `1px solid ${COLOR_TOKENS.borderHi}`,
    background: kind === "primary" ? COLOR_TOKENS.amber : COLOR_TOKENS.surface,
    color: kind === "primary" ? COLOR_TOKENS.bg : COLOR_TOKENS.text,
    cursor: "pointer",
    fontFamily: FONTS.mono,
    fontWeight: 700,
  };
}

export function AppShell() {
  const { currentStep, isLoading, loadingMessage, error, clearError } =
    useDecision();

  return (
    <>
      {error && (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            top: 16,
            zIndex: 900,
            maxWidth: 900,
            margin: "0 auto",
            padding: "12px 14px",
            border: `1px solid ${COLOR_TOKENS.red}`,
            borderRadius: 6,
            background: COLOR_TOKENS.surface,
            color: COLOR_TOKENS.text,
            fontFamily: FONTS.body,
          }}
        >
          <button
            onClick={clearError}
            style={{
              float: "right",
              border: "none",
              background: "transparent",
              color: COLOR_TOKENS.muted,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          {error}
        </div>
      )}
      {currentStep === "category" && <Step1Category />}
      {currentStep === "ingest" && <Step2Ingest />}
      {currentStep === "review" && <Step3Review />}
      {currentStep === "score" && <ResultsView />}
      <LoadingOverlay isOpen={isLoading} message={loadingMessage} />
    </>
  );
}
