# Resource Allocation Tool - App Flow Guide

## Overview

This application is a research tool for studying resource allocation decisions in educational contexts. It consists of surveys and interactive slider exercises delivered through a web interface with local IndexedDB storage and backend API upload capabilities.

---

## Architecture Components

### 1. **Backend** (`/backend`)
- **Technology**: Flask (Python)
- **Purpose**: API endpoint for uploading completed session data
- **Key Files**:
  - `webapp/routes.py` - API endpoints
  - `webapp/models.py` - Database models
  - `webapp/__init__.py` - Flask app initialization

### 2. **Frontend JavaScript** (`/js`)
- **Technology**: Vanilla JavaScript with ES6 modules
- **Storage**: IndexedDB (client-side)
- **Key Modules**:
  - `app-state.js` - Global application state management
  - `session-coordinator.js` - Coordinates session and response operations
  - `survey-system.js` - Survey rendering and question management
  - `ui-survey.js` - **Survey page UI and navigation logic**
  - `ui-slider.js` - Slider page UI and event handlers
  - `sessionDB.js` - IndexedDB operations for sessions
  - `surveyResponseDB.js` - IndexedDB operations for survey responses
  - `sliderResponseDB.js` - IndexedDB operations for slider responses
  - `constants.js` - Scenario configurations and app constants

### 3. **Surveys** (`/surveys`)
- **Format**: JSON configuration files
- **Available Surveys**:
  - `surveyChild.json` - Child/student questionnaire
  - `surveyTreatment.json` - Parent treatment group survey
  - `surveyControl.json` - Parent control group survey
  - `surveySandwich.json` - Mid-treatment survey
  - `surveyExit.json` - Post-treatment exit survey

---

## Session Types

### Child Sessions
**Flow**: Child Survey → Thanks

### Parent Sessions - Control Group
**Flow**: Control Survey → Thanks

### Parent Sessions - Treatment Group ⭐
**Flow**: Treatment Survey → Dummy Slider → Sandwich Survey → Real Slider → Exit Survey → Thanks

**🎯 DATA COLLECTION**: ALL elements collect data (surveys + both sliders)

---

## Treatment Group Flow (DETAILED)

### Step 1: Treatment Survey (`surveyTreatment.json`)
- **URL**: `survey.html?session_id={id}&survey_id=Treatment`
- **Survey ID**: `'Treatment'`
- **File Loaded**: `surveyTreatment.json`
- **Data Collection**: ✅ All responses saved to `surveyResponseDB`
- **On Completion**: Redirects to Dummy Slider

### Step 2: Dummy Slider (First Practice Round) ⭐
- **URL**: `slider.html?sessionId={id}&dummy=true`
- **Mode**: Dummy (practice - but responses ARE saved!)
- **Scenarios**: 1 scenario (Scenario A2: σ=1, θ=2)
- **Source**: `DUMMY_SCENARIOS` in `constants.js`
- **Data Collection**: ✅ All responses saved to `sliderResponseDB` with `sliderType: 'dummy'`
- **Session Status**: Does NOT mark session as completed (allows real slider to run)
- **On Completion**: Redirects to Sandwich Survey

### Step 3: Sandwich Survey (`surveySandwich.json`)
- **URL**: `survey.html?session_id={id}&survey_id=Sandwich`
- **Survey ID**: `'Sandwich'`
- **File Loaded**: `surveySandwich.json`
- **Data Collection**: ✅ All responses saved to `surveyResponseDB`
- **On Completion**: Redirects to Real Slider

### Step 4: Real Slider (Second Data Collection Round)
- **URL**: `slider.html?sessionId={id}`
- **Mode**: Real (final data collection)
- **Scenarios**: 6 scenarios (C1, C2, D1, D2, E1, E2)
- **Source**: `REAL_SCENARIOS` in `constants.js`
- **Data Collection**: ✅ All responses saved to `sliderResponseDB` with `sliderType: 'real'`
- **Session Status**: Marks slider session as completed
- **On Completion**: Redirects to Exit Survey

### Step 5: Exit Survey (`surveyExit.json`)
- **URL**: `survey.html?session_id={id}&survey_id=Exit`
- **Survey ID**: `'Exit'`
- **File Loaded**: `surveyExit.json`
- **Data Collection**: ✅ All responses saved to `surveyResponseDB`
- **On Completion**: Redirects to Thanks page

---

## Key Navigation Logic

### Survey Completion Logic (`js/modules/ui-survey.js`)

Located at **lines 114-142**:

```javascript
if (this.sessionData.sessionType === 'child') {
    window.location.href = 'thanks.html';
} else if (this.sessionData.sessionType === 'parent') {
    if (this.sessionData.groupType === 'treatment') {
        // Treatment workflow
        if (this.surveyManager.surveyId === 'Treatment') {
            // After treatment survey → Dummy Slider
            await sessionManager.markSliderStarted(sessionId);
            window.location.href = `slider.html?sessionId=${sessionId}&dummy=true`;
        } else if (this.surveyManager.surveyId === 'Sandwich') {
            // After sandwich survey → Real Slider
            window.location.href = `slider.html?sessionId=${sessionId}`;
        } else if (this.surveyManager.surveyId === 'Exit') {
            // After exit survey → Thanks
            window.location.href = 'thanks.html';
        }
    } else {
        // Control group → Thanks
        window.location.href = 'thanks.html';
    }
}
```

### Slider Completion Logic (`js/modules/ui-slider.js`)

Located at **lines 189-200**:

```javascript
if (result.completed) {
    const sessionId = appState.sliderState.sessionId;
    const isDummyMode = result.isDummyMode || false;

    if (isDummyMode) {
        // Dummy slider complete → Sandwich Survey
        window.location.href = `survey.html?survey_id=Sandwich&session_id=${sessionId}`;
    } else {
        // Real slider complete → Exit Survey
        window.location.href = `survey.html?survey_id=Exit&session_id=${sessionId}`;
    }
}
```

---

## Survey Loading System

### Survey ID Resolution (`js/modules/survey-system.js`)

The system uses different IDs for internal logic vs file names:

```javascript
async loadSurvey(surveyId) {
    // Map surveyId to file name
    const fileId = (surveyId === 'Child1' || surveyId === 'Child2') ? 'Child' : surveyId;

    // Load: surveys/survey{fileId}.json
    const response = await fetch(`surveys/survey${fileId}.json`);

    // Store original surveyId for logic
    this.surveyId = surveyId;
}
```

**Survey ID Mappings**:
- `'Treatment'` → loads `surveyTreatment.json`
- `'Control'` → loads `surveyControl.json`
- `'Sandwich'` → loads `surveySandwich.json`
- `'Exit'` → loads `surveyExit.json`
- `'Child'` → loads `surveyChild.json`

---

## Data Collection Strategy ⭐

### Treatment Group: COMPLETE Data Collection

**All 5 elements collect data**:
1. ✅ **surveyTreatment** → saved to `surveyResponseDB`
2. ✅ **Dummy Slider** → saved to `sliderResponseDB` with `sliderType: 'dummy'`
3. ✅ **surveySandwich** → saved to `surveyResponseDB`
4. ✅ **Real Slider** → saved to `sliderResponseDB` with `sliderType: 'real'`
5. ✅ **surveyExit** → saved to `surveyResponseDB`

### Slider Type Tagging

Both slider rounds save responses, distinguished by `sliderType`:
- **Dummy Slider**: `sliderType: 'dummy'` (1 scenario - practice round)
- **Real Slider**: `sliderType: 'real'` (6 scenarios - data collection round)

This allows researchers to:
- Compare performance between practice and real rounds
- Analyze learning effects
- Keep complete participant data
- Filter by slider type during analysis

### Why Both Sliders Save Data

Originally, the dummy slider was configured to skip data saving (practice mode only). However, for complete research data collection, we now save responses from BOTH slider sessions:

1. **Learning Analysis**: Compare dummy vs real slider choices
2. **Complete Data**: No data loss from any interaction
3. **Quality Control**: Verify participants understood the task
4. **Flexible Analysis**: Researchers can filter by `sliderType` as needed

---

## Database Schema (IndexedDB)

### Sessions Store
- `id` (UUID)
- `sessionType` ('child' | 'parent')
- `groupType` ('control' | 'treatment') - for parent sessions only
- `enumeratorId`
- `familyId`
- `school`
- **Status fields**:
  - `surveyStatus` ('not_started' | 'in_progress' | 'completed')
  - `sliderStatus` ('not_started' | 'in_progress' | 'completed')
  - `exitSurveyStatus` ('not_started' | 'in_progress' | 'completed')
  - `sandwichSurveyStatus` ('not_started' | 'in_progress' | 'completed')
  - `uploadStatus` ('not_uploaded' | 'uploading' | 'uploaded' | 'upload_failed')

### Survey Responses Store
- `id` (UUID)
- `sessionId` (foreign key)
- `surveyId` ('Treatment' | 'Control' | 'Sandwich' | 'Exit' | 'Child')
- `questionId`
- `answer`
- `completedAt`

### Slider Responses Store (Updated v3)
- `id` (UUID)
- `sessionId` (foreign key)
- `scenarioNumber`
- `displayOrder`
- `child1investment`
- `child2investment`
- **`sliderType`** ⭐ NEW: `'dummy'` | `'real'` - distinguishes practice vs data rounds
- Economic parameters:
  - `scenarioGamma`, `scenarioSigma`, `scenarioTheta`
  - `preEarnings1`, `preEarnings2`
  - `scenarioAlpha`
- Calculated values:
  - `child1FinalEarnings`, `child2FinalEarnings`
  - `aggregateFinalEarnings`
- `completedAt` (timestamp)

---

## Scenario Configurations

### Dummy Slider Scenarios (`constants.js`)
```javascript
DUMMY_SCENARIOS = [
    {
        name: "Escenario A2",
        gamma: 0.5,
        sigma: 1,      // Additive
        theta: 2
    }
]
```

### Real Slider Scenarios (`constants.js`)
```javascript
REAL_SCENARIOS = [
    { name: "Escenario C1", sigma: 0.5, theta: 1 },
    { name: "Escenario C2", sigma: 0.5, theta: 2 },
    { name: "Escenario D1", sigma: 0,   theta: 1 },
    { name: "Escenario D2", sigma: 0,   theta: 2 },
    { name: "Escenario E1", sigma: -2,  theta: 1 },
    { name: "Escenario E2", sigma: -2,  theta: 2 }
]
```

All scenarios have `gamma: 0.5`

---

## Recent Fixes Applied

### Fix 1: Survey ID Mismatch (Navigation Flow)

**Issue**: The Treatment group flow was not working because the survey completion logic was checking for `surveyId === 'surveyTreatment'` but the actual ID stored is `'Treatment'`.

**Solution**: Updated `js/modules/ui-survey.js` line 121:
```javascript
// BEFORE (incorrect):
if (this.surveyManager.surveyId === 'surveyTreatment') {

// AFTER (correct):
if (this.surveyManager.surveyId === 'Treatment') {
```

This ensures that after completing the Treatment survey, participants are correctly redirected to the Dummy Slider (practice round).

### Fix 2: Dummy Slider Data Collection ⭐

**Issue**: The Dummy Slider was originally configured to skip data saving (practice mode only), but research requirements need data from ALL elements.

**Solution**: Modified data collection to save responses from both sliders:

1. **Updated Database Schema** (`sliderResponseDB.js` v3):
   - Added `sliderType` field to distinguish 'dummy' vs 'real' slider responses
   - Removed deletion of existing responses when saving new ones

2. **Updated Session Coordinator** (`session-coordinator.js`):
   ```javascript
   // Now saves responses regardless of isDummyMode
   const sliderType = isDummyMode ? 'dummy' : 'real';
   await this.responseDB.completeSliderSession(sessionId, responses, sliderType);
   ```

3. **Session Status Logic**:
   - Dummy slider saves data but does NOT mark session as completed
   - Real slider saves data AND marks session as completed
   - This allows both slider rounds to run sequentially

**Result**: Complete data collection from all 5 treatment elements:
- surveyTreatment ✅
- Dummy Slider ✅ (sliderType: 'dummy')
- surveySandwich ✅
- Real Slider ✅ (sliderType: 'real')
- surveyExit ✅

---

## Complete Treatment Flow Diagram

```
┌─────────────────────┐
│ Create Parent       │
│ Session (Treatment) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ surveyTreatment     │──── surveyId: 'Treatment'
│ (Initial Survey)    │──── File: surveyTreatment.json
└──────────┬──────────┘──── ✅ Responses SAVED (surveyResponseDB)
           │
           ▼
┌─────────────────────┐
│ Dummy Slider        │──── URL: ?dummy=true
│ (First Round)       │──── 1 scenario (A2)
└──────────┬──────────┘──── ✅ Responses SAVED (sliderType: 'dummy')
           │                      Session NOT marked complete
           ▼
┌─────────────────────┐
│ surveySandwich      │──── surveyId: 'Sandwich'
│ (Mid Survey)        │──── File: surveySandwich.json
└──────────┬──────────┘──── ✅ Responses SAVED (surveyResponseDB)
           │
           ▼
┌─────────────────────┐
│ Real Slider         │──── URL: no dummy param
│ (Second Round)      │──── 6 scenarios (C1-E2)
└──────────┬──────────┘──── ✅ Responses SAVED (sliderType: 'real')
           │                      Session marked complete
           ▼
┌─────────────────────┐
│ surveyExit          │──── surveyId: 'Exit'
│ (Exit Survey)       │──── File: surveyExit.json
└──────────┬──────────┘──── ✅ Responses SAVED (surveyResponseDB)
           │
           ▼
┌─────────────────────┐
│ Thanks Page         │
│ (Completion)        │
└─────────────────────┘

ALL 5 ELEMENTS COLLECT DATA ✅
```

---

## Testing the Treatment Flow

To test the complete treatment flow:

1. **Create a parent session** with `groupType: 'treatment'`
2. **Start the session** - should load Treatment survey
3. **Complete Treatment survey** - should redirect to Dummy Slider
4. **Complete Dummy Slider** (1 scenario) - should redirect to Sandwich survey
5. **Complete Sandwich survey** - should redirect to Real Slider
6. **Complete Real Slider** (6 scenarios) - should redirect to Exit survey
7. **Complete Exit survey** - should redirect to Thanks page

---

## Troubleshooting

### Survey Not Loading
- Check that the file exists: `surveys/survey{SurveyId}.json`
- Check browser console for fetch errors
- Verify surveyId matches the expected value

### Wrong Redirect After Survey
- Check `surveyManager.surveyId` value in browser console
- Verify session `groupType` is set correctly
- Review logic in `ui-survey.js` lines 114-142

### Slider Not Saving Responses
- Check if `isDummyMode` is set correctly
- Dummy mode: `slider.html?sessionId={id}&dummy=true`
- Real mode: `slider.html?sessionId={id}` (no dummy param)

### Scenarios Not Displaying
- Check `constants.js` for scenario configurations
- Verify `DUMMY_SCENARIOS` for practice round
- Verify `REAL_SCENARIOS` for data collection round

---

## File Reference

### Critical Files for Flow Control
- `js/modules/ui-survey.js` - Survey completion redirects
- `js/modules/ui-slider.js` - Slider completion redirects
- `js/modules/survey-system.js` - Survey loading logic
- `js/modules/session-coordinator.js` - Session status management
- `js/modules/constants.js` - Scenario configurations

### Survey Files
- `surveys/surveyTreatment.json` - Treatment group initial survey
- `surveys/surveySandwich.json` - Mid-treatment survey
- `surveys/surveyExit.json` - Post-treatment exit survey
- `surveys/surveyControl.json` - Control group survey
- `surveys/surveyChild.json` - Child/student survey

---

## Summary

The Treatment group flow is now correctly configured with **COMPLETE DATA COLLECTION**:

### Navigation Flow ✅
✅ **Treatment Survey** → Dummy Slider
✅ **Dummy Slider** → Sandwich Survey
✅ **Sandwich Survey** → Real Slider
✅ **Real Slider** → Exit Survey
✅ **Exit Survey** → Thanks Page

### Data Collection ✅
All 5 elements now collect data:
1. ✅ **Treatment Survey** - responses saved to surveyResponseDB
2. ✅ **Dummy Slider** - responses saved with sliderType='dummy'
3. ✅ **Sandwich Survey** - responses saved to surveyResponseDB
4. ✅ **Real Slider** - responses saved with sliderType='real'
5. ✅ **Exit Survey** - responses saved to surveyResponseDB

### Key Changes Applied

1. **Fixed Survey ID Mismatch**: Changed surveyId check from 'surveyTreatment' to 'Treatment' in [ui-survey.js](js/modules/ui-survey.js#L121)

2. **Enabled Dummy Slider Data Collection**:
   - Updated database schema to v3 with `sliderType` field
   - Modified session coordinator to save ALL slider responses
   - Dummy slider data tagged as `sliderType: 'dummy'`
   - Real slider data tagged as `sliderType: 'real'`

3. **Session Status Logic**:
   - Dummy slider saves data but does NOT mark session complete
   - Real slider saves data AND marks session complete
   - This allows both slider rounds to run sequentially while collecting all data

The system now provides complete research data from every interaction in the treatment group workflow.
