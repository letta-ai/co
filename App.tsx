/**
 * App.tsx - Toggle Between Old and New Versions
 *
 * This file serves as a toggle point to switch between:
 * - App.old.tsx: Original 3,826-line monolithic app (fully working)
 * - App.new.tsx: New refactored modular app (~420 lines)
 *
 * To test the refactored version:
 * 1. Change USE_NEW_APP to true
 * 2. Restart the app
 * 3. Test all features against the checklist in MIGRATION_TRACKER.md
 * 4. If any issues, change back to false
 *
 * Once 100% feature parity is achieved, we'll delete this toggle
 * and make the new version the default.
 */

// ============================================================================
// TOGGLE FLAG - Change this to switch versions
// ============================================================================
const USE_NEW_APP = true; // Set to true to test refactored version
// ============================================================================

let App: any;

if (USE_NEW_APP) {
  console.log('🔄 Using NEW refactored app (App.new.tsx)');
  App = require('./App.new').default;
} else {
  console.log('✅ Using OLD monolithic app (App.old.tsx)');
  App = require('./App.old').default;
}

export default App;
