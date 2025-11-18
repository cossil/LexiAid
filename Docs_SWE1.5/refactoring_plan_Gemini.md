# Refactoring Plan

## Overview
This document provides a step-by-step guide for safely removing deprecated code from the LexiAid codebase. Each step details which import statements or function calls need to be deleted from active files.

## Phase 1: Immediate Safe Deletions

### Step 1.1: Remove DeprecationShowcase Component
**Files to Delete:**
```
src/pages/dev/DeprecationShowcase.tsx
```

**Impact Analysis:**
- No active imports found
- No routing references
- Safe to delete immediately

**Verification Commands:**
```bash
# Search for any references to DeprecationShowcase
grep -r "DeprecationShowcase" src/
grep -r "dev/DeprecationShowcase" src/
```

**Expected Results:** No matches found

---

### Step 1.2: Remove Unused Static Assets
**Files to Delete:**
```
.env.example.old
public/icons/old-icon.svg
src/assets/unused-images/ (entire directory)
```

**Impact Analysis:**
- Static assets only, no code dependencies
- Safe to delete immediately

**Verification Commands:**
```bash
# Check for references to old environment file
grep -r ".env.example.old" .
grep -r "old-icon.svg" src/
grep -r "unused-images" src/
```

**Expected Results:** No matches found

---

## Phase 2: Component Cleanup

### Step 2.1: Remove DocumentView Page
**Files to Delete:**
```
src/pages/DocumentView.tsx
```

**Pre-deletion Verification:**
```bash
# Search for all imports and references
grep -r "DocumentView" src/
grep -r "pages/DocumentView" src/
```

**Expected Results:** Should show no active imports

**Files to Check for Potential References:**
- `src/App.tsx` - Routing configuration
- `src/layouts/DashboardLayout.tsx` - Navigation
- Any test files that might import this component

**If References Found:**
1. Remove import statement: `import DocumentView from './pages/DocumentView';`
2. Remove route entry: `<Route path="/document/:id" element={<DocumentView />} />`
3. Remove any navigation links pointing to `/document/:id`

---

### Step 2.2: Remove Settings Page
**Files to Delete:**
```
src/pages/Settings.tsx
```

**Pre-deletion Verification:**
```bash
# Search for all references
grep -r "Settings" src/
grep -r "pages/Settings" src/
```

**Expected Results:** Should show no active imports

**Files to Check for Potential References:**
- `src/App.tsx` - Route definitions
- `src/layouts/DashboardLayout.tsx` - Navigation menu
- Any component that might link to settings

**If References Found:**
1. Remove import: `import Settings from './pages/Settings';`
2. Remove route: `<Route path="/settings" element={<Settings />} />`
3. Remove navigation link or menu item

---

### Step 2.3: Remove Orphaned Landing Page Components
**Files to Delete:**
```
src/components/Hero.tsx
src/components/CTA.tsx
src/components/FeatureCard.tsx
src/components/Features.tsx
src/components/Navbar.tsx
src/components/Footer.tsx
src/components/MessageWithTTS.tsx
```

**Pre-deletion Verification:**
```bash
# Check each component individually
for component in Hero CTA FeatureCard Features Navbar Footer MessageWithTTS; do
  echo "=== Checking $component ==="
  grep -r "$component" src/ --exclude-dir=dev
done
```

**Expected Results:** Should only show references in DeprecationShowcase (already being deleted)

**If References Found:**
For each file that imports these components:
1. Remove import statements:
   ```typescript
   import Hero from '../components/Hero';
   import CTA from '../components/CTA';
   // ... etc for each component
   ```
2. Remove JSX usage:
   ```typescript
   <Hero />
   <CTA />
   // ... etc for each component
   ```

---

## Phase 3: Backend Cleanup

### Step 3.1: Remove Legacy Route Files
**Files to Delete:**
```
backend/routes/legacy_routes.py (if exists)
```

**Pre-deletion Verification:**
```bash
# Check for imports in main app
grep -r "legacy_routes" backend/
grep -r "import.*legacy" backend/app.py
```

**Files to Check:**
- `backend/app.py` - Blueprint registration

**If References Found:**
1. Remove import: `from backend.routes import legacy_routes`
2. Remove blueprint registration: `app.register_blueprint(legacy_routes.bp)`

---

### Step 3.2: Remove Old Migration Scripts
**Files to Delete:**
```
backend/migrations/old_migration_scripts/ (directory)
```

**Pre-deletion Verification:**
```bash
# Check if migrations are referenced
grep -r "old_migration_scripts" backend/
```

**Safety Check:**
- Verify these migrations have already been applied to production
- Check migration history to ensure they're not needed for rollbacks

---

## Phase 4: Import Cleanup

### Step 4.1: Clean Up Unused Imports
After deleting components, clean up any remaining unused imports:

**Check for Unused Imports:**
```bash
# Use ESLint to find unused imports
npx eslint src/ --rule "no-unused-vars: error" --fix

# Or manually check common files
grep -r "import.*DocumentView" src/
grep -r "import.*Settings" src/
grep -r "import.*Hero" src/
grep -r "import.*CTA" src/
```

**Files to Clean:**
- Any files that imported deleted components
- Type definition files that referenced deleted components
- Test files that imported deleted components

---

## Phase 5: Testing and Verification

### Step 5.1: Build Verification
**Commands:**
```bash
# Clean build
npm run build

# Check for build errors
npm run lint

# Run tests to ensure no broken references
npm run test
```

**Expected Results:**
- Build completes successfully
- No lint errors related to missing imports
- All tests pass

### Step 5.2: Runtime Verification
**Manual Testing Checklist:**
- [ ] Application starts successfully
- [ ] All main routes load without errors
- [ ] Navigation works correctly
- [ ] No console errors about missing components
- [ ] All active features work as expected

### Step 5.3: Dependency Check
**Commands:**
```bash
# Check for any unused dependencies
npm depcheck

# Or manually check package.json usage
grep -r "from 'hero'" src/  # Should find no results
grep -r "from 'cta'" src/   # Should find no results
```

---

## Phase 6: Documentation Updates

### Step 6.1: Update Documentation
**Files to Update:**
- `README.md` - Remove references to deleted components
- Any API documentation that mentioned deleted routes
- Component documentation that listed deleted components

**Documentation Cleanup:**
```bash
# Search for documentation references
grep -r "DocumentView" docs/
grep -r "Settings" docs/
grep -r "Hero" docs/
```

---

## Rollback Plan

### If Issues Arise After Deletion

**Immediate Rollback:**
```bash
# Restore from git if needed
git checkout HEAD~1 -- src/pages/DocumentView.tsx
git checkout HEAD~1 -- src/pages/Settings.tsx
# etc for each deleted file
```

**Partial Rollback:**
- If specific functionality breaks, restore only the related files
- Re-add imports that were mistakenly removed
- Restore route definitions that were needed

**Verification After Rollback:**
- Test the specific functionality that was broken
- Ensure the fix doesn't introduce new issues
- Document why the file was needed for future reference

---

## Safety Checklist

### Before Each Deletion Phase:
- [ ] All references have been identified and removed
- [ ] No active imports found in codebase
- [ ] No routing references found
- [ ] No test dependencies found
- [ ] Documentation has been checked for references

### After Each Deletion Phase:
- [ ] Application builds successfully
- [ ] No lint errors
- [ ] Tests pass
- [ ] Manual testing confirms functionality
- [ ] Git commit created with descriptive message

### Final Verification:
- [ ] All deprecated files removed
- [ ] Application fully functional
- [ ] No unused imports remain
- [ ] Bundle size reduced as expected
- [ ] Performance improved (if measurable)

---

## Estimated Time and Impact

**Time Estimates:**
- Phase 1 (Immediate deletions): 15 minutes
- Phase 2 (Component cleanup): 1-2 hours
- Phase 3 (Backend cleanup): 30 minutes
- Phase 4 (Import cleanup): 30 minutes
- Phase 5 (Testing): 1-2 hours
- Phase 6 (Documentation): 30 minutes

**Total Estimated Time:** 3.5-5.5 hours

**Expected Impact:**
- Code reduction: ~300-500 lines
- Bundle size reduction: ~10-15KB
- Build time improvement: ~5-10%
- Maintenance improvement: Significant (removes dead code)

This refactoring plan provides a systematic, safe approach to removing deprecated code while minimizing risk to the application's functionality.
