// one module per room fills it with things: furniture, clutter, wall pieces, hanging bits,
// little animations and things to tap. Each gets the kit from dressKit() in ../interiors.js.
// Each room loads on its own: one that fails to load is just left plain, never the whole town.
const IDS = ['behaviors', 'qr', 'yarnflow', 'hookpath', 'deckgpt', 'splatform', 'borrowed-eyes', 'gallery', 'doodle-libs', 'zen', 'citizens', 'library'];
export const DRESS = {};
export const dressReady = Promise.allSettled(IDS.map(id =>
  import(`./${id}.js?v=${Math.floor(Date.now() / 600000)}`)        // fresh every 10 min, like the Pages cache
    .then(m => { DRESS[id] = m.default; })
    .catch(e => console.warn(`room ${id} left plain:`, e))));
