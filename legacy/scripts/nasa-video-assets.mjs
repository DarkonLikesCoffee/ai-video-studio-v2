#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { calculateRetryDelayMs } from "./retry-delay.mjs";

const execFileAsync = promisify(execFile);
const MAX_BYTES = 150 * 1024 * 1024;
const TIMEOUT = 45_000;
const MAX_RETRIES = 3;
const VIDEO_TYPES = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
]);
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export const isSafeNasaSvsUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "svs.gsfc.nasa.gov" &&
      !url.username && !url.password &&
      url.pathname.startsWith("/vis/") &&
      /\.(?:mp4|webm)$/i.test(url.pathname);
  } catch {
    return false;
  }
};

const isNasaSourcePage = (value) =>
  typeof value === "string" &&
  /^https:\/\/svs\.gsfc\.nasa\.gov\/(?:\d+|\d+\/)$/i.test(value);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export const getNasaRetryDelayMs = (retryAfter, attempt, now = Date.now()) =>
  calculateRetryDelayMs(retryAfter, attempt, {
    minRetryAfterMs: 1_000,
    maxRetryAfterMs: 60_000,
    baseDelayMs: 1_000,
    maxBackoffMs: 15_000,
  }, now);

export const fetchNasaVideoWithRetries = async (
  url,
  fetchImpl = fetch,
  pause = sleep,
) => {
  for (let attempt = 0; ; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        headers: {
          Accept: "video/mp4,video/webm,application/octet-stream",
          "User-Agent": "AI-Video-Studio/0.1 (https://github.com/DarkonLikesCoffee/ai-video-studio)",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(TIMEOUT),
      });
    } catch (error) {
      if (attempt >= MAX_RETRIES) throw error;
      const delay = getNasaRetryDelayMs(null, attempt);
      process.stderr.write("NASA media request failed; retrying in " + delay + " ms (" + (attempt + 1) + "/" + MAX_RETRIES + ").\n");
      await pause(delay);
      continue;
    }
    if (response.ok || !RETRYABLE.has(response.status) || attempt >= MAX_RETRIES) return response;
    const delay = getNasaRetryDelayMs(response.headers.get("retry-after"), attempt);
    process.stderr.write("NASA media returned HTTP " + response.status + "; retrying in " + delay + " ms (" + (attempt + 1) + "/" + MAX_RETRIES + ").\n");
    await pause(delay);
  }
};

export const normalizeNasaLibraryVideoUrl = (value) => {
  try {
    const url = new URL(value);
    if ((url.protocol !== "http:" && url.protocol !== "https:") ||
        url.hostname !== "images-assets.nasa.gov" ||
        url.username || url.password ||
        !url.pathname.startsWith("/video/") ||
        !/\.(?:mp4|webm)$/i.test(url.pathname)) {
      return null;
    }
    // NASA's public asset API can return http:// media hrefs; the same
    // official host serves them over HTTPS, so upgrade without changing host/path.
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
};

export const isSafeNasaLibraryVideoUrl = (value) =>
  typeof value === "string" &&
  normalizeNasaLibraryVideoUrl(value) === value;

const isNasaLibrarySourcePage = (value) =>
  typeof value === "string" &&
  /^https:\/\/images\.nasa\.gov\/details\/[A-Za-z0-9_%.-]+$/i.test(value);

const nasaVideoRenditionRank = (value) => {
  const filename = path.basename(new URL(value).pathname);
  if (/~large\.(?:mp4|webm)$/i.test(filename)) return 0;
  if (/~medium\.(?:mp4|webm)$/i.test(filename)) return 1;
  if (/~small\.(?:mp4|webm)$/i.test(filename)) return 2;
  if (/~orig\.(?:mp4|webm)$/i.test(filename)) return 3;
  return 4;
};

export const resolveNasaLibraryVideoUrls = async (nasaId, fetchImpl = fetch) => {
  if (typeof nasaId !== "string" || !nasaId.trim() || nasaId.length > 180) {
    throw new Error("NASA library asset ID must be a non-empty string of at most 180 characters.");
  }
  const manifestUrl = "https://images-api.nasa.gov/asset/" + encodeURIComponent(nasaId);
  let payload;
  try {
    const response = await fetchNasaVideoWithRetries(manifestUrl, fetchImpl);
    if (!response.ok) throw new Error("NASA Images API manifest returned HTTP " + response.status + ".");
    payload = await response.json();
  } catch (fetchError) {
    process.stderr.write("NASA Images API fetch failed: " + errorDetails(fetchError) + "; trying curl fallback.\n");
    const tempPath = path.resolve(".nasa-asset-manifest-" + Date.now() + ".json");
    try {
      const { stdout } = await execFileAsync("curl", [
        "--fail", "--location", "--silent", "--show-error",
        "--proto", "=https", "--proto-redir", "=https",
        "--retry", "2", "--retry-delay", "1", "--max-time", "20",
        "--output", tempPath, "--write-out", "%{http_code}", manifestUrl,
      ], { timeout: 60_000, maxBuffer: 1024 * 1024 });
      if (stdout.trim() !== "200") throw new Error("NASA Images API curl returned HTTP " + stdout.trim());
      payload = JSON.parse(await readFile(tempPath, "utf8"));
    } finally {
      await unlink(tempPath).catch(() => {});
    }
  }
  const items = payload?.collection?.items;
  if (!Array.isArray(items)) throw new Error("NASA Images API manifest has no collection.items array.");
  const candidates = items
    .map((item) => normalizeNasaLibraryVideoUrl(item?.href))
    .filter((href) => typeof href === "string");
  if (!candidates.length) throw new Error("NASA Images API manifest contains no supported images-assets.nasa.gov MP4/WebM files.");
  const unique = [...new Set(candidates)];
  return unique.sort((a, b) => nasaVideoRenditionRank(a) - nasaVideoRenditionRank(b));
};

export const resolveNasaLibraryVideoUrl = async (nasaId, fetchImpl = fetch) =>
  (await resolveNasaLibraryVideoUrls(nasaId, fetchImpl))[0];

export const validateNasaSelection = (selection) => {
  if (!selection || !Array.isArray(selection.assets) || !selection.assets.length) {
    throw new Error("NASA selection must contain a non-empty assets array.");
  }
  const ids = new Set();
  const assignedShots = new Set();
  return selection.assets.map((asset, index) => {
    if (!asset || typeof asset.id !== "string" || !asset.id.trim() || ids.has(asset.id)) {
      throw new Error("assets[" + index + "] must have a unique non-empty id.");
    }
    ids.add(asset.id);
    const isLibraryAsset = typeof asset.nasaId === "string" && asset.nasaId.trim().length > 0;
    if (isLibraryAsset) {
      if (!isNasaLibrarySourcePage(asset.sourcePage)) {
        throw new Error("Video " + asset.id + " must reference its NASA Images and Video Library source page.");
      }
      if (asset.url !== undefined) {
        throw new Error("NASA library selection " + asset.id + " must use nasaId, not an unverified direct URL.");
      }
      if (asset.mime !== undefined && !VIDEO_TYPES.has(String(asset.mime).toLowerCase())) {
        throw new Error("Video " + asset.id + " has an unsupported MIME type.");
      }
      if (asset.trimBeforeSecondsByShotId !== undefined) {
        if (!asset.trimBeforeSecondsByShotId || typeof asset.trimBeforeSecondsByShotId !== "object" ||
            Object.values(asset.trimBeforeSecondsByShotId).some((value) =>
              typeof value !== "number" || !Number.isFinite(value) || value < 0
            )) {
          throw new Error("Video " + asset.id + " has invalid trimBeforeSecondsByShotId values.");
        }
      }
    } else {
      if (!isSafeNasaSvsUrl(asset.url)) {
        throw new Error("Video " + asset.id + " must use an HTTPS NASA SVS /vis/ video URL or a NASA library nasaId.");
      }
      if (!isNasaSourcePage(asset.sourcePage)) {
        throw new Error("Video " + asset.id + " must reference its NASA SVS source page.");
      }
      if (!VIDEO_TYPES.has(String(asset.mime ?? "").toLowerCase())) {
        throw new Error("Video " + asset.id + " has an unsupported MIME type.");
      }
      const extension = path.extname(new URL(asset.url).pathname).slice(1).toLowerCase();
      if (VIDEO_TYPES.get(String(asset.mime).toLowerCase()) !== extension) {
        throw new Error("Video " + asset.id + " MIME type does not match its filename.");
      }
    }
    if (asset.license !== "Public domain") {
      throw new Error("Video " + asset.id + " must be manually reviewed as Public domain.");
    }
    if (!Array.isArray(asset.shotIds) || !asset.shotIds.length ||
        asset.shotIds.some((id) => typeof id !== "string" || !id.trim())) {
      throw new Error("Video " + asset.id + " must name at least one storyboard shotId.");
    }
    if (typeof asset.title !== "string" || !asset.title.trim() ||
        typeof asset.creator !== "string" || !asset.creator.trim()) {
      throw new Error("Video " + asset.id + " must retain its title and creator.");
    }
    const shotIds = [...new Set(asset.shotIds)];
    const conflictingShot = shotIds.find((shotId) => assignedShots.has(shotId));
    if (conflictingShot) {
      throw new Error("Storyboard shot " + conflictingShot + " is assigned to more than one NASA video asset.");
    }
    shotIds.forEach((shotId) => assignedShots.add(shotId));
    return { ...asset, shotIds };
  });
};

const errorDetails = (error) => {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
  const causeCode = cause && typeof cause === "object" && "code" in cause ? String(cause.code) : "";
  const causeMessage = cause && typeof cause === "object" && "message" in cause ? String(cause.message) : "";
  return [error instanceof Error ? error.message : String(error), causeCode, causeMessage]
    .filter(Boolean).join(" | ");
};

const downloadWithCurl = async (url, destination) => {
  const temporaryPath = destination + ".partial";
  try {
    const { stdout } = await execFileAsync("curl", [
      "--fail", "--location", "--silent", "--show-error",
      "--proto", "=https", "--proto-redir", "=https",
      "--retry", "3", "--retry-delay", "2", "--retry-all-errors",
      "--max-filesize", String(MAX_BYTES),
      "--max-time", "120", "--output", temporaryPath,
      "--write-out", "%{http_code}\n%{content_type}\n%{url_effective}\n%{size_download}",
      url,
    ], { timeout: 8 * 60_000, maxBuffer: 1024 * 1024 });
    const [status, mime, finalUrl, sizeText] = stdout.trim().split("\n");
    const size = Number(sizeText);
    if (status !== "200") throw new Error("curl returned HTTP " + (status || "unknown"));
    if (!isSafeNasaSvsUrl(finalUrl) && !isSafeNasaLibraryVideoUrl(finalUrl)) {
      throw new Error("curl redirected outside approved NASA video media hosts.");
    }
    if (!VIDEO_TYPES.has(String(mime).split(";")[0].toLowerCase())) {
      throw new Error("curl returned unsupported video MIME type " + mime);
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
      throw new Error("curl download is empty or exceeds 150 MiB.");
    }
    const bytes = await readFile(temporaryPath);
    if (bytes.length !== size) throw new Error("curl download size did not match its response metadata.");
    return { bytes, mime: String(mime).split(";")[0].toLowerCase() };
  } finally {
    await unlink(temporaryPath).catch(() => {});
  }
};

const downloadSelection = async (selectionPath, projectPath) => {
  const selection = JSON.parse(await readFile(selectionPath, "utf8"));
  const assets = validateNasaSelection(selection);
  const projectDir = path.resolve(projectPath);
  const assetsDir = path.join(projectDir, "assets");
  const productionDir = path.join(projectDir, "production");
  await mkdir(assetsDir, { recursive: true });
  await mkdir(productionDir, { recursive: true });

  const downloaded = [];
  const failures = [];
  for (const [index, asset] of assets.entries()) {
    try {
      const isLibraryAsset = Boolean(asset.nasaId);
      const safeMediaHost = isLibraryAsset ? isSafeNasaLibraryVideoUrl : isSafeNasaSvsUrl;
      const mediaUrls = isLibraryAsset
        ? await resolveNasaLibraryVideoUrls(asset.nasaId)
        : [asset.url];
      let bytes;
      let mime;
      let mediaUrl;
      let lastRenditionError;
      for (const candidateUrl of mediaUrls) {
        try {
          let candidateBytes;
          let candidateMime;
          try {
            const response = await fetchNasaVideoWithRetries(candidateUrl);
            if (!response.ok) throw new Error("HTTP " + response.status);
            if (!safeMediaHost(response.url)) throw new Error("NASA download redirected outside the approved media host.");
            const length = Number(response.headers.get("content-length") || 0);
            if (length > MAX_BYTES) {
              await response.body?.cancel().catch(() => {});
              throw new Error("Rendition exceeds 150 MiB (" + length + " bytes).");
            }
            candidateBytes = Buffer.from(await response.arrayBuffer());
            candidateMime = String(response.headers.get("content-type") || "").split(";")[0].toLowerCase();
            if (!candidateBytes.length || candidateBytes.length > MAX_BYTES || !VIDEO_TYPES.has(candidateMime)) {
              throw new Error("Response is empty, oversized or not a supported video.");
            }
          } catch (fetchError) {
            if (fetchError instanceof Error && fetchError.message.startsWith("Rendition exceeds 150 MiB")) {
              throw fetchError;
            }
            process.stderr.write("Node fetch failed for " + asset.id + " rendition " + path.basename(new URL(candidateUrl).pathname) + ": " + errorDetails(fetchError) + "; trying curl fallback.\n");
            const fallback = await downloadWithCurl(candidateUrl, path.join(assetsDir, path.basename(new URL(candidateUrl).pathname)));
            candidateBytes = fallback.bytes;
            candidateMime = fallback.mime;
          }
          const candidateExtension = VIDEO_TYPES.get(candidateMime);
          if (candidateExtension !== path.extname(new URL(candidateUrl).pathname).slice(1).toLowerCase()) {
            throw new Error("Downloaded video MIME type does not match its filename.");
          }
          bytes = candidateBytes;
          mime = candidateMime;
          mediaUrl = candidateUrl;
          break;
        } catch (renditionError) {
          lastRenditionError = renditionError;
          process.stderr.write("Skipping NASA rendition " + path.basename(new URL(candidateUrl).pathname) + ": " +
            (renditionError instanceof Error ? renditionError.message : String(renditionError)) + "\n");
        }
      }
      if (!bytes || !mime || !mediaUrl) {
        throw lastRenditionError ?? new Error("No NASA video rendition could be downloaded within the configured size limit.");
      }
      const extension = VIDEO_TYPES.get(mime);
      const safeName = path.basename(new URL(mediaUrl).pathname)
        .normalize("NFKD").replace(/[^\w.-]+/g, "-").slice(0, 110) || "nasa-footage." + extension;
      const filename = safeName;
      await writeFile(path.join(assetsDir, filename), bytes);
      downloaded.push({
        file: filename,
        type: "licensed video footage",
        shotIds: asset.shotIds,
        title: asset.title,
        source: isLibraryAsset ? "NASA Image and Video Library" : "NASA Scientific Visualization Studio",
        sourcePage: asset.sourcePage,
        sourceUrl: mediaUrl,
        license: "Public domain",
        licenseUrl: "https://www.nasa.gov/nasa-brand-center/images-and-media/",
        creator: asset.creator,
        attribution: asset.attribution || asset.creator,
        width: asset.width ?? null,
        height: asset.height ?? null,
        ...(asset.trimBeforeSecondsByShotId ? { trimBeforeSecondsByShotId: asset.trimBeforeSecondsByShotId } : {}),
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
      });
    } catch (error) {
      failures.push({
        id: asset.id,
        title: asset.title,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    if (index < assets.length - 1) await sleep(1_000);
  }

  const manifestPath = path.join(productionDir, "asset-manifest.json");
  let manifest = { project: path.basename(projectDir), assets: [] };
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  const merged = new Map((Array.isArray(manifest.assets) ? manifest.assets : []).map((item) => [item.file, item]));
  for (const item of downloaded) merged.set(item.file, item);
  await writeFile(manifestPath, JSON.stringify({
    ...manifest,
    updatedAt: new Date().toISOString(),
    assets: [...merged.values()],
  }, null, 2) + "\n");
  return { downloaded, failures, manifestPath };
};

export const runCli = async (argv = process.argv.slice(2)) => {
  const [command, ...args] = argv;
  const options = {};
  for (let index = 0; index < args.length; index += 1) {
    if (!args[index].startsWith("--") || !args[index + 1] || args[index + 1].startsWith("--")) {
      throw new Error("Expected --option value pairs.");
    }
    options[args[index].slice(2)] = args[index + 1];
    index += 1;
  }
  if (command !== "download" || !options.selection || !options.project) {
    throw new Error("Usage: node scripts/nasa-video-assets.mjs download --selection <selection.json> --project <project-dir>");
  }
  const result = await downloadSelection(options.selection, options.project);
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  if (result.failures.length) process.exitCode = 1;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runCli().catch((error) => {
    process.stderr.write((error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  });
}
