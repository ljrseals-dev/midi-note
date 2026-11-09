/* SPDX-License-Identifier: MIT
 * Copyright (c) Lewis James Seals Jr. MidiNote lineage: see docs/NEURALMIDI_LICENSING.md */
/* MidiNote generator. Writes real Standard MIDI Files in the browser: no server, no Python.
 *
 * Same seed and settings give the same file. Each track draws from its own random stream, so
 * muting an instrument never changes what the others play.
 *
 * Browser:  <script src="midinote.js"></script>  ->  window.MidiNote
 * Node:     const MidiNote = require('./midinote.js')
 */
(function (root) {
  'use strict';

  var PPQ = 480, BAR = PPQ * 4, STEP16 = PPQ / 4, STEP8 = PPQ / 2;

  var SCALES = {
    'C Major (Ionian)':       { notes: [60,62,64,65,67,69,71,72,74,76,77,79,81,82,84], mode: 'major' },
    'C Phrygian':             { notes: [60,61,63,65,67,68,70,72,73,75,77,79,80,82,84], mode: 'phry' },
    'C Dorian':               { notes: [60,62,63,65,67,69,70,72,74,75,77,79,81,82,84], mode: 'dor' },
    'C Mixolydian':           { notes: [60,62,64,65,67,69,70,72,74,76,77,79,81,82,84], mode: 'mix' },
    'C Lydian':               { notes: [60,62,64,66,67,69,71,72,74,76,78,79,81,83,84], mode: 'lyd' },
    'C Aeolian (Minor)':      { notes: [60,62,63,65,67,68,70,72,74,75,77,79,80,82,84], mode: 'minor' },
    'C Hirajoshi (Japanese)': { notes: [60,62,63,67,68,72,74,75,79,80,84], mode: 'pent' },
    'C Chinese Pentatonic':   { notes: [60,62,64,67,69,72,74,76,79,81,84], mode: 'pent' },
    'C Hungarian Gypsy':      { notes: [60,62,63,66,67,68,71,72,74,75,78,79,80,83,84], mode: 'gypsy' },
    'C Whole Tone':           { notes: [60,62,64,66,68,70,72,74,76,78,80,82,84], mode: 'sym' },
    'C Diminished':           { notes: [60,62,63,65,66,68,69,71,72,74,75,77,78,80,81,83,84], mode: 'sym' },
    'C Blues':                { notes: [60,63,65,66,67,70,72,75,77,78,79,82,84], mode: 'blues' }
  };

  var GM_INSTRUMENTS = [
    { name: 'Grand Piano',   pc: 0,  ch: 1, role: 'chords',  portBase: 40 },
    { name: 'Bright Piano',  pc: 1,  ch: 2, role: 'melody',  portBase: 40 },
    { name: 'Elec Grand',    pc: 2,  ch: 3, role: 'arp',     portBase: 40 },
    { name: 'Harpsichord',   pc: 6,  ch: 4, role: 'arp',     portBase: 35 },
    { name: 'Hammond Organ', pc: 16, ch: 5, role: 'pad',     portBase: 45 },
    { name: 'Accordion',     pc: 21, ch: 6, role: 'stabs',   portBase: 55 },
    { name: 'Nylon Guitar',  pc: 24, ch: 7, role: 'arp',     portBase: 55 },
    { name: 'Overdrive Gtr', pc: 29, ch: 8, role: 'riff',    portBase: 55 },
    { name: 'Strings',       pc: 48, ch: 9, role: 'swell',   portBase: 40 }
  ];

  // swing: how far the off-beat eighth is pushed toward a triplet feel (0 straight, 0.33 full)
  var GENRE_FEEL = {
    Ambient: 0, Jazz: 0.33, Cinematic: 0, 'Lo-fi': 0.2, World: 0, Electronic: 0,
    Classical: 0, Folk: 0.1, Experimental: 0
  };
  var GENRE_FEATURED = {
    Ambient: [0, 2, 8], Jazz: [0, 3, 4, 8], Cinematic: [8, 0, 4], 'Lo-fi': [0, 6, 8], World: [6, 3, 8],
    Electronic: [4, 2, 1], Classical: [0, 8, 3], Folk: [6, 0, 8], Experimental: [1, 2, 7]
  };

  var EXP_MODES = ['Polyrhythm', 'Microtonality', 'Glitch', 'Retrograde', 'Spectral', 'Stochastic'];
  var PROGRESSIONS = [[0, 2, 4, 6], [0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 0, 4]];

  function rng(seed) {                                    // mulberry32
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function streamSeed(seed, k) { return (Math.imul(seed >>> 0, 2654435761) ^ Math.imul(k + 1, 40503)) >>> 0; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function bendUnits(semitones) { return clamp(8192 + Math.round(semitones * 8192 / 12), 0, 16383); }

  // ---------------------------------------------------------------- SMF writer
  function vlq(n) {
    var out = [n & 127]; n >>>= 7;
    while (n) { out.push(128 | (n & 127)); n >>>= 7; }
    return out.reverse();
  }
  function utf8(s) { return Array.prototype.slice.call(new TextEncoder().encode(s)); }
  function meta(kind, data) { return [0xFF, kind].concat(vlq(data.length), data); }
  var ORDER = { name: 0, tempo: 0, timesig: 0, text: 0, pc: 1, cc: 2, bend: 3, off: 4, on: 5 };

  function encodeEvent(e) {
    switch (e.k) {
      case 'on':   return [0x90 | e.c, e.a & 127, clamp(Math.round(e.b), 1, 127)];
      case 'off':  return [0x80 | e.c, e.a & 127, 0];
      case 'cc':   return [0xB0 | e.c, e.a & 127, clamp(Math.round(e.b), 0, 127)];
      case 'pc':   return [0xC0 | e.c, e.a & 127];
      case 'bend': var v = clamp(Math.round(e.a), 0, 16383); return [0xE0 | e.c, v & 127, v >> 7];
      case 'tempo': return meta(0x51, [(e.a >> 16) & 255, (e.a >> 8) & 255, e.a & 255]);
      case 'timesig': return meta(0x58, [e.a, e.b, 24, 8]);
      case 'text': return meta(0x01, utf8(e.a));
      case 'name': return meta(0x03, utf8(e.a));
    }
    throw new Error('unknown event ' + e.k);
  }
  function trackChunk(events) {
    var evs = events.slice().sort(function (x, y) { return x.t - y.t || ORDER[x.k] - ORDER[y.k]; });
    var body = [], cur = 0;
    evs.forEach(function (e) {
      body = body.concat(vlq(Math.max(0, e.t - cur)), encodeEvent(e)); cur = e.t;
    });
    body = body.concat([0], meta(0x2F, []));
    var n = body.length;
    return [0x4D, 0x54, 0x72, 0x6B, n >>> 24, (n >> 16) & 255, (n >> 8) & 255, n & 255].concat(body);
  }
  function writeSMF(tracks) {
    var n = tracks.length, fmt = n === 1 ? 0 : 1;
    var bytes = [0x4D, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, fmt, (n >> 8) & 255, n & 255, (PPQ >> 8) & 255, PPQ & 255];
    tracks.forEach(function (t) { bytes = bytes.concat(trackChunk(t)); });
    return new Uint8Array(bytes);
  }

  // ---------------------------------------------------------------- composition
  function chordFor(bar, p, prog, sc) {
    var deg = prog[bar % 4], n = sc.notes, idx = [deg, deg + 2, deg + 4];
    if (p.complexity >= 2 && deg + 6 < n.length) idx.push(deg + 6);
    return idx.map(function (i) { return n[Math.min(i, n.length - 1)]; });
  }

  function generate(opts) {
    var p = Object.assign({
      scale: 'C Major (Ionian)', genre: null, tempo: 120, bars: 16, vibrato: 50, volPeak: 0.65, port: 40,
      pbend: 0, density: 4, humanize: 30, complexity: 1, muted: [], exp: [], seed: 1, only: null
    }, opts || {});
    var sc = SCALES[p.scale];
    if (!sc) throw new Error('unknown scale: ' + p.scale);
    p.bars = clamp(Math.round(p.bars), 1, 128);
    p.tempo = clamp(Math.round(p.tempo), 30, 240);
    p.seed = (p.seed >>> 0) || 1;
    var exp = {}; (p.exp || []).forEach(function (m) { exp[m] = true; });
    var muted = {}; (p.muted || []).forEach(function (i) { muted[i] = true; });
    var swing = GENRE_FEEL[p.genre] || 0;
    var featured = {}; (GENRE_FEATURED[p.genre] || []).forEach(function (i) { featured[i] = true; });
    var hasFeatured = (GENRE_FEATURED[p.genre] || []).length > 0;
    var tickPerMs = PPQ * p.tempo / 60000;
    var jitterTicks = p.humanize / 100 * 18 * tickPerMs;
    var velJitter = p.humanize / 100 * 12;
    var GAP = Math.ceil(2 * jitterTicks) + 10;   // keeps neighbouring notes of one pitch from overlapping

    var prog = PROGRESSIONS[Math.floor(rng(streamSeed(p.seed, 99))() * PROGRESSIONS.length)];
    var chords = []; for (var b = 0; b < p.bars; b++) chords.push(chordFor(b, p, prog, sc));

    var list = GM_INSTRUMENTS.map(function (g, i) { return { inst: g, idx: i }; })
      .concat([{ inst: { name: 'Drums', pc: null, ch: 10, role: 'drums', portBase: 0 }, idx: 9 }]);
    var tracks = [], info = [];

    list.forEach(function (it) {
      if (muted[it.idx]) return;
      if (p.only && p.only.indexOf(it.idx) < 0) return;
      var R = rng(streamSeed(p.seed, it.idx)), ch = it.inst.ch - 1, ev = [], count = 0;
      var baseVel = it.idx === 9 ? 88 : 74 - (hasFeatured && !featured[it.idx] ? 14 : 0);
      baseVel = clamp(baseVel * (0.65 + 0.5 * p.volPeak), 20, 120);

      function jit() { return (R() * 2 - 1) * jitterTicks; }
      function vel(v) { return clamp(v + (R() * 2 - 1) * velJitter, 1, 127); }
      function note(pitch, t, dur, v, force) {
        pitch = clamp(Math.round(pitch), 0, 127);
        if (!force) {
          if (exp.Stochastic && R() > 0.55 + 0.4 * (p.density / 8)) return;
          if (exp.Glitch && R() < 0.12) return;
        }
        if (t % PPQ === STEP8) t += swing * STEP8;                 // swing the off-beat eighth
        t = Math.max(0, Math.round(t + jit()));
        dur = Math.max(20, Math.round(dur));
        if (exp.Microtonality) ev.push({ t: Math.max(0, t - 1), k: 'bend', a: bendUnits(p.pbend + (R() * 0.5 - 0.25)), c: ch });
        var stutter = exp.Glitch && R() < 0.06 && dur > 4 * GAP;   // repeat the note once at half length
        var first = stutter ? Math.round(dur / 2) - 5 : dur;
        ev.push({ t: t, k: 'on', a: pitch, b: vel(v), c: ch });
        ev.push({ t: t + first, k: 'off', a: pitch, b: 0, c: ch });
        count++;
        if (exp.Spectral && it.inst.role !== 'drums') {
          if (pitch + 12 < 128) { ev.push({ t: t, k: 'on', a: pitch + 12, b: vel(v * 0.35), c: ch }); ev.push({ t: t + dur, k: 'off', a: pitch + 12, b: 0, c: ch }); }
          if (pitch + 19 < 128) { ev.push({ t: t, k: 'on', a: pitch + 19, b: vel(v * 0.25), c: ch }); ev.push({ t: t + dur, k: 'off', a: pitch + 19, b: 0, c: ch }); }
        }
        if (stutter) {
          ev.push({ t: t + Math.round(dur / 2), k: 'on', a: pitch, b: vel(v * 0.8), c: ch });
          ev.push({ t: t + dur, k: 'off', a: pitch, b: 0, c: ch });
        }
      }

      // controller setup (bend range 12 semitones via RPN so the Pitch bend slider means semitones)
      var setup = [[101, 0], [100, 0], [6, 12], [38, 0], [101, 127], [100, 127],
        [7, Math.round(60 + p.volPeak * 50)], [11, 65], [1, p.vibrato]];
      if (it.idx !== 9) {
        var port = clamp(Math.round(it.inst.portBase * (p.complexity >= 2 ? 1.4 : 1) * (p.port / 40)), 0, 127);
        setup.push([5, port], [65, p.port > 0 ? 127 : 0]);
      }
      setup.forEach(function (s) { ev.push({ t: 0, k: 'cc', a: s[0], b: s[1], c: ch }); });
      if (it.inst.pc !== null) ev.push({ t: 0, k: 'pc', a: it.inst.pc, c: ch });
      if (p.pbend !== 0 && it.idx !== 9 && !exp.Microtonality) ev.push({ t: 0, k: 'bend', a: bendUnits(p.pbend), c: ch });

      var n = sc.notes, role = it.inst.role, bar, prevIdx = Math.floor(n.length / 2);
      var groupNotes = [], lastGroup = null;
      for (bar = 0; bar < p.bars; bar++) {
        var t0 = bar * BAR, ch4 = chords[bar];
        if (role === 'drums') {
          var hat = p.density >= 5 ? STEP16 : STEP8;
          for (var h = 0; h < BAR; h += hat) note(42, t0 + h, 30, (h % PPQ ? 60 : 80), false);
          [0, 2].forEach(function (bt) { note(36, t0 + bt * PPQ, 90, 104, true); });
          [1, 3].forEach(function (bt) { note(38, t0 + bt * PPQ, 90, 98, true); });
          if (p.density >= 4 && R() < 0.35) note(36, t0 + 3 * PPQ + STEP8, 90, 90, false);
          if (p.complexity >= 1 && bar % 4 === 0) note(49, t0, PPQ * 2, 96, true);
          if (p.complexity >= 1 && bar % 4 === 3) for (var f = 0; f < 4; f++) note(38, t0 + 3 * PPQ + f * STEP16, 60, 70 + f * 8, true);
        } else if (role === 'chords') {
          var hits = p.density >= 5 ? [0, 1, 2, 3] : p.density >= 3 ? [0, 2] : [0];
          var space = BAR / hits.length;
          hits.forEach(function (bt) { ch4.forEach(function (c, k) { note(c - 12, t0 + bt * PPQ + k * 6, space - GAP - 20, baseVel, false); }); });
        } else if (role === 'pad' || role === 'swell') {
          ch4.forEach(function (c) { note(c - 12, t0, BAR - GAP, baseVel * 0.8, false); });
          if (role === 'swell') for (var s = 0; s < 4; s++) {
            var peak = Math.round(50 + 70 * p.volPeak), ph = (s + 1) / 4;
            ev.push({ t: t0 + s * PPQ, k: 'cc', a: 11, b: Math.round(40 + (peak - 40) * (bar % 2 ? 1 - ph + 0.25 : ph)), c: ch });
          }
        } else if (role === 'stabs') {
          [1, 3].forEach(function (bt) { ch4.forEach(function (c) { note(c, t0 + bt * PPQ + STEP8, STEP8 - GAP, baseVel, false); }); });
        } else if (role === 'riff') {
          var rstep = exp.Polyrhythm ? STEP16 * 3 : STEP8;
          for (var r = 0, k = 0; r < BAR; r += rstep, k++) note(ch4[(k % 2) * 2 % ch4.length] - 24, t0 + r, rstep - GAP, baseVel + (k % 2 ? 0 : 8), false);
        } else if (role === 'arp') {
          var k3 = [3, 4, 5][it.idx % 3];
          var astep = exp.Polyrhythm ? STEP16 * k3 : (p.density >= 6 ? STEP16 : STEP8);
          var order = ch4.concat(ch4.slice(1, -1).reverse());
          for (var a = 0, q = 0; a < BAR; a += astep, q++) note(order[q % order.length] + (it.idx === 3 ? 12 : 0), t0 + a, astep - GAP, baseVel, false);
        } else if (role === 'melody') {
          var bn = [];
          var grid = STEP16, pOn = clamp(0.1 + 0.8 * p.density / 8, 0.15, 0.95);
          var cursor = 0;
          for (var g = 0; g < 16; g++) {
            var tt = g * grid;
            if (tt < cursor) continue;
            var strong = g % 4 === 0;
            if (!(g === 0 || R() < (strong ? pOn + 0.15 : pOn * 0.7))) continue;
            var move = Math.floor(R() * 5) - 2;
            prevIdx = clamp(prevIdx + move, 3, n.length - 1);
            if (g === 0) {                                              // land the bar on a chord tone
              var best = prevIdx, bd = 99;
              for (var i2 = 3; i2 < n.length; i2++) if (ch4.some(function (c) { return (c - n[i2]) % 12 === 0; }) && Math.abs(i2 - prevIdx) < bd) { bd = Math.abs(i2 - prevIdx); best = i2; }
              prevIdx = best;
            }
            var len = grid * (1 + Math.floor(R() * (p.density <= 3 ? 4 : 2)));
            len = Math.min(len, BAR - tt);
            bn.push({ t: tt, d: len - GAP, p: n[prevIdx], v: baseVel + (strong ? 10 : 0) });
            cursor = tt + len;
          }
          bn.forEach(function (x) { groupNotes.push({ t: x.t + (bar % 4) * BAR, d: x.d, p: x.p, v: x.v }); });
          if (bar % 4 === 3 || bar === p.bars - 1) {                    // end of a 4-bar group
            var base = bar - (bar % 4), out = groupNotes;
            if (exp.Retrograde && lastGroup && (base / 4) % 2 === 1) {  // odd groups answer with the previous one backwards
              var span = 4 * BAR;
              out = lastGroup.map(function (x) { return { t: span - (x.t + x.d + GAP), d: x.d, p: x.p, v: x.v }; })
                .sort(function (u, w) { return u.t - w.t; });
            }
            out.forEach(function (x) { note(x.p, base * BAR + x.t, x.d, x.v, false); });
            lastGroup = groupNotes; groupNotes = [];
          }
        }
      }
      tracks.push({ name: it.inst.name, ch: it.inst.ch, ev: ev, notes: count });
    });

    if (!tracks.length) throw new Error('every track is muted: unmute at least one instrument');
    var head = tracks[0].ev;
    head.push({ t: 0, k: 'tempo', a: Math.round(60000000 / p.tempo), c: 0 });
    head.push({ t: 0, k: 'timesig', a: 4, b: 2, c: 0 });
    head.push({ t: 0, k: 'text', a: 'MidiNote | seed=' + p.seed + ' | ' + p.scale + ' | ' + (p.genre || 'no genre') +
      ' | ' + p.tempo + ' BPM | ' + p.bars + ' bars', c: 0 });
    tracks.forEach(function (t) {
      t.ev.push({ t: 0, k: 'name', a: t.name, c: 0 });
      t.ev.push({ t: p.bars * BAR, k: 'cc', a: 123, b: 0, c: t.ch - 1 });   // all notes off, closes the bar count
    });
    var bytes = writeSMF(tracks.map(function (t) { return t.ev; }));
    var total = tracks.reduce(function (s, t) { return s + t.notes; }, 0);
    return {
      bytes: bytes, seed: p.seed, tempo: p.tempo, bars: p.bars, notes: total,
      seconds: Math.round(p.bars * 4 * 60 / p.tempo * 10) / 10,
      tracks: tracks.map(function (t) { return { name: t.name, channel: t.ch, notes: t.notes }; })
    };
  }

  var api = { PPQ: PPQ, SCALES: SCALES, GM_INSTRUMENTS: GM_INSTRUMENTS, EXP_MODES: EXP_MODES,
    GENRE_FEEL: GENRE_FEEL, GENRE_FEATURED: GENRE_FEATURED, generate: generate, writeSMF: writeSMF };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MidiNote = api;
})(typeof window !== 'undefined' ? window : globalThis);
