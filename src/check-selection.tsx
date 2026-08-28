import {
  Action,
  ActionPanel,
  Clipboard,
  Color,
  Detail,
  Icon,
  Keyboard,
  getSelectedText,
} from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  Detection,
  DetectionWindow,
  detectCached,
  detectWithPreferences,
  isFlagged,
  reportsHumanizer,
} from "./pangram";

type Source = "selection" | "clipboard";

const percent = (value: number) => `${Math.round((value ?? 0) * 100)}%`;

const verdictColor = (detection: Detection) => {
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
};

async function readInput(): Promise<{ text: string; source: Source }> {
  try {
    const selected = (await getSelectedText()).trim();
    if (selected) {
      return { text: selected, source: "selection" };
    }
  } catch {
    // No selection available in the frontmost app; fall through to the clipboard.
  }

  const clipboard = (await Clipboard.readText())?.trim();
  if (clipboard) {
    return { text: clipboard, source: "clipboard" };
  }

  throw new Error("Select some text, or copy it, then run the command again.");
}

function describeWindow(window: DetectionWindow): string {
  const parts = [
    `**${window.label}**`,
    `score ${window.ai_assistance_score.toFixed(2)}`,
    `${window.confidence} confidence`,
  ];
  if (window.is_humanized) {
    parts.push(`humanized ${window.humanizer_score?.toFixed(2) ?? ""}`.trim());
  }
  return `${parts.join(" · ")}\n\n> ${window.text.trim().replace(/\s+/g, " ")}`;
}

function buildReport(detection: Detection): string {
  const flagged = detection.windows.filter(isFlagged);

  return [
    `# ${detection.headline}`,
    "",
    detection.prediction,
    "",
    flagged.length
      ? `## Flagged passages (${flagged.length})`
      : "## No flagged passages",
    "",
    flagged.length
      ? flagged.map(describeWindow).join("\n\n")
      : "Every segment came back as human written.",
  ].join("\n");
}

export default function Command() {
  const { data, isLoading, revalidate } = usePromise(async () => {
    const { text, source } = await readInput();
    const detection = await detectWithPreferences(text);
    return { detection, source, wordCount: text.trim().split(/\s+/).length };
  });

  const detection = data?.detection;
  const humanized =
    detection?.windows.filter((window) => window.is_humanized).length ?? 0;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={detection?.headline}
      markdown={
        detection
          ? buildReport(detection)
          : isLoading
            ? "Checking with Pangram…"
            : ""
      }
      metadata={
        detection ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Verdict">
              <Detail.Metadata.TagList.Item
                text={detection.prediction_short}
                color={verdictColor(detection)}
              />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label
              title="AI"
              text={percent(detection.fraction_ai)}
            />
            <Detail.Metadata.Label
              title="AI-Assisted"
              text={percent(detection.fraction_ai_assisted)}
            />
            <Detail.Metadata.Label
              title="Human"
              text={percent(detection.fraction_human)}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Humanized Segments"
              text={
                !reportsHumanizer(detection)
                  ? `Not reported by ${detection.version}`
                  : humanized > 0
                    ? `${humanized} of ${detection.windows.length}`
                    : "None"
              }
              icon={
                humanized > 0
                  ? { source: Icon.Wand, tintColor: Color.Orange }
                  : undefined
              }
            />
            <Detail.Metadata.Label
              title="Segments"
              text={`${detection.num_ai_segments} AI · ${detection.num_ai_assisted_segments} assisted · ${detection.num_human_segments} human`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Words"
              text={`${data?.wordCount ?? 0}`}
            />
            <Detail.Metadata.Label
              title="Source"
              text={data?.source === "clipboard" ? "Clipboard" : "Selection"}
            />
            <Detail.Metadata.Label
              title="Pangram Version"
              text={detection.version}
            />
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          {detection?.dashboard_link ? (
            <Action.OpenInBrowser
              title="Open in Pangram"
              url={detection.dashboard_link}
              icon={Icon.Globe}
            />
          ) : null}
          {detection ? (
            <Action.CopyToClipboard
              title="Copy Report"
              content={buildReport(detection)}
              icon={Icon.Clipboard}
            />
          ) : null}
          <Action
            title="Check Again Without Cache"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={() => {
              detectCached.clearCache();
              revalidate();
            }}
          />
        </ActionPanel>
      }
    />
  );
}
