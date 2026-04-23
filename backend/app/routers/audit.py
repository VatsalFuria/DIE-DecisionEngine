# app/routers/audit.py

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.models.decision import DecisionState
from app.services.auditor import AuditReport, audit

router = APIRouter(prefix="/api/v1", tags=["audit"])


class AuditRequest(BaseModel):
    decision_state: DecisionState = Field(
        ...,
        description=(
            "A fully scored DecisionState (scores + rankings must be populated). "
            "Call POST /api/v1/score first if needed."
        ),
    )


@router.post(
    "/audit",
    response_model=AuditReport,
    status_code=status.HTTP_200_OK,
    summary="Run the Decision Auditor on a scored DecisionState",
    description=(
        "Analyses the user's stated weights against the revealed preferences implied by "
        "the final rankings. Returns: preference contradictions with severity ratings, "
        "a quantified trade-off summary for the top-ranked product, and 2–3 stress-test "
        "questions to surface hidden bias. Requires a scored DecisionState."
    ),
)
async def audit_endpoint(body: AuditRequest) -> AuditReport:
    try:
        return audit(body.decision_state)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Auditor LLM call failed: {exc}",
        ) from exc
