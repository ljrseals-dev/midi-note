# MidiNote

> **⚠ STATUS: NOT CURRENTLY WORKING**
>
> The generator is not producing usable output at this time. Do not rely on
> this repo for new work until this banner is removed. This README documents
> what the tool is, what it was doing, and what state it is in now.

Browser-based General MIDI multi-track generator. Two files, no build step,
no server:

| File | Role |
|---|---|
| `index.html` | UI shell — genres, scales, pads, sliders, seed input |
| `midinote.js` | Engine — seeded RNG, role-based composition, SMF writer |

---

## Current state

**Broken.** The app loads but does not produce a working `.mid` file.

What I know at the time of writing:

- Clicking a pad or **Generate All** does not yield a playable file, or
- the file downloads but is rejected by the DAW, or
- the UI does not respond.

*(Replace the line above with the specific symptom you are seeing — which
button, which browser, what happens. That detail is what makes this section
useful to the next person.)*

Until the break is understood and fixed, treat the repo as **archived**.

---

## What it was supposed to do

For reference, so that fixing it is possible:

1. Read parameters from `index.html` via `getParams()` — scale, bars, tempo,
   vibrato, volume peak, portamento, pitch bend, density, humanize, seed,
   complexity, muted tracks, active experimental modes.
2. Call `MidiNote.generate(opts)` in `midinote.js`.
3. `generate()` builds a chord progression, then for each of the 10 tracks
   draws from its own seeded random stream (`streamSeed(seed, idx)`), applies
   a role (chords / melody / arp / pad / stabs / riff / swell / drums), and
   writes note, CC, program-change and pitch-bend events into an SMF track.
4. `writeSMF(tracks)` serialises to `MThd` + `MTrk` bytes at PPQ 480.
5. `offerFile(res, label)` in `index.html` wraps the bytes in a `Blob`,
   creates an object URL, and triggers a native `<a download>`.
   In an embedded context it also posts `midinote:midi` to the parent frame.

That pipeline is the contract. If any step fails, no file comes out.

---

## Known-issue checklist

Work through these in order before assuming the engine itself is broken.
The most common failure modes are listed first.

- [ ] **Browser** — which browser and version? Open the console (F12) and
      copy the first red error into the issue.
- [ ] **File loaded** — confirm `midinote.js` is actually loading. In the
      console, `window.MidiNote` should be defined. If it is `undefined`,
      the `<script src="midinote.js">` tag is wrong or the file is missing.
- [ ] **Fonts / CSS** — cosmetic only; ignore for now.
- [ ] **Params** — in the console, run `getParams()` if exposed, or inspect
      the sliders. A NaN in tempo or bars will silently produce an empty
      file.
- [ ] **Seed** — try `seed = 1`. If a specific seed produces an empty file
      and others do not, that is an engine bug, not a UI bug.
- [ ] **Download** — does the browser's download indicator appear at all?
      If yes, the bytes were produced and the problem is downstream (file
      content or DAW import). If no, the UI never reached `offerFile`.
- [ ] **File content** — open the downloaded `.mid` in a hex viewer. First
      four bytes must be `4D 54 68 64` ("MThd"). If not, the serializer is
      broken. If yes, the file is a valid SMF container and the problem is
      likely note/track content.
- [ ] **DAW import** — try a minimal player such as onlinesequencer.net or
      signal.vercel.app. If a browser player opens the file but a DAW does
      not, the file is malformed in a way the DAW is stricter about (most
      often: missing End-of-Track, wrong chunk length, or bad VLQ delta).

---

## How to report

Open an issue with:

1. Browser name and version.
2. Exact steps taken.
3. The first console error (verbatim).
4. A hex dump of the first 32 bytes of the downloaded file, if one was
   produced:
   `xxd -l 32 yourfile.mid`
5. Whether `window.MidiNote` is defined in the console.

Those five things will make the failure reproducible. Without them the
report is "it doesn't work," which cannot be acted on.

---

## What is not the problem

To save time for anyone debugging this:

- **Not the fonts.** Space Mono and VT323 are cosmetic.
- **Not the CRT overlay.** It is a `pointer-events: none` pseudo-element.
- **Not the seed.** A fixed seed either works or it does not; if you change
  the seed and the symptom changes, that is data, not a workaround.
- **Not a missing server.** The design is two static files. There is no
  backend to start.

If someone claims one of the above is the cause, ask for a hex dump of the
produced file. That settles it.

---

## If it is fixed

When the generator produces a file that imports cleanly into a DAW again:

1. Remove the status banner at the top of this README.
2. Add a one-line "Verified on: browser / version / date" note.
3. Close the open issues with the commit hash that fixed them.

Until then, leave the banner up. A README that says "working" when it is
not costs more trust than one that says "broken."

---

## License

MIT — see `LICENSE`.
