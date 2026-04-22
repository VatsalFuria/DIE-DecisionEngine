# app/routers/scoring.py

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.models.decision import DecisionState
from app.services.scoring import (
    SensitivityReport,
    score,
    sensitivity_analysis,
)

router = APIRouter(prefix="/api/v1", tags=["scoring"])


# ─────────────────────────────────────────────────────────────────
# Request / Response contracts
# ─────────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    decision_state: DecisionState
    method: Literal["weighted_sum", "topsis"] = Field(
        default="weighted_sum",
        description=(
            "'weighted_sum' — fast, interpretable (default). "
            "'topsis' — distance-to-ideal, better for many competing criteria."
        ),
    )


class ScoreResponse(BaseModel):
    decision_state: DecisionState
    method_used: str


class SensitivityRequest(BaseModel):
    decision_state: DecisionState


# ─────────────────────────────────────────────────────────────────
# Endpoints
# ─────────────────────────────────────────────────────────────────

@router.post(
    "/score",
    response_model=ScoreResponse,
    status_code=status.HTTP_200_OK,
    summary="Score and rank products in a DecisionState",
    description=(
        "Accepts a harmonized DecisionState and a scoring method. "
        "Returns the same state enriched with `scores`, `rankings`, and `scoring_method`. "
        "All scores are normalised to [0, 1] relative to the current product set."
    ),
)
def score_endpoint(body: ScoreRequest) -> ScoreResponse:
    try:
        scored_state = score(body.decision_state, method=body.method)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return ScoreResponse(
        decision_state=scored_state,
        method_used=scored_state.scoring_method or body.method,
    )


@router.post(
    "/sensitivity",
    response_model=SensitivityReport,
    status_code=status.HTTP_200_OK,
    summary="Run tipping-point sensitivity analysis",
    description=(
        "Requires a *scored* DecisionState (call /score first). "
        "For each criterion, calculates how much its weight would need to change "
        "before the #1 and #2 products swap ranks. "
        "Returns per-criterion tipping points and an overall stability index."
    ),
)
def sensitivity_endpoint(body: SensitivityRequest) -> SensitivityReport:
    try:
        report = sensitivity_analysis(body.decision_state)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    return report
