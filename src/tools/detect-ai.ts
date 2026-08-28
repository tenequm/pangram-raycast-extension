import { detectWithPreferences, isFlagged, reportsHumanizer } from "../pangram";

type Input = {
  /**
   * The text to score for AI authorship. Pass at least a full paragraph: Pangram's
   * confidence drops sharply on very short inputs.
   */
  text: string;
};

/**
 * Returns a compact view of the detection rather than the raw Pangram payload, so the
 * model gets the verdict and the flagged passages without the full window dump.
 */
export default async function detectAi(input: Input) {
  const detection = await detectWithPreferences(input.text);

  return {
    verdict: detection.prediction_short,
    headline: detection.headline,
    explanation: detection.prediction,
    fractions: {
      ai: detection.fraction_ai,
      ai_assisted: detection.fraction_ai_assisted,
      human: detection.fraction_human,
    },
    segment_counts: {
      ai: detection.num_ai_segments,
      ai_assisted: detection.num_ai_assisted_segments,
      human: detection.num_human_segments,
    },
    humanized_segments: reportsHumanizer(detection)
      ? detection.windows.filter((window) => window.is_humanized).length
      : "not reported by this Pangram model, only pangram-4 detects humanized text",
    flagged_segments: detection.windows.filter(isFlagged).map((window) => ({
      label: window.label,
      ai_assistance_score: window.ai_assistance_score,
      confidence: window.confidence,
      is_humanized: window.is_humanized ?? false,
      humanizer_score: window.humanizer_score,
      text: window.text.trim().replace(/\s+/g, " ").slice(0, 300),
    })),
    dashboard_link: detection.dashboard_link,
    pangram_version: detection.version,
  };
}
