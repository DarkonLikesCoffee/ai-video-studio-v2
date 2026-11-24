#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const API_BASE = "https://api.openverse.org/v1/images/";
const ALLOWED_LICENSES = new Set(["cc0", "pdm", "by"]);
const EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "avif"]);
const MIME_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
]);
const MAX_ASSET_BYTES = 25 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;

export const isAllowedLicense = (license) =>
  ALLOWED_LICENSES.has(String(license ?? "").toLowerCase());

export const buildSearchUrl = (query, limit = 12) => {
  const normalizedQuery = String(query ?? "").trim();
  if (!normalizedQuery) throw new Error("A non-empty --query is required.");
  const url = new URL(API_BASE);
  url.searchParams.set("q", normalizedQuery.slice(0, 200));
  url.searchParams.set("page_size", String(Math.max(1, Math.min(20, Number(limit) || 12))));
  url.searchParams.set("license", [...ALLOWED_LICENSES].join(","));
  url.searchParams.set("extension", [...EXTENSIONS].join(","));
  url.searchParams.set("mature", "false");
  url.searchParams.set("filter_dead", "true");
  return url;
};

export const normalizeCandidate = (item) => ({
  id: item.id,
  title: item.title || "Untitled image",
  creator: item.creator || "Unknown creator",
  creatorUrl: item.creator_url || null,
  source: item.source || item.provider || "Openverse",
  sourcePage: item.foreign_landing_url || null,
  thumbnail: item.thumbnail || null,
  url: item.url || null,
  license: String(item.license || "").toLowerCase(),
  licenseVersion: item.license_version || null,
  licenseUrl: item.license_url || null,
  attribution: item.attribution || null,
  filetype: String(item.filetype || "").toLowerCase(),
  width: Number.isInteger(item.width) ? item.width : null,
  height: Number.isInteger(item.height) ? item.height : null,
  filesize: Number.isFinite(item.filesize) ? item.filesize : null,
});

export const buildShotQueries = (plan, maxShots = 12) => {
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.shots) || plan.shots.length === 0) {
    throw new Error("Production plan must contain a non-empty shots array.");
  }
  const limit = Math.max(1, Math.min(20, Number(maxShots) || 12));
  return plan.shots.slice(0, limit).map((shot, index) => {
    const id = typeof shot.id === "string" && shot.id.trim() ? shot.id : "shot-" + (index + 1);
    const visual = typeof shot.visual === "string" ? shot.visual : "";
    const purpose = typeof shot.purpose === "string" ? shot.purpose : "";
    const framing = typeof shot.framing === "string" ? shot.framing : "";
    const query = [visual, purpose, framing].filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 200);
    if (!query) throw new Error("Shot " + id + " has no visual, purpose or framing description to search.");
    return { shotId: id, query };
  });
};

export const detectImageExtension = (bytes, contentType = "") => {
  const data = Buffer.from(bytes);
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return "jpg";
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (data.length >= 12 && data.toString("ascii", 0, 4) === "RIFF" && data.toString("ascii", 8, 12) === "WEBP") return "webp";
  if (data.length >= 12 && data.toString("ascii", 4, 8) === "ftyp") {
    const brands = data.toString("ascii", 8, Math.min(data.length, 32));
    if (brands.includes("avif") || brands.includes("avis")) return "avif";
  }
  const mime = String(contentType).split(";")[0].trim().toLowerCase();
  return MIME_EXTENSIONS.get(mime) || null;
};

const slugify = (value) =>
  String(value || "image")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "image";

const assertSafeHttpsUrl = (value, label) => {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(label + " must be a valid HTTPS URL.");
  }
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(label + " must be HTTPS and contain no embedded credentials.");
  }
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "127.0.0.1" || host === "::1" || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) {
    throw new Error(label + " cannot target a local or private host.");
  }
  return url;
};

export const validateSelection = (selection) => {
  if (!selection || typeof selection !== "object" || !Array.isArray(selection.assets) || selection.assets.length === 0) {
    throw new Error("Selection must contain a non-empty assets array.");
  }
  const ids = new Set();
  return selection.assets.map((raw, index) => {
    const asset = normalizeCandidate(raw);
    if (!asset.id || typeof asset.id !== "string") throw new Error("assets[" + index + "].id is required.");
    if (ids.has(asset.id)) throw new Error("Duplicate asset id: " + asset.id);
    ids.add(asset.id);
    if (!isAllowedLicense(asset.license)) throw new Error("Asset " + asset.id + " has a license that is not approved for this pipeline: " + (asset.license || "missing"));
    if (!EXTENSIONS.has(asset.filetype)) throw new Error("Asset " + asset.id + " has an unsupported image file type.");
    assertSafeHttpsUrl(asset.url, "Asset " + asset.id + " URL");
    if (!Array.isArray(raw.shotIds) || raw.shotIds.length === 0 || raw.shotIds.some((id) => typeof id !== "string" || !id.trim())) {
      throw new Error("Asset " + asset.id + " must name at least one shotId.");
    }
    return { ...asset, shotIds: [...new Set(raw.shotIds)] };
  });
};

const parseArgs = (argv) => {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const item = rest[i];
    if (!item.startsWith("--")) throw new Error("Unexpected argument: " + item);
    const key = item.slice(2);
    const value = rest[i + 1];
    if (!value || value.startsWith("--")) throw new Error("Missing value for --" + key);
    options[key] = value;
    i += 1;
  }
  return { command, options };
};

const search = async (query, limit) => {
  const response = await fetch(buildSearchUrl(query, limit), {
    headers: { Accept: "application/json", "User-Agent": "AI-Video-Studio/1.0 (open-license asset discovery)" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Openverse search failed with HTTP " + response.status + ".");
  const payload = await response.json();
  const results = (Array.isArray(payload.results) ? payload.results : [])
    .map(normalizeCandidate)
    .filter((item) => item.id && item.url && isAllowedLicense(item.license) && EXTENSIONS.has(item.filetype));
  return {
    provider: "Openverse",
    query,
    searchedAt: new Date().toISOString(),
    resultCount: results.length,
    results,
    usageNote: "Review each result and its source page before selecting it. Openverse metadata is not a substitute for checking the original license.",
  };
};

const searchStoryboard = async (planPath, limit, maxShots) => {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  const shotQueries = buildShotQueries(plan, maxShots);
  const shots = [];
  for (const shot of shotQueries) {
    const result = await search(shot.query, limit);
    shots.push({ shotId: shot.shotId, query: shot.query, ...result });
  }
  return {
    provider: "Openverse",
    project: plan.title || plan.id || path.basename(planPath),
    searchedAt: new Date().toISOString(),
    shots,
    selectionInstructions: "Review candidates and original source licenses. Copy approved candidate objects into a top-level assets array and add shotIds containing the corresponding shot IDs before using the download command.",
  };
};

const downloadOne = async (asset, assetsDir) => {
  const response = await fetch(asset.url, {
    headers: { Accept: "image/avif,image/webp,image/png,image/jpeg" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error("Download failed for " + asset.id + " with HTTP " + response.status + ".");
  assertSafeHttpsUrl(response.url, "Final asset URL");
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > MAX_ASSET_BYTES) throw new Error("Asset " + asset.id + " exceeds the 25 MiB download limit.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_ASSET_BYTES) throw new Error("Asset " + asset.id + " is empty or exceeds the 25 MiB download limit.");
  const extension = detectImageExtension(bytes, response.headers.get("content-type"));
  if (!extension || !EXTENSIONS.has(extension)) throw new Error("Asset " + asset.id + " did not return a supported raster image.");
  const filename = slugify(asset.title) + "-" + asset.id.slice(0, 8) + "." + extension;
  const target = path.resolve(assetsDir, filename);
  if (!target.startsWith(path.resolve(assetsDir) + path.sep)) throw new Error("Unsafe asset destination.");
  await writeFile(target, bytes);
  return {
    file: filename,
    type: "open-license photograph",
    shotIds: asset.shotIds,
    title: asset.title,
    creator: asset.creator,
    creatorUrl: asset.creatorUrl,
    source: asset.source,
    sourcePage: asset.sourcePage,
    sourceUrl: asset.url,
    provenance: "Discovered through Openverse; original source page and license metadata recorded.",
    license: asset.license,
    licenseVersion: asset.licenseVersion,
    licenseUrl: asset.licenseUrl,
    attribution: asset.attribution,
    width: asset.width,
    height: asset.height,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
};

const downloadSelection = async (selectionPath, projectPath) => {
  const selection = JSON.parse(await readFile(selectionPath, "utf8"));
  const selected = validateSelection(selection);
  const projectDir = path.resolve(projectPath);
  const assetsDir = path.join(projectDir, "assets");
  const productionDir = path.join(projectDir, "production");
  await mkdir(assetsDir, { recursive: true });
  await mkdir(productionDir, { recursive: true });

  const downloaded = [];
  const failures = [];
  for (const asset of selected) {
    try {
      downloaded.push(await downloadOne(asset, assetsDir));
    } catch (error) {
      failures.push({ id: asset.id, title: asset.title, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const manifestPath = path.join(productionDir, "asset-manifest.json");
  let existing = { project: path.basename(projectDir), assets: [] };
  try {
    existing = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const merged = new Map((Array.isArray(existing.assets) ? existing.assets : []).map((item) => [item.file, item]));
  for (const item of downloaded) merged.set(item.file, item);
  const manifest = {
    ...existing,
    project: existing.project || path.basename(projectDir),
    updatedAt: new Date().toISOString(),
    assets: [...merged.values()],
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  return { downloaded, failures, manifestPath: path.relative(process.cwd(), manifestPath) };
};

export const runCli = async (argv = process.argv.slice(2)) => {
  const { command, options } = parseArgs(argv);
  if (command === "search") {
    const result = await search(options.query, options.limit);
    const output = JSON.stringify(result, null, 2) + "\n";
    if (options.output) await writeFile(path.resolve(options.output), output, "utf8");
    else process.stdout.write(output);
    return;
  }
  if (command === "storyboard-search") {
    if (!options.plan) throw new Error("storyboard-search requires --plan.");
    const result = await searchStoryboard(options.plan, options.limit, options["max-shots"]);
    const output = JSON.stringify(result, null, 2) + "\n";
    if (options.output) await writeFile(path.resolve(options.output), output, "utf8");
    else process.stdout.write(output);
    return;
  }
  if (command === "download") {
    if (!options.selection || !options.project) throw new Error("download requires --selection and --project.");
    const result = await downloadSelection(options.selection, options.project);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (result.failures.length > 0) process.exitCode = 1;
    return;
  }
  throw new Error("Usage:\n  node scripts/openverse-assets.mjs search --query \"...\" [--limit 12] [--output candidates.json]\n  node scripts/openverse-assets.mjs storyboard-search --plan projects/<slug>/production/production-plan.json [--max-shots 12] [--limit 8] --output candidates.json\n  node scripts/openverse-assets.mjs download --selection selection.json --project projects/<slug>");
};

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) {
  runCli().catch((error) => {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  });
}
