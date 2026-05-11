# UltraLite — Setup & Build Guide

UltraLite is a 64kbps text-only browser with built-in worldwide radio (≤64kbps), AdMob monetisation, and strict privacy (no logs).

## 🚀 First-time GitHub setup (Required, one-time only)

After clicking **Save to GitHub** on Emergent, your code is on GitHub but the
APK build also needs **secrets** to sign the APK and access Firebase.

### 1) Create your Android signing keystore (one time, on your PC)

Use any Android device or PC with Java installed:

```bash
keytool -genkey -v -keystore ultralite.keystore \
  -alias ultralite \
  -keyalg RSA -keysize 2048 -validity 10000
```

You will be asked to set:
- **Keystore password** — remember this
- **Key password** — remember this (often same as keystore password)

Now base64-encode it (for storing in GitHub Secrets):

```bash
# Linux / macOS
base64 -w 0 ultralite.keystore > ultralite.keystore.base64.txt

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ultralite.keystore")) | Out-File ultralite.keystore.base64.txt
```

> ⚠️ **Save `ultralite.keystore` somewhere safe** — you need the same keystore
> for every Play Store update. Lose it and you cannot push updates.

### 2) Add GitHub Secrets

Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.

| Secret name | Value |
|---|---|
| `SIGNING_KEYSTORE_BASE64` | Paste the contents of `ultralite.keystore.base64.txt` |
| `SIGNING_KEYSTORE_PASSWORD` | Your keystore password |
| `SIGNING_KEY_ALIAS` | `ultralite` (or whatever alias you used) |
| `SIGNING_KEY_PASSWORD` | Your key password |
| `GOOGLE_SERVICES_JSON` | (Optional) Paste your Firebase google-services.json contents — only needed if you removed it from the repo for privacy |

### 3) Build the APK

Push any commit to `main` (or click "Save to GitHub" again). The workflow at
`.github/workflows/build-apk.yml` will run automatically:

- Open your repo → **Actions** tab → wait ~10–15 minutes
- Once green ✅, scroll down to **Artifacts** → download `ultralite-release-apk`
- Install on your phone (you may need to enable "Install unknown apps" for the source)

For a **GitHub Release** with the APK attached, push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Then check **Releases** on the right sidebar.

## 🧪 Testing AdMob safely

Your real device's advertising ID `553c7721-4821-461b-9f62-8584b1e60745` is whitelisted in the app, so you will see real production ads marked as **Test Ad** on your phone. **Do not** click your own ads on a non-test device — that triggers "invalid traffic" suspension.

In development (Expo Go / dev-client), Google's demo IDs are used automatically — completely safe.

## 📁 Project structure

```
frontend/
├── app/                      # Expo Router screens (file-based routing)
│   ├── _layout.tsx           # Root layout + mandatory disclaimer
│   ├── index.tsx             # Splash (3.2s) + AppOpen ad pre-load
│   ├── home.tsx              # Browser screen (WebView)
│   ├── radio.tsx             # Radio & Music + reward gate
│   ├── history.tsx
│   ├── bookmarks.tsx
│   └── settings.tsx
├── src/
│   ├── ads/AdManager.ts      # AppOpen / Banner / Interstitial / Rewarded
│   ├── components/           # Header, ModeToggle, MenuSheet, AdBanner
│   ├── constants/            # ads.ts, theme.ts
│   ├── services/             # radioBrowser.ts (radio-browser.info client)
│   ├── state/                # appState.ts (mode + reward unlock)
│   ├── storage/              # db.ts (SQLite — local only)
│   └── utils/url.ts          # DuckDuckGo Lite + r.jina.ai builder
└── google-services.json      # (NOT committed — use GitHub Secret)
```

## 🔐 Privacy & Compliance

- **No backend logging.** All history/bookmarks live only in SQLite on the device.
- **DuckDuckGo strict SafeSearch** locked via `kp=-2` parameter.
- **AD_ID permission** declared (Play Store requirement for Android 13+).
- **Disclaimer** mandatory on first launch.
- All ad units use real production IDs, gated by:
  - Test device whitelist for safe development
  - Demo IDs in `__DEV__` mode

## 🛠️ Local development (optional)

```bash
cd frontend
yarn install
npx expo start
```

Scan the QR code with Expo Go (limited — AdMob native module needs dev-client build for full testing).
