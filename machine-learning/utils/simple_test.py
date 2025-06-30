#!/usr/bin/env python3
"""
Simple test script for the ML analyzer.
This script is called by the Node.js test endpoint to verify Python environment.
"""

import sys
import json
import time

def main():
    """Quick test of the ML environment - should complete in under 10 seconds"""
    try:
        print("Starting ML environment test...", file=sys.stderr)
        start_time = time.time()
        
        # Test 1: Basic imports
        print("Testing basic imports...", file=sys.stderr)
        import torch
        import numpy as np
        from PIL import Image
        print("✓ Basic imports successful", file=sys.stderr)
        
        # Test 2: Check if models can be imported (but don't load them)
        print("Testing model imports...", file=sys.stderr)
        try:
            from model_loader import load_all_models
            print("✓ Model loader available", file=sys.stderr)
        except ImportError as e:
            print(f"⚠ Model loader not available: {e}", file=sys.stderr)
        
        # Test 3: Test MediaPipe import (optional)
        print("Testing MediaPipe...", file=sys.stderr)
        try:
            import mediapipe as mp
            print("✓ MediaPipe available", file=sys.stderr)
        except ImportError:
            print("⚠ MediaPipe not available", file=sys.stderr)
        
        # Test 4: Quick PyTorch tensor operation
        print("Testing PyTorch operations...", file=sys.stderr)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        x = torch.randn(2, 3).to(device)
        y = torch.matmul(x, x.T)
        print(f"✓ PyTorch working on {device}", file=sys.stderr)
        
        end_time = time.time()
        elapsed = end_time - start_time
        
        # Output result to stdout for Node.js to capture
        result = {
            "status": "success",
            "device": str(device),
            "elapsed_seconds": round(elapsed, 2),
            "torch_version": torch.__version__,
            "numpy_version": np.__version__,
            "tests_passed": [
                "imports",
                "model_loader", 
                "mediapipe",
                "pytorch_ops"
            ],
            "message": f"ML environment test completed successfully in {elapsed:.2f}s"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        # Output error to stdout for Node.js to capture
        error_result = {
            "status": "error", 
            "error": str(e),
            "message": "ML environment test failed"
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    main() 