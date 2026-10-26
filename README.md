# ghanemja.github.io — Janelle's Main Street

A portfolio you can walk around: a tiny hand-drawn town where **every shop is a
real app**. Walk up to a door, press `E`, and the room inside is full of
artifacts from that project — plus a counter that opens the live site.

Built on the gouache-and-ink engine from [The Vanishing Gallery](https://art-heist.netlify.app)
(cel-banded toon fills, paper grain, boiling grease-pencil outlines), re-laid on
flat ground. three.js via importmap, no build step.

- `index.html` + `js/` — the town. Bump the cache token `js/main.js?cb=NN` after editing `js/`.
- `classic.html` — the plain card-grid version, linked from the title screen.
- `js/apps.js` — one entry per shop: title, blurbs, URL, screenshot. Add an app here,
  give it a storefront in `js/town.js` (`FRONTS`) and a room in `js/interiors.js` (`SETS`).
- `screenshots/` — the framed shots hung inside each room.

**Controls:** WASD walk · Shift run · E enter/interact · drag to look · scroll to zoom · H hides the UI.
On touch: left half of the screen walks, right half looks, tap the prompts.

Run locally with any static server: `python3 -m http.server` → http://localhost:8000
