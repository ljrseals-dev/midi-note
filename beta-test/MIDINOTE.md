# MidiNote

Browser-based General MIDI multi-track generator inside Juncture. No server, no Python, no build step.

| File | Role |
|---|---|
| `atrium/ui/midinote/midinote.js` | Engine: seeded RNG, song form, genre rosters, voice-led progressions, MIDI writer, `selfTest()` |
| `atrium/ui/midinote/index.html` | UI (needs `midinote.js` beside it; shows a clear message if it is missing) |
| `MidiNote.html` (build output) | The same UI with the engine inlined. Build: `python scripts/build_midinote_single.py MidiNote.html` |

## Status (what has and has not been checked)

Checked by automated tests (Node and headless Chromium on Linux): the file starts `MThd`, every track ends with End-of-Track,
the same seed gives identical bytes, the single-file build works from an empty folder, and the Save link downloads a file a
separate MIDI library can read. **Not checked:** Safari, Firefox, Windows or macOS, the desktop app window, a DAW import,
or how any of it sounds. Record your own result in an issue; do not copy a "verified on" line from anyone else.

## How to test

1. Open `MidiNote.html` in a desktop browser.
2. Press **Self-test**. Every line should say PASS and the last line `ALL CHECKS PASSED`.
3. Press **Generate All**, then click the **Save** link under the log. A `.mid` file downloads.
4. Open it in a DAW or an online MIDI player.

Console check: `typeof window.MidiNote` should be `"object"`, and `MidiNote.selfTest().pass` should be `true`.

## Known issues

- Browsers may block a download that is not started by a click, so the file is offered as a Save link instead.
- Songs under 8 bars have no intro, verse or outro; every instrument plays throughout.
- Genre rosters leave some instruments silent for a whole song (for example the Jazz roster never plays the Accordion).

## Reporting a problem

Send: browser and version, the steps you took, the first console error (word for word), the first 32 bytes of the file
if one was produced (`xxd -l 32 file.mid`), and the output of `MidiNote.selfTest()`.
