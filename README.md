# Co - Knowledge Management Assistant

Co is a single-agent knowledge management assistant built with Letta's memory framework. Each user gets their own persistent Co agent that learns and remembers across conversations.

## Features

- 🤖 **Single Agent Model**: One Co agent per user, tagged with `co-app`
- 🧠 **Persistent Memory**: Advanced memory blocks that evolve over time
- 💬 **Real-time Streaming**: Token-by-token message streaming
- 🔧 **Tool Support**: Web search, archival memory, conversation search
- 📱 **Cross-platform**: iOS, Android, and Web support via React Native + Expo
- 🎨 **Modern UI**: Clean, intuitive interface with memory viewer
- 🔒 **Secure**: API token storage with AsyncStorage

## Architecture

Co uses a simplified single-agent architecture:

1. **Login**: User enters Letta API key
2. **Agent Discovery**: App searches for agent with `co-app` tag using `client.agents.list(tags=["co-app"])`
3. **Agent Creation**: If no Co agent exists, creates one with the `createCoAgent()` function
4. **Chat**: User chats directly with their Co agent

### Co Agent Configuration

Co is created with:
- **Model**: `anthropic/claude-sonnet-4-5-20250929`
- **Tools**: `send_message`, `archival_memory_insert`, `archival_memory_search`, `conversation_search`, `web_search`, `fetch_webpage`
- **Memory Blocks**:
  - `persona`: Co's adaptive personality
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
```

### Run Options

- **Web**: `npm run web` or press `w`
- **iOS**: Press `i` (requires Xcode)
- **Android**: Press `a` (requires Android Studio)
- **Mobile Device**: Use Expo Go app and scan QR code

### First Use

1. Launch the app
2. Enter your Letta API key
3. Wait for Co to initialize (creates agent if needed)
4. Start chatting!

## Project Structure

```
ion/
├── App.tsx                   # Main Co application
├── CoLoginScreen.tsx        # Login/authentication screen
├── src/
│   ├── api/
│   │   └── lettaApi.ts       # Letta API client
│   ├── components/
│   │   ├── MessageContent.tsx
│   │   ├── ExpandableMessageContent.tsx
│   │   ├── ToolCallItem.tsx
│   │   └── LogoLoader.tsx
│   ├── types/
│   │   └── letta.ts          # TypeScript definitions
│   ├── utils/
│   │   ├── ionAgent.ts       # Co agent creation logic
│   │   └── storage.ts        # AsyncStorage wrapper
│   └── theme/
│       └── index.ts          # Design system
```

## Key Files

### `src/utils/ionAgent.ts`

Contains the `createCoAgent()` function that defines Co's system prompt, memory blocks, and configuration. This is where you can customize Co's personality and capabilities.

### `src/api/lettaApi.ts`

Letta API client with:
- `findAgentByTags()`: Find agent by tags
- `findOrCreateCo()`: Get or create Co agent
- `sendMessageStream()`: Stream messages from Co
- `listAgentBlocks()`: View memory blocks

### `App.tsx`

Main application with:
- Authentication flow
- Co initialization
- Chat interface
- Memory viewer sidebar
- Tool approval modals

## Customizing Co

### Modify Personality

Edit `src/utils/ionAgent.ts` and update:
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

Update the `model` field in `createCoAgent()`:

```typescript
model: 'openai/gpt-4.1',  // or other supported models
```

## Development

### Tech Stack

- **React Native** + **Expo**: Cross-platform framework
- **TypeScript**: Type safety
- **Letta SDK**: AI agent framework
- **AsyncStorage**: Persistent storage

### Available Scripts

- `npm start` - Start Expo dev server
- `npm run web` - Run in browser
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npx expo start -c` - Clear cache and restart

### Building for Production

```bash
# Web build
npm run build:web

# Mobile builds (requires EAS CLI)
npx eas build --platform all
```

## API Integration

Co connects to Letta's API:

- `GET /agents?tags=co-app` - Find Co agent
- `POST /agents` - Create Co agent
- `GET /agents/{id}/messages` - Load message history
- `POST /agents/{id}/messages/streaming` - Stream messages
- `GET /agents/{id}/blocks` - View memory blocks

## Troubleshooting

### Agent Not Found

If Co fails to initialize:
1. Check API token validity
2. Verify network connection
3. Check console logs for errors

### Memory Blocks Not Loading

- Ensure agent is fully initialized
- Check that `listAgentBlocks()` has proper permissions
- Verify agent ID is correct

### Streaming Issues

- Check network stability
- Verify streaming endpoint support
- Review console logs for chunk errors

## Contributing

Co is a reference implementation. To customize:

1. Fork the repository
2. Modify Co's configuration in `src/utils/ionAgent.ts`
3. Update UI components as needed
4. Test on multiple platforms
5. Submit pull request with clear description

## License

MIT License

## Resources

- [Letta Documentation](https://docs.letta.com)
- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)
