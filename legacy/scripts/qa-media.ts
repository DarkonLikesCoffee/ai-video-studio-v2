import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectMedia } from "./media-qa";

const input = process.argv[2];
const args = process.argv.slice(3);
if (!input) {
  process.stderr.write("Usage: npm run qa:media -- <rendered.mp4> [report.json] [--plan production-plan.json] [--audio-mode required|optional|silent] [--duration-tolerance seconds]\n");
  process.exit(2);
}

const options = { planPath: undefined as string | undefined, tolerance: 0.75, output: undefined as string | undefined, audioMode: undefined as "required" | "optional" | "silent" | undefined };
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index]!;
  if (arg === "--plan") {
    const value = args[++index];
    if (!value) throw new Error("--plan requires a production-plan.json path.");
    options.planPath = value;
  } else if (arg === "--audio-mode") {
    const value = args[++index];
    if (value !== "required" && value !== "optional" && value !== "silent") {
      throw new Error("--audio-mode must be required, optional, or silent.");
    }
    options.audioMode = value;
  } else if (arg === "--duration-tolerance") {
    const value = Number(args[++index]);
    if (!Number.isFinite(value) || value < 0) throw new Error("--duration-tolerance requires a non-negative number.");
    options.tolerance = value;
  } else if (arg.startsWith("--")) {
    throw new Error(`Unknown option: ${arg}`);
  } else if (options.output === undefined) {
    options.output = arg;
  } else {
    throw new Error(`Unexpected argument: ${arg}`);
  }
}

const inputPath = resolve(input);
const outputPath = resolve(options.output ?? inputPath.replace(/\.mp4$/i, "") + ".qa.json");
try {
  let expectedDurationSeconds: number | undefined;
  let planAudioMode: "required" | "optional" | "silent" | undefined;
  if (options.planPath) {
    const plan = JSON.parse(await readFile(resolve(options.planPath), "utf8")) as {
      delivery?: { durationSeconds?: unknown };
      audioMode?: unknown;
    };
    const duration = plan?.delivery?.durationSeconds;
    if (typeof duration !== "number" || !Number.isFinite(duration) || duration <= 0) {
      throw new Error("The production plan must define a positive delivery.durationSeconds.");
    }
    expectedDurationSeconds = duration;
    planAudioMode = plan.audioMode as "required" | "optional" | "silent" | undefined;
    if (plan.audioMode !== undefined && plan.audioMode !== "required" && plan.audioMode !== "optional" && plan.audioMode !== "silent") {
      throw new Error("The production plan audioMode must be required, optional, or silent.");
    }
  }

  const report = await inspectMedia(inputPath, {
    audioMode: options.audioMode ?? planAudioMode ?? "optional",
    ...(expectedDurationSeconds === undefined ? {} : { expectedDurationSeconds }),
    maxExpectedDurationDriftSeconds: options.tolerance,
  });
  await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  process.stdout.write(`Media QA report: ${outputPath}\n`);
  process.stdout.write(`Duration: ${report.format.durationSeconds.toFixed(2)}s | ${report.video?.width ?? 0}x${report.video?.height ?? 0} | ${report.video?.fps ?? 0}fps\n`);
  if (expectedDurationSeconds !== undefined) {
    process.stdout.write(`Planned duration: ${expectedDurationSeconds.toFixed(2)}s (tolerance ±${options.tolerance.toFixed(2)}s)\n`);
  }
  process.stdout.write(`Audio mode: ${report.audioMode}\n`);
  process.stdout.write(`Audio: ${report.audio ? `${report.audio.codec}, ${report.audio.sampleRate}Hz, ${report.audio.channels}ch` : "missing"}\n`);
  process.stdout.write(`Findings: ${report.findings.length}\n`);
  for (const finding of report.findings) {
    const timestamp = finding.startSeconds === undefined ? "" : ` @ ${finding.startSeconds.toFixed(2)}s`;
    process.stdout.write(`- [${finding.severity.toUpperCase()}] ${finding.code}${timestamp}: ${finding.message}\n`);
  }
  if (!report.passed) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`Media QA failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
