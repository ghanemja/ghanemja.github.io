// ─── FLAT WORLD SHIM ────────────────────────────────────────────────────────
// The art-heist engine builds on a radius-40 planet; this town is a flat
// street, so the two surface helpers buildings.js imports become no-ops.
// (placeOnPlanet/batchPlaced are never called here — buildings are set down
// with plain position/rotation.)
export function settle() {}
export const radiusAt = () => 0;
