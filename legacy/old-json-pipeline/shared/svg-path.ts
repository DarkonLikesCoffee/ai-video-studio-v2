export type MorphableSvgPathSegment = {
  command: "M" | "L" | "C" | "Q" | "Z";
  values: number[];
};

export type MorphableSvgPath = {
  segments: MorphableSvgPathSegment[];
  commands: string[];
  values: number[];
};

const commandArity: Record<MorphableSvgPathSegment["command"], number> = {
  M: 2,
  L: 2,
  C: 6,
  Q: 4,
  Z: 0,
};

/**
 * Parse the deliberately small, deterministic SVG subset supported by path
 * morphing. Requiring explicit absolute commands keeps corresponding points
 * unambiguous; static SVG paths may continue using the wider SVG path syntax.
 */
export const parseMorphableSvgPath = (value: unknown): MorphableSvgPath | null => {
  if (typeof value !== "string" || value.length < 1 || value.length > 4000) return null;

  const tokens: Array<string | number> = [];
  const tokenPattern = /[A-Za-z]|[-+]?(?:(?:\d+\.?\d*)|(?:\.\d+))(?:[eE][-+]?\d+)?/y;
  let cursor = 0;

  while (cursor < value.length) {
    while (cursor < value.length && /[\s,]/.test(value[cursor]!)) cursor += 1;
    if (cursor >= value.length) break;

    tokenPattern.lastIndex = cursor;
    const match = tokenPattern.exec(value);
    if (!match) return null;

    const token = match[0];
    if (/^[A-Za-z]$/.test(token)) {
      if (!(token in commandArity)) return null;
      tokens.push(token);
    } else {
      const number = Number(token);
      if (!Number.isFinite(number) || Math.abs(number) > 10000) return null;
      tokens.push(number);
    }
    cursor = tokenPattern.lastIndex;
  }

  if (tokens.length === 0 || tokens[0] !== "M") return null;

  const segments: MorphableSvgPathSegment[] = [];
  const commands: string[] = [];
  const values: number[] = [];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index];
    if (typeof token !== "string" || !(token in commandArity)) return null;

    const command = token as MorphableSvgPathSegment["command"];
    const arity = commandArity[command];
    index += 1;
    const segmentValues: number[] = [];

    for (let argument = 0; argument < arity; argument += 1) {
      const next = tokens[index];
      if (typeof next !== "number") return null;
      segmentValues.push(next);
      values.push(next);
      index += 1;
    }

    commands.push(command);
    segments.push({ command, values: segmentValues });
  }

  if (!commands.includes("L") && !commands.includes("C") && !commands.includes("Q")) return null;
  return { segments, commands, values };
};

export const haveSameMorphableSvgTopology = (
  left: MorphableSvgPath,
  right: MorphableSvgPath
): boolean =>
  left.commands.length === right.commands.length &&
  left.commands.every((command, index) => command === right.commands[index]) &&
  left.segments.every((segment, index) =>
    segment.values.length === right.segments[index]?.values.length
  );

export const haveSameMorphableSvgCoordinates = (
  left: MorphableSvgPath,
  right: MorphableSvgPath
): boolean =>
  left.values.length === right.values.length &&
  left.values.every((value, index) => Math.abs(value - right.values[index]!) < 1e-9);

const formatPathNumber = (value: number): string => {
  const rounded = Number(value.toFixed(4));
  return Object.is(rounded, -0) ? "0" : String(rounded);
};

export const interpolateMorphableSvgPaths = (
  fromPath: string,
  toPath: string,
  progress: number
): string | null => {
  const from = parseMorphableSvgPath(fromPath);
  const to = parseMorphableSvgPath(toPath);
  if (!from || !to || !haveSameMorphableSvgTopology(from, to) || !Number.isFinite(progress)) {
    return null;
  }

  const amount = Math.max(0, Math.min(1, progress));
  if (amount <= 0) return fromPath;
  if (amount >= 1) return toPath;

  const result: string[] = [];
  for (let segmentIndex = 0; segmentIndex < from.segments.length; segmentIndex += 1) {
    const start = from.segments[segmentIndex]!;
    const end = to.segments[segmentIndex]!;
    result.push(start.command);
    for (let valueIndex = 0; valueIndex < start.values.length; valueIndex += 1) {
      const value = start.values[valueIndex]! +
        (end.values[valueIndex]! - start.values[valueIndex]!) * amount;
      result.push(formatPathNumber(value));
    }
  }
  return result.join(" ");
};
