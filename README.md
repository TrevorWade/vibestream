# 🎵 VibeStream

**Elevate your local music and audiobook experience with AI-powered insights.**

VibeStream is a feature-rich, privacy-first local media player designed for music lovers and audiobook enthusiasts. With a sleek, Spotify-inspired interface and cutting-edge Google Gemini AI integration, it transforms your local library into a dynamic, insightful listening experience.

---

## ✨ Key Features

### 🎧 The Ultimate Local Player
*   **Spotify-Inspired UI:** A premium, high-performance dark theme designed for both desktop and mobile.
*   **Smart Shuffle:** Beyond random—use our weight-based logic to prioritize tracks you love or rediscover hidden gems.
*   **Privacy-First:** Your data stays on your device. We use browser-native IndexedDB to manage your library.

### 🤖 AI-Powered "Vibes"
*   **Gemini Integration:** Instantly generate poetic vibe descriptions and deep-dive lyrics analysis for any track in your library.
*   **Smart Playlists:** (Coming Soon) AI-curated playlists based on the mood of your songs.

### 📚 Full Audiobook Suite
*   **Chapter Support:** Full support for M4B and MP4 chapters with easy navigation.
*   **Persistent Bookmarks:** Never lose your place again. Bookmarks and progress are saved automatically.
*   **Speed Control:** Adjustable playback speed for the perfect listening pace.

### 📱 Truly Cross-Platform
*   **Native Android:** Built with Capacitor for a seamless mobile experience.
*   **Responsive Web:** Full functionality on desktop browsers with optimized layouts.

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (Latest LTS)
*   [Gemini API Key](https://aistudio.google.com/app/apikey) (For AI features)

### Local Development
1.  **Clone and Install:**
    ```bash
    npm install
    ```
2.  **Configure Environment:**
    Copy `.env.example` to `.env.local` and add your `GEMINI_API_KEY`.
3.  **Run Dev Server:**
    ```bash
    npm run dev
    ```

---

## 📱 Mobile Deployment (Android)

VibeStream uses **Capacitor** to run as a native Android app.

1.  **Build Web Bundle:**
    ```bash
    npm run cap:build
    ```
2.  **Sync to Android Project:**
    ```bash
    npm run cap:sync
    ```
3.  **Open in Android Studio:**
    ```bash
    npm run cap:open:android
    ```
    *Build and run from Android Studio onto your device.*

---

## 🛠 Tech Stack

*   **Frontend:** React, Vite, TailwindCSS, Lucide Icons
*   **Storage:** IndexedDB (via custom service)
*   **AI:** Google Gemini SDK (@google/genai)
*   **Native Bridge:** Capacitor
*   **Metadata:** music-metadata-browser

---

## 🔒 Security & Privacy

VibeStream is designed with security in mind:
*   **Client-Side Only:** Your audio files are never uploaded to any server.
*   **Secure API Handling:** API keys are never bundled; they are injected via environment variables.

---

<div align="center">
  <p>Made with ❤️ for local music collectors.</p>
</div>
