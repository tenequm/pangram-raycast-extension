import { Action, ActionPanel, Detail, Icon, Keyboard } from "@raycast/api";
import { showFailureToast, usePromise } from "@raycast/utils";
import { runDetection } from "./detection";
import { detectCached } from "./pangram";
import { buildAnnotated, buildReport } from "./report";

export default function Command() {
  const { data, isLoading, error, revalidate } = usePromise(runDetection, [], {
    onError: async (error) => {
      await showFailureToast(error, { title: "Pangram check failed" });
    },
  });

  const detection = data?.detection;

  const markdown = detection
    ? buildAnnotated(detection, data?.sentText)
    : error
      ? `# Could not check this text\n\n${error.message}`
      : "Checking with Pangram…";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={detection?.headline}
      markdown={markdown}
      actions={
        <ActionPanel>
          {detection ? (
            <Action.Push
              title="Show Full Report"
              icon={Icon.BarChart}
              target={<Detail markdown={buildReport(detection)} navigationTitle={detection.headline} />}
            />
          ) : null}
          {detection?.dashboard_link ? (
            <Action.OpenInBrowser title="Open in Pangram" url={detection.dashboard_link} icon={Icon.Globe} />
          ) : null}
          {detection ? (
            <Action.CopyToClipboard title="Copy Annotated Text" content={buildAnnotated(detection, data?.sentText)} />
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
