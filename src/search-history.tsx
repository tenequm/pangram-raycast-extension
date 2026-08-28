import { Action, ActionPanel, Detail, Icon, Keyboard, List } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { HISTORY_KEY, HistoryEntry } from "./history";
import { buildAnnotated, buildReport, verdictColor } from "./report";

const preview = (text: string) => {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
};

export default function Command() {
  const { value: entries, setValue, isLoading } = useLocalStorage<HistoryEntry[]>(HISTORY_KEY, []);

  const remove = (id: string) => setValue((entries ?? []).filter((entry) => entry.id !== id));

  return (
    <List isLoading={isLoading} isShowingDetail searchBarPlaceholder="Search checked text…">
      <List.EmptyView
        title="No Checks Yet"
        description="Run Check Selection for AI and the results will collect here."
        icon={Icon.MagnifyingGlass}
      />
      {(entries ?? []).map((entry) => (
        <List.Item
          key={entry.id}
          title={preview(entry.detection.text)}
          subtitle={`${entry.wordCount} words`}
          accessories={[
            { tag: { value: entry.detection.prediction_short, color: verdictColor(entry.detection) } },
            { date: new Date(entry.checkedAt) },
          ]}
          detail={<List.Item.Detail markdown={buildReport(entry.detection)} />}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action.Push
                  title="Show Annotated Text"
                  icon={Icon.Highlight}
                  target={
                    <Detail
                      markdown={buildAnnotated(entry.detection, entry.sentText)}
                      navigationTitle={entry.detection.headline}
                    />
                  }
                />
                <Action.CopyToClipboard title="Copy Report" content={buildReport(entry.detection)} />
                <Action.CopyToClipboard
                  title="Copy Checked Text"
                  content={entry.detection.text}
                  shortcut={Keyboard.Shortcut.Common.CopyName}
                />
                {entry.detection.dashboard_link ? (
                  <Action.OpenInBrowser
                    title="Open in Pangram"
                    url={entry.detection.dashboard_link}
                    icon={Icon.Globe}
                  />
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Delete Entry"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => remove(entry.id)}
                />
                <Action
                  title="Clear History"
                  style={Action.Style.Destructive}
                  icon={Icon.Trash}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={() => setValue([])}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
