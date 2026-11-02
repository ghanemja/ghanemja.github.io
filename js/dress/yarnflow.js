// ─── dressing for the yarnflow room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
export default function dress(kit) {
  const { free } = kit;
  const rows = [];
  for (let z = -5.4; z <= 0.4; z += 0.2) { let s = ''; for (let x = -3.9; x <= 3.9; x += 0.2) s += free(x, z, 0.25) ? '.' : '#'; rows.push(z.toFixed(1).padStart(5) + ' ' + s); }
  (window.__free ??= {})['yarnflow'] = rows.join('\n');
}
