# Round 3 — actual frame inspection

## Three worst remaining aesthetic problems, ranked by impact
1. **Mountain silhouettes are still oversized and too uniform.** The high shot now keeps the train prominent, but the pale faceted peaks dominate much of the upper frame. Compared with the two available low-poly references, the scene could use more varied peak heights and clearer separation between near and distant ridge layers.
2. **Vehicle detail remains intentionally simplified.** The locomotive nose, cab and headlights are now readable, but the coach undercarriage and wheel assemblies are sparse; the train reads as a clean low-poly model rather than a highly detailed rail vehicle.
3. **Snowfall is subtle in the wider shots.** The animated flakes are present, but the sparse points become less noticeable in the high pull-back, reducing the sense of a heavy winter storm.

## Reference comparison
Compared with `reference/tiny-astronaut-01.png` and `reference/tiny-astronaut-02.png`, the render now achieves a similar stylized low-poly 3D direction, but the references have more varied mountain scales and more deliberate near/mid/far layering. The remaining concrete gap is environmental depth and silhouette variety, not photographic texture.

## Motion check
The 21 one-second samples show continuous train/camera movement through the side and rail-level shots. In the high shot, frames 420, 480 and 570 keep the train clearly visible as it moves; there are no three consecutive samples that read as a static hold.

## Technical issues
- `npm run check`: passed.
- 21 selected still frames and the contact sheet: rendered successfully.
- Track sleepers: instanced mesh implementation.
- No remaining render or TypeScript errors observed.
