/**
 * components/cockpit/SensitivityPanel.tsx
 * ──────────────────────────────────────
 * Modal panel displaying sensitivity analysis results.
 * Shows tipping points for each criterion (how much weight must change to swap ranks).
 */

"use client";

import React, { useMemo } from "react";
import { SensitivityReport, TippingPoint } from "@/lib/types";
import { COLOR_TOKENS, FONTS, STRINGS } from "@/lib/constants";

export interface SensitivityPanelProps {
  report: SensitivityReport | null;
  isOpen: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export function SensitivityPanel({
  report,
  isOpen,
  onClose,
  isLoading = false,
}: SensitivityPanelProps) {
  // ── Categorize tipping points by stability ────────────────────────────

  const stablePoints = useMemo(
    () => (report?.tipping_points || []).filter((tp) => tp.is_stable),
    [report]
  );

  const fragilePoints = useMemo(
    () => (report?.tipping_points || []).filter((tp) => !tp.is_stable).sort(
      (a, b) =>
        (Math.abs(a.delta_to_swap) || 999) - (Math.abs(b.delta_to_swap) || 999)
    ),
    [report]
  );

  if (!isOpen || !report) return null;

  // ── Helper: Get color for stability ────────────────────────────────────

  const getStabilityColor = (tp: TippingPoint): string => {
    if (tp.is_stable) return COLOR_TOKENS.green;
    if (tp.percent_change === null) return COLOR_TOKENS.amber;
    const change = Math.abs(tp.percent_change);
    if (change > 50) return COLOR_TOKENS.green;
    if (change > 20) return COLOR_TOKENS.amber;
    return COLOR_TOKENS.red;
  };

  const getStabilityLabel = (tp: TippingPoint): string => {
    if (tp.is_stable) return "Very Stable";
    if (tp.percent_change === null) return "Unknown";
    const change = Math.abs(tp.percent_change);
    if (change > 50) return "Stable";
    if (change > 20) return "Moderate";
    return "Fragile";
  };

  // ── Render tipping point bar ───────────────────────────────────────────

  const renderTippingPointBar = (tp: TippingPoint, idx: number) => {
    const color = getStabilityColor(tp);
    const label = getStabilityLabel(tp);
    const barWidth = tp.is_stable ? 100 : Math.min(100, (Math.abs(tp.percent_change) || 0) / 2);

    return (
      <div
        key={`${tp.criterion_id}_${idx}`}
        style={{
          padding: "12px 0",
          borderBottom: `1px solid ${COLOR_TOKENS.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: "6px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: COLOR_TOKENS.text,
            }}
          >
            {tp.criterion_name}
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            {tp.is_stable ? (
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: FONTS.mono,
                  color: color,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                }}
              >
                ✓ {label}
              </span>
            ) : (
              <>
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: FONTS.mono,
                    color: color,
                    fontWeight: 600,
                  }}
                >
                  Δ {tp.percent_change !== null ? `${Math.abs(tp.percent_change).toFixed(1)}%` : "N/A"}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontFamily: FONTS.mono,
                    color: COLOR_TOKENS.muted,
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Bar visualization */}
        <div
          style={{
            height: "4px",
            background: COLOR_TOKENS.border,
            borderRadius: "2px",
            overflow: "hidden",
            marginBottom: "6px",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.max(barWidth, 2)}%`,
              background: color,
              borderRadius: "2px",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        {/* Detailed info */}
        {!tp.is_stable && (
          <div
            style={{
              fontSize: "10px",
              fontFamily: FONTS.mono,
              color: COLOR_TOKENS.muted,
              display: "flex",
              gap: "12px",
            }}
          >
            <span>
              Current weight: {(tp.current_weight * 100).toFixed(1)}%
            </span>
            {tp.tipping_weight !== null && (
              <span>
                Tipping point: {(tp.tipping_weight * 100).toFixed(1)}%
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 99,
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          width: "420px",
          height: "100vh",
          maxWidth: "100vw",
          background: COLOR_TOKENS.surface,
          borderLeft: `1px solid ${COLOR_TOKENS.border}`,
          display: "flex",
          flexDirection: "column",
          zIndex: 100,
          overflowY: "auto",
          fontFamily: FONTS.body,
          color: COLOR_TOKENS.text,
          animation: "slideIn 0.3s ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: `1px solid ${COLOR_TOKENS.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: COLOR_TOKENS.surface,
            position: "sticky",
            top: 0,
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "9px",
                fontFamily: FONTS.mono,
                color: COLOR_TOKENS.teal,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              ⇄ SENSITIVITY ANALYSIS
            </div>
            <div
              style={{
                fontSize: "15px",
                fontWeight: 700,
                color: COLOR_TOKENS.text,
              }}
            >
              {STRINGS.SENSITIVITY_TITLE}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: `1px solid ${COLOR_TOKENS.border}`,
              color: COLOR_TOKENS.muted,
              cursor: "pointer",
              padding: "6px 10px",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: FONTS.mono,
            }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
            flex: 1,
          }}
        >
          {isLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "200px",
                color: COLOR_TOKENS.muted,
              }}
            >
              <span>Analyzing sensitivity...</span>
            </div>
          ) : (
            <>
              {/* Description */}
              <div
                style={{
                  padding: "12px 14px",
                  background: `${COLOR_TOKENS.blue}10`,
                  border: `1px solid ${COLOR_TOKENS.blue}30`,
                  borderRadius: "6px",
                  fontSize: "12px",
                  color: COLOR_TOKENS.text,
                  lineHeight: 1.6,
                }}
              >
                {STRINGS.SENSITIVITY_DESCRIPTION}
              </div>

              {/* Overall Stats */}
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    fontFamily: FONTS.mono,
                    color: COLOR_TOKENS.muted,
                    letterSpacing: "0.12em",
                    marginBottom: "12px",
                    textTransform: "uppercase",
                  }}
                >
                  📊 Overall Stability
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    background: COLOR_TOKENS.bg,
                    border: `1px solid ${COLOR_TOKENS.border}`,
                    borderRadius: "6px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: "12px", color: COLOR_TOKENS.text }}>
                    {STRINGS.SENSITIVITY_STABILITY_INDEX(report.stability_index)}
                  </span>
                  <div
                    style={{
                      width: "100px",
                      height: "6px",
                      background: COLOR_TOKENS.border,
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${report.stability_index * 100}%`,
                        height: "100%",
                        background: `linear-gradient(90deg, ${COLOR_TOKENS.red}, ${COLOR_TOKENS.amber}, ${COLOR_TOKENS.green})`,
                        borderRadius: "3px",
                      }}
                    />
                  </div>
                </div>

                {/* Most Fragile */}
                {report.most_fragile_criterion_id && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "10px 12px",
                      background: `${COLOR_TOKENS.red}10`,
                      border: `1px solid ${COLOR_TOKENS.red}30`,
                      borderRadius: "4px",
                      fontSize: "11px",
                      color: COLOR_TOKENS.text,
                    }}
                  >
                    <span style={{ color: COLOR_TOKENS.red, fontWeight: 600 }}>⚠ Most Fragile:</span>
                    <span style={{ marginLeft: "8px", color: COLOR_TOKENS.muted }}>
                      {report.most_fragile_delta !== null
                        ? `Δ ${Math.abs(report.most_fragile_delta).toFixed(1)}%`
                        : "N/A"}
                    </span>
                  </div>
                )}
              </div>

              {/* Stable Criteria */}
              {stablePoints.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontFamily: FONTS.mono,
                      color: COLOR_TOKENS.green,
                      letterSpacing: "0.12em",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    ✓ Stable ({stablePoints.length})
                  </div>
                  <div
                    style={{
                      padding: "12px",
                      background: COLOR_TOKENS.bg,
                      border: `1px solid ${COLOR_TOKENS.border}`,
                      borderRadius: "6px",
                    }}
                  >
                    {stablePoints.map((tp, idx) => renderTippingPointBar(tp, idx))}
                  </div>
                </div>
              )}

              {/* Fragile Criteria */}
              {fragilePoints.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: "10px",
                      fontFamily: FONTS.mono,
                      color: COLOR_TOKENS.amber,
                      letterSpacing: "0.12em",
                      marginBottom: "12px",
                      textTransform: "uppercase",
                    }}
                  >
                    ⚡ Sensitive ({fragilePoints.length})
                  </div>
                  <div
                    style={{
                      padding: "12px",
                      background: COLOR_TOKENS.bg,
                      border: `1px solid ${COLOR_TOKENS.border}`,
                      borderRadius: "6px",
                    }}
                  >
                    {fragilePoints.map((tp, idx) => renderTippingPointBar(tp, idx))}
                  </div>
                </div>
              )}

              {/* Info box */}
              <div
                style={{
                  padding: "12px 14px",
                  background: `${COLOR_TOKENS.muted}10`,
                  border: `1px solid ${COLOR_TOKENS.muted}30`,
                  borderRadius: "6px",
                  fontSize: "10px",
                  color: COLOR_TOKENS.muted,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                Weights are redistributed proportionally when one criterion changes.
                This reflects realistic user behavior when adjusting priorities.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
