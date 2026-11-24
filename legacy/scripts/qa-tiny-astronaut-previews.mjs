import { mkdir } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const outputDir = process.argv[2] ?? "render-output/tiny-astronaut-preview";
const frames = [75, 210, 330, 450, 575];
const names = ["exterior-landing", "astronaut-exploration", "cave-entry", "crystal-discovery", "crystal-awakening"];

await mkdir(outputDir, { recursive: true });
for (let i = 0; i < frames.length; i += 1) {
  const output = join(outputDir, names[i] + ".png");
  execFileSync("npx", [
    "remotion", "still", "packages/video-engine/src/index.ts",
    "TinyAstronautCrystalCave", output,
    "--frame=" + frames[i],
    "--concurrency=1",
    "--gl=swangle",
  ], { stdio: "inherit" });
}
