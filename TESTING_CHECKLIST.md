# Survey Testing Checklist

## Child Survey Tests

### Test 1: Complete Survey (Universidad Path)
- [ ] Select "Universidad, Licenciatura o Ingeniería" for aspiration
- [ ] Verify `educ_specializ` question appears
- [ ] Fill in specialization field
- [ ] Leave matrix questions (side_mother, side_father) partially blank
- [ ] Click "Guardar" - should save successfully
- [ ] Verify redirect to thanks.html

### Test 2: Complete Survey (No Universidad Path) ⚠️ THIS WAS THE BUG
- [ ] Select "Preparatoria completa" for aspiration
- [ ] Verify `educ_specializ` question is HIDDEN
- [ ] Complete remaining questions
- [ ] Click "Guardar" - should save successfully (this was failing before)
- [ ] Verify redirect to thanks.html

### Test 3: Required Validation
- [ ] Leave a required field empty
- [ ] Click "Guardar"
- [ ] Should show alert with validation error
- [ ] Should NOT redirect

## Treatment Survey Tests

### Test 1: Complete Survey with Conditional Questions
- [ ] Answer questions that trigger `subjectA` and `subjectB`
- [ ] Verify conditional questions appear/hide correctly
- [ ] Complete survey
- [ ] Click "Guardar" - should save and redirect to dummy slider 1

### Test 2: Skip Conditional Triggers
- [ ] Answer in a way that keeps conditionals hidden
- [ ] Click "Guardar" - should save successfully

## Control Survey Tests

### Test 1: Complete Survey with Conditional Questions
- [ ] Answer questions that trigger `subjectA` and `subjectB`
- [ ] Complete survey
- [ ] Click "Guardar" - should save and redirect to thanks.html

## General Tests (All Surveys)

### Test 1: Browser Back Button
- [ ] Start survey
- [ ] Click browser back button
- [ ] Verify no crash or data loss

### Test 2: Service Worker Update
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Reload page
- [ ] Verify cache version shows v64 in console
- [ ] Complete a survey to ensure it works

### Test 3: Offline Functionality
- [ ] Enable airplane mode / disconnect internet
- [ ] Try to load a survey
- [ ] Should still work (service worker cache)

### Test 4: Data Persistence
- [ ] Create a session
- [ ] Complete a child survey
- [ ] Go to index.html
- [ ] Verify session shows "Child Survey: ✓ Completed"

## Error Monitoring

### How to Check for Errors on Deployed App:

1. **Open Browser Console**:
   - Desktop: Press F12 or Right-click → Inspect → Console tab
   - Mobile Safari: Settings → Safari → Advanced → Web Inspector
   - Mobile Chrome: chrome://inspect on desktop connected to phone

2. **View Captured Logs**:
   - In console, type: `showConsoleLogs()`
   - Copy logs if errors found

3. **Look for Red Errors**:
   - Any red text in console = error
   - "An invalid form control..." = conditional required field bug
   - "Failed to save..." = database or validation error

## Common Issues to Watch For

1. **Conditional required fields**: Should not block submission when hidden
2. **Matrix questions**: Should allow partial completion when `required: false`
3. **Service worker cache**: Old cache can serve old buggy code
4. **IndexedDB**: Data should persist across page reloads
5. **Redirect logic**: Each survey should redirect to correct next step

## Automated Error Check (Developer Console)

Run this in the deployed app console to check for potential issues:

```javascript
// Check if all required scripts loaded
console.log('Survey System:', typeof Survey !== 'undefined' ? '✓' : '✗');
console.log('Session Manager:', typeof sessionManager !== 'undefined' ? '✓' : '✗');
console.log('Cache Version:', caches.keys().then(keys => console.log(keys)));

// Check IndexedDB
indexedDB.databases().then(dbs => console.log('Databases:', dbs));

// View any errors in error handler
showConsoleLogs();
```
