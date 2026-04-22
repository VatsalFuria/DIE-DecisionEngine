# DIE Frontend Implementation Guide — Complete Build Plan

## ✅ COMPLETED FILES (Ready to Use)

### Core Infrastructure
1. **`src/lib/types.ts`** — All TypeScript interfaces mirroring backend
2. **`src/lib/api.ts`** — Typed fetch wrappers for all 4 endpoints
3. **`src/lib/constants.ts`** — Design tokens, strings, LLM models
4. **`src/lib/storage.ts`** — localStorage helpers with session management
5. **`src/context/DecisionContext.tsx`** — Global React Context for state

### Step Components (Wizard)
6. **`src/components/steps/Step1Category.tsx`** — Category selection
7. **`src/components/steps/Step2Ingest.tsx`** — Smart Paste + LLM extraction
8. **`src/components/steps/Step3Review.tsx`** — Criteria editor with weight normalization

### Cockpit Components
9. **`src/components/cockpit/SensitivityPanel.tsx`** — Tipping points visualization

---

## 🔨 STILL TO BUILD (Priority Order)

### PHASE 1: CRITICAL (Blocking)

#### 1. **`src/components/shared/LoadingOverlay.tsx`** (Blocking Step 2)
```typescript
// Purpose: Full-screen loader with progress indicator
// Props: isOpen, message, progress, estimatedSeconds
// Used by: Step2Ingest during LLM extraction (120+ seconds)
// Complexity: Low
// Time: 30 min
```

**Key Features**:
- Centered spinner with animated rotation
- Progress bar (0-100%)
- Estimated time remaining
- Cannot be dismissed (overlay only)
- Dark theme matching DecisionCockpit

---

#### 2. **`src/components/shared/ErrorBoundary.tsx`** (Blocking everywhere)
```typescript
// Purpose: Catch React errors, prevent white screen crashes
// Props: children
// Used by: Root layout, wraps all content
// Complexity: Medium
// Time: 40 min
```

**Key Features**:
- Catch errors in component tree
- Display error message with retry button
- Log to console (dev) or analytics (prod)
- Full page error display in dark theme

---

#### 3. **`src/components/layout/WizardContainer.tsx`** (Blocking Steps 1-3)
```typescript
// Purpose: Wrapper for multi-step form with progress bar
// Props: currentStep, totalSteps, children, onBack?, onNext?
// Used by: New session page
// Complexity: Medium
// Time: 50 min
```

**Key Features**:
- Progress bar (X/Y steps)
- Step indicator dots
- Back button (disabled on step 1)
- Next/Submit button styling
- Responsive on mobile

---

#### 4. **`src/components/cockpit/DecisionCockpitV2.tsx`** (Blocking scoring flow)
```typescript
// Purpose: Main results view - refactored from original JSX
// Props: DecisionState (from context)
// Used by: /session/[sessionId] page
// Complexity: High
// Time: 2-3 hours
```

**Key Changes from Original**:
- Remove `MOCK_STATE` — use real state from context
- Add API call to `/score` endpoint when weights change
- Extract sub-components:
  - `VerticalSlider.tsx`
  - `ScoreBadge.tsx`
  - `SparkBar.tsx`
  - `AuditDrawer.tsx`
- Add "Sensitivity" button → calls `/sensitivity` → opens SensitivityPanel
- Add "Audit" button → calls `/audit` → opens AuditDrawer
- Add "Save Session" button → calls `saveCurrentSession()`
- Add loading states during API calls

---

#### 5. **`src/components/cockpit/AuditDrawer.tsx`** (Blocking audit feature)
```typescript
// Purpose: Extract + refactor audit sidebar from DecisionCockpit
// Props: report: AuditReport | null, isOpen, onClose
// Used by: DecisionCockpitV2
// Complexity: Low (mostly copy-paste + refactor)
// Time: 40 min
```

**Key Features**:
- Slide-out panel from right
- Display contradictions with severity badges
- Trade-off analysis with delta bars
- Stress-test questions with targeted biases
- Close button + overlay

---

#### 6. **Extracted Shared Components** (Blocking cockpit rendering)
```typescript
// VerticalSlider.tsx — Weight adjustment slider
// ScoreBadge.tsx — Rank + score display
// SparkBar.tsx — Feature value visualization
// Complexity: Low (extract from original)
// Time: 1 hour total
```

---

#### 7. **`src/components/shared/Header.tsx`** (Blocking main layout)
```typescript
// Purpose: App header with session title, nav buttons
// Props: title, canGoBack?, onBack?
// Used by: Root layout or each page
// Complexity: Low
// Time: 30 min
```

**Key Features**:
- DIE logo / branding
- Current session title
- Back to list button
- New decision button
- Scoring method toggle (if on cockpit)

---

### PHASE 2: IMPORTANT (Complete Flow)

#### 8. **`app/layout.tsx`** (Root layout + providers)
```typescript
// Purpose: Next.js root layout with DecisionProvider
// Complexity: Low
// Time: 30 min
```

**Must Include**:
- DecisionProvider wrapper
- Global fonts (DM Mono, Instrument Serif, Space Grotesk)
- Global CSS (dark theme reset)
- ErrorBoundary

---

#### 9. **`app/page.tsx`** (Landing / redirect)
```typescript
// Purpose: Root page — redirect to /session/new or /session/list
// Complexity: Low
// Time: 15 min
```

**Logic**:
- If no sessions in localStorage → redirect to /session/new
- If sessions exist → redirect to /session/list
- Show splash screen while loading

---

#### 10. **`app/session/new/page.tsx`** (Multi-step wizard)
```typescript
// Purpose: Orchestrate Steps 1-3, handle navigation
// Complexity: Medium
// Time: 1 hour
```

**Logic**:
- Render current step based on `currentStep` from context
- Show WizardContainer
- Handle prev/next navigation
- On Step 3 "Score Products" → call API → redirect to /session/[sessionId]

---

#### 11. **`app/session/[sessionId]/page.tsx`** (Cockpit view)
```typescript
// Purpose: Load session from storage, display cockpit
// Complexity: Medium
// Time: 1 hour
```

**Logic**:
- Load session from storage by ID
- Show DecisionCockpitV2
- Display audit/sensitivity on demand
- Handle back navigation

---

#### 12. **`app/session/list/page.tsx`** (Session history)
```typescript
// Purpose: List all saved sessions
// Complexity: Low
// Time: 45 min
```

**Features**:
- Table of sessions (title, date, product count)
- Delete button per session
- "New Decision" button
- Export session as JSON/CSV

---

### PHASE 3: POLISH (Nice to Have)

#### 13. **`src/components/shared/VerticalSlider.tsx`** (Extracted)
#### 14. **`src/components/shared/ScoreBadge.tsx`** (Extracted)
#### 15. **`src/components/shared/SparkBar.tsx`** (Extracted)

---

#### 16. **`src/styles/globals.css`**
```css
// Global Tailwind + custom CSS variables
// Font imports
// Dark theme baseline
// Scrollbar styling
// Animation keyframes
```

---

#### 17. **`src/hooks/useScoring.ts`** (Optional, but helpful)
```typescript
// Purpose: Custom hook for scoring logic
// Exports: { score, isLoading, error }
// Used by: Step3Review, DecisionCockpitV2
```

---

#### 18. **`src/hooks/useSensitivity.ts`** (Optional)
#### 19. **`src/hooks/useAudit.ts`** (Optional)

---

## 📋 BACKEND FIXES REQUIRED (Before Frontend Works)

### Critical Fixes to Backend

1. **Fix `main.py`** — Add missing router registrations:
   ```python
   from app.routers import ingest, scoring_router, audit_router
   app.include_router(scoring_router.router)
   app.include_router(audit_router.router)
   ```

2. **Reorganize file structure** to match package layout:
   ```
   app/
   ├── __init__.py
   ├── main.py
   ├── models/
   │   ├── __init__.py
   │   └── decision.py
   ├── routers/
   │   ├── __init__.py
   │   ├── ingest.py
   │   ├── scoring_router.py
   │   └── audit_router.py
   ├── services/
   │   ├── __init__.py
   │   ├── harmonizer.py
   │   ├── scoring.py
   │   └── auditor.py
   ```

3. **Swap LLM client** in `harmonizer.py` and `auditor.py`:
   ```python
   from openai import OpenAI
   
   _raw_client = OpenAI(
       base_url="http://localhost:11434/v1",
       api_key="ollama"
   )
   client = instructor.from_openai(_raw_client, mode=instructor.Mode.JSON)
   ```

4. **Add CORS env variable** to `main.py`:
   ```python
   import os
   origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
   ```

---

## 🎯 DEPENDENCIES TO ADD

### `package.json`
```json
{
  "dependencies": {
    "react": "^18.3",
    "react-dom": "^18.3",
    "next": "^14.1",
    "uuid": "^9.0"
  },
  "devDependencies": {
    "typescript": "^5.3",
    "@types/react": "^18.3",
    "@types/node": "^20.10"
  }
}
```

### `requirements.txt` (Backend)
```
fastapi>=0.111
uvicorn[standard]>=0.29
anthropic>=0.25
instructor>=1.3
pydantic>=2.7
openai>=1.30  # NEW — for Ollama client
```

---

## 🚀 STEP-BY-STEP BUILD ORDER

### Day 1: Infrastructure
- [ ] Review completed files (types, api, constants, storage, context)
- [ ] Set up Next.js project with these dependencies
- [ ] Create `app/layout.tsx` with providers
- [ ] Test that context can be imported and used

### Day 2: Components & Pages
- [ ] Build LoadingOverlay.tsx
- [ ] Build ErrorBoundary.tsx
- [ ] Build WizardContainer.tsx
- [ ] Build Header.tsx
- [ ] Test all in isolation

### Day 3: Wizard Flow
- [ ] Create `app/session/new/page.tsx`
- [ ] Wire Step1 → Step2 → Step3 navigation
- [ ] Test form validation and weight normalization

### Day 4: API Integration
- [ ] Connect Step2 to `processSmartPaste()` API
- [ ] Connect Step3 to `scoreDecision()` API
- [ ] Add error display + loading states
- [ ] Test end-to-end: Category → Ingest → Score

### Day 5: Cockpit
- [ ] Extract shared components (VerticalSlider, ScoreBadge, SparkBar)
- [ ] Build DecisionCockpitV2.tsx
- [ ] Build AuditDrawer.tsx (from original)
- [ ] Test rendering of scored state

### Day 6: Advanced Features
- [ ] Wire "Sensitivity" button → API call → SensitivityPanel
- [ ] Wire "Audit" button → API call → AuditDrawer
- [ ] Add session persistence (localStorage)
- [ ] Build session list page

### Day 7: Polish
- [ ] Responsive design (mobile)
- [ ] Error handling edge cases
- [ ] Performance optimization
- [ ] User testing

---

## 📐 ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│ app/layout.tsx (Root)                                           │
│ ├── DecisionProvider (Context)                                  │
│ ├── Header.tsx                                                  │
│ ├── ErrorBoundary.tsx                                           │
│ └── LoadingOverlay.tsx                                          │
└──────────┬──────────────────────────────────────────────────────┘
           │
    ┌──────┴──────────────────┬──────────────────────────────────┐
    │                          │                                  │
┌───▼──────────────┐   ┌──────▼──────────┐    ┌────────▼────────┐
│ /session/new     │   │ /session/list   │    │ /session/[id]   │
│ (Wizard)         │   │ (History)       │    │ (Cockpit)       │
├──────────────────┤   ├─────────────────┤    ├─────────────────┤
│ WizardContainer  │   │ SessionTable     │    │ DecisionCockpit │
│ ├─ Step1Category │   │ └─ Delete btn   │    │ ├─ Product grid │
│ ├─ Step2Ingest   │   │ └─ Export btn   │    │ ├─ Audit btn    │
│ └─ Step3Review   │   │                 │    │ ├─ Sensitivity  │
│                  │   │ SearchFilter     │    │ └─ Save session │
│ Context          │   │                 │    │                 │
│ ├─ currentStep   │   │ Context         │    │ Context         │
│ ├─ decision      │   │ └─ sessions     │    │ ├─ decision     │
│ └─ isLoading     │   │                 │    │ ├─ audit        │
│                  │   │                 │    │ ├─ sensitivity  │
│ API              │   │                 │    │ └─ isLoading    │
│ ├─ POST smart    │   │                 │    │                 │
│ └─ POST score    │   │                 │    │ API             │
│                  │   │                 │    │ ├─ POST audit   │
│                  │   │                 │    │ └─ POST sens.   │
└──────────────────┘   └─────────────────┘    └─────────────────┘
```

---

## 🔍 TESTING CHECKLIST

### Unit Tests (Components)
- [ ] Step1Category: Form validation, suggestion clicks
- [ ] Step2Ingest: Tab switching, extraction call
- [ ] Step3Review: Weight normalization, deletion
- [ ] SensitivityPanel: Data rendering, close action

### Integration Tests
- [ ] Full wizard flow: Category → Ingest → Review → Score
- [ ] Session persistence: Save → Load → Edit → Save again
- [ ] API error handling: Failed extraction, timeout, invalid state

### E2E Tests (Cypress/Playwright)
- [ ] Create new session from scratch
- [ ] Load existing session from list
- [ ] Modify weights and rescore
- [ ] Open audit and sensitivity panels
- [ ] Export as CSV

---

## 📝 NOTES & GOTCHAS

1. **localStorage is not available in SSR** — Wrap with `if (typeof window !== "undefined")`
2. **API timeout on CPU**: Qwen2.5 extraction can take 60-120 seconds. Update LoadingOverlay message dynamically.
3. **Weight normalization is critical** — Users expect weights to auto-scale. Test this edge case thoroughly.
4. **Responsive design**: Mobile users need touch-friendly sliders and collapsible sections.
5. **Error states**: Always show user-friendly messages, never dump raw API errors.
6. **Performance**: DecisionCockpit renders potentially 20 products × 15 criteria. Consider virtualization if slow.

---

## 🎨 DESIGN SYSTEM REFERENCE

```typescript
const T = {
  bg:       "#080c10",      // Dark background
  surface:  "#0d1117",      // Card/modal background
  border:   "#1e2938",      // Subtle borders
  borderHi: "#2e4060",      // Active borders
  text:     "#c8d8e8",      // Main text
  muted:    "#4a6070",      // Secondary text
  amber:    "#e8a830",      // Accent: Primary actions
  teal:     "#20c8a8",      // Accent: Secondary
  red:      "#e83050",      // Negative/error
  green:    "#38d890",      // Positive/success
  blue:     "#3098e8",      // Info/neutral
};

const FONTS = {
  display:  "'Instrument Serif', serif",    // Titles
  body:     "'Space Grotesk', sans-serif",  // Body text
  mono:     "'DM Mono', monospace",         // Labels, code
};
```

---

## 🔗 NEXT STEPS

1. **Confirm your choices** on:
   - Next.js version (14+ assumed)
   - Styling approach (Tailwind CSS assumed)
   - Visualization library for sensitivity (Recharts/Chart.js)
   - Session persistence (localStorage assumed)

2. **Fix backend** before wiring frontend:
   - Reorganize package structure
   - Add missing router registrations
   - Swap LLM client for Ollama
   - Test each endpoint with Swagger UI (`/docs`)

3. **Start building** frontend in priority order:
   - Phase 1: Critical blocking components
   - Phase 2: Pages + pages integration
   - Phase 3: Polish + optimization

4. **Deploy**:
   - Frontend: Vercel (for Next.js)
   - Backend: Render.com or Railway (or local Docker)
   - Database: Not needed (stateless, localStorage only)

