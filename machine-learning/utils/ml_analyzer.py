#!/usr/bin/env python3
"""ML Analyzer script

This script is invoked by the Node mlController using the following CLI:

python ml_analyzer.py --data <tmp_json_file> --behavior <behavior_type>

It must read the JSON payload from the file, run the behaviour specific
model/prediction logic, and write a single JSON object **to stdout** so that
Node.js can capture and forward it to the client.

For the purposes of this repo (demo / placeholder), we implement a very light
weight random-based detector. The interface can later be replaced by real
model inference code with minimal changes (just replace `_predict`).
"""

# fmt: off
import argparse
import base64
import json
import os
import sys
from io import BytesIO
from typing import Any, Dict, List, Optional

# Silence any prints while importing model_loader to keep stdout clean
import contextlib
import io

import torch
from PIL import Image
from torchvision import transforms

# Local util that loads and caches models - LAZY LOADED
_silent = io.StringIO()
with contextlib.redirect_stdout(_silent):
    try:
        from model_loader import load_all_models
    except Exception as e:
        print(f"Warning: Failed to import model_loader: {e}", file=sys.stderr)
        load_all_models = None

# For eye gaze preprocessing
import numpy as np
try:
    import mediapipe as mp
except ImportError:
    print("Warning: MediaPipe not available", file=sys.stderr)
    mp = None

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
# Models will be loaded lazily when first needed
MODELS = None

def get_models():
    """Lazy load models with error handling"""
    global MODELS
    if MODELS is None:
        try:
            if load_all_models is None:
                raise ImportError("model_loader not available")
            MODELS = load_all_models()
            print("Models loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"Failed to load models: {e}", file=sys.stderr)
            # Return empty dict so we can still return predictions (random for demo)
            MODELS = {}
    return MODELS

# Common image transform (matches notebook training — 64×64 RGB, no normalisation)
IMAGE_SIZE = 64
_IMAGE_TF = transforms.Compose([
    transforms.Resize((IMAGE_SIZE, IMAGE_SIZE)),
    transforms.ToTensor(),  # outputs [0,1] float32
])

# Mediapipe FaceMesh for eye region extraction (more lenient settings)
_mp_face_mesh = None
_mp_hands = None
_mp_pose = None

def get_mediapipe_models():
    """Lazy load MediaPipe models"""
    global _mp_face_mesh, _mp_hands, _mp_pose
    if mp is None:
        return None, None, None
    
    if _mp_face_mesh is None:
        try:
            _mp_face_mesh = mp.solutions.face_mesh.FaceMesh(
                static_image_mode=True,
                max_num_faces=1,
                refine_landmarks=False,
                min_detection_confidence=0.3,
                min_tracking_confidence=0.3,
            )
            _mp_hands = mp.solutions.hands.Hands(
                static_image_mode=True, 
                max_num_hands=2,
                min_detection_confidence=0.3,
                min_tracking_confidence=0.3
            )
            _mp_pose = mp.solutions.pose.Pose(
                static_image_mode=True,
                min_detection_confidence=0.3,
                min_tracking_confidence=0.3,
                model_complexity=1
            )
            print("MediaPipe models loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"Failed to load MediaPipe models: {e}", file=sys.stderr)
    
    return _mp_face_mesh, _mp_hands, _mp_pose

# Landmarks indices around both eyes (approx.)
_EYE_IDXS = [
    33, 246, 161, 160, 159, 158, 157, 173, 133, 7, 163, 144, 145, 153,
    362, 398, 384, 385, 386, 387, 388, 466, 263, 249, 390, 373, 374, 380
]

# MediaPipe Hands and Pose instances (more lenient settings)
_mp_hands = mp.solutions.hands.Hands(
    static_image_mode=True, 
    max_num_hands=2,
    min_detection_confidence=0.3,  # Lower from default 0.5
    min_tracking_confidence=0.3    # Lower from default 0.5
)
_mp_pose = mp.solutions.pose.Pose(
    static_image_mode=True,
    min_detection_confidence=0.3,  # Lower from default 0.5
    min_tracking_confidence=0.3,   # Lower from default 0.5
    model_complexity=1             # Use lighter model for better performance
)


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _decode_image(data_url: str) -> Image.Image:
    """Convert a base-64 data-URL string to a PIL Image."""

    # Expected format: "data:image/jpeg;base64,<encoded>"
    if "," in data_url:
        _, b64 = data_url.split(",", 1)
    else:
        b64 = data_url
    try:
        byte_data = base64.b64decode(b64)
        return Image.open(BytesIO(byte_data)).convert("RGB")
    except Exception as exc:
        raise ValueError(f"Invalid base64 image: {exc}") from exc


def _frames_to_tensor(frames: List[str]) -> torch.Tensor:
    """Turn list of base64 images into (T, C, H, W) float tensor."""

    tensors = []
    for f in frames:
        try:
            img = _decode_image(f)
            tensors.append(_IMAGE_TF(img))
        except Exception:
            continue
    if not tensors:
        raise ValueError("No valid images provided")
    return torch.stack(tensors, dim=0)  # (T, 3, H, W)


def _eye_crop(img: Image.Image) -> Image.Image | None:
    """Return a 64×64 crop that covers both eyes or None if no face."""
    
    mp_face_mesh, _, _ = get_mediapipe_models()
    if mp_face_mesh is None:
        print("MediaPipe not available for eye crop", file=sys.stderr)
        return None

    rgb = np.array(img)  # PIL to numpy RGB
    results = mp_face_mesh.process(rgb)
    if not results.multi_face_landmarks:
        print(f"No face detected in frame (size: {img.size})", file=sys.stderr)
        return None

    h, w, _ = rgb.shape
    xs, ys = [], []
    for lm_idx in _EYE_IDXS:
        lm = results.multi_face_landmarks[0].landmark[lm_idx]
        xs.append(lm.x * w)
        ys.append(lm.y * h)

    x_min, x_max = max(min(xs) - 10, 0), min(max(xs) + 10, w)
    y_min, y_max = max(min(ys) - 10, 0), min(max(ys) + 10, h)

    if x_max - x_min < 10 or y_max - y_min < 10:
        return None

    crop = rgb[int(y_min): int(y_max), int(x_min): int(x_max)]
    if crop.size == 0:
        return None
    crop_pil = Image.fromarray(crop)
    return crop_pil


def _hand_crop(img: Image.Image) -> Image.Image | None:
    """Return crop around first detected hand suitable for tapping models."""

    _, mp_hands, _ = get_mediapipe_models()
    if mp_hands is None:
        print("MediaPipe not available for hand crop", file=sys.stderr)
        return None

    rgb = np.array(img)
    results = mp_hands.process(rgb)
    if not results.multi_hand_landmarks:
        print(f"No hands detected in frame (size: {img.size})", file=sys.stderr)
        return None

    h, w, _ = rgb.shape
    xs, ys = [], []
    for lm in results.multi_hand_landmarks[0].landmark:
        xs.append(lm.x * w)
        ys.append(lm.y * h)

    x_min, x_max = max(min(xs) - 10, 0), min(max(xs) + 10, w)
    y_min, y_max = max(min(ys) - 10, 0), min(max(ys) + 10, h)
    if x_max - x_min < 10 or y_max - y_min < 10:
        return None
    crop = rgb[int(y_min): int(y_max), int(x_min): int(x_max)]
    if crop.size == 0:
        return None
    return Image.fromarray(crop)


def _foot_crop(img: Image.Image) -> Image.Image | None:
    """Return crop around feet region using Pose landmarks (ankles)."""

    _, _, mp_pose = get_mediapipe_models()
    if mp_pose is None:
        print("MediaPipe not available for foot crop", file=sys.stderr)
        return None

    rgb = np.array(img)
    results = mp_pose.process(rgb)
    if not results.pose_landmarks:
        print(f"No pose detected in frame (size: {img.size})", file=sys.stderr)
        return None

    h, w, _ = rgb.shape
    # ankle indices 27 (left) and 28 (right)
    ankles = [results.pose_landmarks.landmark[i] for i in (27, 28)]
    xs = [a.x * w for a in ankles]
    ys = [a.y * h for a in ankles]
    x_min, x_max = max(min(xs) - 20, 0), min(max(xs) + 20, w)
    y_min, y_max = max(min(ys) - 20, 0), min(max(ys) + 20, h)
    if x_max - x_min < 10 or y_max - y_min < 10:
        return None
    crop = rgb[int(y_min): int(y_max), int(x_min): int(x_max)]
    if crop.size == 0:
        return None
    return Image.fromarray(crop)


def _pose_xy(img: Image.Image) -> List[float] | None:
    """Extract 33 pose landmarks as flat (x,y) sequence for sit-stand."""

    _, _, mp_pose = get_mediapipe_models()
    if mp_pose is None:
        print("MediaPipe not available for pose", file=sys.stderr)
        return None

    rgb = np.array(img)
    results = mp_pose.process(rgb)
    if not results.pose_landmarks:
        return None
    landmarks = []
    for lm in results.pose_landmarks.landmark:
        landmarks.extend([lm.x, lm.y])
    return landmarks[:66]  # 33 landmarks * 2 coords


def _predict(behavior: str, data: Any) -> Dict[str, Any]:
    """Main prediction logic — must return JSON-serializable dict."""

    try:
        models = get_models()
        print(f"Starting prediction for behavior: {behavior}", file=sys.stderr)
        
        # Add timeout to prevent hanging (Unix only)
        try:
            import signal
            
            def timeout_handler(signum, frame):
                raise TimeoutError("Prediction timed out")
            
            # Set 30 second timeout (only works on Unix)
            if hasattr(signal, 'SIGALRM'):
                signal.signal(signal.SIGALRM, timeout_handler)
                signal.alarm(30)
                
                try:
                    result = _predict_internal(behavior, data, models)
                    signal.alarm(0)  # Cancel timeout
                    return result
                except TimeoutError:
                    print("Prediction timed out after 30 seconds", file=sys.stderr)
                    return {
                        "predicted_score": 0.3,
                        "confidence": 0.5,
                        "status": "timeout",
                        "message": "Prediction timed out, using fallback"
                    }
            else:
                # Windows doesn't support SIGALRM, just run without timeout
                return _predict_internal(behavior, data, models)
                
        except ImportError:
            # No signal module, just run without timeout
            return _predict_internal(behavior, data, models)
            
    except Exception as e:
        print(f"Error in prediction: {e}", file=sys.stderr)
        return {
            "predicted_score": 0.3,
            "confidence": 0.5,
            "status": "error",
            "message": f"Prediction failed: {str(e)}"
        }


def _predict_internal(behavior: str, data: Any, models: Dict) -> Dict[str, Any]:
    """Internal prediction with model inference."""
    
    # For demo purposes, use simple random predictions if models fail
    import random
    fallback_result = {
        "predicted_score": random.uniform(0.1, 0.9),
        "confidence": random.uniform(0.6, 0.95),
        "status": "success",
        "message": "Demo prediction (random)"
    }

    # 1. rapid_talking: expects list of audio samples or frame count
    if behavior == "rapid_talking":
        if not isinstance(data, (list, int, float)):
            return fallback_result
            
        # Extract features (simple demo)
        if isinstance(data, list):
            feature = len(data)  # number of audio frames
        else:
            feature = float(data)
            
        # Simple threshold for demo
        score = min(feature / 100.0, 1.0) if feature > 0 else 0.1
        
        return {
            "predicted_score": score,
            "confidence": 0.8,
            "status": "success",
            "feature_count": feature,
            "message": "Audio analysis complete"
        }

    # 2. eye_gaze: expects list of base64 image strings
    elif behavior == "eye_gaze":
        if not isinstance(data, list) or not data:
            return fallback_result
            
        try:
            # Process images
            valid_crops = 0
            for frame_data in data[:10]:  # Limit to first 10 frames
                try:
                    img = _decode_image(frame_data)
                    crop = _eye_crop(img)
                    if crop is not None:
                        valid_crops += 1
                except Exception as e:
                    print(f"Error processing frame: {e}", file=sys.stderr)
                    continue
                    
            # Simple scoring based on detected eye regions
            score = min(valid_crops / len(data), 1.0) if data else 0.1
            
            return {
                "predicted_score": score,
                "confidence": 0.75,
                "status": "success",
                "frames_processed": len(data),
                "valid_detections": valid_crops,
                "message": "Eye gaze analysis complete"
            }
            
        except Exception as e:
            print(f"Eye gaze processing error: {e}", file=sys.stderr)
            return fallback_result

    # 3. sit_stand: expects list of base64 image strings
    elif behavior == "sit_stand":
        if not isinstance(data, list) or not data:
            return fallback_result
            
        try:
            # Extract pose features
            pose_detections = 0
            for frame_data in data[:10]:  # Limit processing
                try:
                    img = _decode_image(frame_data)
                    pose_xy = _pose_xy(img)
                    if pose_xy is not None:
                        pose_detections += 1
                except Exception as e:
                    print(f"Error processing frame: {e}", file=sys.stderr)
                    continue
                    
            score = min(pose_detections / len(data), 1.0) if data else 0.1
            
            return {
                "predicted_score": score,
                "confidence": 0.7,
                "status": "success", 
                "frames_processed": len(data),
                "pose_detections": pose_detections,
                "message": "Sit-stand analysis complete"
            }
            
        except Exception as e:
            print(f"Sit-stand processing error: {e}", file=sys.stderr)
            return fallback_result

    # 4. tapping_hands: expects list of base64 image strings  
    elif behavior == "tapping_hands":
        if not isinstance(data, list) or not data:
            return fallback_result
            
        try:
            hand_detections = 0
            for frame_data in data[:10]:  # Limit processing
                try:
                    img = _decode_image(frame_data)
                    hand_crop = _hand_crop(img)
                    if hand_crop is not None:
                        hand_detections += 1
                except Exception as e:
                    print(f"Error processing frame: {e}", file=sys.stderr)
                    continue
                    
            score = min(hand_detections / len(data), 1.0) if data else 0.1
            
            return {
                "predicted_score": score,
                "confidence": 0.8,
                "status": "success",
                "frames_processed": len(data),
                "hand_detections": hand_detections,
                "message": "Hand tapping analysis complete"
            }
            
        except Exception as e:
            print(f"Hand tapping processing error: {e}", file=sys.stderr)
            return fallback_result

    # 5. tapping_feet: expects list of base64 image strings
    elif behavior == "tapping_feet":
        if not isinstance(data, list) or not data:
            return fallback_result
            
        try:
            foot_detections = 0
            for frame_data in data[:10]:  # Limit processing
                try:
                    img = _decode_image(frame_data)
                    foot_crop = _foot_crop(img)
                    if foot_crop is not None:
                        foot_detections += 1
                except Exception as e:
                    print(f"Error processing frame: {e}", file=sys.stderr)
                    continue
                    
            score = min(foot_detections / len(data), 1.0) if data else 0.1
            
            return {
                "predicted_score": score,
                "confidence": 0.75,
                "status": "success",
                "frames_processed": len(data),
                "foot_detections": foot_detections,
                "message": "Foot tapping analysis complete"
            }
            
        except Exception as e:
            print(f"Foot tapping processing error: {e}", file=sys.stderr)
            return fallback_result

    else:
        return {
            "predicted_score": 0.0,
            "confidence": 0.0,
            "status": "error",
            "message": f"Unknown behavior type: {behavior}"
        }


# ---------------------------------------------------------------------------
# Main entry
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="Run ML analysis on behaviour data")
    parser.add_argument("--data", required=True, help="Path to JSON file containing input data")
    parser.add_argument("--behavior", required=True, help="Behavior type (e.g. eye_gaze)")

    args = parser.parse_args()

    if not os.path.exists(args.data):
        print(json.dumps({"error": f"Data file not found: {args.data}"}), file=sys.stderr)
        sys.exit(1)

    try:
        with open(args.data, "r", encoding="utf-8") as fp:
            payload = json.load(fp)
    except Exception as exc:
        print(json.dumps({"error": f"Failed to read input file: {exc}"}), file=sys.stderr)
        sys.exit(1)

    # Extract behaviour-specific data from payload; the controller wrapped it
    data = payload.get(args.behavior, payload)

    result = _predict(args.behavior, data)

    # Output **only** JSON on stdout so Node.js can parse it directly
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        # Ensure any unexpected errors are surfaced correctly to Node (stderr)
        print(str(e), file=sys.stderr)
        sys.exit(1) 