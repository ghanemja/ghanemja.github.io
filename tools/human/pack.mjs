// Packs the baked human data (models/human/*.json) into .pack files the browser loads instead:
// the same numbers, losslessly, about half the download.
//
//   node tools/human/pack.mjs            # after bake.mjs; writes models/human/makehuman.pack and ages.pack
//
// The JSON stores every array as base64 text, which gzip can barely shrink. Here each array is
// laid out so gzip finds the patterns: triangle and vertex indices as differences (small numbers),
// the shape deltas split per axis and zig-zag coded (small signed numbers), and every multi-byte
// value split into byte planes (all the low bytes, then all the high bytes). The file is
//   gzip( u32 header length | header JSON | arrays )
// where the header is the original JSON with each array replaced by { $: [codec, offset, count] }.
// js/anatomy.js (unpack) reverses it exactly.
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dir = new URL('../../models/human/', import.meta.url);
const b64 = (s) => Buffer.from(s, 'base64');
const planes = (bytes, width) => {                                    // [v0b0 v0b1 …] → [all b0][all b1]…
  const n = bytes.length / width, out = Buffer.alloc(bytes.length);
  for (let i = 0; i < n; i++) for (let p = 0; p < width; p++) out[p * n + i] = bytes[i * width + p];
  return out;
};
const CODECS = {
  f32p: (buf) => [planes(buf, 4), buf.length / 4],
  u8: (buf) => [buf, buf.length],
  u16d: (buf) => {                                                    // differences, mod 2^16
    const v = new Uint16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)), d = new Uint16Array(v.length);
    for (let i = 0; i < v.length; i++) d[i] = (v[i] - (i ? v[i - 1] : 0)) & 0xffff;
    return [planes(Buffer.from(d.buffer), 2), v.length];
  },
  i16z3: (buf) => {                                                   // xyz deltas: per axis, zig-zag
    const v = new Int16Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length)), m = v.length / 3, z = new Uint16Array(v.length);
    for (let ax = 0; ax < 3; ax++) for (let j = 0; j < m; j++) { const x = v[j * 3 + ax]; z[ax * m + j] = ((x << 1) ^ (x >> 31)) & 0xffff; }
    const out = [];
    for (let ax = 0; ax < 3; ax++) out.push(planes(Buffer.from(z.buffer, ax * m * 2, m * 2), 2));
    return [Buffer.concat(out), v.length];
  },
};

function pack(name) {
  const J = JSON.parse(readFileSync(new URL(`${name}.json`, dir), 'utf8')), parts = [];
  let off = 0;
  const put = (s, codec) => { const [bytes, count] = CODECS[codec](b64(s)); parts.push(bytes); const ref = { $: [codec, off, count] }; off += bytes.length; return ref; };
  if (J.pos) J.pos = put(J.pos, 'f32p');
  if (J.tris) for (const k of Object.keys(J.tris)) J.tris[k] = put(J.tris[k], 'u16d');
  for (const k of ['skinI', 'skinW']) if (J[k]) J[k] = put(J[k], 'u8');
  for (const t of Object.values(J.targets)) { t.idx = put(t.idx, 'u16d'); t.d = put(t.d, 'i16z3'); }
  const head = Buffer.from(JSON.stringify(J)), len = Buffer.alloc(4); len.writeUInt32LE(head.length);
  const gz = gzipSync(Buffer.concat([len, head, ...parts]), { level: 9 });
  writeFileSync(new URL(`${name}.pack`, dir), gz);
  console.log(`models/human/${name}.pack: ${(gz.length / 1e6).toFixed(2)} MB`);
}
pack('makehuman'); pack('ages');
