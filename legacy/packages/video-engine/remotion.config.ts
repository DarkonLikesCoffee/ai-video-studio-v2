import { Config } from "@remotion/cli/config";

// Three.js clipping planes and WebGL geometry require ANGLE in headless Chrome.
Config.setChromiumOpenGlRenderer("angle");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
