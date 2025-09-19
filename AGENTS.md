# Repository Guidelines

## Project Structure & Module Organization
- Root Expo React Native app: `App.tsx`, `src/` (feature folders: `api/`, `components/`, `navigation/`, `screens/`, `store/`, `theme/`, `types/`, `utils/`), assets in `assets/`.
- Web demo (Next.js) lives in `letta-chatbot-example/` with its own tooling and config.
- API client/service: `src/api/lettaApi.ts`. State: `src/store/appStore.ts` (Zustand). Theming tokens: `src/theme/`.

## Build, Test, and Development Commands
- React Native (Expo) from repo root:
  - `npm start` – start Expo dev server.
  - `npm run ios` / `npm run android` / `npm run web` – launch platform targets.
- Web demo:
  - `cd letta-chatbot-example && npm run dev` – start Next.js dev server.
  - `npm run build` / `npm start` – production build/serve.
  - `npm run lint` / `npm run format[:fix]` – linting/formatting (web demo only).
- Testing:
  - Web demo includes Cypress; run via `cd letta-chatbot-example && npx cypress open` or `npx cypress run`.

## Coding Style & Naming Conventions
- Language: TypeScript throughout.
- Components/files: PascalCase for React components (e.g., `MessageBubble.tsx`), camelCase for variables/functions, UPPER_SNAKE_CASE for constants.
- Keep modules focused; colocate UI in `src/components`, navigation in `src/navigation`, theme tokens in `src/theme`.
- Formatting: follow existing style in the RN app; the web demo enforces Prettier/ESLint via project scripts.

## Testing Guidelines
- Prefer integration/behavior tests in the web demo (Cypress).
- Name tests to mirror source files and intent (e.g., `feature-name.cy.ts`).
- For RN app, add test scaffolding only where it adds value; document how to run it in PRs if introduced.

## Commit & Pull Request Guidelines
- Use clear, imperative commit messages. Conventional Commits are encouraged: `feat: …`, `fix: …`, `chore: …`.
- PRs should include:
  - Summary, screenshots/screencasts for UI changes, and steps to verify.
  - Linked issues, scope of impact, and migration notes (if any).
  - Platform checked (iOS/Android/Web) when touching RN UI.

## Security & Configuration Tips
- Don’t commit secrets. The web demo provides `.env.template`; copy to `.env.local` and fill values.
- Expo app persists tokens via Secure Store/AsyncStorage; keep keys in `src/utils/storage.ts` consistent.
- Network/API configuration should go through `src/api/lettaApi.ts`.
