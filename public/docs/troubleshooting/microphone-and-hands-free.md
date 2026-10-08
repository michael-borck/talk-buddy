# Microphone & Hands-free Problems

Fixes for the most common microphone, transcription, and hands-free turn-taking
issues, organised by platform. If you're not sure what's wrong, run
**Settings → Diagnostics → Run diagnostics** first — it checks your microphone,
speech servers, and hands-free runtime, and gives you a report you can paste
into a bug report.

## Microphone permission

Talk Buddy can only hear you after the operating system grants microphone access.

### macOS

- **Symptom**: no waveform movement, or transcription returns empty text.
- Open **System Settings → Privacy & Security → Microphone** and make sure
  Talk Buddy is enabled.
- After changing the setting, quit and reopen Talk Buddy — permission changes
  don't apply to a running app.
- If Talk Buddy isn't listed, start a conversation once; macOS will prompt.

### Windows

- **Symptom**: transcription is empty, or the mic works in other apps but not
  Talk Buddy.
- Open **Settings → Privacy & security → Microphone**:
  1. Turn on **Microphone access**.
  2. Turn on **Let apps access your microphone**.
  3. Scroll to the desktop-app list and allow Talk Buddy.
- Check the correct device is set as the **default recording device**:
  right-click the speaker icon in the taskbar → **Sound settings** →
  **Input**.

### Linux

- **Symptom**: no input devices listed, or silence.
- Make sure your user is in the `audio` group: `groups | grep audio`.
- PipeWire systems: check `wpctl status` and make sure the Talk Buddy source
  isn't muted (`wpctl set-mute @DEFAULT_SOURCE@ 0`).
- PulseAudio systems: open **pavucontrol → Input Devices** and confirm the
  correct mic is the fallback (green tick).

## Bluetooth headsets

Using a Bluetooth headset's microphone can temporarily lower playback quality
or volume, because Bluetooth switches to the bidirectional (lower-quality
hands-free) profile while the mic is active. This happens on every platform —
it's a Bluetooth limitation, not a Talk Buddy bug.

**Workaround**: keep your headphones as the *output* device and pick your
computer's built-in or an external USB microphone as the *input* in Talk
Buddy.

## Hands-free mode ends my turn too early (or never)

In hands-free mode, Talk Buddy listens for actual speech using a small neural
voice-activity detector (Silero VAD) that runs entirely on your computer. It
distinguishes speech from breathing, keyboard noise, and background chatter.
When it detects you've finished speaking, it hands the turn to the AI.

- **Turns end mid-sentence**: background noise pauses can be misread as
  silence. Speak a little more continuously, or hold the spacebar — in
  hands-free mode space also works as a manual "keep talking" trigger, and
  pressing it ends the turn explicitly.
- **The AI never responds**: if no speech is detected within about 8 seconds,
  the capture is discarded quietly and the app waits again. Check that your
  input device is the one you're speaking into (Settings → Diagnostics lists
  every microphone the OS reports).
- **Noisy environments**: dorm rooms and shared spaces are fine for VAD, but a
  loud fan or music can still confuse it. Push-to-talk mode (Settings →
  Conversation, or the mode toggle on the conversation page) sidesteps
  detection entirely — you decide when the turn starts and ends.

### "VAD runtime missing" in Diagnostics

Hands-free needs two small files shipped inside the app: the Silero VAD model
(`models/silero_vad_v4.onnx`) and its inference runtime (`ort/`). If
Diagnostics reports either missing:

- You're probably running from a source checkout without `public/ort/` — run
  `npm install` again (it copies the runtime via the postinstall step).
- If the files exist but the error persists, hands-free automatically falls
  back to simple loudness detection, so everything still works — it's just
  less robust against background noise.

## Wrong words in the transcript

If the recognizer consistently misspells a product name, jargon, or someone's
name, add it to the scenario's **Vocabulary hints** (edit the scenario →
AI Configuration → Vocabulary Hints). Comma- or newline-separated terms there
are passed to the speech recognizer as a bias, so "Chen Wei" stops coming out
as "Chain Way". This works with both the built-in offline engine and a Speaches
server.

## Still stuck?

1. Run **Settings → Diagnostics → Run diagnostics**.
2. Click **Copy report**.
3. Include the report (and your operating system version) in a bug report at
   the project's issue tracker. The report contains no transcript content.
