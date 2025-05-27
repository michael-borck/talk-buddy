# TalkBuddy - Todo List

## ✅ Completed
- [x] Create conversation page with avatar states
- [x] Implement push-to-talk functionality  
- [x] Add Web Speech API for STT (replaced with Whisper)
- [x] Add speech synthesis for TTS
- [x] Change AI avatar icon to friendly face (robot emoji)
- [x] Add status text under AI avatar (Listening/Thinking/Speaking/Ready)
- [x] Connect to PocketBase for scenarios
- [x] Display scenario name with info button for details
- [x] Add scenario info popup/modal (description, difficulty, duration, tips)
- [x] Implement 'Nervous?' support button
- [x] Add encouragement messages and quick actions
- [x] Implement Whisper STT integration
- [x] Add click-to-start interaction (no autoplay)

## 🔴 High Priority (Core Functionality)
- [ ] Save conversation transcripts to PocketBase
- [ ] Track user metrics (response time, pauses, restarts)
- [ ] Create end-of-session analysis report
- [ ] Integrate actual AI service (replace mock responses)

## 🟡 Medium Priority (Enhanced UX)
- [ ] Implement adaptive AI behavior based on metrics
- [ ] Build session history view with playback
- [ ] Add progress tracking across sessions
- [ ] Add visual feedback for voice detection/volume
- [ ] Add 'Hold to speak' hint for first-time users

## 🟢 Low Priority (Polish)
- [ ] Add subtle sound effects for state changes
- [ ] Allow custom Whisper URL in settings
- [ ] Model selection - Let users choose speed vs accuracy
- [ ] Audio preprocessing - Noise reduction, format conversion
- [ ] Progress indicator - Show transcription in progress
- [ ] Fallback to cloud API - If local Whisper fails

## 🚀 Next Steps on Server
1. Set up SSL certificates (Cloudflare origin or Let's Encrypt)
2. Configure environment variables for production
3. Set up systemd services for auto-start
4. Test GPU acceleration for Whisper
5. Implement session saving to PocketBase