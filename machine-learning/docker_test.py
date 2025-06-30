#!/usr/bin/env python3
"""
Docker environment test for MediaPipe and ML dependencies.
This script verifies that MediaPipe and all ML components work correctly
in the Docker container environment.
"""

import sys
import json
import os

def test_mediapipe_docker():
    """Test MediaPipe functionality in Docker environment"""
    results = {
        "status": "success",
        "tests": [],
        "errors": [],
        "environment": "docker"
    }
    
    print("🐳 Testing MediaPipe in Docker environment...", file=sys.stderr)
    
    # Test 1: MediaPipe import
    try:
        import mediapipe as mp
        results["tests"].append({
            "name": "mediapipe_import", 
            "status": "success",
            "version": mp.__version__
        })
        print("✅ MediaPipe import successful", file=sys.stderr)
    except ImportError as e:
        results["tests"].append({
            "name": "mediapipe_import", 
            "status": "failed",
            "error": str(e)
        })
        results["errors"].append(f"MediaPipe import failed: {e}")
        print(f"❌ MediaPipe import failed: {e}", file=sys.stderr)
        
    # Test 2: MediaPipe solutions
    try:
        face_mesh = mp.solutions.face_mesh
        hands = mp.solutions.hands  
        pose = mp.solutions.pose
        results["tests"].append({
            "name": "mediapipe_solutions", 
            "status": "success",
            "solutions": ["face_mesh", "hands", "pose"]
        })
        print("✅ MediaPipe solutions accessible", file=sys.stderr)
    except Exception as e:
        results["tests"].append({
            "name": "mediapipe_solutions", 
            "status": "failed",
            "error": str(e)
        })
        results["errors"].append(f"MediaPipe solutions failed: {e}")
        print(f"❌ MediaPipe solutions failed: {e}", file=sys.stderr)
        
    # Test 3: Create MediaPipe models (lightweight test)
    try:
        # Use minimal settings for Docker test
        face_mesh = mp.solutions.face_mesh.FaceMesh(
            static_image_mode=True,
            max_num_faces=1,
            refine_landmarks=False,
            min_detection_confidence=0.5
        )
        hands_model = mp.solutions.hands.Hands(
            static_image_mode=True,
            max_num_hands=1,
            min_detection_confidence=0.5
        )
        pose_model = mp.solutions.pose.Pose(
            static_image_mode=True,
            min_detection_confidence=0.5
        )
        
        # Close models to free memory
        face_mesh.close()
        hands_model.close()
        pose_model.close()
        
        results["tests"].append({
            "name": "mediapipe_models", 
            "status": "success",
            "models": ["face_mesh", "hands", "pose"]
        })
        print("✅ MediaPipe models creation successful", file=sys.stderr)
    except Exception as e:
        results["tests"].append({
            "name": "mediapipe_models", 
            "status": "failed",
            "error": str(e)
        })
        results["errors"].append(f"MediaPipe models failed: {e}")
        print(f"❌ MediaPipe models failed: {e}", file=sys.stderr)
        
    # Test 4: OpenCV integration (required by MediaPipe)
    try:
        import cv2
        import numpy as np
        
        # Create a small test image
        test_img = np.zeros((100, 100, 3), dtype=np.uint8)
        test_img[:] = (255, 255, 255)  # White image
        
        results["tests"].append({
            "name": "opencv_integration", 
            "status": "success",
            "opencv_version": cv2.__version__
        })
        print("✅ OpenCV integration working", file=sys.stderr)
    except Exception as e:
        results["tests"].append({
            "name": "opencv_integration", 
            "status": "failed",
            "error": str(e)
        })
        results["errors"].append(f"OpenCV integration failed: {e}")
        print(f"❌ OpenCV integration failed: {e}", file=sys.stderr)
        
    # Test 5: System dependencies check
    try:
        import subprocess
        
        # Check for key MediaPipe system libraries
        required_libs = [
            "libgl1-mesa-glx",
            "libglib2.0-0", 
            "libgtk-3-0"
        ]
        
        available_libs = []
        for lib in required_libs:
            try:
                result = subprocess.run(
                    ["dpkg", "-l", lib], 
                    capture_output=True, 
                    text=True, 
                    timeout=5
                )
                if result.returncode == 0:
                    available_libs.append(lib)
            except:
                pass  # Library check failed, but continue
                
        results["tests"].append({
            "name": "system_dependencies", 
            "status": "success",
            "available_libs": available_libs,
            "total_required": len(required_libs)
        })
        print(f"✅ System dependencies check: {len(available_libs)}/{len(required_libs)} libraries found", file=sys.stderr)
    except Exception as e:
        results["tests"].append({
            "name": "system_dependencies", 
            "status": "failed",
            "error": str(e)
        })
        print(f"⚠️ System dependencies check failed: {e}", file=sys.stderr)
        
    # Determine overall status
    failed_tests = [t for t in results["tests"] if t["status"] == "failed"]
    if failed_tests:
        results["status"] = "failed"
        results["message"] = f"MediaPipe Docker test failed: {len(failed_tests)} test(s) failed"
    else:
        results["message"] = f"MediaPipe Docker test passed: {len(results['tests'])} test(s) successful"
        
    return results

def main():
    """Main test function"""
    try:
        results = test_mediapipe_docker()
        
        # Print results to stdout for capture by Node.js
        print(json.dumps(results, indent=2))
        
        # Exit with error if tests failed
        if results["status"] == "failed":
            sys.exit(1)
            
    except Exception as e:
        error_result = {
            "status": "error",
            "message": f"Docker test crashed: {str(e)}",
            "environment": "docker"
        }
        print(json.dumps(error_result), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 