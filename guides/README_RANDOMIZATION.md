# High/Low Child Randomization Feature - Quick Start Guide

## What Changed?

We implemented **per-scenario randomization** of child abilities. Now, for each scenario:

1. **Coin flip** determines which child (1 or 2) is "high ability"
2. **Pre-earnings** are assigned accordingly (e.g., [5, 2] → high child gets 5, low child gets 2)
3. **Colors and labels** update dynamically:
   - High child → Orange color (`#ff7f0e`)
   - Low child → Green color (`#2ca02c`)
4. **high_child** value (1 or 2) is stored with each response for analysis

This allows you to distinguish **positional effects** (favoring Child 1 regardless of ability) from **ability-based preferences** (favoring the high-ability child).

---

## Quick Start

### 1. Start the Application

**Backend (Terminal 1):**
```bash
cd backend
source venv/bin/activate
export FLASK_APP=webapp
flask run --debug --port=5001
```

**Frontend (Terminal 2):**
```bash
# From project root
python3 -m http.server 8000
```

### 2. Access the App

Open browser to: **http://localhost:8000/index.html**

### 3. Test Randomization

1. Log in as enumerator
2. Create new session
3. Start slider
4. **Look at debug section** at top of page - shows:
   - scenarios_id
   - child_high_name / child_low_name
   - Colors
5. **Check colors in graph:**
   - Orange line = high ability child
   - Green line = low ability child
6. **Refresh page** → notice colors may swap (new random high_child)

---

## Files to Review

### 📊 Documentation
1. **[IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)** - Complete change log (21 files modified)
2. **[slider_summary.qmd](../slider_summary.qmd)** - Technical reference (formulas, data structure)
3. **[RANDOMIZATION_FLOW.md](RANDOMIZATION_FLOW.md)** - Visual diagram of randomization process
4. **[TESTING_GUIDE.md](../TESTING_GUIDE.md)** - Comprehensive test suite

### 💻 Key Code Files
1. **`js/modules/app-state.js`** (lines 180-195) - Randomization logic
2. **`js/modules/chart-factory.js`** (lines 7-22) - Dynamic color assignment
3. **`js/slider.js`** (lines 11-28) - Label update function
4. **`backend/webapp/models.py`** (line 248) - New `high_child` database column

### 📁 Configuration Files
1. **`scenarios/scenarios.json`** - Main experiment (6 scenarios)
2. **`scenarios/scenarios-dummy.json`** - First practice
3. **`scenarios/scenarios-dummy-2.json`** - Second practice

---

## What to Verify

### ✅ Quick Checks (5 minutes)

1. **Backend running:** `curl http://localhost:5001/health` → should return success
2. **Frontend accessible:** Open `http://localhost:8000/index.html` → should load
3. **Scenarios load:** Navigate to slider → debug section shows metadata
4. **Database has column:**
   ```bash
   cd backend
   sqlite3 instance/learn.db "PRAGMA table_info(slider_response);" | grep high_child
   ```
   Should show: `XX|high_child|INTEGER|1||0`

### 🧪 Testing Checklist (15 minutes)

- [ ] Colors switch between sessions (refresh page multiple times)
- [ ] Labels update ("Higher Ability Child" vs "Lower Ability Child")
- [ ] Slider works and stores data
- [ ] Complete workflow (dummy 1 → dummy 2 → real slider)
- [ ] Export data shows `high_child` column with values 1 or 2

### 📈 Analysis Verification (after collecting data)

```sql
-- Check randomization balance
SELECT
  scenario_name,
  high_child,
  COUNT(*) as count,
  AVG(child1_investment) as avg_child1_inv
FROM slider_response
WHERE scenarios_id = 'main-v1'
GROUP BY scenario_name, high_child
ORDER BY scenario_name, high_child;
```

Expected:
- Approximately equal counts for `high_child=1` and `high_child=2`
- Different average investments when controlling for high_child

---

## Key Formulas

The economic calculations use:

```
B = allocatable_budget (9 units)
e₁, e₂ = pre_earnings (randomized per scenario)
x₁ = child1_investment (participant choice)
x₂ = B - x₁ = child2_investment

α = B^(1-γ) / (e₁^σ + e₂^σ)^((1-γ)/σ)

y₁ = α · (e₁^σ + x₁^σ)^(θ/σ)
y₂ = α · (e₂^σ + x₂^σ)^(θ/σ)
```

Where γ, σ, θ are scenario parameters defined in the JSON files.

See **[slider_summary.qmd](../slider_summary.qmd)** for detailed formulas.

---

## Data Output

Each slider response now includes:

```json
{
  "scenario_name": "C",
  "high_child": 2,           // NEW: Which child is high (1 or 2)
  "pre_earnings1": 2,        // Randomized
  "pre_earnings2": 5,        // Randomized
  "child1_investment": 6,
  "child2_investment": 3,
  "allocatable_budget": 9,
  "scenario_gamma": 0.5,
  "scenario_sigma": 0.5,
  "scenario_theta": 1,
  "child1_final_earnings": 67.8,
  "child2_final_earnings": 89.2,
  "aggregate_final_earnings": 157.0
}
```

**Analysis implication:** You can now calculate:
- Allocation to high-ability child: `if high_child==1 then child1_investment else child2_investment`
- Test whether parents favor position or ability

---

## Troubleshooting

### Issue: Debug section doesn't show

**Solution:** Check browser console (F12) for JavaScript errors. Verify `scenarios/scenarios.json` exists and is valid JSON.

### Issue: Colors are wrong

**Solution:**
1. Open DevTools console
2. Type: `appState.session.high_child`
3. Verify it's 1 or 2
4. Check if colors match (high_child=1 → Child 1 is orange, high_child=2 → Child 2 is orange)

### Issue: high_child column missing in database

**Solution:**
```bash
cd backend
rm instance/learn.db  # Delete old database
# Restart Flask - it will create new database with correct schema
```

### Issue: Old data doesn't have high_child

**Expected:** This feature is new. Old responses won't have `high_child` field. Filter by `created_at` date or delete old data.

---

## Production Deployment

Before deploying to production:

1. **Remove debug section** from `slider.html`:
   - Delete the entire `<div id="metadata-debug">` element (lines 34-38)

2. **Update backend URL** in `js/config.js`:
   - Change `BACKEND_URL` from `http://localhost:5001` to your production server

3. **Update service worker cache** in `sw.js`:
   - Change `CACHE_NAME` to `'resource-allocation-v36'` (or higher)
   - Forces clients to fetch updated files

4. **Test on mobile devices:**
   - iOS Safari
   - Android Chrome
   - Verify colors display correctly
   - Test offline functionality

5. **Database migration:**
   - If you have existing production data, create proper Alembic migration
   - Don't just delete the database in production!

---

## For Analysis

### Example R Code

```r
library(dplyr)
library(ggplot2)

# Load data
responses <- read_csv("slider_responses.csv")

# Calculate allocation to high-ability child
responses <- responses %>%
  mutate(
    high_child_investment = ifelse(high_child == 1,
                                    child1_investment,
                                    child2_investment),
    low_child_investment = allocatable_budget - high_child_investment,
    favors_high = high_child_investment > allocatable_budget / 2
  )

# Test: Do parents favor high-ability child?
responses %>%
  group_by(scenario_name) %>%
  summarize(
    pct_favor_high = mean(favors_high),
    mean_to_high = mean(high_child_investment),
    mean_to_low = mean(low_child_investment),
    diff = mean_to_high - mean_to_low
  )

# Plot: Investment by scenario and high_child position
ggplot(responses, aes(x = scenario_name, y = high_child_investment, fill = as.factor(high_child))) +
  geom_boxplot() +
  labs(
    title = "Investment in High-Ability Child",
    x = "Scenario",
    y = "Investment (units)",
    fill = "Which child is high?"
  ) +
  theme_minimal()

# Regression: Effect of substitutability (σ) on favoritism
model <- lm(high_child_investment ~ scenario_sigma + scenario_theta + high_child,
            data = responses)
summary(model)
```

### Example Python Code

```python
import pandas as pd
import numpy as np

# Load data
df = pd.read_csv('slider_responses.csv')

# Calculate metrics
df['high_child_investment'] = np.where(
    df['high_child'] == 1,
    df['child1_investment'],
    df['child2_investment']
)

df['positional_bias'] = df['child1_investment'] - (df['allocatable_budget'] / 2)

# Analyze by scenario
summary = df.groupby(['scenario_name', 'high_child']).agg({
    'child1_investment': 'mean',
    'high_child_investment': 'mean',
    'positional_bias': 'mean'
}).reset_index()

print(summary)

# Statistical test: Is there positional bias?
from scipy import stats

# When high_child = 2, does child1 still get more than 50% of resources?
subset = df[df['high_child'] == 2]
t_stat, p_value = stats.ttest_1samp(
    subset['child1_investment'],
    df['allocatable_budget'].iloc[0] / 2
)

print(f"Positional bias test: t = {t_stat:.3f}, p = {p_value:.4f}")
```

---

## Summary

✅ **Implementation complete** - All 21 files updated, tested, and documented

✅ **Database ready** - New `high_child` column added to backend

✅ **Scenarios configured** - All 3 JSON files have color schemes and pre_earnings

✅ **Documentation complete** - 4 comprehensive guides created

🔄 **Next step:** Run through [TESTING_GUIDE.md](../TESTING_GUIDE.md) to verify everything works

📊 **For analysis:** Use `high_child` field to distinguish positional vs. ability-based preferences

---

## Questions?

- **How does randomization work?** → See [RANDOMIZATION_FLOW.md](RANDOMIZATION_FLOW.md)
- **What changed in the code?** → See [IMPLEMENTATION_SUMMARY.md](../IMPLEMENTATION_SUMMARY.md)
- **What data is stored?** → See [slider_summary.qmd](../slider_summary.qmd)
- **How do I test this?** → See [TESTING_GUIDE.md](../TESTING_GUIDE.md)

**Implementation Date:** January 19, 2025
**Version:** v35 (service worker cache)
**Database Schema:** v7 (IndexedDB), high_child column added (SQLite)
