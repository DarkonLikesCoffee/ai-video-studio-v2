import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchUrl,
  buildShotQueries,
  detectImageExtension,
  isAllowedLicense,
  normalizeCandidate,
  validateSelection,
} from "../scripts/openverse-assets.mjs";

test("Openverse search is anonymous, bounded and limited to reusable image licenses", () => {
  const url = buildSearchUrl("cinematic ocean waves", 99);
  assert.equal(url.origin, "https://api.openverse.org");
  assert.equal(url.searchParams.get("q"), "cinematic ocean waves");
  assert.equal(url.searchParams.get("page_size"), "20");
  assert.equal(url.searchParams.get("mature"), "false");
  assert.equal(url.searchParams.get("filter_dead"), "true");
  assert.deepEqual(url.searchParams.get("license").split(","), ["cc0", "pdm", "by"]);
});

test("search rejects empty queries", () => {
  assert.throws(() => buildSearchUrl("  "), /non-empty/);
});

test("only public-domain and attribution-based commercial licenses are allowed", () => {
  for (const license of ["cc0", "pdm", "by"]) assert.equal(isAllowedLicense(license), true);
  for (const license of ["by-sa", "by-nc", "by-nc-sa", "by-nd", "by-nc-nd", "unknown", ""]) assert.equal(isAllowedLicense(license), false);
});

test("candidate normalization preserves attribution and source metadata", () => {
  const candidate = normalizeCandidate({
    id: "abc-123",
    title: "Ocean at dusk",
    creator: "A Photographer",
    creator_url: "https://example.org/creator",
    foreign_landing_url: "https://example.org/photo",
    url: "https://cdn.example.org/ocean.jpg",
    license: "CC0",
    license_version: "1.0",
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    filetype: "jpg",
    width: 1920,
    height: 1080,
  });
  assert.equal(candidate.license, "cc0");
  assert.equal(candidate.creator, "A Photographer");
  assert.equal(candidate.sourcePage, "https://example.org/photo");
  assert.equal(candidate.width, 1920);
});

test("selection requires approved licenses, HTTPS raster assets and shot references", () => {
  const valid = {
    assets: [{
      id: "abc-123",
      title: "Ocean",
      url: "https://cdn.example.org/ocean.jpg",
      license: "cc0",
      filetype: "jpg",
      shotIds: ["opening"],
    }],
  };
  assert.equal(validateSelection(valid).length, 1);
  assert.throws(() => validateSelection({ assets: [{ ...valid.assets[0], license: "by-nc" }] }), /not approved/);
  assert.throws(() => validateSelection({ assets: [{ ...valid.assets[0], url: "http://cdn.example.org/ocean.jpg" }] }), /HTTPS/);
  assert.throws(() => validateSelection({ assets: [{ ...valid.assets[0], url: "https://localhost/ocean.jpg" }] }), /private host/);
  assert.throws(() => validateSelection({ assets: [{ ...valid.assets[0], shotIds: [] }] }), /shotId/);
});

test("duplicate asset IDs are rejected before download", () => {
  const item = {
    id: "abc-123",
    title: "Ocean",
    url: "https://cdn.example.org/ocean.jpg",
    license: "cc0",
    filetype: "jpg",
    shotIds: ["opening"],
  };
  assert.throws(() => validateSelection({ assets: [item, item] }), /Duplicate asset id/);
});

test("downloaded image bytes are checked against raster signatures", () => {
  assert.equal(detectImageExtension(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "jpg");
  assert.equal(detectImageExtension(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), "png");
  assert.equal(detectImageExtension(Buffer.from("RIFF0000WEBP")), "webp");
  assert.equal(detectImageExtension(Buffer.from("not an image"), "text/html"), null);
});

test("storyboard search creates a bounded, shot-specific query for every selected shot", () => {
  const plan = {
    title: "Ocean film",
    shots: [
      { id: "opening", visual: "Aerial ocean at sunrise", purpose: "Hook with scale", framing: "Extreme wide" },
      { id: "detail", visual: "Water droplets on dark glass", purpose: "Show texture", framing: "Macro close-up" },
      { id: "closing", visual: "Aerial coastline", purpose: "Resolve the journey", framing: "Wide" },
    ],
  };
  const queries = buildShotQueries(plan, 2);
  assert.equal(queries.length, 2);
  assert.equal(queries[0].shotId, "opening");
  assert.match(queries[0].query, /Aerial ocean at sunrise/);
  assert.match(queries[0].query, /Extreme wide/);
  assert.equal(queries[1].shotId, "detail");
});

test("storyboard search rejects plans with no usable shot descriptions", () => {
  assert.throws(() => buildShotQueries({ shots: [] }), /non-empty shots/);
  assert.throws(() => buildShotQueries({ shots: [{ id: "blank" }] }), /no visual/);
});

test("storyboard search caps requested shots and query length", () => {
  const shots = Array.from({ length: 25 }, (_, i) => ({
    id: "shot-" + i,
    visual: "A".repeat(300),
  }));
  const queries = buildShotQueries({ shots }, 99);
  assert.equal(queries.length, 20);
  assert.equal(queries[0].query.length, 200);
});
