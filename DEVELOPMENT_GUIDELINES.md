# Development Guidelines

These are instructions for Claude.

## Critical Rules for Code Changes

### 1. Always Update Service Worker Cache Version
**When**: Any frontend file is modified (JS, CSS, HTML, JSON)
**Action**: Increment cache version in `sw.js`
```javascript
const CACHE_NAME = 'resource-allocation-vXX'; // Increment XX
```

### 2. Always Update Documentation in guides/
**When**: Any feature, workflow, or data structure changes
**Action**: Review and update ALL relevant guide files in `guides/` directory

#### Documentation Files to Check:
- **`slider_summary.qmd`** - Technical documentation for slider functionality
  - Update when: Slider UI changes, data fields added/removed, workflow changes, randomization logic changes

- **`enumerator_guide.qmd`** - Field staff instructions
  - Update when: User-facing workflow changes, survey/slider instructions change, session types change

- **`survey_guide.qmd`** - Survey system documentation
  - Update when: Survey structure changes, question types change, validation logic changes

- **`IMPLEMENTATION_SUMMARY.md`** - High-level implementation overview
  - Update when: Major features added, architecture changes, database schema changes

- **`TESTING_GUIDE.md`** - Testing procedures
  - Update when: New features need testing steps, test scenarios change

- **`VERIFICATION_CHECKLIST.md`** - Pre-deployment checklist
  - Update when: New verification steps needed, deployment process changes

- **`RANDOMIZATION_FLOW.md`** - Randomization technical details
  - Update when: Randomization logic changes, RNG implementation changes

- **`README_RANDOMIZATION.md`** - Quick start for randomization feature
  - Update when: User-facing randomization behavior changes

### 3. Check for Outdated References
When updating documentation, search for:
- References to removed features (e.g., debug sections)
- Hardcoded values that may have changed
- Workflow descriptions that may be outdated
- Field names or data structures that have changed

### 4. Compile Quarto Documents After Editing
**When**: Any `.qmd` file is modified
**Action**:
```bash
cd guides/
quarto render filename.qmd
```
This generates the `.html` version that enumerators/researchers will read.

### 5. Data Field Changes Require Multi-Location Updates
**When**: Adding/removing/renaming data fields
**Action**: Update ALL of these locations:

#### Frontend:
- `js/modules/sliderResponseDB.js` - IndexedDB schema and save/load methods
- `js/modules/surveyResponseDB.js` - Survey response storage
- `js/modules/session-coordinator.js` - Upload aggregation mapping
- `js/modules/app-state.js` - Response creation

#### Backend:
- `backend/webapp/models.py` - Database model definition
- `backend/webapp/routes.py` -
  - Upload endpoint field mapping
  - CSV export field inclusion
- `backend/webapp/templates/session_details.html` - Display tables

#### Documentation:
- `guides/slider_summary.qmd` - "Data Stored Per Response" section
- `guides/IMPLEMENTATION_SUMMARY.md` - Data structure descriptions

### 6. Critical Data Integrity Rule
**Never compute fields from other stored fields during save operations**

❌ Bad:
```javascript
// Computing child2investment from child1investment
child2investment: ALLOCATABLE_BUDGET - response.child1investment
```

✅ Good:
```javascript
// Explicitly storing the value
child2investment: response.child2investment
```

This ensures data integrity and allows detection of bugs/inconsistencies.

### 7. Control vs. Treatment Group Workflows
Always remember:
- **Treatment Group**: Survey → Dummy Slider 1 → Dummy Slider 2 → Sandwich Survey → Real Slider → Exit Survey
- **Control Group**: Survey only (NO sliders, NO sandwich survey, NO exit survey)

When updating documentation, verify control group descriptions don't incorrectly include sliders.

### 8. Database Schema Changes (Flask-Migrate)
**When**: Modifying database models in `backend/webapp/models.py`
**Action**: Create and apply a migration

#### Steps:
```bash
cd backend
source venv/bin/activate
export FLASK_APP=webapp

# 1. Make changes to models.py

# 2. Create migration
flask db migrate -m "Description of schema change"

# 3. Review generated migration in migrations/versions/
#    - Check for import errors (e.g., missing flask_security imports)
#    - Verify SQL looks correct
#    - Edit if needed

# 4. Test locally
flask db upgrade

# 5. Commit migration file
git add migrations/versions/*.py
git commit -m "Add migration for [description]"

# 6. Deploy to server
git push
# On server: flask db upgrade
```

#### Important Notes:
- **Never** run `flask db init` on server (only once during initial setup)
- **Always** commit migration files to git
- **Never** manually edit the database schema - always use migrations
- If migration has flask_security types, add: `from flask_security.datastore import AsaList`
- Test migrations locally before deploying to production

## Pre-Commit Checklist

Before committing changes that affect functionality:

- [ ] Service worker cache version incremented (if frontend changed)
- [ ] Database migration created and tested (if models.py changed)
- [ ] All relevant guide files reviewed and updated
- [ ] `.qmd` files compiled to `.html` (if modified)
- [ ] Data field changes reflected in all 3 layers (frontend storage, backend storage, backend export)
- [ ] No hardcoded references to old values in documentation
- [ ] Control/treatment workflows correctly described

## How to Use This File

1. **Before starting work**: Review relevant sections
2. **After making changes**: Use as a checklist
3. **During code review**: Verify all guidelines followed
4. **Update this file**: When new patterns or rules emerge
