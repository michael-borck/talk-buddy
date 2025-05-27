#!/usr/bin/env python3
"""
Piper TTS API server
Provides text-to-speech functionality using Piper
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import subprocess
import tempfile
import os
import base64
from datetime import datetime
import io
import wave

app = Flask(__name__)
# Enable CORS for browser requests from allowed origins
CORS(app, origins=[
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://talkbuddy.serveur.au'
])

# Path to Piper binary and voice model
PIPER_BIN = "./piper/piper"
# Default to female voice, can be changed via environment variable
VOICE_MODEL = os.environ.get('PIPER_VOICE', 'piper-voices/en_GB-southern_english_female-low.onnx')
# Alternative male voice: VOICE_MODEL = "piper-voices/en_GB-alan-low.onnx"

@app.route('/', methods=['GET'])
def home():
    """Health check endpoint"""
    return jsonify({
        "server": "piper-tts",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "voice": VOICE_MODEL
    })

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({"status": "healthy"})

@app.route('/synthesize', methods=['POST'])
def synthesize():
    """
    Synthesize speech from text
    
    Expected JSON payload:
    {
        "text": "Text to synthesize",
        "format": "wav" (optional, default: wav),
        "speed": 1.0 (optional, speaking rate multiplier)
    }
    
    Returns: Audio file (WAV format by default)
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        speed = data.get('speed', 1.0)
        
        # Validate input
        if not text.strip():
            return jsonify({"error": "Empty text provided"}), 400
        
        if len(text) > 5000:
            return jsonify({"error": "Text too long (max 5000 characters)"}), 400
        
        # Create temporary file for audio output
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Run Piper to generate speech
            # Note: Piper doesn't have a Python API yet, so we use subprocess
            process = subprocess.run([
                PIPER_BIN,
                '--model', VOICE_MODEL,
                '--output_file', output_path,
                '--length_scale', str(1.0 / speed)  # Inverse because length_scale slows down
            ], input=text, text=True, capture_output=True)
            
            if process.returncode != 0:
                raise Exception(f"Piper error: {process.stderr}")
            
            # Return the audio file
            return send_file(
                output_path,
                mimetype='audio/wav',
                as_attachment=False,
                download_name='speech.wav'
            )
            
        finally:
            # Clean up temp file after sending
            if os.path.exists(output_path):
                os.unlink(output_path)
                
    except Exception as e:
        print(f"Synthesis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/synthesize/base64', methods=['POST'])
def synthesize_base64():
    """
    Synthesize speech and return as base64-encoded WAV
    Useful for direct embedding in web apps
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({"error": "No text provided"}), 400
        
        text = data['text']
        speed = data.get('speed', 1.0)
        
        # Create temporary file for audio output
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp_file:
            output_path = tmp_file.name
        
        try:
            # Run Piper
            process = subprocess.run([
                PIPER_BIN,
                '--model', VOICE_MODEL,
                '--output_file', output_path,
                '--length_scale', str(1.0 / speed)
            ], input=text, text=True, capture_output=True)
            
            if process.returncode != 0:
                raise Exception(f"Piper error: {process.stderr}")
            
            # Read and encode audio file
            with open(output_path, 'rb') as audio_file:
                audio_data = audio_file.read()
                audio_base64 = base64.b64encode(audio_data).decode('utf-8')
            
            return jsonify({
                "audio": audio_base64,
                "format": "wav",
                "duration": get_wav_duration(output_path)
            })
            
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
                
    except Exception as e:
        print(f"Synthesis error: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_wav_duration(file_path):
    """Get duration of WAV file in seconds"""
    try:
        with wave.open(file_path, 'rb') as wav_file:
            frames = wav_file.getnframes()
            rate = wav_file.getframerate()
            duration = frames / float(rate)
            return round(duration, 2)
    except:
        return None

@app.route('/voices', methods=['GET'])
def list_voices():
    """List available voice models"""
    voices = []
    if os.path.exists('piper-voices'):
        for file in os.listdir('piper-voices'):
            if file.endswith('.onnx'):
                voices.append({
                    "id": file.replace('.onnx', ''),
                    "path": os.path.join('piper-voices', file),
                    "language": "en" if "en-" in file else "unknown"
                })
    
    return jsonify({"voices": voices})

if __name__ == '__main__':
    # Check if Piper binary exists
    if not os.path.exists(PIPER_BIN):
        print(f"ERROR: Piper binary not found at {PIPER_BIN}")
        print("Please run setup-piper.sh first")
        exit(1)
    
    # Check if voice model exists
    if not os.path.exists(VOICE_MODEL):
        print(f"ERROR: Voice model not found: {VOICE_MODEL}")
        print("Please run setup-piper.sh to download voice models")
        exit(1)
    
    print(f"Starting Piper TTS server with voice: {VOICE_MODEL}")
    app.run(host='0.0.0.0', port=38992, debug=False)