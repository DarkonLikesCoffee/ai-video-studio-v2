import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { resolve } from "node:path";
const execFileAsync = promisify(execFile);
export type ContactSheetOptions = { intervalSeconds: number; columns: number; thumbnailWidth: number };
export const defaultContactSheetOptions: ContactSheetOptions = { intervalSeconds: 5, columns: 4, thumbnailWidth: 320 };
export const validateContactSheetOptions = (o: ContactSheetOptions): void => {
  if (!Number.isFinite(o.intervalSeconds) || o.intervalSeconds <= 0) throw new Error("intervalSeconds must be positive.");
  if (!Number.isInteger(o.columns) || o.columns < 1 || o.columns > 12) throw new Error("columns must be 1–12.");
  if (!Number.isInteger(o.thumbnailWidth) || o.thumbnailWidth < 64 || o.thumbnailWidth > 1920) throw new Error("thumbnailWidth must be 64–1920.");
};
export const calculateContactSheetLayout = (durationSeconds: number, o: ContactSheetOptions) => {
  validateContactSheetOptions(o);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("Video duration must be positive.");
  const frameCount = Math.max(1, Math.ceil(durationSeconds / o.intervalSeconds));
  return { frameCount, rows: Math.ceil(frameCount / o.columns) };
};
export const calculateSampleTimestamps = (durationSeconds: number, intervalSeconds: number): number[] => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) throw new Error("Video duration must be positive.");
  if (!Number.isFinite(intervalSeconds) || intervalSeconds <= 0) throw new Error("intervalSeconds must be positive.");
  const count = Math.max(1, Math.ceil(durationSeconds / intervalSeconds));
  return Array.from({ length: count }, (_, index) => Number((index * intervalSeconds).toFixed(3)));
};
export const createContactSheet = async (input: string, output: string, o = defaultContactSheetOptions, ffmpeg = process.env.FFMPEG_PATH || "ffmpeg", ffprobe = process.env.FFPROBE_PATH || "ffprobe") => {
  validateContactSheetOptions(o);
  const { stdout } = await execFileAsync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "json", input]);
  const duration = Number(JSON.parse(stdout).format?.duration);
  const layout = calculateContactSheetLayout(duration, o);
  const filter = `fps=1/${o.intervalSeconds},scale=${o.thumbnailWidth}:-1,tile=${o.columns}x${layout.rows}:padding=12:margin=12`;
  await execFileAsync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-i", input, "-vf", filter, "-frames:v", "1", output]);
  return { durationSeconds: duration, ...layout, sampleTimestampsSeconds: calculateSampleTimestamps(duration, o.intervalSeconds), options: { ...o }, outputPath: output };
};
const usage = "Usage: npm run qa:contact-sheet -- video.mp4 [--output sheet.jpg] [--report report.json] [--interval 5] [--columns 4] [--width 320]";
if (process.argv[1]?.endsWith("qa-contact-sheet.ts")) {
  try {
    const args = process.argv.slice(2);
    const input = args.find(a => !a.startsWith("--"));
    if (!input) throw new Error(usage);
    const o = { ...defaultContactSheetOptions };
    let output: string | undefined;
    let reportPath: string | undefined;
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === input) continue;
      const value = args[i + 1];
      if (!value || value.startsWith("--")) throw new Error(`Missing value for ${arg}. ${usage}`);
      if (arg === "--output") output = value;
      else if (arg === "--report") reportPath = value;
      else if (arg === "--interval") o.intervalSeconds = Number(value);
      else if (arg === "--columns") o.columns = Number(value);
      else if (arg === "--width") o.thumbnailWidth = Number(value);
      else throw new Error(`Unknown option: ${arg}. ${usage}`);
      i++;
    }
    validateContactSheetOptions(o);
    const inputPath = resolve(input);
    const extensionIndex = inputPath.lastIndexOf(".");
    const basePath = extensionIndex > 0 ? inputPath.slice(0, extensionIndex) : inputPath;
    const outputPath = resolve(output ?? basePath + ".contact-sheet.jpg");
    const result = await createContactSheet(inputPath, outputPath, o);
    if (reportPath) {
      const report = { schemaVersion: 1, inputPath, ...result, generatedBy: "qa:contact-sheet" };
      await writeFile(resolve(reportPath), JSON.stringify(report, null, 2) + "\n", "utf8");
    }
    process.stdout.write(`Contact sheet: ${result.outputPath}\nSampled ${result.frameCount} frames from ${result.durationSeconds.toFixed(2)}s; grid ${o.columns}x${result.rows}${reportPath ? `; report ${resolve(reportPath)}` : ""}.\n`);
  } catch (e) {
    process.stderr.write(`Contact-sheet generation failed: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exitCode = 2;
  }
}
