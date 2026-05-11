# UltraLite Browser — Production Build Setup

> **For Play Store release builds** — signed AAB + APK via GitHub Actions, with all secrets stored as GitHub Secrets (NEVER committed to the repo).

---

## What you (the repo owner) must provide

You will create **4 GitHub Secrets** and (optionally) **1 more for Firebase if you use it**.
Everything below is set ONCE per repository.  Nothing here is committed to git — secrets stay encrypted on GitHub's side and are only injected into the build runner at build time.

| # | Secret name | What it is | Required? |
|---|---|---|---|
| 1 | `SIGNING_KEYSTORE_BASE64` | Your Android upload-keystore (.jks) base64-encoded | **Required** |
| 2 | `SIGNING_KEYSTORE_PASSWORD` | Password for the keystore file | **Required** |
| 3 | `SIGNING_KEY_ALIAS` | The alias name inside the keystore (e.g. `ultralite`) | **Required** |
| 4 | `SIGNING_KEY_PASSWORD` | Password for that key alias | **Required** |
| 5 | `GOOGLE_SERVICES_JSON` | Contents of `google-services.json` from Firebase | Optional* |

> \*Firebase is **not used** by the current codebase. Skip secret #5 unless you explicitly add Firebase Analytics / Crashlytics / FCM.

---

## STEP 1 — Generate the upload keystore (one time, on your machine)

> **Important**: This keystore is what Google Play uses to verify every future update of your app. **Lose it = you can never update the app again** under the same listing.  Keep a backup in 2 separate offline locations (encrypted USB / password manager).

Open a terminal on your computer (Linux / macOS / Windows with Java JDK installed) and run:

```bash
keytool -genkeypair -v \
  -keystore ultralite-upload.keystore \
  -alias ultralite \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "YOUR_STORE_PASSWORD" \
  -keypass "YOUR_KEY_PASSWORD" \
  -dname "CN=UltraLite, OU=Mobile, O=UltraLite, L=Delhi, ST=Delhi, C=IN"
```

**Replace:**
- `YOUR_STORE_PASSWORD` → strong password for the keystore file (≥12 chars)
- `YOUR_KEY_PASSWORD`   → strong password for the key alias (can be same as above to keep it simple)
- The `-dname` block → your real name / org / city / country (`C=IN` for India, `C=US` for USA, etc.)

You'll get a file named `ultralite-upload.keystore`.

---

## STEP 2 — Convert keystore to base64 and copy to clipboard

GitHub Secrets only stores text, not binary files, so we encode the keystore as base64:

**Linux / macOS:**
```bash
base64 -i ultralite-upload.keystore | tr -d '\n' > keystore.b64
cat keystore.b64
```
**Windows PowerShell:**
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ultralite-upload.keystore")) | Set-Clipboard
```

Copy the **entire long string** that gets printed.

---

## STEP 3 — Add the 4 secrets on GitHub

1. Open your GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
2. Add each of these one at a time:

| Name | Value |
|---|---|
| `SIGNING_KEYSTORE_BASE64` | Paste the long base64 string from Step 2 |
| `SIGNING_KEYSTORE_PASSWORD` | The `YOUR_STORE_PASSWORD` you chose in Step 1 |
| `SIGNING_KEY_ALIAS` | `ultralite` (or whatever alias you used in Step 1) |
| `SIGNING_KEY_PASSWORD` | The `YOUR_KEY_PASSWORD` you chose in Step 1 |

Click "Add secret" for each.  GitHub now stores them encrypted; **no human (including you) can read them back** — you can only overwrite or delete.

---

## STEP 4 — (Already done) Trigger a build

The workflow file `.github/workflows/build-apk.yml` is already wired to:
1. Detect the secrets are present
2. Decode the keystore at build time only (in-memory on the runner, never written to git)
3. Sign the release AAB + APK with it
4. Upload them as artifacts

To trigger:
- **Auto** — every push to `main` / `master` runs the build (current setup).
- **Manual** — repo → **Actions** → **Build UltraLite Android APK** → **Run workflow**.
- **Tag-based release** — `git tag v1.0.29 && git push --tags` creates a GitHub Release with both files attached.

After the workflow finishes (~12-18 min), download:
- `ultralite-release-aab` artifact → upload **this `.aab`** file to Play Console.
- `ultralite-release-apk` artifact → side-load on test devices via USB / Telegram.

---

## STEP 5 — Upload to Play Console

1. Go to [Play Console](https://play.google.com/console) → your app → **Production** → **Create new release**.
2. **Drop the .aab** file you downloaded from GitHub Actions.
3. Fill in **Release notes**, hit **Review release** → **Start rollout**.

Play Console does its own re-signing with **App Signing by Google Play** — your upload keystore signs the upload, and Google generates the final delivery key.  This is the recommended setup for new apps.

---

## What is NOT a secret (safe to be in the repo)

These are intentionally public — Google Mobile Ads SDK requires them in the bundled APK so AdMob can match impressions to your account:

- `frontend/app.json` → `androidAppId: ca-app-pub-...`
- `frontend/src/constants/ads.ts` → unit IDs

These are designed to be publicly visible. They identify your AdMob account but cannot be used to authenticate as you or steal revenue.  Treat them like a username, not a password.

---

## Local test build (without GitHub Actions)

If you want to verify a release build on your own machine (skip this if you only build via Actions):

```bash
cd frontend
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease   # produces android/app/build/outputs/bundle/release/app-release.aab
```

(The unsigned debug variant works too: `./gradlew assembleDebug`.)

---

## Rotating / replacing the keystore

You generally **shouldn't** — Play Store treats the upload key as identity. If absolutely necessary (e.g. compromised key), see Google's docs on [Upload Key Reset](https://support.google.com/googleplay/android-developer/answer/9842756) — it requires a manual review by Google Play support.

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "App not installed" when sideloading | Uninstall the debug-signed copy first, then install the release APK |
| Play Console: "Your APK is signed with the wrong key" | You changed the keystore mid-life. Either rotate via Google support, or use the original keystore |
| GitHub Action fails at "Decode keystore" | The base64 string was truncated. Re-encode with `base64 -i` (no line wraps) |
| Build OOMs | The workflow already adds 8 GB swap + `Xmx6g`. If still failing, switch to `ubuntu-latest-large` runner |

---

**Last updated**: build #29 (replaced UL logo with new no-circle design across icon / splash / adaptive / favicon / brand hero / hero box; removed extra small UL logos from page headers).
