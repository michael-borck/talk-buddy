# Talk Buddy — Context

Domain language for Talk Buddy, a privacy-first desktop app for practising spoken
conversations with an AI partner. Use these terms exactly; pick the named term over
its aliases so code, docs, and conversation stay aligned.

## Practice domain

**Scenario**:
A single practice situation (job interview, difficult meeting, client call) carrying
the system prompt the AI Brain plays to. Users pick one, or write their own.
_Avoid_: prompt, situation, exercise, task.

**Practice Pack** (Pack):
A curated group of Scenarios assembled into one focused practice run.
_Avoid_: course, bundle, playlist, collection.

**Session**:
The persisted record of one attempt at a Scenario — its transcript plus optional
analysis. A Session is the saved artifact, not the live activity.
_Avoid_: recording, attempt, history entry.

**Conversation**:
The live spoken exchange that produces a Session. Made of Turns.
_Avoid_: chat, dialogue.

**Turn**:
One round of the Conversation: the user speaks, the AI Brain replies aloud. The unit
of barge-in, cancellation, and replay.
_Avoid_: exchange, message, round-trip.

## Provider stack

Three independently swappable subsystems power a Turn. Each has a user-facing name (its
Settings tab) and a code-level abbreviation; both are listed so neither drifts.

**Listening** (STT):
The speech-to-text subsystem — turns the user's microphone audio into text.
_Avoid_: ASR, transcription engine, recognizer.

**Voice** (TTS):
The text-to-speech subsystem — speaks the AI Brain's reply aloud.
_Avoid_: synthesizer, speaker.

**AI Brain** (Chat):
The large-language-model subsystem that generates the reply for a Turn.
_Avoid_: LLM service, model, assistant.

**Provider**:
A concrete, swappable backend behind Listening, Voice, or AI Brain — e.g. `embedded`
or `speaches` for speech; `anthropic`, `openai`, `gemini`, `groq`, `ollama`, `custom`
for the AI Brain. Picking a Provider is what a user does in a Settings tab.
_Avoid_: service, backend, engine, vendor.

**Embedded server**:
The bundled offline speech Provider — a local Piper (TTS) + Whisper (STT) process the
app spawns and health-checks. Its URL is the live local port, not a stored setting.
_Avoid_: local server, built-in service.

**Speaches**:
An external/cloud speech Provider (Kokoro TTS + Faster-Whisper STT), reached over HTTP
through the main-process proxy. Its URL and key are stored settings.
_Avoid_: cloud server (when the specific Provider is meant).

**Resolved config**:
The typed, defaults-applied configuration for one Provider on one subsystem, produced
by the config module from a preference snapshot. The single place a default lives.
_Avoid_: settings object, options.

## Flagged ambiguities

- **Session vs Conversation**: a Session is the persisted record; a Conversation is the
  live activity that creates it. Don't use "conversation" for the saved transcript.
- **Voice the subsystem vs voice the choice**: "Voice" (capitalized) is the TTS
  subsystem; the `voice` field (`male` | `female`) is the speaker choice within it.

## Example dialogue

> **Dev:** When the user holds the mic during a Turn, who decides which model transcribes it?
> **Domain expert:** The Listening Provider. If they picked the Embedded server, it uses
> the local Whisper at the live port and sends no model name. If they picked Speaches, the
> Resolved config supplies the cloud STT model.
> **Dev:** And the reply is spoken back by the Voice Provider?
> **Domain expert:** Right — same Provider split. The AI Brain generates the text, the Voice
> Provider speaks it. All three are configured independently, one Settings tab each.
> **Dev:** If they barge in mid-reply?
> **Domain expert:** That cancels the current Turn. The partial transcript still lands in
> the Session.
