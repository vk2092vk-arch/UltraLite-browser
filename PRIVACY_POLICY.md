# Privacy Policy — UltraLite Browser

**Last updated:** January 2026
**Effective from:** First app installation

This Privacy Policy describes how the UltraLite Browser mobile application ("UltraLite", "we", "our", or "the App") handles information when you use the App. By installing or using UltraLite you agree to this policy. If you do not agree, please uninstall the App.

UltraLite is published by **the UltraLite team** ("Publisher"). For privacy questions, contact: **support@ultralite.app** *(replace with your real contact email before publishing)*.

---

## 1. Summary in plain language

- **We do NOT collect your personal information.** No sign-up, no account, no email, no phone number is required to use UltraLite.
- **We do NOT track you.** UltraLite does not run analytics, telemetry, or fingerprinting code.
- **We do NOT sell, share, or transfer your data to any third party.** Because we never collect it in the first place.
- **All your browsing history, bookmarks, downloads, tabs, and radio favourites stay ON YOUR DEVICE only.** Nothing is uploaded to any server we operate.
- **The only third-party that may receive data** is Google AdMob (for serving advertisements) — and only the limited data Google's SDK is contractually entitled to collect from any Android app showing ads. See Section 5.

---

## 2. Information UltraLite stores **on your device** (never sent to us)

UltraLite is a fully on-device app. The following data is created and stored **locally** on your phone (in the app's private SQLite database / AsyncStorage), and is **not transmitted to any server we control**:

| Data | Purpose | Where it lives |
|---|---|---|
| Browsing history | Show recently visited pages | Local SQLite (`history` table) |
| Bookmarks | User-saved page links | Local SQLite (`bookmarks` table) |
| Downloads | Files you downloaded through UltraLite | Local SQLite + your phone's Downloads folder |
| Open tabs (per mode) | Restore tabs across app restarts | Local SQLite (`tabs` table) |
| Cached cleaned HTML | Faster repeat-visits on UltraLite mode | Local SQLite (`html_cache`, auto-pruned after 7 days) |
| Radio favourites | Stations you starred | Local SQLite (`radio_favorites` table) |
| Mode preference (Normal / UltraLite) | Remember your last setting | AsyncStorage |
| Data Saver toggles (Allow Images / JavaScript / Desktop View) | Remember your preferences | AsyncStorage |
| Radio unlock timestamp | Honour the 30-minute ad-unlock window | AsyncStorage |

You can erase all of the above instantly by **uninstalling the App** or by going to **Android Settings → Apps → UltraLite → Storage → Clear data**.

We have **zero technical ability** to read, recover, or restore this data because it never leaves your device.

---

## 3. Information UltraLite does NOT collect

To make this unambiguous, UltraLite does **NOT** collect any of the following, on any platform, ever:

- Your name, email, phone number, or any contact details
- Your physical address, GPS location, or coarse network location
- Your phone's IMEI, IMSI, MAC address, serial number, or SIM details
- Your contacts, calendar, photos, microphone, or camera input
- Your typing pattern, keystrokes, or autocomplete selections
- Your browsing history (we don't have a server to send it to)
- Any biometric identifiers
- Health, financial, or government-ID information
- Any usage analytics, crash reports, telemetry, or A/B testing signals

---

## 4. Permissions UltraLite requests, and why

| Permission | Why UltraLite needs it |
|---|---|
| `INTERNET` | To open the websites you ask to visit |
| `ACCESS_NETWORK_STATE` | To detect whether you're online before issuing requests |
| `WAKE_LOCK` | So radio playback continues with the screen off |
| `FOREGROUND_SERVICE` | To keep radio playing while you switch apps (Android requirement for audio in background) |
| `com.google.android.gms.permission.AD_ID` | Required by Google AdMob SDK to serve and measure non-personalised ads |

UltraLite does **not** request location, contacts, microphone, camera, SMS, call log, photos, files outside the Downloads folder, or any other sensitive permission.

---

## 5. Advertising — Google AdMob (third-party SDK)

UltraLite displays advertisements through **Google AdMob**, a Google service. AdMob is the only third-party SDK we embed.

When ads are loaded, **Google** (not UltraLite) may collect a limited set of data as described in [Google's policy for AdMob](https://support.google.com/admob/answer/6128543) and [Google's main Privacy Policy](https://policies.google.com/privacy):

- Your **Android Advertising ID (AAID)** — a resettable ID Google uses to limit ad frequency and measure ad performance. You can reset or opt out of personalised ads any time at **Android Settings → Privacy → Ads**.
- Your **device's general info** (device model, OS version, language, country, coarse IP-derived region)
- **Whether an ad was shown, viewed, clicked, or rewarded** (for our reporting & their billing)
- For **reward-based ads** (the "Watch Ad to Unlock 30 min Radio" feature), AdMob receives a confirmation when you finish watching, so it can credit our account

UltraLite **requests only non-personalised ads** by default (`requestNonPersonalizedAdsOnly: true` is set in our AdMob configuration). This means Google does not use cross-app behavioural tracking to target you in our app.

We, the UltraLite Publisher, only see **aggregated, anonymised reports** in our AdMob dashboard (e.g. "X impressions in country Y on date Z"). We do not see and cannot recover any individual user's identity, location, or behaviour.

If you have an ad-related complaint, please contact Google AdMob directly via the link above; we have no engineering ability to reach into Google's ad pipeline on your behalf.

---

## 6. Radio streaming

When you play a radio station, your device connects **directly** to the broadcaster's stream URL (e.g. `air.pc.cdn.bitgravity.com`, `ice2.somafm.com`, `stream.live.vc.bbcmedia.co.uk`). UltraLite is not a proxy — your device's IP address reaches the broadcaster, just like with any browser. UltraLite does **not** observe what you listened to, for how long, or which station.

The list of curated stations bundled with the App is sourced from publicly-published broadcaster endpoints. UltraLite does not host, transcode, or re-broadcast any audio content.

---

## 7. Web browsing

UltraLite is a web browser. The websites you visit decide independently what data to collect from you (cookies, IP address, fingerprints, etc.). UltraLite does **not** alter, observe, or report any of that — it is between you and the website you chose to visit. We strongly recommend you read the privacy policy of every website you sign into.

In **UltraLite mode** (Pure Legacy), UltraLite optionally routes the page through a public read-only HTML cleaner (`r.jina.ai`) to strip JavaScript, ads, and trackers before display. The cleaner sees only the URL you requested — not your device or identity. You can disable this any time in **Data Saver Settings → Allow JavaScript = ON**, which switches the App to direct browsing.

---

## 8. Children's privacy

UltraLite is rated for general audiences and is **not directed to children under 13**. We do not knowingly collect any data from anyone — including children — because we do not collect data at all (see Sections 2-3). Parents and guardians who notice their child using UltraLite are encouraged to use Android's built-in **Family Link / Digital Wellbeing** controls if they wish to restrict access.

If a parent or guardian believes the App is being misused, please contact us at the support email above and we will assist.

---

## 9. International users — GDPR, CCPA, DPDP

Because UltraLite does not collect personal data about you, the rights given to you under the EU **GDPR**, the California **CCPA / CPRA**, India's **DPDP Act 2023**, the UK **DPA**, Brazil's **LGPD**, and other regional privacy laws are honoured automatically — there is nothing held about you to access, correct, port, restrict, or delete on our side.

For data Google AdMob holds on you, please use Google's tools at [myaccount.google.com](https://myaccount.google.com) or contact Google directly.

---

## 10. Security

Even though no personal data is collected, we still take basic engineering precautions:

- All network traffic from UltraLite is over **HTTPS** wherever the destination supports it.
- The local databases sit inside Android's **per-app sandbox** — other apps on your phone cannot read them.
- The App is signed with our private upload key and verified by Google Play before installation.

No method of digital transmission is 100% secure. If you become aware of a security issue with the App, please email us at the support email above and we will respond as quickly as possible.

---

## 11. Changes to this Privacy Policy

If we update this policy, we will:

1. Update the "Last updated" date at the top.
2. Push the new version of UltraLite to the Play Store with the changes bundled in **Settings → Privacy Policy**.

Continuing to use UltraLite after an update means you accept the revised policy. If you do not accept, please uninstall the App.

---

## 12. Contact

For any privacy question, complaint, or take-down request, write to:

**support@ultralite.app** *(replace with your real contact before publishing)*

We aim to acknowledge every email within **5 working days**.
