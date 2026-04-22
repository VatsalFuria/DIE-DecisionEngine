# app/services/auditor.py
"""
Decision Auditor
────────────────
The "Killer Feature" of DIE: an LLM-powered critical auditor that analyses
the user's revealed preferences (weights + final rankings) for internal
contradictions, calculates objective trade-off deltas, and generates
pointed stress-test questions to surface hidden bias.

Public API
----------
audit(state: DecisionState) -> AuditReport

Depends on
----------
- app.models.decision.DecisionState  (with populated scores / rankings)
- instructor + anthropic              (same pattern as harmonizer.py)
"""

from __future__ import annotations

import math
import statistics
from typing import Literal

import anthropic
import instructor
from pydantic import BaseModel, Field

from app.models.decision import (
    Criterion,
    DecisionState,
    OptimizationDirection,
    Product,
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LLM client (instructor-patched, same pattern as harmonizer.py)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

_raw_client = anthropic.Anthropic()
client = instructor.from_anthropic(_raw_client)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Output schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class PreferenceContradiction(BaseModel):
    """
    A single detected tension between a stated preference (weight) and
    the implied preference revealed by which products rank highest.
    """
    criterion_name: str = Field(
        ...,
        description="The criterion whose stated weight contradicts the revealed choice.",
    )
    severity: Literal["low", "medium", "high"] = Field(
        ...,
        description=(
            "low   — minor inconsistency, worth noting. "
            "medium — clear tension the user should reconsider. "
            "high   — the stated priority is flatly contradicted by the top-ranked product."
        ),
    )
    observation: str = Field(
        ...,
        description=(
            "One concrete, data-backed sentence describing the contradiction. "
            "Must reference specific criterion values or rank positions. "
            "Example: 'Price is your #1 priority (40% weight), yet your top-ranked product "
            "costs $400 more than the dataset average.'"
        ),
    )
    implication: str = Field(
        ...,
        description=(
            "One sentence explaining what this means for the decision — "
            "NOT a recommendation, just the logical consequence."
        ),
    )


class TradeoffLine(BaseModel):
    """Quantified gain/loss the user accepts by choosing the top-ranked product."""
    criterion_name: str
    direction: Literal["gain", "loss", "neutral"]
    # Human-readable delta, e.g. "+23% above average" or "50% more expensive"
    delta_description: str = Field(
        ...,
        description=(
            "Concise, quantified description of the delta vs. the dataset average. "
            "Always include a specific number or percentage. "
            "Example: 'pays 48% above the dataset average price'"
        ),
    )
    # Raw percentage for programmatic use
    delta_pct: float = Field(
        ...,
        description="Signed percentage delta vs. dataset mean. Positive = above mean.",
    )


class TradeoffSummary(BaseModel):
    """
    Objective cost/benefit breakdown of choosing the #1 ranked product
    versus the dataset average.
    """
    chosen_product: str
    headline: str = Field(
        ...,
        description=(
            "One punchy sentence summarising the core trade-off in plain English. "
            "Example: 'Alpha buys you class-leading build quality at a significant price premium.'"
        ),
    )
    lines: list[TradeoffLine] = Field(
        ...,
        description="One line per criterion describing the gain or loss vs. dataset average.",
    )
    overall_verdict: str = Field(
        ...,
        description=(
            "2-3 sentences: is this a good trade given the stated weights? "
            "Be direct; do not hedge with 'it depends'."
        ),
    )


class StressTestQuestion(BaseModel):
    """A single probing question designed to surface or challenge a bias."""
    question: str = Field(
        ...,
        description=(
            "A specific, pointed question the user should honestly answer. "
            "Must reference concrete numbers or product names from the data. "
            "Avoid vague questions like 'Are you sure about your priorities?'"
        ),
    )
    targets_bias: str = Field(
        ...,
        description="The specific bias or assumption this question is designed to challenge.",
    )
    follow_up_hint: str = Field(
        ...,
        description=(
            "One sentence suggesting what a 'no' or 'actually no' answer would imply "
            "for the user's weights or final choice."
        ),
    )


class AuditReport(BaseModel):
    """
    The complete output of the Decision Auditor.
    Returned by audit() and exposed via POST /api/v1/audit.
    """
    session_id: str
    chosen_product: str = Field(description="Name of the #1 ranked product.")
    runner_up: str       = Field(description="Name of the #2 ranked product.")

    # ── Task 1 ──
    contradictions: list[PreferenceContradiction] = Field(
        default_factory=list,
        description=(
            "Detected tensions between stated weights and revealed preferences. "
            "Empty list if the decision is internally consistent."
        ),
    )
    contradiction_summary: str = Field(
        default="No contradictions detected.",
        description="One-sentence overall assessment of internal consistency.",
    )

    # ── Task 2 ──
    tradeoff_summary: TradeoffSummary

    # ── Task 3 ──
    stress_test_questions: list[StressTestQuestion] = Field(
        ...,
        min_length=2,
        max_length=3,
        description="2–3 questions to challenge the user's assumptions.",
    )

    # ── Meta ──
    audit_confidence: float = Field(
        ge=0.0, le=1.0,
        description=(
            "LLM's self-assessed confidence in the audit quality [0,1]. "
            "May be reduced when data is sparse or features are mostly qualitative."
        ),
    )
    auditor_notes: list[str] = Field(
        default_factory=list,
        description="Any caveats, data-quality warnings, or assumptions the LLM flagged.",
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Pre-computation helpers (deterministic, done before the LLM call)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _pct_delta(value: float, mean: float) -> float:
    """Signed % delta of value vs mean.  Returns 0.0 if mean is ~0."""
    if math.isclose(mean, 0.0, abs_tol=1e-9):
        return 0.0
    return round((value - mean) / abs(mean) * 100, 1)


def _criterion_stats(state: DecisionState) -> list[dict]:
    """
    For each criterion compute: mean, min, max across all products,
    plus the top-ranked product's value.
    Returns a list of dicts, one per criterion, ready for the prompt.
    """
    top_product = state.product_by_id(state.rankings[0])  # type: ignore[index]
    stats = []

    for c in state.criteria:
        values = [
            p.get_numeric(c.id)
            for p in state.products
            if p.get_numeric(c.id) is not None
        ]
        if not values:
            continue

        mean_v   = statistics.mean(values)
        top_v    = top_product.get_numeric(c.id) if top_product else None
        delta    = _pct_delta(top_v, mean_v) if top_v is not None else None
        unit     = next(
            (p.features[c.id].unit for p in state.products if c.id in p.features and p.features[c.id].unit),
            None,
        )

        stats.append({
            "criterion_id":   c.id,
            "criterion_name": c.name,
            "weight":         c.weight,
            "direction":      c.direction.value,
            "unit":           unit or "",
            "mean":           round(mean_v, 3),
            "min":            round(min(values), 3),
            "max":            round(max(values), 3),
            "top_value":      round(top_v, 3) if top_v is not None else None,
            "top_vs_mean_pct": delta,
            # Revealed preference signal: is the top product performing
            # well or poorly on this criterion relative to its weight?
            "weight_rank":    None,   # filled below
        })

    # Weight rank (1 = most important)
    sorted_by_weight = sorted(stats, key=lambda x: x["weight"], reverse=True)
    for rank, s in enumerate(sorted_by_weight, 1):
        s["weight_rank"] = rank

    return stats


def _build_product_table(state: DecisionState) -> str:
    """
    Build a compact text table of all products × criteria for the prompt.
    Includes raw values, numeric values, units, and the final score/rank.
    """
    header_cols = ["Rank", "Product", "Score"]
    for c in state.criteria:
        header_cols.append(f"{c.name} (w={c.weight:.0%}, {c.direction.value[:3]})")

    lines: list[str] = ["  ".join(header_cols)]
    lines.append("-" * len(lines[0]))

    pid_to_rank = {pid: i + 1 for i, pid in enumerate(state.rankings or [])}

    for product in sorted(state.products, key=lambda p: pid_to_rank.get(p.id, 99)):
        rank  = pid_to_rank.get(product.id, "?")
        score = state.scores.get(product.id, 0.0) if state.scores else 0.0
        row   = [str(rank), product.name, f"{score:.3f}"]
        for c in state.criteria:
            hv = product.features.get(c.id)
            if hv is None:
                row.append("N/A")
            elif hv.numeric_value is not None:
                unit = f" {hv.unit}" if hv.unit else ""
                row.append(f"{hv.numeric_value}{unit} (raw: {hv.raw_value})")
            else:
                row.append(hv.raw_value)
        lines.append("  ".join(row))

    return "\n".join(lines)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# System prompt
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SYSTEM_PROMPT = """\
You are the Decision Auditor — a ruthlessly honest critical thinking partner embedded in a
Multi-Criteria Decision Analysis system. You do NOT recommend products. Your sole job is to:

  1. Detect contradictions between STATED priorities (weights) and REVEALED preferences (rankings).
  2. Quantify the trade-offs the user is implicitly accepting by choosing the top-ranked product.
  3. Generate incisive stress-test questions that force the user to confront hidden biases.

## Your operating principles

**Be concrete, not vague.**
Every observation must cite specific numbers from the data provided.
"Price is your top priority yet the chosen product is 48% above the average price" — GOOD.
"You seem to care about price" — BAD.

**Be direct, not diplomatic.**
Call contradictions what they are. Use words like "contradicts", "undermines", "conflicts with".
Do not soften contradictions into neutral observations.

**Separate analysis from recommendation.**
You are auditing the decision process, not telling the user what to buy.
Never say "you should choose X" or "X is the better option".

**Contradiction severity guide:**
- high   : The top-ranked product performs in the bottom half of the dataset on the user's
           highest-weighted criterion (weight > 0.3).
- medium : The top product is below the dataset average on a criterion weighted > 0.2,
           OR the user's top-weighted criterion ranks the chosen product outside the top 2.
- low    : Minor inconsistency — e.g. the top product is marginally below average on a
           moderately-weighted criterion.

**Trade-off deltas:**
- direction="minimize" criteria: a positive delta_pct means the chosen product is MORE
  (worse) than average. Frame this as a "loss" (cost, penalty).
- direction="maximize" criteria: a positive delta_pct means the chosen product is MORE
  (better) than average. Frame this as a "gain".

**Stress-test questions:**
- Must be answerable with Yes / No or a number.
- Must reference specific product names or percentages from the data.
- Must target a bias that is visible in the data (anchoring, status-quo, brand preference, etc.).
- 2–3 questions total; more is not better.

## Output contract
Return ONLY the JSON object matching the AuditReport schema. No preamble or markdown.
"""


def _build_user_prompt(
    state: DecisionState,
    stats: list[dict],
    product_table: str,
) -> str:
    top_product   = state.product_by_id(state.rankings[0])   # type: ignore[index]
    runnerup      = state.product_by_id(state.rankings[1])   # type: ignore[index]
    top_score     = state.scores[state.rankings[0]] if state.scores else 0.0      # type: ignore[index]
    runnerup_score= state.scores[state.rankings[1]] if state.scores else 0.0      # type: ignore[index]

    weight_block = "\n".join(
        f"  {i+1}. {s['criterion_name']}: weight={s['weight']:.0%}  "
        f"direction={s['direction']}  "
        f"chosen_value={s['top_value']} {s['unit']}  "
        f"dataset_mean={s['mean']} {s['unit']}  "
        f"chosen_vs_mean={s['top_vs_mean_pct']:+.1f}%"
        for i, s in enumerate(sorted(stats, key=lambda x: x["weight"], reverse=True))
        if s["top_value"] is not None
    )

    return f"""## Decision Context
Category      : {state.title}
Scoring method: {state.scoring_method or "weighted_sum"}
Total products: {len(state.products)}
Total criteria: {len(state.criteria)}

## Criteria weights & chosen-product performance (sorted by weight, highest first)
{weight_block}

## Full product × criterion matrix
{product_table}

## Rankings
  #1 (chosen)  : {top_product.name if top_product else "?"} — score {top_score:.4f}
  #2 (runner-up): {runnerup.name if runnerup else "?"}   — score {runnerup_score:.4f}
  Score gap     : {top_score - runnerup_score:.4f}

## Your tasks
1. Identify all PREFERENCE CONTRADICTIONS between the stated weights and the chosen product's
   actual performance on those criteria. Be specific about which products and which numbers.
2. Write a TRADE-OFF SUMMARY for choosing product #{top_product.name if top_product else '?'}:
   for each criterion compute gain or loss vs the dataset average.
3. Generate exactly 2–3 STRESS-TEST QUESTIONS.

Return ONLY the AuditReport JSON.
"""


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Public entry point
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def audit(
    state: DecisionState,
    model: str = "claude-sonnet-4-20250514",
) -> AuditReport:
    """
    Run the Decision Auditor on a scored DecisionState.

    Parameters
    ----------
    state   : A DecisionState with populated .scores and .rankings (call score() first).
    model   : Claude model string.

    Returns
    -------
    AuditReport — structured audit with contradictions, trade-offs, and stress-test questions.

    Raises
    ------
    ValueError  : If state is not scored or has fewer than 2 products.
    instructor.exceptions.InstructorRetryException : If LLM fails after retries.
    """
    if not state.scores or not state.rankings or len(state.rankings) < 2:
        raise ValueError(
            "audit() requires a scored DecisionState with ≥2 products. "
            "Call score_weighted_sum() or score_topsis() first."
        )

    # ── Pre-compute deterministic context (cheaper than asking LLM to do math) ──
    stats         = _criterion_stats(state)
    product_table = _build_product_table(state)
    user_prompt   = _build_user_prompt(state, stats, product_table)

    # ── LLM call ──
    report: AuditReport = client.messages.create(
        model=model,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
        response_model=AuditReport,
        max_retries=2,
    )

    # ── Backfill deterministic fields the LLM doesn't need to infer ──
    top_product = state.product_by_id(state.rankings[0])
    runner_up   = state.product_by_id(state.rankings[1])
    report.session_id    = str(state.session_id)
    report.chosen_product = top_product.name if top_product else "Unknown"
    report.runner_up      = runner_up.name   if runner_up   else "Unknown"

    return report
