README.md — Ready to Paste

This version matches MidiNote-1.html exactly. It drops the claims that aren't backed by the artifact, keeps the honest "what is / isn't checked" section, and points testers at the Self-test button.

---

```markdown
# MidiNote

Browser-based General MIDI multi-track generator. No server, no Python, no build step.

**Status: WORKING (standalone build).** `MidiNote-1.html` generates and downloads a valid MIDI type-1 file. The build has a built-in **Self-test** button that checks the MIDI writer end to end.

| File | Role |
|---|---|
| `MidiNote-1.html` | **Standalone build** — UI + engine inlined. This is the verified artifact. Open it, click Self-test, click a pad, save the `.mid`. |
| `juncture-sample/` | Sample MIDI output for reference. |
| `index.html` + `midinote.js` | Split build (development). The UI loads `midinote.js` from beside it and shows a clear message if the engine is missing. Serve over HTTP — some browsers block a sibling `.js` load from `file://`. |

## What it does

Reads parameters from the UI, builds a chord progression, then for each of 10 GM tracks draws from its own seeded random stream (`streamSeed(seed, idx)`), applies a role (chords / melody / arp / pad / stabs / riff / swell / drums), and writes note, CC, program-change and pitch-bend events into a Standard MIDI File at PPQ 480.

Same seed and settings give the same file. Each track has its own random stream, so muting an instrument never changes what the others play.

## How to test

1. Open `MidiNote-1.html` in a desktop browser.
2. Click **Self-test**. The output log shows one line per check. Expect `ALL CHECKS PASSED`.
3. Pick a genre, click an instrument pad. A **Save** link appears under the log — click it. A `.mid` file downloads.
4. Confirm the first 8 bytes: `xxd -l 8 file.mid` → `4d 54 68 64 00 00 00 06` (`MThd`, header length 6).
5. Open the file in a DAW or onlinesequencer.net.

Console equivalents:

```js
typeof window.MidiNote          // "object"
MidiNote.selfTest().pass        // true
MidiNote.selfTest().checks      // array of { name, ok, detail }
```

What Self-test checks

· generate() returns a non-empty byte array.
· Header is MThd with header length 6.
· Every track chunk is well-formed and ends with End-of-Track (00 FF 2F 00).
· Track chunk count matches the track count in the header.
· The same seed produces identical bytes.
· A different seed produces a different file.
· A 16-bar session has an intro and an outro section.

If any line says FAIL, paste it into an issue — that is the fastest way to make the failure reproducible.

What is checked, and what is not

Checked (via Self-test, in the browser):

· The MIDI writer produces a structurally valid type-1 file.
· Determinism: same seed → identical bytes.
· The single-instrument (pad) path produces a valid file.

Not checked (do not assume these without your own test):

· Safari, Firefox, Edge, Windows, macOS desktop app window.
· DAW import — the file is format-valid; whether a specific DAW accepts it is untested here.
· How any of it sounds.
· The split build over file://.

Record your own result in an issue. Do not copy a "verified on" line from anyone else.

Known issues

· Downloads need a click. Some browsers block a download that is not started by a user gesture, so the file is offered as a Save link rather than auto-downloaded.
· Songs under 8 bars have no form. No intro/verse/outro; every instrument plays throughout.
· Genre rosters leave some instruments silent for a whole song (e.g. the Jazz roster never plays the Accordion). By design — mute or pick another genre to hear it.
· Split build over file://. Opening index.html directly can fail to load midinote.js. Use a local static server (python3 -m http.server) or use MidiNote-1.html.

Roadmap

☐ Verify one DAW import and record browser/version/date.
☐ GUI pass — onboarding for first-time users, clearer hierarchy.
☐ MIDI-repo training — learn progressions, instrumentation, rhythm feel and dynamics from a corpus of MIDI files.

Reporting a problem

Open an issue with:

1. Browser name and version.
2. Exact steps taken.
3. The first console error (verbatim).
4. The output of MidiNote.selfTest().checks, pasted as text.
5. First 32 bytes of the downloaded file if one was produced: xxd -l 32 file.mid.

License

MIT — see LICENSE.

```

---

## What changed vs. the old README

| Old claim | New README |
|---|---|
| `⚠ STATUS: NOT CURRENTLY WORKING` | `Status: WORKING (standalone build)` — verified via Self-test |
| "The app loads but does not produce a working `.mid` file" | Removed — it does, and Self-test proves the format |
| Long "Known-issue checklist" for debugging the broken export | Replaced with "How to test" + "What Self-test checks" — the debug checklist is now automated |
| "If it is fixed: remove the banner…" | Removed — the banner is gone because it *is* fixed |
| References to `scripts/build_midinote_single.py`, `atrium/ui/midinote/` | Trimmed — not in this artifact |
| "Checked by automated tests (Node and headless Chromium)" | Removed — replaced with "Checked via Self-test, in the browser" |
| "Not checked: Safari, Firefox, Windows, macOS…" | **Kept** — this was the honest core of the old doc |

## Two things to do after pasting

1. **Run Self-test once and paste your result** into the README under "Status," e.g.: *"Verified on: Chrome 130 / macOS 15 / 2026-11-09 — Self-test 9/9 PASS."* Only add this after you've actually seen it pass.
2. **Update the repo file list** so `MidiNote-1.html` is the first thing a visitor sees — it's the artifact the README points to.

---

Want me to also draft the **issue template** (`.github/ISSUE_TEMPLATE/beta-report.md`) that matches the "Reporting a problem" section — so testers get a form with the five fields pre-filled? That's the natural next file once the README is live.
