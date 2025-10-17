# Migration Tracker - Incremental Refactor

## Overview
This document tracks the extraction of components from `App.tsx.monolithic` (3,826 lines) into modular, reusable components.

**Strategy**: Zero-risk incremental refactor
- Extract components WITHOUT breaking the working app
- Build new components alongside old code
- Test with `App.new.tsx` before final migration
- Never lose features

## Component Status

### ✅ Completed Components

#### 1. AppHeader
- **File**: `src/components/AppHeader.tsx`
- **Replaces**: `App.tsx.monolithic` lines 2083-2124
- **Features**:
  - Menu button for sidebar
  - "co" title with developer mode easter egg (7 taps)
  - Safe area inset support
  - Conditional rendering (hides when no messages)
- **Status**: ✅ Extracted, tested, ready
- **Used by**: None yet (pending App.new.tsx)

#### 2. BottomNavigation
- **File**: `src/components/BottomNavigation.tsx`
- **Replaces**: `App.tsx.monolithic` lines 2126-2172
- **Features**:
  - 4 tabs: You, Chat, Knowledge, Settings
  - Active state highlighting
  - Callbacks for view switching
  - Conditional rendering (hides when no messages)
- **Status**: ✅ Extracted, tested, ready
- **Used by**: None yet (pending App.new.tsx)

### 🚧 In Progress

None currently

### 📋 Pending Extraction

#### 3. AppSidebar
- **Will replace**: `App.tsx.monolithic` lines 1924-2081
- **Features needed**:
  - Animated slide-in drawer
  - File attachment list
  - Knowledge management links
  - Settings access
  - Logout option
- **Complexity**: Medium
- **Dependencies**: React Native Animated API

#### 4. YouView (Memory Blocks)
- **Will replace**: `App.tsx.monolithic` lines 2182-2432
- **Features needed**:
  - Memory block viewer
  - "You" block creation/editing
  - Human/persona blocks display
  - Loading states
  - Empty states
- **Complexity**: High
- **Dependencies**: lettaApi, MemoryBlockViewer component

#### 5. KnowledgeView
- **Will replace**: `App.tsx.monolithic` lines 2434-2756
- **Features needed**:
  - Tab switcher (Files / Archival Memory)
  - File upload/delete
  - Archival memory search
  - Passage creation/deletion
  - Search functionality
- **Complexity**: High
- **Dependencies**: lettaApi, file picker

#### 6. SettingsView
- **Will replace**: `App.tsx.monolithic` lines 2758-2850 (approx)
- **Features needed**:
  - Logout button
  - Developer mode toggle
  - Agent configuration
  - App version/info
- **Complexity**: Low
- **Dependencies**: Storage, lettaApi

#### 7. ChatView (Enhanced)
- **Current**: `src/screens/ChatScreen.tsx` (basic)
- **Needs**: Integration with refactored app structure
- **Features to add**:
  - Approval request handling
  - Developer mode code blocks
  - Copy message functionality
  - Message retry
- **Complexity**: Medium
- **Status**: Partially complete

## Architecture Components

### Already Created (From Previous Refactor)

✅ **State Management**
- `src/stores/authStore.ts` - Authentication
- `src/stores/agentStore.ts` - Co agent lifecycle
- `src/stores/chatStore.ts` - Messages and streaming

✅ **Hooks**
- `src/hooks/useAuth.ts` - Auth flow
- `src/hooks/useAgent.ts` - Agent initialization
- `src/hooks/useMessages.ts` - Message loading
- `src/hooks/useMessageStream.ts` - Streaming
- `src/hooks/useErrorHandler.ts` - Error handling

✅ **Components**
- `src/components/ErrorBoundary.tsx` - Error boundaries
- `src/components/MessageBubble.v2.tsx` - Message bubbles
- `src/components/MessageInput.v2.tsx` - Input field
- `src/components/LogoLoader.tsx` - Loading screen

✅ **Infrastructure**
- `src/config/index.ts` - App configuration
- `src/theme/` - Theme system

## Migration Plan

### Phase 1: UI Chrome (Current)
- [x] Extract AppHeader
- [x] Extract BottomNavigation
- [ ] Extract AppSidebar
- [ ] Create MIGRATION_TRACKER.md

### Phase 2: Views
- [ ] Extract YouView
- [ ] Extract KnowledgeView
- [ ] Extract SettingsView
- [ ] Enhance ChatView

### Phase 3: Integration
- [ ] Create App.new.tsx
- [ ] Add toggle flag in index.ts
- [ ] Wire up all components
- [ ] Test feature parity

### Phase 4: Testing
- [ ] Test all views
- [ ] Test navigation
- [ ] Test data flow
- [ ] Test edge cases
- [ ] Compare with monolithic version

### Phase 5: Final Migration
- [ ] Achieve 100% feature parity
- [ ] User acceptance testing
- [ ] Replace App.tsx
- [ ] Delete App.tsx.monolithic
- [ ] Update documentation

## Feature Checklist

Features that MUST work in the new app:

### Authentication
- [x] Login with API token
- [x] Token persistence
- [x] Logout
- [x] Connection status

### Chat
- [x] Send messages
- [x] Receive responses
- [x] Streaming responses
- [ ] Message retry
- [ ] Copy messages
- [ ] Approval requests
- [ ] Developer mode code blocks

### Memory (You View)
- [ ] View memory blocks
- [ ] Edit "You" block
- [ ] View human/persona
- [ ] Create new memory blocks

### Knowledge
- [ ] Upload files
- [ ] Delete files
- [ ] Search archival memory
- [ ] Create passages
- [ ] Delete passages
- [ ] View file metadata

### Settings
- [ ] Logout
- [ ] Toggle developer mode
- [ ] View agent info

### Navigation
- [ ] Header with menu
- [ ] Bottom nav tabs
- [ ] Sidebar drawer
- [ ] View switching
- [ ] Empty state handling

## Testing Strategy

### Component Testing (Per Component)
1. Visual inspection
2. Props validation
3. Callback testing
4. Theme switching
5. Edge cases

### Integration Testing (App.new.tsx)
1. Navigation flow
2. State persistence
3. API calls
4. Error handling
5. Loading states

### Comparison Testing
1. Side-by-side with monolithic
2. Feature checklist validation
3. Performance comparison
4. Memory usage
5. Bundle size

## Risk Mitigation

**What if we find missing features?**
- Keep App.tsx.monolithic as reference
- Add features to extracted components
- Update this tracker
- Re-test

**What if integration breaks?**
- Revert to App.tsx.monolithic
- Debug in App.new.tsx
- Fix issues before migrating

**What if we can't achieve parity?**
- Document differences
- Decide: fix or accept
- Get user approval
- Proceed cautiously

## Success Criteria

The new app is ready when:
- ✅ All components extracted
- ✅ App.new.tsx fully functional
- ✅ 100% feature parity verified
- ✅ No regressions found
- ✅ Performance equal or better
- ✅ User acceptance obtained

## Notes

- Each component has inline documentation
- Line numbers reference App.tsx.monolithic
- Use checkboxes to track progress
- Update this file as we extract
- Keep old code until migration complete

## Quick Reference

**Current Files**:
- `App.tsx.monolithic` - Original working version (backup)
- `App.tsx` - Currently points to monolithic
- `App.new.tsx` - New modular version (to be created)

**Toggle Testing**:
```typescript
// In index.ts (future)
const USE_NEW_APP = false; // Set to true to test
```

Last Updated: {{DATE}}
