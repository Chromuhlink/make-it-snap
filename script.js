const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
const captureBtn = document.getElementById('capture-btn');
const captureMessage = document.getElementById('capture-message');
const saveControls = document.getElementById('save-controls');
const countdownDisplay = document.getElementById('countdown-display');
const ctx = canvas.getContext('2d');
const overlayCtx = overlayCanvas.getContext('2d');

let stream = null;
let modelsLoaded = false;
let detectionInterval = null;
let shutterAudio = null;
let countdownTimer = null;
let isCountingDown = false;

function createShutterSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
}

async function loadModels() {
    try {
        console.log('Loading face-api.js models...');
        // Load models from the working CDN
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        
        modelsLoaded = true;
        console.log('Face-api.js models loaded successfully');
    } catch (error) {
        console.error('Error loading face-api.js models:', error);
        alert('Failed to load face detection models. Please check your internet connection and reload the page.');
    }
}

async function startCamera() {
    try {
        // Ensure countdown is hidden on startup
        countdownDisplay.style.display = 'none';
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });
        
        video.srcObject = stream;
        captureBtn.disabled = false;
        
        // Wait for video to be fully loaded
        video.addEventListener('loadedmetadata', async () => {
            console.log('Video loaded, dimensions:', video.videoWidth, 'x', video.videoHeight);
            
            // Set canvas dimensions to match video
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            // Load models after video is ready
            await loadModels();
            
            // Wait a bit more to ensure video is playing
            setTimeout(() => {
                if (modelsLoaded) {
                    console.log('Starting smile detection...');
                    startSmileDetection();
                } else {
                    console.error('Models not loaded, cannot start smile detection');
                }
            }, 1000);
        });
    } catch (error) {
        console.error('Error accessing camera:', error);
        alert('Unable to access camera. Please ensure you have granted camera permissions.');
    }
}

async function capturePhoto() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    video.style.display = 'none';
    canvas.style.display = 'block';
    overlayCanvas.style.display = 'none';
    captureBtn.style.display = 'none';
    
    captureMessage.style.display = 'block';
    saveControls.style.display = 'block';
    
    // Auto-upload to gallery
    await uploadToGallery();
    
    setTimeout(() => {
        captureMessage.style.display = 'none';
    }, 2000);
    
    // Auto-exit after 6 seconds
    setTimeout(() => {
        resetCamera();
    }, 6000);
}

function resetCamera() {
    canvas.style.display = 'none';
    video.style.display = 'block';
    overlayCanvas.style.display = 'block';
    captureBtn.style.display = 'block';
    captureBtn.textContent = 'Capture Photo';
    captureBtn.onclick = capturePhoto;
    saveControls.style.display = 'none';
    captureMessage.style.display = 'none';
    countdownDisplay.style.display = 'none';
    
    // Reset countdown state
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    isCountingDown = false;
    
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    
    if (modelsLoaded && !detectionInterval) {
        startSmileDetection();
    }
}

async function detectSmile() {
    if (!modelsLoaded || video.readyState !== 4) {
        console.log('Not ready for detection:', { modelsLoaded, videoReady: video.readyState === 4 });
        return;
    }
    
    try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
        })).withFaceExpressions();
        
        // Clear the overlay canvas
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        if (detections.length > 0) {
            console.log('Face detected:', detections.length);
            const detection = detections[0];
            const expressions = detection.expressions;
            const happiness = expressions.happy;
            
            // Draw detection box with color gradient
            const box = detection.detection.box;
            
            // Determine color based on happiness level
            let boxColor;
            if (happiness < 0.25) {
                boxColor = '#0080ff'; // Blue for low happiness
            } else if (happiness < 0.5) {
                boxColor = '#ffff00'; // Yellow for medium happiness
            } else if (happiness < 0.95) {
                boxColor = '#ff0000'; // Red for high happiness (getting close)
            } else {
                boxColor = '#00ff00'; // Green when hitting the mark
            }
            
            overlayCtx.strokeStyle = boxColor;
            overlayCtx.lineWidth = 3;
            overlayCtx.strokeRect(
                box.x,
                box.y,
                box.width,
                box.height
            );
            
            // Draw happiness text with matching color
            overlayCtx.fillStyle = boxColor;
            overlayCtx.font = 'bold 16px Arial';
            overlayCtx.fillText(
                `Happiness: ${Math.round(happiness * 100)}%`,
                box.x,
                box.y - 10
            );
            
            // Draw a small progress bar under the text
            const barWidth = 100;
            const barHeight = 6;
            const barX = box.x;
            const barY = box.y - 25;
            
            // Background of progress bar
            overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            overlayCtx.fillRect(barX, barY, barWidth, barHeight);
            
            // Fill based on happiness level
            overlayCtx.fillStyle = boxColor;
            overlayCtx.fillRect(barX, barY, barWidth * happiness, barHeight);
            
            // Add threshold marker at 95%
            overlayCtx.strokeStyle = '#ffffff';
            overlayCtx.lineWidth = 2;
            overlayCtx.beginPath();
            overlayCtx.moveTo(barX + (barWidth * 0.95), barY - 2);
            overlayCtx.lineTo(barX + (barWidth * 0.95), barY + barHeight + 2);
            overlayCtx.stroke();
            
            console.log(`Happiness level: ${happiness.toFixed(2)}`);
            
            // Handle countdown logic
            if (happiness > 0.95) {
                if (!isCountingDown) {
                    console.log('Smile detected! Starting countdown...');
                    startCountdown();
                }
                // Continue monitoring during countdown
            } else if (isCountingDown) {
                // Cancel countdown if happiness drops below threshold
                cancelCountdown();
            }
        } else {
            console.log('No faces detected');
            // Cancel countdown if face is lost
            if (isCountingDown) {
                cancelCountdown();
            }
        }
    } catch (error) {
        console.error('Error during face detection:', error);
    }
}

function startSmileDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    // Run detection more frequently for better responsiveness
    detectionInterval = setInterval(detectSmile, 300);
    console.log('Smile detection interval started');
}

function stopSmileDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
        console.log('Smile detection stopped');
    }
}

function startCountdown() {
    if (isCountingDown) return;
    
    isCountingDown = true;
    // Don't stop smile detection - we need to monitor happiness during countdown
    
    let count = 3;
    countdownDisplay.textContent = count;
    countdownDisplay.style.display = 'flex'; // Show countdown when threshold is reached
    
    // Initial pulse animation
    countdownDisplay.style.animation = 'pulse 0.5s ease-in-out';
    
    countdownTimer = setInterval(() => {
        count--;
        if (count > 0) {
            countdownDisplay.textContent = count;
            // Add pulse animation by removing and re-adding the class
            countdownDisplay.style.animation = 'none';
            setTimeout(() => {
                countdownDisplay.style.animation = 'pulse 0.5s ease-in-out';
            }, 10);
        } else {
            clearInterval(countdownTimer);
            countdownDisplay.style.display = 'none';
            stopSmileDetection(); // Stop detection only when capturing
            autoCapture();
        }
    }, 1000);
}

function cancelCountdown() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    isCountingDown = false;
    
    // Show brief red flash to indicate cancellation
    countdownDisplay.style.background = 'rgba(255, 0, 0, 0.9)';
    countdownDisplay.textContent = '✗';
    
    setTimeout(() => {
        countdownDisplay.style.display = 'none';
        countdownDisplay.style.background = 'rgba(0, 255, 0, 0.9)'; // Reset to green for next time
    }, 300);
    
    console.log('Countdown cancelled - happiness dropped below threshold');
}

function autoCapture() {
    createShutterSound();
    capturePhoto();
    isCountingDown = false;
}

async function uploadToGallery() {
    try {
        // Convert canvas to base64
        const imageData = canvas.toDataURL('image/png');
        
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Photo uploaded to gallery:', result.url);
            // Silently refresh gallery
            fetchGallery();
        } else {
            console.error('Upload failed:', result.error);
        }
    } catch (error) {
        console.error('Upload error:', error);
    }
}

function downloadPhoto() {
    const imageData = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `photo-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    link.href = imageData;
    link.click();
}

function handleKeyPress(event) {
    if (saveControls.style.display === 'block') {
        if (event.key.toLowerCase() === 'd') {
            downloadPhoto();
        } else if (event.key.toLowerCase() === 'e') {
            resetCamera();
        }
    }
}

// Gallery functionality
let galleryRefreshInterval = null;

async function fetchGallery() {
    try {
        const response = await fetch('/api/gallery');
        const data = await response.json();
        
        if (data.success) {
            displayGallery(data.photos);
            updateGalleryInfo(data.count);
        } else {
            console.error('Gallery fetch failed:', data.error);
            showGalleryError();
        }
    } catch (error) {
        console.error('Gallery fetch error:', error);
        showGalleryError();
    }
}

function displayGallery(photos) {
    const galleryGrid = document.getElementById('gallery-grid');
    
    if (photos.length === 0) {
        galleryGrid.innerHTML = '<div class="gallery-empty">No photos yet! Take your first snap! 📸</div>';
        return;
    }
    
    galleryGrid.innerHTML = photos.map(photo => `
        <div class="gallery-item" onclick="openPhoto('${photo.url}')">
            <img src="${photo.url}" alt="${photo.filename}" loading="lazy">
            <div class="photo-info">
                <div>${new Date(photo.uploadedAt).toLocaleDateString()}</div>
                <div>${new Date(photo.uploadedAt).toLocaleTimeString()}</div>
            </div>
        </div>
    `).join('');
}

function updateGalleryInfo(count) {
    const photoCount = document.getElementById('photo-count');
    const lastUpdated = document.getElementById('last-updated');
    
    photoCount.textContent = `${count} photo${count !== 1 ? 's' : ''}`;
    lastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
}

function showGalleryError() {
    const galleryGrid = document.getElementById('gallery-grid');
    galleryGrid.innerHTML = '<div class="gallery-loading">Failed to load photos. Retrying...</div>';
}

function openPhoto(url) {
    window.open(url, '_blank');
}

function startGalleryAutoRefresh() {
    // Initial load
    fetchGallery();
    
    // Silent auto-refresh every 10 seconds
    galleryRefreshInterval = setInterval(() => {
        fetchGallery();
    }, 10000);
}

captureBtn.addEventListener('click', capturePhoto);
document.addEventListener('keydown', handleKeyPress);

startCamera();
startGalleryAutoRefresh();