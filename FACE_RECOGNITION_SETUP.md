# Face Recognition Migration Guide

This guide explains how to set up the new Python face_recognition backend that replaces face-api.js.

## What Changed

- **Old**: face-api.js running in the browser
- **New**: Python face_recognition library running on the server
- **Benefits**: More accurate detection, better performance, reduced client-side load

## Installation Steps

### 1. Install Python Dependencies

For local development:

```bash
# Install Python dependencies
pip install face_recognition opencv-python pillow numpy

# For macOS users, you might need:
brew install cmake
```

### 2. Test Local Setup

```bash
# Run the test script
python test_face_detection.py
```

This will verify that all dependencies are working correctly.

### 3. Deploy to Vercel

The `vercel.json` has been updated to support Python functions. Simply deploy:

```bash
vercel deploy
```

Vercel will automatically install the Python dependencies from `requirements.txt`.

## Key Changes Made

### Frontend (script.js)
- Removed face-api.js dependency
- Added API calls to `/api/face_detection`
- Captures video frames and sends them to the backend
- Processes results in the same format as before

### Backend (api/face_detection.py)
- New Python endpoint for face detection
- Uses face_recognition library for accurate detection
- Includes emotion estimation based on facial features
- Returns compatible JSON format

### Configuration
- Updated `vercel.json` to include Python runtime
- Added `requirements.txt` for Python dependencies
- Removed face-api.js CDN link from HTML

## Troubleshooting

### Common Issues

1. **"face_recognition library not available"**
   - Install with: `pip install face_recognition`
   - On Windows, consider using WSL or Docker

2. **"dlib compilation failed"**
   - Install cmake: `brew install cmake` (macOS) or `apt-get install cmake` (Linux)
   - Consider using pre-compiled wheels

3. **API timeout on Vercel**
   - The function timeout is set to 30 seconds
   - Large images may take longer to process

### Performance Tips

1. **Image Quality**: The frontend sends JPEG at 80% quality to balance speed vs accuracy
2. **Detection Frequency**: Currently runs every 300ms - adjust if needed
3. **Memory Usage**: Set to 1024MB in vercel.json for face processing

## Development vs Production

### Local Development
```bash
# Start local server
python -m http.server 3000 --directory public

# Test face detection API separately
python test_face_detection.py
```

### Production (Vercel)
- Python functions run in serverless environment
- Dependencies auto-installed from requirements.txt
- CORS headers automatically configured

## API Endpoint Details

### POST /api/face_detection

**Request:**
```json
{
  "image": "data:image/jpeg;base64,..."
}
```

**Response:**
```json
{
  "success": true,
  "faces": [
    {
      "box": {"x": 100, "y": 50, "width": 150, "height": 200},
      "confidence": 0.95,
      "expressions": {
        "happy": 0.85,
        "sad": 0.05,
        "neutral": 0.10
      }
    }
  ],
  "face_count": 1
}
```

## Next Steps

1. Test the implementation locally
2. Deploy to Vercel
3. Verify the frontend works with the new backend
4. Monitor performance and adjust settings as needed

For issues or improvements, check the console logs in both frontend and backend.