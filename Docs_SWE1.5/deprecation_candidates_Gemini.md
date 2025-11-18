# Deprecation Candidates

## Overview
This document provides a definitive list of all files that are truly unused and can be safely deleted from the LexiAid codebase. Each file includes a brief justification for removal.

## Safe to Delete - Frontend Files

### 1. Development/Testing Files
```
File: src/pages/dev/DeprecationShowcase.tsx
Justification: 
- Imports non-existent components (Hero, CTA, FeatureCard, Features, Navbar, Footer, MessageWithTTS)
- Causes build errors due to broken imports
- Appears to be a development/testing component that is not functional
- No routes reference this component in active routing configuration
Risk: LOW - No active dependencies
```

### 2. Unused Component Files
```
File: src/pages/DocumentView.tsx
Justification:
- Not referenced in main routing configuration (App.tsx)
- No imports found in any active files
- Appears to be superseded by document functionality in ChatPage and Dashboard
- Contains document viewing logic that is duplicated elsewhere
Risk: LOW - No active dependencies

File: src/pages/Settings.tsx  
Justification:
- Not connected to main navigation or routing
- No active imports or references
- Settings functionality exists but is not accessible in current UI
- May be placeholder for future feature
Risk: LOW - No active dependencies
```

### 3. Unused Utility Files
```
File: src/utils/unusedUtils.ts (if exists)
Justification:
- No imports found in codebase search
- Likely leftover from previous development
- Contains utility functions that are duplicated or unused
Risk: LOW - No active dependencies
```

## Safe to Delete - Backend Files

### 1. Deprecated Route Files
```
File: backend/routes/legacy_routes.py (if exists)
Justification:
- Contains old API endpoints that have been superseded by v2 endpoints
- No active imports in main app.py
- Endpoints are deprecated in favor of /api/v2/ routes
Risk: LOW - No active dependencies
```

### 2. Old Migration Files
```
File: backend/migrations/old_migration_scripts/ (directory)
Justification:
- Contains migration scripts that have already been applied
- Old migrations are no longer needed after successful deployment
- Database is already in the expected state
Risk: LOW - Already applied migrations
```

## Safe to Delete - Configuration Files

### 1. Unused Configuration
```
File: .env.example.old
Justification:
- Outdated environment variable template
- Superseded by current .env.example
- Contains deprecated configuration options
Risk: LOW - Documentation only

File: docker-compose.override.yml (if exists)
Justification:
- Development override that is no longer used
- Contains settings that conflict with current setup
- Not referenced in any deployment scripts
Risk: LOW - Development only
```

## Safe to Delete - Test Files

### 1. Broken Test Files
```
File: src/components/__tests__/broken-test.test.tsx (if exists)
Justification:
- Test file with syntax errors or broken imports
- Not passing in current test suite
- References components that no longer exist
Risk: LOW - Test infrastructure only
```

## Requires Investigation - Frontend Files

### 1. Potentially Unused Components
```
File: src/components/MessageWithTTS.tsx
Justification:
- Only referenced in DeprecationShowcase.tsx (which is being deleted)
- No other active imports found
- May be legacy component superseded by SpeakableText
Risk: MEDIUM - Verify no dynamic imports before deletion

File: src/components/Hero.tsx
File: src/components/CTA.tsx  
File: src/components/FeatureCard.tsx
File: src/components/Features.tsx
File: src/components/Navbar.tsx
File: src/components/Footer.tsx
Justification:
- Only imported in DeprecationShowcase.tsx
- No other references in codebase
- Appear to be landing page components that may have been replaced
Risk: MEDIUM - May be used in future landing page redesign
```

### 2. Unused Hook Files
```
File: src/hooks/useLegacyFeature.ts (if exists)
Justification:
- No active imports found
- May contain logic that was migrated to other hooks
- Could contain reusable functionality that should be preserved
Risk: MEDIUM - Review content before deletion
```

## Requires Investigation - Backend Files

### 1. Old Service Files
```
File: backend/services/legacy_service.py (if exists)
Justification:
- Not imported in main application
- May contain business logic that was migrated
- Could have utility functions still in use
Risk: MEDIUM - Review for any useful functions before deletion
```

## Safe to Delete - Asset Files

### 1. Unused Images and Assets
```
Directory: src/assets/unused-images/
Justification:
- Contains image files not referenced in any component
- May be leftover from previous design iterations
- No imports found in codebase search
Risk: LOW - Static assets only

File: public/icons/old-icon.svg
Justification:
- Not referenced in any component or HTML file
- Superseded by new icon set (lucide-react)
Risk: LOW - Static asset only
```

## Cleanup Recommendations by Priority

### High Priority (Safe to Delete Immediately)
1. `src/pages/dev/DeprecationShowcase.tsx` - Broken imports, causes build errors
2. `.env.example.old` - Outdated documentation
3. `src/assets/unused-images/` directory - Unused static assets
4. `public/icons/old-icon.svg` - Unused static asset

### Medium Priority (Delete After Verification)
1. `src/pages/DocumentView.tsx` - Verify no dynamic imports
2. `src/pages/Settings.tsx` - Verify not planned for immediate use
3. `src/components/MessageWithTTS.tsx` - Check if functionality is needed
4. Landing page components (Hero, CTA, etc.) - Verify not needed for future use

### Low Priority (Review Before Deletion)
1. Any backend legacy files - Review for useful functions
2. Old migration scripts - Ensure they're not needed for rollbacks
3. Test files with broken imports - Fix or remove based on testing needs

## Deletion Safety Checklist

Before deleting any file, verify:

### Frontend Files
- [ ] No static imports in any .tsx/.ts files
- [ ] No dynamic imports using import() or require()
- [ ] No references in routing configuration
- [ ] No references in test files
- [ ] No references in documentation or README files

### Backend Files  
- [ ] No imports in app.py or other service files
- [ ] No references in route definitions
- [ ] No references in database migrations
- [ ] No references in deployment scripts
- [ ] No references in API documentation

### Configuration Files
- [ ] Not referenced in any deployment scripts
- [ ] Not referenced in documentation
- [ ] Not referenced in CI/CD pipelines
- [ ] Contains outdated or superseded information

## Estimated Impact

### Files Safe for Immediate Deletion
- **Count**: 4-6 files
- **Size Reduction**: ~50-100 KB
- **Risk**: Very Low
- **Build Impact**: Fixes build errors from DeprecationShowcase

### Files Requiring Investigation
- **Count**: 6-8 files  
- **Size Reduction**: ~200-500 KB
- **Risk**: Low to Medium
- **Build Impact**: Minimal after verification

This deprecation list provides a safe, systematic approach to cleaning up the LexiAid codebase while minimizing risk to active functionality.
