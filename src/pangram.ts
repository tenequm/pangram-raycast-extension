import { getPreferenceValues } from "@raycast/api";
import { withCache } from "@raycast/utils";

const BASE_URL = "https://text.external-api.pangram.com";
const POLL_INTERVAL_MS = 1200;
const TIMEOUT_MS = 90_000;
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export type DetectionWindow = {
  text: string;
  label: string;
  ai_assistance_score: number;
  confidence: string;
  start_index: number;
  end_index: number;
  word_count: number;
  token_length: number;
  is_humanized?: boolean;
  humanizer_score?: number;
};

export type Detection = {
  stage: string;
  text: string;
  version: string;
  headline: string;
  prediction: string;
  prediction_short: string;
  fraction_ai: number;
  fraction_ai_assisted: number;
  fraction_human: number;
  num_ai_segments: number;
  num_ai_assisted_segments: number;
  num_human_segments: number;
  dashboard_link?: string;
  windows: DetectionWindow[];
};

type Preferences = {
  apiKey: string;
  model: string;
  dashboardLink: boolean;
};

/** Pangram documents its own status codes; turn them into something a user can act on. */
function describeStatus(status: number, body: string): string {
  switch (status) {
    case 401:
      return "Pangram rejected the API key. Check it in the extension preferences.";
    case 402:
      return "The Pangram account is out of credits.";
    case 403:
      return "That model is not enabled for this API key. Clear the Model preference to fall back to the default.";
    case 413:
      return "The text is too large for one Pangram request.";
    case 422:
      return "Pangram could not process this text or model selector. Very short selections are often rejected.";
    case 429:
      return "Rate limited by Pangram. Wait a moment and try again.";
    case 503:
      return "The selected Pangram model is temporarily unavailable.";
    default:
      return `Pangram returned ${status}${body ? `: ${body.slice(0, 200)}` : ""}`;
  }
}

async function request<T>(
  path: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "x-api-key": apiKey, ...(init.headers ?? {}) },
  });

  if (!response.ok) {
    throw new Error(
      describeStatus(response.status, await response.text().catch(() => "")),
    );
  }

  return (await response.json()) as T;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Submits text and polls until Pangram reaches a terminal stage.
 * Reads the API key from preferences rather than taking it as an argument, so the key
 * never ends up in a `withCache` cache key on disk.
 */
async function detect(
  text: string,
  model: string,
  dashboardLink: boolean,
): Promise<Detection> {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { task_id } = await request<{ task_id: string }>("/task", apiKey, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model: model.trim() || "default",
      public_dashboard_link: dashboardLink,
    }),
  });

  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    const task = await request<Detection>(`/task/${task_id}`, apiKey);
    if (task.stage === "STAGE_SUCCESS") {
      return task;
    }
    if (task.stage === "STAGE_FAILED") {
      throw new Error(task.headline || "Pangram could not analyze this text.");
    }
  }

  throw new Error("Pangram did not finish within 90 seconds.");
}

/**
 * Detection is billed per call, so identical text is served from Raycast's cache for a day.
 * Model and dashboard-link settings are arguments because they are part of the cache key.
 */
export const detectCached = withCache(detect, {
  maxAge: CACHE_MAX_AGE_MS,
  validate: (detection) => detection.stage === "STAGE_SUCCESS",
});

export function detectWithPreferences(text: string) {
  const { model, dashboardLink } = getPreferenceValues<Preferences>();
  return detectCached(text, model ?? "default", dashboardLink ?? true);
}

export const isFlagged = (window: DetectionWindow) =>
  window.label !== "Human Written";

/**
 * Only Pangram 4 returns the humanizer head's output. On older models the fields are
 * absent, which must not be rendered as "no humanized segments" - that is a different claim.
 */
export const reportsHumanizer = (detection: Detection) =>
  detection.windows.some((window) => window.is_humanized !== undefined);
