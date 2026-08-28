# Pangram AI Detector

A Raycast extension that runs [Pangram](https://www.pangram.com/) AI detection on whatever text you have selected, from anywhere on macOS.

Select text in any app, press your hotkey, and get the verdict, the AI / AI-assisted / human split, which passages tripped the detector, and whether any of them look **humanized** (AI output run through a paraphrasing tool). Works in Chrome, where Pangram's own extension only offers a right-click menu item that Chrome cannot bind to a keyboard shortcut.

## What it sends where

The text you select is sent to Pangram's API for analysis. Nothing else leaves your machine, and nothing is sent anywhere else.

The **Request a Shareable Pangram Link** preference is **off** by default. Turning it on asks Pangram to publish a dashboard page for each result, which means a link to the analyzed text exists outside your machine. Leave it off unless you want to share results.

Two more things worth knowing before you point this at anything sensitive:

- **When nothing is selected, the command reads your clipboard** and sends that instead. That is what the **Check the Clipboard When Nothing Is Selected** preference controls. It is on by default because some apps hide their selection from macOS entirely, but it does mean an unattended hotkey press sends whatever you last copied. Turn it off and the command fails instead.
- **Checked text is stored locally**, in plain text, in Raycast's local storage, so the History command can show it back to you. The last 25 checks are kept. **Clear History** (`⌃⇧X` in Search Detection History) wipes them.

## Setup

1. Install dependencies and start the extension in development mode:

   ```bash
   npm install && npm run dev
   ```

2. Open Raycast, run **Check Selection for AI**, and paste your Pangram API key when prompted.
3. Assign a hotkey: select the command in Root Search, press `⌘K`, choose **Configure Command**, then **Set Hotkey**.
4. Grant Raycast the Accessibility permission when macOS asks. That is what lets the extension read the selection from the frontmost app.

Your API key needs access to the **pangram-4** model. The extension pins it, because `default` currently resolves to Pangram 3.3.2, whose response carries no `is_humanized` or `humanizer_score`, and humanized-text detection is the point of this extension. A key without pangram-4 access gets a clear 403 message rather than silently worse results.

## Commands

| Command | What it does |
|---|---|
| **Check Selection for AI** | Full report: verdict, meter, flagged passages with scores, metadata panel |
| **Annotate Selection** | Your text rebuilt with AI passages in **bold** and AI-assisted ones in _italic_ |
| **Quick Check Selection** | Verdict as a HUD, no window. The one to bind for quick passes over other people's text |
| **Search Detection History** | The last 25 checks, so revisions of the same draft can be compared |

## Preferences

| Preference | Default | Notes |
|---|---|---|
| Pangram API Key | - | Required. Stored by Raycast as a password preference, never in the Keychain or on disk in plain text. |
| Strip Markdown Before Checking | on | Removes headings, emphasis, link syntax and list markers before sending. |
| Check the Clipboard When Nothing Is Selected | on | The fallback for apps that hide their selection. Off means the command fails instead of reading your clipboard. |
| Request a Shareable Pangram Link | off | See "What it sends where" above. |

## Behaviour worth knowing

- **Selection first, clipboard as fallback.** If the frontmost app exposes no selection, the extension analyzes the clipboard instead and says so in the metadata panel.
- **Markdown stripping matters more than it sounds.** Raw `**bold**`, link syntax and list markers are not prose. Leaving them in skews the score and pushes the segment offsets out of line with the sentences they mark. On by default; turn it off if you are deliberately checking raw markup.
- **Results are cached for 24 hours** per (text, dashboard-link) pair, because Pangram bills per call. **Check Again Without Cache** (`⌘R`) forces a fresh call.
- **Short text is rejected locally** below 12 words, so you never pay for a call that returns a low-confidence verdict on a fragment. It also means a single token, such as an API key sitting on your clipboard, can never reach the API.
- **Short text produces one segment.** A ~110 word sample comes back as a single window, so the per-segment breakdown only earns its keep on longer passages. That is Pangram's own windowing, not something this extension does.
- **History keys on the text**, so re-checking an unchanged draft updates one entry instead of piling up duplicates. Each revision gets its own entry.

## AI tool

The extension ships a `detect-ai` tool, so it works from Raycast AI Chat:

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

The `allowScripts` block in `package.json` is npm 11's install-script gate. It has to stay: without it esbuild's postinstall never runs, its platform binary is missing, and `ray build` fails on a fresh clone.

## Prior art

[ryansb/raycast-pangram](https://github.com/raycast/extensions/pull/28732) got there first with a Pangram extension that stalled in review before it was merged. The markdown-stripping step and the inline annotated rendering are their ideas, reimplemented here. Their version is MIT licensed.

## License

MIT
