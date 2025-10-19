# Verification Checklist - High/Low Child Randomization

## Instructions

Go through each item below and check it off. If any item fails, see the Troubleshooting section at the bottom.

---

## Phase 1: Setup Verification (5 min)

### Backend
- [ ] Backend running on port 5001
  - Test: Open `http://localhost:5001/health` in browser → should return JSON success
  - Command: `curl http://localhost:5001/health`

- [ ] Database has new schema
  - Command: `cd backend && sqlite3 instance/learn.db "PRAGMA table_info(slider_response);" | grep high_child`
  - Expected: Shows line with `high_child|INTEGER|1||0`

- [ ] Can access login page
  - Open: `http://localhost:5001/login`
  - Expected: Login form loads

### Frontend
- [ ] Frontend server running on port 8000
  - Open: `http://localhost:8000/index.html`
  - Expected: Session manager page loads

- [ ] Config points to correct backend
  - Check: `cat js/config.js | grep BACKEND_URL`
  - Expected: `BACKEND_URL: 'http://localhost:5001'`

- [ ] Scenario files exist
  ```bash
  ls -la scenarios/
  ```
  - Expected: See `scenarios.json`, `scenarios-dummy.json`, `scenarios-dummy-2.json`

---

## Phase 2: Visual Verification (10 min)

### Test A: Dummy Slider 1 Loads

- [ ] Navigate to index.html
- [ ] Log in as enumerator (check credentials in README)
- [ ] Create new session
- [ ] Click "Start Slider" (should load practice-v1)
- [ ] **Debug section shows** at top of page:
  ```
  scenarios_id: practice-v1 | allocatable_budget: 9 | max_sessions: 15
  child_high_name: Walmart | child_low_name: Soriana
  ```
- [ ] **No JavaScript errors** in console (F12 → Console tab)

### Test B: Randomization Visible

Open browser DevTools (F12) → Console, type:

```javascript
appState.session.high_child
```

- [ ] Returns either `1` or `2` (nothing else)
- [ ] Returns a number (not undefined, not null)

### Test C: Colors Match Randomization

**If `high_child === 1`:**
- [ ] Child 1 label says **"Walmart"**
- [ ] Child 2 label says **"Soriana"**
- [ ] In multi-bar chart: LEFT bars are ORANGE
- [ ] In multi-bar chart: RIGHT bars are GREEN
- [ ] In line chart (switch dropdown): Orange line is higher at equal allocation

**If `high_child === 2`:**
- [ ] Child 1 label says **"Soriana"**
- [ ] Child 2 label says **"Walmart"**
- [ ] In multi-bar chart: LEFT bars are GREEN
- [ ] In multi-bar chart: RIGHT bars are ORANGE
- [ ] In line chart: Green line is higher at equal allocation

**Either case:**
- [ ] Combined line is always BLUE
- [ ] Legend matches the child names
- [ ] X-axis says "Asignación de Fichas" (or "Investment")

### Test D: Colors Change Across Refreshes

1. Note current `high_child` value (check console)
2. Refresh page (F5) multiple times
3. Check `high_child` value each time

- [ ] Sometimes it's 1, sometimes it's 2
- [ ] Colors swap when high_child changes
- [ ] Labels swap when high_child changes

**Note:** There's a 50% chance each refresh, so you might get the same value a few times in a row. Keep refreshing until you see it change at least once.

---

## Phase 3: Data Storage (15 min)

### Test E: IndexedDB Storage

1. Move slider to position 5
2. Click "Next Scenario"
3. Open DevTools → Application tab → IndexedDB → SliderResponseDB → pageResponses
4. Click on the stored response

**Verify these fields exist and have correct values:**
- [ ] `highChild`: value is 1 or 2
- [ ] `preEarnings1`: a number (2 or 5, depending on highChild)
- [ ] `preEarnings2`: a number (2 or 5, opposite of preEarnings1)
- [ ] `child1investment`: 5 (what you set)
- [ ] `child2investment`: 4 (9 - 5)
- [ ] `allocatableBudget`: 9
- [ ] `scenariosId`: "practice-v1"

**Consistency check:**
- [ ] If `highChild === 1`: `preEarnings1` > `preEarnings2`
- [ ] If `highChild === 2`: `preEarnings2` > `preEarnings1`

### Test F: Backend Database Storage

1. Complete entire slider workflow (both dummies + real slider = 8 scenarios total)
2. Submit data to backend
3. Query database:

```bash
cd backend
sqlite3 instance/learn.db <<EOF
SELECT
  scenario_name,
  high_child,
  pre_earnings1,
  pre_earnings2,
  child1_investment
FROM slider_response
ORDER BY display_order;
EOF
```

**Verify:**
- [ ] 8 rows returned (2 dummy + 6 real)
- [ ] `high_child` column exists
- [ ] All `high_child` values are either 1 or 2
- [ ] `pre_earnings` values vary (not all the same)
- [ ] Approximately half the scenarios have `high_child=1`, half have `high_child=2`

---

## Phase 4: Functional Testing (15 min)

### Test G: Slider Interaction

1. Start new session
2. Move slider to various positions (0, 3, 5, 7, 9)

**For each position:**
- [ ] Child 1 display updates instantly
- [ ] Child 2 display updates instantly (shows 9 - child1)
- [ ] Graph updates in real-time
- [ ] Selected point highlighted
- [ ] "Next Scenario" button becomes enabled

### Test H: Scenario Navigation

1. Complete Scenario 1 (note `high_child` value in console)
2. Click "Next Scenario"

**Verify:**
- [ ] Slider resets to position 0
- [ ] Child 1 display shows "0"
- [ ] Child 2 display shows "9"
- [ ] Progress bar shows "Scenario 2 of X"
- [ ] `high_child` may be different (check console)
- [ ] Colors/labels update if `high_child` changed

3. Click "Previous Scenario" (go back to Scenario 1)

**Verify:**
- [ ] Slider position restored to your previous choice
- [ ] `high_child` is SAME as first time (no re-randomization)
- [ ] Colors and labels restored

### Test I: Full Workflow

Complete entire workflow:

1. **Dummy Slider 1** (practice-v1)
   - [ ] Shows Walmart/Soriana names
   - [ ] 1 scenario only
   - [ ] Randomization works
   - [ ] Redirects to Dummy Slider 2 after completion

2. **Dummy Slider 2** (practice-v2)
   - [ ] Shows Walmart/Soriana names
   - [ ] 1 scenario only
   - [ ] Different randomization than Dummy 1 (may be same by chance)
   - [ ] Redirects to Sandwich Survey

3. **Real Slider** (main-v1)
   - [ ] Shows "Higher Ability Child" / "Lower Ability Child" names
   - [ ] 6 scenarios (C, D, E, F, G, H)
   - [ ] Each scenario independently randomized
   - [ ] Mix of high_child=1 and high_child=2 across scenarios
   - [ ] Redirects to Exit Survey

---

## Phase 5: Data Export (10 min)

### Test J: CSV Export

1. Navigate to `http://localhost:5001/data` (backend route)
2. Click "Download CSV"
3. Open CSV file

**Verify columns exist:**
- [ ] `scenario_name`
- [ ] `high_child`
- [ ] `pre_earnings1`
- [ ] `pre_earnings2`
- [ ] `child1_investment`
- [ ] `child2_investment`
- [ ] `allocatable_budget`
- [ ] All economic parameters (gamma, sigma, theta, alpha)
- [ ] Final earnings for both children

**Verify data quality:**
- [ ] `high_child` column has only values 1 or 2
- [ ] No NULL values in `high_child` column
- [ ] `pre_earnings` values match the coin flip (check a few rows manually)
- [ ] Different sessions have different randomization patterns

### Test K: JSON Export

1. Navigate to `http://localhost:5001/data`
2. Click "Download JSON"
3. Open JSON file or use `jq` to inspect:

```bash
cat downloaded_data.json | jq '.sessions[0].slider_responses[0]'
```

**Verify:**
- [ ] `high_child` field present in each response
- [ ] Values are integers (1 or 2)
- [ ] Structure matches schema in slider_summary.qmd

---

## Phase 6: Edge Cases (10 min)

### Test L: Extreme Allocations

1. Set slider to position 0 (all to Child 2)
   - [ ] No errors
   - [ ] Graph shows outcomes
   - [ ] Can proceed to next scenario

2. Set slider to position 9 (all to Child 1)
   - [ ] No errors
   - [ ] Graph shows outcomes
   - [ ] Can proceed to next scenario

### Test M: Rapid Interaction

1. Move slider rapidly back and forth 10 times
   - [ ] No JavaScript errors in console
   - [ ] Graph updates smoothly
   - [ ] Display values always correct
   - [ ] No lag or freezing

### Test N: Graph Type Switching

1. Move slider to position 5
2. Change graph dropdown from "Multi Bar Chart" to "Line Chart"
   - [ ] Colors remain consistent
   - [ ] Selected point highlighted
   - [ ] Data labels show correct values
3. Change back to "Multi Bar Chart"
   - [ ] Bars show correct colors
   - [ ] Selected bars highlighted

### Test O: Browser Refresh

1. Complete 2 scenarios
2. Note `high_child` values for each (check IndexedDB)
3. Refresh page (F5)
4. Check IndexedDB again

**Verify:**
- [ ] Completed scenarios have SAME `high_child` values
- [ ] No re-randomization of completed scenarios
- [ ] Can continue from where you left off

---

## Phase 7: Cross-Browser Testing (Optional but Recommended)

Test in multiple browsers:

### Chrome/Chromium
- [ ] Randomization works
- [ ] Colors display correctly
- [ ] IndexedDB stores data
- [ ] No console errors

### Firefox
- [ ] Randomization works
- [ ] Colors display correctly
- [ ] IndexedDB stores data
- [ ] No console errors

### Safari (macOS)
- [ ] Randomization works
- [ ] Colors display correctly
- [ ] IndexedDB stores data
- [ ] No console errors

### Mobile Safari (iOS) - if available
- [ ] Slider responsive
- [ ] Colors visible
- [ ] Touch interaction works
- [ ] Data saves

---

## Success Criteria

### ✅ **PASS** if:
- All items in Phase 1-5 are checked
- At least 90% of items in Phase 6 are checked
- No critical errors in console
- Data exports contain `high_child` field with valid values

### ⚠️ **NEEDS ATTENTION** if:
- Any Phase 1-2 items fail
- Less than 80% of items checked overall
- Console shows errors related to randomization or colors
- Data exports missing `high_child` field

### ❌ **FAIL** if:
- Backend won't start
- Frontend shows blank page
- Database missing `high_child` column
- Randomization doesn't occur (always same value)
- Colors don't match `high_child` assignment

---

## Troubleshooting

### Issue: "high_child is undefined"

**Diagnosis:** Scenario hasn't loaded yet or randomization didn't run

**Fix:**
1. Check console for errors
2. Verify scenario JSON files have `pre_earnings` field
3. Try refreshing page
4. Check that `computeScenarioOutcomes()` is called (add console.log)

### Issue: Colors are always the same

**Diagnosis:** Randomization is stuck or not running

**Fix:**
1. Clear browser cache and cookies
2. Delete IndexedDB: DevTools → Application → IndexedDB → Right-click → Delete
3. Check `Math.random()` works in console
4. Verify `appState.session.high_child` changes between refreshes

### Issue: Database doesn't have high_child column

**Fix:**
```bash
cd backend
rm instance/learn.db
# Restart Flask server
# New database will be created with correct schema
```

### Issue: "high_child is null in database"

**Diagnosis:** Frontend not sending the field, or backend not receiving it

**Fix:**
1. Check network tab in DevTools during submission
2. Verify request payload includes `highChild`
3. Check backend logs for errors
4. Verify routes.py has `high_child=response['highChild']` line

### Issue: Labels don't update

**Diagnosis:** `updateChildLabels()` function not being called

**Fix:**
1. Check console for JavaScript errors
2. Manually call in console: `updateChildLabels()`
3. Verify `child1-name` and `child2-name` elements exist in HTML

### Issue: Service worker caching old files

**Fix:**
1. Open DevTools → Application → Service Workers
2. Click "Unregister"
3. Hard refresh page (Cmd+Shift+R or Ctrl+Shift+R)
4. Verify cache name in sw.js is 'resource-allocation-v35' or higher

---

## Completion

**Date tested:** ________________

**Tested by:** ________________

**Results:**
- [ ] ✅ All tests passed
- [ ] ⚠️ Some issues found (list below)
- [ ] ❌ Critical failures (see notes)

**Notes:**
```
[Write any issues, observations, or recommendations here]




```

**Next steps:**
- [ ] Document any issues found
- [ ] Run additional tests if needed
- [ ] Proceed to production deployment (see README_RANDOMIZATION.md)
- [ ] Archive testing results

---

**Test Suite Version:** 1.0
**Implementation Version:** v35 (service worker cache)
**Last Updated:** January 19, 2025
