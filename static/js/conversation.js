/**
 * TalkBuddy Conversation Interface with WebSocket Audio Pipeline
 * Handles push-to-talk functionality with browser Web Speech API
 */

class ConversationManager {
    constructor() {
        this.ws = null;
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.isListening = false;
        this.isConnected = false;
        this.currentState = 'idle'; // idle, listening, thinking, speaking
        
        this.initializeWebSocket();
        this.initializeSpeechRecognition();
        this.setupEventListeners();
    }
    
    initializeWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/conversation`;
        
        console.log('Attempting WebSocket connection to:', wsUrl);
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
            console.log('WebSocket connected successfully');
            this.isConnected = true;
            this.updateConnectionStatus(true);
            
            // Start conversation session automatically
            this.startConversationSession();
        };
        
        this.ws.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.updateConnectionStatus(false);
        };
        
        this.ws.onmessage = (event) => {
            this.handleWebSocketMessage(event);
        };
        
        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.updateConnectionStatus(false);
        };
    }
    
    initializeSpeechRecognition() {
        console.log('Initializing speech recognition...');
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.error('Speech recognition not supported');
            this.showError('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
            return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        console.log('Speech recognition initialized successfully');
        
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';
        
        this.recognition.onstart = () => {
            console.log('Speech recognition started');
            this.isListening = true;
            this.updateUIState('listening');
        };
        
        this.recognition.onresult = (event) => {
            let transcript = '';
            let isFinal = false;
            
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    isFinal = true;
                }
            }
            
            this.updateTranscript(transcript, !isFinal);
            
            if (isFinal && transcript.trim()) {
                this.sendUserMessage(transcript.trim());
            }
        };
        
        this.recognition.onend = () => {
            console.log('Speech recognition ended');
            this.isListening = false;
            
            if (this.currentState === 'listening') {
                this.updateUIState('thinking');
            }
        };
        
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.isListening = false;
            this.updateUIState('idle');
            
            if (event.error === 'no-speech') {
                this.showError('No speech detected. Please try again.');
            } else if (event.error === 'network') {
                this.showError('Network error. Please check your connection.');
            }
        };
    }
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        const micButton = document.getElementById('mic-button');
        console.log('Mic button found:', micButton);
        
        if (micButton) {
            console.log('Adding event listeners to mic button');
            
            // Mouse events
            micButton.addEventListener('mousedown', () => {
                console.log('Mouse down on mic button');
                this.startListening();
            });
            micButton.addEventListener('mouseup', () => {
                console.log('Mouse up on mic button');
                this.stopListening();
            });
            micButton.addEventListener('mouseleave', () => {
                console.log('Mouse leave on mic button');
                this.stopListening();
            });
            
            // Touch events for mobile
            micButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                console.log('Touch start on mic button');
                this.startListening();
            });
            micButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                console.log('Touch end on mic button');
                this.stopListening();
            });
        } else {
            console.error('Mic button not found!');
        }
        
        // Keyboard shortcut (spacebar)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.repeat && this.currentState === 'idle') {
                e.preventDefault();
                this.startListening();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space' && this.isListening) {
                e.preventDefault();
                this.stopListening();
            }
        });
    }
    
    startListening() {
        if (!this.isConnected || this.isListening || this.currentState !== 'idle') {
            return;
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Failed to start speech recognition:', error);
            this.showError('Failed to start listening. Please try again.');
        }
    }
    
    stopListening() {
        if (this.isListening && this.recognition) {
            this.recognition.stop();
        }
    }
    
    sendUserMessage(text) {
        if (!this.isConnected) {
            this.showError('Not connected. Please refresh the page.');
            return;
        }
        
        // Add user message to transcript
        this.addMessageToTranscript('user', text);
        
        // Send to WebSocket
        this.ws.send(JSON.stringify({
            type: 'user_message',
            content: text,
            timestamp: new Date().toISOString()
        }));
        
        this.updateUIState('thinking');
    }
    
    handleWebSocketMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
                case 'ai_message_start':
                    this.updateUIState('speaking');
                    this.addMessageToTranscript('assistant', '', true);
                    break;
                    
                case 'ai_message_chunk':
                    this.appendToAssistantMessage(message.content);
                    break;
                    
                case 'ai_message_complete':
                    this.completeAssistantMessage();
                    this.speakText(message.full_text);
                    break;
                    
                case 'error':
                    this.showError(message.content);
                    this.updateUIState('idle');
                    break;
                    
                case 'session_update':
                    this.updateSessionInfo(message.data);
                    break;
            }
        } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
        }
    }
    
    speakText(text) {
        if (!this.synthesis) {
            console.warn('Speech synthesis not available');
            this.updateUIState('idle');
            return;
        }
        
        // Cancel any ongoing speech
        this.synthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        utterance.onend = () => {
            this.updateUIState('idle');
        };
        
        utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            this.updateUIState('idle');
        };
        
        this.synthesis.speak(utterance);
    }
    
    updateUIState(state) {
        this.currentState = state;
        
        const micButton = document.getElementById('mic-button');
        const stateLabel = document.getElementById('state-label');
        
        if (!micButton || !stateLabel) return;
        
        // Remove all state classes
        micButton.classList.remove('listening', 'thinking', 'speaking');
        
        switch (state) {
            case 'idle':
                stateLabel.textContent = 'Push to Talk';
                micButton.classList.remove('animate-pulse');
                break;
                
            case 'listening':
                stateLabel.textContent = 'Listening...';
                micButton.classList.add('listening', 'animate-pulse');
                break;
                
            case 'thinking':
                stateLabel.textContent = 'AI is thinking...';
                micButton.classList.add('thinking', 'animate-pulse');
                break;
                
            case 'speaking':
                stateLabel.textContent = 'AI is speaking...';
                micButton.classList.add('speaking');
                break;
        }
    }
    
    updateTranscript(text, isInterim) {
        const interimElement = document.getElementById('interim-transcript');
        if (interimElement) {
            if (isInterim) {
                interimElement.textContent = text;
                interimElement.style.opacity = '0.6';
            } else {
                interimElement.textContent = '';
            }
        }
    }
    
    addMessageToTranscript(role, content, isStreaming = false) {
        const transcript = document.getElementById('conversation-transcript');
        if (!transcript) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';
        
        if (role === 'user') {
            bubble.className += ' user-bubble';
        } else {
            bubble.className += ' assistant-bubble';
            if (isStreaming) {
                bubble.id = 'streaming-message';
            }
        }
        
        bubble.textContent = content;
        messageDiv.appendChild(bubble);
        transcript.appendChild(messageDiv);
        
        // Scroll to bottom
        transcript.scrollTop = transcript.scrollHeight;
    }
    
    appendToAssistantMessage(chunk) {
        const streamingMessage = document.getElementById('streaming-message');
        if (streamingMessage) {
            streamingMessage.textContent += chunk;
            
            // Scroll to bottom
            const transcript = document.getElementById('conversation-transcript');
            if (transcript) {
                transcript.scrollTop = transcript.scrollHeight;
            }
        }
    }
    
    completeAssistantMessage() {
        const streamingMessage = document.getElementById('streaming-message');
        if (streamingMessage) {
            streamingMessage.removeAttribute('id');
        }
    }
    
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (statusElement) {
            statusElement.textContent = connected ? 'Connected' : 'Disconnected';
            statusElement.className = connected ? 'connected' : 'disconnected';
        }
    }
    
    updateSessionInfo(data) {
        if (data.duration) {
            const durationElement = document.getElementById('session-duration');
            if (durationElement) {
                durationElement.textContent = this.formatDuration(data.duration);
            }
        }
        
        if (data.turn_count) {
            const turnElement = document.getElementById('turn-count');
            if (turnElement) {
                turnElement.textContent = data.turn_count;
            }
        }
    }
    
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    showError(message) {
        const errorElement = document.getElementById('error-message');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            setTimeout(() => {
                errorElement.style.display = 'none';
            }, 5000);
        } else {
            console.error(message);
        }
    }
    
    startConversationSession() {
        if (this.ws && this.isConnected) {
            // Get scenario ID from URL path
            const pathParts = window.location.pathname.split('/');
            const scenarioId = pathParts[pathParts.length - 1] || 1;
            
            this.ws.send(JSON.stringify({
                type: 'start_session',
                scenario_id: parseInt(scenarioId)
            }));
        }
    }
    
    endSession() {
        if (this.ws && this.isConnected) {
            this.ws.send(JSON.stringify({
                type: 'end_session'
            }));
        }
        
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
}

// Initialize conversation manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.conversationManager = new ConversationManager();
});