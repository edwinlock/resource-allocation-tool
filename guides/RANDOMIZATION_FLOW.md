# Randomization Flow Diagram

## How High/Low Child Assignment Works

```
┌─────────────────────────────────────────────────────────────┐
│  SCENARIO JSON FILE                                         │
│  scenarios/scenarios.json                                   │
├─────────────────────────────────────────────────────────────┤
│  Global Config:                                             │
│    child_high_name: "Higher Ability Child"                 │
│    child_low_name: "Lower Ability Child"                   │
│    child_high_color: "#ff7f0e" (orange)                    │
│    child_low_color: "#2ca02c" (green)                      │
│                                                             │
│  Scenario C:                                                │
│    pre_earnings: [5, 2]  ← [high_value, low_value]         │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ LOADED BY scenario-loader.js
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  SCENARIO LOADS IN APP (slider.js)                         │
│  computeScenarioOutcomes() called                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
                            ↓ IN app-state.js
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  COIN FLIP (50/50 chance)                                   │
│                                                             │
│    high_child = Math.random() < 0.5 ? 1 : 2                │
│                                                             │
│    Example result: high_child = 2                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
              ┌─────────────┴─────────────┐
              ↓                           ↓
    ┌─────────────────┐         ┌─────────────────┐
    │  IF high_child  │         │  IF high_child  │
    │     === 1       │         │     === 2       │
    ├─────────────────┤         ├─────────────────┤
    │  Child 1 = HIGH │         │  Child 1 = LOW  │
    │  Child 2 = LOW  │         │  Child 2 = HIGH │
    │                 │         │                 │
    │  preEarnings1=5 │         │  preEarnings1=2 │
    │  preEarnings2=2 │         │  preEarnings2=5 │
    └─────────────────┘         └─────────────────┘
                                        ↓
                                (Example continues
                                 with high_child=2)
                                        ↓
┌─────────────────────────────────────────────────────────────┐
│  LABELS ASSIGNED (updateChildLabels() in slider.js)        │
├─────────────────────────────────────────────────────────────┤
│  Child 1 label → "Lower Ability Child"                     │
│  Child 2 label → "Higher Ability Child"                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  COLORS ASSIGNED (getChildColors() in chart-factory.js)    │
├─────────────────────────────────────────────────────────────┤
│  Child 1 color → GREEN (#2ca02c)  ← low child color        │
│  Child 2 color → ORANGE (#ff7f0e) ← high child color       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  CHARTS RENDER                                              │
├─────────────────────────────────────────────────────────────┤
│  Legend shows:                                              │
│    "Lower Ability Child" (green line)                      │
│    "Higher Ability Child" (orange line)                    │
│    "Combined" (blue line)                                   │
│                                                             │
│  X-axis label: "Investment in Child 1"                     │
│  (Always positional, not ability-based)                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PARTICIPANT MOVES SLIDER                                   │
├─────────────────────────────────────────────────────────────┤
│  Allocates: 6 units to Child 1                             │
│             3 units to Child 2                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  ECONOMIC CALCULATIONS (economic-engine.js)                 │
├─────────────────────────────────────────────────────────────┤
│  Using:                                                     │
│    preEarnings1 = 2 (low)                                  │
│    preEarnings2 = 5 (high)                                 │
│    child1_investment = 6                                    │
│    child2_investment = 3                                    │
│    γ=0.5, σ=0.5, θ=1                                        │
│                                                             │
│  Computes:                                                  │
│    α = normalization constant                               │
│    child1_final_earnings = α * (2^0.5 + 6^0.5)^2           │
│    child2_final_earnings = α * (5^0.5 + 3^0.5)^2           │
│    aggregate = child1_final_earnings + child2_final_earnings│
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  PARTICIPANT CLICKS "NEXT SCENARIO"                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  RESPONSE SAVED (sliderResponseDB.js + routes.py)          │
├─────────────────────────────────────────────────────────────┤
│  {                                                          │
│    scenario_name: "C",                                      │
│    child1_investment: 6,                                    │
│    child2_investment: 3,                                    │
│    high_child: 2,  ← STORED FOR ANALYSIS                   │
│    pre_earnings1: 2,                                        │
│    pre_earnings2: 5,                                        │
│    scenario_gamma: 0.5,                                     │
│    scenario_sigma: 0.5,                                     │
│    scenario_theta: 1,                                       │
│    child1_final_earnings: 67.8,                            │
│    child2_final_earnings: 89.2,                            │
│    aggregate_final_earnings: 157.0                         │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  NEXT SCENARIO LOADS                                        │
├─────────────────────────────────────────────────────────────┤
│  Scenario D with pre_earnings: [5, 2]                      │
│                                                             │
│  NEW COIN FLIP → high_child = 1 (different from previous!) │
│                                                             │
│  Now:                                                       │
│    Child 1 = HIGH (orange, "Higher Ability Child")         │
│    Child 2 = LOW (green, "Lower Ability Child")            │
│    preEarnings1 = 5                                         │
│    preEarnings2 = 2                                         │
│                                                             │
│  Slider resets to 0                                         │
│  Labels and colors UPDATE automatically                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Insights for Analysis

### 1. Positional vs. Ability Effects

**Question:** Do parents favor Child 1 because of position, or do they favor the high-ability child?

**Analysis approach:**

```r
# Example R code
library(dplyr)

data %>%
  mutate(
    # Calculate allocation to high-ability child
    high_child_investment = ifelse(high_child == 1,
                                    child1_investment,
                                    child2_investment),
    # Is the high child favored?
    favors_high = high_child_investment > allocatable_budget / 2
  ) %>%
  group_by(scenario_name) %>%
  summarize(
    pct_favor_high = mean(favors_high),
    mean_allocation_to_high = mean(high_child_investment),
    mean_allocation_to_child1 = mean(child1_investment)
  )
```

### 2. Randomization Balance Check

**Verify 50/50 split:**

```sql
-- SQL query
SELECT
  scenario_name,
  high_child,
  COUNT(*) as count
FROM slider_response
WHERE scenarios_id = 'main-v1'
GROUP BY scenario_name, high_child
ORDER BY scenario_name, high_child;
```

Expected: Approximately equal counts for `high_child = 1` and `high_child = 2` within each scenario.

### 3. Scenario Parameter Interactions

**Question:** Does the effect vary by σ (substitutability)?

```r
data %>%
  mutate(
    # Allocation to high vs low
    high_minus_low = ifelse(high_child == 1,
                             child1_investment - child2_investment,
                             child2_investment - child1_investment)
  ) %>%
  group_by(scenario_sigma) %>%
  summarize(
    mean_high_minus_low = mean(high_minus_low),
    # Positive = favors high child
    # Negative = favors low child
    # Zero = equal allocation
  )
```

---

## Visual Example: What Participant Sees

### Scenario 1 (high_child = 1):
```
┌─────────────────────────────────────────┐
│  Higher Ability Child: 5 units          │  ← Orange
│  Lower Ability Child:  4 units          │  ← Green
│  ────────────────●───────────────        │
│        Investment Slider                 │
│         (at position 5)                  │
└─────────────────────────────────────────┘

Graph shows:
  - Orange line (Higher Ability Child) higher earnings
  - Green line (Lower Ability Child) lower earnings
  - Blue line (Combined) total
```

### Scenario 2 (high_child = 2, same parameters):
```
┌─────────────────────────────────────────┐
│  Lower Ability Child:  5 units          │  ← Green
│  Higher Ability Child: 4 units          │  ← Orange
│  ────────────────●───────────────        │
│        Investment Slider                 │
│         (at position 5)                  │
└─────────────────────────────────────────┘

Graph shows:
  - Green line (Lower Ability Child) now for Child 1
  - Orange line (Higher Ability Child) now for Child 2
  - Same 5/4 allocation has DIFFERENT meaning!
```

**Analysis implication:** By comparing these two scenarios, we can isolate positional effects from ability-based preferences!

---

## Data Structure Summary

### Before (old system):
```json
{
  "child1_investment": 5,
  "pre_earnings1": 5,  // Always high
  "pre_earnings2": 2   // Always low
}
```
**Problem:** Can't distinguish position from ability.

### After (new system):
```json
{
  "child1_investment": 5,
  "high_child": 2,     // NEW: Which child is high
  "pre_earnings1": 2,  // Randomized
  "pre_earnings2": 5   // Randomized
}
```
**Benefit:** Full experimental control over position vs. ability!
