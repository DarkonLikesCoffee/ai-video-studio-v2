# Round 1 — rendered-frame review

Aesthetic problems (ranked by impact):
1. Train silhouette reads as a bus/coach, not a locomotive hauling a passenger consist. The front is too square, the carriage and cab share one body, and the wheels are too uniform.
2. Mountain ridges are repeated triangular zigzags with heavy pale outlines. They feel like a graphic chart rather than layered alpine terrain; insufficient atmospheric depth.
3. Train and title overlap the skyline; the middle scene feels flat and the window lights look like identical rectangular tiles.

Technical issues (separate):
- Initial still render failed because TransitionSeries timing was supplied as a plain object. Fixed by using linearTiming(); subsequent still rendering succeeded.
- Rendered PNGs show no black frames. SVG edges and gradients render; no obvious seams in the viewed frames.

Reference comparison: available repository references (Madrid trip and astronaut crystal cave) are not train/mountain matches. Comparing at least two shows stronger image-like material depth and focal hierarchy in the references; our first round is conspicuously flat/vector-like. Biggest gap: no real photographic texture or volumetric depth.

Fixes required for next round: use a distinct locomotive nose and separate passenger coaches, more natural asymmetrical ridge profiles with snow caps, and add atmospheric perspective/foreground silhouettes.
