/**
 * components/steps/Step3Review.tsx
 * ────────────────────────────────
 * Third step: review extracted criteria, set weights, adjust direction, delete if needed.
 */

"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useDecision } from "@/context/DecisionContext";
import { Criterion, CriterionType, OptimizationDirection, DecisionState } from "@/lib/types";
import { scoreDecision } from "@/lib/api";
import {
  STRINGS,
  COLOR_TOKENS,
  FONTS,
  WEIGHT_DECIMAL_PLACES,
  MIN_CRITERIA_TO_SCORE,
  MIN_PRODUCTS_TO_SCORE,
} from "@/lib/constants";

export function Step3Review() {
  const {
    decisionState,
    setDecisionState,
    setLoading,
    setError,
    goToStep,
  } = useDecision();

  if (!decisionState) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: COLOR_TOKENS.muted }}>
        No decision state found. Please start over.
      </div>
    );
  }

  const [criteria, setCriteria] = useState<Criterion[]>(decisionState.criteria);

  // ── Weight Normalization Logic ─────────────────────────────────────────

  const updateWeight = useCallback((criterionId: string, newWeight: number) => {
    const updated = criteria.map((c) =>
      c.id === criterionId ? { ...c, weight: Math.max(0, Math.min(1, newWeight)) } : c
    );

    const totalWeight = updated.reduce((sum, c) => sum + c.weight, 0);

    // If total > 1, scale others proportionally
    if (totalWeight > 1) {
      const excess = totalWeight - 1;
      const otherSum = updated
        .filter((c) => c.id !== criterionId)
        .reduce((sum, c) => sum + c.weight, 0);

      if (otherSum > 0) {
        const scale = (otherSum - excess) / otherSum;
        setCriteria(
          updated.map((c) =>
            c.id === criterionId
              ? c
              : {
                  ...c,
                  weight: Math.max(
                    0,
                    Math.round(c.weight * scale * Math.pow(10, WEIGHT_DECIMAL_PLACES)) /
                      Math.pow(10, WEIGHT_DECIMAL_PLACES)
                  ),
                }
          )
        );
      }
    } else {
      setCriteria(updated);
    }
  }, [criteria]);

  const updateDirection = useCallback(
    (criterionId: string, newDirection: OptimizationDirection) => {
      setCriteria(
        criteria.map((c) =>
          c.id === criterionId ? { ...c, direction: newDirection } : c
        )
      );
    },
    [criteria]
  );

  const deleteCriterion = useCallback(
    (criterionId: string) => {
      setCriteria(criteria.filter((c) => c.id !== criterionId));
    },
    [criteria]
  );

  // ── Computed Values ────────────────────────────────────────────────────

  const totalWeight = useMemo(
    () =>
      Math.round(criteria.reduce((sum, c) => sum + c.weight, 0) * 10000) / 10000,
    [criteria]
  );

  const canScore =
    criteria.length >= MIN_CRITERIA_TO_SCORE &&
    decisionState.products.length >= MIN_PRODUCTS_TO_SCORE &&
    Math.abs(totalWeight - 1.0) < 0.01;

  const weightWarning = Math.abs(totalWeight - 1.0) >= 0.01;

  // ── Score Handler ──────────────────────────────────────────────────────

  const handleScore = useCallback(async () => {
    if (!canScore) return;

    const updated: DecisionState = {
      ...decisionState,
      criteria,
      updated_at: new Date().toISOString(),
    };

    setLoading(true, "Scoring products with weighted sum method...");
    setError(null);

    const result = await scoreDecision(updated, "weighted_sum");

    if (result.error) {
      setError(result.message);
      setLoading(false);
    } else {
      setDecisionState(result.data);
      setLoading(false);
      goToStep("score");
    }
  }, [decisionState, criteria, canScore, setDecisionState, setLoading, setError, goToStep]);

  // ── UI Helpers ─────────────────────────────────────────────────────────

  const getCriterionTypeColor = (type: CriterionType): string => {
    switch (type) {
      case CriterionType.NUMERIC:
        return COLOR_TOKENS.blue;
      case CriterionType.CATEGORICAL:
        return COLOR_TOKENS.amber;
      case CriterionType.BOOLEAN:
        return COLOR_TOKENS.green;
      default:
        return COLOR_TOKENS.muted;
    }
  };

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
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
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
            {STRINGS.STEP3_TITLE}
          </h1>
          <p style={{ fontSize: "14px", color: COLOR_TOKENS.muted, lineHeight: 1.6 }}>
            {STRINGS.STEP3_DESCRIPTION}
          </p>
        </div>

        {/* Weight Warning */}
        {weightWarning && (
          <div
            style={{
              padding: "12px 16px",
              background: `${COLOR_TOKENS.amber}15`,
              border: `1px solid ${COLOR_TOKENS.amber}40`,
              borderRadius: "6px",
              marginBottom: "24px",
              fontSize: "12px",
              fontFamily: FONTS.mono,
              color: COLOR_TOKENS.amber,
              letterSpacing: "0.05em",
            }}
          >
            ⚠ {STRINGS.STEP3_WEIGHT_SUM_WARNING(totalWeight * 100)}
          </div>
        )}

        {/* Criteria List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
          {criteria.map((criterion, idx) => (
            <div
              key={criterion.id}
              style={{
                padding: "20px",
                background: COLOR_TOKENS.surface,
                border: `1px solid ${COLOR_TOKENS.border}`,
                borderRadius: "8px",
                display: "grid",
                gridTemplateColumns: "1fr 120px 100px 60px",
                alignItems: "center",
                gap: "16px",
                transition: "border-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = COLOR_TOKENS.borderHi;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = COLOR_TOKENS.border;
              }}
            >
              {/* Name + Type */}
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "4px",
                    color: COLOR_TOKENS.text,
                  }}
                >
                  {criterion.name}
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: FONTS.mono,
                      padding: "2px 6px",
                      background: `${getCriterionTypeColor(criterion.criterion_type)}20`,
                      color: getCriterionTypeColor(criterion.criterion_type),
                      border: `1px solid ${getCriterionTypeColor(criterion.criterion_type)}40`,
                      borderRadius: "3px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {criterion.criterion_type}
                  </span>
                  {criterion.unit_hint && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: FONTS.mono,
                        color: COLOR_TOKENS.muted,
                      }}
                    >
                      · {criterion.unit_hint}
                    </span>
                  )}
                </div>
              </div>

              {/* Weight Slider */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={criterion.weight}
                  onChange={(e) => updateWeight(criterion.id, parseFloat(e.target.value))}
                  style={{
                    width: "100%",
                    cursor: "pointer",
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: FONTS.mono,
                    color: COLOR_TOKENS.amber,
                    marginTop: "4px",
                    fontWeight: 600,
                  }}
                >
                  {(criterion.weight * 100).toFixed(0)}%
                </span>
              </div>

              {/* Direction Toggle */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={() => updateDirection(criterion.id, OptimizationDirection.MAXIMIZE)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: "11px",
                    fontFamily: FONTS.mono,
                    fontWeight: 600,
                    background:
                      criterion.direction === OptimizationDirection.MAXIMIZE
                        ? COLOR_TOKENS.green
                        : COLOR_TOKENS.border,
                    color:
                      criterion.direction === OptimizationDirection.MAXIMIZE
                        ? COLOR_TOKENS.bg
                        : COLOR_TOKENS.muted,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  ↑ Max
                </button>
                <button
                  onClick={() => updateDirection(criterion.id, OptimizationDirection.MINIMIZE)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: "11px",
                    fontFamily: FONTS.mono,
                    fontWeight: 600,
                    background:
                      criterion.direction === OptimizationDirection.MINIMIZE
                        ? COLOR_TOKENS.red
                        : COLOR_TOKENS.border,
                    color:
                      criterion.direction === OptimizationDirection.MINIMIZE
                        ? COLOR_TOKENS.bg
                        : COLOR_TOKENS.muted,
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  ↓ Min
                </button>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => deleteCriterion(criterion.id)}
                disabled={criteria.length <= MIN_CRITERIA_TO_SCORE}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontFamily: FONTS.mono,
                  fontWeight: 600,
                  background: COLOR_TOKENS.red,
                  color: COLOR_TOKENS.bg,
                  border: "none",
                  borderRadius: "4px",
                  cursor: criteria.length > MIN_CRITERIA_TO_SCORE ? "pointer" : "not-allowed",
                  opacity: criteria.length > MIN_CRITERIA_TO_SCORE ? 1 : 0.5,
                  transition: "all 0.2s",
                }}
                title={
                  criteria.length <= MIN_CRITERIA_TO_SCORE
                    ? "Need at least one criterion"
                    : "Delete criterion"
                }
              >
                ❌ Delete
              </button>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div
          style={{
            padding: "16px",
            background: `${COLOR_TOKENS.border}20`,
            borderRadius: "6px",
            marginBottom: "30px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: "16px",
          }}
        >
          <div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: FONTS.mono,
                color: COLOR_TOKENS.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Total Criteria
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: COLOR_TOKENS.text,
                marginTop: "4px",
              }}
            >
              {criteria.length}
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: FONTS.mono,
                color: COLOR_TOKENS.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Total Weight
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: totalWeight === 1.0 ? COLOR_TOKENS.green : COLOR_TOKENS.amber,
                marginTop: "4px",
              }}
            >
              {(totalWeight * 100).toFixed(1)}%
            </div>
          </div>
          <div>
            <span
              style={{
                fontSize: "11px",
                fontFamily: FONTS.mono,
                color: COLOR_TOKENS.muted,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Products
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: 600,
                color: COLOR_TOKENS.text,
                marginTop: "4px",
              }}
            >
              {decisionState.products.length}
            </div>
          </div>
        </div>

        {/* Score Button */}
        <button
          onClick={handleScore}
          disabled={!canScore}
          style={{
            width: "100%",
            padding: "14px 20px",
            fontSize: "13px",
            fontFamily: FONTS.mono,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            background: canScore
              ? `linear-gradient(135deg, ${COLOR_TOKENS.amber}, ${COLOR_TOKENS.teal})`
              : COLOR_TOKENS.border,
            color: canScore ? COLOR_TOKENS.bg : COLOR_TOKENS.muted,
            border: "none",
            borderRadius: "8px",
            cursor: canScore ? "pointer" : "not-allowed",
            transition: "all 0.3s",
            marginBottom: "20px",
          }}
          onMouseEnter={(e) => {
            if (canScore) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = `0 8px 16px ${COLOR_TOKENS.amber}40`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "none";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {STRINGS.STEP3_SCORE_PRODUCTS}
        </button>

        {/* Step indicator */}
        <p
          style={{
            textAlign: "center",
            fontSize: "12px",
            color: COLOR_TOKENS.muted,
            fontFamily: FONTS.mono,
          }}
        >
          Step 3 of 4 · Set your priorities
        </p>
      </div>
    </div>
  );
}
