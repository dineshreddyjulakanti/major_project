# Moodify Mobile Frontend

React Native (Expo) app for your existing mood backends.

## Flow Implemented

1. Home screen with centered **Enter** button.
2. Mode screen with 3 buttons: **Audio**, **Image**, **Txt**.
3. Each mode has two options:
   - Audio: storage file / live recording
   - Image: gallery file / live camera capture
   - Txt: live text input / `.txt` file upload

## Backend URL Setup

Edit `src/services/api.js` and set these:

- `audio.baseUrl`
- `image.baseUrl`
- `text.baseUrl`

Use your machine IP (not localhost) when testing on a phone, for example:

- `http://192.168.1.10:8001`
- `http://192.168.1.10:8002`
- `http://192.168.1.10:8003`

## Run

```bash
cd mobile-app
npm install
npm run start
```

Then open with Expo Go and test each mode.
