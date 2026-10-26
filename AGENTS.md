# Rules for agents working in this repo

- **Work on `main` and push to `main`** unless Janelle says otherwise or there is
  a compelling reason not to (e.g. a risky/experimental change she should review
  before it goes live). This repo is served directly by GitHub Pages from `main`,
  so work parked on a side branch is invisible — a "finished" change isn't
  finished until it's on `main` and live at https://ghanemja.github.io.
  If a harness assigns you a session branch, still merge your work into `main`
  (fast-forward is fine) before calling the task done.
- Bump the cache token `js/main.js?cb=NN` in `index.html` whenever you edit `js/`.
- The 3D town is the main site (`index.html` + `js/`); `classic.html` is the
  plain card grid. `README.md` explains how to add a new shop/app.
