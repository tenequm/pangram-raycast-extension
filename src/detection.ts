import { Clipboard, getSelectedText } from "@raycast/api";
import removeMarkdown from "remove-markdown";
import { rememberDetection } from "./history";
import { Detection, detectCached, getPreferences } from "./pangram";

/**
 * Pangram scores prose, and its confidence collapses on fragments. Anything shorter is
 * a paid call for a junk verdict, so it never leaves the machine. A single token - an
 * API key pasted a moment ago, say - can therefore never reach the API.
 */
const MIN_WORDS = 12;

export type Source = "selection" | "clipboard";

export type DetectionRun = {
  detection: Detection;
  source: Source;
  wordCount: number;
  /** What we actually sent, kept because Pangram's copy has the paragraph breaks stripped. */
  sentText: string;
};

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export async function readInput(allowClipboard: boolean): Promise<{ text: string; source: Source }> {
  try {
    const selected = (await getSelectedText()).trim();
    if (selected) {
      return { text: selected, source: "selection" };
    }
  } catch {
    // The frontmost app exposes no selection; fall through to the clipboard.
  }

  if (!allowClipboard) {
    throw new Error("Nothing is selected. Select some text, or allow the clipboard fallback in preferences.");
  }

  const clipboard = (await Clipboard.readText())?.trim();
  if (clipboard) {
    return { text: clipboard, source: "clipboard" };
  }

  throw new Error("Select some text, or copy it, then run the command again.");
}

/**
 * A selection taken out of a browser comes back with its paragraph breaks deleted rather
 * than replaced, gluing the end of one paragraph to the start of the next ("dashboard.It's").
 * Sentence punctuation followed immediately by a capital, with no space at all, is the
 * fingerprint of that deletion - ordinary prose always has a space there - so put the
 * break back. Lowercase after the dot (URLs like "DEV.to") and digits are left alone.
 */
const restoreParagraphBreaks = (text: string) => text.replace(/([.!?…]["'’)\]]?)(?=[A-Z])/g, "$1\n\n");

/**
 * Markdown syntax is not prose. Leaving it in both skews the score and pushes the window
 * offsets out of line with the sentences they are supposed to mark.
 */
export function prepareText(raw: string, strip: boolean): string {
  const restored = restoreParagraphBreaks(raw);
  if (!strip) {
    return restored;
  }

  return removeMarkdown(restored, { stripListLeaders: true, gfm: true, useImgAltText: false })
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .replace(/^ | $/gm, "")
    .trim();
}

export function assertProse(text: string): number {
  const wordCount = countWords(text);
  if (wordCount < MIN_WORDS) {
    throw new Error(`Pangram needs at least ${MIN_WORDS} words of prose to say anything useful. This is ${wordCount}.`);
  }
  return wordCount;
}

/** Read the selection, normalize it, score it, and remember the result. */
export async function runDetection(): Promise<DetectionRun> {
  const { stripMarkdown, clipboardFallback, dashboardLink } = getPreferences();
  const { text, source } = await readInput(clipboardFallback ?? true);
  const prepared = prepareText(text, stripMarkdown);
  const wordCount = assertProse(prepared);

  const detection = await detectCached(prepared, dashboardLink);
  await rememberDetection({ detection, source, wordCount, sentText: prepared });

  return { detection, source, wordCount, sentText: prepared };
}
