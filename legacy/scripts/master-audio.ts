import { readFile, rename, rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { spawn } from "node:child_process";
import type { VideoProject } from "../packages/video-engine/src/project";

const ffmpeg = process.env.FFMPEG_PATH || "ffmpeg";
const inputPath = process.argv[2];
const projectPath = process.argv[3];

if (!inputPath || !projectPath) {
  console.error("Usage: tsx scripts/master-audio.ts <rendered.mp4> <project.json>");
  process.exit(2);
}

const videoPath = resolve(inputPath);
const project = JSON.parse(await readFile(resolve(projectPath), "utf8")) as VideoProject;
if (!project.audioTracks?.length) {
  console.log("No project audio tracks; skipping audio mastering.");
  process.exit(0);
}

const mastering = project.audioMastering ?? {};
const integratedLufs = mastering.integratedLufs ?? -16;
const truePeakDb = mastering.truePeakDb ?? -1.5;
const loudnessRange = mastering.loudnessRange ?? 11;
const temporaryPath = resolve(dirname(videoPath), `.${basename(videoPath, ".mp4")}.mastered.tmp.mp4`);

const args = [
  "-hide_banner",
  "-y",
  "-i", videoPath,
  "-map", "0:v:0",
  "-map", "0:a:0",
  "-c:v", "copy",
  "-af", `loudnorm=I=${integratedLufs}:TP=${truePeakDb}:LRA=${loudnessRange}:print_format=summary`,
  "-c:a", "aac",
  "-b:a", "256k",
  "-ar", "48000",
  "-movflags", "+faststart",
  temporaryPath,
];

await new Promise<void>((resolvePromise, reject) => {
  const child = spawn(ffmpeg, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk;
    if (stderr.length > 20_000) stderr = stderr.slice(-20_000);
  });
  child.on("error", (error) => reject(new Error(`Could not start FFmpeg (${ffmpeg}): ${error.message}`)));
  child.on("close", (code) => {
    if (code === 0) resolvePromise();
    else reject(new Error(`FFmpeg mastering failed with code ${code}:\n${stderr}`));
  });
});

const backupPath = `${videoPath}.pre-master.bak`;
await rm(backupPath, { force: true });
await rename(videoPath, backupPath);
try {
  await rename(temporaryPath, videoPath);
  await rm(backupPath, { force: true });
} catch (error) {
  await rename(backupPath, videoPath);
  await rm(temporaryPath, { force: true });
  throw error;
}
console.log(`Mastered audio to ${integratedLufs} LUFS / ${truePeakDb} dBTP (LRA ${loudnessRange} LU).`);
