/**
 * constants.ts
 * ─────────────
 * Design tokens, configuration, and hardcoded values.
 */

// ─── API Configuration ────────────────────────────────────────────────────

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export const API_TIMEOUT_MS = 120000; // 2 minutes default, overridden per endpoint

// ─── Design Tokens (from DecisionCockpit.jsx) ─────────────────────────────

export const COLOR_TOKENS = {
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

export const FONTS = {
  display: "'Instrument Serif', serif",
  body: "'Space Grotesk', sans-serif",
  mono: "'DM Mono', monospace",
};

// ─── Application Constants ────────────────────────────────────────────────

export const MIN_PRODUCTS_TO_SCORE = 2;
export const MIN_CRITERIA_TO_SCORE = 1;
export const MAX_PRODUCTS = 20;
export const MAX_CRITERIA = 15;

export const MIN_CATEGORY_LENGTH = 2;
export const MAX_CATEGORY_LENGTH = 100;

export const MIN_SMART_PASTE_LENGTH = 50;
export const MAX_SMART_PASTE_LENGTH = 50000;

export const WEIGHT_DECIMAL_PLACES = 4;
export const SCORE_DECIMAL_PLACES = 6;

// ─── UI Constants ─────────────────────────────────────────────────────────

export const WIZARD_STEPS: Array<{
  name: string;
  label: string;
  description: string;
}> = [
  {
    name: "category",
    label: "Category",
    description: "What are you deciding?",
  },
  {
    name: "ingest",
    label: "Ingest Data",
    description: "Feed your products & specs",
  },
  {
    name: "review",
    label: "Review Criteria",
    description: "Adjust weights & settings",
  },
  {
    name: "score",
    label: "Results",
    description: "View ranked products",
  },
];

export const LLM_MODELS = [
  {
    value: "claude-sonnet-4-20250514",
    label: "Claude Sonnet 4 (Cloud - requires API key)",
    requiresApiKey: true,
  },
  {
    value: "qwen2.5:7b-instruct-q4_K_M",
    label: "Qwen2.5 7B (Local - Ollama, ~4.5GB RAM)",
    requiresApiKey: false,
  },
  {
    value: "llama3.2:3b-instruct-q5_K_M",
    label: "Llama 3.2 3B (Local - Ollama, ~2.5GB RAM)",
    requiresApiKey: false,
  },
];

export const SCORING_METHODS = [
  {
    value: "weighted_sum",
    label: "Weighted Sum (fast, interpretable)",
    description:
      "Linear combination of normalized criterion scores. Best for clear priorities.",
  },
  {
    value: "topsis",
    label: "TOPSIS (distance-to-ideal)",
    description:
      "Ranks based on distance to ideal & worst solutions. Better for many competing criteria.",
  },
];

// ─── Localization Strings ──────────────────────────────────────────────────

export const STRINGS = {
  // Step 1
  STEP1_TITLE: "What Are You Deciding?",
  STEP1_PLACEHOLDER: "e.g., Laptops, Running Shoes, Mutual Funds",
  STEP1_DESCRIPTION: "Tell us what you're comparing (optional)",
  STEP1_CONTINUE: "Continue",

  // Step 2
  STEP2_TITLE: "Feed Your Data",
  STEP2_TAB_PASTE: "Smart Paste",
  STEP2_TAB_MANUAL: "Manual Entry",
  STEP2_PASTE_PLACEHOLDER:
    "Paste product specs, reviews, or comparison tables here...",
  STEP2_MODEL_LABEL: "LLM Model",
  STEP2_EXTRACT: "Extract Products",
  STEP2_EXTRACTING: "Extracting products and criteria...",
  STEP2_CONFIRM: "Confirm & Continue",
  STEP2_ERROR: "Extraction failed. Try again or use Manual mode.",

  // Step 3
  STEP3_TITLE: "Review Criteria",
  STEP3_DESCRIPTION: "Adjust weights, directions, and delete unnecessary criteria",
  STEP3_WEIGHT_SUM_WARNING: (pct: number) =>
    `Weights sum to ${pct.toFixed(1)}% — adjust before scoring`,
  STEP3_SCORE_PRODUCTS: "Score Products",

  // Cockpit
  COCKPIT_TITLE: "Decision Results",
  COCKPIT_SCORE: "Score",
  COCKPIT_BIAS_AUDIT: "◈ Bias Audit",
  COCKPIT_SENSITIVITY: "⇄ Sensitivity",
  COCKPIT_EXPORT: "📥 Export CSV",
  COCKPIT_SAVE_SESSION: "💾 Save Session",
  COCKPIT_NEW_DECISION: "↻ New Decision",

  // Audit
  AUDIT_TITLE: "Decision Auditor",
  AUDIT_VERDICT: "Verdict",
  AUDIT_CHOSEN: "Chosen",
  AUDIT_RUNNER_UP: "Runner-up",
  AUDIT_CONFIDENCE: "Confidence",
  AUDIT_CONTRADICTIONS: "⚠ Preference Contradictions",
  AUDIT_TRADEOFFS: "⇄ Trade-off Analysis",
  AUDIT_STRESS_TEST: "◎ Stress-Test Questions",
  AUDIT_CLOSE: "✕ Close",

  // Sensitivity
  SENSITIVITY_TITLE: "Sensitivity Analysis",
  SENSITIVITY_DESCRIPTION:
    "How much would each criterion's weight need to change to swap your top 2 choices?",
  SENSITIVITY_STABLE: "Very Stable",
  SENSITIVITY_MODERATE: "Moderate",
  SENSITIVITY_FRAGILE: "Fragile",
  SENSITIVITY_STABILITY_INDEX: (idx: number) =>
    `${(idx * 100).toFixed(0)}% of criteria are stable`,

  // Errors
  ERROR_NETWORK: "Network error. Check your connection.",
  ERROR_API: "Backend error. Try again or check logs.",
  ERROR_TIMEOUT: "Request timed out. Try a shorter input or check your connection.",
  ERROR_VALIDATION: "Invalid input. Check your data.",
};

// ─── Example data for suggestions ───────────────────────────────────────────

export const CATEGORY_SUGGESTIONS = [
  "Laptops",
  "Smartphones",
  "Running Shoes",
  "Mutual Funds",
  "Coffee Makers",
  "Universities",
  "Vacation Destinations",
  "Job Offers",
  "Headphones",
];

export const SMART_PASTE_EXAMPLES = [
  {
    category: "Laptops",
    text: `MacBook Pro 14 (2024)
- Price: $1,999
- Processor: M4 Max
- RAM: 16GB unified memory
- Storage: 512GB SSD
- Display: 14.2" Liquid Retina XDR, 3200×2000
- Battery: Up to 18 hours
- Weight: 3.5 lbs (1.6 kg)
- Build: Aluminum unibody, excellent

Dell XPS 15
- Price: $1,599
- Processor: Intel Core Ultra 9
- RAM: 32GB LPDDR5X
- Storage: 1TB SSD
- Display: 15.6" OLED, 1920×1200
- Battery: Up to 12 hours
- Weight: 4.1 lbs (1.86 kg)
- Build: Magnesium chassis, very good`,
  },
  {
    category: "Running Shoes",
    text: `Nike Air Zoom Pegasus 41
- Price: $129.99
- Weight: 237g (8.4 oz)
- Drop: 10mm
- Cushioning: Zoom Air
- Rating: 4.5/5 stars
- Best for: Everyday running
- Durability: 300-500 miles

ASICS Gel-Kayano 31
- Price: $169.99
- Weight: 283g (10 oz)
- Drop: 10mm
- Cushioning: Gel, FF Blast
- Rating: 4.7/5 stars
- Best for: Stability, long runs
- Durability: 400-600 miles`,
  },
];
