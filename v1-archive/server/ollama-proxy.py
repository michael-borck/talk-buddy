#!/usr/bin/env python3
"""
Simple proxy for Ollama API that adds CORS headers
"""

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import requests
import json

app = Flask(__name__)
CORS(app, origins=['https://talkbuddy.serveur.au', 'http://localhost:5173'])

# Ollama backend URL (adjust if needed)
OLLAMA_URL = 'http://localhost:11434'

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>', methods=['GET', 'POST', 'OPTIONS'])
def proxy(path):
    """Proxy all requests to Ollama with CORS headers"""
    try:
        # Build the target URL
        url = f'{OLLAMA_URL}/{path}'
        
        # Forward the request
        if request.method == 'GET':
            resp = requests.get(url)
        elif request.method == 'POST':
            resp = requests.post(
                url,
                json=request.get_json(),
                headers={'Content-Type': 'application/json'}
            )
        else:
            return '', 204  # OPTIONS
        
        # Return response with CORS headers (Flask-CORS handles this)
        return Response(
            resp.content,
            status=resp.status_code,
            content_type=resp.headers.get('content-type', 'application/json')
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting Ollama CORS proxy on port 38993...")
    app.run(host='0.0.0.0', port=38993, debug=False)