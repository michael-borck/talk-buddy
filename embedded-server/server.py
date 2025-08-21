#!/usr/bin/env python3
"""
Embedded TTS/STT Server for Talk Buddy
Provides OpenAI-compatible API endpoints for text-to-speech and speech-to-text
"""

import os
import sys
import json
import logging
import tempfile
import threading
import io
import base64
import wave
from typing import Dict, List, Optional
from pathlib import Path

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from piper import PiperVoice
import whisper
import numpy as np
import soundfile as sf

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global variables
piper_male_voice = None
piper_female_voice = None
whisper_model = None

def initialize_tts():
    """Initialize Piper TTS with Alan (male) and Amy (female) voices"""
    global piper_male_voice, piper_female_voice
    
    try:
        # Load male voice (Alan - British)
        male_model_path = "models/en_GB-alan-low.onnx"
        if os.path.exists(male_model_path):
            piper_male_voice = PiperVoice.load(male_model_path)
            logger.info("Loaded Alan (male) voice successfully")
        else:
            logger.error(f"Male voice model not found: {male_model_path}")
            return False
        
        # Load female voice (Amy - American)
        female_model_path = "models/en_US-amy-low.onnx"
        if os.path.exists(female_model_path):
            piper_female_voice = PiperVoice.load(female_model_path)
            logger.info("Loaded Amy (female) voice successfully")
        else:
            logger.error(f"Female voice model not found: {female_model_path}")
            return False
        
        logger.info("Piper TTS initialized with Alan (male) and Amy (female) voices")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize Piper TTS: {e}")
        return False

def categorize_voices():
    """Return fixed Piper voice categories with Alan (male) and Amy (female)"""
    global piper_male_voice, piper_female_voice
    
    male_voices = []
    female_voices = []
    
    if piper_male_voice:
        male_voices.append({
            "id": 0,
            "name": "Alan (British Male)",
            "gender": "male",
            "language": "en_GB"
        })
    
    if piper_female_voice:
        female_voices.append({
            "id": 1,
            "name": "Amy (American Female)",
            "gender": "female", 
            "language": "en_US"
        })
    
    return {
        "male": male_voices,
        "female": female_voices,
        "unknown": [],
        "all": male_voices + female_voices
    }

def initialize_whisper():
    """Initialize the Whisper model for STT"""
    global whisper_model
    
    try:
        logger.info("Loading Whisper model (this may take a moment)...")
        whisper_model = whisper.load_model("tiny")  # Start with tiny model for speed
        logger.info("Whisper model loaded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize Whisper model: {e}")
        return False

def text_to_speech(text: str, voice_type: str = "female", voice_id: int = None, length_scale: float = 0.83) -> Optional[bytes]:
    """Convert text to speech using Piper TTS"""
    global piper_male_voice, piper_female_voice
    
    if not piper_male_voice or not piper_female_voice:
        logger.error("Piper voices not initialized")
        return None
    
    try:
        # Select voice based on type or specific ID
        if voice_type == "alan" or voice_type == "male" or voice_id == 0:
            voice = piper_male_voice
            voice_name = "Alan (male)"
        elif voice_type == "random":
            import random
            voice = random.choice([piper_male_voice, piper_female_voice])
            voice_name = "Alan (male)" if voice == piper_male_voice else "Amy (female)"
        else:  # Default to Amy (amy, female, or anything else)
            voice = piper_female_voice
            voice_name = "Amy (female)"
        
        logger.info(f"Using voice: {voice_name} with length_scale: {length_scale}")
        
        # Create temporary file for audio output
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
        
        try:
            # Generate speech with Piper
            with wave.open(temp_path, 'wb') as wav_file:
                voice.synthesize(text, wav_file, length_scale=length_scale)
            
            # Read the generated audio file
            with open(temp_path, 'rb') as f:
                audio_data = f.read()
            
            return audio_data
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
    except Exception as e:
        logger.error(f"Piper TTS conversion failed: {e}")
        return None

def speech_to_text(audio_data: bytes) -> Optional[dict]:
    """Convert speech to text using Whisper"""
    global whisper_model
    
    if not whisper_model:
        logger.error("Whisper model not initialized")
        return None
    
    try:
        logger.info(f"Processing audio data: {len(audio_data)} bytes")
        
        # Create temporary audio file - use generic extension since Whisper can handle multiple formats
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        logger.info(f"Saved audio to temporary file: {temp_path}")
        
        try:
            # Transcribe audio
            logger.info("Starting Whisper transcription...")
            result = whisper_model.transcribe(temp_path)
            text = result.get("text", "").strip()
            duration = result.get("duration", 0)
            
            logger.info(f"Transcription successful: '{text}' (duration: {duration}s)")
            
            if not text:
                logger.warning("Transcription returned empty text")
                return {"text": "", "duration": duration}
            
            return {"text": text, "duration": duration}
            
        except Exception as transcribe_error:
            logger.error(f"Whisper transcription failed: {transcribe_error}")
            logger.error(f"Error type: {type(transcribe_error).__name__}")
            return None
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                logger.info(f"Cleaned up temporary file: {temp_path}")
                
    except Exception as e:
        logger.error(f"STT conversion failed: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        return None

# API Routes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "services": {
            "tts": piper_male_voice is not None and piper_female_voice is not None,
            "stt": whisper_model is not None
        },
        "voices": 2  # Alan and Amy
    })

@app.route('/v1/models', methods=['GET'])
def list_models():
    """List available models (OpenAI-compatible)"""
    models = []
    
    # Add TTS models
    if available_voices:
        for i, voice in enumerate(available_voices):
            models.append({
                "id": f"tts-voice-{i}",
                "object": "model",
                "created": 1677610602,
                "owned_by": "embedded-server",
                "permission": [],
                "root": f"tts-voice-{i}",
                "parent": None,
                "name": getattr(voice, 'name', f'Voice {i}'),
                "gender": getattr(voice, 'gender', 'unknown')
            })
    
    # Add STT model
    if whisper_model:
        models.append({
            "id": "whisper-tiny",
            "object": "model", 
            "created": 1677610602,
            "owned_by": "embedded-server",
            "permission": [],
            "root": "whisper-tiny",
            "parent": None
        })
    
    return jsonify({"object": "list", "data": models})

@app.route('/v1/voices', methods=['GET'])
def list_voices():
    """List available voices categorized by gender"""
    if not piper_male_voice or not piper_female_voice:
        return jsonify({"error": "Piper voices not available"}), 500
    
    categorized = categorize_voices()
    
    return jsonify({
        "object": "list",
        "data": {
            "male": categorized["male"],
            "female": categorized["female"], 
            "unknown": categorized["unknown"],
            "all": categorized["all"],
            "total": 2
        }
    })

@app.route('/v1/voices/<gender>', methods=['GET'])
def list_voices_by_gender(gender):
    """List voices filtered by gender (male/female/unknown/all)"""
    if not piper_male_voice or not piper_female_voice:
        return jsonify({"error": "Piper voices not available"}), 500
    
    categorized = categorize_voices()
    
    if gender not in categorized:
        return jsonify({"error": f"Invalid gender '{gender}'. Use: male, female, unknown, or all"}), 400
    
    return jsonify({
        "object": "list",
        "data": categorized[gender],
        "count": len(categorized[gender])
    })

@app.route('/v1/audio/speech', methods=['POST'])
def create_speech():
    """Text-to-speech endpoint (OpenAI-compatible)"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400
        
        text = data.get('input', '')
        if not text:
            return jsonify({"error": "No input text provided"}), 400
        
        # Extract voice parameters
        model = data.get('model', '')
        voice = data.get('voice', 'female')
        voice_id = data.get('voice_id', None)  # Specific voice ID
        speed = data.get('speed', 1.2)  # Speech speed multiplier (default 1.2x)
        
        # Convert speed to Piper length_scale (inverse relationship)
        length_scale = 1.0 / speed if speed > 0 else 0.83  # Default to 1.2x speed
        
        # Determine voice type from various parameters
        voice_type = "amy"  # default to Amy
        if voice == "random":
            voice_type = "random"
        elif voice.lower() == 'alan' or 'male' in voice.lower():
            voice_type = "alan"
        elif voice.lower() == 'amy' or 'female' in voice.lower():
            voice_type = "amy"
        
        # Generate speech with voice selection and speed
        audio_data = text_to_speech(text, voice_type, voice_id, length_scale)
        if not audio_data:
            return jsonify({"error": "Failed to generate speech"}), 500
        
        # Create temporary file to return
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        return send_file(temp_path, as_attachment=True, download_name='speech.wav', mimetype='audio/wav')
        
    except Exception as e:
        logger.error(f"Speech generation error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/v1/audio/transcriptions', methods=['POST'])
def create_transcription():
    """Speech-to-text endpoint (OpenAI-compatible)"""
    try:
        logger.info(f"Received transcription request from {request.remote_addr}")
        
        # Check if file is in request
        if 'file' not in request.files:
            logger.error("No audio file in request")
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['file']
        if audio_file.filename == '':
            logger.error("No file selected")
            return jsonify({"error": "No file selected"}), 400
        
        logger.info(f"Processing audio file: {audio_file.filename}, content type: {audio_file.content_type}")
        
        # Read audio data
        audio_data = audio_file.read()
        logger.info(f"Read {len(audio_data)} bytes of audio data")
        
        # Transcribe audio
        result = speech_to_text(audio_data)
        if result is None:
            logger.error("Speech-to-text function returned None")
            return jsonify({"error": "Failed to transcribe audio"}), 500
        
        # Handle both string and dict responses
        if isinstance(result, str):
            text = result
            duration = 0
            logger.info(f"Got string result: {text}")
        else:
            text = result.get("text", "")
            duration = result.get("duration", 0)
            logger.info(f"Got dict result: text='{text}', duration={duration}")
        
        # Return OpenAI-compatible response
        response_data = {
            "text": text,
            "duration": duration
        }
        logger.info(f"Returning response: {response_data}")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Transcription error: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        return jsonify({"error": str(e)}), 500

@app.route('/shutdown', methods=['POST'])
def shutdown():
    """Shutdown the server"""
    logger.info("Shutdown requested")
    
    # Cleanup (Piper voices will be cleaned up automatically)
    
    # Shutdown Flask server
    shutdown_server = request.environ.get('werkzeug.server.shutdown')
    if shutdown_server is None:
        return jsonify({"error": "Cannot shutdown server"}), 500
    
    shutdown_server()
    return jsonify({"message": "Server shutting down..."})

def main():
    """Main entry point"""
    logger.info("Starting embedded TTS/STT server...")
    
    # Initialize services
    tts_success = initialize_tts()
    stt_success = initialize_whisper()
    
    if not tts_success and not stt_success:
        logger.error("Failed to initialize both TTS and STT services")
        sys.exit(1)
    
    if not tts_success:
        logger.warning("TTS service failed to initialize")
    
    if not stt_success:
        logger.warning("STT service failed to initialize")
    
    # Start server
    port = int(os.environ.get('PORT', 8765))
    host = os.environ.get('HOST', '127.0.0.1')
    
    logger.info(f"Server starting on {host}:{port}")
    logger.info("Available endpoints:")
    logger.info("  GET  /health                     - Health check")
    logger.info("  GET  /v1/models                  - List models")
    logger.info("  POST /v1/audio/speech            - Text-to-speech")
    logger.info("  POST /v1/audio/transcriptions    - Speech-to-text")
    logger.info("  POST /shutdown                   - Shutdown server")
    
    app.run(host=host, port=port, debug=False, use_reloader=False)

if __name__ == '__main__':
    main()