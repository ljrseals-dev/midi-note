# MidiNote

> **⚠ STATUS: NOT CURRENTLY WORKING**
>
> The generator is not producing usable output at this time. Do not rely on
> this repo for new work until this banner is removed.

Browser-based General MIDI multi-track generator. Two files, no build step, no server:

| File | Role |
|---|---|
| `index.html` | UI shell — genres, scales, pads, sliders, seed input, **Self-test** button |
| `midinote.js` | Engine — seeded RNG, role-based composition, SMF writer |

Open `index.html` in any modern browser. Click **Self-test**, then click a pad or **Generate All** to download a `.mid`.

---

## Current state

**Broken.** The app loads but does not reliably produce a working `.mid` file.

Symptoms reported so far:

- *[fill in: e.g. "Generate All downloads a file but Ableton rejects it"]*
- *[fill in: e.g. "Self-test returns FAIL on track 3"]*
- *[fill in: e.g. "no download appears at all"]*

The **Self-test** button is there to help narrow this down. Its job is to tell you whether the failure is in MidiNote's export path or somewhere downstream — that is the whole point of the feature, and if it isn't answering that question clearly, that itself is a bug worth an issue.

---

## Self-test + known-good file

The **Self-test** button runs a deterministic check inside the browser:
same seed, same settings, every time. It reports **PASS** or **FAIL** and,
on FAIL, prints the first step that broke.

A tiny known-good MIDI file is included as `test/known_good.mid`. It is a
few bars of a fixed chord progression on one GM channel, generated once
from the engine while it was working, and committed to the repo. Its job
is to be the control in a two-part experiment:

| Self-test result | known_good.mid in the same DAW | What it means |
|---|---|---|
| **PASS** | **Opens** | Export path is fine, DAW import is fine — the issue is specific to the file you generated. Report the seed and settings. |
| **PASS** | **Rejected** | Export is fine; your DAW is stricter than the player used in the self-test. Try onlinesequencer.net or signal.vercel.app first, then open an issue with the DAW name and version. |
| **FAIL** | **Opens** | Export path is broken; your DAW is not the problem. The self-test output should name the failing step. |
| **FAIL** | **Rejected** | Unlikely both are broken at once — check that both files were downloaded completely (byte count should match the size shown in the UI) before drawing conclusions. |

That matrix is the reason the file exists: it lets a tester rule out their
own DAW in one step, instead of spending an afternoon chasing a problem
that isn't in MidiNote.

If `test/known_good.mid` is itself broken (because it was generated before
a bug was introduced), regenerate it from a passing commit and note the
commit hash in `test/README.md`.

---

## What it is supposed to do

The contract, so fixing is possible:

1. **Read params.** `getParams()` in `index.html` collects scale, bars,
   tempo, vibrato, volume peak, portamento, pitch bend, density, humanize,
   seed, complexity, muted tracks, and experimental modes.
2. **Call the engine.** `MidiNote.generate(opts)` in `midinote.js`.
3. **Compose.** For each of the 10 tracks, `generate()` draws from its own
   seeded random stream (`streamSeed(seed, idx)`), applies a role
   (chords / melody / arp / pad / stabs / riff / swell / drums), and writes
   note, CC, program-change and pitch-bend events into an SMF track.
4. **Serialise.** `writeSMF(tracks)` emits `MThd` + `MTrk` at PPQ 480.
5. **Download.** `offerFile(res, label)` wraps the bytes in a `Blob`,
   creates an object URL, and triggers a native `<a download>`. When
   embedded, it also posts `midinote:midi` to the parent frame.

Any break in that chain means no file, or a file a DAW rejects.

---

## Debugging checklist

In order, before assuming the engine is broken:

- [ ] **Browser.** Which browser and version? Open the console (F12), copy
      the first red error.
- [ ] **Engine loaded.** `window.MidiNote` should be defined. If
      `undefined`, the `<script src="midinote.js">` tag is wrong or the
      file is missing.
- [ ] **Self-test.** PASS or FAIL? If FAIL, note the step it names.
- [ ] **Known-good file.** Open `test/known_good.mid` in the same DAW.
      Compare with the matrix above.
- [ ] **Seed.** Try `seed = 1`. If a specific seed fails and others don't,
      that's an engine bug, not a UI bug.
- [ ] **Download.** Does the browser's download indicator appear? If yes,
      bytes were produced — the problem is downstream. If no, the UI never
      reached `offerFile()`.
- [ ] **File bytes.** `xxd -l 32 yourfile.mid` — the first four bytes must
      be `4D 54 68 64` ("MThd"). If not, the serializer is broken. If yes,
      the container is valid and the issue is content.
- [ ] **Third-party player.** Try onlinesequencer.net or signal.vercel.app.
      A DAW that rejects a file a browser player opens is usually stricter
      about one specific thing: missing End-of-Track, wrong `MTrk` chunk
      length, or a malformed VLQ delta.

---

## Reporting an issue

Include:

1. Browser name and version.
2. Self-test result (PASS or FAIL, and the failing step if FAIL).
3. Whether `test/known_good.mid` opens in your DAW.
4. The first console error, verbatim.
5. `xxd -l 32` of the file that failed.
6. Seed and settings used.

That combination makes the failure reproducible. Without them the report
is "it doesn't work," which cannot be acted on.

---

## What is *not* the problem

- **Fonts.** Space Mono and VT323 are cosmetic.
- **The CRT overlay.** `pointer-events: none`.
- **The seed.** Changing it either fixes or doesn't fix the symptom;
  either way the result is data, not a workaround.
- **A missing server.** Two static files. There is no backend to start.

If someone claims one of the above is the cause, ask for a hex dump of the
produced file. That settles it.

---

## When it is fixed

1. Remove the status banner at the top.
2. Regenerate `test/known_good.mid` from the fixed commit; note the hash in
   `test/README.md`.
3. Add "Verified on: browser / version / date".
4. Close open issues with the commit hash that fixed them.

Leave the banner up until then. A README that says "working" when it isn't
costs more trust than one that says "broken."

---

## License

MIT — see `LICENSE`.
