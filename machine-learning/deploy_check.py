#!/usr/bin/env python3
"""
Deployment check script for the ML environment.
This helps debug what's available in the deployed environment.
"""

import json
import sys
import os

def main():
    try:
        print("=== Deployment Check ===", file=sys.stderr)
        
        # Basic environment info
        print(f"Python version: {sys.version}", file=sys.stderr)
        print(f"Working directory: {os.getcwd()}", file=sys.stderr)
        print(f"Python path: {sys.path}", file=sys.stderr)
        
        # Check available packages
        available_packages = []
        
        # Test torch
        try:
            import torch
            available_packages.append(f"torch-{torch.__version__}")
            print(f"✓ PyTorch {torch.__version__} available", file=sys.stderr)
        except ImportError as e:
            print(f"✗ PyTorch not available: {e}", file=sys.stderr)
        
        # Test numpy
        try:
            import numpy as np
            available_packages.append(f"numpy-{np.__version__}")
            print(f"✓ NumPy {np.__version__} available", file=sys.stderr)
        except ImportError as e:
            print(f"✗ NumPy not available: {e}", file=sys.stderr)
        
        # Test PIL
        try:
            from PIL import Image
            available_packages.append("PIL")
            print("✓ PIL available", file=sys.stderr)
        except ImportError as e:
            print(f"✗ PIL not available: {e}", file=sys.stderr)
        
        # Test MediaPipe
        try:
            import mediapipe as mp
            available_packages.append("mediapipe")
            print("✓ MediaPipe available", file=sys.stderr)
        except ImportError as e:
            if os.getenv('DEBUG', '').lower() in ('true', '1', 'yes'):
                print(f"✗ MediaPipe not available: {e}", file=sys.stderr)
        
        # Check model files
        model_files = [
            "models/rapid_talking.pth",
            "models/eye_gaze.pth",
            "models/sit-stand.pth",
            "models/tapping_feet.pth",
            "models/tapping_hands.pth",
        ]
        
        available_models = []
        for model_file in model_files:
            if os.path.exists(model_file):
                available_models.append(model_file)
                print(f"✓ {model_file} exists", file=sys.stderr)
            else:
                print(f"✗ {model_file} missing", file=sys.stderr)
        
        # Check custom modules
        try:
            from model_loader import load_all_models
            print("✓ model_loader module available", file=sys.stderr)
        except ImportError as e:
            print(f"✗ model_loader not available: {e}", file=sys.stderr)
        
        try:
            from models.architectures import WPMModel
            print("✓ model architectures available", file=sys.stderr)
        except ImportError as e:
            print(f"✗ model architectures not available: {e}", file=sys.stderr)
        
        # Output summary
        result = {
            "status": "success",
            "python_version": sys.version,
            "working_directory": os.getcwd(),
            "available_packages": available_packages,
            "available_models": available_models,
            "model_files_total": len(model_files),
            "model_files_found": len(available_models),
            "message": f"Deployment check complete. {len(available_packages)} packages, {len(available_models)}/{len(model_files)} models"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            "status": "error",
            "error": str(e),
            "message": "Deployment check failed"
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 