const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureBtn = document.getElementById('capture-btn');
const ctx = canvas.getContext('2d');

let stream = null;
let modelsLoaded = false;
let detectionInterval = null;

async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights');
        modelsLoaded = true;
        console.log('Face-api.js models loaded');
    } catch (error) {
        console.error('Error loading face-api.js models:', error);
    }
}

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 },
            audio: false
        });
        
        video.srcObject = stream;
        captureBtn.disabled = false;
        
        await loadModels();
        if (modelsLoaded) {
            startSmileDetection();
        }
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
}

function capturePhoto() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    video.style.display = 'none';
    canvas.style.display = 'block';
    captureBtn.textContent = 'Take Another Photo';
    captureBtn.onclick = resetCamera;
}

function resetCamera() {
    canvas.style.display = 'none';
    video.style.display = 'block';
    captureBtn.textContent = 'Capture Photo';
    captureBtn.onclick = capturePhoto;
    
    if (modelsLoaded && !detectionInterval) {
        startSmileDetection();
    }
}

async function detectSmile() {
    if (!modelsLoaded || video.readyState !== 4) return;
    
    try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
        
        if (detections.length > 0) {
            const expressions = detections[0].expressions;
            const happiness = expressions.happy;
            
            console.log(`Happiness level: ${happiness.toFixed(2)}`);
            
            if (happiness > 0.8) {
                console.log('Smile detected! Auto-capturing...');
                autoCapture();
            }
        }
    } catch (error) {
        console.error('Error detecting smile:', error);
    }
}

function startSmileDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    detectionInterval = setInterval(detectSmile, 500);
    console.log('Smile detection started');
}

function stopSmileDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
        console.log('Smile detection stopped');
    }
}

function autoCapture() {
    stopSmileDetection();
    capturePhoto();
}

captureBtn.addEventListener('click', capturePhoto);

startCamera();