# co

A thinking partner that learns how you think.

co is a single AI agent that builds itself around you through conversation. Unlike traditional chatbots, co maintains a persistent, evolving understanding of who you are, what you're working on, and how you approach problems.

## Core Concept

Every user gets one co agent. That's it. No switching between assistants, no configuring multiple bots. Just one agent that:

- **Learns your patterns**: Notices how you think, what excites you, what frustrates you
- **Remembers everything**: Maintains both short-term context and long-term memory
- **Evolves with you**: Updates its understanding as you grow and change
- **Thinks alongside you**: Not just responding, but actively making connections and surfacing insights

The entire agent definition lives in `src/utils/coAgent.ts`. When you log in for the first time, co creates itself and begins learning.

## How It Works

### Single Agent Architecture

When you log in, the app:
1. Looks for an agent tagged with `co-app`
2. If found, connects to your existing co
3. If not found, creates a new co agent

This means your co persists across devices and sessions. The same agent, with all its accumulated knowledge about you, is available wherever you log in.

### Memory System

co maintains structured memory across multiple blocks:

**You** - Dynamic snapshot of what you're focused on right now. Updated frequently as your attention shifts.

**Human** - Stable facts about you. Professional context, communication style, interests. Changes slowly over time.

**Tasks** - What co is helping you accomplish. Added as new work emerges, removed when complete.

**Knowledge Structure** - How you think. Mental models you use, patterns in how you approach problems, connections between concepts.

**Interaction Log** - Significant moments in your relationship. Decisions made, insights gained, understanding that shifted.

**Persona** - co's core identity and directives. How it thinks about its role as your thinking partner.

**Memory Management** - Guidelines for when to create new memory blocks dynamically based on your usage patterns.

### Background Processing

co includes a sleeptime agent that runs in the background:
- Manages long-term archival memory
- Surfaces relevant context from past conversations
- Operates independently to maintain the primary agent's performance

The sleeptime agent shares memory blocks with the primary agent, enabling seamless context passing.

## Features

### Persistent Memory
Every conversation builds on what co already knows. The agent's understanding compounds over time.

### Real-time Streaming
Messages stream token-by-token on web, creating natural conversation flow.

### Adaptive Interface
- Light and dark themes
- Cross-platform support (iOS, Android, Web)
- Responsive layout for mobile and desktop

### File Sharing
Attach files to messages for context. Works across all platforms.

### Memory Inspection
View co's memory blocks to see how its understanding has evolved. Available through the sidebar navigation.

### Tool Access
co can search the web, manage archival memory, and search conversation history to provide informed responses.

## Getting Started

### Prerequisites

- Node.js 18 or higher
- Letta API token from [letta.com](https://letta.com)

### Installation

```bash
npm install
npm start
```

Press `w` to open in browser, or scan the QR code with Expo Go on your mobile device.

### First Conversation

1. Enter your Letta API key
2. Wait for co to initialize (creates agent with memory blocks)
3. Start talking

co begins building its understanding immediately. The more you interact, the better it gets at thinking alongside you.

## Configuration

### Agent Definition

The entire agent is defined in `src/utils/coAgent.ts`. Key configuration:

```typescript
model: 'anthropic/claude-haiku-4-5-20251001'
tools: ['conversation_search', 'web_search', 'fetch_webpage', 'memory']
enableSleeptime: true
```

### Memory Blocks

Default memory structure is defined in `src/constants/memoryBlocks.ts`. Each block includes:
- Label (unique identifier)
- Description (guides when/how co should update it)
- Initial value (template structure)
- Size limit

co can dynamically create new blocks based on usage patterns (e.g., creating a "decision_log" if you frequently discuss choices, or "technical_notes" if you share code regularly).

### System Prompt

co's core behavior is defined in `src/constants/systemPrompt.ts`. This establishes:
- How co thinks about its role
- When to update memory
- How to decompose and synthesize information
- Relationship dynamics with the user

## Architecture

Built with React Native and Expo for true cross-platform support:

- **State**: Zustand stores for agent, auth, and chat state
- **API**: Letta SDK client with streaming support
- **Storage**: AsyncStorage (mobile) and SecureStore (sensitive data)
- **UI**: Native components with custom animations

Key files:

```
src/
  utils/coAgent.ts           - Agent creation and initialization
  constants/memoryBlocks.ts  - Memory block templates
  constants/systemPrompt.ts  - Agent behavior definition
  hooks/useAgent.ts          - Agent lifecycle management
  hooks/useMessageStream.ts  - Streaming message handler
  stores/agentStore.ts       - Agent state management
```

## Development

### Running Locally

```bash
# Web with production optimizations
npm run web:prod

# iOS
npm run ios

# Android
npm run android

# Clear cache if needed
npx expo start -c
```

### Platform Notes

**Web**: Full feature support including token streaming

**iOS/Android**: No streaming (SDK limitation), but all other features work

**Image uploads**: Currently disabled due to SDK validation issues

## Deployment

The app is deployed to Vercel:

```bash
npx expo export --platform web
npx vercel dist --prod --yes
```

Production URL will be provided upon deployment.

## Customization

### Changing the Model

Edit `src/utils/coAgent.ts`:

```typescript
model: 'anthropic/claude-sonnet-4-5-20250929'  // or any supported model
```

### Adding Memory Blocks

Create new block definitions in `src/constants/memoryBlocks.ts` and add to `getDefaultMemoryBlocks()`.

### Modifying Behavior

Edit `src/constants/systemPrompt.ts` to change how co thinks about its role and responsibilities.

## Known Limitations

- Image uploads disabled (SDK bug with streaming endpoint)
- Token streaming only works on web (React Native SDK limitation)
- Agent initialization with sleeptime can take 30-60 seconds
- "Refresh Co" button may timeout during recreation

## Philosophy

Most AI assistants are stateless or have shallow memory. They respond to prompts but don't build deep models of who you are.

co is different. It's designed to become your thinking partner through sustained interaction. It notices patterns in how you work, remembers what matters to you, and proactively makes connections you might miss.

The goal isn't to replace your thinking. It's to augment it. To be the cognitive extension that helps you see your own ideas more clearly.

One agent. One relationship. Built over time through conversation.

## Resources

- [Letta Documentation](https://docs.letta.com)
- [Letta Discord](https://discord.gg/letta)
- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)

## License

MIT
