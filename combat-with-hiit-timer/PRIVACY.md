# MyCombat — Privacy Policy & Play Store Data Safety

> Use this to fill the Play Console **Data Safety** form and publish a privacy policy.
> This app is **100% local-first**: it does not collect, transmit, or share any user data.

## Data Safety Form Answers (Play Console)

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **No** |
| Is all of the user data collected by your app encrypted in transit? | N/A — no data is collected or transmitted |
| Do you provide a way for users to request that their data is deleted? | N/A — no user data is stored server-side |
| Has this app been reviewed for security? | N/A — no network data collection |

## Privacy Policy (paste into Play Console → App content → Privacy policy)

**Effective date: 2026-08-09**

MyCombat ("the App") provides voice-guided martial arts combination training and HIIT timer functionality.

### Data Collection

**The App does not collect, store, transmit, or share any personal data.**

All App content — including training combinations, user favorites, custom styles, settings, and workout history — is stored **locally on your device** only (device-local application storage). No account is required. No analytics, advertising, or third-party SDKs with data collection are used by default.

### Optional Analytics

The App includes an optional, opt-in analytics hook (PostHog) that is **disabled by default** and only active if a project key is configured by the developer in a release build. When enabled, it records aggregate, non-identifiable events (e.g., "a workout session was completed", "a drill was started") to improve the App. No names, email addresses, or device identifiers are transmitted. Events use a fixed, non-identifiable session identifier.

### Permissions

The App uses:
- **Microphone**: not used. The App uses text-to-speech (voice output) only; it never records audio.
- **Motion sensors (accelerometer)**: optional "tap-to-stop" hands-free control — accelerometer readings are processed on-device and never leave the device.

### Data Retention & Deletion

Because all data is stored locally on your device, uninstalling the App deletes it. There is no server-side data to delete.

### Children's Privacy

The App is rated Everyone and does not collect personal information from anyone, including children.

### Contact

For privacy questions: developer@mycombat.app (placeholder — replace with your address).

---

## Play Console Release Checklist (from the production audit)

- [ ] Set `android.package` to `com.gamifiedlivingapps.mycombat` ✅ (in app.json)
- [ ] Publish privacy policy URL (host this file, or a gist/page) and paste URL into Play Console
- [ ] Fill Data Safety form using the answers above
- [ ] Set app name to **MyCombat** in Play Console (matches app.json)
- [ ] Update icon/splash from default Expo assets (optional but recommended)
- [ ] Verify `POSTHOG_KEY` is configured or intentionally left blank
- [ ] Confirm Billing is behind the dev-build gate before the store release (Phase 2)
