# Submission readiness — Explicater v1.0.0

Target: Obsidian Community directory (https://community.obsidian.md).
Submission is now done through the community site (sign in with an Obsidian
account, link GitHub, "Add a plugin"), NOT the old obsidian-releases PR.
The directory reads `manifest.json` at the HEAD of the default branch and
downloads `main.js`/`manifest.json` from the GitHub release whose tag equals
the manifest `version`.

## Checklist (verified against docs.obsidian.md, 2026-11-23)

| Requirement | Status |
|---|---|
| README.md describing purpose + usage | ✅ |
| LICENSE (MIT, GitHub-recognized) | ✅ |
| manifest.json at repo root, id unique, no "obsidian" in id | ✅ `explicater` — checked against all 10,745 directory entries |
| Description ≤250 chars, ends with ".", action-first, no emoji | ✅ 153 chars |
| `isDesktopOnly: true` (uses Node/Electron APIs via Playwright) | ✅ |
| `minAppVersion` set | ✅ 1.8.0 (Web viewer core plugin introduced in 1.8) |
| versions.json mapping plugin version → minAppVersion | ✅ `{"1.0.0": "1.8.0"}` |
| Command id does not repeat plugin id | ✅ `explain-selection` |
| No sample-plugin code | ✅ |
| Release tag == manifest version, no `v` prefix | ⚠️ current tag is `v1.0.0` — must retag as `1.0.0` before submitting |
| Release assets: main.js + manifest.json (styles.css optional) | ✅ present (re-upload after retag) |
| Developer policies: no obfuscation, no ads, no telemetry, no self-update | ✅ minified ≠ obfuscated; full source + build scripts public |
| Disclosures in README: account required, network use, bundled code | ✅ "Disclosures" section |
| Third-party license compliance (playwright-core Apache-2.0) | ✅ attribution in README; NOTICE preserved in bundle |
| Official ESLint plugin (`eslint-plugin-obsidianmd`) | ✅ 0 errors; 1 warning (see below) |
| Build command discoverable by scanner (`build` script) | ✅ `npm run build` = patch + esbuild |

## Known risks / open items

1. **Release tag**: rename `v1.0.0` → `1.0.0` (directory requires exact match
   with manifest version, no `v`). Do this last, right before submitting.
2. **Settings-search warning**: `PluginSettingTab` doesn't implement
   `getSettingDefinitions()` (declarative settings API, Obsidian ≥1.13).
   Warning only; adopting it would raise minAppVersion to 1.13.0. Left as-is
   to keep 1.8+ compatibility.
3. **Security posture**: the plugin requires `--remote-debugging-port=9222`
   and drives web chats via CDP. This is disclosed prominently, but the
   automated scanner or a manual reviewer may flag the debug-port requirement
   or web-chat automation. Fallback if rejected: distribute via BRAT / GitHub
   releases only (already works).
4. **Build verification**: the scanner runs `npm run build` and may compare
   the output to the released main.js. `patch.mjs` mutates node_modules
   deterministically; a clean `npm ci && npm run build` reproduces the bundle
   (verify once before submitting).
5. **TypeScript pinned to 5.9.3**: typescript-eslint (used by the official
   ESLint plugin) does not support TS 7 yet.

## Submission steps (human account required)

1. Retag release: create tag `1.0.0` on the final commit, upload `main.js` +
   `manifest.json`, delete the `v1.0.0` release/tag.
2. Sign in at https://community.obsidian.md with an Obsidian account.
3. Link the GitHub account (Joel01010) to the profile.
4. "Add a plugin" → point at `Joel01010/explicater`.
5. Watch the automated review scorecard; fix any Errors it reports.