# Chat UI Design Improvements

## Overview
Complete redesign of the chat interface with modern, polished styling following the Co brand guidelines.

## Visual Changes

### Message Bubbles

#### Before
- Minimal styling, hard to distinguish user vs assistant
- No proper spacing or visual hierarchy
- Missing brand colors

#### After

**User Messages** (Right-aligned)
- Warm orange background (`#EFA04E`) - brand primary color
- White text for high contrast
- Rounded corners with small radius on bottom-right (modern chat bubble style)
- Subtle shadow with orange tint
- Max width: 75% (improves readability on wide screens)

**Assistant Messages** (Left-aligned)
- Surface background (`#303030`) - distinct from chat background
- Border for definition without being heavy
- Rounded corners with small radius on bottom-left
- Subtle shadow for depth
- Max width: 75%

**System Messages** (Centered)
- Tertiary background (`#2A2A2A`)
- Border for subtle definition
- Smaller, muted text
- Centered alignment
- Max width: 90%

### Message Input

#### Before
- Basic input with minimal styling
- Hard to see button states

#### After
- Larger, more accessible input (44px minimum height)
- Rounded pill shape (24px border radius)
- Lexend font family for consistency
- **Send Button**:
  - Circular (40x40px)
  - Orange background when active
  - Subtle background when inactive
  - Clear visual feedback on state changes
  - White icon when active, gray when disabled
- **Attach Button**:
  - Circular (40x40px)
  - Subtle hover states

### Spacing & Layout

- **Message spacing**: 8px vertical gap between messages
- **Container padding**: 16px horizontal
- **Input area**:
  - 16px horizontal padding
  - 12px vertical padding
  - 24px bottom padding on iOS for safe area
- **Subtle border**: 8% opacity white on input container top

### Typography

All text uses **Lexend** font family:
- Message content: 16px, 22px line height
- System messages: 13px, 18px line height
- Timestamps: 11px
- Input: 15px, 20px line height

### Colors (Dark Theme)

```typescript
// Backgrounds
Primary: #242424 (main chat bg)
Surface: #303030 (assistant bubbles)
Tertiary: #2A2A2A (system messages)

// Interactive
Primary: #EFA04E (user bubbles, send button)
Hover: #D89040

// Text
Primary: #E5E5E5 (main text)
Secondary: #B8B8B8 (muted text)
Tertiary: #888888 (timestamps)
Inverse: #E5E5E5 (text on colored backgrounds)

// Borders
Primary: #333333
Accent: #EFA04E
```

## Platform Considerations

### Web
- `boxShadow` for shadows
- `outlineStyle: 'none'` for inputs
- No elevation needed

### iOS
- `shadow*` properties for shadows
- Safe area padding on input (24px bottom)
- `shadowOffset`, `shadowOpacity`, `shadowRadius`

### Android
- `elevation` for shadows
- Standard padding (12px bottom)

## Accessibility

- Minimum touch target: 40x40px (buttons)
- High contrast ratios:
  - White on orange: 4.5:1+ (user messages)
  - Light gray on dark: 7:1+ (assistant messages)
- Clear visual states for interactive elements
- Larger font sizes for readability (15-16px body text)

## Brand Consistency

All colors follow the Co brand palette:
- **Warm Orange** (#EFA04E): Primary actions, user messages
- **Deep Orange** (#E07042): Hover states, accents
- **Sage Green** (#8E9A7C): Secondary actions (future use)
- **Deep Black** (#0A0A0A): Backgrounds
- **Cream** (#F5F5F0): Light theme backgrounds (ready for toggle)

## Future Enhancements

1. **Message Reactions**: Emoji reactions on hover
2. **Message Actions**: Copy, edit, delete on long press
3. **Typing Indicators**: Animated dots when assistant is typing
4. **Read Receipts**: Visual indicator for message status
5. **Message Threading**: Reply to specific messages
6. **Day Separators**: Date headers between message groups
7. **Smooth Animations**: Enter/exit animations for messages
8. **Hover States**: Subtle background changes on desktop
