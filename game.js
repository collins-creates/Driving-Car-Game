// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const speedDisplay = document.getElementById('speed');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const gameOverScreen = document.getElementById('gameOver');
const finalScoreDisplay = document.getElementById('finalScore');

// Game state
let gameRunning = true;
let score = 0;
let lives = 3;
let gameTime = 0;
let currentLevel = 1;
let levelProgress = 0;
let levelTarget = 1000; // Score needed to advance to next level
let dayNightCycle = 0; // 0-1, where 0 is day and 1 is night
let cycleSpeed = 0.001; // How fast the cycle progresses

// Car properties
const car = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 30,
    height: 50,
    speed: 0,
    maxSpeed: 8,
    acceleration: 0.2,
    deceleration: 0.1,
    turnSpeed: 0.05,
    angle: 0,
    color: '#ff4444',
    nitro: 100, // Nitro meter (0-100)
    nitroBoost: 1.5, // Speed multiplier when nitro is active
    nitroActive: false,
    nitroDrain: 2, // Nitro drain per frame when active
    nitroRecharge: 0.5, // Nitro recharge per frame when not active
    shield: false
};

// Track properties
const track = {
    segments: [],
    segmentLength: 200,
    roadWidth: 2000,
    segmentsCount: 500,
    cameraHeight: 1000,
    cameraDepth: 0.84,
    x: 0,
    dx: 0
};

// Obstacles
let obstacles = [];
let powerUps = [];

// Obstacle types
const obstacleTypes = {
    STATIC: { name: 'static', color: '#ff0000', width: 40, height: 40, effect: 'collision' },
    MOVING_CAR: { name: 'moving_car', color: '#ff6600', width: 35, height: 45, effect: 'collision', speed: 2 },
    OIL_SLICK: { name: 'oil_slick', color: '#333333', width: 60, height: 60, effect: 'slippery' },
    ROADBLOCK: { name: 'roadblock', color: '#ffaa00', width: 80, height: 30, effect: 'collision' }
};

// Collectible types
const collectibleTypes = {
    COIN: { name: 'coin', color: '#FFD700', radius: 12, value: 50, effect: 'score' },
    STAR: { name: 'star', color: '#FF69B4', radius: 15, value: 100, effect: 'score' },
    FUEL: { name: 'fuel', color: '#00FF00', radius: 10, value: 25, effect: 'nitro' },
    SHIELD: { name: 'shield', color: '#4169E1', radius: 18, value: 0, effect: 'shield' }
};

// Input handling
const keys = {};
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ') e.preventDefault();
});
document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Car skins
const carSkins = [
    { color: '#ff4444', name: 'Red' },
    { color: '#44aaff', name: 'Blue' },
    { color: '#44ff44', name: 'Green' },
    { color: '#ffaa44', name: 'Orange' },
    { color: '#fff', name: 'White' },
    { color: '#222', name: 'Black' }
];
let selectedSkin = carSkins[0];

const carSelectModal = document.getElementById('carSelectModal');
const carOptions = document.getElementById('carOptions');

// Level properties
const levels = [
    { name: "Beginner", obstacleRate: 0.01, maxSpeed: 8, curveIntensity: 0.5, background: '#87CEEB' },
    { name: "Amateur", obstacleRate: 0.015, maxSpeed: 10, curveIntensity: 0.8, background: '#98FB98' },
    { name: "Pro", obstacleRate: 0.02, maxSpeed: 12, curveIntensity: 1.2, background: '#F0E68C' },
    { name: "Expert", obstacleRate: 0.025, maxSpeed: 14, curveIntensity: 1.5, background: '#FFB6C1' },
    { name: "Master", obstacleRate: 0.03, maxSpeed: 16, curveIntensity: 2.0, background: '#DDA0DD' }
];

// Sound system
let audioContext;
let sounds = {};
let musicPlaying = false;

// High score system
let highScores = [];

// Mobile controls
let isMobile = false;
let mobileControls = null;
let mobileKeys = {};

// Mini-map
const miniMapCanvas = document.getElementById('miniMapCanvas');
const miniMapCtx = miniMapCanvas.getContext('2d');

// Frame rate limiting
let lastFrameTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;

// Performance monitoring
let frameCount = 0;
let lastFPSUpdate = 0;
let currentFPS = 0;

// Responsive canvas and mini-map
function resizeGame() {
    // Set canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Set mini-map size based on window size
    const miniMap = document.getElementById('miniMap');
    const miniMapCanvas = document.getElementById('miniMapCanvas');
    let mapW = Math.max(100, Math.min(window.innerWidth * 0.25, 180));
    let mapH = Math.max(60, Math.min(window.innerHeight * 0.15, 120));
    miniMap.style.width = mapW + 'px';
    miniMap.style.height = mapH + 'px';
    miniMapCanvas.width = mapW;
    miniMapCanvas.height = mapH;
}

window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', resizeGame);

// Call resizeGame on load
window.addEventListener('DOMContentLoaded', resizeGame);
window.onload = () => {
    setupCarOptions();
    showCarSelect();
    initAudio();
    loadHighScores();
    detectMobile();
    initMobileControls();
    resizeGame();
};

// Detect mobile device
function detectMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
               window.innerWidth <= 768;
    return isMobile;
}

// Initialize mobile controls
function initMobileControls() {
    mobileControls = document.getElementById('mobileControls');
    
    if (isMobile && mobileControls) {
        mobileControls.style.display = 'block';
        
        // Add touch event listeners
        const upBtn = document.getElementById('upBtn');
        const downBtn = document.getElementById('downBtn');
        const leftBtn = document.getElementById('leftBtn');
        const rightBtn = document.getElementById('rightBtn');
        const nitroBtn = document.getElementById('nitroBtn');
        
        // Up button
        upBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mobileKeys['w'] = true;
        });
        upBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobileKeys['w'] = false;
        });
        
        // Down button
        downBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mobileKeys['s'] = true;
        });
        downBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobileKeys['s'] = false;
        });
        
        // Left button
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mobileKeys['a'] = true;
        });
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobileKeys['a'] = false;
        });
        
        // Right button
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mobileKeys['d'] = true;
        });
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobileKeys['d'] = false;
        });
        
        // Nitro button
        nitroBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            mobileKeys['shift'] = true;
        });
        nitroBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            mobileKeys['shift'] = false;
        });
        
        // Mouse events for desktop testing
        upBtn.addEventListener('mousedown', () => mobileKeys['w'] = true);
        upBtn.addEventListener('mouseup', () => mobileKeys['w'] = false);
        downBtn.addEventListener('mousedown', () => mobileKeys['s'] = true);
        downBtn.addEventListener('mouseup', () => mobileKeys['s'] = false);
        leftBtn.addEventListener('mousedown', () => mobileKeys['a'] = true);
        leftBtn.addEventListener('mouseup', () => mobileKeys['a'] = false);
        rightBtn.addEventListener('mousedown', () => mobileKeys['d'] = true);
        rightBtn.addEventListener('mouseup', () => mobileKeys['d'] = false);
        nitroBtn.addEventListener('mousedown', () => mobileKeys['shift'] = true);
        nitroBtn.addEventListener('mouseup', () => mobileKeys['shift'] = false);
    }
}

// Initialize audio
function initAudio() {
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        createSounds();
    } catch (e) {
        console.log('Audio not supported');
    }
}

// Create sound effects
function createSounds() {
    // Engine sound (continuous)
    sounds.engine = createEngineSound();
    
    // Collision sound
    sounds.collision = createCollisionSound();
    
    // Power-up sound
    sounds.powerup = createPowerupSound();
    
    // Level up sound
    sounds.levelup = createLevelupSound();
    
    // Background music
    sounds.music = createBackgroundMusic();
}

// Create engine sound
function createEngineSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    return { oscillator, gainNode };
}

// Create collision sound
function createCollisionSound() {
    return () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    };
}

// Create power-up sound
function createPowerupSound() {
    return () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    };
}

// Create level up sound
function createLevelupSound() {
    return () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(300, audioContext.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    };
}

// Create background music
function createBackgroundMusic() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
    
    return { oscillator, gainNode };
}

// Play engine sound
function playEngineSound() {
    if (sounds.engine && !sounds.engine.oscillator.started) {
        sounds.engine.oscillator.start();
        sounds.engine.oscillator.started = true;
    }
    
    if (sounds.engine) {
        const speed = Math.abs(car.speed);
        const frequency = 100 + (speed * 20);
        const volume = 0.05 + (speed * 0.01);
        
        sounds.engine.oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        sounds.engine.gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    }
}

// Stop engine sound
function stopEngineSound() {
    if (sounds.engine && sounds.engine.oscillator.started) {
        sounds.engine.oscillator.stop();
        sounds.engine.oscillator.started = false;
    }
}

// Play background music
function playBackgroundMusic() {
    if (sounds.music && !musicPlaying) {
        sounds.music.oscillator.start();
        musicPlaying = true;
    }
}

// Stop background music
function stopBackgroundMusic() {
    if (sounds.music && musicPlaying) {
        sounds.music.oscillator.stop();
        musicPlaying = false;
    }
}

// Initialize track
function initTrack() {
    track.segments = [];
    for (let i = 0; i < track.segmentsCount; i++) {
        const level = levels[Math.min(currentLevel - 1, levels.length - 1)];
        track.segments.push({
            index: i,
            p1: { world: { z: i * track.segmentLength }, camera: {}, screen: {} },
            p2: { world: { z: (i + 1) * track.segmentLength }, camera: {}, screen: {} },
            curve: Math.sin(i * 0.01 * level.curveIntensity) * 2,
            color: Math.floor(i / 3) % 2 ? '#606060' : '#696969'
        });
    }
}

// Project 3D coordinates to 2D screen coordinates
function project(p, cameraX, cameraY, cameraZ, cameraDepth) {
    p.camera.x = (p.world.x || 0) - cameraX;
    p.camera.y = (p.world.y || 0) - cameraY;
    p.camera.z = (p.world.z || 0) - cameraZ;
    
    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round((canvas.width / 2) + (p.camera.x * p.screen.scale));
    p.screen.y = Math.round((canvas.height / 2) - (p.camera.y * p.screen.scale));
    p.screen.w = Math.round(track.roadWidth * p.screen.scale);
}

// Update car physics
function updateCar() {
    const level = levels[Math.min(currentLevel - 1, levels.length - 1)];
    
    // Combine keyboard and mobile controls
    const allKeys = { ...keys, ...mobileKeys };
    
    // Handle input
    if (allKeys['w'] || allKeys['arrowup']) {
        car.speed = Math.min(car.speed + car.acceleration, level.maxSpeed);
        playEngineSound();
    } else if (allKeys['s'] || allKeys['arrowdown']) {
        car.speed = Math.max(car.speed - car.acceleration, -level.maxSpeed / 2);
        playEngineSound();
    } else {
        car.speed *= (1 - car.deceleration);
        if (Math.abs(car.speed) < 0.1) {
            stopEngineSound();
        }
    }
    
    // Nitro boost
    if (allKeys['shift'] && car.nitro > 0 && (allKeys['w'] || allKeys['arrowup'])) {
        car.nitroActive = true;
        car.speed = Math.min(car.speed + car.acceleration, level.maxSpeed * car.nitroBoost);
    } else {
        car.nitroActive = false;
    }
    
    // Update nitro meter
    if (car.nitroActive && car.nitro > 0) {
        car.nitro -= car.nitroDrain;
        if (car.nitro < 0) car.nitro = 0;
    } else if (!car.nitroActive && car.nitro < 100) {
        car.nitro += car.nitroRecharge;
        if (car.nitro > 100) car.nitro = 100;
    }
    
    if (allKeys[' ']) {
        car.speed *= 0.8; // Brake
    }
    
    if (allKeys['a'] || allKeys['arrowleft']) {
        car.angle -= car.turnSpeed * (car.speed / level.maxSpeed);
    }
    if (allKeys['d'] || allKeys['arrowright']) {
        car.angle += car.turnSpeed * (car.speed / level.maxSpeed);
    }
    
    // Update position
    car.x += Math.sin(car.angle) * car.speed;
    car.y -= Math.cos(car.angle) * car.speed;
    
    // Keep car on screen
    car.x = Math.max(car.width / 2, Math.min(canvas.width - car.width / 2, car.x));
    car.y = Math.max(car.height / 2, Math.min(canvas.height - car.height / 2, car.y));
    
    // Update track position
    track.x += car.speed * Math.sin(car.angle);
}

// Render the game
function render() {
    try {
        const level = levels[Math.min(currentLevel - 1, levels.length - 1)];
        
        // Clear canvas with day/night cycle background
        ctx.fillStyle = getCurrentLighting();
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add lighting effects
        const intensity = getLightingIntensity();
        ctx.globalAlpha = intensity;
        
        // Render track
        renderTrack();
        
        // Render car
        renderCar();
        
        // Render obstacles
        renderObstacles();
        
        // Render power-ups
        renderPowerUps();
        
        // Reset global alpha
        ctx.globalAlpha = 1;
        
        // Render mini-map
        renderMiniMap();
        
        // Update UI
        updateUI();
    } catch (error) {
        console.error('Render error:', error);
        // Clear canvas and show error message
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.fillText('Game Error - Please Refresh', canvas.width / 2 - 100, canvas.height / 2);
    }
}

// Render track
function renderTrack() {
    if (!track.segments || track.segments.length === 0) {
        // Fallback: re-initialize the track if missing
        initTrack();
        return;
    }
    const baseSegment = Math.floor(track.x / track.segmentLength);
    const cameraX = track.x;
    const cameraY = track.cameraHeight;
    const cameraZ = baseSegment * track.segmentLength;
    const segLen = track.segments.length;
    // Render road
    for (let n = 0; n < 100; n++) {
        const segIndex = (baseSegment + n) % segLen;
        const segment = track.segments[segIndex];
        if (!segment || !segment.p1 || !segment.p2) continue; // Safety check
        
        project(segment.p1, cameraX, cameraY, cameraZ, track.cameraDepth);
        project(segment.p2, cameraX, cameraY, cameraZ, track.cameraDepth);
        
        if (segment.p2.screen.y >= canvas.height) break;
        
        // Road
        ctx.fillStyle = segment.color;
        ctx.fillRect(0, segment.p2.screen.y, canvas.width, segment.p1.screen.y - segment.p2.screen.y);
        
        // Road borders
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, segment.p2.screen.y, canvas.width / 2 - segment.p2.screen.w, segment.p1.screen.y - segment.p2.screen.y);
        ctx.fillRect(canvas.width / 2 + segment.p2.screen.w, segment.p2.screen.y, canvas.width / 2 - segment.p2.screen.w, segment.p1.screen.y - segment.p2.screen.y);
        
        // Road lines
        if (n % 2) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(canvas.width / 2 - 2, segment.p2.screen.y, 4, segment.p1.screen.y - segment.p2.screen.y);
        }
    }
}

// Render car
function renderCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    
    // Nitro boost visual effect
    if (car.nitroActive) {
        ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
        ctx.fillRect(-car.width / 2 - 5, -car.height / 2 - 5, car.width + 10, car.height + 10);
    }
    
    // Car body
    ctx.fillStyle = car.color;
    ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);
    
    // Car details
    ctx.fillStyle = '#333';
    ctx.fillRect(-car.width / 2 + 2, -car.height / 2 + 5, car.width - 4, 10);
    ctx.fillRect(-car.width / 2 + 2, car.height / 2 - 15, car.width - 4, 10);
    
    // Windows
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 8, car.width - 8, 6);
    ctx.fillRect(-car.width / 2 + 4, car.height / 2 - 13, car.width - 8, 6);
    
    ctx.restore();
}

// Render obstacles
function renderObstacles() {
    obstacles.forEach(obstacle => {
        ctx.save();
        ctx.translate(obstacle.x, obstacle.y);
        ctx.rotate(obstacle.angle);
        
        // Draw obstacle based on type
        if (obstacle.type === 'oil_slick') {
            // Oil slick as a circle
            ctx.fillStyle = obstacle.color;
            ctx.beginPath();
            ctx.arc(0, 0, obstacle.width / 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add shine effect
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.arc(-obstacle.width / 4, -obstacle.height / 4, obstacle.width / 6, 0, Math.PI * 2);
            ctx.fill();
        } else if (obstacle.type === 'moving_car') {
            // Moving car
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
            
            // Car details
            ctx.fillStyle = '#333';
            ctx.fillRect(-obstacle.width / 2 + 2, -obstacle.height / 2 + 5, obstacle.width - 4, 8);
            ctx.fillRect(-obstacle.width / 2 + 2, obstacle.height / 2 - 13, obstacle.width - 4, 8);
            
            // Windows
            ctx.fillStyle = '#87CEEB';
            ctx.fillRect(-obstacle.width / 2 + 4, -obstacle.height / 2 + 8, obstacle.width - 8, 4);
            ctx.fillRect(-obstacle.width / 2 + 4, obstacle.height / 2 - 11, obstacle.width - 8, 4);
        } else {
            // Regular obstacles
            ctx.fillStyle = obstacle.color;
            ctx.fillRect(-obstacle.width / 2, -obstacle.height / 2, obstacle.width, obstacle.height);
        }
        
        ctx.restore();
    });
}

// Render power-ups
function renderPowerUps() {
    powerUps.forEach(powerUp => {
        ctx.save();
        ctx.translate(powerUp.x, powerUp.y);
        ctx.rotate(powerUp.angle);
        
        if (powerUp.type === 'coin') {
            // Draw coin
            ctx.fillStyle = powerUp.color;
            ctx.beginPath();
            ctx.arc(0, 0, powerUp.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Coin details
            ctx.fillStyle = '#B8860B';
            ctx.beginPath();
            ctx.arc(0, 0, powerUp.radius - 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFD700';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('$', 0, 4);
        } else if (powerUp.type === 'star') {
            // Draw star
            ctx.fillStyle = powerUp.color;
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
                const x = Math.cos(angle) * powerUp.radius;
                const y = Math.sin(angle) * powerUp.radius;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (powerUp.type === 'fuel') {
            // Draw fuel can
            ctx.fillStyle = powerUp.color;
            ctx.fillRect(-powerUp.radius, -powerUp.radius, powerUp.radius * 2, powerUp.radius * 2);
            
            ctx.fillStyle = '#333';
            ctx.fillRect(-powerUp.radius + 2, -powerUp.radius + 2, powerUp.radius * 2 - 4, powerUp.radius * 2 - 4);
            
            ctx.fillStyle = '#00FF00';
            ctx.fillRect(-powerUp.radius + 4, -powerUp.radius + 4, powerUp.radius * 2 - 8, powerUp.radius * 2 - 8);
        } else if (powerUp.type === 'shield') {
            // Draw shield
            ctx.fillStyle = powerUp.color;
            ctx.beginPath();
            ctx.arc(0, 0, powerUp.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(0, 0, powerUp.radius - 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

// Render mini-map
function renderMiniMap() {
    if (!miniMapCtx || !miniMapCanvas) return;
    
    try {
        // Clear mini-map
        miniMapCtx.fillStyle = '#2d5a27';
        miniMapCtx.fillRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
        
        // Draw track segments (limited for performance)
        const segmentCount = Math.min(30, track.segments.length);
        const segmentWidth = miniMapCanvas.width / segmentCount;
        
        for (let i = 0; i < segmentCount; i++) {
            const segment = track.segments[i];
            if (!segment) continue;
            
            const x = (i * segmentWidth) % miniMapCanvas.width;
            const y = miniMapCanvas.height / 2;
            
            // Draw road segment
            miniMapCtx.fillStyle = '#696969';
            miniMapCtx.fillRect(x, y - 10, segmentWidth, 20);
            
            // Draw road lines
            miniMapCtx.fillStyle = '#ffffff';
            miniMapCtx.fillRect(x + segmentWidth / 2 - 1, y - 10, 2, 20);
        }
        
        // Draw player position
        if (car) {
            const playerX = (car.x / canvas.width) * miniMapCanvas.width;
            const playerY = miniMapCanvas.height / 2;
            
            miniMapCtx.fillStyle = car.color;
            miniMapCtx.beginPath();
            miniMapCtx.arc(playerX, playerY, 4, 0, Math.PI * 2);
            miniMapCtx.fill();
            
            // Draw player direction
            miniMapCtx.strokeStyle = '#ffffff';
            miniMapCtx.lineWidth = 2;
            miniMapCtx.beginPath();
            miniMapCtx.moveTo(playerX, playerY);
            miniMapCtx.lineTo(
                playerX + Math.sin(car.angle) * 8,
                playerY - Math.cos(car.angle) * 8
            );
            miniMapCtx.stroke();
        }
        
        // Draw obstacles on mini-map (limited for performance)
        obstacles.slice(0, 10).forEach(obstacle => {
            if (!obstacle) return;
            const obstacleX = (obstacle.x / canvas.width) * miniMapCanvas.width;
            const obstacleY = miniMapCanvas.height / 2;
            
            miniMapCtx.fillStyle = obstacle.color;
            miniMapCtx.fillRect(obstacleX - 2, obstacleY - 2, 4, 4);
        });
        
        // Draw power-ups on mini-map (limited for performance)
        powerUps.slice(0, 5).forEach(powerUp => {
            if (!powerUp) return;
            const powerUpX = (powerUp.x / canvas.width) * miniMapCanvas.width;
            const powerUpY = miniMapCanvas.height / 2;
            
            miniMapCtx.fillStyle = powerUp.color;
            miniMapCtx.beginPath();
            miniMapCtx.arc(powerUpX, powerUpY, 3, 0, Math.PI * 2);
            miniMapCtx.fill();
        });
    } catch (error) {
        console.error('Mini-map render error:', error);
    }
}

// Update UI
function updateUI() {
    speedDisplay.textContent = Math.abs(Math.round(car.speed * 10));
    scoreDisplay.textContent = score;
    livesDisplay.textContent = lives;
    
    // Add level display
    const levelDisplay = document.getElementById('level');
    if (levelDisplay) {
        levelDisplay.textContent = currentLevel;
    }
    
    // Add nitro display
    const nitroDisplay = document.getElementById('nitro');
    if (nitroDisplay) {
        nitroDisplay.textContent = Math.round(car.nitro);
    }
}

// Generate obstacles
function generateObstacles() {
    const level = levels[Math.min(currentLevel - 1, levels.length - 1)];
    
    // Limit maximum obstacles to prevent performance issues
    if (obstacles.length >= 20) return;
    
    if (Math.random() < level.obstacleRate) {
        const types = Object.values(obstacleTypes);
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        const obstacle = {
            x: Math.random() * canvas.width,
            y: -50,
            width: randomType.width,
            height: randomType.height,
            speed: 3 + (currentLevel * 0.5),
            type: randomType.name,
            color: randomType.color,
            effect: randomType.effect,
            angle: 0,
            originalSpeed: 3 + (currentLevel * 0.5)
        };
        
        // Special properties for moving cars
        if (randomType.name === 'moving_car') {
            obstacle.speed = randomType.speed;
            obstacle.moving = true;
            obstacle.direction = Math.random() > 0.5 ? 1 : -1;
        }
        
        obstacles.push(obstacle);
    }
    
    // Update obstacles with safety checks
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        if (!obstacle) continue;
        
        obstacle.y += obstacle.speed;
        
        // Handle moving cars
        if (obstacle.moving) {
            obstacle.x += obstacle.direction * 1;
            obstacle.angle += 0.02;
            
            // Bounce off screen edges
            if (obstacle.x < obstacle.width / 2 || obstacle.x > canvas.width - obstacle.width / 2) {
                obstacle.direction *= -1;
            }
        }
        
        // Remove obstacles that are off screen
        if (obstacle.y > canvas.height + 50) {
            obstacles.splice(i, 1);
        }
    }
}

// Generate power-ups
function generatePowerUps() {
    // Limit maximum power-ups to prevent performance issues
    if (powerUps.length >= 10) return;
    
    if (Math.random() < 0.008) {
        const types = Object.values(collectibleTypes);
        const randomType = types[Math.floor(Math.random() * types.length)];
        
        const collectible = {
            x: Math.random() * canvas.width,
            y: -30,
            radius: randomType.radius,
            speed: 2,
            type: randomType.name,
            color: randomType.color,
            value: randomType.value,
            effect: randomType.effect,
            angle: 0
        };
        
        powerUps.push(collectible);
    }
    
    // Update power-ups with safety checks
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (!powerUp) continue;
        
        powerUp.y += powerUp.speed;
        powerUp.angle += 0.05; // Rotate collectibles
        
        if (powerUp.y > canvas.height + 30) {
            powerUps.splice(i, 1);
        }
    }
}

// Check collisions
function checkCollisions() {
    // Check obstacle collisions with safety checks
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obstacle = obstacles[i];
        if (!obstacle || !car) continue;
        
        if (car.x < obstacle.x + obstacle.width / 2 &&
            car.x + car.width / 2 > obstacle.x - obstacle.width / 2 &&
            car.y < obstacle.y + obstacle.height / 2 &&
            car.y + car.height / 2 > obstacle.y - obstacle.height / 2) {
            
            if (obstacle.effect === 'collision') {
                obstacles.splice(i, 1);
                lives--;
                car.speed *= 0.5; // Slow down on collision
                
                // Play collision sound
                if (sounds.collision) {
                    try {
                        sounds.collision();
                    } catch (e) {
                        console.log('Sound error:', e);
                    }
                }
                
                if (lives <= 0) {
                    gameOver();
                    return; // Exit early to prevent further processing
                }
            } else if (obstacle.effect === 'slippery') {
                // Oil slick effect - make car harder to control
                car.speed *= 0.8;
                car.turnSpeed *= 0.5;
                
                // Reset turn speed after a short delay
                setTimeout(() => {
                    if (car) car.turnSpeed = 0.05;
                }, 2000);
            }
        }
    }
    
    // Check power-up collisions with safety checks
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const powerUp = powerUps[i];
        if (!powerUp || !car) continue;
        
        const dx = car.x - powerUp.x;
        const dy = car.y - powerUp.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < car.width / 2 + powerUp.radius) {
            powerUps.splice(i, 1);
            
            // Apply collectible effects
            if (powerUp.effect === 'score') {
                score += powerUp.value;
            } else if (powerUp.effect === 'nitro') {
                car.nitro = Math.min(100, car.nitro + powerUp.value);
            } else if (powerUp.effect === 'shield') {
                // Shield effect - temporary invincibility
                car.shield = true;
                setTimeout(() => {
                    if (car) car.shield = false;
                }, 5000);
            }
            
            // Play power-up sound
            if (sounds.powerup) {
                try {
                    sounds.powerup();
                } catch (e) {
                    console.log('Sound error:', e);
                }
            }
        }
    }
}

// Check level progression
function checkLevelProgression() {
    if (score >= levelProgress + levelTarget) {
        levelProgress = score;
        currentLevel++;
        if (currentLevel <= levels.length) {
            // Level up effect
            car.maxSpeed = levels[Math.min(currentLevel - 1, levels.length - 1)].maxSpeed;
            initTrack(); // Reinitialize track with new level settings
            
            // Play level up sound
            if (sounds.levelup) {
                sounds.levelup();
            }
        }
    }
}

// Load high scores from localStorage
function loadHighScores() {
    const saved = localStorage.getItem('drivingGameHighScores');
    if (saved) {
        highScores = JSON.parse(saved);
    }
}

// Save high scores to localStorage
function saveHighScores() {
    localStorage.setItem('drivingGameHighScores', JSON.stringify(highScores));
}

// Add new score
function addHighScore(score, level) {
    const newScore = {
        score: score,
        level: level,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString()
    };
    
    highScores.push(newScore);
    highScores.sort((a, b) => b.score - a.score);
    highScores = highScores.slice(0, 10); // Keep only top 10
    saveHighScores();
}

// Display high scores
function displayHighScores() {
    const highScoreDisplay = document.getElementById('highScores');
    if (highScoreDisplay) {
        highScoreDisplay.innerHTML = '<h3>High Scores</h3>';
        highScores.forEach((score, index) => {
            highScoreDisplay.innerHTML += `
                <div>${index + 1}. ${score.score} (Level ${score.level}) - ${score.date}</div>
            `;
        });
    }
}

// Game over
function gameOver() {
    gameRunning = false;
    finalScoreDisplay.textContent = score;
    
    // Add to high scores
    addHighScore(score, currentLevel);
    displayHighScores();
    
    gameOverScreen.style.display = 'block';
    
    // Stop sounds
    stopEngineSound();
    stopBackgroundMusic();
}

// Show car select
function showCarSelect() {
    carSelectModal.style.display = 'flex';
    canvas.style.display = 'none';
    document.querySelector('.ui').style.display = 'none';
    document.querySelector('.controls').style.display = 'none';
    gameOverScreen.style.display = 'none';
}

// Hide car select
function hideCarSelect() {
    carSelectModal.style.display = 'none';
    canvas.style.display = 'block';
    document.querySelector('.ui').style.display = 'block';
    document.querySelector('.controls').style.display = 'block';
}

// Setup car options
function setupCarOptions() {
    carOptions.innerHTML = '';
    carSkins.forEach((skin, idx) => {
        const btn = document.createElement('button');
        btn.style.background = skin.color;
        btn.style.width = '60px';
        btn.style.height = '40px';
        btn.style.border = '3px solid #fff';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.title = skin.name;
        btn.onclick = () => {
            selectedSkin = skin;
            car.color = skin.color;
            hideCarSelect();
            startGame();
        };
        if(idx === 0) btn.style.outline = '4px solid yellow';
        carOptions.appendChild(btn);
    });
}

// Start game
function startGame() {
    gameRunning = true;
    score = 0;
    lives = 3;
    gameTime = 0;
    currentLevel = 1;
    levelProgress = 0;
    car.x = canvas.width / 2;
    car.y = canvas.height - 100;
    car.speed = 0;
    car.angle = 0;
    car.maxSpeed = levels[0].maxSpeed;
    car.color = selectedSkin.color;
    car.nitro = 100;
    car.nitroActive = false;
    obstacles = [];
    powerUps = [];
    gameOverScreen.style.display = 'none';
    initTrack();
    
    // Start background music
    playBackgroundMusic();
}

// Restart game
function restartGame() {
    showCarSelect();
}

// Update FPS counter
function updateFPS(currentTime) {
    frameCount++;
    if (currentTime - lastFPSUpdate >= 1000) {
        currentFPS = frameCount;
        frameCount = 0;
        lastFPSUpdate = currentTime;
        
        // Log performance issues
        if (currentFPS < 30) {
            console.warn('Low FPS detected:', currentFPS);
        }
    }
}

// Game loop with error handling, performance optimizations, frame rate limiting, and monitoring
function gameLoop(currentTime) {
    try {
        // Update FPS counter
        updateFPS(currentTime);
        
        // Frame rate limiting
        if (currentTime - lastFrameTime < frameInterval) {
            requestAnimationFrame(gameLoop);
            return;
        }
        lastFrameTime = currentTime;
        
        if (gameRunning) {
            updateCar();
            generateObstacles();
            generatePowerUps();
            checkCollisions();
            checkLevelProgression();
            updateDayNightCycle();
            score += Math.abs(Math.round(car.speed));
            gameTime++;
        }
        
        render();
    } catch (error) {
        console.error('Game loop error:', error);
        // Reset game state to prevent freezing
        gameRunning = false;
        obstacles = [];
        powerUps = [];
    }
    
    requestAnimationFrame(gameLoop);
}

// Update day/night cycle
function updateDayNightCycle() {
    dayNightCycle += cycleSpeed;
    if (dayNightCycle > 1) dayNightCycle = 0;
}

// Get current lighting based on day/night cycle
function getCurrentLighting() {
    const level = levels[Math.min(currentLevel - 1, levels.length - 1)];
    
    // Interpolate between day and night colors
    const dayColor = level.background;
    const nightColor = '#1a1a2e'; // Dark blue for night
    
    // Create gradient between day and night
    const r1 = parseInt(dayColor.slice(1, 3), 16);
    const g1 = parseInt(dayColor.slice(3, 5), 16);
    const b1 = parseInt(dayColor.slice(5, 7), 16);
    
    const r2 = parseInt(nightColor.slice(1, 3), 16);
    const g2 = parseInt(nightColor.slice(3, 5), 16);
    const b2 = parseInt(nightColor.slice(5, 7), 16);
    
    const r = Math.round(r1 + (r2 - r1) * dayNightCycle);
    const g = Math.round(g1 + (g2 - g1) * dayNightCycle);
    const b = Math.round(b1 + (b2 - b1) * dayNightCycle);
    
    return `rgb(${r}, ${g}, ${b})`;
}

// Get lighting intensity for effects
function getLightingIntensity() {
    return 1 - (dayNightCycle * 0.5); // 1 during day, 0.5 during night
}

// Memory cleanup function
function cleanupGame() {
    // Stop all sounds
    stopEngineSound();
    stopBackgroundMusic();
    
    // Clear arrays
    obstacles = [];
    powerUps = [];
    
    // Reset game state
    gameRunning = false;
    
    // Clear canvas
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Clear mini-map
    if (miniMapCtx) {
        miniMapCtx.clearRect(0, 0, miniMapCanvas.width, miniMapCanvas.height);
    }
}

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanupGame);

// Initialize and start game
initTrack();
gameLoop(); 