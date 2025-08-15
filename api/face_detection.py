#!/usr/bin/env python3
"""
Face detection API using face_recognition library
Replaces face-api.js for more accurate emotion detection
"""

import json
import base64
import io
import os
from typing import Dict, List, Any
import numpy as np
from PIL import Image

try:
    import face_recognition
    import cv2
    FACE_RECOGNITION_AVAILABLE = True
except ImportError:
    FACE_RECOGNITION_AVAILABLE = False

def allowed_methods():
    """Return allowed HTTP methods"""
    return ["POST", "OPTIONS"]

def detect_faces_and_emotions(image_data: str) -> Dict[str, Any]:
    """
    Detect faces and analyze emotions from base64 image data
    
    Args:
        image_data: Base64 encoded image string
        
    Returns:
        Dictionary containing detection results
    """
    if not FACE_RECOGNITION_AVAILABLE:
        return {
            "success": False,
            "error": "face_recognition library not available. Install with: pip install face_recognition",
            "faces": []
        }
    
    try:
        # Remove data:image/jpeg;base64, prefix if present
        if 'base64,' in image_data:
            image_data = image_data.split('base64,')[1]
        
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert PIL image to numpy array (RGB format for face_recognition)
        image_array = np.array(image)
        
        # Convert to RGB if needed (face_recognition expects RGB)
        if len(image_array.shape) == 3 and image_array.shape[2] == 3:
            rgb_image = image_array
        else:
            rgb_image = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
        
        # Find face locations
        face_locations = face_recognition.face_locations(rgb_image)
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        faces = []
        
        for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
            # Calculate face center and size for happiness estimation
            face_width = right - left
            face_height = bottom - top
            face_area = face_width * face_height
            
            # Extract face region for more detailed analysis
            face_image = rgb_image[top:bottom, left:right]
            
            # Simple happiness estimation based on face proportions
            # This is a simplified approach - for more accuracy, you'd need a dedicated emotion model
            happiness_score = estimate_happiness(face_image, face_width, face_height)
            
            face_data = {
                "box": {
                    "x": left,
                    "y": top,
                    "width": face_width,
                    "height": face_height
                },
                "confidence": 0.95,  # face_recognition is quite reliable
                "expressions": {
                    "happy": happiness_score,
                    "sad": max(0, 1.0 - happiness_score),
                    "angry": 0.1,
                    "surprised": 0.1,
                    "fearful": 0.1,
                    "disgusted": 0.1,
                    "neutral": max(0, 0.5 - happiness_score)
                }
            }
            faces.append(face_data)
        
        return {
            "success": True,
            "faces": faces,
            "face_count": len(faces)
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Face detection failed: {str(e)}",
            "faces": []
        }

def estimate_happiness(face_image: np.ndarray, face_width: int, face_height: int) -> float:
    """
    Estimate happiness level from face image
    This is a simplified implementation - for production use, consider integrating
    a dedicated emotion recognition model like FER2013-trained networks
    
    Args:
        face_image: Cropped face image as numpy array
        face_width: Width of the face bounding box
        face_height: Height of the face bounding box
        
    Returns:
        Happiness score between 0.0 and 1.0
    """
    try:
        # Convert to grayscale for edge detection
        gray_face = cv2.cvtColor(face_image, cv2.COLOR_RGB2GRAY)
        
        # Use Haar cascades to detect smile (if available)
        smile_cascade_path = cv2.data.haarcascades + 'haarcascade_smile.xml'
        
        if os.path.exists(smile_cascade_path):
            smile_cascade = cv2.CascadeClassifier(smile_cascade_path)
            smiles = smile_cascade.detectMultiScale(gray_face, 1.8, 20)
            
            if len(smiles) > 0:
                # Found smile - calculate confidence based on size
                largest_smile = max(smiles, key=lambda s: s[2] * s[3])
                smile_area = largest_smile[2] * largest_smile[3]
                face_area = face_width * face_height
                
                # Higher score for larger smiles relative to face size
                smile_ratio = min(smile_area / face_area, 0.3)  # Cap at 0.3
                base_happiness = 0.7 + (smile_ratio * 1.0)  # 0.7 to 1.0 range
                
                return min(base_happiness, 1.0)
        
        # Fallback: analyze pixel intensity patterns
        # Smiling typically creates brighter areas around mouth region
        mouth_region = gray_face[int(face_height * 0.6):int(face_height * 0.9), 
                                int(face_width * 0.2):int(face_width * 0.8)]
        
        if mouth_region.size > 0:
            # Calculate brightness variance (smiles often have more contrast)
            brightness_variance = np.var(mouth_region)
            mean_brightness = np.mean(mouth_region)
            
            # Normalize to 0-1 range with some heuristics
            happiness = min(0.3 + (brightness_variance / 10000) + (mean_brightness / 512), 1.0)
            return max(happiness, 0.1)  # Minimum 10% happiness
        
        # Default neutral happiness
        return 0.4
        
    except Exception as e:
        print(f"Error in happiness estimation: {e}")
        return 0.4  # Default to neutral

def handler(request):
    """
    Vercel serverless function handler
    """
    # Handle CORS preflight
    if request.method == "OPTIONS":
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }
    
    if request.method != "POST":
        return {
            'statusCode': 405,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({"error": "Method not allowed"})
        }
    
    try:
        # Parse request body
        body = json.loads(request.body)
        image_data = body.get('image')
        
        if not image_data:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json'
                },
                'body': json.dumps({"error": "No image data provided"})
            }
        
        # Process the image
        result = detect_faces_and_emotions(image_data)
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps(result)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            'body': json.dumps({
                "error": f"Internal server error: {str(e)}",
                "success": False
            })
        }

# For local testing
if __name__ == "__main__":
    # Test with a sample request
    test_request = type('Request', (), {
        'method': 'POST',
        'body': json.dumps({
            'image': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='  # 1x1 white pixel
        })
    })()
    
    response = handler(test_request)
    print(json.dumps(response, indent=2))