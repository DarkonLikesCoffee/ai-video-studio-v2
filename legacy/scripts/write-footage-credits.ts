import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

type ManifestAsset = {
  type?: unknown;
  title?: unknown;
  file?: unknown;
  creator?: unknown;
  attribution?: unknown;
  sourcePage?: unknown;
  license?: unknown;
  licenseUrl?: unknown;
  rightsBasis?: unknown;
  rightsNote?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const clean = (value: unknown): string =>
  typeof value === "string" && value.trim() ? value.trim() : "";

export const buildFootageCredits = (manifest: unknown): string => {
  const assets = isRecord(manifest) && Array.isArray(manifest.assets)
    ? manifest.assets.filter((item): item is ManifestAsset =>
        isRecord(item) && (
          item.type === "licensed video footage" ||
          item.type === "user-provided-gameplay"
        ))
    : [];

  if (assets.length === 0) {
    return "Footage attribution\n\nNo third-party or user-provided video footage was used in this render.\n";
  }

  const entries = assets.map((asset, index) => {
    const title = clean(asset.title) || clean(asset.file) || "Untitled video";
    if (asset.type === "user-provided-gameplay") {
      return [
        `${index + 1}. ${title}`,
        "   Source: User-provided footage",
        `   Rights basis: ${clean(asset.rightsBasis) || "Not recorded"}`,
        `   Rights note: ${clean(asset.rightsNote) || "Not recorded"}`,
        "   Changes: trimmed, cropped/reframed and source audio muted.",
      ].join("\n");
    }
    const creator = clean(asset.attribution) || clean(asset.creator) || "Creator not identified";
    const source = clean(asset.sourcePage) || "Source page not recorded";
    const license = clean(asset.license) || "License not recorded";
    const licenseUrl = clean(asset.licenseUrl);
    return [
      `${index + 1}. ${title}`,
      `   Creator / attribution: ${creator}`,
      `   Source: ${source}`,
      `   License: ${license}${licenseUrl ? ` (${licenseUrl})` : ""}`,
      "   Changes: trimmed to the storyboard shot, cropped/reframed with a slow push, and source audio muted.",
    ].join("\n");
  });

  return [
    "Footage attribution",
    "",
    "Sources used in the accompanying video render.",
    "Third-party clips have been trimmed, cropped/reframed and muted; user-provided clips are identified separately.",
    "",
    ...entries,
    "",
    "Retain third-party credits with any public redistribution. Confirm user-provided footage rights before publishing.",
  ].join("\n") + "\n";
};

const run = async () => {
  const [manifestPath, outputPath] = process.argv.slice(2);
  if (!manifestPath || !outputPath) {
    throw new Error("Usage: tsx scripts/write-footage-credits.ts <asset-manifest.json> <output.txt>");
  }

  let manifest: unknown = {};
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8")) as unknown;
  } catch (error) {
    if (!isRecord(error) || error.code !== "ENOENT") throw error;
  }

  await writeFile(outputPath, buildFootageCredits(manifest), "utf8");
  console.log(`Wrote footage attribution credits to ${outputPath}`);
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
