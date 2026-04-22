# app/services/harmonizer.py

from __future__ import annotations

import re
import uuid
from typing import Any

import instructor
import anthropic
from pydantic import BaseModel, Field

from app.models.decision import (
    Criterion,
    CriterionType,
    DecisionState,
    HarmonizedValue,
    OptimizationDirection,
    Product,
    SessionStatus,
)


# ---------------------------------------------------------------------------
# Instructor-bound Anthropic client
# ---------------------------------------------------------------------------

_raw_client = anthropic.Anthropic()          # reads ANTHROPIC_API_KEY from env
client = instructor.from_anthropic(_raw_client)


# ---------------------------------------------------------------------------
# Intermediate extraction schemas (what the LLM fills in)
# ---------------------------------------------------------------------------

class ExtractedFeature(BaseModel):
    """One product feature as extracted and harmonized by the LLM."""

    criterion_key: str = Field(
        ...,
        description=(
            "A stable snake_case key for this feature, e.g. 'battery_life', 'price_usd'. "
            "Must be consistent across all products in the same extraction batch."
        ),
    )
    criterion_name: str = Field(
        ...,
        description="Human-readable label, e.g. 'Battery Life', 'Price (USD)'.",
    )
    raw_value: str = Field(
        ...,
        description="The exact string from the source text, unmodified.",
    )
    numeric_value: float | None = Field(
        default=None,
        description=(
            "Canonical numeric value after harmonization. "
            "For qualitative scales (Excellent/Good/Poor), map to [0.0, 1.0]. "
            "For mixed units (1000g vs 2kg), normalize to the dominant unit. "
            "None only if the criterion is CATEGORICAL with no ordinal mapping."
        ),
    )
    unit: str | None = Field(
        default=None,
        description="Normalized unit for numeric_value, e.g. 'hours', 'USD', 'kg'.",
    )
    criterion_type: CriterionType = Field(
        ...,
        description="NUMERIC if it can be meaningfully ordered as a float; CATEGORICAL otherwise.",
    )
    direction: OptimizationDirection = Field(
        ...,
        description="MAXIMIZE if higher is better (speed, rating); MINIMIZE if lower is better (price, weight).",
    )
    conversion_note: str | None = Field(
        default=None,
        description="One-line explanation of how you derived numeric_value.",
    )
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Your confidence in the harmonization [0,1].",
    )


class ExtractedProduct(BaseModel):
    """One product as extracted from the paste."""

    name: str = Field(..., description="Full product name as it appears in the text.")
    features: list[ExtractedFeature] = Field(
        default_factory=list,
        description="All features found for this product.",
    )


class ExtractionResult(BaseModel):
    """
    The top-level structured output the LLM must return.
    Instructor enforces this schema via tool-calling.
    """

    products: list[ExtractedProduct] = Field(
        ...,
        description="All products found in the input text.",
    )
    inferred_criteria: list[str] = Field(
        default_factory=list,
        description=(
            "The snake_case criterion_key values that appear across products. "
            "Used to build the unified Criterion list."
        ),
    )
    harmonization_notes: list[str] = Field(
        default_factory=list,
        description="Any unit conflicts, ambiguities, or low-confidence conversions found.",
    )


# ---------------------------------------------------------------------------
# Prompt builder
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """\
You are a Semantic Data Harmonization Engine embedded in a Multi-Criteria Decision Analysis system.

Your task is to extract structured, comparable product data from unstructured text. You must return
a valid JSON object matching the ExtractionResult schema — nothing else.

## Extraction rules

1. **Identify every distinct product** mentioned in the text. Capture its full name.

2. **Extract every measurable or comparable feature** for each product as an ExtractedFeature.
   - Assign a consistent `criterion_key` (snake_case) that is *identical* across all products
     for the same feature. E.g. all storage features get `storage_gb`, all prices get `price_usd`.

3. **Semantic Harmonization — this is mandatory:**

   a. **Qualitative → numeric mapping**
      Map natural-language quality scales to a [0.0, 1.0] float:
        - "Excellent" / "Outstanding" / "Best-in-class" → 1.0
        - "Very Good" / "Great"                         → 0.85
        - "Good" / "Above average"                      → 0.70
        - "Average" / "Decent" / "Acceptable"           → 0.50
        - "Below average" / "Fair"                      → 0.30
        - "Poor" / "Bad" / "Terrible"                   → 0.10
        - "Worst" / "Unusable"                          → 0.0
      Always set `criterion_type = "categorical"` and include the mapping in `conversion_note`.

   b. **Unit normalization**
      When the same criterion appears with different units across products, normalize ALL values
      to the most natural common unit:
        - Weight: always kg  (1000g → 1.0 kg)
        - Time:   always hours  (2 days → 48h, 90 min → 1.5h)
        - Storage/RAM: always GB  (1 TB → 1024 GB, 512 MB → 0.5 GB)
        - Price: always the currency present in the text (do not convert between currencies)
      Record the canonical unit in the `unit` field and explain in `conversion_note`.

   c. **Implicit direction**
      Set `direction = "minimize"` for: price, weight, noise, latency, delivery time, error rate.
      Set `direction = "maximize"` for everything else unless context clearly overrides.

4. **Confidence**: If a value is ambiguous or the conversion is a guess, set `confidence < 0.8`
   and add a note to `harmonization_notes`.

5. **Missing values**: If a product doesn't mention a feature present in other products,
   omit that feature from its list rather than inventing a value.

## Output
Return ONLY the JSON object. No preamble, no explanation, no markdown fences.
"""


def build_user_prompt(category: str, raw_text: str) -> str:
    return (
        f"Category: {category}\n\n"
        f"--- SOURCE TEXT ---\n{raw_text.strip()}\n--- END ---\n\n"
        "Extract all products and their harmonized features."
    )


# ---------------------------------------------------------------------------
# Core extraction function
# ---------------------------------------------------------------------------

def extract_and_harmonize(
    category: str,
    raw_text: str,
    model: str = "claude-sonnet-4-20250514",
) -> ExtractionResult:
    """
    Call the LLM via instructor and return a validated ExtractionResult.
    Raises instructor.exceptions.InstructorRetryException on repeated failure.
    """
    return client.messages.create(
        model=model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {"role": "user", "content": build_user_prompt(category, raw_text)}
        ],
        response_model=ExtractionResult,
        max_retries=2,         # instructor retries with the validation error as feedback
    )


# ---------------------------------------------------------------------------
# DecisionState assembler
# ---------------------------------------------------------------------------

def _derive_weight(criteria_keys: list[str]) -> float:
    """Equal weighting as a sensible default; users adjust in the UI."""
    n = len(criteria_keys)
    return round(1.0 / n, 4) if n else 0.0


def assemble_decision_state(
    category: str,
    extraction: ExtractionResult,
) -> DecisionState:
    """
    Convert a raw ExtractionResult into a fully-typed DecisionState,
    building the unified Criterion list from cross-product feature metadata.
    """
    log: list[str] = list(extraction.harmonization_notes)

    # --- 1. Build criterion registry from the first product that has each key ---
    criterion_map: dict[str, Criterion] = {}
    for product in extraction.products:
        for feat in product.features:
            if feat.criterion_key not in criterion_map:
                criterion_map[feat.criterion_key] = Criterion(
                    id=feat.criterion_key,
                    name=feat.criterion_name,
                    weight=0.0,             # placeholder; recalculated below
                    direction=feat.direction,
                    criterion_type=feat.criterion_type,
                    unit_hint=feat.unit,
                )

    # --- 2. Apply equal weights ---
    equal_w = _derive_weight(list(criterion_map.keys()))
    for c in criterion_map.values():
        c.weight = equal_w

    # --- 3. Build Product objects with HarmonizedValue features ---
    products: list[Product] = []
    for ep in extraction.products:
        raw_features = {f.criterion_key: f.raw_value for f in ep.features}
        features: dict[str, HarmonizedValue] = {}

        for feat in ep.features:
            if feat.confidence < 0.6:
                log.append(
                    f"Low confidence ({feat.confidence:.2f}) on "
                    f"'{feat.criterion_key}' for '{ep.name}': {feat.conversion_note}"
                )
            features[feat.criterion_key] = HarmonizedValue(
                raw_value=feat.raw_value,
                numeric_value=feat.numeric_value,
                unit=feat.unit,
                conversion_note=feat.conversion_note,
                confidence=feat.confidence,
            )

        products.append(
            Product(
                id=str(uuid.uuid4()),
                name=ep.name,
                raw_features=raw_features,
                features=features,
            )
        )

    log.insert(0, f"Extracted {len(products)} products across {len(criterion_map)} criteria.")

    return DecisionState(
        title=f"{category} comparison",
        criteria=list(criterion_map.values()),
        products=products,
        status=SessionStatus.READY,
        harmonization_log=log,
    )