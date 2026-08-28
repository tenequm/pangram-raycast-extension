import { showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { runDetection } from "./detection";
import { summaryLine } from "./report";

export default async function Command() {
  await showToast({ style: Toast.Style.Animated, title: "Checking with Pangram…" });

  try {
    const { detection } = await runDetection();
    await showHUD(summaryLine(detection));
  } catch (error) {
    await showFailureToast(error, { title: "Pangram check failed" });
  }
}
