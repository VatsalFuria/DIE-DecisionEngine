"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg: "#080c10",
  surface: "#0d1117",
  border: "#1e2938",
  borderHi: "#2e4060",
  text: "#c8d8e8",
  muted: "#4a6070",
  amber: "#e8a830",
  teal: "#20c8a8",
  red: "#e83050",
  green: "#38d890",
  blue: "#3098e8",
};

// ─── Mock data (mirrors the FastAPI DecisionState shape) ───────────────────────
const MOCK_STATE = {
  session_id: "die-demo-001",
  title: "Laptop Comparison",
  criteria: [
    {
      id: "price_usd",
      name: "Price",
      weight: 0.3,
      direction: "minimize",
      unit_hint: "USD",
    },
    {
      id: "battery_hours",
      name: "Battery Life",
      weight: 0.25,
      direction: "maximize",
      unit_hint: "hours",
    },
    {
      id: "display_score",
      name: "Display",
      weight: 0.2,
      direction: "maximize",
      unit_hint: null,
    },
    {
      id: "build_score",
      name: "Build Quality",
      weight: 0.15,
      direction: "maximize",
      unit_hint: null,
    },
    {
      id: "weight_kg",
      name: "Weight",
      weight: 0.1,
      direction: "minimize",
      unit_hint: "kg",
    },
  ],
  products: [
    {
      id: "p1",
      name: "MacBook Pro 14",
      features: {
        price_usd: { numeric_value: 1999, raw_value: "$1,999", unit: "USD" },
        battery_hours: { numeric_value: 18, raw_value: "18h", unit: "hours" },
        display_score: {
          numeric_value: 0.95,
          raw_value: "Excellent",
          unit: null,
        },
        build_score: {
          numeric_value: 0.95,
          raw_value: "Excellent",
          unit: null,
        },
        weight_kg: { numeric_value: 1.6, raw_value: "1.6 kg", unit: "kg" },
      },
    },
    {
      id: "p2",
      name: "Dell XPS 15",
      features: {
        price_usd: { numeric_value: 1599, raw_value: "$1,599", unit: "USD" },
        battery_hours: { numeric_value: 12, raw_value: "12h", unit: "hours" },
        display_score: {
          numeric_value: 0.9,
          raw_value: "Very Good",
          unit: null,
        },
        build_score: { numeric_value: 0.8, raw_value: "Good", unit: null },
        weight_kg: { numeric_value: 1.86, raw_value: "1.86 kg", unit: "kg" },
      },
    },
    {
      id: "p3",
      name: "Lenovo ThinkPad X1",
      features: {
        price_usd: { numeric_value: 1399, raw_value: "$1,399", unit: "USD" },
        battery_hours: { numeric_value: 15, raw_value: "15h", unit: "hours" },
        display_score: { numeric_value: 0.7, raw_value: "Good", unit: null },
        build_score: {
          numeric_value: 0.85,
          raw_value: "Very Good",
          unit: null,
        },
        weight_kg: { numeric_value: 1.12, raw_value: "1.12 kg", unit: "kg" },
      },
    },
    {
      id: "p4",
      name: "ASUS Zenbook Pro",
      features: {
        price_usd: { numeric_value: 1249, raw_value: "$1,249", unit: "USD" },
        battery_hours: { numeric_value: 10, raw_value: "10h", unit: "hours" },
        display_score: {
          numeric_value: 0.85,
          raw_value: "Very Good",
          unit: null,
        },
        build_score: { numeric_value: 0.65, raw_value: "Average", unit: null },
        weight_kg: { numeric_value: 1.7, raw_value: "1.7 kg", unit: "kg" },
      },
    },
    {
      id: "p5",
      name: "HP Spectre x360",
      features: {
        price_usd: { numeric_value: 1449, raw_value: "$1,449", unit: "USD" },
        battery_hours: { numeric_value: 14, raw_value: "14h", unit: "hours" },
        display_score: { numeric_value: 0.8, raw_value: "Good", unit: null },
        build_score: { numeric_value: 0.75, raw_value: "Good", unit: null },
        weight_kg: { numeric_value: 1.34, raw_value: "1.34 kg", unit: "kg" },
      },
    },
  ],
  scores: null,
  rankings: null,
  scoring_method: null,
};

const MOCK_AUDIT = {
  chosen_product: "MacBook Pro 14",
  runner_up: "Lenovo ThinkPad X1",
  contradiction_summary: "Moderate bias detected: 2 preference contradictions.",
  contradictions: [
    {
      criterion_name: "Price",
      severity: "high",
      observation:
        "Price holds your #1 weight (30%) yet the chosen product costs $600 above the dataset average of $1,339.",
      implication:
        "You are paying a 45% price premium despite claiming cost is your primary concern.",
    },
    {
      criterion_name: "Weight",
      severity: "medium",
      observation:
        "Weight is weighted 10%, but the chosen product at 1.60 kg is 13% heavier than the ThinkPad X1 at 1.12 kg.",
      implication:
        "Your ranking implicitly de-prioritizes portability versus stated preference.",
    },
  ],
  tradeoff_summary: {
    chosen_product: "MacBook Pro 14",
    headline:
      "MacBook Pro 14 delivers best-in-class display and battery at a significant price premium.",
    lines: [
      {
        criterion_name: "Price",
        direction: "loss",
        delta_description: "45% above dataset average",
        delta_pct: 45.0,
      },
      {
        criterion_name: "Battery Life",
        direction: "gain",
        delta_description: "27% above dataset average",
        delta_pct: 27.0,
      },
      {
        criterion_name: "Display",
        direction: "gain",
        delta_description: "16% above dataset average",
        delta_pct: 16.0,
      },
      {
        criterion_name: "Build Quality",
        direction: "gain",
        delta_description: "22% above dataset average",
        delta_pct: 22.0,
      },
      {
        criterion_name: "Weight",
        direction: "loss",
        delta_description: "13% heavier than average",
        delta_pct: 13.0,
      },
    ],
    overall_verdict:
      "Given your stated 30% weight on price, this choice has a clear internal tension. You are optimizing for quality experience while nominally prioritizing cost. Consider either reducing the price weight to reflect your true preferences, or genuinely constraining your shortlist to sub-$1,500 options.",
  },
  stress_test_questions: [
    {
      question:
        "Would you still choose MacBook Pro 14 if Lenovo ThinkPad X1 costs $600 less and lasts 15h on a single charge?",
      targets_bias: "Brand anchoring / Apple premium rationalization",
      follow_up_hint:
        "A 'no' answer implies price and battery are more important than your weights suggest.",
    },
    {
      question:
        "Is 6 extra hours of battery life (18h vs 12h) worth $400 more than the Dell XPS 15?",
      targets_bias:
        "Spec ceiling bias — diminishing returns on battery beyond 12h for typical use",
      follow_up_hint:
        "A 'no' answer suggests your battery weight (25%) should be reduced to below 15%.",
    },
    {
      question:
        "Would you reconsider if build quality scores were hidden and only objective specs were shown?",
      targets_bias:
        "Qualitative halo effect — high build score may be anchoring the entire decision",
      follow_up_hint:
        "A 'yes' implies your decision rests more on perception than quantifiable value.",
    },
  ],
  audit_confidence: 0.87,
};

// ─── Scoring engine (mirrors backend weighted_sum logic) ──────────────────────
function computeScores(products, criteria) {
  const cids = criteria.map((c) => c.id);

  // Build matrix
  const matrix = products.map((p) =>
    cids.map((cid) => p.features[cid]?.numeric_value ?? null),
  );

  // Fill NaN with column mean
  const colMeans = cids.map((cid, j) => {
    const vals = matrix.map((r) => r[j]).filter((v) => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });

  const filled = matrix.map((row) =>
    row.map((v, j) => (v !== null ? v : colMeans[j])),
  );

  // Direction flip (MINIMIZE → reflect)
  const flipped = filled.map((row) =>
    row.map((v, j) => {
      const c = criteria[j];
      if (c.direction === "minimize") {
        const col = filled.map((r) => r[j]);
        const lo = Math.min(...col),
          hi = Math.max(...col);
        return Math.abs(hi - lo) < 1e-9 ? 0.5 : hi - v + lo;
      }
      return v;
    }),
  );

  // Min-max normalise columns
  const normed = flipped.map((row, i) =>
    row.map((v, j) => {
      const col = flipped.map((r) => r[j]);
      const lo = Math.min(...col),
        hi = Math.max(...col);
      return Math.abs(hi - lo) < 1e-9 ? 0.5 : (v - lo) / (hi - lo);
    }),
  );

  // Weighted sum
  const raw = normed.map((row) =>
    row.reduce((sum, v, j) => sum + v * criteria[j].weight, 0),
  );

  // Normalise to [0,1]
  const lo = Math.min(...raw),
    hi = Math.max(...raw);
  const scores = raw.map((s) =>
    Math.abs(hi - lo) < 1e-9 ? 0.5 : (s - lo) / (hi - lo),
  );

  return Object.fromEntries(products.map((p, i) => [p.id, scores[i]]));
}

// ─── Vertical slider component ─────────────────────────────────────────────────
function VerticalSlider({ value, onChange, label }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);

  const pct = Math.round(value * 100);

  const handlePointer = useCallback(
    (e) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const raw = 1 - (e.clientY - rect.top) / rect.height;
      onChange(Math.max(0, Math.min(1, raw)));
    },
    [onChange],
  );

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    const move = (e) => {
      if (dragging.current) handlePointer(e);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [handlePointer]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: T.amber,
          letterSpacing: "0.08em",
          fontWeight: 600,
        }}
      >
        {pct}%
      </div>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          dragging.current = true;
          handlePointer(e);
        }}
        style={{
          width: 4,
          height: 80,
          background: T.border,
          borderRadius: 2,
          position: "relative",
          cursor: "ns-resize",
        }}
      >
        {/* Track fill */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: `${pct}%`,
            background: `linear-gradient(to top, ${T.amber}, ${T.teal})`,
            borderRadius: 2,
            transition: "height 0.05s",
          }}
        />
        {/* Thumb */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            bottom: `calc(${pct}% - 6px)`,
            transform: "translateX(-50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: T.amber,
            border: `2px solid ${T.bg}`,
            boxShadow: `0 0 8px ${T.amber}80`,
            transition: "bottom 0.05s",
          }}
        />
      </div>
    </div>
  );
}

// ─── Sparkbar component ────────────────────────────────────────────────────────
function Sparkbar({ value, max, direction }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const color =
    direction === "minimize"
      ? `hsl(${120 - pct * 1.2}, 70%, 55%)`
      : `hsl(${pct * 1.2}, 70%, 55%)`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{
          flex: 1,
          height: 4,
          background: T.border,
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </div>
  );
}

// ─── Score badge ───────────────────────────────────────────────────────────────
function ScoreBadge({ score, rank }) {
  const hue = score * 120;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: rank === 1 ? T.amber : T.border,
          color: rank === 1 ? T.bg : T.muted,
          fontSize: 10,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Mono', monospace",
          flexShrink: 0,
        }}
      >
        {rank}
      </div>
      <div
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 13,
          fontWeight: 600,
          color: `hsl(${hue}, 80%, 65%)`,
        }}
      >
        {(score * 100).toFixed(1)}
      </div>
    </div>
  );
}

// ─── Severity badge ────────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
  const colors = { high: T.red, medium: T.amber, low: T.teal };
  return (
    <span
      style={{
        fontSize: 9,
        fontFamily: "'DM Mono', monospace",
        fontWeight: 700,
        letterSpacing: "0.1em",
        padding: "2px 6px",
        borderRadius: 2,
        background: `${colors[severity]}20`,
        color: colors[severity],
        border: `1px solid ${colors[severity]}40`,
        textTransform: "uppercase",
      }}
    >
      {severity}
    </span>
  );
}

// ─── Audit sidebar ─────────────────────────────────────────────────────────────
function AuditSidebar({ audit, isOpen, onClose }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
          style={{
            position: "fixed",
            top: 0,
            right: 0,
            width: 400,
            height: "100vh",
            background: T.surface,
            borderLeft: `1px solid ${T.border}`,
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            overflowY: "auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: `1px solid ${T.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              position: "sticky",
              top: 0,
              background: T.surface,
              zIndex: 1,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  color: T.teal,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                ◈ BIAS AUDIT
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>
                Decision Auditor
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: `1px solid ${T.border}`,
                color: T.muted,
                cursor: "pointer",
                padding: "6px 10px",
                borderRadius: 4,
                fontSize: 12,
                fontFamily: "'DM Mono', monospace",
              }}
            >
              ✕ CLOSE
            </button>
          </div>

          <div
            style={{
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            {/* Summary */}
            <div
              style={{
                padding: 16,
                background: `${T.amber}10`,
                border: `1px solid ${T.amber}30`,
                borderRadius: 6,
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                  color: T.amber,
                  marginBottom: 8,
                  letterSpacing: "0.1em",
                }}
              >
                VERDICT
              </div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.6 }}>
                {audit.contradiction_summary}
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 16 }}>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: T.muted,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    CHOSEN
                  </div>
                  <div style={{ fontSize: 12, color: T.teal, fontWeight: 600 }}>
                    {audit.chosen_product}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: T.muted,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    RUNNER-UP
                  </div>
                  <div style={{ fontSize: 12, color: T.text }}>
                    {audit.runner_up}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 9,
                      color: T.muted,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    CONFIDENCE
                  </div>
                  <div style={{ fontSize: 12, color: T.amber }}>
                    {Math.round(audit.audit_confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Contradictions */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                  color: T.muted,
                  letterSpacing: "0.12em",
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                ⚠ Preference Contradictions
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {audit.contradictions.map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    style={{
                      padding: 14,
                      background: T.bg,
                      border: `1px solid ${T.border}`,
                      borderLeft: `3px solid ${c.severity === "high" ? T.red : c.severity === "medium" ? T.amber : T.teal}`,
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 8,
                      }}
                    >
                      <span
                        style={{ fontSize: 12, fontWeight: 600, color: T.text }}
                      >
                        {c.criterion_name}
                      </span>
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: T.muted,
                        lineHeight: 1.6,
                        marginBottom: 6,
                      }}
                    >
                      {c.observation}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.blue,
                        fontStyle: "italic",
                      }}
                    >
                      → {c.implication}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Trade-off summary */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                  color: T.muted,
                  letterSpacing: "0.12em",
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                ⇄ Trade-off Analysis
              </div>
              <div
                style={{
                  padding: 14,
                  background: T.bg,
                  border: `1px solid ${T.border}`,
                  borderRadius: 4,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    color: T.text,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  "{audit.tradeoff_summary.headline}"
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {audit.tradeoff_summary.lines.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "8px 0",
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  >
                    <span style={{ fontSize: 12, color: T.muted }}>
                      {l.criterion_name}
                    </span>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: Math.min(Math.abs(l.delta_pct), 60),
                          height: 3,
                          background: l.direction === "gain" ? T.green : T.red,
                          borderRadius: 2,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "'DM Mono', monospace",
                          color: l.direction === "gain" ? T.green : T.red,
                          fontWeight: 600,
                        }}
                      >
                        {l.direction === "gain" ? "+" : "-"}
                        {Math.abs(l.delta_pct).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  background: `${T.blue}10`,
                  border: `1px solid ${T.blue}30`,
                  borderRadius: 4,
                  fontSize: 12,
                  color: T.text,
                  lineHeight: 1.7,
                }}
              >
                {audit.tradeoff_summary.overall_verdict}
              </div>
            </div>

            {/* Stress-test questions */}
            <div>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                  color: T.muted,
                  letterSpacing: "0.12em",
                  marginBottom: 12,
                  textTransform: "uppercase",
                }}
              >
                ◎ Stress-Test Questions
              </div>
              <div
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {audit.stress_test_questions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    style={{
                      padding: 14,
                      background: T.bg,
                      border: `1px solid ${T.borderHi}`,
                      borderRadius: 4,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        color: T.text,
                        lineHeight: 1.6,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ color: T.teal, marginRight: 6 }}>
                        Q{i + 1}.
                      </span>
                      {q.question}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: T.amber,
                        fontFamily: "'DM Mono', monospace",
                        marginBottom: 4,
                      }}
                    >
                      ↳ TARGETS: {q.targets_bias}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: T.muted,
                        fontStyle: "italic",
                      }}
                    >
                      {q.follow_up_hint}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function DecisionCockpit() {
  const STORAGE_KEY = "die_cockpit_v2";

  // Load from localStorage or use defaults
  const [weights, setWeights] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (saved.weights) return saved.weights;
    } catch {}
    return Object.fromEntries(MOCK_STATE.criteria.map((c) => [c.id, c.weight]));
  });

  const [auditOpen, setAuditOpen] = useState(false);
  const [scoringMethod, setScoringMethod] = useState("weighted_sum");

  // Persist weights
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ weights }));
    } catch {}
  }, [weights]);

  // Normalise weights to sum=1 when one changes
  const updateWeight = useCallback((id, newVal) => {
    setWeights((prev) => {
      const others = Object.entries(prev).filter(([k]) => k !== id);
      const otherSum = others.reduce((s, [, v]) => s + v, 0);
      const remainingBudget = 1 - newVal;
      const scale = otherSum > 0 ? remainingBudget / otherSum : 0;
      const next = { ...prev, [id]: newVal };
      others.forEach(([k, v]) => {
        next[k] = Math.max(0, v * scale);
      });
      return next;
    });
  }, []);

  // Criteria with current weights
  const activeCriteria = useMemo(
    () =>
      MOCK_STATE.criteria.map((c) => ({
        ...c,
        weight: weights[c.id] ?? c.weight,
      })),
    [weights],
  );

  // Scores
  const scores = useMemo(
    () => computeScores(MOCK_STATE.products, activeCriteria),
    [activeCriteria],
  );

  // Sorted products
  const rankedProducts = useMemo(() => {
    return [...MOCK_STATE.products].sort(
      (a, b) => (scores[b.id] ?? 0) - (scores[a.id] ?? 0),
    );
  }, [scores]);

  // Column maxes for sparkbars
  const colMaxes = useMemo(
    () =>
      Object.fromEntries(
        MOCK_STATE.criteria.map((c) => [
          c.id,
          Math.max(
            ...MOCK_STATE.products.map(
              (p) => p.features[c.id]?.numeric_value ?? 0,
            ),
          ),
        ]),
      ),
    [],
  );

  const totalWeight = Object.values(weights).reduce((s, v) => s + v, 0);

  return (
    <>
      {/* Font import */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,400&family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; color: ${T.text}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          fontFamily: "'Space Grotesk', sans-serif",
          color: T.text,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 32px",
            borderBottom: `1px solid ${T.border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: T.surface,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: `linear-gradient(135deg, ${T.amber}, ${T.teal})`,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 700,
                color: T.bg,
              }}
            >
              D
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "'DM Mono', monospace",
                  color: T.muted,
                  letterSpacing: "0.15em",
                }}
              >
                DECISION INTELLIGENCE ENGINE · SESSION {MOCK_STATE.session_id}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.text }}>
                {MOCK_STATE.title}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Method toggle */}
            <div
              style={{
                display: "flex",
                gap: 2,
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: 3,
              }}
            >
              {["weighted_sum", "topsis"].map((m) => (
                <button
                  key={m}
                  onClick={() => setScoringMethod(m)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 4,
                    border: "none",
                    background: scoringMethod === m ? T.teal : "none",
                    color: scoringMethod === m ? T.bg : T.muted,
                    cursor: "pointer",
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 10,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                  }}
                >
                  {m.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Audit button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setAuditOpen(true)}
              style={{
                padding: "8px 18px",
                background: `linear-gradient(135deg, ${T.amber}20, ${T.amber}10)`,
                border: `1px solid ${T.amber}50`,
                color: T.amber,
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
              }}
            >
              ◈ BIAS AUDIT
            </motion.button>
          </div>
        </div>

        {/* Main table area */}
        <div style={{ padding: "24px 32px" }}>
          {/* Weight sum warning */}
          <AnimatePresence>
            {Math.abs(totalWeight - 1) > 0.01 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  padding: "10px 16px",
                  background: `${T.amber}15`,
                  border: `1px solid ${T.amber}40`,
                  borderRadius: 6,
                  marginBottom: 16,
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  color: T.amber,
                }}
              >
                ⚠ Weights sum to {(totalWeight * 100).toFixed(1)}% — scores
                proportional but not normalised.
              </motion.div>
            )}
          </AnimatePresence>

          {/* Table container */}
          <div
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            {/* Column headers with sliders */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `200px 120px ${MOCK_STATE.criteria.map(() => "1fr").join(" ")}`,
                borderBottom: `1px solid ${T.borderHi}`,
                background: T.bg,
              }}
            >
              <div
                style={{
                  padding: "16px 20px",
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                  color: T.muted,
                  letterSpacing: "0.1em",
                }}
              >
                PRODUCT
              </div>
              <div
                style={{
                  padding: "16px 12px",
                  fontSize: 10,
                  fontFamily: "'DM Mono', monospace",
                  color: T.muted,
                  letterSpacing: "0.1em",
                  textAlign: "center",
                }}
              >
                SCORE
              </div>
              {activeCriteria.map((c) => (
                <div
                  key={c.id}
                  style={{
                    padding: "12px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    borderLeft: `1px solid ${T.border}`,
                  }}
                >
                  <div style={{ textAlign: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: T.text,
                        marginBottom: 2,
                      }}
                    >
                      {c.name}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontFamily: "'DM Mono', monospace",
                        color: c.direction === "minimize" ? T.red : T.green,
                        letterSpacing: "0.08em",
                      }}
                    >
                      {c.direction === "minimize" ? "↓ min" : "↑ max"}
                      {c.unit_hint ? ` · ${c.unit_hint}` : ""}
                    </div>
                  </div>
                  <VerticalSlider
                    value={weights[c.id] ?? c.weight}
                    onChange={(v) => updateWeight(c.id, v)}
                    label={c.name}
                  />
                </div>
              ))}
            </div>

            {/* Animated product rows */}
            <Reorder.Group
              axis="y"
              values={rankedProducts}
              onReorder={() => {}} // read-only — reorder driven by scores
              style={{ listStyle: "none" }}
            >
              <AnimatePresence>
                {rankedProducts.map((product, idx) => {
                  const score = scores[product.id] ?? 0;
                  const rank = idx + 1;
                  return (
                    <Reorder.Item
                      key={product.id}
                      value={product}
                      as="div"
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{
                        layout: { type: "spring", stiffness: 500, damping: 40 },
                        opacity: { duration: 0.2 },
                      }}
                      style={{
                        display: "grid",
                        gridTemplateColumns: `200px 120px ${MOCK_STATE.criteria.map(() => "1fr").join(" ")}`,
                        borderBottom: `1px solid ${T.border}`,
                        background:
                          rank === 1
                            ? `linear-gradient(90deg, ${T.amber}08, transparent)`
                            : idx % 2 === 0
                              ? T.surface
                              : T.bg,
                        cursor: "default",
                        transition: "background 0.3s",
                      }}
                    >
                      {/* Product name */}
                      <div
                        style={{
                          padding: "14px 20px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: rank === 1 ? T.amber : T.text,
                            transition: "color 0.3s",
                          }}
                        >
                          {product.name}
                        </div>
                        {rank === 1 && (
                          <div
                            style={{
                              fontSize: 9,
                              fontFamily: "'DM Mono', monospace",
                              color: T.amber,
                              letterSpacing: "0.12em",
                            }}
                          >
                            ★ TOP RANKED
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div
                        style={{
                          padding: "14px 12px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ScoreBadge score={score} rank={rank} />
                      </div>

                      {/* Feature cells */}
                      {activeCriteria.map((c) => {
                        const hv = product.features[c.id];
                        const v = hv?.numeric_value;
                        return (
                          <div
                            key={c.id}
                            style={{
                              padding: "10px 8px",
                              borderLeft: `1px solid ${T.border}`,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "center",
                              gap: 4,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 12,
                                fontFamily: "'DM Mono', monospace",
                                color: T.text,
                              }}
                            >
                              {hv?.raw_value ?? "—"}
                            </div>
                            {v !== undefined && v !== null && (
                              <Sparkbar
                                value={v}
                                max={colMaxes[c.id]}
                                direction={c.direction}
                              />
                            )}
                          </div>
                        );
                      })}
                    </Reorder.Item>
                  );
                })}
              </AnimatePresence>
            </Reorder.Group>
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontFamily: "'DM Mono', monospace",
                color: T.muted,
              }}
            >
              {MOCK_STATE.products.length} products ·{" "}
              {MOCK_STATE.criteria.length} criteria ·{" "}
              {scoringMethod.replace("_", " ").toUpperCase()} · weights
              persisted to localStorage
            </div>
            <button
              onClick={() => {
                const reset = Object.fromEntries(
                  MOCK_STATE.criteria.map((c) => [c.id, c.weight]),
                );
                setWeights(reset);
              }}
              style={{
                padding: "5px 14px",
                background: "none",
                border: `1px solid ${T.border}`,
                color: T.muted,
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
              }}
            >
              ↺ RESET WEIGHTS
            </button>
          </div>
        </div>
      </div>

      {/* Audit Sidebar */}
      <AuditSidebar
        audit={MOCK_AUDIT}
        isOpen={auditOpen}
        onClose={() => setAuditOpen(false)}
      />

      {/* Overlay */}
      <AnimatePresence>
        {auditOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAuditOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 99,
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
