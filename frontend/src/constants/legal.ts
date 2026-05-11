// Build #30 — Legal documents for UltraLite Browser.
//
// Two ways to expose Privacy Policy + Terms & Conditions to users:
//   1. EXTERNAL_URL  — the public Google-Docs / GitHub-Pages URL where
//                      you host the rendered policy. Settings → "Privacy
//                      Policy" / "Terms & Conditions" opens this URL in
//                      the device's external browser via Linking.openURL.
//                      Play Console REQUIRES a public URL for Privacy
//                      Policy, so this MUST be filled in before submission.
//   2. INLINE_HTML  — a fallback rich-text version bundled inside the
//                      app, rendered in a WebView when the device is
//                      offline OR when the external URL is empty.
//
// Update PRIVACY_POLICY_URL and TERMS_URL with your real Google-Docs
// share-links (or GitHub-Pages URLs) BEFORE the Play Store submission.

// ──────────────────────────────────────────────────────────────────────
//  PUBLIC URLs (Google Docs / GitHub Pages)
// ──────────────────────────────────────────────────────────────────────

/**
 * Public, shareable URL of the Privacy Policy document.
 * Build #31 — wired to the live Google-Doc.  We use the `/preview`
 * suffix instead of `/edit` so Google Docs renders a clean, read-only
 * viewer (no edit toolbar, no sign-in nag) inside the in-app WebView.
 */
export const PRIVACY_POLICY_URL =
  'https://docs.google.com/document/d/1XnS3D4FgItFbiiZAtZRuCiY9YYNySUN6ZKfPqNjUP4Y/preview';

/**
 * Public, shareable URL of the Terms & Conditions document.
 * Build #31 — wired to the live Google-Doc (preview mode, see above).
 */
export const TERMS_URL =
  'https://docs.google.com/document/d/1I7B01N0hUjJZWVVegVXhGJkaNAF3OUFa8Ctdp7w4Aso/preview';

/** Publisher contact email shown in the legal screens. */
export const SUPPORT_EMAIL = 'GemmiApps@gmail.com';

// ──────────────────────────────────────────────────────────────────────
//  Inline / offline fallback versions (rendered in a WebView when the
//  external URL is unreachable). Short summaries — the full text lives
//  in the public docs at the URLs above.
// ──────────────────────────────────────────────────────────────────────

const COMMON_CSS = `
*{box-sizing:border-box;}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;}
body{padding:14px;}h1{font-size:20px;margin:0 0 8px;}h2{font-size:17px;margin:18px 0 6px;}p{margin:6px 0;}ul{padding-left:20px;}li{margin:4px 0;}
.tag{display:inline-block;font-size:11px;padding:2px 6px;border-radius:3px;background:#e8f4ea;color:#1f6f3b;font-weight:700;margin-bottom:8px;}
a{color:#0a58ca;}.muted{color:#666;font-size:12px;margin-top:18px;}
`;

export const PRIVACY_POLICY_INLINE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy</title>
<style>${COMMON_CSS}</style></head><body>
<span class="tag">Offline summary</span>
<h1>UltraLite — Privacy Policy</h1>
<p><strong>Plain-language summary.</strong> Open the full policy at <a href="${PRIVACY_POLICY_URL}">${PRIVACY_POLICY_URL}</a> when you are online.</p>
<h2>What we collect</h2>
<p><strong>Nothing.</strong> UltraLite does not collect, store, or transmit your personal information. There is no sign-up, no account, no email address required, no analytics, no telemetry.</p>
<h2>What stays on your device</h2>
<ul>
<li>Browsing history, bookmarks, downloads, open tabs</li>
<li>Cached cleaned HTML (auto-pruned after 7 days)</li>
<li>Radio favourites, mode preference, data-saver toggles</li>
</ul>
<p>Uninstalling the app, or clearing app data from Android Settings, erases everything instantly. We have no copy.</p>
<h2>Third-party SDK — Google AdMob</h2>
<p>UltraLite shows ads via Google AdMob (the only third-party SDK we use). AdMob may receive your Android Advertising ID (AAID), device model, OS version, language, and country to serve and measure non-personalised ads. Reset / opt out at <em>Android Settings → Privacy → Ads</em>. Read Google's policy at <a href="https://policies.google.com/privacy">policies.google.com/privacy</a>.</p>
<h2>Permissions</h2>
<ul>
<li><strong>INTERNET</strong> — open the websites you ask for</li>
<li><strong>ACCESS_NETWORK_STATE</strong> — detect online / offline</li>
<li><strong>WAKE_LOCK</strong> + <strong>FOREGROUND_SERVICE</strong> — keep radio playing in the background</li>
<li><strong>AD_ID</strong> — required by AdMob</li>
</ul>
<p>UltraLite never asks for location, contacts, mic, camera, SMS, or call log.</p>
<h2>Children</h2>
<p>UltraLite is not directed at children under 13. We do not knowingly collect data from anyone (see above).</p>
<h2>Contact</h2>
<p>Privacy questions: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
<p class="muted">Last updated: January 2026</p>
</body></html>`;

export const TERMS_INLINE_HTML = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms &amp; Conditions</title>
<style>${COMMON_CSS}</style></head><body>
<span class="tag">Offline summary</span>
<h1>UltraLite — Terms &amp; Conditions</h1>
<p><strong>Plain-language summary.</strong> Open the full terms at <a href="${TERMS_URL}">${TERMS_URL}</a> when you are online.</p>
<h2>What UltraLite is</h2>
<p>A free, ad-supported web browser optimised for 2G / sub-64 kbps networks, with an UltraLite text-only mode and a curated radio player. UltraLite is a tool that opens URLs you choose; we do not host content.</p>
<h2>Eligibility</h2>
<p>You must be at least 13 years old (or 16 in EEA) to use UltraLite.</p>
<h2>Your responsibility</h2>
<p>You alone are responsible for the websites you visit, the streams you play, the files you download, and the actions you take through UltraLite. UltraLite does not host, moderate, scan, or warrant any third-party content.</p>
<p>You must comply with the Terms of Service of every website you sign into through UltraLite (Instagram, Facebook, Google, BBC, broadcasters, etc.) and with all laws of every jurisdiction your activity touches.</p>
<h2>Acceptable use — you agree NOT to</h2>
<ul>
<li>Bypass paywalls, login walls, geo-blocks, robots.txt, or rate-limits of any third-party service</li>
<li>Run automated / DDoS-style workloads against any third party through UltraLite</li>
<li>Block, intercept, or interfere with the in-app advertising</li>
<li>Reverse-engineer, repackage, or impersonate UltraLite</li>
<li>Circumvent the "Watch Ad to Unlock" flow with rooted-device hacks</li>
</ul>
<h2>Advertising</h2>
<p>UltraLite is free because of ads served by Google AdMob. Occasional ad-loading delays on slow networks are expected.</p>
<h2>Disclaimer &amp; limitation of liability</h2>
<p>UltraLite is provided "AS IS" and "AS AVAILABLE", with no warranty of uptime, accuracy, or fitness for a particular purpose. The Publisher's total liability is capped at the amount you paid for the App (INR 0 for a free app) or USD 100, whichever is greater. We disclaim all indirect, incidental, special, and consequential damages.</p>
<h2>Indemnification</h2>
<p>You will defend, indemnify, and hold the Publisher harmless from any claim arising out of your use of UltraLite or your breach of these Terms.</p>
<h2>Governing law</h2>
<p>These Terms are governed by the laws of the Republic of India; disputes are subject to the courts of New Delhi.</p>
<h2>Termination</h2>
<p>You may uninstall UltraLite at any time. We may remove specific features or the App if you breach these Terms or if a regulator requires it.</p>
<h2>Contact</h2>
<p>Legal notices: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
<p class="muted">Last updated: January 2026</p>
</body></html>`;
