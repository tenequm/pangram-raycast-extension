import { Action, ActionPanel, Color, Detail, Icon, Keyboard } from "@raycast/api";
import { createDeeplink, showFailureToast, usePromise } from "@raycast/utils";
import { runDetection } from "./detection";
import { detectCached, humanizedWindows, MODEL } from "./pangram";
import { buildAnnotated, buildReport, percent, verdictColor } from "./report";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(runDetection, [], {
    onError: async (error) => {
      await showFailureToast(error, { title: "Pangram check failed" });
    },
  });

  const detection = data?.detection;
  const humanized = detection ? humanizedWindows(detection).length : 0;

  const markdown = detection
    ? buildReport(detection)
    : error
      ? `# Could not check this text\n\n${error.message}`
      : "Checking with Pangram…";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={detection?.headline}
      markdown={markdown}
      metadata={
        detection ? (
          <Detail.Metadata>
            <Detail.Metadata.TagList title="Verdict">
              <Detail.Metadata.TagList.Item text={detection.prediction_short} color={verdictColor(detection)} />
            </Detail.Metadata.TagList>
            <Detail.Metadata.Label title="AI" text={percent(detection.fraction_ai)} />
            <Detail.Metadata.Label title="AI-Assisted" text={percent(detection.fraction_ai_assisted)} />
            <Detail.Metadata.Label title="Human" text={percent(detection.fraction_human)} />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="Humanized Segments"
              text={humanized > 0 ? `${humanized} of ${detection.windows.length}` : "None"}
              icon={humanized > 0 ? { source: Icon.Wand, tintColor: Color.Orange } : undefined}
            />
            <Detail.Metadata.Label
              title="Segments"
              text={`${detection.num_ai_segments} AI · ${detection.num_ai_assisted_segments} assisted · ${detection.num_human_segments} human`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Words Sent" text={`${data?.wordCount ?? 0}`} />
            <Detail.Metadata.Label title="Source" text={data?.source === "clipboard" ? "Clipboard" : "Selection"} />
            <Detail.Metadata.Label title="Model" text={`${MODEL} (${detection.version})`} />
            {detection.dashboard_link ? (
              <Detail.Metadata.Link title="Dashboard" target={detection.dashboard_link} text="Open Result" />
            ) : null}
          </Detail.Metadata>
        ) : undefined
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {detection ? (
              <Action.Push
                title="Show Annotated Text"
                icon={Icon.Highlight}
                target={
                  <Detail markdown={buildAnnotated(detection, data?.sentText)} navigationTitle="Annotated Text" />
                }
              />
            ) : null}
            {detection?.dashboard_link ? (
              <Action.OpenInBrowser title="Open in Pangram" url={detection.dashboard_link} icon={Icon.Globe} />
            ) : null}
            {detection ? <Action.CopyToClipboard title="Copy Report" content={buildReport(detection)} /> : null}
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Check Again Without Cache"
              icon={Icon.ArrowClockwise}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => {
                detectCached.clearCache();
                revalidate();
              }}
            />
            <Action.CopyToClipboard
              title="Copy Command Deeplink"
              icon={Icon.Link}
              content={createDeeplink({ command: "check-selection" })}
              shortcut={Keyboard.Shortcut.Common.CopyPath}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
