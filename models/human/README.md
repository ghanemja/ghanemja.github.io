# models/human

`makehuman.json` is baked by `node tools/human/bake.mjs` from the
[MakeHuman](https://github.com/makehumancommunity/makehuman) base human, pinned to a
specific commit: the base mesh (hm08), the default rig and its skin weights, the
young-adult macro targets (sex, ancestry, muscle, weight, height, proportions) and a few
facial expression units.

`ages.json` (same bake) holds the baby, child and old targets for children and older
people (averaged over the three ancestries, plus the universal muscle and weight
targets at each age). `js/anatomy.js` loads it only when someone outside young adulthood
is built.

MakeHuman's assets are released under **CC0 1.0** (see their LICENSE.ASSETS.md), and we
thank the MakeHuman team for them.

Loaded by `js/anatomy.js`; people are made with `makePerson` in `js/people.js`, always clothed.
