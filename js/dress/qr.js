export default function dress(kit) {
  const { free, place, K } = kit;
  let s = '';
  for (let z = -5.45; z <= 0.4; z += 0.2) { for (let x = -3.95; x <= 3.95; x += 0.1) s += free(x, z, 0.05) ? '.' : '#'; s += ' ' + z.toFixed(2) + '\n'; }
  (window.__fm ||= {})[place.id] = s + JSON.stringify(K.minis.map(m => [m.x, m.z, m.label])) + JSON.stringify(K.cols);
}
