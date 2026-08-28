# Pangram AI Detector Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Check Selection for AI: full report with verdict, meter, flagged passages and metadata panel
- Annotate Selection: the analyzed text rebuilt with AI passages bold and AI-assisted passages italic
- Quick Check Selection: verdict as a HUD, without opening a window
- Search Detection History: the last 25 checks, keyed by text so revisions can be compared
- Pinned to the pangram-4 model, the only one that reports humanized text
- Optional Markdown stripping before analysis, on by default
- 24-hour result cache, since Pangram bills per call
- detect-ai AI tool for use from Raycast AI Chat, with one eval
