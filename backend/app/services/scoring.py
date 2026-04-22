# app/services/scoring.py
"""
Scoring & Sensitivity Engine
─────────────────────────────
Deterministic, AI-free layer.

Public API
----------
score_weighted_sum(state)   → DecisionState   (default method)
score_topsis(state)         → DecisionState   (advanced method)
sensitivity_analysis(state) → SensitivityReport

All scores stored in DecisionState.scores are normalised to [0, 1]
relative to the current product set.
"""

from __future__ import annotations

import math
from typing import Literal

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

from app.models.decision import (
    DecisionState,
    OptimizationDirection,
    SessionStatus,
)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Output schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class TippingPoint(BaseModel):
    """
    For a single criterion, describes how much its weight must change
    before the current #1 and #2 products swap ranks.
    """
    criterion_id: str
    criterion_name: str
    current_weight: float = Field(ge=0.0, le=1.0)

    # How much the weight must change (signed: + means increase, - means decrease)
    delta_to_swap: float | None = Field(
        default=None,
        description=(
            "Signed weight delta that causes rank-1 and rank-2 to swap. "
            "None if no finite tipping point exists for this criterion."
        ),
    )
    # Weight value at the tipping point
    tipping_weight: float | None = Field(
        default=None,
        description="Absolute weight value at which the swap occurs.",
    )
    # Expressed as percentage of current weight for intuitive reading
    percent_change: float | None = Field(
        default=None,
        description=(
            "delta_to_swap / current_weight * 100. "
            "Large values (>50 %) mean the ranking is stable w.r.t. this criterion."
        ),
    )
    is_stable: bool = Field(
        default=True,
        description=(
            "True if no tipping point exists in [0, 1] "
            "(ranking is robust regardless of this weight)."
        ),
    )


class SensitivityReport(BaseModel):
    """Full sensitivity analysis output for one DecisionState."""

    session_id: str
    scoring_method: str

    # Rank 1 and rank 2 product names (for readability)
    rank1_product: str
    rank2_product: str

    tipping_points: list[TippingPoint]

    # Overall stability index: fraction of criteria for which the ranking is stable
    stability_index: float = Field(
        ge=0.0,
        le=1.0,
        description=(
            "Fraction of criteria where no tipping point exists in [0, 1]. "
            "1.0 = perfectly stable across all criteria."
        ),
    )
    # Minimum |delta| across all criteria (the most fragile criterion)
    most_fragile_criterion_id: str | None = None
    most_fragile_delta: float | None = None


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Internal helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _build_decision_matrix(state: DecisionState) -> tuple[pd.DataFrame, list[str]]:
    """
    Build a (products × criteria) DataFrame of raw numeric values.

    Returns
    -------
    df          : rows = products, columns = criterion ids, values = floats (NaN if missing)
    product_ids : list of product ids in the same row order as df
    """
    criterion_ids = [c.id for c in state.criteria]
    product_ids   = [p.id for p in state.products]

    rows = []
    for product in state.products:
        row = [product.get_numeric(cid) for cid in criterion_ids]
        rows.append(row)

    df = pd.DataFrame(rows, index=product_ids, columns=criterion_ids, dtype=float)
    return df, product_ids


def _fill_missing(df: pd.DataFrame) -> pd.DataFrame:
    """
    Replace NaN with column mean so missing features don't break vectorised ops.
    If an entire column is NaN (all products missing a criterion), fill with 0.
    """
    return df.fillna(df.mean()).fillna(0.0)


def _min_max_normalise(series: pd.Series) -> pd.Series:
    """Min-max normalise a series to [0, 1]. Constant series → 0.5."""
    lo, hi = series.min(), series.max()
    if math.isclose(lo, hi):
        return pd.Series([0.5] * len(series), index=series.index)
    return (series - lo) / (hi - lo)


def _direction_flip(df: pd.DataFrame, state: DecisionState) -> pd.DataFrame:
    """
    Flip MINIMIZE criteria so that, after this transform,
    higher values always mean "better" — a pre-condition for both WSM and TOPSIS ideal logic.
    """
    df = df.copy()
    for criterion in state.criteria:
        if criterion.direction == OptimizationDirection.MINIMIZE:
            col = df[criterion.id]
            lo, hi = col.min(), col.max()
            if math.isclose(lo, hi):
                df[criterion.id] = 0.5
            else:
                df[criterion.id] = hi - col + lo   # reflect around midpoint
    return df


def _normalise_matrix(df: pd.DataFrame) -> pd.DataFrame:
    """Apply min-max normalisation column-wise."""
    return df.apply(_min_max_normalise, axis=0)


def _weights_array(state: DecisionState) -> np.ndarray:
    """Return weights as a numpy array aligned with state.criteria order."""
    return np.array([c.weight for c in state.criteria], dtype=float)


def _scores_to_rankings(scores: dict[str, float]) -> list[str]:
    """Sort product ids by descending score."""
    return sorted(scores, key=lambda pid: scores[pid], reverse=True)


def _apply_scores_to_state(
    state: DecisionState,
    scores: dict[str, float],
    method: str,
) -> DecisionState:
    """Mutate state with scores/rankings and return it."""
    state.scores          = scores
    state.rankings        = _scores_to_rankings(scores)
    state.scoring_method  = method
    state.status          = SessionStatus.SCORED
    return state


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 1. Weighted Sum Model (WSM)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def score_weighted_sum(state: DecisionState) -> DecisionState:
    """
    Weighted Sum Model (WSM)
    ────────────────────────
    Steps:
      1. Build decision matrix (products × criteria).
      2. Fill NaN with column mean.
      3. Flip MINIMIZE criteria so higher = better.
      4. Min-max normalise each column to [0, 1].
      5. Multiply each column by its criterion weight.
      6. Sum rows → raw scores.
      7. Min-max normalise final scores to [0, 1].

    Result: a simple, highly interpretable score where
    each product's value is a weighted average of its
    normalised performance across all criteria.
    """
    if not state.products or not state.criteria:
        raise ValueError("DecisionState must have at least one product and one criterion.")

    df, product_ids = _build_decision_matrix(state)
    df = _fill_missing(df)
    df = _direction_flip(df, state)
    df = _normalise_matrix(df)

    weights = _weights_array(state)
    raw_scores = df.values @ weights          # (n_products,)

    # Normalise final scores to [0, 1]
    lo, hi = raw_scores.min(), raw_scores.max()
    if math.isclose(lo, hi):
        norm_scores = np.full_like(raw_scores, 0.5)
    else:
        norm_scores = (raw_scores - lo) / (hi - lo)

    scores = {pid: float(round(s, 6)) for pid, s in zip(product_ids, norm_scores)}
    return _apply_scores_to_state(state, scores, method="weighted_sum")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 2. TOPSIS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def score_topsis(state: DecisionState) -> DecisionState:
    """
    TOPSIS — Technique for Order of Preference by Similarity to Ideal Solution
    ────────────────────────────────────────────────────────────────────────────
    Standard 6-step algorithm:

      1. Build decision matrix X (products × criteria).
      2. Fill NaN with column mean.
      3. Vector-normalise each column:
            r_ij = x_ij / sqrt(Σ x_kj²)
      4. Weighted normalised matrix: v_ij = w_j * r_ij
      5. Determine ideal best (A+) and ideal worst (A-):
            A+_j = max(v_ij) if MAXIMIZE else min(v_ij)
            A-_j = min(v_ij) if MAXIMIZE else max(v_ij)
      6. Euclidean distance from each product to A+ and A-:
            D+_i = sqrt(Σ (v_ij - A+_j)²)
            D-_i = sqrt(Σ (v_ij - A-_j)²)
      7. Relative closeness:
            C_i = D-_i / (D+_i + D-_i)   ∈ [0, 1]
            Higher C_i = closer to ideal = better.

    The C_i values are already in [0, 1] by construction (no extra normalisation needed).
    """
    if not state.products or not state.criteria:
        raise ValueError("DecisionState must have at least one product and one criterion.")

    df, product_ids = _build_decision_matrix(state)
    df = _fill_missing(df)

    # Step 3: Vector normalisation (column-wise)
    col_norms = np.sqrt((df.values ** 2).sum(axis=0))
    col_norms[col_norms == 0] = 1.0                    # avoid division by zero
    r = df.values / col_norms                          # normalised matrix

    # Step 4: Weighted normalised matrix
    weights = _weights_array(state)
    v = r * weights                                    # broadcast over rows

    # Step 5: Ideal best / worst per criterion
    a_plus  = np.zeros(len(state.criteria))
    a_minus = np.zeros(len(state.criteria))

    for j, criterion in enumerate(state.criteria):
        if criterion.direction == OptimizationDirection.MAXIMIZE:
            a_plus[j]  = v[:, j].max()
            a_minus[j] = v[:, j].min()
        else:  # MINIMIZE — closer to 0 is "ideal best"
            a_plus[j]  = v[:, j].min()
            a_minus[j] = v[:, j].max()

    # Step 6: Euclidean distances
    d_plus  = np.sqrt(((v - a_plus)  ** 2).sum(axis=1))
    d_minus = np.sqrt(((v - a_minus) ** 2).sum(axis=1))

    # Step 7: Relative closeness
    denom = d_plus + d_minus
    # Guard: if a product is equidistant from both ideals, assign 0.5
    denom[denom == 0] = 1.0
    closeness = d_minus / denom

    scores = {pid: float(round(c, 6)) for pid, c in zip(product_ids, closeness)}
    return _apply_scores_to_state(state, scores, method="topsis")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 3. Sensitivity Analysis — Tipping Point Detection
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def _rescore(
    state: DecisionState,
    overrides: dict[str, float],
    method: Literal["weighted_sum", "topsis"],
) -> dict[str, float]:
    """
    Rescore using the given method but with weight overrides applied.
    Returns a map of product_id → score without mutating state.
    """
    # Build a shallow clone with patched weights
    patched_criteria = []
    for c in state.criteria:
        if c.id in overrides:
            copy = c.model_copy(update={"weight": overrides[c.id]})
        else:
            copy = c
        patched_criteria.append(copy)

    patched_state = state.model_copy(update={"criteria": patched_criteria})

    if method == "topsis":
        result = score_topsis(patched_state)
    else:
        result = score_weighted_sum(patched_state)

    return result.scores  # type: ignore[return-value]


def _find_tipping_point_for_criterion(
    state: DecisionState,
    criterion_index: int,
    rank1_id: str,
    rank2_id: str,
    method: Literal["weighted_sum", "topsis"],
    resolution: float = 0.001,
) -> TippingPoint:
    """
    Binary-search / linear-scan to find the weight delta at which
    rank1 and rank2 swap for criterion at criterion_index.

    Strategy
    --------
    When we change weight w_k by Δ, the total weight budget shifts.
    We redistribute the surplus/deficit proportionally among the other criteria
    to keep Σ weights = 1.0. This is the most realistic model of user behaviour
    (adjusting one slider while the rest scale accordingly).

    We scan Δ ∈ [-w_k, 1 - w_k] (keeping w_k ∈ [0, 1]) in small steps.
    """
    criterion = state.criteria[criterion_index]
    w_k = criterion.weight
    other_indices = [i for i in range(len(state.criteria)) if i != criterion_index]
    other_weight_sum = sum(state.criteria[i].weight for i in other_indices)

    def scores_for_delta(delta: float) -> dict[str, float]:
        new_wk = w_k + delta
        if other_weight_sum > 0:
            scale = (1.0 - new_wk) / other_weight_sum
        else:
            scale = 1.0

        overrides: dict[str, float] = {criterion.id: new_wk}
        for i in other_indices:
            overrides[state.criteria[i].id] = state.criteria[i].weight * scale

        return _rescore(state, overrides, method)

    # Current score gap (rank1 should be ahead)
    base_scores = state.scores or {}
    s1_base = base_scores.get(rank1_id, 0.0)
    s2_base = base_scores.get(rank2_id, 0.0)
    initial_gap = s1_base - s2_base          # positive means rank1 is ahead

    # Determine search range
    delta_min = -w_k + resolution            # keep w_k > 0
    delta_max = 1.0 - w_k - resolution       # keep w_k < 1

    if delta_min >= delta_max:
        return TippingPoint(
            criterion_id=criterion.id,
            criterion_name=criterion.name,
            current_weight=w_k,
            is_stable=True,
        )

    # Linear scan with coarse step, then refine with bisection
    step = max(resolution, (delta_max - delta_min) / 500)
    deltas = np.arange(delta_min, delta_max + step, step)

    swap_delta: float | None = None

    for delta in deltas:
        scores = scores_for_delta(float(delta))
        s1 = scores.get(rank1_id, 0.0)
        s2 = scores.get(rank2_id, 0.0)
        if s2 >= s1:                         # swap detected
            swap_delta = float(delta)
            break

    if swap_delta is None:
        return TippingPoint(
            criterion_id=criterion.id,
            criterion_name=criterion.name,
            current_weight=w_k,
            is_stable=True,
        )

    # Bisection refinement between (swap_delta - step) and swap_delta
    lo = swap_delta - step
    hi = swap_delta
    for _ in range(20):                      # ~20 iterations → ~1e-6 precision
        mid = (lo + hi) / 2
        scores = scores_for_delta(mid)
        s1 = scores.get(rank1_id, 0.0)
        s2 = scores.get(rank2_id, 0.0)
        if s2 >= s1:
            hi = mid
        else:
            lo = mid

    refined_delta = (lo + hi) / 2
    tipping_weight = round(w_k + refined_delta, 6)
    percent = (refined_delta / w_k * 100) if w_k > 0 else float("inf")

    return TippingPoint(
        criterion_id=criterion.id,
        criterion_name=criterion.name,
        current_weight=round(w_k, 6),
        delta_to_swap=round(refined_delta, 6),
        tipping_weight=tipping_weight,
        percent_change=round(percent, 2),
        is_stable=False,
    )


def sensitivity_analysis(state: DecisionState) -> SensitivityReport:
    """
    Tipping-Point Sensitivity Analysis
    ────────────────────────────────────
    For each criterion, determine how much its weight would need to change
    (with other weights scaled proportionally to keep Σ = 1) before the
    current #1 and #2 ranked products swap positions.

    Requires state.scores and state.rankings to be populated
    (i.e., call score_weighted_sum or score_topsis first).

    Returns a SensitivityReport with per-criterion TippingPoint objects
    and an overall stability index.
    """
    if not state.scores or not state.rankings or len(state.rankings) < 2:
        raise ValueError(
            "sensitivity_analysis requires a scored DecisionState with at least 2 products. "
            "Call score_weighted_sum() or score_topsis() first."
        )

    method: Literal["weighted_sum", "topsis"] = (
        "topsis" if state.scoring_method == "topsis" else "weighted_sum"
    )

    rank1_id = state.rankings[0]
    rank2_id = state.rankings[1]
    rank1_name = state.product_by_id(rank1_id).name  # type: ignore[union-attr]
    rank2_name = state.product_by_id(rank2_id).name  # type: ignore[union-attr]

    tipping_points: list[TippingPoint] = []

    for i in range(len(state.criteria)):
        tp = _find_tipping_point_for_criterion(
            state=state,
            criterion_index=i,
            rank1_id=rank1_id,
            rank2_id=rank2_id,
            method=method,
        )
        tipping_points.append(tp)

    # Stability index
    stable_count = sum(1 for tp in tipping_points if tp.is_stable)
    stability_index = stable_count / len(tipping_points) if tipping_points else 1.0

    # Most fragile criterion (smallest |delta_to_swap|)
    fragile = [tp for tp in tipping_points if not tp.is_stable]
    most_fragile: TippingPoint | None = None
    if fragile:
        most_fragile = min(fragile, key=lambda tp: abs(tp.delta_to_swap))  # type: ignore[arg-type]

    return SensitivityReport(
        session_id=str(state.session_id),
        scoring_method=state.scoring_method or method,
        rank1_product=rank1_name,
        rank2_product=rank2_name,
        tipping_points=tipping_points,
        stability_index=round(stability_index, 4),
        most_fragile_criterion_id=most_fragile.criterion_id if most_fragile else None,
        most_fragile_delta=most_fragile.delta_to_swap if most_fragile else None,
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Convenience: unified entry point
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def score(
    state: DecisionState,
    method: Literal["weighted_sum", "topsis"] = "weighted_sum",
) -> DecisionState:
    """Unified entry point. Delegates to the chosen scoring method."""
    if method == "topsis":
        return score_topsis(state)
    return score_weighted_sum(state)
