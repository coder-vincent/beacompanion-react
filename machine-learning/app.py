#!/usr/bin/env python3
"""
Standalone Flask ML API Server
Deploy this separately from the Node.js server
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import tempfile
from utils.ml_analyzer import analyze_behavior

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "ml-api"})

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                "success": False,
                "message": "No JSON data provided"
            }), 400
        
        behavior_type = data.get('behaviorType') or data.get('behavior_type')
        payload = data.get('data') or data.get('frame') or data.get('frame_sequence')
        
        if not behavior_type or not payload:
            return jsonify({
                "success": False,
                "message": "behavior_type and data/frame/frame_sequence required"
            }), 400
        
        # Create temporary file for analysis
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump({behavior_type: payload}, f)
            temp_file = f.name
        
        try:
            # Call the ML analysis function directly
            result = analyze_behavior(temp_file, behavior_type)
            
            return jsonify({
                "success": True,
                "analysis": {
                    "behavior_type": behavior_type,
                    **result
                }
            })
            
        finally:
            # Clean up temp file
            if os.path.exists(temp_file):
                os.unlink(temp_file)
                
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "ML analysis failed",
            "error": str(e)
        }), 500

@app.route('/batch', methods=['POST'])
def batch_analyze():
    try:
        data = request.get_json()
        # Similar implementation for batch analysis
        return jsonify({
            "success": True,
            "message": "Batch analysis not yet implemented"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": "Batch analysis failed",
            "error": str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False) 