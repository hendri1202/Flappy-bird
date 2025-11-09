// Game variables
let canvas, ctx;
let scene, camera, renderer;
let bird, pipes = [];
let gameStarted = false;
let gameOver = false;
let score = 0;
let gravity = 0.5;
let velocity = 0;
let jump = -10;
let pipeSpeed = 3;
let pipeGap = 200;
let pipeWidth = 80;
let lastPipeTime = 0;
let pipeInterval = 1500;

// Bird properties
const birdX = 150;
let birdY = 300;
const birdRadius = 20;

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Setup Three.js scene
    setupThreeJS();

    // Setup event listeners
    setupEventListeners();

    // Start game loop
    gameLoop();
}

function setupThreeJS() {
    // Create scene
    scene = new THREE.Scene();

    // Create camera
    camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 5;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(canvas.width, canvas.height);
    renderer.setClearColor(0x000000, 0);

    // Add renderer to canvas
    const container = document.getElementById('gameContainer');
    container.appendChild(renderer.domElement);

    // Position renderer behind canvas
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.zIndex = '0';

    // Create background elements with Three.js
    createBackground();
}

function createBackground() {
    // Create sky
    const skyGeometry = new THREE.PlaneGeometry(20, 15);
    const skyMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.3
    });
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.position.z = -1;
    scene.add(sky);

    // Create some clouds
    for (let i = 0; i < 5; i++) {
        createCloud(Math.random() * 15 - 7.5, Math.random() * 8 - 4, Math.random() * 0.5 + 0.2);
    }
}

function createCloud(x, y, scale) {
    const cloudGroup = new THREE.Group();

    // Create cloud parts
    const cloudGeometry = new THREE.SphereGeometry(0.3 * scale, 16, 16);
    const cloudMaterial = new THREE.MeshBasicMaterial({
        color: 0xFFFFFF,
        transparent: true,
        opacity: 0.6
    });

    const positions = [
        [0, 0, 0],
        [0.4 * scale, 0.1 * scale, 0],
        [-0.4 * scale, 0.1 * scale, 0],
        [0.2 * scale, -0.2 * scale, 0],
        [-0.2 * scale, -0.2 * scale, 0]
    ];

    positions.forEach(pos => {
        const cloudPart = new THREE.Mesh(cloudGeometry, cloudMaterial);
        cloudPart.position.set(pos[0], pos[1], pos[2]);
        cloudGroup.add(cloudPart);
    });

    cloudGroup.position.set(x, y, -0.5);
    scene.add(cloudGroup);
}

function setupEventListeners() {
    // Click/touch to jump
    canvas.addEventListener('click', handleJump);
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            handleJump();
            e.preventDefault();
        }
    });

    // Touch support for mobile
    canvas.addEventListener('touchstart', (e) => {
        handleJump();
        e.preventDefault();
    });
}

function handleJump() {
    if (!gameStarted || gameOver) {
        restartGame();
    } else if (!gameOver) {
        velocity = jump;
        playJumpSound();
    }
}

function playJumpSound() {
    // Simple beep sound using Web Audio API
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function startGame() {
    gameStarted = true;
    gameOver = false;
    score = 0;
    birdY = 300;
    velocity = 0;
    pipes = [];
    lastPipeTime = 0;

    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('score').textContent = '0';
}

function restartGame() {
    startGame();
}

function updateBird() {
    if (!gameStarted || gameOver) return;

    // Apply gravity
    velocity += gravity;
    birdY += velocity;

    // Check collisions with ground and ceiling
    if (birdY + birdRadius > canvas.height - 50) {
        birdY = canvas.height - 50 - birdRadius;
        endGame();
    }

    if (birdY - birdRadius < 0) {
        birdY = birdRadius;
        velocity = 0;
    }
}

function updatePipes() {
    if (!gameStarted || gameOver) return;

    const currentTime = Date.now();

    // Create new pipes
    if (currentTime - lastPipeTime > pipeInterval) {
        createPipe();
        lastPipeTime = currentTime;
    }

    // Update existing pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= pipeSpeed;

        // Remove pipes that are off screen
        if (pipe.x + pipeWidth < 0) {
            pipes.splice(i, 1);
            continue;
        }

        // Check for scoring
        if (!pipe.passed && pipe.x + pipeWidth < birdX) {
            pipe.passed = true;
            score++;
            document.getElementById('score').textContent = score;
            playScoreSound();
        }

        // Check collisions
        if (checkCollision(pipe)) {
            endGame();
        }
    }
}

function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - 50 - pipeGap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        bottomY: topHeight + pipeGap,
        passed: false
    });
}

function checkCollision(pipe) {
    // Bird collision with pipe
    if (birdX + birdRadius > pipe.x && birdX - birdRadius < pipe.x + pipeWidth) {
        if (birdY - birdRadius < pipe.topHeight || birdY + birdRadius > pipe.bottomY) {
            return true;
        }
    }
    return false;
}

function endGame() {
    gameOver = true;
    document.getElementById('finalScore').textContent = 'Score: ' + score;
    document.getElementById('gameOver').style.display = 'block';
    playCrashSound();
}

function playScoreSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 1200;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function playCrashSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.5);
        oscillator.type = 'sawtooth';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    } catch (e) {
        console.log('Audio not supported');
    }
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    drawBackground();

    // Draw ground
    drawGround();

    // Draw bird
    drawBird();

    // Draw pipes
    drawPipes();

    // Render Three.js scene
    renderer.render(scene, camera);
}

function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#98D8E8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGround() {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 50);

    // Grass on top of ground
    ctx.fillStyle = '#2E8B57';
    ctx.fillRect(0, canvas.height - 50, canvas.width, 10);
}

function drawBird() {
    ctx.save();
    ctx.translate(birdX, birdY);

    // Apply rotation based on velocity
    const rotation = Math.min(Math.max(velocity * 0.1, -0.5), 0.5);
    ctx.rotate(rotation);

    // Bird body
    ctx.fillStyle = '#FFD700'; // Yellow
    ctx.beginPath();
    ctx.arc(0, 0, birdRadius, 0, Math.PI * 2);
    ctx.fill();

    // Bird eye
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(8, -5, 4, 0, Math.PI * 2);
    ctx.fill();

    // Bird beak
    ctx.fillStyle = '#FF8C00'; // Orange
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(25, -5);
    ctx.lineTo(25, 5);
    ctx.closePath();
    ctx.fill();

    // Bird wing
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.ellipse(-5, 5, 12, 8, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function drawPipes() {
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillStyle = '#228B22'; // Green
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);

        // Pipe cap (top)
        ctx.fillStyle = '#32CD32'; // Light green
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipeWidth + 10, 20);

        // Bottom pipe
        ctx.fillStyle = '#228B22';
        ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, canvas.height - pipe.bottomY);

        // Pipe cap (bottom)
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(pipe.x - 5, pipe.bottomY, pipeWidth + 10, 20);
    });
}

function gameLoop() {
    updateBird();
    updatePipes();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game when page loads
window.onload = init;
