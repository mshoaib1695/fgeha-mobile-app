# FGEHA — Resident's Service Portal (Mobile)

Mobile app for **FGEHA** (Federal Government Employees Housing Authority) residents to sign in, view the daily bulletin, submit requests, and track their request status.

## Features

- **Authentication** — Sign in and register with email/password
- **Home** — View today’s daily bulletin and open attached files
- **Create request** — Choose a request type and submit a new request (with optional photo and location)
- **My requests** — List your requests with status (Pending, In progress, Done) and open details

The app talks to the same backend API as the admin panel. You need the backend running and reachable for the app to work.

## Prerequisites

- **Node.js** 18+ and npm
- **Expo Go** on your phone (for development), or Android Studio / Xcode for emulators
- **Backend** — The RSP backend must be running (see the main project README)

## Setup

1. **Clone and enter the app folder**
   ```bash
   cd fgeha-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure the API URL**
   - Copy `.env.example` to `.env`
   - Set `EXPO_PUBLIC_API_URL` to your backend base URL (no trailing slash)
   - On a **physical device**, use your computer’s LAN IP so the phone can reach the backend, e.g.:
     ```env
     EXPO_PUBLIC_API_URL=http://192.168.1.100:8080
     ```
   - On an **emulator**, `http://localhost:8080` or `http://10.0.2.2:8080` (Android) often works.

4. **Start the app**
   ```bash
   npm start
   ```
   Then scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `a` / `i` for Android/iOS emulator.

## Scripts

| Command | Description |
|--------|-------------|
| `npm start` | Start Expo dev server (clears cache) |
| `npm run android` | Start and open on Android |
| `npm run ios` | Start and open on iOS |
| `npm run web` | Start and open in browser |

## Building an APK (Android)

To produce a standalone APK:

1. **Using EAS Build (recommended)**  
   From the `fgeha-app` folder:
   ```bash
   npx eas-cli build --platform android --profile preview
   ```
   Log in with your Expo account when prompted. When the build finishes, download the APK from the link or from [expo.dev](https://expo.dev) → your project → Builds.  
   For a production-style build:
   ```bash
   npx eas-cli build --platform android --profile production
   ```

2. **Local build**  
   Generate the native Android project and build locally:
   ```bash
   npx expo prebuild --platform android
   cd android
   .\gradlew.bat assembleRelease
   ```
   APK path: `android\app\build\outputs\apk\release\app-release.apk`  
   (Requires Android Studio / Android SDK and JDK.)

Build profiles (e.g. `preview` vs `production`) are defined in `eas.json`.

## Project structure

```
fgeha-app/
├── app/                 # Expo Router screens
│   ├── index.tsx        # Loading / auth gate
│   ├── login.tsx        # Sign in
│   ├── register.tsx    # Sign up
│   ├── pending.tsx     # Pending approval screen
│   └── (tabs)/         # Main app (after login)
│       ├── index.tsx   # Home (daily bulletin)
│       ├── create-request/  # New request flow
│       └── my-requests.tsx  # List of user's requests
├── assets/              # Images (e.g. logo.png)
├── lib/                 # Shared logic
│   ├── api.ts           # API client & EXPO_PUBLIC_API_URL
│   ├── auth-context.tsx # Auth state
│   ├── alert-context.tsx & AppAlert.tsx  # In-app alerts
│   └── theme.ts         # Colors & gradients
├── app.json             # Expo config (name, splash, icons)
├── eas.json             # EAS Build profiles (APK/AAB)
└── package.json
```

## Tech stack

- **Expo** ~54 (React Native)
- **Expo Router** — file-based routing
- **React** 19, **TypeScript**
- **expo-linear-gradient**, **expo-image-picker**, **expo-location** (for request creation)
- **AsyncStorage** — auth token persistence

## Environment

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend base URL (e.g. `http://192.168.1.100:8080`). Required for API calls. |

After changing `.env`, restart the dev server: `npx expo start -c`.
