import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ==================== GAME STATE ====================
let tokens = 100;  // starting bonus
let clickPower = 1;
let autoPower = 0;
let level = 1;
let superActive = false;
let superEndTime = 0;

// Upgrade costs
let tapUpgradeCost = 100;
let autoUpgradeCost = 150;

// DOM Elements
const tokenSpan = document.getElementById('tokenCount');
const clickPowerSpan = document.getElementById('clickPower');
const autoPowerSpan = document.getElementById('autoPower');
const levelSpan = document.getElementById('level');
const tapCostSpan = document.getElementById('tapCost');
const autoCostSpan = document.getElementById('autoCost');
const superBtn = document.getElementById('superBtn');
const upgradeTapBtn = document.getElementById('upgradeTap');
const upgradeAutoBtn = document.getElementById('upgradeAuto');
const tapEffectDiv = document.getElementById('tapEffect');

// ==================== THREE.JS SETUP ====================
const canvas = document.getElementById('gameCanvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a2a);
scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 5);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404060);
scene.add(ambientLight);

const mainLight = new THREE.DirectionalLight(0xffffff, 1);
mainLight.position.set(2, 3, 4);
scene.add(mainLight);

const backLight = new THREE.PointLight(0x4466ff, 0.5);
backLight.position.set(0, 1, -2);
scene.add(backLight);

const fillLight = new THREE.PointLight(0xffaa66, 0.3);
fillLight.position.set(1, 2, 2);
scene.add(fillLight);

// Stars background
const starGeometry = new THREE.BufferGeometry();
const starCount = 1000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i*3] = (Math.random() - 0.5) * 2000;
    starPositions[i*3+1] = (Math.random() - 0.5) * 1000;
    starPositions[i*3+2] = (Math.random() - 0.5) * 100 - 50;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.3 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// ==================== LOAD YOUR GLB MODEL ====================
// ⚠️ IMPORTANT: Change 'your-model.glb' to your actual GLB filename!
const modelPath = 'your-model.glb';  // ← তোমার GLB ফাইলের নাম এখানে দাও

let clickableModel = null;
const loader = new GLTFLoader();

loader.load(modelPath, 
    (gltf) => {
        clickableModel = gltf.scene;
        scene.add(clickableModel);
        clickableModel.position.set(0, 0, 0);
        clickableModel.scale.set(1, 1, 1);
        
        // Auto-rotate animation
        function animateModel() {
            requestAnimationFrame(animateModel);
            if (clickableModel && !superActive) {
                clickableModel.rotation.y += 0.005;
            } else if (clickableModel && superActive) {
                clickableModel.rotation.y += 0.02; // Faster when super active
            }
        }
        animateModel();
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% loaded');
    },
    (error) => {
        console.error('Error loading GLB:', error);
        // Fallback: Create a crystal shape if GLB fails to load
        createFallbackModel();
    }
);

// Fallback if GLB not found
function createFallbackModel() {
    const geometry = new THREE.IcosahedronGeometry(1.2, 0);
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x44aaff, 
        emissive: 0x1155aa,
        metalness: 0.8,
        roughness: 0.2
    });
    clickableModel = new THREE.Mesh(geometry, material);
    scene.add(clickableModel);
}

// ==================== CLICK DETECTION (Raycaster) ====================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onCanvasClick(event) {
    if (!clickableModel) return;
    
    // Calculate mouse position in normalized coordinates
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(clickableModel, true);
    
    if (intersects.length > 0) {
        tapMine(event.clientX, event.clientY);
    }
}

canvas.addEventListener('click', onCanvasClick);

// ==================== TAP MINING FUNCTION ====================
function tapMine(clientX, clientY) {
    let gain = clickPower;
    if (superActive) gain *= 5;
    
    tokens += gain;
    updateUI();
    checkLevelUp();
    createTapEffect(clientX, clientY, gain);
    
    // Shake effect on tap
    if (clickableModel) {
        clickableModel.scale.set(1.05, 1.05, 1.05);
        setTimeout(() => {
            if (clickableModel) clickableModel.scale.set(1, 1, 1);
        }, 100);
    }
}

function createTapEffect(x, y, amount) {
    const particle = document.createElement('div');
    particle.className = 'tap-particle';
    particle.innerText = `+${amount}`;
    particle.style.left = `${x - 20}px`;
    particle.style.top = `${y - 20}px`;
    tapEffectDiv.appendChild(particle);
    setTimeout(() => particle.remove(), 600);
}

// ==================== AUTO MINING (per second) ====================
setInterval(() => {
    let gain = autoPower;
    if (superActive) gain *= 5;
    tokens += gain;
    updateUI();
}, 1000);

// ==================== LEVEL UP SYSTEM (Unlimited) ====================
function checkLevelUp() {
    let required = Math.floor(100 * Math.pow(1.2, level - 1)); // Exponential cost
    while (tokens >= required && level < 9999) {
        tokens -= required;
        level++;
        clickPower += 1;
        autoPower += 0.5;
        
        // Show level up animation
        showLevelUpAnimation();
        
        // Show speed burst animation when auto power upgrades
        showSpeedBurstAnimation();
        
        required = Math.floor(100 * Math.pow(1.2, level - 1));
        updateUI();
    }
}

function showLevelUpAnimation() {
    const div = document.createElement('div');
    div.className = 'levelup-effect';
    div.innerText = `⚡ LEVEL ${level} UNLOCKED! ⚡`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
}

function showSpeedBurstAnimation() {
    const div = document.createElement('div');
    div.className = 'speed-burst';
    div.innerText = `💨 SPEED BOOST! +${autoPower.toFixed(1)}/sec 💨`;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 800);
}

// ==================== SUPER POWER (every 60 seconds) ====================
setInterval(() => {
    if (!superActive) {
        superBtn.classList.remove('hidden');
    }
}, 60000);

superBtn.addEventListener('click', () => {
    if (superActive) return;
    superActive = true;
    superEndTime = Date.now() + 60000;
    superBtn.classList.add('hidden');
    
    // Show super active visual effects
    const border = document.createElement('div');
    border.className = 'super-active-border';
    document.body.appendChild(border);
    
    // Flash effect
    document.body.style.animation = 'none';
    setTimeout(() => {
        document.body.style.animation = 'flash 0.5s';
    }, 10);
    
    setTimeout(() => {
        superActive = false;
        border.remove();
    }, 60000);
    
    // Create floating "5x" text
    for (let i = 0; i < 10; i++) {
        setTimeout(() => {
            const fx = document.createElement('div');
            fx.className = 'tap-particle';
            fx.innerText = '5x!';
            fx.style.left = `${Math.random() * window.innerWidth}px`;
            fx.style.top = `${Math.random() * window.innerHeight}px`;
            fx.style.color = '#ff6600';
            fx.style.fontSize = '30px';
            tapEffectDiv.appendChild(fx);
            setTimeout(() => fx.remove(), 800);
        }, i * 200);
    }
});

// ==================== UPGRADES ====================
upgradeTapBtn.addEventListener('click', () => {
    if (tokens >= tapUpgradeCost) {
        tokens -= tapUpgradeCost;
        clickPower += 1;
        tapUpgradeCost = Math.floor(tapUpgradeCost * 1.5);
        updateUI();
    }
});

upgradeAutoBtn.addEventListener('click', () => {
    if (tokens >= autoUpgradeCost) {
        tokens -= autoUpgradeCost;
        autoPower += 0.5;
        autoUpgradeCost = Math.floor(autoUpgradeCost * 1.5);
        updateUI();
        showSpeedBurstAnimation();
    }
});

// ==================== UI UPDATE ====================
function updateUI() {
    tokenSpan.innerText = Math.floor(tokens);
    clickPowerSpan.innerText = clickPower;
    autoPowerSpan.innerText = autoPower.toFixed(1);
    levelSpan.innerText = level;
    tapCostSpan.innerText = tapUpgradeCost;
    autoCostSpan.innerText = autoUpgradeCost;
}

// ==================== ANIMATION LOOP ====================
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate stars slowly
    stars.rotation.y += 0.0005;
    stars.rotation.x += 0.0003;
    
    // Camera slight idle movement
    if (!superActive) {
        camera.position.x += (0 - camera.position.x) * 0.05;
    } else {
        camera.position.x += (Math.sin(Date.now() * 0.008) * 0.1 - camera.position.x) * 0.05;
    }
    camera.lookAt(0, 0, 0);
    
    renderer.render(scene, camera);
}

animate();

// ==================== RESIZE HANDLER ====================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize UI
updateUI();

// Add CSS flash animation
const style = document.createElement('style');
style.textContent = `
    @keyframes flash {
        0% { background-color: rgba(255,215,0,0); }
        50% { background-color: rgba(255,215,0,0.3); }
        100% { background-color: rgba(255,215,0,0); }
    }
`;
document.head.appendChild(style);

console.log('Game loaded! Tap on the 3D model to mine Azurite!');
