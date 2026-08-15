// Structural checks for the JSFX. EEL2 has no compiler here and treats unknown
// identifiers as 0, so a typo is silent — these catch the shapes of that bug.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const lines = src.split('\n');
let bad = 0;
const fail = (m) => { console.log('  FAIL ' + m); bad++; };

// 1. balanced parens / brackets, ignoring strings and comments
let depth = 0, sq = 0, ln = 0, inBlock = false;
lines.forEach((raw, i) => {
  let l = raw;
  if (inBlock) { const e = l.indexOf('*/'); if (e < 0) return; l = l.slice(e + 2); inBlock = false; }
  l = l.replace(/\/\/.*$/, '');
  let out = '', j = 0, str = false;
  while (j < l.length) {
    const c = l[j];
    if (str) { if (c === '"') str = false; j++; continue; }
    if (c === '"') { str = true; j++; continue; }
    if (c === '/' && l[j + 1] === '*') { const e = l.indexOf('*/', j + 2); if (e < 0) { inBlock = true; break; } j = e + 2; continue; }
    out += c; j++;
  }
  for (const c of out) {
    if (c === '(') depth++;
    else if (c === ')') { depth--; if (depth < 0) fail(`line ${i + 1}: unbalanced ")"`); }
    else if (c === '[') sq++;
    else if (c === ']') sq--;
  }
  ln = i + 1;
});
if (depth !== 0) fail(`parens end at depth ${depth} (expected 0)`);
if (sq !== 0) fail(`brackets end at ${sq} (expected 0)`);

// strip comments + strings once, so the heuristics below see code only
function codeOnly(t) {
  let o = '', i = 0, str = false;
  while (i < t.length) {
    const c = t[i];
    if (str) { if (c === '"') str = false; i++; continue; }
    if (c === '"') { str = true; i++; continue; }
    if (c === '/' && t[i + 1] === '/') { const e = t.indexOf('\n', i); i = e < 0 ? t.length : e; continue; }
    if (c === '/' && t[i + 1] === '*') { const e = t.indexOf('*/', i + 2); i = e < 0 ? t.length : e + 2; continue; }
    o += c; i++;
  }
  return o;
}
let code = codeOnly(src.slice(src.indexOf('@init')));
// @section markers, and #name string variables, are not identifiers
code = code.replace(/^@[a-z]+.*$/gm, '').replace(/#[A-Za-z_][A-Za-z_0-9]*/g, '');

// 2. memory bases that collide inside the serialized block
const bases = new Map();
for (const m of code.matchAll(/^\s*([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(\d+)\s*;/gm)) {
  const n = m[1].toLowerCase(), v = +m[2];
  if (v >= 256 && v < 70000 && !bases.has(n)) bases.set(n, v);
}
const byOff = {};
for (const [n, v] of bases) (byOff[v] = byOff[v] || []).push(n);
let overlap = 0;
for (const v of Object.keys(byOff)) if (byOff[v].length > 1) {
  console.log(`  note memory base ${v} shared by: ${byOff[v].join(', ')}`); overlap++;
}
if (!overlap) console.log('  ok   no two memory bases share an offset');

// 3. identifiers read but never assigned anywhere — in EEL2 these silently
//    evaluate to 0, which is exactly how a typo hides
const assigned = new Set(['this']);
for (const m of code.matchAll(/\b([A-Za-z_][A-Za-z_0-9]*)\s*(?:=[^=]|\+=|-=|\*=|\/=|\|=|&=)/g))
  assigned.add(m[1].toLowerCase());
for (const m of code.matchAll(/function\s+([A-Za-z_][A-Za-z_0-9]*)\s*\(([^)]*)\)/g)) {
  assigned.add(m[1].toLowerCase());
  m[2].split(',').forEach(a2 => { const t = a2.trim().toLowerCase(); if (t) assigned.add(t); });
}
for (const m of code.matchAll(/\blocal\s*\(([^)]*)\)/g))
  m[1].split(',').forEach(a2 => { const t = a2.trim().toLowerCase(); if (t) assigned.add(t); });
// midirecv / file_riff write through their arguments
for (const m of code.matchAll(/\b(?:midirecv|file_riff)\s*\(([^)]*)\)/g))
  m[1].split(',').forEach(a2 => { const t = a2.trim().toLowerCase(); if (/^[a-z_]/.test(t)) assigned.add(t); });
const BUILTIN = new Set(['while','loop','function','local','instance','global','globals','this',
  'srate','num_ch','tempo','play_state','beat_position','play_position','ts_num','ts_denom',
  'samplesblock','spl0','spl1','trigger','ext_noinit','ext_nodenorm','pdc_delay','pdc_bot_ch','pdc_top_ch',
  'gfx_r','gfx_g','gfx_b','gfx_a','gfx_x','gfx_y','gfx_w','gfx_h','gfx_mode','gfx_clear','gfx_texth',
  'gfx_dest','mouse_x','mouse_y','mouse_cap','mouse_wheel','min','max','abs','sqrt','sin','cos','tan',
  'asin','acos','atan','atan2','exp','log','log10','pow','floor','ceil','sign','sqr','invsqrt','rand',
  'sleep','time','time_precise','memset','memcpy','freembuf','stack_push','stack_pop','stack_peek',
  'strcpy','strcat','strcmp','strlen','sprintf','match','matchi','printf','midirecv','midisend',
  'midisend_buf','midisyx','file_open','file_close','file_avail','file_mem','file_var','file_riff',
  'file_text','file_string','file_rewind','fft','ifft','convolve_c','spl','slider','export_buffer_to_project']);
const unassigned = new Set();
for (const m of code.matchAll(/\b([a-z_][a-z_0-9]{2,})\b/gi)) {
  const k = m[1].toLowerCase();
  if (BUILTIN.has(k) || assigned.has(k)) continue;
  if (/^(gfx_|slider|str|spl|file_|midi)/.test(k)) continue;
  unassigned.add(k);
}
console.log('  identifiers read but never assigned: ' + unassigned.size);
[...unassigned].slice(0, 30).forEach(k => console.log('     ' + k));
if (unassigned.size) bad++;
console.log(bad ? 'LINT FAIL' : 'LINT OK');
process.exit(bad ? 1 : 0);
