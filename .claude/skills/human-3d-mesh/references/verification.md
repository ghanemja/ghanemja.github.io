# Verifying a character

Every broken character before this skill existed passed the check its author ran. The
cat was only seen from behind; the hair gap was only seen from one side; the moonwalk
only showed when the foot was tracked. Check like the next reviewer will.

## The turntable sheet

```bash
node tools/turntable.mjs <who> /tmp/tt      # who: player | vivi | otto | pia | rex | critic
# → /tmp/tt/<who>-sheet.png (22 labelled tiles) + one PNG per tile
```

`tools/turntable.html` renders the figure alone under the town's own lights, so nothing
blocks it. The sheet has front, back, both sides, both three-quarters, high ¾, low;
head front / side / back / top; tight hand close-ups (outside, front, the other hand,
from below); feet side / ¾; and four walk phases.
Open the sheet with the Read tool and look at every tile. Single views by URL:
`tools/turntable.html?who=pia&yaw=90&focus=head&walk=0.25` (yaw 0 = facing camera,
`pitch` in degrees, `focus` = full | head | hands | feet | handL | handR, `t` = idle
seconds). The right hand (`handR`) is on +x, so `yaw=90` sees its outside, `yaw=-90` the
left hand's.
For a new kind of figure (an animal, a prop-holding pose), add a `who` branch to the page.
A non-zero exit means the page logged errors — fix those first.

## What to look for, tile by tile
- **Silhouette (side tiles):** one connected outline. No stub limbs, floating straps, gaps
  between masses, pin legs. Head traces forehead → nose → lip → chin → jaw; nose breaks
  the line; neck joins behind the jaw.
- **Top and back of the head:** hair closed at the crown, no bowl rim, no horns, no bald
  patch or scalp under the hat brim, hat sitting over the hair, no flat cuts.
- **All four compass sides of anything open or asymmetric** (hair shell, hood, partial
  lathe, side parting): a gap that looks right from one side may be rotated wrong.
- **Hands:** separate fingers, relaxed curl, thumb, skin starting at the cuff, nothing
  inside the torso, no wrist twist.
- **Feet:** soles on the ground (no sinking, no floating), S-profile upper, sized to the
  trousers.
- **Colour:** skin one tone (no hair-coloured chin), no black back faces, no inside-of-face
  showing, sleeves the sleeve colour to the cuff. When unsure, read the exact pixel value.
- **Walk tiles:** knee bent on the leg swinging forward, planted foot static or moving
  back, arms counter-swinging, cloth not dragged by the arms.

## Measure, don't eyeball
When a fix is about a quantity, print the number before and after: foot height vs floor,
how far a hem flares mid-swing, planted-foot direction across a cycle, head width/height
ratio, triangle count (`renderer.info.render.triangles`). Commit messages in this repo
quote these numbers; it's how a regression gets noticed.

## Then in context
After the sheet, check the figure in the town at game distance (the orbit camera is
slightly above, so collars and hat brims hide chins and faces), next to the player for
scale, and in any room or vehicle it sits in. A wide shot containing the figure is the
last check, never the only one.

## Before pushing
- Every figure the change touched has a clean sheet — not a sample.
- Bump `js/main.js?cb=NN` in `index.html` when `js/` changed.
- Merge to `main` and push; GitHub Pages serves `main`. Confirm at https://ghanemja.github.io.
