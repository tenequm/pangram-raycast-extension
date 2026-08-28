import { Color } from "@raycast/api";
import { Detection, DetectionWindow, humanizedWindows, isFlagged } from "./pangram";

const METER_BLOCKS = 20;

export const percent = (value: number) => `${Math.round((value ?? 0) * 100)}%`;

export function verdictColor(detection: Detection): Color {
  switch (detection.prediction_short) {
    case "AI":
      return Color.Red;
    case "Mixed":
      return Color.Orange;
    case "Human":
      return Color.Green;
    default:
      return Color.SecondaryText;
  }
}

/** A block bar plus the exact split, so the shape of the result reads at a glance. */
export function meter(detection: Detection): string {
  const human = Math.round(detection.fraction_human * METER_BLOCKS);
  const assisted = Math.round(detection.fraction_ai_assisted * METER_BLOCKS);
  const ai = Math.max(0, METER_BLOCKS - human - assisted);
  const exact = (value: number) => `${(value * 100).toFixed(1)}%`;

  return [
    "🟩".repeat(human) + "🟨".repeat(assisted) + "🟥".repeat(ai),
    "",
    "| 🟩 Human | 🟨 AI-Assisted | 🟥 AI |",
    "| :---: | :---: | :---: |",
    `| ${exact(detection.fraction_human)} | ${exact(detection.fraction_ai_assisted)} | ${exact(detection.fraction_ai)} |`,
  ].join("\n");
}

function describeWindow(window: DetectionWindow): string {
  const facts = [
    `score ${window.ai_assistance_score.toFixed(2)}`,
    `${window.confidence.toLowerCase()} confidence`,
    `${window.word_count} words`,
    `chars ${window.start_index}-${window.end_index}`,
    `${window.token_length} tokens`,
  ];
  if (window.is_humanized) {
    facts.push(`humanized ${window.humanizer_score.toFixed(2)}`);
  }

  return [
    `**${window.label}** ${window.is_humanized ? "🪄 " : ""}· ${facts.join(" · ")}`,
    "",
    `> ${window.text.trim().replace(/\s+/g, " ")}`,
  ].join("\n");
}

export function buildReport(detection: Detection): string {
  const flagged = detection.windows.filter(isFlagged);
  const humanized = humanizedWindows(detection);

  const sections = [`# ${detection.headline}`, "", detection.prediction, "", meter(detection), ""];

  if (humanized.length > 0) {
    sections.push(
      `🪄 **${humanized.length} of ${detection.windows.length} segments look humanized**, meaning AI output run through a paraphrasing tool.`,
      "",
    );
  }

  sections.push(flagged.length ? `## Flagged Passages (${flagged.length})` : "## No Flagged Passages", "");
  sections.push(
    flagged.length ? flagged.map(describeWindow).join("\n\n") : "Every segment came back as human written.",
  );

  return sections.join("\n");
}

const escapeMarkdown = (text: string) => text.replace(/[\\*_`[\]#<>]/g, "\\$&");

/** Emphasis markers cannot span a line break, and must hug the text to render at all. */
function wrapLines(segment: string, marker: string): string {
  return segment
    .split("\n")
    .map((line) => {
      const parts = line.match(/^(\s*)(.*?)(\s*)$/);
      if (!parts || !parts[2]) {
        return line;
      }
      return `${parts[1]}${marker}${parts[2]}${marker}${parts[3]}`;
    })
    .join("\n");
}

function annotate(segment: string, label: string): string {
  switch (label) {
    case "AI-Generated":
      return wrapLines(segment, "**");
    case "AI-Assisted":
      return wrapLines(segment, "_");
    default:
      return segment;
  }
}

/**
 * Rebuilds the analyzed text with each window marked in place. Offsets index into
 * `detection.text` (Pangram's normalized copy), and windows can overlap, so the cursor
 * only ever moves forward.
 */
export function buildAnnotated(detection: Detection): string {
  const text = detection.text;
  const ordered = [...detection.windows].sort((a, b) => a.start_index - b.start_index);
  const pieces: string[] = [];
  let cursor = 0;

  for (const window of ordered) {
    if (window.end_index <= cursor) {
      continue;
    }
    const start = Math.max(cursor, window.start_index);
    if (start > cursor) {
      pieces.push(escapeMarkdown(text.slice(cursor, start)));
    }
    pieces.push(annotate(escapeMarkdown(text.slice(start, window.end_index)), window.label));
    cursor = window.end_index;
  }

  if (cursor < text.length) {
    pieces.push(escapeMarkdown(text.slice(cursor)));
  }

  return [
    `**${detection.headline}** · **bold** is AI-generated, _italic_ is AI-assisted, plain is human.`,
    "",
    "---",
    "",
    pieces.join(""),
  ].join("\n");
}

/** One line for the HUD, where there is room for the verdict and nothing else. */
export function summaryLine(detection: Detection): string {
  const humanized = humanizedWindows(detection).length;
  const parts = [detection.headline, `${percent(detection.fraction_ai)} AI`];
  if (detection.fraction_ai_assisted > 0) {
    parts.push(`${percent(detection.fraction_ai_assisted)} assisted`);
  }
  if (humanized > 0) {
    parts.push(`${humanized} humanized`);
  }
  return parts.join(" · ");
}
