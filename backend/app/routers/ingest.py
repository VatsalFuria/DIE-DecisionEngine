# app/routers/ingest.py

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.models.decision import DecisionState
from app.services.harmonizer import (
    ExtractionResult,
    assemble_decision_state,
    extract_and_harmonize,
)

router = APIRouter(prefix="/api/v1", tags=["ingestion"])


# ---------------------------------------------------------------------------
# Request / Response contracts
# ---------------------------------------------------------------------------

class SmartPasteRequest(BaseModel):
    category: str = Field(
        ...,
        min_length=1,
        description="Product category for context, e.g. 'Laptops', 'Running Shoes'.",
        examples=["Laptops"],
    )
    raw_text: str = Field(
        ...,
        min_length=20,
        description="Unstructured text block: product specs, blog copy, review snippets, etc.",
    )
    model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Claude model to use for extraction.",
    )


class SmartPasteResponse(BaseModel):
    decision_state: DecisionState
    extraction_debug: ExtractionResult | None = Field(
        default=None,
        description="Raw LLM output before assembly — included in non-prod environments.",
    )


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.post(
    "/process-smart-paste",
    response_model=SmartPasteResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest unstructured text and return a harmonized DecisionState",
    description=(
        "Accepts a category name and a block of raw product text. "
        "Uses Claude (via instructor) to extract products and features, "
        "perform semantic harmonization (unit normalization + qualitative→numeric mapping), "
        "and return a fully typed DecisionState ready for TOPSIS scoring."
    ),
)
async def process_smart_paste(
    body: SmartPasteRequest,
    debug: bool = False,
) -> SmartPasteResponse:
    try:
        extraction = extract_and_harmonize(
            category=body.category,
            raw_text=body.raw_text,
            model=body.model,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"LLM extraction failed after retries: {exc}",
        ) from exc

    decision_state = assemble_decision_state(
        category=body.category,
        extraction=extraction,
    )

    return SmartPasteResponse(
        decision_state=decision_state,
        extraction_debug=extraction if debug else None,
    )