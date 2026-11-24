# Shot-to-code implementation audit

- **00–04s — storm-headland:** `StoryFrame(shot=0)`; extreme-wide vector coastline, lighthouse on right, robot approaches from left, animated sea and diagonal rain.
- **04–08s — door-and-machine:** `DoorClose`; low close-up begins moving immediately: wind rocks the door, the robot braces, shifts its weight and reaches toward the iron handle as the heavy door swings open with warm interior spill.
- **08–12s — climb-and-discover:** `StairShot`; top-down spiral well with individual descending wedge treads and robot ascending through the center.
- **12–16s — repair-macro:** `RepairShot`; close mechanical coupling and gear teeth, separated brass pieces align, pin slides into place, cog turns and small sparks appear while robot's pincer reaches in.
- **16–20s — beacon-ignition:** `LensShot`; centered faceted Fresnel lens rotates and brightens from dark to warm amber, robot watches from side and a beam begins.
- **20–24s — coast-relief:** `FinalShot`; wide storm coast, lighthouse beam sweeps across water and reveals a small vessel turning toward safe harbor.

The renderer is GPU-independent SVG/Remotion, with interpolated transforms and per-frame shapes. The SVG design studies are reviewed separately before the animation and the final composition animates authored vector components, rather than using static slideshow cards. There are no text overlays, captions, logos or voice-over.


## Asset implementation note

The standalone SVG files are design references, not files imported by `LighthouseRepairFilm.tsx`. The final composition recreates the selected visual grammar as inline SVG groups and paths and animates those vectors procedurally. The score and atmosphere WAV files are loaded at runtime. Do not interpret the local asset-evidence report's `ready` status as proof of SVG runtime imports or semantic asset use.
