# Letta Chat - React Native App

A React Native application for iOS, Android, and web that connects users to Letta AI agents for conversations.

## Features

- 🤖 Connect to Letta AI agents via API
- 💬 Real-time chat interface
- 📱 Cross-platform (iOS, Android, Web)
- 🎨 Modern, intuitive UI design
- 🗂️ Agent selection drawer
- 🔒 Secure API token management
- 💾 Persistent chat history

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- Letta API token

### Installation

1. Navigate to the project directory:
   ```bash
   cd /path/to/letta-chat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Choose your platform:
   - **Web**: Run `npm run web` or press `w` in the terminal
   - **iOS Simulator**: Press `i` in the terminal (requires Xcode)
   - **Android Emulator**: Press `a` in the terminal (requires Android Studio)  
   - **Mobile Device**: Download Expo Go app and scan the QR code

### Quick Start for Web

To run the web version immediately:
```bash
npm run web
```
The app will open in your browser at `http://localhost:8081`

### Configuration

1. Get your Letta API token from the Letta dashboard
2. Open the app and go to Settings
3. Enter your API token and tap "Save & Connect"
4. Create or select an agent from the drawer
5. Start chatting!

## Architecture

### Tech Stack

- **React Native** with Expo for cross-platform development
- **TypeScript** for type safety
- **React Navigation** for navigation (drawer + stack)
- **Zustand** for state management
- **Axios** for API calls
- **React Native Paper** components
- **AsyncStorage** for persistence

### Project Structure

```
src/
├── api/           # API service layer
├── components/    # Reusable UI components
├── screens/       # Main app screens
├── navigation/    # Navigation configuration
├── store/         # Zustand state management
├── types/         # TypeScript definitions
└── utils/         # Helper functions
```

### Key Components

- **MessageBubble**: Individual chat messages
- **AgentCard**: Agent selection cards
- **ChatInput**: Message input component
- **AgentsDrawerContent**: Sidebar agent list

### API Integration

The app connects to Letta's REST API endpoints:

- `GET /agents` - List available agents
- `POST /agents` - Create new agents  
- `GET /agents/{id}/messages` - Get message history
- `POST /agents/{id}/messages` - Send messages

## Development

### Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android
- `npm run ios` - Run on iOS
- `npm run web` - Run in web browser

### Building

For production builds:

```bash
# Build for web
npm run build:web

# Build for mobile (requires EAS CLI)
npx eas build --platform all
```

## Customization

### Themes & Styling

The app uses a consistent design system with:
- iOS-style design patterns
- Custom color scheme
- Responsive layouts
- Dark/light mode support (future)

### API Configuration

Update `src/api/lettaApi.ts` to modify:
- Base URL
- Request/response handling
- Error handling
- Authentication

## Troubleshooting

### Common Issues

1. **Metro bundler stuck**: Clear cache with `npx expo start -c`
2. **Dependencies conflicts**: Run `npx expo install --fix`
3. **API connection issues**: Check token validity and network

### Debug Mode

Enable debug logging by setting:
```typescript
const DEBUG = true;
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test on multiple platforms
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Documentation

- [Letta Documentation](https://docs.letta.com)
- [React Native Docs](https://reactnative.dev)
- [Expo Docs](https://docs.expo.dev)