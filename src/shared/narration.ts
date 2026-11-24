import type { SubtitleCue, SubtitleWordTiming } from "../compositions/project-video/project";

export type NarrationAlignedWord = {
  index?: number;
  text: string;
  startSeconds: number;
  endSeconds: number;
};

export type NarrationSubtitleOptions = {
  maxWords?: number;
  maxPauseSeconds?: number;
  maxDurationSeconds?: number;
  speaker?: string;
  position?: "top" | "center" | "bottom";
  fontSize?: number;
  fontWeight?: 400 | 500 | 600 | 700 | 800 | 900;
  color?: string;
  activeWordColor?: string;
  backgroundOpacity?: number;
};

const defaults = {
  maxWords: 5,
  maxPauseSeconds: 0.42,
  maxDurationSeconds: 2.8,
  position: "bottom" as const,
  fontSize: 42,
  fontWeight: 700 as const,
  color: "#FFFFFF",
  activeWordColor: "#F5C66B",
  backgroundOpacity: 0.34,
};

const endsBeat = (word: string): boolean => /[.!?…][)"'»\]]*$/.test(word);
const endsClause = (word: string): boolean => /[,;:][)"'»\]]*$/.test(word);

export const buildNarrationSubtitles = (
  words: NarrationAlignedWord[],
  fps: number,
  projectDurationInFrames: number,
  options: NarrationSubtitleOptions = {},
): SubtitleCue[] => {
  if (!Array.isArray(words) || words.length === 0) {
    throw new Error("Narration alignment must contain at least one word.");
  }
  if (!Number.isInteger(fps) || fps < 1 || fps > 120) {
    throw new Error("Narration subtitle FPS must be an integer between 1 and 120.");
  }
  if (!Number.isInteger(projectDurationInFrames) || projectDurationInFrames < 1) {
    throw new Error("Project duration must be a positive frame count.");
  }

  const maxWords = options.maxWords ?? defaults.maxWords;
  const maxPauseSeconds = options.maxPauseSeconds ?? defaults.maxPauseSeconds;
  const maxDurationSeconds = options.maxDurationSeconds ?? defaults.maxDurationSeconds;
  if (!Number.isInteger(maxWords) || maxWords < 1 || maxWords > 12) {
    throw new Error("subtitle.maxWords must be an integer from 1 to 12.");
  }
  if (!Number.isFinite(maxPauseSeconds) || maxPauseSeconds < 0 || maxPauseSeconds > 2) {
    throw new Error("subtitle.maxPauseSeconds must be between 0 and 2.");
  }
  if (!Number.isFinite(maxDurationSeconds) || maxDurationSeconds < 0.5 || maxDurationSeconds > 8) {
    throw new Error("subtitle.maxDurationSeconds must be between 0.5 and 8.");
  }
  if (options.fontSize !== undefined && (!Number.isFinite(options.fontSize) || options.fontSize < 18 || options.fontSize > 96)) {
    throw new Error("subtitle.fontSize must be between 18 and 96.");
  }
  if (options.backgroundOpacity !== undefined &&
      (!Number.isFinite(options.backgroundOpacity) || options.backgroundOpacity < 0 || options.backgroundOpacity > 0.95)) {
    throw new Error("subtitle.backgroundOpacity must be between 0 and 0.95.");
  }
  for (const [name, color] of [["color", options.color], ["activeWordColor", options.activeWordColor]] as const) {
    if (color !== undefined && !/^#[0-9a-fA-F]{6}$/.test(color)) {
      throw new Error(`subtitle.${name} must be a six-digit hex color.`);
    }
  }

  let previousEnd = 0;
  for (const [index, word] of words.entries()) {
    if (!word || typeof word.text !== "string" || !word.text.trim() || word.text.length > 80) {
      throw new Error(`Narration word ${index} has invalid text.`);
    }
    if (!Number.isFinite(word.startSeconds) || !Number.isFinite(word.endSeconds) ||
        word.startSeconds < 0 || word.endSeconds <= word.startSeconds) {
      throw new Error(`Narration word ${index} has invalid timestamps.`);
    }
    if (index > 0 && word.startSeconds < previousEnd - 0.001) {
      throw new Error(`Narration word ${index} overlaps the previous aligned word.`);
    }
    if (word.endSeconds * fps > projectDurationInFrames + 0.5) {
      throw new Error(`Narration word "${word.text}" extends beyond the project duration.`);
    }
    previousEnd = word.endSeconds;
  }

  const groups: NarrationAlignedWord[][] = [];
  let current: NarrationAlignedWord[] = [];
  for (const word of words) {
    const previous = current.at(-1);
    const currentDuration = current.length > 0
      ? word.endSeconds - current[0]!.startSeconds
      : 0;
    const pause = previous ? word.startSeconds - previous.endSeconds : 0;
    const split = current.length > 0 && (
      current.length >= maxWords ||
      pause > maxPauseSeconds ||
      currentDuration > maxDurationSeconds ||
      endsBeat(previous!.text) ||
      (endsClause(previous!.text) && pause > 0.16)
    );
    if (split) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length) groups.push(current);

  if (groups.length > 200) throw new Error("Narration produced more than 200 subtitle cues.");

  return groups.map((group, index) => {
    const startInFrames = Math.max(0, Math.floor(group[0]!.startSeconds * fps));
    const endInFrames = Math.min(
      projectDurationInFrames,
      Math.max(startInFrames + 1, Math.ceil(group.at(-1)!.endSeconds * fps)),
    );
    const durationInFrames = endInFrames - startInFrames;
    let previousWordEnd = 0;
    const wordTimings: SubtitleWordTiming[] = group.map((word) => {
      const roundedStart = Math.max(0, Math.round(word.startSeconds * fps) - startInFrames);
      const start = Math.max(previousWordEnd, roundedStart);
      const roundedEnd = Math.round(word.endSeconds * fps) - startInFrames;
      const end = Math.min(durationInFrames, Math.max(start + 1, roundedEnd));
      if (end > durationInFrames || start >= durationInFrames) {
        throw new Error(`Word "${word.text}" cannot fit inside its subtitle cue at the selected FPS.`);
      }
      previousWordEnd = end;
      return { text: word.text, startInFrames: start, endInFrames: end };
    });
    return {
      id: `generated-vo-${String(index + 1).padStart(3, "0")}`,
      startInFrames,
      durationInFrames,
      text: group.map((word) => word.text).join(" "),
      ...(options.speaker ? { speaker: options.speaker } : {}),
      wordTimings,
      activeWordColor: options.activeWordColor ?? defaults.activeWordColor,
      position: options.position ?? defaults.position,
      alignment: "center" as const,
      fontSize: options.fontSize ?? defaults.fontSize,
      fontWeight: options.fontWeight ?? defaults.fontWeight,
      color: options.color ?? defaults.color,
      backgroundOpacity: options.backgroundOpacity ?? defaults.backgroundOpacity,
      fadeInFrames: 0,
      fadeOutFrames: 0,
    };
  });
};
