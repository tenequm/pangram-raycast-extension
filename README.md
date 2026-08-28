# Pangram AI Detector

A Raycast extension that runs [Pangram](https://www.pangram.com/) AI detection on whatever text you have selected, from anywhere on macOS.

Select text in any app, press your hotkey, and get the verdict, the AI / AI-assisted / human split, and the passages that tripped the detector. Works in Chrome, where Pangram's own extension only exposes a right-click menu item that Chrome cannot bind to a shortcut.

## Setup

1. Install dependencies and start the extension in development mode:

   ```bash
   npm install && npm run dev
   ```

2. Open Raycast, find **Check Selection for AI**, and paste your Pangram API key when prompted.
3. Assign a hotkey: select the command in Root Search, press `⌘K`, choose **Configure Command**, then **Set Hotkey**.
4. Grant Raycast the Accessibility permission when macOS asks. That is what lets the extension read the selection from the frontmost app.

## Preferences

| Preference | Default | Notes |
|---|---|---|
| Pangram API Key | - | Required. Stored by Raycast as a password preference. |
| Model | `pangram-4` | A selector from Pangram's `GET /models`. See the note below. |
| Request a Pangram dashboard link | on | Adds an **Open in Pangram** action linking to the full result. Turn off to keep checks off the dashboard. |

### Why the model default is `pangram-4`, not `default`

`default` currently resolves to Pangram 3.3.2, which does **not** return the humanizer fields. Only `pangram-4` returns `is_humanized` and `humanizer_score` per segment, which is the whole point if you are checking text that has been through a humanizer tool.

Pangram's model catalog is entitlement-aware, so if your API key has no `pangram-4` access the extension will show a 403 with instructions to set the preference back to `default`. On older models the metadata panel says "Not reported by 3.3.2" rather than claiming there were no humanized segments, because those are different statements.

## Behaviour worth knowing

- **Selection first, clipboard as fallback.** If the frontmost app exposes no selection, the extension analyzes the clipboard instead and tells you which source it used in the metadata panel.
- **Results are cached for 24 hours** per (text, model, dashboard-link) combination, because Pangram bills per call. **Check Again Without Cache** (`⌘R`) forces a fresh call.
- **Short text produces one segment.** A ~110 word sample comes back as a single window, so the per-segment breakdown only becomes useful on longer passages. That is Pangram's windowing, not something this extension does.

## AI tool

The extension also ships a `detect-ai` tool, so you can use it from Raycast AI Chat:

```
@pangram-ai-detector is this paragraph AI written?
```

The tool spends a Pangram API call per invocation with no confirmation step. If you would rather approve each one, add a `Tool.Confirmation` export to `src/tools/detect-ai.ts`.

## Development

```bash
npm run dev     # hot-reloading development mode
npm run lint    # ESLint + Prettier via ray lint
npm run build   # distribution build with full type checking
```

## License

MIT
