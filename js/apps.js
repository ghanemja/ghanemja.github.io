// ─── THE APPS: one shop each ────────────────────────────────────────────────
// Everything the town knows about a project: how its shop looks outside,
// what its room says inside, and where "open the real thing" goes.
export const APPS = [
  {
    id: 'charterscope', title: 'CharterScope', trade: 'Clause Intelligence',
    url: 'https://ghanemja.github.io/charterscope/', repo: 'https://github.com/ghanemja/charterscope',
    shot: 'screenshots/charterscope.png',
    desc: 'Charter-party analysis — upload a maritime shipping contract and it flags the unusual clauses before you sign.',
    how: 'NLP extracts every clause, then scores each one against market-baseline embeddings tuned on a maritime corpus.',
    note: 'The moat: domain-specific clause embeddings. Next: multi-language, redline suggestions.',
  },
  {
    id: 'inbox-zero', title: 'Inbox Zero', trade: 'The Mailroom',
    url: 'https://ghanemja.github.io/inbox-zero-board/', repo: 'https://github.com/ghanemja/inbox-zero-board',
    shot: 'screenshots/inbox-zero-board.png',
    desc: 'Email triage as a kanban board — drag messages between todo / waiting / done instead of scroll-and-archive.',
    how: 'Pulls from the email API, renders every thread as a draggable card, and syncs status back.',
    note: 'Visual triage replaces the linear inbox ritual. Next: LLM auto-categorization, shared team boards.',
  },
  {
    id: 'yarnflow', title: 'YarnFlow', trade: 'Pattern Haberdashery',
    url: 'https://ghanemja.github.io/crochet/', repo: 'https://github.com/ghanemja/crochet',
    shot: 'screenshots/crochet.png',
    desc: 'A niche social app for crochet — share patterns, reply in threads, fork and remix other people’s stitches.',
    how: 'Users post patterns; others spin off variants, queue projects, and track their own work.',
    note: 'Hobby-specific UX beats generic forums. Next: per-niche hobbymaxxing — knitting, brewing, DJing…',
  },
  {
    id: 'deckgpt', title: 'DeckGPT', trade: 'Picture Palace',
    url: 'https://pptgpt.netlify.app', repo: 'https://pptgpt.netlify.app',
    shot: 'screenshots/pptgpt.png',
    desc: 'Prompt-to-PowerPoint — type an idea, get branded slides that still look like YOUR template.',
    how: 'Prompt → LLM outline → a template-aware styler renders the deck with your logo, fonts and layout intact.',
    note: 'Most AI deck tools lose the brand; this one keeps it. Next: 3blue1brown-style math visuals.',
  },
  {
    id: 'splatform', title: 'Splatform', trade: 'Paint & Supplies',
    url: 'https://github.com/ghanemja/art-asset', repo: 'https://github.com/ghanemja/art-asset',
    shot: 'screenshots/splatform.png',
    desc: 'A UI component library where the components are made of art — buttons and cards painted in watercolor, acrylic, charcoal, torn paper or marker.',
    how: 'Pure CSS/JS: each medium fakes real pigment — bleeding washes, impasto ridges, gritty charcoal, washi tape.',
    note: '"Splat your site." Eight components, five media, light and dark themes each.',
  },
  {
    id: 'borrowed-eyes', title: 'Borrowed Eyes', trade: 'Optics & Menagerie',
    url: 'https://github.com/ghanemja/borrowed_eyes', repo: 'https://github.com/ghanemja/borrowed_eyes',
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
