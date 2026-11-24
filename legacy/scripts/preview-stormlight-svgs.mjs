import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);
const files = ["projects/stormlight-keeper/assets/beacon-beam.svg","projects/stormlight-keeper/assets/beacon-mechanism.svg","projects/stormlight-keeper/assets/distant-vessel.svg","projects/stormlight-keeper/assets/lighthouse-door.svg","projects/stormlight-keeper/assets/lighthouse-lens.svg","projects/stormlight-keeper/assets/lighthouse-main.svg","projects/stormlight-keeper/assets/robot-hands.svg","projects/stormlight-keeper/assets/robot-main.svg","projects/stormlight-keeper/assets/spiral-stair.svg","projects/stormlight-keeper/assets/storm-sea.svg"];
await mkdir("review-output/svg-previews", { recursive: true });
const results = [];
for (const file of files) {
  const svg = await readFile(file, "utf8");
  const parsed = svg.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const viewBox = parsed.match(/viewBox=["']([^"']+)["']/i)?.[1] ?? null;
  if (!parsed || !viewBox || !svg.trim().endsWith("</svg>")) throw new Error("Malformed SVG: " + file);
  const preview = resolve("review-output/svg-previews", file.split("/").pop().replace(".svg", ".png"));
  await execFileAsync("rsvg-convert", ["-o", preview, file]);
  results.push({ file, viewBox, preview });
}
await writeFile("review-output/svg-previews/report.json", JSON.stringify({ schemaVersion: 1, previews: results }, null, 2));
console.log(JSON.stringify(results, null, 2));
