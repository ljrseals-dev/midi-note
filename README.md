# MidiNote

> **STATUS: WORKING (standalone build)**
> Verified on: Chrome 130 / macOS 15 / 2026-11-09
> The standalone `MidiNote.html` (engine inlined) generates and downloads valid MIDI type-1 files.
> The split `index.html` + `midinote.js` build is still under verification — see "Known issues" below.

Browser-based General MIDI multi-track generator. No build step, no server, no backend.

File | Role
---|---
`MidiNote.html` | **Standalone build** — UI + engine inlined in one file. This is the verified-working artifact.
`index.html` | UI shell (split build) — genres, scales, pads, sliders, seed input
`midinote.js` | Engine (split build) — seeded RNG, role-based composition, SMF writer

---

## Current state

**Working.** The standalone `MidiNote.html` produces a playable `.mid` file that imports cleanly into a DAW.

Verified pipeline:
1. Read parameters from the UI (`getParams()`).
2. Call `MidiNote.generate(opts)` — builds chord progression, then for each of the 10 tracks draws from its own seeded random stream (`streamSeed(seed, idx)`), applies a role, writes note/CC/PC/bend events.
3. `writeSMF(tracks)` serializes to `MThd` + `MTrk` at PPQ 480.
4. `offerFile(res)` wraps bytes in a `Blob`, creates an object URL, triggers `<a download>`.

---

## Known issues

- **Split build (`index.html` + `midinote.js`)**: opening via `file://` can block the `<script src>` in some browsers, leaving `window.MidiNote` undefined. Use a local static server (`python3 -m http.server`) or use the standalone `MidiNote.html`.
- **Auto-download timing**: `generateAll()` fires the download ~1s after the click, which some browsers (Safari, Firefox) treat as outside the user-gesture window and block. The "Save" link still appears in the UI — click it manually if the auto-download is blocked.
- **CSS `transition: --acc`**: custom properties don't animate this way in most browsers. Cosmetic only.

---

## How to test

1. Open `MidiNote.html` directly in a desktop browser.
2. Console: `window.MidiNote` should be an object.
3. Pick a genre → click a pad. A file `MidiNote_<Instrument>_..._seed1.mid` should download.
4. `xxd -l 8 yourfile.mid` → must start `4d 54 68 64 00 00 00 06`.
5. Import into a DAW or onlinesequencer.net.

If all five pass, the build is working.

---

## Roadmap

- [ ] Verify split `index.html` + `midinote.js` build over HTTP.
- [ ] Move auto-download into the click handler (fix gesture-window issue).
- [ ] GUI pass — clearer hierarchy, onboarding for first-time users.
- [ ] MIDI-repo training — learn style/progression/instrumentation from a corpus of MIDI files.

---

## How to report

Open an issue with:
1. Browser name and version.
2. Exact steps taken.
3. The first console error (verbatim).
4. First 32 bytes of the downloaded file (`xxd -l 32 yourfile.mid`), if produced.
5. Whether `window.MidiNote` is defined in the console.

---

## License

MIT — see `LICENSE`.
