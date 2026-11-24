import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCommonsVideoSearchUrl,
  buildStoryboardVideoQueries,
  normalizeCommonsVideo,
} from "../scripts/commons-video-assets.mjs";

test("Commons video search is anonymous, bounded and scoped to file pages", () => {
  const url = buildCommonsVideoSearchUrl("ocean waves", 99);
  assert.equal(url.origin, "https://commons.wikimedia.org");
  assert.equal(url.searchParams.get("gsrnamespace"), "6");
  assert.equal(url.searchParams.get("gsrlimit"), "20");
  assert.match(url.searchParams.get("gsrsearch"), /filetype:video ocean waves/);
  assert.equal(url.searchParams.get("iiprop"), "url|size|mime|extmetadata");
});

test("Commons query rejects blank descriptions", () => {
  assert.throws(() => buildCommonsVideoSearchUrl(" "), /non-empty/);
});

test("storyboard queries are shot-specific, bounded and include action", () => {
  const shots = buildStoryboardVideoQueries({ shots: [
    { id: "opening", visual: "ocean", action: "waves crashing", purpose: "hook" },
    { id: "detail", visual: "water droplets", subject: "glass", action: "falling" },
  ] }, 1);
  assert.equal(shots.length, 1);
  assert.equal(shots[0].shotId, "opening");
  assert.match(shots[0].query, /waves crashing/);
});

test("storyboard query rejects plans with missing visual direction", () => {
  assert.throws(() => buildStoryboardVideoQueries({ shots: [] }), /non-empty shots/);
  assert.throws(() => buildStoryboardVideoQueries({ shots: [{ id: "blank" }] }), /no searchable/);
});

test("Commons candidate normalization keeps license and media metadata", () => {
  const result = normalizeCommonsVideo({
    pageid: 42,
    title: "File:Ocean waves.webm",
    imageinfo: [{ url: "https://upload.wikimedia.org/wikipedia/commons/a/a0/ocean.webm",
      thumburl: "https://upload.wikimedia.org/thumb/a/a0/ocean.jpg",
      descriptionurl: "https://commons.wikimedia.org/wiki/File:Ocean_waves.webm",
      mime: "video/webm", size: 12345, width: 1920, height: 1080,
      extmetadata: { LicenseShortName: { value: "CC BY 4.0" }, LicenseUrl: { value: "https://creativecommons.org/licenses/by/4.0/" } }
    }]
  });
  assert.equal(result.allowed, true);
  assert.equal(result.filetype, "webm");
  assert.equal(result.width, 1920);
  assert.equal(result.license, "CC BY 4.0");
});

test("Commons normalization excludes share-alike, noncommercial and unsupported formats", () => {
  const base = { pageid: 1, title: "File:clip.mp4", imageinfo: [{ mime: "video/mp4", extmetadata: { LicenseShortName: { value: "CC BY-SA 4.0" } } }] };
  assert.equal(normalizeCommonsVideo(base).allowed, false);
  assert.equal(normalizeCommonsVideo({ ...base, imageinfo: [{ ...base.imageinfo[0], extmetadata: { LicenseShortName: { value: "CC BY-NC 4.0" } } }] }).allowed, false);
  assert.equal(normalizeCommonsVideo({ ...base, imageinfo: [{ ...base.imageinfo[0], mime: "image/jpeg", extmetadata: { LicenseShortName: { value: "CC0" } } }] }).allowed, false);
});
