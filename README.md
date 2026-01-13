<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1nVtRqT0F-KmHg-72jJiz0sVdNJxl_NO6

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Build for Android

1. **Install Capacitor CLI tooling** (only once): `npm install`
2. **Generate the production web bundle** we ship to Android:
   - `npm run cap:build`
   - This runs `tsc && vite build` and writes the static assets to `dist`, which Capacitor hosts inside the native shell.
3. **Sync the web output into the Android project** before opening Android Studio:
   - `npm run cap:sync`
   - The script runs `npx cap sync`, which copies `dist` into the native `android/app/src/main/assets` directory and updates Gradle/Capacitor metadata.
4. **Open the Android workspace** in Android Studio:
   - `npm run cap:open:android` (runs `npx cap open android`)
   - Build and run the `app` module from Android Studio; connect your Android phone via USB (enable USB debugging) and choose it as the deployment target.
5. **When you make frontend changes**:
   - Re-run `npm run cap:build` to regenerate `dist`.
   - Re-sync with `npm run cap:sync`.
   - Rebuild from Android Studio (press Run or `./gradlew installDebug` in the `android` folder).

### First-time setup notes

- If you have not already added the Android platform, run `npx cap add android` once; Capacitor will reuse `capacitor.config.json` (see the new file at the repo root).
- Keep Android Studio and the SDK up to date so the Gradle build succeeds.
- For troubleshooting, open `android/app/src/main/assets/capacitor.config.json` to verify it matches `capacitor.config.ts`.

### Quick dev preview on device

- Run `npm run dev -- --host 0.0.0.0 --port 4173` to start the Vite dev server.
- In Android Studio’s Run configuration, enable “Use Chrome DevTools for webview” and point the WebView at `http://<your-local-ip>:4173` if you want live reload during development (remember to keep your phone and dev machine on the same network).
