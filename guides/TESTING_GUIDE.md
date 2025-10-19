# Testing Guide: High/Low Child Randomization Feature

## Quick Start

### 1. Start Servers

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
export FLASK_APP=webapp
flask run --debug --port=8002
```

**Terminal 2 - Frontend:**
```bash
# From project root
python3 -m http.server 8000
```

### 2. Access Application

Open browser to: `http://localhost:8000/index.html`

---

## Pre-Flight Checks

### A. Verify Database Schema

```bash
cd backend
sqlite3 instance/learn.db "PRAGMA table_info(slider_response);" | grep high_child
```

**Expected output:**
```
XX|high_child|INTEGER|1||0
```

If `high_child` column is missing, delete the database:
```bash
rm instance/learn.db
# Flask will recreate it on next access
```

### B. Verify Scenario Files

```bash
# Check scenarios.json has all required fields
cat scenarios/scenarios.json | jq '.child_high_name, .child_low_name, .scenarios[0].pre_earnings'
```

**Expected output:**
```json
"Higher Ability Child"
"Lower Ability Child"
[5, 2]
```

### C. Verify Frontend Configuration

```bash
cat js/config.js | grep BACKEND_URL
```

**Expected output:**
```javascript
BACKEND_URL: 'http://localhost:8002',
```

---

## Test Suite 1: Basic Functionality

### Test 1.1: Scenario Loading

1. Navigate to `http://localhost:8000/index.html`
2. Log in as enumerator (default credentials in README)
3. Create new session
4. Click "Start Slider" button
5. **Verify:**
   - Debug section shows metadata at top of page
   - No JavaScript errors in console (F12 → Console)
   - Progress bar shows "Scenario 1 of 6"

**Expected debug info:**
```
scenarios_id: practice-v1 | allocatable_budget: 9 | max_sessions: 15
child_high_name: Walmart | child_low_name: Soriana
Colors: High(#ff7f0e) | Low(#2ca02c) | Combined(#1f77b4)
```

### Test 1.2: Randomization Occurs

1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `appState.session.high_child`
4. **Verify:**
   - Returns either `1` or `2`
   - Value should be one of these two numbers

### Test 1.3: Colors Match high_child

**If high_child === 1:**
- Child 1 label should say "Walmart" (or "Higher Ability Child" for main scenarios)
- Child 1 line in graph should be ORANGE
- Child 2 line in graph should be GREEN

**If high_child === 2:**
- Child 1 label should say "Soriana" (or "Lower Ability Child" for main scenarios)
- Child 1 line in graph should be GREEN
- Child 2 line in graph should be ORANGE

### Test 1.4: Slider Interaction

1. Move slider to position 5
2. **Verify:**
   - Child 1 display shows "5"
   - Child 2 display shows "4"
   - Graph updates in real-time
   - Selected point highlighted on graph
   - "Next Scenario" button enabled

---

## Test Suite 2: Data Storage

### Test 2.1: IndexedDB Storage

1. Complete one scenario (move slider, click Next)
2. Open DevTools → Application → IndexedDB → SliderResponseDB → pageResponses
3. Click on the stored response
4. **Verify fields present:**
   - `highChild`: 1 or 2
   - `preEarnings1`: number
   - `preEarnings2`: number
   - `child1investment`: your slider position
   - `child2investment`: 9 - your slider position
   - `allocatableBudget`: 9

**Consistency check:**
- If `highChild === 1`: `preEarnings1` should be > `preEarnings2`
- If `highChild === 2`: `preEarnings2` should be > `preEarnings1`

### Test 2.2: Backend Storage

1. Complete entire slider workflow (all 6 scenarios)
2. Submit data to backend
3. Query database:

```bash
cd backend
sqlite3 instance/learn.db
```

```sql
SELECT
  scenario_name,
  high_child,
  pre_earnings1,
  pre_earnings2,
  child1_investment,
  child2_investment
FROM slider_response
ORDER BY display_order;
```

4. **Verify:**
   - 6 rows returned
   - `high_child` column has values 1 or 2
   - `pre_earnings` values match the randomization
   - Approximately 3 scenarios with `high_child=1` and 3 with `high_child=2`

---

## Test Suite 3: Randomization Properties

### Test 3.1: Independent Randomization Per Scenario

**Goal:** Verify each scenario gets independent coin flip

**Procedure:**
1. Start slider workflow
2. Complete all 6 scenarios
3. Record `high_child` value for each scenario
4. Check DevTools → IndexedDB → SliderResponseDB

**Example expected pattern:**
```
Scenario 1 (C): high_child = 2
Scenario 2 (D): high_child = 1
Scenario 3 (E): high_child = 1
Scenario 4 (F): high_child = 2
Scenario 5 (G): high_child = 1
Scenario 6 (H): high_child = 2
```

**What to verify:**
- Values are NOT all the same (that would indicate bug)
- Mix of 1s and 2s across scenarios
- Each participant gets different randomization

### Test 3.2: Randomization Varies Across Sessions

**Goal:** Verify different sessions get different randomization

**Procedure:**
1. Complete slider workflow, note high_child values
2. Create NEW session
3. Complete slider workflow again
4. Compare high_child values between sessions

**Expected:**
- Different sessions should have different randomization patterns
- It's unlikely (but possible) they're identical

### Test 3.3: Balance Check (Multiple Sessions)

**Goal:** Verify 50/50 split over many sessions

**Procedure:**
1. Complete 10 different sessions (can use different enumerator accounts)
2. Export all data
3. Run balance check:

```sql
SELECT
  scenario_name,
  high_child,
  COUNT(*) as count
FROM slider_response
WHERE scenarios_id = 'main-v1'
GROUP BY scenario_name, high_child
ORDER BY scenario_name, high_child;
```

**Expected:**
```
Scenario C, high_child=1: ~5 sessions
Scenario C, high_child=2: ~5 sessions
Scenario D, high_child=1: ~5 sessions
Scenario D, high_child=2: ~5 sessions
... etc
```

Exact 50/50 unlikely with small sample, but should be close.

---

## Test Suite 4: Navigation & Persistence

### Test 4.1: Next Scenario Updates

1. Complete Scenario 1 (note high_child value)
2. Click "Next Scenario"
3. **Verify:**
   - Slider resets to position 0
   - Labels may change (new high_child for Scenario 2)
   - Colors may change
   - Progress bar updates to "Scenario 2 of 6"

### Test 4.2: Previous Scenario Restores

1. Complete Scenarios 1, 2, 3
2. Click "Previous Scenario" (back to Scenario 2)
3. **Verify:**
   - Slider position restored to your previous choice
   - high_child value SAME as when you first saw Scenario 2
   - Colors and labels restored (no re-randomization)

**Console check:**
```javascript
appState.session.high_child  // Should match original value for Scenario 2
```

### Test 4.3: Browser Refresh Persistence

1. Complete Scenarios 1, 2
2. Note high_child values in DevTools
3. Refresh page (F5)
4. **Verify:**
   - Application resumes at Scenario 1
   - Completed scenarios have SAME high_child values
   - No re-randomization of completed scenarios

---

## Test Suite 5: Visual Verification

### Test 5.1: Color Consistency

**Test case:** high_child = 1 (Child 1 is high)

**Visual checks:**
- [ ] Child 1 label says "Higher Ability Child" (or "Walmart" for dummy)
- [ ] Child 2 label says "Lower Ability Child" (or "Soriana" for dummy)
- [ ] Multi-bar chart: Left bars are ORANGE, right bars are GREEN
- [ ] Line chart: Orange line is higher than green line (at equal investment)
- [ ] Legend shows orange = higher ability, green = lower ability
- [ ] Combined line is always BLUE

**Test case:** high_child = 2 (Child 2 is high)

**Visual checks:**
- [ ] Child 1 label says "Lower Ability Child"
- [ ] Child 2 label says "Higher Ability Child"
- [ ] Multi-bar chart: Left bars are GREEN, right bars are ORANGE
- [ ] Line chart: Green line is higher than orange line (at equal investment)
- [ ] Legend shows green = lower ability, orange = higher ability
- [ ] Combined line is always BLUE

### Test 5.2: Graph Correctness

**Procedure:**
1. Set `high_child = 1` (refresh until you get this)
2. Set slider to middle position (4 or 5)
3. Note earnings values on graph
4. Console: `appState.session.high_child = 2` (force switch)
5. Call: `updateChildLabels(); chartManager.updateChartData(appState, CONFIG);`
6. **Verify:**
   - Colors swap (orange ↔ green)
   - Labels swap
   - Earnings values CHANGE (because pre-earnings changed)

---

## Test Suite 6: Edge Cases

### Test 6.1: Zero Investment in Child 1

1. Leave slider at position 0
2. **Verify:**
   - Child 1: 0 units
   - Child 2: 9 units
   - Graph shows outcomes
   - Can click "Next Scenario"

### Test 6.2: Full Investment in Child 1

1. Move slider to position 9
2. **Verify:**
   - Child 1: 9 units
   - Child 2: 0 units
   - Graph shows outcomes
   - Can click "Next Scenario"

### Test 6.3: Rapid Slider Movement

1. Move slider rapidly back and forth
2. **Verify:**
   - No JavaScript errors
   - Graph updates smoothly
   - Display values always correct

### Test 6.4: Switching Graph Types

1. Move slider to position 5
2. Change graph type dropdown: Multi-bar → Line
3. **Verify:**
   - Colors remain consistent
   - Selected point highlighted on line chart
   - Data labels show current values

---

## Test Suite 7: Workflow Integration

### Test 7.1: Practice Slider 1 (Walmart/Soriana)

1. Complete treatment survey
2. Access Dummy Slider 1
3. **Verify:**
   - Debug shows: `scenarios_id: practice-v1`
   - Child names: "Walmart" and "Soriana"
   - Only 1 scenario
   - After completion, redirects to Dummy Slider 2

### Test 7.2: Practice Slider 2

1. Complete Dummy Slider 1
2. Redirects to Dummy Slider 2
3. **Verify:**
   - Debug shows: `scenarios_id: practice-v2`
   - Still using Walmart/Soriana names
   - Only 1 scenario
   - Different randomization than Dummy 1
   - After completion, redirects to Sandwich Survey

### Test 7.3: Real Slider

1. Complete Sandwich Survey
2. Access Real Slider
3. **Verify:**
   - Debug shows: `scenarios_id: main-v1`
   - Child names: "Higher Ability Child" / "Lower Ability Child"
   - 6 scenarios (C, D, E, F, G, H)
   - After completion, redirects to Exit Survey

### Test 7.4: Data Export Contains All Scenarios

1. Complete full workflow (both dummy sliders + real slider)
2. Go to `/data` route in backend
3. Export CSV
4. **Verify CSV contains:**
   - 2 rows with `scenarios_id = 'practice-v1'` (one per dummy slider)
   - 2 rows with `scenarios_id = 'practice-v2'`
   - 6 rows with `scenarios_id = 'main-v1'` (main scenarios)
   - All rows have `high_child` column with value 1 or 2

---

## Test Suite 8: Error Handling

### Test 8.1: Missing Scenarios File

1. Rename `scenarios/scenarios.json` to `scenarios/scenarios.json.bak`
2. Try to load slider
3. **Verify:**
   - Error message shown
   - Console shows helpful error
4. Restore file

### Test 8.2: Invalid pre_earnings Format

1. Edit `scenarios/scenarios.json`
2. Change `"pre_earnings": [5, 2]` to `"pre_earnings": [5]` (only one value)
3. Reload slider
4. **Verify:**
   - Console shows validation error
   - Error message indicates which scenario
5. Restore correct format

### Test 8.3: Network Failure

1. Complete slider workflow
2. Stop backend server
3. Try to submit data
4. **Verify:**
   - Data remains in IndexedDB
   - Error message shown to user
   - Can retry after server restarts

---

## Automated Testing (Optional)

### Unit Tests (JavaScript)

Create `tests/randomization.test.js`:

```javascript
import { appState } from '../js/modules/app-state.js';

test('high_child is always 1 or 2', () => {
  for (let i = 0; i < 100; i++) {
    const scenario = { pre_earnings: [5, 2], gamma: 0.5, sigma: 0.5, theta: 1 };
    appState.computeScenarioOutcomes(scenario);
    expect([1, 2]).toContain(appState.session.high_child);
  }
});

test('pre_earnings assigned correctly', () => {
  const scenario = { pre_earnings: [5, 2], gamma: 0.5, sigma: 0.5, theta: 1 };

  appState.computeScenarioOutcomes(scenario);

  if (appState.session.high_child === 1) {
    expect(appState.session.preEarnings1).toBe(5);
    expect(appState.session.preEarnings2).toBe(2);
  } else {
    expect(appState.session.preEarnings1).toBe(2);
    expect(appState.session.preEarnings2).toBe(5);
  }
});
```

### Integration Tests (Python)

Create `backend/tests/test_randomization.py`:

```python
def test_slider_response_has_high_child(client):
    """Test that slider responses include high_child field"""
    # Create test session
    # Submit slider responses
    # Query database
    response = SliderResponse.query.first()
    assert response.high_child in [1, 2]
    assert response.high_child is not None

def test_pre_earnings_match_high_child(client):
    """Test pre-earnings consistency with high_child"""
    response = SliderResponse.query.first()

    if response.high_child == 1:
        assert response.pre_earnings1 > response.pre_earnings2
    else:
        assert response.pre_earnings2 > response.pre_earnings1
```

---

## Performance Testing

### Load Test: Multiple Concurrent Users

**Goal:** Verify randomization works correctly under load

**Procedure:**
1. Use Apache Bench or similar tool
2. Simulate 10 concurrent sessions
3. Verify each session gets independent randomization

```bash
# Example (requires setup)
ab -n 100 -c 10 http://localhost:8000/slider.html?sessionId=test
```

---

## Browser Compatibility

Test in multiple browsers:

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS/iOS)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

**For each browser, verify:**
- Randomization works
- Colors display correctly
- IndexedDB stores data
- Service worker caches correctly

---

## Checklist Summary

### Critical Tests (Must Pass)
- [ ] high_child is stored in database
- [ ] high_child is always 1 or 2
- [ ] Colors match high_child assignment
- [ ] Labels match high_child assignment
- [ ] Randomization is independent per scenario
- [ ] Previous/Next navigation preserves high_child
- [ ] Data exports include high_child column

### Important Tests (Should Pass)
- [ ] ~50/50 balance over multiple sessions
- [ ] Browser refresh doesn't re-randomize
- [ ] All three scenario files work
- [ ] Service worker caches updated files

### Nice to Have
- [ ] No console warnings
- [ ] Smooth animations
- [ ] Mobile responsive
- [ ] Accessibility (screen readers)

---

## Bug Report Template

If you find issues, report with this format:

```markdown
**Bug:** [Brief description]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [etc.]

**Expected Behavior:**
[What should happen]

**Actual Behavior:**
[What actually happened]

**Evidence:**
- Screenshot: [attach]
- Console error: [paste]
- Database query result: [paste]

**Environment:**
- Browser: [Chrome 120.0, etc.]
- OS: [macOS 14.2, etc.]
- scenarios_id: [main-v1, practice-v1, etc.]

**Affected Files:**
[List files that may be related]
```

---

## Success Criteria

Implementation is complete when:

1. ✅ All "Critical Tests" pass
2. ✅ Data exports show correct high_child values
3. ✅ Visual inspection confirms colors/labels update
4. ✅ Multiple test sessions show randomization working
5. ✅ No JavaScript console errors during normal operation
6. ✅ Backend database has high_child column with valid data

---

## Contact

For questions about testing, see:
- `IMPLEMENTATION_SUMMARY.md` - Full change documentation
- `RANDOMIZATION_FLOW.md` - Visual flow diagram
- `slider_summary.qmd` - Technical reference

**Test Status:** [PENDING / IN PROGRESS / COMPLETE]
**Last Updated:** January 19, 2025
