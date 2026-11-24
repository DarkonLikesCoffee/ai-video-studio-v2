import assert from "node:assert/strict";
import test from "node:test";
import { buildFootageCredits } from "../scripts/write-footage-credits";

test("writes creator, source, license and modifications for video footage", () => {
  const credits = buildFootageCredits({
    assets: [
      {
        type: "licensed video footage",
        title: "Cloud timelapse.webm",
        creator: "John Fowler",
        attribution: "John Fowler (away)",
        sourcePage: "https://commons.wikimedia.org/wiki/File:Cloud_timelapse.webm",
        license: "CC BY 2.0",
        licenseUrl: "https://creativecommons.org/licenses/by/2.0/",
      },
    ],
  });
  assert.match(credits, /John Fowler \(away\)/);
  assert.match(credits, /commons\.wikimedia\.org/);
  assert.match(credits, /CC BY 2\.0/);
  assert.match(credits, /cropped\/reframed/);
});

test("omits unrelated assets and handles an empty manifest", () => {
  const credits = buildFootageCredits({
    assets: [{ type: "image", title: "Still image" }],
  });
  assert.match(credits, /No third-party or user-provided video footage/);
  assert.doesNotMatch(credits, /Still image/);
});

test("credits user-provided gameplay separately without claiming a public license", () => {
  const credits = buildFootageCredits({
    assets: [{
      type: "user-provided-gameplay",
      file: "ranked-duel-01.mp4",
      rightsBasis: "user-owned",
      rightsNote: "Recorded by the project owner in their own ranked matches.",
    }],
  });
  assert.match(credits, /User-provided footage/);
  assert.match(credits, /user-owned/);
  assert.match(credits, /Recorded by the project owner/);
  assert.doesNotMatch(credits, /Creative Commons/);
});
