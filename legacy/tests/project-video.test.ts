import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { evaluateSvgPathMorph } from "../packages/video-engine/src/animation";
import { interpolateMorphableSvgPaths, parseMorphableSvgPath } from "../packages/video-engine/src/svg-path";
import { getSceneTransitionStyle } from "../packages/video-engine/src/transitions";
import {
  getProjectDurationInFrames,
  isRemoteMediaUrl,
  isSafeProjectAssetPath,
  validateProjectDefinition,
  type GraphicElement,
  type SubtitleCue,
  type VideoProject
} from "../packages/video-engine/src/project";

const readExample = async (): Promise<VideoProject> =>
  JSON.parse(await readFile(new URL("../projects/examples/three-scene-story/scene.json", import.meta.url), "utf8")) as VideoProject;

const readAetherShowcase = async (): Promise<VideoProject> =>
  JSON.parse(await readFile(new URL("../projects/showcase-motion/scene.json", import.meta.url), "utf8")) as VideoProject;

test("Aether showcase is a valid four-scene motion design project with advanced audio", async () => {
  const project = await readAetherShowcase();
  assert.deepEqual(validateProjectDefinition(project), []);
  assert.equal(project.scenes.length, 4);
  assert.equal(getProjectDurationInFrames(project), 480);
  assert.equal(project.audioTracks?.length, 5);
  assert.equal(project.audioTracks?.filter((track) => track.effects).length, 4);
  assert.equal(project.audioTracks?.[0]?.ducking?.sidechainTrackIds[0], "ducking-key");
  assert.equal(project.audioTracks?.find((track) => track.id === "ducking-key")?.muted, true);
  assert.equal(project.audioMastering?.integratedLufs, -16);
  assert.ok(project.scenes.every((scene) => (scene.graphics?.length ?? 0) > 0));
  assert.ok(project.scenes.every((scene) => (scene.particleSystems?.length ?? 0) > 0));
  assert.ok(project.scenes.flatMap((scene) => scene.graphics ?? []).some((graphic) => graphic.type === "path"));
  assert.ok(project.scenes.flatMap((scene) => scene.graphics ?? []).some((graphic) => graphic.type === "text"));
  assert.ok(project.scenes.flatMap((scene) => scene.particleSystems ?? []).some((system) => system.blendMode === "screen"));
});

test("three-scene example is a valid ProjectVideo project with image and video media", async () => {
  const project = await readExample();
  assert.deepEqual(validateProjectDefinition(project), []);
  assert.equal(project.composition.id, "ProjectVideo");
  assert.equal(project.scenes.length, 3);
  assert.equal(getProjectDurationInFrames(project), 300);
  assert.equal(project.scenes[0]!.mediaLayers?.length, 2);
  assert.equal(project.scenes[1]!.mediaLayers?.length, 2);
  assert.equal(project.scenes[0]!.mediaLayers?.[0]?.type, "image");
  assert.equal(project.scenes[1]!.mediaLayers?.[0]?.type, "video");
  assert.equal(project.audioTracks?.length, 2);
  assert.deepEqual(project.audioTracks?.map((track) => track.role), ["music", "sfx"]);
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("project duration is derived from all scene durations", async () => {
  const project = await readExample();
  project.scenes[1]!.durationInFrames = 150;
  assert.equal(getProjectDurationInFrames(project), 330);
});

test("validator rejects duplicate scene IDs", async () => {
  const project = await readExample();
  project.scenes[1]!.id = project.scenes[0]!.id;
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("id must be unique")));
});

test("validator rejects unsupported scene types and invalid colors", async () => {
  const project = await readExample();
  const scene = project.scenes[0] as unknown as { type: string; accentColor: string };
  scene.type = "video";
  scene.accentColor = "purple";
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("type must be title, content, or outro")));
  assert.ok(errors.some((error) => error.includes("accentColor must be a six-digit hex color")));
});

test("validator caps total project duration at 60 seconds", async () => {
  const project = await readExample();
  project.scenes[0]!.durationInFrames = 900;
  project.scenes[1]!.durationInFrames = 900;
  project.scenes[2]!.durationInFrames = 900;
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("total scene duration")));
});

test("local media paths must stay below the project assets directory", () => {
  assert.equal(isSafeProjectAssetPath("assets/connection-map.svg"), true);
  assert.equal(isSafeProjectAssetPath("assets/photos/frame-01.webp"), true);
  assert.equal(isSafeProjectAssetPath("../secret.png"), false);
  assert.equal(isSafeProjectAssetPath("assets/../../secret.png"), false);
  assert.equal(isSafeProjectAssetPath("/assets/photo.png"), false);
  assert.equal(isSafeProjectAssetPath(String.raw`assets\\photo.png`), false);
});

test("remote media sources must use HTTPS and have no embedded credentials", () => {
  assert.equal(isRemoteMediaUrl("https://example.com/clip.mp4"), true);
  assert.equal(isRemoteMediaUrl("http://example.com/clip.mp4"), false);
  assert.equal(isRemoteMediaUrl("https://user:pass@example.com/clip.mp4"), false);
});

test("validator rejects media with unsafe paths or mismatched file types", async () => {
  const project = await readExample();
  project.scenes[0]!.mediaLayers![0]!.src = "assets/../../outside.svg";
  project.scenes[1]!.mediaLayers![0]!.src = "https://example.com/poster.png";
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("safe path under assets/")));
  assert.ok(errors.some((error) => error.includes("unsupported extension for video media")));
});

test("validator rejects video playback controls on image media", async () => {
  const project = await readExample();
  const media = project.scenes[0]!.mediaLayers![0] as unknown as { volume: number };
  media.volume = 0.5;
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("video playback options")));
});

test("remote media URLs reject loopback and private network addresses", () => {
  assert.equal(isRemoteMediaUrl("https://127.0.0.1/video.mp4"), false);
  assert.equal(isRemoteMediaUrl("https://10.0.0.5/video.mp4"), false);
  assert.equal(isRemoteMediaUrl("https://192.168.1.10/video.mp4"), false);
  assert.equal(isRemoteMediaUrl("https://172.16.0.1/video.mp4"), false);
  assert.equal(isRemoteMediaUrl("https://169.254.169.254/latest/meta-data"), false);
  assert.equal(isRemoteMediaUrl("https://media.example.com/video.mp4"), true);
});

test("legacy single media remains supported", async () => {
  const project = await readExample();
  const firstScene = project.scenes[0]!;
  firstScene.media = firstScene.mediaLayers![0]!;
  delete firstScene.mediaLayers;
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("validator enforces media layer count and unique IDs", async () => {
  const project = await readExample();
  const scene = project.scenes[0]!;
  scene.mediaLayers = Array.from({ length: 9 }, (_, index) => ({
    id: `layer-${index}`,
    type: "image" as const,
    src: "assets/connection-map.svg",
  }));
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("between 1 and 8 layers")));

  scene.mediaLayers = [
    { id: "duplicate", type: "image", src: "assets/connection-map.svg" },
    { id: "duplicate", type: "image", src: "assets/connection-map.svg" },
  ];
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("id must be unique")));
});

test("validator enforces layer geometry and timeline bounds", async () => {
  const project = await readExample();
  const layer = project.scenes[0]!.mediaLayers![0]!;
  layer.x = 80;
  layer.width = 30;
  layer.y = 0;
  layer.height = 50;
  layer.startInFrames = 80;
  layer.durationInFrames = 20;
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("x + width cannot exceed 100")));
  assert.ok(errors.some((error) => error.includes("timeline window cannot extend beyond its scene")));
});

test("validator rejects simultaneous legacy media and mediaLayers", async () => {
  const project = await readExample();
  const scene = project.scenes[0]!;
  scene.media = { type: "image", src: "assets/connection-map.svg" };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("cannot define both media and mediaLayers")));
});

test("camera motion accepts subtle per-scene Ken Burns moves", async () => {
  const project = await readExample();
  project.scenes[0]!.cameraMotion = { zoom: 1.055, panX: -1.1, panY: 0.25 };
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("camera motion rejects extreme zoom and pan values", async () => {
  const project = await readExample();
  project.scenes[0]!.cameraMotion = { zoom: 1.5, panX: 12, panY: -11 };
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("cameraMotion.zoom must be between 1 and 1.2")));
  assert.ok(errors.some((error) => error.includes("cameraMotion.panX must be between -10 and 10")));
  assert.ok(errors.some((error) => error.includes("cameraMotion.panY must be between -10 and 10")));
});

test("camera motion supports eased movement and rejects unknown easing", async () => {
  const project = await readExample();
  project.scenes[0]!.cameraMotion = { zoom: 1.08, panX: -2, easing: "ease-in-out" };
  assert.deepEqual(validateProjectDefinition(project), []);
  project.scenes[0]!.cameraMotion.easing = "overshoot" as "linear";
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("cameraMotion.easing")));
});

test("validator accepts valid media and text animation tracks", async () => {
  const project = await readExample();
  project.scenes[0]!.mediaLayers![0]!.animations = {
    x: { keyframes: [{ frame: 0, value: 54, easing: "ease-out" }, { frame: 60, value: 50 }] },
    opacity: { keyframes: [{ frame: 0, value: 0 }, { frame: 20, value: 1 }] },
    scaleX: { keyframes: [{ frame: 0, value: 0.8 }, { frame: 30, value: 1 }] },
  };
  project.scenes[0]!.titleAnimation = {
    y: { keyframes: [{ frame: 0, value: 15 }, { frame: 20, value: 0 }] },
    opacity: { keyframes: [{ frame: 0, value: 0 }, { frame: 18, value: 1 }] },
  };
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("validator rejects unsorted, duplicate, and out-of-range animation keyframes", async () => {
  const project = await readExample();
  project.scenes[0]!.mediaLayers![0]!.animations = {
    x: { keyframes: [{ frame: 10, value: 10 }, { frame: 5, value: 20 }] },
    opacity: { keyframes: [{ frame: 0, value: 0 }, { frame: 20, value: 1.5 }] },
  };
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("strictly greater than the previous frame")));
  assert.ok(errors.some((error) => error.includes("opacity must be between 0 and 1")));
});

test("validator rejects invalid easing curves and excessive keyframes", async () => {
  const project = await readExample();
  project.scenes[0]!.titleAnimation = {
    rotation: {
      keyframes: [
        { frame: 0, value: 0, easing: { type: "bezier", x1: 2, y1: 0, x2: 0.5, y2: 1 } },
        { frame: 10, value: 45 },
      ],
    },
  };
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("x1 must be between 0 and 1")));

  project.scenes[0]!.titleAnimation = {
    opacity: {
      keyframes: Array.from({ length: 31 }, (_, index) => ({ frame: index, value: 1 })),
    },
  };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("between 1 and 30 keyframes")));
});

test("validator keeps animation keyframes inside each media layer lifetime", async () => {
  const project = await readExample();
  const layer = project.scenes[0]!.mediaLayers![0]!;
  layer.startInFrames = 10;
  layer.durationInFrames = 40;
  layer.animations = {
    x: { keyframes: [{ frame: 0, value: 0 }, { frame: 40, value: 50 }] },
  };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("frame must be between 0 and 39")));
});

test("validator allows off-canvas movement but rejects extreme animated positions", async () => {
  const project = await readExample();
  assert.ok(validateProjectDefinition(project).length === 0);
  project.scenes[0]!.titleAnimation = {
    x: { keyframes: [{ frame: 0, value: -201 }, { frame: 20, value: 0 }] },
  };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("between -200 and 200")));
});

test("audio tracks support music, voiceover, sound effects and ambience roles", async () => {
  const project = await readExample();
  project.audioTracks = [
    { id: "music", role: "music", src: "assets/audio/ambient-bed.wav", startInFrames: 0 },
    { id: "voice", role: "voiceover", src: "assets/audio/ambient-bed.wav", startInFrames: 0 },
    { id: "sfx", role: "sfx", src: "assets/audio/transition-chime.wav", startInFrames: 30 },
    { id: "room-tone", role: "ambience", src: "assets/audio/ambient-bed.wav", startInFrames: 0 },
  ];
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("audio volume automation and fades are validated against track duration", async () => {
  const project = await readExample();
  project.audioTracks![0]!.volumeAutomation = {
    keyframes: [
      { frame: 0, value: 1, easing: "ease-in" },
      { frame: 88, value: 0.4, easing: "ease-out" },
      { frame: 160, value: 1 },
    ],
  };
  project.audioTracks![0]!.fadeInFrames = 30;
  project.audioTracks![0]!.fadeOutFrames = 45;
  assert.deepEqual(validateProjectDefinition(project), []);

  project.audioTracks![0]!.volumeAutomation = {
    keyframes: [{ frame: 0, value: 1.2 }],
  };
  project.audioTracks![0]!.fadeOutFrames = 301;
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("opacity must be between 0 and 1")));
  assert.ok(errors.some((error) => error.includes("fadeOutFrames must be between 0 and the track duration")));
});

test("audio tracks reject insecure remote URLs and unsupported extensions", async () => {
  const project = await readExample();
  project.audioTracks![0]!.src = "http://example.com/music.mp3";
  project.audioTracks![1]!.src = "assets/audio/clip.mp4";
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("public HTTPS URL or a safe path under assets/")));
  assert.ok(errors.some((error) => error.includes("supported audio extension")));
});

test("audio tracks must remain inside the project timeline", async () => {
  const project = await readExample();
  project.audioTracks![0]!.startInFrames = 290;
  project.audioTracks![0]!.durationInFrames = 20;
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("timeline window cannot extend beyond the project")));
});

test("audio track IDs must be unique and projects support at most 16 tracks", async () => {
  const project = await readExample();
  project.audioTracks![1]!.id = project.audioTracks![0]!.id;
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("id must be unique")));

  project.audioTracks = Array.from({ length: 17 }, (_, index) => ({
    id: `audio-${index}`,
    role: "sfx" as const,
    src: "assets/audio/transition-chime.wav",
    startInFrames: 0,
  }));
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("at most 16 tracks")));
});

test("audio fades, playback rate, volume and boolean flags are range checked", async () => {
  const project = await readExample();
  const track = project.audioTracks![0] as unknown as Record<string, unknown>;
  track.volume = 2;
  track.playbackRate = 8;
  track.loop = "yes";
  track.preservePitch = "yes";
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("volume must be between 0 and 1")));
  assert.ok(errors.some((error) => error.includes("playbackRate must be between 0.25 and 4")));
  assert.ok(errors.some((error) => error.includes("loop must be a boolean")));
  assert.ok(errors.some((error) => error.includes("preservePitch must be a boolean")));
});

test("audio effects accept EQ, compression, reverb and panning settings", async () => {
  const project = await readExample();
  project.audioTracks = [
    {
      id: "music-bed",
      role: "music",
      src: "assets/audio/ambient-bed.wav",
      startInFrames: 0,
      effects: {
        highPassHz: 40,
        lowPassHz: 16000,
        eqBands: [
          { frequency: 90, gainDb: 2, q: 0.8 },
          { frequency: 2800, gainDb: -1.5, q: 1.2 },
        ],
        compressor: {
          thresholdDb: -22,
          ratio: 3,
          attackMs: 20,
          releaseMs: 240,
          makeupGainDb: 1,
        },
        reverb: { wet: 0.2, roomSize: 0.7 },
        pan: -0.25,
      },
      ducking: { sidechainTrackIds: ["narration"], thresholdDb: -30, ratio: 6 },
    },
    {
      id: "narration",
      role: "voiceover",
      src: "assets/audio/ambient-bed.wav",
      startInFrames: 0,
      muted: true,
    },
  ];
  project.audioMastering = { integratedLufs: -16, truePeakDb: -1.5, loudnessRange: 11 };
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("advanced audio validation rejects invalid EQ, compressor, reverb and pan values", async () => {
  const project = await readExample();
  project.audioTracks![0]!.effects = {
    highPassHz: 18000,
    lowPassHz: 200,
    eqBands: [{ frequency: 22000, gainDb: 18, q: 20 }],
    compressor: { thresholdDb: -80, ratio: 30, attackMs: 0, releaseMs: 12000 },
    reverb: { wet: 1.5, roomSize: -0.1 },
    pan: 2,
  };
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("highPassHz must be between 20 and 1000 Hz")));
  assert.ok(errors.some((error) => error.includes("highPassHz must be lower than lowPassHz")));
  assert.ok(errors.some((error) => error.includes("eqBands[0].frequency")));
  assert.ok(errors.some((error) => error.includes("eqBands[0].gainDb")));
  assert.ok(errors.some((error) => error.includes("compressor.thresholdDb")));
  assert.ok(errors.some((error) => error.includes("reverb.wet")));
  assert.ok(errors.some((error) => error.includes("pan must be between -1 and 1")));
});

test("sidechain ducking must reference existing voiceover tracks and local assets", async () => {
  const project = await readExample();
  project.audioTracks = [
    {
      id: "music-bed",
      role: "music",
      src: "assets/audio/ambient-bed.wav",
      startInFrames: 0,
      ducking: { sidechainTrackIds: ["missing-voice"] },
    },
  ];
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("existing voiceover tracks")));

  project.audioTracks.push({
    id: "voice",
    role: "voiceover",
    src: "https://cdn.example.com/narration.wav",
    startInFrames: 0,
  });
  project.audioTracks[0]!.ducking!.sidechainTrackIds = ["voice"];
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("sidechain tracks must use local assets/ files")));
});

test("advanced DSP is only allowed on local audio files", async () => {
  const project = await readExample();
  project.audioTracks![0]!.src = "https://cdn.example.com/music.mp3";
  project.audioTracks![0]!.effects = { pan: 0.5 };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("with effects or ducking must use a local assets/ audio file")));
});

test("audio mastering settings validate LUFS, true peak and loudness range", async () => {
  const project = await readExample();
  project.audioMastering = { integratedLufs: -16, truePeakDb: -1.5, loudnessRange: 10 };
  assert.deepEqual(validateProjectDefinition(project), []);

  project.audioMastering = { integratedLufs: -40, truePeakDb: 2, loudnessRange: 30 };
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("integratedLufs must be between -24 and -8 LUFS")));
  assert.ok(errors.some((error) => error.includes("truePeakDb must be between -9 and 0 dBTP")));
  assert.ok(errors.some((error) => error.includes("loudnessRange must be between 1 and 20 LU")));
});

test("vector graphics accept shapes, text and animated SVG path reveals", async () => {
  const project = await readExample();
  project.scenes[0]!.graphics = [
    {
      id: "outline-card",
      type: "rect",
      x: 10,
      y: 12,
      width: 80,
      height: 70,
      fill: "#101A33",
      stroke: "#75E8FF",
      strokeWidth: 2,
      radius: 4,
    },
    {
      id: "orb",
      type: "ellipse",
      x: 32,
      y: 24,
      width: 36,
      height: 48,
      fill: "#7D73FF",
      opacity: 0.8,
    },
    {
      id: "reveal-line",
      type: "path",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      d: "M0 50 C25 0 75 100 100 50",
      stroke: "#FFFFFF",
      strokeWidth: 2,
      animations: {
        pathProgress: {
          keyframes: [{ frame: 0, value: 0 }, { frame: 40, value: 1, easing: "ease-out" }],
        },
      },
    },
    {
      id: "label",
      type: "text",
      x: 12,
      y: 82,
      width: 70,
      height: 8,
      fill: "#FFFFFF",
      text: "VECTOR SYSTEM",
      fontSize: 32,
      fontWeight: 700,
      textAnchor: "middle",
      letterSpacing: 2,
    },
  ];
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("vector graphic validation rejects malformed geometry, path data and text styling", async () => {
  const project = await readExample();
  project.scenes[0]!.graphics = [
    {
      id: "bad-path",
      type: "path",
      x: 90,
      y: 5,
      width: 20,
      height: 30,
      d: "M0 0 onload=alert(1)",
      stroke: "red",
      strokeWidth: 40,
    } as unknown as GraphicElement,
    {
      id: "bad-text",
      type: "text",
      x: 0,
      y: 0,
      width: 30,
      height: 10,
      fill: "#FFFFFF",
      text: "x".repeat(301),
      fontSize: 400,
      fontWeight: 100,
      fontFamily: "url(javascript:alert(1))",
      textAnchor: "side",
      letterSpacing: 50,
    } as unknown as GraphicElement,
  ];
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("x + width cannot exceed 100")));
  assert.ok(errors.some((error) => error.includes("valid-looking SVG path data")));
  assert.ok(errors.some((error) => error.includes("stroke must be a six-digit hex color")));
  assert.ok(errors.some((error) => error.includes("strokeWidth must be between 0 and 20")));
  assert.ok(errors.some((error) => error.includes("text is required and must be at most 300 characters")));
  assert.ok(errors.some((error) => error.includes("fontSize must be between 8 and 240 pixels")));
  assert.ok(errors.some((error) => error.includes("fontFamily contains unsupported characters")));
  assert.ok(errors.some((error) => error.includes("textAnchor must be start, middle, or end")));
});

test("path progress keyframes must stay between zero and one", async () => {
  const project = await readExample();
  project.scenes[0]!.graphics = [{
    id: "path",
    type: "path",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    d: "M0 0 L100 100",
    stroke: "#FFFFFF",
    animations: {
      pathProgress: { keyframes: [{ frame: 0, value: 0 }, { frame: 30, value: 1.1 }] },
    },
  }];
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("pathProgress must be between 0 and 1")));
});

test("SVG path morph interpolates corresponding absolute path points deterministically", () => {
  const from = "M 0 0 L 100 100";
  const to = "M 100 0 L 0 100";
  const track = {
    keyframes: [
      { frame: 0, d: from, easing: "ease-in-out" as const },
      { frame: 40, d: to },
    ],
  };

  assert.ok(parseMorphableSvgPath(from));
  assert.equal(evaluateSvgPathMorph(0, from, track), from);
  assert.equal(evaluateSvgPathMorph(20, from, track), "M 50 0 L 50 100");
  assert.equal(evaluateSvgPathMorph(40, from, track), to);
  assert.equal(evaluateSvgPathMorph(80, from, track), to);
});

test("SVG path morph parsing rejects incompatible or ambiguous path syntax", () => {
  assert.equal(parseMorphableSvgPath("m 0 0 l 100 100"), null);
  assert.equal(parseMorphableSvgPath("M 0 0 A 20 20 0 0 1 100 100"), null);
  assert.equal(parseMorphableSvgPath("M 0 0 L 100 100 C 20 20"), null);
  assert.equal(interpolateMorphableSvgPaths(
    "M 0 0 L 100 100",
    "M 100 0 C 0 0 100 100 50 100",
    0.5
  ), null);
});

test("project validation accepts compatible SVG morphs and rejects topology or timeline mismatches", async () => {
  const project = await readExample();
  const from = "M 0 0 L 100 100";
  const to = "M 100 0 L 0 100";
  project.scenes[0]!.graphics = [{
    id: "morph-line",
    type: "path",
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    d: from,
    pathMorph: {
      keyframes: [
        { frame: 0, d: from },
        { frame: 60, d: to, easing: "ease-in-out" },
      ],
    },
    stroke: "#FFFFFF",
  }];
  const graphics = project.scenes[0]!.graphics!;
  assert.deepEqual(validateProjectDefinition(project), []);

  graphics[0] = {
    ...graphics[0]!,
    pathMorph: {
      keyframes: [
        { frame: 0, d: from },
        { frame: 60, d: "M 100 0 C 0 0 100 100 50 100" },
      ],
    },
  };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("same command topology")));

  graphics[0] = {
    ...graphics[0]!,
    pathMorph: {
      keyframes: [
        { frame: 1, d: from },
        { frame: 60, d: to },
      ],
    },
  };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("keyframes[0].frame must be 0")));

  graphics[0] = {
    ...graphics[0]!,
    pathMorph: {
      keyframes: [
        { frame: 0, d: from },
        { frame: 90, d: to },
      ],
    },
  };
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("pathMorph.keyframes[1].frame")));
});

test("particle systems accept seeded emitters with bounded motion and color palettes", async () => {
  const project = await readExample();
  project.scenes[0]!.particleSystems = [
    {
      id: "stars",
      count: 120,
      seed: 42,
      originX: 50,
      originY: 50,
      spreadX: 80,
      spreadY: 70,
      lifeInFrames: 90,
      angleMinDeg: 220,
      angleMaxDeg: 320,
      speedMin: 0.5,
      speedMax: 6,
      gravity: 0.2,
      sizeMin: 1,
      sizeMax: 8,
      opacity: 0.8,
      colors: ["#FFFFFF", "#7DEBFF", "#A98BFF"],
      shape: "circle",
      blendMode: "screen",
    },
  ];
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("particle validation enforces per-system limits and scene-wide budgets", async () => {
  const project = await readExample();
  project.scenes[0]!.particleSystems = Array.from({ length: 3 }, (_, index) => ({
    id: `particles-${index}`,
    count: 140,
    seed: index,
    originX: 50,
    originY: 50,
    lifeInFrames: 90,
    colors: ["#FFFFFF"],
  }));
  assert.ok(validateProjectDefinition(project).some((error) => error.includes("combined count must not exceed 360 particles")));

  project.scenes[0]!.particleSystems = [{
    id: "invalid",
    count: 161,
    seed: 3.4,
    originX: -1,
    originY: 150,
    lifeInFrames: 2,
    speedMin: 10,
    speedMax: 1,
    sizeMin: 12,
    sizeMax: 4,
    colors: ["not-a-color"],
    shape: "triangle" as never,
    blendMode: "multiply" as never,
  }];
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("count must be an integer between 1 and 160")));
  assert.ok(errors.some((error) => error.includes("seed must be a 32-bit signed integer")));
  assert.ok(errors.some((error) => error.includes("originX must be between 0 and 100")));
  assert.ok(errors.some((error) => error.includes("lifeInFrames must be an integer between 8 and 900")));
  assert.ok(errors.some((error) => error.includes("speedMin cannot exceed speedMax")));
  assert.ok(errors.some((error) => error.includes("sizeMin cannot exceed sizeMax")));
  assert.ok(errors.some((error) => error.includes("colors must contain 1-8 six-digit hex colors")));
  assert.ok(errors.some((error) => error.includes("shape must be circle, square, or diamond")));
});

test("particle fields stay bounded, preserve particle shape semantics and avoid a forced stacking layer", async () => {
  const project = await readExample();
  project.scenes[0]!.particleSystems = [{
    id: "bounded-stars",
    count: 12,
    seed: 314,
    originX: 50,
    originY: 50,
    spreadX: 60,
    spreadY: 60,
    lifeInFrames: 48,
    colors: ["#FFFFFF"],
    shape: "diamond",
    blendMode: "screen",
  }];
  assert.deepEqual(validateProjectDefinition(project), []);

  const source = await readFile(new URL("../packages/video-engine/src/scenes/ProjectVideo.tsx", import.meta.url), "utf8");
  assert.match(source, /mixBlendMode: system\.blendMode \?\? "screen"/);
  assert.doesNotMatch(source, /zIndex: 15,\s*mixBlendMode/);
  assert.match(source, /Math\.max\(-5, Math\.min\(105, xRaw\)\)/);
  assert.match(source, /Math\.max\(-5, Math\.min\(105, yRaw\)\)/);
  assert.match(source, /borderRadius: system\.shape === "circle" \? "50%" : 2/);
});

test("only the first and last scenes fade to black, not internal scene cuts", async () => {
  const source = await readFile(new URL("../packages/video-engine/src/scenes/ProjectVideo.tsx", import.meta.url), "utf8");
  assert.match(source, /interpolate\(frame, \[0, 12\], \[0, 1\]/);
  assert.match(source, /interpolate\(frame, \[duration - 12, duration\], \[1, 0\]/);
  assert.match(source, /\(isFirstScene \? fadeIn : 1\)\s*\*\s*\(isLastScene \? fadeOut : 1\)/);
  assert.match(source, /isFirstScene=\{index === 0\}/);
  assert.match(source, /isLastScene=\{index === scenes\.length - 1\}/);
});


test("scene transition styles produce deterministic progress for fades and pushes", () => {
  const fade = { type: "fade", durationInFrames: 24 } as const;
  assert.equal(getSceneTransitionStyle(0, 90, fade).opacity, 0);
  assert.equal(getSceneTransitionStyle(12, 90, fade).opacity, 0.5);
  assert.equal(getSceneTransitionStyle(24, 90, fade).opacity ?? 1, 1);
  assert.equal(getSceneTransitionStyle(102, 90, undefined, fade).opacity, 0.5);

  const slide = { type: "slide-left", durationInFrames: 20 } as const;
  assert.equal(getSceneTransitionStyle(0, 90, slide).transform, "translateX(100%)");
  assert.equal(getSceneTransitionStyle(20, 90, slide).transform, "translateX(0%)");
  assert.equal(getSceneTransitionStyle(90, 90, undefined, slide).transform, "translateX(0%)");
  assert.equal(getSceneTransitionStyle(100, 90, undefined, slide).transform, "translateX(-50%)");
  assert.equal(getSceneTransitionStyle(110, 90, undefined, slide).transform, "translateX(-100%)");
});

test("wipe and zoom transitions use clipping and scale without non-deterministic timing", () => {
  const wipe = { type: "wipe-right", durationInFrames: 20 } as const;
  assert.equal(getSceneTransitionStyle(0, 90, wipe).clipPath, "inset(0 100% 0 0)");
  assert.equal(getSceneTransitionStyle(20, 90, wipe).clipPath, "inset(0 0% 0 0)");

  const zoom = { type: "zoom", durationInFrames: 20 } as const;
  assert.deepEqual(getSceneTransitionStyle(0, 90, zoom), {
    opacity: 0,
    transform: "scale(1.12)",
  });
  assert.deepEqual(getSceneTransitionStyle(20, 90, zoom), {
    transform: "scale(1)",
  });
  assert.equal(getSceneTransitionStyle(20, 90, zoom).opacity ?? 1, 1);
});

test("project validation accepts scene transitions and rejects invalid or overlapping windows", async () => {
  const project = await readExample();
  project.scenes[1]!.transitionIn = {
    type: "fade",
    durationInFrames: 18,
    easing: "ease-out",
  };
  project.scenes[2]!.transitionIn = {
    type: "wipe-right",
    durationInFrames: 20,
    easing: { type: "bezier", x1: 0.4, y1: 0, x2: 0.2, y2: 1 },
  };
  assert.deepEqual(validateProjectDefinition(project), []);

  project.scenes[1]!.durationInFrames = 30;
  project.scenes[1]!.transitionIn = { type: "fade", durationInFrames: 16 };
  project.scenes[2]!.transitionIn = { type: "slide-left", durationInFrames: 16 };
  assert.ok(validateProjectDefinition(project).some((error) =>
    error.includes("incoming and outgoing transitions must leave at least one frame")
  ));

  project.scenes[1]!.transitionIn = { type: "teleport" as never, durationInFrames: 91 };
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("transitionIn.type must be cut, fade")));
  assert.ok(errors.some((error) => error.includes("transitionIn.durationInFrames must be an integer between 0 and 90")));
});


test("project subtitles use a global frame timeline and accept styled overlapping caption cues", async () => {
  const project = await readExample();
  project.subtitles = [
    {
      id: "caption-one",
      startInFrames: 70,
      durationInFrames: 60,
      text: "The first caption crosses a scene boundary.",
      speaker: "NARRATOR",
      position: "bottom",
      alignment: "center",
      fontSize: 34,
      fontWeight: 700,
      fontFamily: "Arial, sans-serif",
      color: "#FFFFFF",
      backgroundOpacity: 0.78,
      fadeInFrames: 6,
      fadeOutFrames: 8,
    },
    {
      id: "caption-two",
      startInFrames: 60,
      durationInFrames: 60,
      text: "Two speakers may overlap in time.",
      speaker: "HOST",
      position: "top",
      alignment: "left",
      color: "#8DEBFF",
    },
  ];
  assert.deepEqual(validateProjectDefinition(project), []);
});

test("subtitle validation rejects duplicate IDs, invalid text, styles and timeline windows", async () => {
  const project = await readExample();
  project.subtitles = [
    {
      id: "duplicate-caption",
      startInFrames: -1,
      durationInFrames: 400,
      text: "   ",
      position: "side" as never,
      alignment: "justify" as never,
      fontSize: 120,
      color: "red",
      backgroundOpacity: 1,
      fadeInFrames: 300,
      fadeOutFrames: 300,
      fontFamily: "url(javascript:alert(1))",
    },
    {
      id: "duplicate-caption",
      startInFrames: 0,
      durationInFrames: 1,
      text: "x".repeat(501),
    },
    {
      id: "late-caption",
      startInFrames: 280,
      durationInFrames: 50,
      text: "This cue extends beyond the end of the video.",
    },
  ] as unknown as SubtitleCue[];
  const errors = validateProjectDefinition(project);
  assert.ok(errors.some((error) => error.includes("id must be unique")));
  assert.ok(errors.some((error) => error.includes("startInFrames must be between")));
  assert.ok(errors.some((error) => error.includes("timeline window cannot extend beyond")));
  assert.ok(errors.some((error) => error.includes("text is required and must be at most 500 characters")));
  assert.ok(errors.some((error) => error.includes("position must be top, center, or bottom")));
  assert.ok(errors.some((error) => error.includes("alignment must be left, center, or right")));
  assert.ok(errors.some((error) => error.includes("fontSize must be between 18 and 96 pixels")));
  assert.ok(errors.some((error) => error.includes("color must be a six-digit hex color")));
  assert.ok(errors.some((error) => error.includes("backgroundOpacity must be between 0 and 0.95")));
  assert.ok(errors.some((error) => error.includes("fadeInFrames and fadeOutFrames must leave at least one fully visible frame")));
  assert.ok(errors.some((error) => error.includes("fontFamily contains unsupported characters")));
});

test("subtitle renderer overlays the full project timeline above scene transitions", async () => {
  const source = await readFile(new URL("../packages/video-engine/src/scenes/ProjectVideo.tsx", import.meta.url), "utf8");
  assert.ok(source.includes("subtitles.map((cue) =>"));
  assert.ok(source.includes("from={cue.startInFrames}"));
  assert.ok(source.includes("durationInFrames={cue.durationInFrames}"));
  assert.ok(source.includes("name={\"subtitle-\" + cue.id}"));
  assert.ok(source.includes("zIndex: 1000"));
  assert.ok(source.includes('position === "top" ? "11% 8% 0"'));
  assert.ok(source.includes('whiteSpace: "pre-line"'));
});
 
test("KINETIC visual showcase exercises global captions across all five scenes", async () => {
  const project = JSON.parse(
    await readFile(new URL("../projects/showcase-transitions/scene.json", import.meta.url), "utf8")
  ) as VideoProject;
  assert.deepEqual(validateProjectDefinition(project), []);
  assert.equal(project.subtitles?.length, 5);
  assert.ok(project.subtitles?.every((cue) => cue.speaker === "NARRATOR"));
  assert.ok(project.subtitles?.every((cue) => cue.startInFrames + cue.durationInFrames <= getProjectDurationInFrames(project)));
  const firstCutFrame = project.scenes[0]!.durationInFrames;
  assert.ok(project.subtitles?.some((cue) =>
    cue.startInFrames < firstCutFrame && cue.startInFrames + cue.durationInFrames > firstCutFrame
  ));
});

test("PULSE editorial showcase is a distinct five-scene, twenty-second motion benchmark", async () => {
  const project = JSON.parse(
    await readFile(new URL("../projects/showcase-pulse/scene.json", import.meta.url), "utf8")
  ) as VideoProject;
  assert.deepEqual(validateProjectDefinition(project), []);
  assert.equal(project.id, "pulse-editorial-film");
  assert.equal(project.scenes.length, 5);
  assert.equal(getProjectDurationInFrames(project), 600);
  assert.equal(project.subtitles?.length, 5);
  assert.ok(project.subtitles?.every((cue) => cue.position === "top" && cue.alignment === "left"));
  assert.ok(project.scenes.every((scene) => scene.title.includes("\n")));
  assert.equal(project.audioTracks?.length, 7);
  assert.equal(project.audioTracks?.filter((track) => track.role === "sfx").length, 6);
  assert.ok(project.scenes.every((scene) => (scene.graphics?.length ?? 0) >= 4));
  assert.ok(project.scenes.every((scene) => (scene.particleSystems?.length ?? 0) === 1));
  assert.ok(project.scenes.slice(1).every((scene) => scene.transitionIn !== undefined));
  assert.ok(project.scenes.some((scene) => scene.graphics?.some((graphic) => graphic.pathMorph !== undefined)));
  for (let index = 1; index < project.scenes.length; index += 1) {
    const boundary = project.scenes.slice(0, index).reduce((sum, scene) => sum + scene.durationInFrames, 0);
    assert.ok(project.subtitles?.some((cue) =>
      cue.startInFrames < boundary && cue.startInFrames + cue.durationInFrames > boundary
    ));
  }
});
