import { Clipboard, getSelectedText } from "@raycast/api";
import removeMarkdown from "remove-markdown";
import { rememberDetection } from "./history";
import { Detection, detectCached, getPreferences } from "./pangram";

/** Pangram rejects very short inputs, and a paid call to be told so is a waste. */
const MIN_CHARS = 50;

export type Source = "selection" | "clipboard";

export type DetectionRun = {
  detection: Detection;
  source: Source;
  wordCount: number;
};

export async function readInput(): Promise<{ text: string; source: Source }> {
  try {
    const selected = (await getSelectedText()).trim();
    if (selected) {
      return { text: selected, source: "selection" };
    }
  } catch {
    // The frontmost app exposes no selection; fall through to the clipboard.
  }

  const clipboard = (await Clipboard.readText())?.trim();
  if (clipboard) {
    return { text: clipboard, source: "clipboard" };
  }

  throw new Error("Select some text, or copy it, then run the command again.");
}

/**
 * Markdown syntax is not prose. Leaving it in both skews the score and pushes the window
 * offsets out of line with the sentences they are supposed to mark.
 */
export function prepareText(raw: string, strip: boolean): string {
  if (!strip) {
    return raw;
  }

  return removeMarkdown(raw, { stripListLeaders: true, gfm: true, useImgAltText: false })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^ | $/gm, "")
    .trim();
}

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/** Read the selection, normalize it, score it, and remember the result. */
export async function runDetection(): Promise<DetectionRun> {
  const { stripMarkdown, dashboardLink } = getPreferences();
  const { text, source } = await readInput();
  const prepared = prepareText(text, stripMarkdown);

  if (prepared.length < MIN_CHARS) {
    throw new Error(`Pangram needs at least ${MIN_CHARS} characters. Select a sentence or two more.`);
  }

  const detection = await detectCached(prepared, dashboardLink);
  const wordCount = countWords(prepared);

  await rememberDetection({ detection, source, wordCount });

  return { detection, source, wordCount };
}
