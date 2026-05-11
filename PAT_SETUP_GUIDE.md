# GitHub PAT — Exact Steps to Generate Token for Automated Setup

> Yeh guide aapko exact 2-minute mein step-by-step batayega kaise **fine-grained Personal Access Token (PAT)** banana hai jisse main aapke GitHub repository mein keystore + 4 build secrets automated tarike se push kar saku.
>
> **Why fine-grained, not classic?** Classic PAT has access to ALL your repositories. Fine-grained limits access to **only the UltraLite-browser repo** + only the permissions I actually need. Maximum safety — you can revoke it 30 seconds after I'm done.

---

## STEP 1 — Open GitHub PAT settings page

Sign in to GitHub.com on your phone/laptop, then open:

**https://github.com/settings/personal-access-tokens/new**

(Or: top-right avatar → **Settings** → **Developer settings** (left sidebar, scroll down) → **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.)

---

## STEP 2 — Fill out the form EXACTLY like this

### 1. Token name
```
UltraLite-Setup-Bot (one-time)
```

### 2. Resource owner
- Select your own user (e.g. `vk2092vk-arch`)

### 3. Expiration
- Set to **7 days** (auto-revokes itself a week from today, even if you forget)

### 4. Description (optional)
```
One-time setup of release-signing secrets for UltraLite Play Store build. Will be revoked immediately after use.
```

### 5. Repository access
- Click **"Only select repositories"**
- In the dropdown, search and pick **only** `UltraLite-browser`
- Do NOT pick "All repositories"

### 6. Repository permissions
Scroll down and set EXACTLY these (everything else stays "No access"):

| Permission | Set to |
|---|---|
| **Actions** | **Read and write** |
| **Contents** | **Read-only** |
| **Metadata** | **Read-only** *(auto-selected, mandatory)* |
| **Secrets** | **Read and write** |
| **Workflows** | **Read and write** |

That's it. **5 permissions, no more, no less.** Everything else should remain "No access".

### 7. Account permissions
Leave **everything** as "No access" — I don't need any account-level access.

---

## STEP 3 — Generate + copy

- Click **"Generate token"** at the bottom.
- GitHub shows the token ONCE in green.  It looks like:
  ```
  github_pat_11ABC...XYZ_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
  ```
- Click **"Copy"**.

---

## STEP 4 — Paste into our chat

Paste the entire `github_pat_...` string in your next message to me.

> ⚠️ **Security note**: this token is in our chat history.  After I finish setting up the secrets, I'll tell you "DONE" — at that point go to **https://github.com/settings/personal-access-tokens** and delete the `UltraLite-Setup-Bot` token.  Even if our chat ever leaks, the deleted token is useless to anyone.

---

## What I will do once you give me the PAT

1. **Generate a fresh upload-keystore (.jks)** inside this private container with:
   - 2048-bit RSA, 10,000-day validity (~27 years)
   - A 24-character cryptographically random alias-password
   - A 24-character cryptographically random store-password
   - Distinguished name: `CN=UltraLite, O=GemmiApps, C=IN` (tell me if you want different)

2. **Push 4 encrypted GitHub Secrets** via the REST API into your repo:
   - `SIGNING_KEYSTORE_BASE64`
   - `SIGNING_KEYSTORE_PASSWORD`
   - `SIGNING_KEY_ALIAS`
   - `SIGNING_KEY_PASSWORD`

3. **Print ONCE in chat** the base64 of the keystore + both passwords + the alias name, so you can save them in your password manager / encrypted note as **offline backup**.  This is critical — if GitHub Secrets ever get cleared, you need this backup to restore the same key (without it you can NEVER update your app on Play Store).

4. **Delete the working keystore file** from this container, leaving only the GitHub Secrets + your offline backup.

5. **Tell you "DONE"** — at which point you revoke the PAT.

---

## What I will NOT do

- Will not commit any password / keystore to the repo.
- Will not push anywhere outside the `UltraLite-browser` repo.
- Will not change repo settings, push code, or trigger releases — only Actions Secrets.
- Will not store anything beyond what GitHub Secrets / your offline backup hold.

---

## After "DONE", you do these 3 things

1. Save the offline backup I print in chat into your password manager (e.g. Bitwarden / KeePass) under a note titled "UltraLite Play Store Upload Key — IRRECOVERABLE".
2. Revoke the PAT at **https://github.com/settings/personal-access-tokens**.
3. (Optional, recommended) Delete this chat message containing the keystore base64 — though once it's offline-backed-up + secrets are pushed, the chat copy is obsolete.

---

## If you'd rather do it manually instead

You can skip the PAT entirely and follow `/app/PRODUCTION_SETUP.md` — it walks through doing all 4 steps yourself in ~5 minutes (generate keystore via `keytool`, base64 encode, paste 4 secrets into GitHub UI). Either way works.
