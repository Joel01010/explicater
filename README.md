# Scholium (Obsidian plugin)

Right-click selected text in a note → **Explain with AI** ✨ (with your chosen
provider). The plugin opens the provider's web chat in Obsidian's built-in
browser (the Web viewer core plugin) as a right-hand side pane, then uses
Playwright over CDP to send your **full note as context plus the selection**
with an "Explain this" prompt.

No API keys and no per-token billing — it drives the real chat websites using
your existing logged-in sessions.

*A scholium is a scholar's explanatory note written in the margin of a text —
which is exactly what this plugin does for your notes.*

## Providers

Settings → Scholium → **AI provider**:

| Provider | Status |
|---|---|
| DeepSeek (default) | Verified end-to-end |
| ChatGPT, Claude, Gemini, Grok, Perplexity | Same mechanism, standard composer selectors; not yet end-to-end tested |

Each provider opens its own pane; sign in once per provider. The choice
persists in the plugin's `data.json`. If a provider's UI changes, the plugin
reports an honest error notice instead of failing silently.

## Install

1. Copy `main.js` and `manifest.json` (from `dist/` after building, or a
   release) into `<your-vault>/.obsidian/plugins/scholium/`.
2. Settings → Community plugins → enable **Scholium** (turn off
   Restricted mode first if needed). The Web viewer core plugin is enabled
   automatically when needed.
3. **Launch Obsidian with the CDP debug port** — required so Playwright can
   reach the built-in browser:
   - Windows: run `relaunch-obsidian-with-debug.cmd` (closes Obsidian and
     reopens it with `--remote-debugging-port=9222`), or make a shortcut to
     `Obsidian.exe` with that argument.
   - macOS/Linux: launch with `--remote-debugging-port=9222`.
4. Open the provider once (right-click any selection → Explain) and sign in
   in that pane. The login persists in Obsidian's webview profile
   (`%APPDATA%\obsidian\Partitions\vault-…` on Windows).

Without the debug port the plugin shows a notice telling you to relaunch.

## Usage

Select text → right-click → **Explain with AI** (also the command
"Explain selection with AI"). The prompt sent is:

```
Here is the full note "<note name>" for context:

<entire markdown note>

---

Using that context, explain this:

<your selection>
```

Without an active markdown note it sends just the selection. The plugin
verifies the message actually landed before reporting "Sent".

## How it works

- `src/main.ts` — context-menu item + command + settings tab; opens/reuses a
  `webviewer` leaf in a right-hand vertical split via `leaf.setViewState`.
- `src/providers.ts` — provider table (URL, host, ordered composer selectors).
- `src/ai.ts` — `chromium.connectOverCDP('http://127.0.0.1:9222')`, finds
  the page by provider host, waits for the composer, types and sends.
- Obsidian's built-in browser is an Electron `<webview>`, whose CDP target
  type is `webview`. Stock playwright-core ignores those targets, so
  `patch.mjs` patches `node_modules/playwright-core/lib/coreBundle.js` at
  build time to accept `targetInfo.type === "webview"` as a page. It also
  inlines `package.json`/`browsers.json` (playwright reads them from
  `__dirname`, which inside Obsidian is `electron.asar` and crashes the
  require). The patched library is bundled into `main.js` (~3.8 MB) by
  esbuild — no runtime dependencies.
- React composers (first verified on DeepSeek) ignore Playwright's `fill()` and
  trusted Enter inside this webview. The working path is the native value
  setter + `input` event + DOM-dispatched `KeyboardEvent` Enter
  (contenteditable composers use `execCommand('insertText')`), followed by a
  check that the composer cleared or the prompt appeared in the chat.

## Build & test

Requires Node 22+ and a local Chromium for the self-check.

```sh
npm install
node patch.mjs            # patch playwright-core webview target filter + inline JSON
node build.mjs            # esbuild bundle -> dist/main.js + manifest.json
node test/selfcheck.mjs   # asserts webview target attaches as page + fill works
node test/prompt.mjs      # prompt builder + provider table asserts
node test/live-provider.mjs  # loads real chat.deepseek.com headless (nothing sent)
./node_modules/.bin/tsc -p tsconfig.json --noEmit
```

E2E against a running Obsidian (debug-port launch + provider tab open):

```sh
./node_modules/.bin/esbuild src/ai.ts --bundle --platform=node --format=cjs --outfile=dist/ai.cjs
# copy dist/ai.cjs + test/e2e-send.cjs next to each other, then:
node e2e-send.cjs   # sends a marked prompt and asserts it appears in the chat
```

## Notes / limits

- Desktop only. Requires the debug-port launch.
- `--remote-debugging-port=9222` binds loopback; any local process could drive
  Obsidian's webviews while it runs. Use your normal Obsidian shortcut when
  you don't need this plugin.
- Automating web chat UIs is a greyer Terms-of-Service area than official
  APIs. Keep it to personal, interactive use; don't hammer it at scale.
- If a provider changes its UI, update its `inputSelectors` in
  `src/providers.ts`. DeepSeek verified Nov 2026:
  `textarea[placeholder="Message DeepSeek"]` (the old `#chat-input` id is gone).
- Very large notes may exceed a provider's web input limit; the plugin sends
  the whole note as-is.

## License

MIT