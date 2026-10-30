// ─── EXPORT PACK: the roster as a .zip a game engine can open ────────────────
// citizens.zip = citizens.json (the editable roster) + models/<name>.glb (one rigged,
// dressed, skinned person each, in the relaxed rest pose) + portraits/<name>.png.
// The GLBs carry plain PBR materials: the town's gouache/ink shaders are a look of this
// site, not something glTF can hold, so ink outlines are left out and each part keeps its
// colour (skin and the face use vertex colours). Each mesh's `extras.role` says what it is
// (skin / cloth / hair / eye / brow / shoe / sole).
import * as THREE from 'three';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };

// minimal "stored" (uncompressed) zip: GLB and PNG are already dense, so deflate would buy little
export function zip(files) {
  const enc = new TextEncoder(), now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const n = enc.encode(name), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, n.length, true); lh.setUint16(28, 0, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, n.length, true);
    ch.setUint32(42, offset, true);
    parts.push(new Uint8Array(lh.buffer), n, data); central.push(new Uint8Array(ch.buffer), n);
    offset += 30 + n.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

// a person made for export: ink outlines out, toon/shader materials → plain PBR with the same colour
function forExport(person) {
  const drop = [];
  person.group.traverse((o) => {
    if (!o.isMesh) return;
    const role = o.userData.role;                                      // (the rest of userData is rebuild recipes: not for a game)
    o.userData = role ? { role } : {}; o.geometry.userData = {}; o.name = role ?? o.name;
    if (o.geometry.attributes._hairdir) o.geometry.deleteAttribute('_hairdir');
    if (o.material.isShaderMaterial) { drop.push(o); return; }
    const m = o.material;
    o.material = new THREE.MeshStandardMaterial({
      color: m.color.clone(), vertexColors: m.vertexColors, map: m.map, side: m.side,
      transparent: m.transparent, opacity: m.opacity, roughness: 0.85, metalness: 0,
    });
  });
  for (const o of drop) o.parent?.remove(o);
  return person.group;
}

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'citizen';

export async function exportPack({ roster, render, makePerson, spec, toJSON, onProgress = () => {} }) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter(), used = new Set(), files = [];
  for (let i = 0; i < roster.length; i++) {
    const c = roster[i];
    onProgress(i, roster.length);
    let base = slug(c.name), n = 2;
    while (used.has(base)) base = slug(c.name) + '-' + n++;
    used.add(base);
    const person = await makePerson({ ...spec(c), render });
    const glb = await exporter.parseAsync(forExport(person), { binary: true });
    files.push({ name: `models/${base}.glb`, data: new Uint8Array(glb) });
    if (c.portrait) files.push({ name: `portraits/${base}.png`, data: new Uint8Array(await (await fetch(c.portrait)).arrayBuffer()) });
    await new Promise(r => setTimeout(r, 0));                          // let the page breathe
  }
  files.unshift({ name: 'citizens.json', data: new TextEncoder().encode(toJSON(roster, render)) });
  return zip(files);
}
