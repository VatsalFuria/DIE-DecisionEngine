## 📌 Project Title

# **Decision Intelligence Engine (DIE)**

_A Generic, AI-Assisted Decision Auditor for Multi-Criteria Optimization_

---

## 1. Overview

The **Decision Intelligence Engine (DIE)** is a system designed to transform complex, multi-factor decisions into **structured, optimized, and explainable outcomes**.

Unlike traditional comparison tools or naive AI recommendations, DIE:

- Uses **AI to structure messy, real-world data**
- Uses **deterministic algorithms for reliable decision-making**
- Acts as a **decision auditor**, not just a recommender

---

## 2. Core Idea

> Move from _“Which option is best?”_
> to
> **“Why is this option best — and are you biased in thinking so?”**

---

## 3. Problem Statement

Users face three core issues:

### 1. Cognitive Overload

Too many options, too many features, unclear trade-offs

### 2. Data Friction

Manual comparison requires:

- Research
- Tabulation
- Normalization

### 3. Biased Decision-Making

Users often:

- Pre-decide emotionally
- Adjust criteria to justify choices

---

## 4. Solution Approach

DIE solves this via a **hybrid architecture**:

- **AI Layer → Handles ambiguity and structuring**
- **Deterministic Engine → Handles scoring and ranking**
- **Audit Layer → Challenges user assumptions**

---

## 5. Key Features

---

### 🔹 5.1 Generic Decision System

- Works across any domain:
  - Products (phones, laptops)
  - Finance (mutual funds)
  - General decisions

---

### 🔹 5.2 Smart Data Ingestion (AI-Assisted)

#### Modes:

**A. Table Input**

- Spreadsheet-like UI
- Manual + CSV paste

**B. Smart Paste (Core Feature)**

- User pastes raw product page text
- LLM extracts structured features automatically

---

### 🔹 5.3 AI Feature Structuring

From a category input, LLM generates:

- Feature list
- Feature types (numeric / categorical)
- Optimization direction (maximize/minimize)

---

### 🔹 5.4 Semantic Harmonization

LLM converts inconsistent inputs into comparable values:

Examples:

- “2 days” → 48 hours
- “Good / Average / Poor” → numeric scale

---

### 🔹 5.5 Dynamic Normalization

- Values normalized relative to dataset
- Context-aware (no fixed benchmarks)

---

### 🔹 5.6 Multi-Criteria Optimization

#### Primary Method:

- Weighted Sum Model (interpretable)

#### Advanced (Optional):

- **TOPSIS (distance-to-ideal method)**

---

### 🔹 5.7 Bias Detection Engine (Key Differentiator)

AI analyzes user preferences and flags contradictions:

Example:

> “You prioritize price, but all selected options are premium-tier.”

---

### 🔹 5.8 Sensitivity Analysis (“What-If Engine”)

Shows decision stability:

Example:

> “If battery importance decreases by 12%, Product B becomes the top choice.”

---

### 🔹 5.9 Explainable Output

- Ranked list of options
- Feature contribution breakdown
- Trade-off insights
- AI-generated explanation

---

### 🔹 5.10 Visualization

- Comparison tables
- Bar charts (score comparison)
- Radar charts (feature profiles)
- (Optional) Sensitivity indicators

---

### 🔹 5.11 Local Persistence

- Data stored locally (browser storage)
- Users can:
  - Revisit sessions
  - Modify inputs
  - Re-run analysis

---

## 6. System Flow

```text
1. User enters category
2. LLM generates feature template
3. User inputs data:
   - Table / CSV
   - OR Smart Paste (raw text)
4. LLM structures and harmonizes data
5. System validates inputs
6. System normalizes features
7. User sets weights (sliders)
8. System computes rankings:
   - Weighted sum
   - (Optional) TOPSIS
9. Bias detection module analyzes preferences
10. Sensitivity analysis evaluates stability
11. Results displayed (table + charts + insights)
12. Data saved locally
```

---

## 7. Architecture Overview

---

### 🔹 Frontend (Next.js + Tailwind CSS)

Responsibilities:

- UI flow
- Table input
- Sliders
- Charts
- Local storage

---

### 🔹 Backend (FastAPI + Python)

Responsibilities:

- Data validation
- Normalization
- Scoring engine
- Sensitivity analysis
- LLM orchestration

---

### 🔹 Data Processing

- Pandas
- NumPy

---

### 🔹 LLM Layer (Aggressive but Controlled)

Used for:

- Feature generation
- Data structuring
- Semantic normalization
- Bias detection
- Explanation

---

## 8. Data Model (Conceptual)

---

### Product Entry

```json
{
  "name": "Product A",
  "features": {
    "price": 20000,
    "battery": "2 days",
    "build_quality": "good"
  }
}
```

---

### Processed Entry

```json
{
  "name": "Product A",
  "features": {
    "price": 20000,
    "battery_hours": 48,
    "build_quality_score": 0.8
  }
}
```

---

## 9. UI/UX Design

---

### Principles

- Guided step-by-step flow
- Minimal friction
- Progressive complexity

---

### Desktop

- Full table
- Charts
- Side-by-side comparison

---

### Mobile

- Card-based layout
- Vertical flow
- Touch-friendly sliders
- Collapsible sections

---

## 10. Technology Stack

---

### Frontend

- Next.js
- Tailwind CSS
- Recharts / Chart.js

---

### Backend

- FastAPI (Python)
- Pandas

---

### LLM Integration

- OpenAI API (MVP)

---

### Storage

- LocalStorage / IndexedDB

---

## 11. MVP Scope

---

### Included

- Generic category handling
- LLM feature generation
- Table + Smart Paste input
- Normalization + scoring
- Weighted ranking
- Bias detection
- Basic sensitivity analysis
- Visualization
- Local storage

---

### Optional (Advanced Mode)

- TOPSIS ranking

---

### Excluded

- Full web scraping
- Real-time market data
- Authentication system
- Cloud persistence

---

## 12. Limitations

- Depends on input data quality
- LLM structuring may introduce minor inconsistencies
- Relative normalization (not global benchmarks)
- Not suited for very large datasets
- Sensitivity analysis is approximate (MVP level)

---

## 13. Risks & Mitigation

| Risk             | Mitigation               |
| ---------------- | ------------------------ |
| Poor input data  | Validation + Smart Paste |
| LLM errors       | Non-critical usage only  |
| Over-complex UI  | Guided flow              |
| Mobile usability | Responsive design        |

---

## 14. Key Differentiators

- AI-assisted data structuring
- Decision auditing (bias detection)
- Context-aware normalization
- Sensitivity analysis
- Generic across domains
- Transparent logic (no black-box decisions)

---

## 15. Positioning Statement

> “A system that doesn’t just recommend the best option — it explains, challenges, and stress-tests your decision.”

---

## 16. Project Identity

| Type | Description                      |
| ---- | -------------------------------- |
| Not  | Comparison tool                  |
| Not  | AI chatbot                       |
| Is   | **Decision Intelligence Engine** |
| Is   | **AI-assisted Decision Auditor** |

---

## 17. Future Enhancements

- Browser extension for direct extraction
- Advanced sensitivity heatmaps
- Collaborative decision-making
- Dataset auto-enrichment
- Multi-session analytics

---
