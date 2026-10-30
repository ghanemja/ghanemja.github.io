// ─── THE APPS: one shop each ────────────────────────────────────────────────
// Everything the town knows about a project: how its shop looks outside,
// what its room says inside, and where "open the real thing" goes.
export const APPS = [
  {
    id: 'behaviors', title: 'Behavior Search', trade: 'The Proving Ground',
    url: 'https://ghanemja.github.io/behaviors/', repo: 'https://github.com/ghanemja/behaviors',
    shot: 'screenshots/behaviors.png',
    desc: 'Search NVIDIA SimReady 3D objects by how they move, not how they look. All 2,166 rigid assets got the same pokes in a physics simulator: pushed low, pushed high, tilted on a ramp, dropped.',
    how: 'Search ranks objects by how they reacted: rollout statistics or a self-supervised JEPA embedding. Tested on probes no model saw, in MuJoCo and in NVIDIA PhysX.',
    note: '106,757 simulated probe runs, every number regenerated from scratch on a CPU. No GPUs used.',
  },
  {
    id: 'qr', title: 'QR Compass', trade: 'The Map Room',
    url: 'https://ghanemja.github.io/qr/', repo: 'https://github.com/ghanemja/qr',
    shot: 'screenshots/qr-compass.png',
    desc: "America's biggest companies on a 3D map, each one drawn as its own little model, and every model turns into that company's scannable QR code.",
    how: 'Seven regions on a tiled slab; hover one and its models wake up, click it and it breaks off into a moving world. Tap a model and it breaks into pixels that land on its QR code.',
    note: 'The 2019 Fortune 500 plus hand-picked startups. Paste any link and the model becomes a QR code for it.',
  },
  {
    id: 'yarnflow', title: 'YarnFlow', trade: 'Pattern Haberdashery',
    url: 'https://ghanemja.github.io/crochet/', repo: 'https://github.com/ghanemja/crochet',
    shot: 'screenshots/crochet.png',
    desc: 'A crochet studio: watch a pattern get made stitch by stitch in 3D, learn the stitches, and share what you make.',
    how: 'Pick a pattern — a scarf swatch, a coaster, an amigurumi ball — and it plays row by row as yarn you can spin around, with the stitch list alongside.',
    note: 'Studio, Learn stitches, Community, Publish my make.',
  },
  {
    id: 'deckgpt', title: 'DeckGPT', trade: 'Picture Palace',
    url: 'https://pptgpt.netlify.app', repo: 'https://pptgpt.netlify.app',
    shot: 'screenshots/pptgpt.png',
    desc: 'Builds a presentation with you, step by step: what you are sharing, the story, the visuals, then the deck.',
    how: 'A four-stage pipeline — Scope, Story, Visuals, Deck. Scope questions come from your organization’s profile, and the visuals follow your house style.',
    note: 'Start from a prompt, a brief, or existing material, and export the finished deck.',
  },
  {
    id: 'splatform', title: 'Splatform', trade: 'Paint & Supplies',
    url: 'https://ghanemja.github.io/art-asset/', repo: 'https://github.com/ghanemja/art-asset',
    shot: 'screenshots/splatform.png',
    desc: 'Components, painted. A UI library where every button, card and input is made of a real art medium: watercolor, acrylic, charcoal, torn paper or marker.',
    how: 'Pure CSS/JS: each medium fakes real pigment — bleeding washes, impasto ridges, gritty charcoal, washi tape.',
    note: 'One attribute paints your whole site. Light or dark, MIT, no build step.',
  },
  {
    id: 'borrowed-eyes', title: 'Borrowed Eyes', trade: 'Optics & Menagerie',
    url: 'https://ghanemja.github.io/borrowed_eyes/', repo: 'https://github.com/ghanemja/borrowed_eyes',
    shot: 'screenshots/borrowed-eyes.jpg', clip: 'clips/borrowed-eyes.mp4',
    desc: 'A browser game about how other animals see. Photograph 14 hidden animals and borrow their eyes.',
    how: 'One HTML file, three.js, zero asset files: terrain, animals and all are generated in code. Each frame renders color + UV + heat passes blended per animal.',
    note: 'Bee ultraviolet, snake heat pits, bat echolocation, owl night eyes — approximated from published research.',
  },
  {
    id: 'gallery', title: 'The Vanishing Gallery', trade: 'An Art Heist',
    url: 'https://art-heist.netlify.app', repo: 'https://art-heist.netlify.app',
    shot: 'screenshots/vanishing-gallery.webp', clip: 'clips/vanishing-gallery.mp4',
    desc: 'A hand-drawn detective game on a tiny planet. A painting is gone; question the suspects, drive the streets, name the thief.',
    how: 'three.js with a gouache-and-ink look: cel shading, paper grain, boiling grease-pencil outlines. This very town borrows its engine.',
    note: 'The stolen paintings are Janelle’s real ones. This street is drawn with the same pen.',
  },
];

// the library at the end of the street — every repo is a book
export const LIBRARY = {
  id: 'library', title: 'Public Library', trade: 'All the Repos',
  url: 'https://github.com/ghanemja', repo: 'https://github.com/ghanemja',
  desc: 'The stacks: every repository on the shelf, color-coded by what it is.',
  how: 'The live card catalogue lives at github.com/ghanemja.',
  note: 'Some books are private previews — ask the librarian.',
};

export const PLACES = [...APPS, LIBRARY];
