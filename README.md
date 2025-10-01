# co

A minimalist chat interface for Letta AI agents. Each user gets their own persistent co agent that learns and remembers across conversations.

## Features

- 🤖 **Single Agent**: One co agent per user, automatically created on first login
- 🧠 **Persistent Memory**: Advanced memory blocks that evolve over time
- 💬 **Smooth Streaming**: Token-buffered streaming (50 FPS) for consistent text appearance
- 🎨 **Polished UI**: Clean, minimal interface with animated message transitions
- 🌓 **Theme Toggle**: Switch between light and dark modes
- 🔧 **Tool Support**: Web search, archival memory, conversation search
- 📱 **Cross-platform**: iOS, Android, and Web support via React Native + Expo
- 🔒 **Secure**: API token storage with AsyncStorage/SecureStore

## Architecture

co uses a simplified single-agent architecture:

1. **Login**: User enters Letta API key
2. **Agent Discovery**: App searches for agent with `co-app` tag
3. **Auto-creation**: If no co agent exists, creates one automatically
4. **Chat**: User chats directly with their co agent

### co Agent Configuration

co is created with:
- **Model**: `anthropic/claude-sonnet-4-5-20250929`
- **Tools**: `send_message`, `archival_memory_insert`, `archival_memory_search`, `conversation_search`, `web_search`, `fetch_webpage`
- **Memory Blocks**:
  - `persona`: co's adaptive personality
  - `human`: User profile that evolves
  - `approach`: Conversation and memory approach
  - `working_theories`: Active theories about the user
  - `notes_to_self`: Reminders for future reference
  - `active_questions`: Questions to explore
  - `conversation_summary`: Ongoing conversation overview

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Letta API token from [letta.com](https://letta.com)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# For production performance (recommended)
npm run web:prod
```

### Run Options

- **Web**: `npm run web` or press `w`
- **iOS**: Press `i` (requires Xcode)
- **Android**: Press `a` (requires Android Studio)
- **Mobile Device**: Use Expo Go app and scan QR code

### First Use

1. Launch the app
2. Enter your Letta API key
3. Wait for co to initialize (creates agent if needed)
4. Start chatting!

## Project Structure

```
co/
├── App.tsx                   # Main application
├── CoLoginScreen.tsx         # Login/authentication
├── web-styles.css            # Web-specific CSS for focus states and themes
├── src/
│   ├── api/
│   │   └── lettaApi.ts       # Letta API client
│   ├── components/
│   │   ├── MessageContent.tsx           # Markdown message rendering
│   │   ├── ExpandableMessageContent.tsx # Collapsible long messages
│   │   ├── ToolCallItem.tsx             # Tool execution display
│   │   └── LogoLoader.tsx               # Loading animations
│   ├── types/
│   │   └── letta.ts          # TypeScript definitions
│   ├── utils/
│   │   ├── coAgent.ts        # co agent creation logic
│   │   └── storage.ts        # AsyncStorage wrapper
│   └── theme/
│       ├── index.ts          # Theme system
│       ├── colors.ts         # Color palette
│       └── typography.ts     # Font definitions
```

## Key Features

### Smooth Token Streaming

Messages stream at 50 FPS with a token buffer that releases 1-3 characters at a time for consistent, natural text appearance. A hollow circle indicator (○) appears at the end of streaming text.

### Animated Message Layout

When you send a message:
1. Message appears at the bottom
2. An animated spacer grows beneath it (400ms animation)
3. Your message smoothly rises to the top of the viewport
4. co's response fills the reserved space below

This creates a clean reading experience where your message stays visible with room for the response.

### Theme Support

Toggle between light and dark modes with inverted text input styling:
- **Dark mode**: White background input with black text
- **Light mode**: Black background input with white text

### Memory Viewer

Access co's memory blocks through the sidebar to see what co has learned about you and how it's evolving its understanding over time.

## Customizing co

### Modify Personality

Edit `src/utils/coAgent.ts` and update:
- System prompt
- Memory block initial values
- Available tools
- Model selection

### Add Memory Blocks

Add new blocks to the `memoryBlocks` array in `createCoAgent()`:

```typescript
{
  label: 'custom_block',
  value: 'Custom content here...',
}
```

### Change Model

Update the `model` field in `findOrCreateCo()`:

```typescript
model: 'openai/gpt-4.1',  // or other supported models
```

## Development

### Tech Stack

- **React Native** + **Expo**: Cross-platform framework
- **TypeScript**: Type safety
- **Letta SDK** (`@letta-ai/letta-client`): AI agent framework
- **AsyncStorage/SecureStore**: Persistent storage
- **React Native Markdown Display**: Markdown rendering
- **Lexend Font**: Custom typography

### Available Scripts

- `npm start` - Start Expo dev server
- `npm run web` - Run in browser (dev mode)
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npx expo start -c` - Clear cache and restart

### Production Build

For better performance:

```bash
# Development with production optimizations
npx expo start --web --no-dev --minify

# Static production build
npx expo export:web
npx serve web-build
```

## API Integration

co connects to Letta's API:

- `GET /agents?tags=co-app` - Find co agent
- `POST /agents` - Create co agent
- `GET /agents/{id}/messages` - Load message history
- `POST /agents/{id}/messages/streaming` - Stream messages
- `GET /agents/{id}/blocks` - View memory blocks

## Troubleshooting

### Agent Not Found

If co fails to initialize:
1. Check API token validity at letta.com
2. Verify network connection
3. Check console logs for errors
4. Try logging out and back in

### Memory Blocks Not Loading

- Ensure agent is fully initialized
- Check that `listAgentBlocks()` has proper permissions
- Verify agent ID is correct

### Streaming Issues

- Check network stability
- Verify streaming endpoint support
- Review console logs for chunk errors
- Try clearing Expo cache: `npx expo start -c`

### Slow Performance

Run the app with production optimizations:
```bash
npx expo start --web --no-dev --minify
```

## License

MIT License

## Resources

- [Letta Documentation](https://docs.letta.com)
- [Letta LLMs.txt](https://docs.letta.com/llms.txt)
- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
