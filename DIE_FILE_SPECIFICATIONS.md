# Decision Intelligence Engine (DIE) — Complete File Specifications

## Architecture Overview

**Tech Stack (Assumed)**
- Frontend: Next.js 14+ (App Router) + React 18 + Tailwind CSS
- State Management: React Context + custom hooks (no Redux/Zustand for simplicity)
- Visualization: Recharts (or Chart.js, user will select)
- Styling: Tailwind CSS utilities + design tokens from DecisionCockpit
- Persistence: localStorage for sessions (JSON serialization)
- HTTP: `fetch` with TypeScript types

---

## FILE TREE

```
frontend/src/
├── app/
│   ├── layout.tsx                      [NEW] Root layout, providers
│   ├── page.tsx                        [NEW] Landing / redirect
│   ├── session/
│   │   ├── [sessionId]/
│   │   │   └── page.tsx                [NEW] Cockpit + audit view
│   │   ├── new/
│   │   │   └── page.tsx                [NEW] Multi-step wizard (Step 1-3)
│   │   └── list/
│   │       └── page.tsx                [NEW] View saved sessions
│   │
│   └── api/                            [OPTIONAL] Next.js Route Handlers
│       └── sessions.ts                 [OPTIONAL] Server-side session cache
│
├── components/
│   ├── steps/
│   │   ├── Step1Category.tsx           [NEW] Category input + form
│   │   ├── Step2Ingest.tsx             [NEW] Smart Paste + manual entry
│   │   └── Step3Review.tsx             [NEW] Criteria editor
│   │
│   ├── cockpit/
│   │   ├── DecisionCockpitV2.tsx       [REFACTOR] Main results view
│   │   ├── SensitivityPanel.tsx        [NEW] Tipping points chart
│   │   └── AuditDrawer.tsx             [REFACTOR] Extract from cockpit
│   │
│   ├── shared/
│   │   ├── VerticalSlider.tsx          [REFACTOR] Extract from cockpit
│   │   ├── ScoreBadge.tsx              [REFACTOR] Extract from cockpit
│   │   ├── SparkBar.tsx                [REFACTOR] Extract from cockpit
│   │   ├── LoadingOverlay.tsx          [NEW] Spinner + progress bar
│   │   ├── ErrorBoundary.tsx           [NEW] Error fallback
│   │   └── Header.tsx                  [NEW] App header / nav
│   │
│   └── layout/
│       └── WizardContainer.tsx         [NEW] Multi-step form wrapper
│
├── hooks/
│   ├── useDecisionState.ts             [NEW] Global state hook
│   ├── useScoring.ts                   [NEW] Scoring API calls
│   ├── useSensitivity.ts               [NEW] Sensitivity API calls
│   └── useAudit.ts                     [NEW] Audit API calls
│
├── lib/
│   ├── api.ts                          [NEW] Typed API client
│   ├── types.ts                        [NEW] TypeScript types (mirror backend)
│   ├── scoring.ts                      [NEW] Frontend scoring logic (backup)
│   ├── storage.ts                      [NEW] localStorage helpers
│   └── constants.ts                    [NEW] Design tokens, API URLs
│
├── context/
│   └── DecisionContext.tsx             [NEW] React Context for state
│
└── styles/
    └── globals.css                     [NEW] Global Tailwind + custom CSS
```

---

## DETAILED FILE SPECIFICATIONS

### 1. TYPES & CONTRACTS (`lib/types.ts`)

**Purpose**: Single source of truth for all TypeScript interfaces.

**Must Match Backend**:
- `DecisionState` (entire shape)
- `Criterion`, `Product`, `HarmonizedValue`
- `AuditReport`, `PreferenceContradiction`, `TradeoffLine`
- `SensitivityReport`, `TippingPoint`
- All `enum` types: `SessionStatus`, `CriterionType`, `OptimizationDirection`

**Additional Frontend Types**:
```typescript
type StepName = "category" | "ingest" | "review" | "score" | "sensitivity" | "audit";
interface WizardState {
  step: StepName;
  decisionState: DecisionState | null;
  isLoading: boolean;
  error: string | null;
}
interface AuditState {
  report: AuditReport | null;
  isOpen: boolean;
  isLoading: boolean;
}
```

---

### 2. API CLIENT (`lib/api.ts`)

**Purpose**: Fetch wrapper with proper error handling and TypeScript types.

**Functions**:
```typescript
export async function processSmartPaste(
  category: string, 
  rawText: string, 
  model?: string
): Promise<DecisionState>;

export async function scoreDecision(
  state: DecisionState, 
  method: "weighted_sum" | "topsis"
): Promise<DecisionState>;

export async function analyzeAudit(
  state: DecisionState, 
  model?: string
): Promise<AuditReport>;

export async function sensitivityAnalysis(
  state: DecisionState
): Promise<SensitivityReport>;
```

**Error Handling**:
- Wrap in try-catch
- Return structured error: `{ error: string; details?: unknown }`
- Timeout after 2 minutes (for CPU-based LLM inference)

---

### 3. STORAGE HELPERS (`lib/storage.ts`)

**Purpose**: localStorage operations for session persistence.

**Functions**:
```typescript
export function saveSession(state: DecisionState): void;
export function loadSession(sessionId: string): DecisionState | null;
export function listSessions(): Array<{ id: string; title: string; updatedAt: string }>;
export function deleteSession(sessionId: string): void;
export function generateSessionId(): string;  // UUID v4
```

---

### 4. REACT CONTEXT (`context/DecisionContext.tsx`)

**Purpose**: Global state tree for the entire wizard + cockpit flow.

**Structure**:
```typescript
interface DecisionContextType {
  // Current session
  sessionId: string;
  decisionState: DecisionState | null;
  
  // UI state
  currentStep: StepName;
  isLoading: boolean;
  error: string | null;
  
  // Audit
  auditReport: AuditReport | null;
  auditOpen: boolean;
  
  // Actions
  startNewSession: (title: string) => void;
  setDecisionState: (state: DecisionState) => void;
  goToStep: (step: StepName) => void;
  setError: (msg: string) => void;
  clearError: () => void;
  setLoading: (b: boolean) => void;
  openAudit: (report: AuditReport) => void;
  closeAudit: () => void;
}

export const DecisionContext = React.createContext<DecisionContextType | undefined>(undefined);
export const useDecision = () => { /* ... */ };
```

---

### 5. STEP 1: CATEGORY INPUT (`components/steps/Step1Category.tsx`)

**Purpose**: User enters category name (e.g., "Laptops", "Mutual Funds").

**UI**:
- Large text input field with placeholder: "e.g., Laptops, Shoes, Mutual Funds"
- Optional description textarea: "Tell us what you're deciding..."
- "Continue" button (disabled until category length >= 2)
- Show examples as suggestions below (clickable chips)

**Behavior**:
- On "Continue": Create new DecisionState with `title=category` and move to Step 2
- No API call yet (all local)

**Design**: Brutalist minimalist — focus on big typography and white space

---

### 6. STEP 2: INGEST (`components/steps/Step2Ingest.tsx`)

**Purpose**: Two modes to feed data:
- **Smart Paste**: Unstructured text → LLM extracts
- **Manual**: Add products & criteria manually (or CSV upload)

**UI Layout (tabs or radio buttons)**:

**Tab A: Smart Paste**
- Large textarea: "Paste product specs, reviews, or comparison tables here..."
- Model selector dropdown: "Claude Sonnet 4 / Qwen2.5 7B / Llama 3.2 3B"
- "Extract Products" button
- Loading spinner during LLM call (30–120s message)
- On success: Shows extracted products + criteria in preview, "Confirm & Continue" button

**Tab B: Manual Entry**
- Table with editable rows (Product name, Feature 1, Feature 2, ...)
- "Add Product" button
- "Add Feature" button
- "CSV Upload" button (optional)
- "Continue" button once >=2 products and >=1 feature

**Error Handling**:
- If LLM extraction fails: Show error message + "Try Again" or switch to Manual mode

---

### 7. STEP 3: REVIEW (`components/steps/Step3Review.tsx`)

**Purpose**: Edit criteria before scoring (rename, set weight, direction, delete).

**UI**:
- List of all criteria (extracted from DecisionState)
- For each criterion: 
  - **Editable name** (text input)
  - **Weight slider** (0–100%, auto-normalizes others)
  - **Direction toggle** (↑ Maximize | ↓ Minimize)
  - **Type badge** (numeric / categorical / boolean) — read-only
  - **Delete button** (❌)
- Weight sum indicator at bottom: "Weights sum to 98% — adjust before scoring"
- "Back" and "Score Products" buttons

**Behavior**:
- Weight normalization: When one slider changes, others scale proportionally to keep sum = 1.0
- All changes stored in context (no API call)

---

### 8. DECISION COCKPIT V2 (`components/cockpit/DecisionCockpitV2.tsx`)

**Purpose**: Main results view — scored products ranked, interactive weight adjustment, bias audit button.

**Refactor from existing `DecisionCockpit.jsx`**:
- Use real scoring endpoint instead of `MOCK_STATE`
- Add loading states for scoring
- Extract sub-components:
  - `AuditDrawer.tsx` → Audit sidebar
  - `VerticalSlider.tsx` → Weight sliders
  - `ScoreBadge.tsx` → Score display
  - `SparkBar.tsx` → Feature bars
- Add "Sensitivity Analysis" button → opens `SensitivityPanel`

**New Features**:
- "Re-score" button after weight adjustment
- "Export as CSV" button
- "Save Session" button → localStorage

---

### 9. SENSITIVITY PANEL (`components/cockpit/SensitivityPanel.tsx`)

**Purpose**: Visualize tipping points for each criterion.

**UI**:
- Modal or slide-out panel (similar to audit drawer)
- Title: "Sensitivity Analysis — Ranking Stability"
- Explanation: "How much would each criterion's weight need to change to swap your top 2 choices?"

**Chart** (Recharts horizontal bar chart):
- X-axis: Weight change percentage (e.g., -50%, 0%, +100%)
- Y-axis: Criterion names
- For each criterion:
  - Bar from current weight to tipping weight (green if stable, orange if fragile)
  - Label: "Δ +23.5%" or "Stable"
  - Color code: 
    - Green (>50% change needed) = very stable
    - Orange (20–50% change) = moderate sensitivity
    - Red (<20% change) = fragile

**Data**:
- Call `useSensitivity()` hook → fetches from `/api/v1/sensitivity`
- Display `tipping_points` array with `delta_to_swap` and `percent_change`

**Summary Stats**:
- `stability_index` → "78% of criteria are stable"
- `most_fragile_criterion_id` → "Most sensitive: Price (Δ +12.5%)"

---

### 10. AUDIT DRAWER (`components/cockpit/AuditDrawer.tsx`)

**Purpose**: Extract + refactor audit sidebar from `DecisionCockpit.jsx`.

**Behavior**:
- Receives `report: AuditReport | null`
- Slide-out panel from right
- Close button + overlay
- Display:
  - Summary verdict
  - Contradictions list (with severity badges)
  - Trade-off analysis (delta bars)
  - Stress-test questions

**Styling**: Keep existing (dark theme, amber/teal accents)

---

### 11. LOADING OVERLAY (`components/shared/LoadingOverlay.tsx`)

**Purpose**: Full-screen loader during API calls.

**Props**:
```typescript
interface LoadingOverlayProps {
  isOpen: boolean;
  message?: string;           // "Extracting products..."
  progress?: number;          // 0–100
  estimatedSeconds?: number;  // "~45 seconds remaining"
}
```

**Design**: Spinning icon + progress bar + message

---

### 12. WIZARD CONTAINER (`components/layout/WizardContainer.tsx`)

**Purpose**: Multi-step form layout wrapper.

**Props**:
```typescript
interface WizardContainerProps {
  currentStep: StepName;
  totalSteps: number;
  onBack?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
}
```

**Displays**:
- Progress bar (1/4, 2/4, 3/4, etc.)
- Current step title
- Back/Next buttons
- Step indicator dots

---

### 13. MAIN LAYOUT (`app/layout.tsx`)

**Purpose**: Root layout with providers.

```typescript
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DecisionProvider>
          <Navbar />
          {children}
          <ErrorBoundary />
        </DecisionProvider>
      </body>
    </html>
  );
}
```

---

### 14. NEW SESSION PAGE (`app/session/new/page.tsx`)

**Purpose**: Multi-step wizard (Steps 1–3).

**Flow**:
- Render Step1Category
- On continue → Step2Ingest
- On continue → Step3Review
- On "Score Products" → create session, save to storage, redirect to `/session/[sessionId]`

---

### 15. COCKPIT PAGE (`app/session/[sessionId]/page.tsx`)

**Purpose**: Main decision-making view.

**Flow**:
- Load session from storage or context
- Display DecisionCockpitV2
- "Run Audit" button → calls `/audit` → shows AuditDrawer
- "Sensitivity Analysis" button → calls `/sensitivity` → shows SensitivityPanel

---

---

## IMPLEMENTATION PRIORITY

**Phase 1 (Blocking)**: Types, API client, context, storage
**Phase 2 (Steps)**: Step1, Step2, Step3, WizardContainer
**Phase 3 (Cockpit)**: DecisionCockpitV2, AuditDrawer, shared components
**Phase 4 (Advanced)**: SensitivityPanel, Pages, Error handling

---

## DESIGN SYSTEM TOKENS (from DecisionCockpit.jsx)

```typescript
const T = {
  bg:       "#080c10",
  surface:  "#0d1117",
  border:   "#1e2938",
  borderHi: "#2e4060",
  text:     "#c8d8e8",
  muted:    "#4a6070",
  amber:    "#e8a830",
  teal:     "#20c8a8",
  red:      "#e83050",
  green:    "#38d890",
  blue:     "#3098e8",
};

// Fonts:
// Display: 'Instrument Serif'
// Body: 'Space Grotesk'
// Mono: 'DM Mono'
```

---

## MISSING BACKEND DETAILS (TO CLARIFY)

1. Should `/process-smart-paste` accept a model parameter or default to Claude Sonnet?
2. Should the backend persist sessions to a database, or rely on frontend localStorage?
3. Should there be a `/sessions` endpoint to list saved sessions?
4. For the audit/sensitivity endpoints, should they require `decision_state` in the request body, or accept a `session_id` and fetch from cache?

