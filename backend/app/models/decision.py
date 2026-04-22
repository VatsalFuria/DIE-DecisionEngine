# app/models/decision.py

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class OptimizationDirection(str, Enum):
    """Whether higher or lower values are preferred for this criterion."""
    MAXIMIZE = "maximize"   # e.g. battery life, RAM
    MINIMIZE = "minimize"   # e.g. price, delivery time, weight


class CriterionType(str, Enum):
    """The data type of the criterion, used to guide LLM harmonization."""
    NUMERIC     = "numeric"      # raw string converts to a float (e.g. "2 days" → 48.0)
    CATEGORICAL = "categorical"  # ordinal/nominal label (e.g. "Good / Better / Best")
    BOOLEAN     = "boolean"      # binary flag (e.g. "yes" / "no" → 1.0 / 0.0)


class SessionStatus(str, Enum):
    """Lifecycle stage of a DecisionState session."""
    PENDING      = "pending"       # created, no products yet
    HARMONIZING  = "harmonizing"   # LLM is processing raw features
    READY        = "ready"         # harmonized, awaiting scoring
    SCORED       = "scored"        # TOPSIS / weighted-sum complete
    ERROR        = "error"         # something went wrong


# ---------------------------------------------------------------------------
# Sub-models
# ---------------------------------------------------------------------------

class HarmonizedValue(BaseModel):
    """
    The atomic unit of Semantic Harmonization.

    Stores both the original string from the data source and the
    LLM-derived numeric representation, along with metadata about
    the conversion that was applied.

    Example:
        raw_value      = "2 days"
        numeric_value  = 48.0
        unit           = "hours"
        conversion_note = "Converted 2 days → 48 hours for comparison"
    """

    raw_value: str = Field(
        ...,
        description="The original, unmodified string from the data source.",
        examples=["2 days", "256 GB", "5 star", "yes"],
    )
    numeric_value: float | None = Field(
        default=None,
        description=(
            "The canonical numeric representation after harmonization. "
            "None if the criterion is CATEGORICAL and no ordinal mapping exists."
        ),
        examples=[48.0, 256.0, 5.0, 1.0],
    )
    unit: str | None = Field(
        default=None,
        description="The normalised unit of numeric_value after conversion.",
        examples=["hours", "GB", None],
    )
    conversion_note: str | None = Field(
        default=None,
        description="Free-text explanation of how the LLM derived numeric_value.",
        examples=["Converted 2 days → 48 hours", "Mapped 'yes' → 1.0"],
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description=(
            "LLM confidence in the conversion [0, 1]. "
            "Values below 0.6 should be flagged for human review."
        ),
    )


# ---------------------------------------------------------------------------
# Core domain models
# ---------------------------------------------------------------------------

class Criterion(BaseModel):
    """
    A single evaluation axis.

    Carries everything the TOPSIS/Weighted-Sum engine needs to know
    about how to handle a column of product data:
      - how important it is (weight)
      - whether bigger is better (direction)
      - what kind of data it holds (criterion_type)
    """

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Stable identifier, used as the key in Product.features.",
    )
    name: str = Field(
        ...,
        min_length=1,
        description="Human-readable label shown in the UI.",
        examples=["Price", "Battery Life", "Warranty"],
    )
    description: str | None = Field(
        default=None,
        description="Optional longer description, fed to the LLM as context.",
    )
    weight: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "Relative importance of this criterion. "
            "Weights across all criteria in a DecisionState should sum to 1.0 "
            "(enforced at the DecisionState level, not here)."
        ),
        examples=[0.35, 0.20],
    )
    direction: OptimizationDirection = Field(
        ...,
        description="Whether the scoring engine should maximise or minimise this criterion.",
    )
    criterion_type: CriterionType = Field(
        ...,
        description="Drives the LLM harmonization strategy for raw feature strings.",
    )
    unit_hint: str | None = Field(
        default=None,
        description=(
            "The target unit for harmonization. "
            "Prompts the LLM to normalise all values to this unit. "
            "E.g. 'hours' ensures '2 days' and '36 hours' both become floats in hours."
        ),
        examples=["hours", "USD", "GB"],
    )
    ordinal_scale: list[str] | None = Field(
        default=None,
        description=(
            "Ordered list (lowest → highest) for CATEGORICAL criteria. "
            "E.g. ['Poor', 'Average', 'Good', 'Excellent']. "
            "The harmonizer maps each label to its 0-based index."
        ),
    )

    @field_validator("weight")
    @classmethod
    def weight_precision(cls, v: float) -> float:
        """Clamp floating-point noise; 4 decimal places is sufficient."""
        return round(v, 4)


class Product(BaseModel):
    """
    A candidate being evaluated.

    Maintains a strict two-layer representation:
      - raw_features  : what came in from the source (CSV row, LLM extraction, API)
      - features      : what the harmonizer produced — keyed by Criterion.id
    """

    id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
    )
    name: str = Field(
        ...,
        min_length=1,
        examples=["MacBook Pro 14", "Dell XPS 15"],
    )
    source_url: str | None = Field(
        default=None,
        description="Origin URL, e.g. product page or scraped listing.",
    )
    raw_features: dict[str, str] = Field(
        default_factory=dict,
        description=(
            "Unmodified key→value pairs from the data source. "
            "Keys are free-form (column headers, scraped labels). "
            "Preserved for auditability and re-harmonization."
        ),
        examples=[{"price": "$1,299", "delivery": "2 days", "ram": "16GB"}],
    )
    features: dict[str, HarmonizedValue] = Field(
        default_factory=dict,
        description=(
            "Harmonized feature values, keyed by Criterion.id. "
            "Populated by the harmonization pipeline; empty until that stage completes."
        ),
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary extra data (images, tags, notes) that doesn't affect scoring.",
    )

    def get_numeric(self, criterion_id: str) -> float | None:
        """Convenience accessor for the scoring engine."""
        hv = self.features.get(criterion_id)
        return hv.numeric_value if hv else None


# ---------------------------------------------------------------------------
# Top-level session model
# ---------------------------------------------------------------------------

class DecisionState(BaseModel):
    """
    The complete, serialisable state of one decision session.

    This is the single object persisted to the database, passed
    between FastAPI endpoints, and hydrated into the Next.js frontend.
    """

    session_id: uuid.UUID = Field(
        default_factory=uuid.uuid4,
        description="Globally unique session identifier.",
    )
    title: str = Field(
        default="Untitled Decision",
        description="User-facing session name.",
    )
    criteria: list[Criterion] = Field(
        default_factory=list,
        description="Ordered list of evaluation criteria.",
    )
    products: list[Product] = Field(
        default_factory=list,
        description="Candidate products / options to be compared.",
    )

    # --- Output fields (populated by the scoring pipeline) ---
    scores: dict[str, float] | None = Field(
        default=None,
        description=(
            "Map of Product.id → final score. "
            "Populated after TOPSIS or Weighted Sum is run."
        ),
    )
    rankings: list[str] | None = Field(
        default=None,
        description="Product IDs sorted by descending score (best first).",
    )
    scoring_method: str | None = Field(
        default=None,
        description="Which algorithm produced the scores (e.g. 'topsis', 'weighted_sum').",
    )
    harmonization_log: list[str] = Field(
        default_factory=list,
        description="Chronological log of harmonization events and warnings.",
    )

    # --- Session lifecycle ---
    status: SessionStatus = Field(default=SessionStatus.PENDING)
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    # --- Validators ---
    @model_validator(mode="after")
    def weights_sum_to_one(self) -> DecisionState:
        """
        Soft validation: warn rather than hard-error so partially-built
        sessions (still adding criteria) don't immediately fail.
        """
        if self.criteria:
            total = sum(c.weight for c in self.criteria)
            if not (0.99 <= total <= 1.01):
                self.harmonization_log.append(
                    f"Warning: criterion weights sum to {total:.4f}, expected 1.0. "
                    "Scores will be proportional but not properly normalised."
                )
        return self

    @model_validator(mode="after")
    def rankings_reference_valid_products(self) -> DecisionState:
        if self.rankings is not None:
            product_ids = {p.id for p in self.products}
            invalid = [r for r in self.rankings if r not in product_ids]
            if invalid:
                raise ValueError(
                    f"rankings contains unknown product IDs: {invalid}"
                )
        return self

    # --- Helpers ---
    def criterion_by_id(self, cid: str) -> Criterion | None:
        return next((c for c in self.criteria if c.id == cid), None)

    def product_by_id(self, pid: str) -> Product | None:
        return next((p for p in self.products if p.id == pid), None)

    def unharmonized_products(self) -> list[Product]:
        """Products that still have no harmonized features — pending pipeline work."""
        return [p for p in self.products if not p.features]