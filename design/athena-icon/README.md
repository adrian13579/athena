# Athena a* icon design

Open `index.html` to see the lowercase identity in black, white, and app icon treatments, alongside real interface sizes. The application uses this mark in its header and assistant avatars through `src/components/AthenaMark.tsx`, with the small-size favicon in `public/athena-favicon.svg`.

The selected direction is a bold, rounded lowercase **a*** with a raised six-ray asterisk. The a stands for Athena; the asterisk suggests further inquiry and discovery. The pairing also gives the identity a search/pathfinding association. The six-ray form retains a literal asterisk reading. The asterisk is separated from the letter so the two silhouettes remain clear.

## Assets

- `athena-mark.svg`: black mark on transparency, 64-unit canvas.
- `athena-mark-white.svg`: white mark on transparency, identical geometry.
- `athena-app-icon.svg`: white mark inside a black rounded square for web use.
- `athena-favicon.svg`: adjusted 32-unit composition with enlarged details for 16–24 px use.
- `concept-02-lowercase.svg`: lowercase source concept, matching the selected mark.

All lettering within the icon is outlined geometry, with no font or network dependency. SVGs can be scaled without raster blur. Use the bare mark at 32 px or larger; use the favicon below 32 px. Keep clear space of at least one asterisk radius around the visible mark. Use black on light backgrounds and white on dark backgrounds. Do not stretch, rotate, or add gradients. The rounded square is a web presentation asset; native app stores may require square artwork without baked-in corner masks.

The emphasis on a simple silhouette and recognition at small sizes is consistent with [Apple’s app icon guidance](https://developer.apple.com/design/human-interface-guidelines/app-icons).
