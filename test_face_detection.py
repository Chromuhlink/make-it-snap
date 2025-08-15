#!/usr/bin/env python3
"""
Test script for face_recognition backend
"""

import sys
import os
import json
from pathlib import Path

# Add the api directory to the path so we can import our module
sys.path.append(str(Path(__file__).parent / 'api'))

try:
    from face_detection import detect_faces_and_emotions, handler
    print("✓ Successfully imported face_detection module")
except ImportError as e:
    print(f"✗ Failed to import face_detection module: {e}")
    print("Make sure you have installed the required dependencies:")
    print("pip install face_recognition opencv-python pillow numpy")
    sys.exit(1)

def test_basic_functionality():
    """Test basic functionality with a minimal image"""
    print("\n=== Testing Basic Functionality ===")
    
    # Create a minimal test image (1x1 pixel PNG in base64)
    test_image_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    
    result = detect_faces_and_emotions(test_image_b64)
    print(f"Result: {json.dumps(result, indent=2)}")
    
    if result['success']:
        print("✓ Function executed successfully")
        print(f"✓ Detected {len(result['faces'])} faces")
    else:
        print(f"✗ Function failed: {result.get('error', 'Unknown error')}")
    
    return result['success']

def test_api_handler():
    """Test the Vercel handler function"""
    print("\n=== Testing API Handler ===")
    
    # Mock request object
    class MockRequest:
        def __init__(self, method, body):
            self.method = method
            self.body = body
    
    # Test POST request
    test_request = MockRequest(
        method="POST", 
        body=json.dumps({
            'image': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        })
    )
    
    response = handler(test_request)
    print(f"Response status: {response['statusCode']}")
    print(f"Response body: {response['body']}")
    
    success = response['statusCode'] == 200
    if success:
        print("✓ API handler working correctly")
    else:
        print("✗ API handler failed")
    
    return success

def test_options_request():
    """Test CORS preflight request"""
    print("\n=== Testing CORS Preflight ===")
    
    class MockRequest:
        def __init__(self, method):
            self.method = method
    
    options_request = MockRequest("OPTIONS")
    response = handler(options_request)
    
    success = response['statusCode'] == 200
    has_cors_headers = 'Access-Control-Allow-Origin' in response['headers']
    
    if success and has_cors_headers:
        print("✓ CORS preflight working correctly")
        return True
    else:
        print("✗ CORS preflight failed")
        return False

def check_dependencies():
    """Check if all required Python packages are available"""
    print("\n=== Checking Dependencies ===")
    
    dependencies = {
        'face_recognition': 'face_recognition',
        'cv2': 'opencv-python', 
        'PIL': 'Pillow',
        'numpy': 'numpy'
    }
    
    all_available = True
    
    for module, package in dependencies.items():
        try:
            __import__(module)
            print(f"✓ {package} is available")
        except ImportError:
            print(f"✗ {package} is missing - install with: pip install {package}")
            all_available = False
    
    return all_available

def main():
    """Run all tests"""
    print("Face Recognition Backend Test Suite")
    print("=" * 40)
    
    # Check dependencies first
    deps_ok = check_dependencies()
    if not deps_ok:
        print("\n❌ Some dependencies are missing. Please install them first.")
        return
    
    # Run functionality tests
    tests = [
        test_basic_functionality,
        test_api_handler,
        test_options_request
    ]
    
    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"✗ Test failed with exception: {e}")
            results.append(False)
    
    # Summary
    print("\n" + "=" * 40)
    print("TEST SUMMARY")
    print("=" * 40)
    
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"🎉 All {total} tests passed!")
        print("\nYour face_recognition backend is ready to use!")
        print("\nNext steps:")
        print("1. Deploy to Vercel with: vercel deploy")
        print("2. Test the frontend integration")
    else:
        print(f"❌ {total - passed} out of {total} tests failed")
        print("\nPlease fix the issues above before proceeding.")

if __name__ == "__main__":
    main()