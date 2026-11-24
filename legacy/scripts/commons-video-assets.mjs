#!/usr/bin/env node
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { calculateRetryDelayMs } from "./retry-delay.mjs";

const API = "https://commons.wikimedia.org/w/api.php";
const MAX_BYTES = 150 * 1024 * 1024;
const TIMEOUT = 30_000;
const MAX_DOWNLOAD_RETRIES = 4;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export const getHttpRetryDelayMs = (retryAfter, attempt, now = Date.now()) =>
  calculateRetryDelayMs(retryAfter, attempt, {
    minRetryAfterMs: 1_000,
    maxRetryAfterMs: 120_000,
    baseDelayMs: 2_000,
    maxBackoffMs: 30_000,
  }, now);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const fetchWithRetries = async (url, options = {}, fetchImpl = fetch, pause = sleep) => {
  const { signal: callerSignal, ...requestOptions } = options;
  for (let attempt = 0; ; attempt += 1) {
    const timeoutSignal = AbortSignal.timeout(TIMEOUT);
    const signal = callerSignal
      ? AbortSignal.any([callerSignal, timeoutSignal])
      : timeoutSignal;
    let response;
    try {
      response = await fetchImpl(url, { ...requestOptions, signal });
    } catch (error) {
      if (callerSignal?.aborted || attempt >= MAX_DOWNLOAD_RETRIES) throw error;
      const delay = getHttpRetryDelayMs(null, attempt);
      process.stderr.write("Wikimedia request failed (" + (error instanceof Error ? error.message : String(error)) +
        "); retrying in " + delay + " ms (" + (attempt + 1) + "/" + MAX_DOWNLOAD_RETRIES + ").\\n");
      await pause(delay);
      continue;
    }
    if (response.ok || !RETRYABLE_HTTP_STATUSES.has(response.status) || attempt >= MAX_DOWNLOAD_RETRIES) return response;
    const delay = getHttpRetryDelayMs(response.headers.get("retry-after"), attempt);
    process.stderr.write("Wikimedia download returned HTTP " + response.status + "; retrying in " + delay + " ms (" + (attempt + 1) + "/" + MAX_DOWNLOAD_RETRIES + ").\\n");
    await pause(delay);
  }
};
const VIDEO_TYPES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
  ["video/ogg", "ogv"],
]);
const allowedLicense = (value) => {
  const license = String(value ?? "").replace(/&nbsp;/g, " ").trim();
  return /^(?:CC0(?:\s+1\.0)?|Public domain|PD-[A-Za-z0-9-]+|CC BY [234]\.0)$/i.test(license);
};

export const buildCommonsVideoSearchUrl = (query, limit = 8) => {
  const q = String(query ?? "").trim();
  if (!q) throw new Error("A non-empty video search query is required.");
  const url = new URL(API);
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrnamespace", "6");
  url.searchParams.set("gsrsearch", "filetype:video " + q.slice(0, 180));
  url.searchParams.set("gsrlimit", String(Math.max(1, Math.min(20, Number(limit) || 8))));
  url.searchParams.set("prop", "imageinfo");
  url.searchParams.set("iiprop", "url|size|mime|extmetadata");
  url.searchParams.set("iiurlwidth", "640");
  return url;
};

const plain = (value) => String(value ?? "").replace(/<[^>]*>/g, "").trim();
export const normalizeCommonsVideo = (page) => {
  const info = page?.imageinfo?.[0] ?? {};
  const metadata = info.extmetadata ?? {};
  const license = plain(metadata.LicenseShortName?.value);
  const mime = String(info.mime ?? "").toLowerCase();
  return {
    id: String(page?.pageid ?? ""),
    title: String(page?.title ?? "").replace(/^File:/, ""),
    source: "Wikimedia Commons",
    sourcePage: info.descriptionurl ?? null,
    url: info.url ?? null,
    thumbnail: info.thumburl ?? null,
    mime,
    filetype: VIDEO_TYPES.get(mime) ?? null,
    width: Number.isInteger(info.width) ? info.width : null,
    height: Number.isInteger(info.height) ? info.height : null,
    bytes: Number.isFinite(info.size) ? info.size : null,
    license,
    licenseUrl: plain(metadata.LicenseUrl?.value) || null,
    creator: plain(metadata.Artist?.value) || "Unknown creator",
    attribution: plain(metadata.Attribution?.value) || null,
    allowed: allowedLicense(license) && VIDEO_TYPES.has(mime),
  };
};

export const buildStoryboardVideoQueries = (plan, maxShots = 12) => {
  if (!plan || typeof plan !== "object" || !Array.isArray(plan.shots) || !plan.shots.length) {
    throw new Error("Production plan must contain a non-empty shots array.");
  }
  const limit = Math.max(1, Math.min(20, Number(maxShots) || 12));
  return plan.shots.slice(0, limit).map((shot, index) => {
    const shotId = typeof shot.id === "string" && shot.id.trim() ? shot.id : "shot-" + (index + 1);
    const parts = [shot.visual, shot.subject, shot.action, shot.purpose]
      .filter((value) => typeof value === "string" && value.trim())
      .map((value) => value.trim());
    const query = [...new Set(parts)].join(" ").replace(/\s+/g, " ").slice(0, 180);
    if (!query) throw new Error("Shot " + shotId + " has no searchable visual description.");
    return { shotId, query };
  });
};

const search = async (query, limit) => {
  const response = await fetch(buildCommonsVideoSearchUrl(query, limit), {
    headers: { Accept: "application/json", "User-Agent": "AI-Video-Studio/1.0 (open-license footage discovery)" },
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!response.ok) throw new Error("Wikimedia Commons search failed with HTTP " + response.status + ".");
  const payload = await response.json();
  const pages = Array.isArray(payload.query?.pages) ? payload.query.pages : [];
  return pages.map(normalizeCommonsVideo).filter((item) => item.id && item.url && item.filetype);
};

const safeMediaUrl = (value) => {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== "upload.wikimedia.org" || url.username || url.password) {
    throw new Error("Video URL must be HTTPS on upload.wikimedia.org.");
  }
  return url;
};

const validateSelection = (selection) => {
  if (!selection || !Array.isArray(selection.assets) || !selection.assets.length) {
    throw new Error("Selection must contain a non-empty assets array.");
  }
  const ids = new Set();
  return selection.assets.map((asset, index) => {
    if (!asset || !String(asset.id ?? "") || ids.has(String(asset.id))) throw new Error("assets[" + index + "] has a missing or duplicate id.");
    ids.add(String(asset.id));
    if (!allowedLicense(asset.license)) throw new Error("Video " + asset.id + " has a license not approved for this pipeline.");
    if (!VIDEO_TYPES.has(String(asset.mime).toLowerCase())) throw new Error("Video " + asset.id + " has an unsupported video MIME type.");
    safeMediaUrl(asset.url);
    if (!Array.isArray(asset.shotIds) || !asset.shotIds.length || asset.shotIds.some((id) => typeof id !== "string" || !id.trim())) {
      throw new Error("Video " + asset.id + " must name at least one shotId.");
    }
    return { ...asset, shotIds: [...new Set(asset.shotIds)] };
  });
};

const downloadSelection = async (selectionPath, projectPath) => {
  const selection = JSON.parse(await readFile(selectionPath, "utf8"));
  const assets = validateSelection(selection);
  const projectDir = path.resolve(projectPath);
  const assetsDir = path.join(projectDir, "assets");
  const productionDir = path.join(projectDir, "production");
  await mkdir(assetsDir, { recursive: true });
  await mkdir(productionDir, { recursive: true });
  const downloaded = [];
  const failures = [];
  for (const [assetIndex, asset] of assets.entries()) {
    try {
      const response = await fetchWithRetries(safeMediaUrl(asset.url), {
        headers: {
          Accept: "video/mp4,video/webm,video/quicktime,video/ogg",
          "User-Agent": "AI-Video-Studio/0.1 (Wikimedia Commons media downloader)",
        },
        redirect: "follow",
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      safeMediaUrl(response.url);
      const length = Number(response.headers.get("content-length") || 0);
      if (length > MAX_BYTES) throw new Error("File exceeds 150 MiB.");
      const bytes = Buffer.from(await response.arrayBuffer());
      const mime = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
      if (!bytes.length || bytes.length > MAX_BYTES || !VIDEO_TYPES.has(mime)) throw new Error("Response is empty, oversized or not a supported video.");
      const extension = VIDEO_TYPES.get(mime);
      const name = path.basename(asset.title || "footage").replace(/\.[^.]+$/, "")
        .normalize("NFKD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-").slice(0, 48) || "footage";
      const filename = name + "-" + String(asset.id).slice(0, 8) + "." + extension;
      let savedFilename = filename;
      try {
        await writeFile(path.join(assetsDir, savedFilename), bytes, { flag: "wx" });
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        savedFilename = name + "-" + String(asset.id).slice(0, 8) + "-" + createHash("sha1").update(bytes).digest("hex").slice(0, 6) + "." + extension;
        await writeFile(path.join(assetsDir, savedFilename), bytes, { flag: "wx" });
      }
      downloaded.push({
        file: savedFilename, type: "licensed video footage", shotIds: asset.shotIds,
        title: asset.title, source: asset.source, sourcePage: asset.sourcePage,
        sourceUrl: asset.url, license: asset.license, licenseUrl: asset.licenseUrl,
        creator: asset.creator, attribution: asset.attribution,
        width: asset.width, height: asset.height, bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    } catch (error) {
      failures.push({ id: asset.id, title: asset.title, error: error instanceof Error ? error.message : String(error) });
    }
    if (assetIndex < assets.length - 1) await sleep(1_500);
  }
  const manifestPath = path.join(productionDir, "asset-manifest.json");
  let manifest = { project: path.basename(projectDir), assets: [] };
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch (error) { if (error?.code !== "ENOENT") throw error; }
  const merged = new Map((Array.isArray(manifest.assets) ? manifest.assets : []).map((item) => [item.file, item]));
  for (const item of downloaded) merged.set(item.file, item);
  await writeFile(manifestPath, JSON.stringify({ ...manifest, updatedAt: new Date().toISOString(), assets: [...merged.values()] }, null, 2) + "\n");
  return { downloaded, failures, manifestPath };
};

export const runCli = async (argv = process.argv.slice(2)) => {
  const [command, ...args] = argv;
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    if (!args[i].startsWith("--") || !args[i + 1] || args[i + 1].startsWith("--")) throw new Error("Expected --option value pairs.");
    options[args[i].slice(2)] = args[i + 1];
    i += 1;
  }
  if (command === "search") {
    const results = await search(options.query, options.limit);
    process.stdout.write(JSON.stringify({ provider: "Wikimedia Commons", query: options.query, searchedAt: new Date().toISOString(), results }, null, 2) + "\n");
    return;
  }
  if (command === "storyboard-search") {
    const plan = JSON.parse(await readFile(options.plan, "utf8"));
    const shots = [];
    for (const item of buildStoryboardVideoQueries(plan, options["max-shots"])) {
      shots.push({ ...item, results: await search(item.query, options.limit) });
    }
    process.stdout.write(JSON.stringify({ provider: "Wikimedia Commons", project: plan.title || plan.id || path.basename(options.plan), searchedAt: new Date().toISOString(), shots }, null, 2) + "\n");
    return;
  }
  if (command === "download") {
    const result = await downloadSelection(options.selection, options.project);
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
    if (result.failures.length) process.exitCode = 1;
    return;
  }
  throw new Error("Usage: commons-video-assets.mjs search --query \"...\" | storyboard-search --plan <plan.json> | download --selection <selection.json> --project <project-dir>");
};

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : "";
if (import.meta.url === invokedPath) runCli().catch((error) => {
  process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
  process.exitCode = 1;
});
