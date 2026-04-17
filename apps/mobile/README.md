# @gym-saas/mobile

Expo 51 mobile application for the Gym SaaS platform.

## Local development

```bash
# From the repo root:
pnpm dev:mobile

# Or from this directory:
pnpm start
```

Scan the QR code with the Expo Go app, or press `i` for iOS simulator / `a` for Android emulator.

## Environment

Copy `.env.example` to `.env` and adjust as needed.
Expo reads variables prefixed with `EXPO_PUBLIC_` at build time.

| Variable               | Description                      |
|------------------------|----------------------------------|
| `EXPO_PUBLIC_API_URL`  | Base URL for the API             |

## Monorepo config

`metro.config.js` extends Expo's default Metro config to watch the workspace root,
enabling Metro to resolve `workspace:*` packages like `@gym-saas/contracts`.

## Production builds

Use [EAS Build](https://docs.expo.dev/build/introduction/) for production:

```bash
npm install -g eas-cli
eas build --platform all
```
