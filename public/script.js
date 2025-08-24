const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlayCanvas = document.getElementById('overlay-canvas');
const captureBtn = document.getElementById('capture-btn');
const captureMessage = document.getElementById('capture-message');
const saveControls = document.getElementById('save-controls');
const countdownDisplay = document.getElementById('countdown-display');
const timerDisplay = document.getElementById('timer-display');
const startCameraBtn = document.getElementById('start-camera-btn');
const ctx = canvas.getContext('2d');
const overlayCtx = overlayCanvas.getContext('2d');

let stream = null;
let modelsLoaded = false;
let detectionInterval = null;
let shutterAudio = null;
let countdownTimer = null;
let isCountingDown = false;
let cameraTimer = null;
let cameraTimeRemaining = 20;
let cameraActive = false;

// Wallet-gated Play button state
function updatePlayButtonState() {
    if (!startCameraBtn) return;
    const connected = !!(window.walletState && window.walletState.isConnected);
    const ready = !!modelsLoaded;
    startCameraBtn.disabled = !(connected && ready);
    if (!connected) {
        startCameraBtn.textContent = 'Connect Wallet to Play';
    } else if (!ready) {
        startCameraBtn.textContent = 'Loading Face Models…';
    } else {
        startCameraBtn.textContent = 'Press Play';
    }
}

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
        console.log('Models: Starting face-api.js model loading...');
        
        // Check if face-api is available
        if (typeof faceapi === 'undefined') {
            throw new Error('face-api.js library not loaded');
        }
        
        console.log('Models: face-api.js library found');
        
        // Try multiple CDN sources for better reliability
        const MODEL_URLS = [
            'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights',
            'https://justadudewhohacks.github.io/face-api.js/models',
            '/models' // Fallback to local if you host them
        ];
        
        let modelLoaded = false;
        let lastError = null;
        
        for (const MODEL_URL of MODEL_URLS) {
            try {
                console.log(`Models: Trying to load from ${MODEL_URL}...`);
                console.log('Models: Loading tiny face detector...');
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                console.log('Models: Tiny face detector loaded');
                console.log('Models: Loading face expression net...');
                await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
                console.log('Models: Face expression net loaded');
                modelLoaded = true;
                break;
            } catch (err) {
                console.error(`Models: Failed to load from ${MODEL_URL}:`, err);
                lastError = err;
            }
        }

        if (!modelLoaded) {
            throw lastError || new Error('Failed to load models from all sources');
        }

        modelsLoaded = true;
        console.log('Models: All face-api.js models loaded successfully!');
        try { window.dispatchEvent(new Event('models:loaded')); } catch {}
        updatePlayButtonState();
    } catch (error) {
        console.error('Models: Error loading face-api.js models:', error);
        alert('Failed to load face detection models. Please check your internet connection and reload the page.');
        modelsLoaded = false;
        updatePlayButtonState();
    }
}

async function initializeCamera() {
    try {
        console.log('Camera: Initializing camera in grayscale mode...');
        
        // Show camera but keep it grayscale (no active class)
        video.style.display = 'block';
        overlayCanvas.style.display = 'block';
        video.classList.remove('active'); // Ensure grayscale
        
        // Ensure countdown and timer are hidden on startup
        countdownDisplay.style.display = 'none';
        timerDisplay.style.display = 'none';
        
        // Hide manual capture button since we're using automatic smile detection
        if (captureBtn) {
            captureBtn.style.display = 'none';
        }
        
        console.log('Camera: Requesting camera permissions...');
        
        // Check if getUserMedia is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('getUserMedia is not supported in this browser');
        }
        
        stream = await navigator.mediaDevices.getUserMedia({
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        });
        
        console.log('Camera: Stream obtained successfully');
        console.log('Camera: Stream active:', stream.active);
        console.log('Camera: Video tracks:', stream.getVideoTracks().length);
        
        video.srcObject = stream;
        
        // Add error handler for video element
        video.onerror = (error) => {
            console.error('Camera: Video element error:', error);
        };
        
        // Use both loadedmetadata and canplay events for better compatibility
        let videoReady = false;
        
        const handleVideoReady = async () => {
            if (videoReady) return; // Prevent multiple initializations
            videoReady = true;
            
            console.log('Camera: Video ready, dimensions:', video.videoWidth, 'x', video.videoHeight);
            
            // Set canvas dimensions to match video
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            console.log('Camera: Canvas dimensions set');
            
            // Load models after video is ready
            console.log('Camera: Loading face detection models...');
            await loadModels();
            
            // Camera is ready but inactive - no detection, no timer
            console.log('Camera: Ready in grayscale mode. Press Play to start session.');
        };
        
        video.addEventListener('loadedmetadata', handleVideoReady);
        video.addEventListener('canplay', handleVideoReady);
        
        // Force play the video
        await video.play().catch(e => {
            console.error('Camera: Video play failed:', e);
        });
        
        // Fallback check after 5 seconds
        setTimeout(() => {
            if (!videoReady || video.videoWidth === 0) {
                console.error('Camera: Video not loading properly after 5 seconds');
                console.log('Camera: Video state - width:', video.videoWidth, 'readyState:', video.readyState);
                alert('Camera stream is not working properly. Please refresh the page and ensure camera permissions are granted.');
            }
        }, 5000);
        
    } catch (error) {
        console.error('Camera: Error accessing camera:', error);
        console.error('Camera: Error name:', error.name);
        console.error('Camera: Error message:', error.message);
        
        let errorMessage = 'Unable to access camera. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage += 'Please ensure you have granted camera permissions.';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            errorMessage += 'No camera found on your device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            errorMessage += 'Camera is already in use by another application.';
        } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
            errorMessage += 'Camera does not support the requested settings.';
        } else {
            errorMessage += error.message || 'Unknown error occurred.';
        }
        
        alert(errorMessage);
        
        // Disable button if camera fails
        startCameraBtn.disabled = true;
        startCameraBtn.textContent = 'Camera Unavailable';
    }
}

function startCameraSession() {
    console.log('Session: Starting camera session...');
    
    // Switch from grayscale to color
    video.classList.add('active');
    
    // Disable button during session
    startCameraBtn.disabled = true;
    
    // Start smile detection only after pressing play
    if (modelsLoaded) {
        console.log('Session: Starting smile detection...');
        startSmileDetection();
    } else {
        console.error('Session: Models not loaded, cannot start smile detection');
        alert('Face detection models are not ready. Please refresh the page.');
        return;
    }
    
    // Start the 20-second timer
    startCameraTimer();
    
    cameraActive = true;
}

async function capturePhoto() {
    console.log('Capture: Starting photo capture');
    
    // Stop the camera timer when photo is captured
    stopCameraTimer();
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    video.style.display = 'none';
    canvas.style.display = 'block';
    overlayCanvas.style.display = 'none';
    
    if (captureBtn) {
        captureBtn.style.display = 'none';
    }
    
    // Show capture message and save controls immediately
    captureMessage.style.display = 'block';
    saveControls.style.display = 'block';
    ensureManualCoinButton();
    
    console.log('Capture: Save controls displayed, waiting for user input (D to download, E to exit)');
    console.log('Capture: Will auto-exit in 6 seconds');
    
    // Start upload in background (non-blocking)
    uploadToGallery().catch(err => {
        console.error('Capture: Background upload failed:', err);
    });
    
    // Hide initial capture message after 2 seconds (upload status will replace it)
    setTimeout(() => {
        // Only hide if it still says "CAPTURED!"
        if (captureMessage.textContent === 'CAPTURED!') {
            captureMessage.style.display = 'none';
        }
    }, 2000);
    
    // Auto-exit after 6 seconds
    setTimeout(() => {
        console.log('Capture: Auto-exit timer triggered after 6 seconds');
        resetCamera();
    }, 6000);
}

function resetCamera() {
    console.log('Reset: Ending camera session, returning to grayscale...');
    
    // Stop camera timer if running
    stopCameraTimer();
    
    // Stop smile detection - no photos can be taken in grayscale mode
    stopSmileDetection();
    
    // Return to grayscale mode (inactive state)
    video.classList.remove('active');
    
    // Show video, hide canvas
    canvas.style.display = 'none';
    video.style.display = 'block';
    overlayCanvas.style.display = 'block';
    
    // Re-enable button for next session
    startCameraBtn.disabled = false;
    
    // Hide all UI elements
    if (captureBtn) {
        captureBtn.style.display = 'none';
    }
    
    saveControls.style.display = 'none';
    captureMessage.style.display = 'none';
    countdownDisplay.style.display = 'none';
    timerDisplay.style.display = 'none';
    
    // Reset countdown state
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    isCountingDown = false;
    
    // Clear overlay canvas (no face detection boxes in grayscale mode)
    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    
    // Reset camera state - camera stays on but inactive
    cameraActive = false;
    cameraTimeRemaining = 20;
}

async function detectSmile() {
    if (!modelsLoaded || video.readyState !== 4 || document.hidden) {
        console.log('Detection: Not ready - Models loaded:', modelsLoaded, 'Video ready state:', video.readyState, 'Page visible:', !document.hidden);
        return;
    }
    
    // Log every 10th detection cycle to show it's running
    if (Math.random() < 0.1) {
        console.log('Detection: Running face detection cycle...');
        console.log('Detection: Video dimensions:', video.videoWidth, 'x', video.videoHeight);
        console.log('Detection: Canvas dimensions:', overlayCanvas.width, 'x', overlayCanvas.height);
    }
    
    try {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.5
        })).withFaceExpressions();
        
        // Clear the overlay canvas
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        
        if (detections.length > 0) {
            console.log('Face detected:', detections.length, 'faces');
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
            
            // Draw status text: Loading... until threshold, then Target reached in green
            // Note: The overlay canvas is CSS-mirrored to match the video. To keep text readable (not mirrored),
            // we draw the text with an internal horizontal flip so the net effect is normal orientation.
            const reachedTarget = happiness > 0.95;
            const statusText = reachedTarget ? 'Target reached' : 'Loading...';
            overlayCtx.font = 'bold 16px Arial';
            const textMetrics = overlayCtx.measureText(statusText);
            const textWidth = textMetrics.width;
            overlayCtx.save();
            overlayCtx.fillStyle = reachedTarget ? '#00ff00' : '#ffffff';
            overlayCtx.scale(-1, 1);
            overlayCtx.fillText(statusText, -(box.x + textWidth), box.y - 10);
            overlayCtx.restore();
            
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
    
    console.log('Detection: Starting smile detection with 300ms interval');
    console.log('Detection: Video ready state:', video.readyState);
    console.log('Detection: Models loaded:', modelsLoaded);
    
    // Run detection more frequently for better responsiveness
    detectionInterval = setInterval(detectSmile, 300);
    console.log('Detection: Smile detection interval started successfully');
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
    
    // Stop smile detection before capturing
    stopSmileDetection();
    
    // Clear any remaining countdown state
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    isCountingDown = false;
    
    // Capture the photo
    capturePhoto();
}

async function uploadToGallery() {
    try {
        console.log('Client: Starting photo upload...');
        
        // Convert canvas to base64 with quality control
        const imageData = canvas.toDataURL('image/jpeg', 0.9); // Use JPEG with 90% quality for smaller size
        console.log('Client: Canvas data size:', imageData.length);
        
        // Add visual feedback during upload
        const captureMessage = document.getElementById('capture-message');
        if (captureMessage) {
            captureMessage.textContent = 'Uploading...';
        }
        
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Upload timeout')), 10000); // 10 second timeout
        });
        
        // Race between fetch and timeout
        const response = await Promise.race([
            fetch('/api/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imageData })
            }),
            timeoutPromise
        ]);
        
        console.log('Client: Upload response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Client: Upload failed with status', response.status, ':', errorText);
            
            // Update message to show error
            if (captureMessage) {
                captureMessage.textContent = 'Upload failed! (Error ' + response.status + ')';
            }
            
            // Don't block the user - still show save controls
            return;
        }
        
        const result = await response.json();
        
        if (result.success) {
            console.log('Client: Photo uploaded successfully:', result.url);
            
            // Update message to show success
            if (captureMessage) {
                captureMessage.textContent = 'CAPTURED & SAVED!';
            }
            
            // Silently refresh gallery
            setTimeout(() => fetchGallery(), 500); // Small delay to ensure storage is updated

            // After successful upload, automatically start coin creation if wallet is connected
            try {
                if (window.walletState?.isConnected) {
                    if (captureMessage) {
                        captureMessage.textContent = 'Preparing onchain coin...';
                    }
                    const blob = await (await fetch(canvas.toDataURL('image/png'))).blob();
                    const file = new File([blob], 'snap.png', { type: 'image/png' });
                    const title = `${new Date().toLocaleString()} - Make It Snap`;
                    const coinResult = await window.coinSnapWithZora(file, title);
                    if (coinResult.ok) {
                        console.log('Coin creation submitted. Tx:', coinResult.hash);
                        if (captureMessage) {
                            captureMessage.textContent = 'Coin submitted. Check your wallet.';
                        }
                    } else {
                        console.error('Coin creation failed:', coinResult.error || 'Unknown error');
                        if (captureMessage) {
                            captureMessage.textContent = 'Coin failed. Use Coin button.';
                        }
                    }
                }
            } catch (coinErr) {
                console.error('Automatic coining error:', coinErr);
                if (captureMessage) {
                    captureMessage.textContent = 'Coin error. Use Coin button.';
                }
            }
        } else {
            console.error('Client: Upload failed:', result.error);
            if (captureMessage) {
                captureMessage.textContent = 'Upload error: ' + (result.error || 'Unknown');
            }
        }
    } catch (error) {
        console.error('Client: Upload error:', error);
        const captureMessage = document.getElementById('capture-message');
        
        if (error.message === 'Upload timeout') {
            console.error('Client: Upload timed out after 10 seconds');
            if (captureMessage) {
                captureMessage.textContent = 'Upload timed out!';
            }
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            console.error('Client: Network error - could not connect to server');
            if (captureMessage) {
                captureMessage.textContent = 'Network error!';
            }
        } else {
            if (captureMessage) {
                captureMessage.textContent = 'Upload failed!';
            }
        }
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
    // Only handle keys when save controls are visible
    if (saveControls.style.display === 'block') {
        const key = event.key.toLowerCase();
        console.log('Keyboard: Key pressed:', key);
        
        if (key === 'd') {
            console.log('Keyboard: Download requested');
            downloadPhoto();
            // Optional: Reset camera after download
            setTimeout(() => {
                resetCamera();
            }, 1000);
        } else if (key === 'e') {
            console.log('Keyboard: Exit requested');
            resetCamera();
        }
    }
}

// Manual coin button support
function ensureManualCoinButton() {
    const controls = document.getElementById('save-controls');
    if (!controls) return;
    let btn = document.getElementById('coin-onchain-btn');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'coin-onchain-btn';
        btn.textContent = 'Coin onchain';
        btn.style.marginLeft = '8px';
        btn.onclick = async () => {
            try {
                if (!window.walletState?.isConnected) {
                    if (window.appKitModal && typeof window.appKitModal.open === 'function') {
                        window.appKitModal.open();
                    } else {
                        alert('Connect your wallet first.');
                    }
                    return;
                }
                if (captureMessage) {
                    captureMessage.style.display = 'block';
                    captureMessage.textContent = 'Preparing onchain coin...';
                }
                const blob = await (await fetch(canvas.toDataURL('image/png'))).blob();
                const file = new File([blob], 'snap.png', { type: 'image/png' });
                const title = `${new Date().toLocaleString()} - Make It Snap`;
                const coinResult = await window.coinSnapWithZora(file, title);
                if (coinResult.ok) {
                    if (captureMessage) captureMessage.textContent = 'Coin submitted. Check wallet.';
                } else {
                    if (captureMessage) captureMessage.textContent = 'Coin failed: ' + (coinResult.error || 'Unknown');
                }
            } catch (e) {
                console.error('Manual coin error:', e);
                if (captureMessage) captureMessage.textContent = 'Coin error: ' + (e?.message || 'Unknown');
            }
        };
        controls.appendChild(btn);
    }
}

// Gallery functionality
let galleryRefreshInterval = null;

async function fetchGallery() {
    try {
        console.log('Client: Fetching gallery...');
        const response = await fetch('/api/gallery');
        
        console.log('Client: Gallery response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Client: Gallery fetch failed with status', response.status, ':', errorText);
            showGalleryError();
            return;
        }
        
        const data = await response.json();
        console.log('Client: Gallery data received:', data);
        
        if (data.success) {
            displayGallery(data.photos);
            updateGalleryInfo(data.count);
        } else {
            console.error('Client: Gallery fetch failed:', data.error);
            showGalleryError();
        }
    } catch (error) {
        console.error('Client: Gallery fetch error:', error);
        showGalleryError();
    }
}

function displayGallery(photos) {
    const galleryContainer = document.getElementById('gallery-container');
    
    if (photos.length === 0) {
        galleryContainer.innerHTML = '<div class="gallery-empty">No winners yet! Be the first to win today! 🏆</div>';
        return;
    }
    
    // Group photos by date
    const photosByDate = {};
    photos.forEach(photo => {
        const date = new Date(photo.uploadedAt);
        const dateKey = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        if (!photosByDate[dateKey]) {
            photosByDate[dateKey] = [];
        }
        photosByDate[dateKey].push(photo);
    });
    
    // Sort dates (most recent first)
    const sortedDates = Object.keys(photosByDate).sort((a, b) => {
        return new Date(b) - new Date(a);
    });
    
    // Generate HTML for each day
    galleryContainer.innerHTML = sortedDates.map((dateKey, index) => {
        const dayPhotos = photosByDate[dateKey];
        const isToday = new Date(dateKey).toDateString() === new Date().toDateString();
        const dateId = `day-${index}`;
        
        return `
            <div class="daily-section">
                <div class="daily-header ${index > 0 ? 'collapsed' : ''}" onclick="toggleDaily('${dateId}')">
                    <div class="daily-title">
                        <span>🏆</span>
                        <span>${isToday ? 'Today\'s Winners' : dateKey + ' Winners'}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <span class="daily-count">${dayPhotos.length} winner${dayPhotos.length !== 1 ? 's' : ''}</span>
                        <span class="daily-toggle">▼</span>
                    </div>
                </div>
                <div id="${dateId}" class="daily-content ${index > 0 ? 'collapsed' : ''}">
                    <div class="gallery-grid">
                        ${dayPhotos.map(photo => `
                            <div class="gallery-item" onclick="openPhoto('${photo.url}')">
                                <img src="${photo.url}" alt="${photo.filename}" loading="lazy">
                                <div class="photo-info">
                                    <div>${new Date(photo.uploadedAt).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function toggleDaily(dateId) {
    const content = document.getElementById(dateId);
    const header = content.previousElementSibling;
    
    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        header.classList.remove('collapsed');
    } else {
        content.classList.add('collapsed');
        header.classList.add('collapsed');
    }
}

function updateGalleryInfo(count) {
    const photoCount = document.getElementById('photo-count');
    const lastUpdated = document.getElementById('last-updated');
    
    photoCount.textContent = `${count} winner${count !== 1 ? 's' : ''}`;
    lastUpdated.textContent = `Updated: ${new Date().toLocaleTimeString()}`;
}

function showGalleryError() {
    const galleryContainer = document.getElementById('gallery-container');
    galleryContainer.innerHTML = `
        <div class="gallery-error">
            <p>😕 Failed to load winners</p>
            <p style="font-size: 0.9em; opacity: 0.8;">Check your connection and refresh</p>
        </div>
    `;
}

function openPhoto(url) {
    window.open(url, '_blank');
}

function startGalleryAutoRefresh() {
    // Initial load
    console.log('Gallery: Starting auto-refresh system');
    fetchGallery();
    
    // Silent auto-refresh every 10 seconds
    if (galleryRefreshInterval) {
        clearInterval(galleryRefreshInterval);
    }
    
    // Only set interval if page is visible
    if (!document.hidden) {
        galleryRefreshInterval = setInterval(() => {
            console.log('Gallery: Auto-refreshing...');
            fetchGallery();
        }, 10000);
    }
}

// Add manual refresh capability
function addGalleryRefreshButton() {
    const galleryInfo = document.querySelector('.gallery-info');
    if (galleryInfo && !document.getElementById('refresh-btn')) {
        const refreshBtn = document.createElement('button');
        refreshBtn.id = 'refresh-btn';
        refreshBtn.textContent = '🔄 Refresh';
        refreshBtn.style.cssText = 'margin-left: 1rem; padding: 4px 8px; cursor: pointer; border: 1px solid #ddd; border-radius: 4px; background: white;';
        refreshBtn.onclick = () => {
            console.log('Gallery: Manual refresh triggered');
            fetchGallery();
        };
        galleryInfo.appendChild(refreshBtn);
    }
}

// Expose gallery helpers for inline handlers in generated HTML
window.toggleDaily = toggleDaily;
window.openPhoto = openPhoto;

document.addEventListener('keydown', handleKeyPress);

// Cleanup function to prevent memory leaks
function cleanup() {
    console.log('App: Cleaning up resources...');
    
    // Stop face detection
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
    
    // Stop gallery refresh
    if (galleryRefreshInterval) {
        clearInterval(galleryRefreshInterval);
        galleryRefreshInterval = null;
    }
    
    // Stop countdown timer
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    
    // Stop camera timer
    if (cameraTimer) {
        clearInterval(cameraTimer);
        cameraTimer = null;
    }
    
    // Stop camera stream
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        stream = null;
    }
    
    // Clear canvases to free memory
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    
    console.log('App: Cleanup complete');
}

// Handle page unload
window.addEventListener('beforeunload', cleanup);
window.addEventListener('unload', cleanup);

// Initialize AppKit is handled by the module import

// Handle visibility changes (tab switching)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('App: Page hidden, pausing detection');
        stopSmileDetection();
        if (galleryRefreshInterval) {
            clearInterval(galleryRefreshInterval);
            galleryRefreshInterval = null;
        }
    } else {
        console.log('App: Page visible, resuming detection');
        // Only resume detection if camera session is active
        if (modelsLoaded && cameraActive && !detectionInterval) {
            startSmileDetection();
        }
        startGalleryAutoRefresh();
    }
});

// Add camera timer functions
function startCameraTimer() {
    console.log('Timer: Starting 20-second camera timer');
    cameraActive = true;
    cameraTimeRemaining = 20;
    timerDisplay.textContent = cameraTimeRemaining;
    timerDisplay.style.display = 'block';
    timerDisplay.className = 'timer-display';
    
    cameraTimer = setInterval(() => {
        cameraTimeRemaining--;
        timerDisplay.textContent = cameraTimeRemaining;
        
        // Add warning colors
        if (cameraTimeRemaining <= 10) {
            timerDisplay.className = 'timer-display critical';
        } else if (cameraTimeRemaining <= 30) {
            timerDisplay.className = 'timer-display warning';
        }
        
        // Timer expired
        if (cameraTimeRemaining <= 0) {
            console.log('Timer: Camera timer expired');
            stopCameraTimer();
            resetCamera();
        }
    }, 1000);
}

function stopCameraTimer() {
    if (cameraTimer) {
        clearInterval(cameraTimer);
        cameraTimer = null;
    }
    timerDisplay.style.display = 'none';
    cameraActive = false;
}

// Handle start camera button click
startCameraBtn.addEventListener('click', () => {
    console.log('Button: Start session button clicked');
    if (!window.walletState?.isConnected) {
        // Open AppKit modal if available, else alert
        if (window.appKitModal && typeof window.appKitModal.open === 'function') {
            window.appKitModal.open();
        } else {
            alert('Please connect your wallet to play.');
        }
        return;
    }
    startCameraSession();
});

// Initialize everything when page loads
console.log('App: Starting camera and gallery systems...');
// Start camera immediately in grayscale mode - no timer, no photo capture
initializeCamera();
startGalleryAutoRefresh();
addGalleryRefreshButton();

// React to wallet events to update Play button
window.addEventListener('wallet:connected', updatePlayButtonState);
window.addEventListener('wallet:updated', updatePlayButtonState);
window.addEventListener('wallet:disconnected', updatePlayButtonState);
window.addEventListener('models:loaded', updatePlayButtonState);
// Initial state
updatePlayButtonState();