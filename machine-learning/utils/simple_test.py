#!/usr/bin/env python3
"""
Simple ML test script that bypasses MediaPipe detection
This helps test if the models themselves are working
"""

import json
import sys
import torch
import numpy as np
from model_loader import load_all_models

def test_models():
    """Test all models with dummy data"""
    print("Loading models...", file=sys.stderr)
    models = load_all_models()
    
    results = {}
    
    # Test eye_gaze with dummy eye crop tensors
    try:
        model = models['eye_gaze']
        dummy_frames = torch.randn(1, 10, 3, 64, 64)  # Batch, Time, Channels, Height, Width
        with torch.no_grad():
            logits = model(dummy_frames)
            probs = torch.softmax(logits, dim=1)[0]
            prob, idx = probs.max(dim=0)
            
        results['eye_gaze'] = {
            "model_loaded": True,
            "test_confidence": round(prob.item(), 4),
            "test_prediction": int(idx.item())
        }
        print("✅ Eye gaze model working", file=sys.stderr)
    except Exception as e:
        results['eye_gaze'] = {"model_loaded": False, "error": str(e)}
        print(f"❌ Eye gaze model failed: {e}", file=sys.stderr)
    
    # Test tapping models with dummy hand/foot crops
    for behavior in ['tapping_hands', 'tapping_feet']:
        try:
            model = models[behavior]
            dummy_frames = torch.randn(1, 10, 3, 64, 64)
            with torch.no_grad():
                logits = model(dummy_frames)
                prob = torch.softmax(logits, dim=1)[0, 1].item()
                
            results[behavior] = {
                "model_loaded": True,
                "test_confidence": round(prob, 4),
                "test_detected": prob > 0.3
            }
            print(f"✅ {behavior} model working", file=sys.stderr)
        except Exception as e:
            results[behavior] = {"model_loaded": False, "error": str(e)}
            print(f"❌ {behavior} model failed: {e}", file=sys.stderr)
    
    # Test sit_stand with dummy pose coordinates
    try:
        model = models['sit_stand']
        dummy_pose = torch.randn(1, 10, 66)  # 33 landmarks * 2 coords * 10 frames
        with torch.no_grad():
            logits = model(dummy_pose)
            prob = torch.softmax(logits, dim=1)[0, 1].item()
            
        results['sit_stand'] = {
            "model_loaded": True,
            "test_confidence": round(prob, 4),
            "test_detected": prob > 0.3
        }
        print("✅ Sit-stand model working", file=sys.stderr)
    except Exception as e:
        results['sit_stand'] = {"model_loaded": False, "error": str(e)}
        print(f"❌ Sit-stand model failed: {e}", file=sys.stderr)
    
    # Test rapid_talking with dummy audio features
    try:
        model = models['rapid_talking']
        dummy_audio = torch.randn(1, 10, 1)  # 10 WPM values
        with torch.no_grad():
            prob = model(dummy_audio).squeeze().item()
            
        results['rapid_talking'] = {
            "model_loaded": True,
            "test_confidence": round(prob, 4),
            "test_detected": prob > 0.3
        }
        print("✅ Rapid talking model working", file=sys.stderr)
    except Exception as e:
        results['rapid_talking'] = {"model_loaded": False, "error": str(e)}
        print(f"❌ Rapid talking model failed: {e}", file=sys.stderr)
    
    return results

if __name__ == "__main__":
    try:
        test_results = test_models()
        # Output only JSON to stdout for Node.js
        print(json.dumps(test_results))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1) 