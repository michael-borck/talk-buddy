#!/usr/bin/env python3
"""
Simple Whisper API server for speech-to-text
Runs alongside PocketBase to provide STT functionality
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import whisper
import tempfile
import os
import base64
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

# Load Whisper model (base model is a good balance of speed/accuracy)
# Models: tiny, base, small, medium, large
# Larger models are more accurate but slower
print("Loading Whisper model...")
model = whisper.load_model("base")
print("Whisper model loaded!")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "model": "base",
        "timestamp": datetime.now().isoformat()
    })

@app.route('/transcribe', methods=['POST'])
def transcribe():
    """
    Transcribe audio file to text
    Accepts audio as base64 or multipart file upload
    """
    try:
        audio_data = None
        
        # Check if audio is sent as base64
        if request.json and 'audio' in request.json:
            # Decode base64 audio
            audio_b64 = request.json['audio']
            audio_data = base64.b64decode(audio_b64)
        
        # Check if audio is sent as file upload
        elif 'audio' in request.files:
            audio_file = request.files['audio']
            audio_data = audio_file.read()
        
        else:
            return jsonify({"error": "No audio data provided"}), 400
        
        # Save audio to temporary file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp_file:
            tmp_file.write(audio_data)
            tmp_file_path = tmp_file.name
        
        try:
            # Transcribe with Whisper
            result = model.transcribe(
                tmp_file_path,
                language='en',  # Force English for better accuracy
                fp16=False  # Disable for CPU compatibility
            )
            
            # Clean up temp file
            os.unlink(tmp_file_path)
            
            return jsonify({
                "text": result["text"].strip(),
                "language": result.get("language", "en"),
                "segments": result.get("segments", [])
            })
            
        except Exception as e:
            # Clean up temp file on error
            if os.path.exists(tmp_file_path):
                os.unlink(tmp_file_path)
            raise e
            
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available Whisper models"""
    return jsonify({
        "current_model": "base",
        "available_models": ["tiny", "base", "small", "medium", "large"],
        "model_sizes": {
            "tiny": "39M",
            "base": "74M", 
            "small": "244M",
            "medium": "769M",
            "large": "1550M"
        }
    })

if __name__ == '__main__':
    # Run on a different port than PocketBase (8090)
    app.run(host='0.0.0.0', port=8091, debug=False)