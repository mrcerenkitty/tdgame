}
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- GAME STATE ---
let gold = 500;
let wave = 1;
let playerHP = 100; // New: Global Health
let selectedTowerType = null;
let enemies = [];
let towers = [];
let bullets = [];
let explosions = [];
let particles = [];
let isPaused = false;
let gameActive = false;

// Mouse Tracking
let mouseX = 0;
let mouseY = 0;

// --- CONFIGURATION & BALANCING ---
const TOWER_TYPES = {
    turret: { name: "Turret", cost: 100, damage: 25, range: 180, color: "#3498db", fireRate: 30, splash: 0 },
    splash: { name: "Blast", cost: 200, damage: 30, range: 110, color: "#e67e22", fireRate: 80, splash: 80 }
};

const waypoints = [
    { x: 0, y: 150 },
    { x: 600, y: 150 },
    { x: 600, y: 450 },
    { x: 150, y: 450 },
    { x: 150, y: 600 } 
];
const PATH_WIDTH = 40;

const archive = {
    towers: [
        { name: "Turret", desc: "Single target. Reliable.", stats: "Dmg: 25 | Range: 180" },
        { name: "Blast Tower", desc: "Deals splash damage.", stats: "Dmg: 30 | Range: 110" }
    ],
    enemies: [
        { name: "Scout", desc: "Standard unit.", stats: "HP: 20 + Wave Scaling" }
    ]
};

// --- CONTROLS & MENU ---
window.addEventListener('keydown', (e) => {
    if (e.key === "Escape" && gameActive) {
        isPaused = !isPaused;
        document.getElementById('main-menu').classList.toggle('hidden', !isPaused);
        document.querySelector('#main-menu h1').innerText = isPaused ? "PAUSED" : "CORE DEFENSE";
    }
    if (e.key === "1") selectTower('turret');
    if (e.key === "2") selectTower('splash');
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

function toggleEncyclopedia(show) {
    document.getElementById('main-menu').classList.toggle('hidden', show);
    document.getElementById('encyclopedia').classList.toggle('hidden', !show);
    if(show) renderEnc('towers');
}

function renderEnc(category) {
    const container = document.getElementById('enc-content');
    container.innerHTML = archive[category].map(item => `
        <div style="border-bottom: 1px solid #555; margin-bottom: 10px;">
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <small style="color: #27ae60">${item.stats}</small>
        </div>
    `).join('');
}

function startGame() {
    if (isPaused) { 
        isPaused = false; 
    } else {
        gameActive = true;
        spawnWave();
        gameLoop();
    }
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');
}

// Background Particles
for (let i = 0; i < 50; i++) {
    particles.push({ x: Math.random() * 800, y: Math.random() * 600, vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5, size: Math.random() * 2 });
}

// --- CORE MECHANICS ---

function distToSegment(p, v, w) {
    let l2 = (w.x - v.x)**2 + (w.y - v.y)**2;
    if (l2 == 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

function canPlaceTower(x, y) {
    for(let i = 0; i < waypoints.length - 1; i++) {
        if(distToSegment({x, y}, waypoints[i], waypoints[i+1]) < (PATH_WIDTH/2 + 15)) return false;
    }
    for(let t of towers) {
        if(Math.hypot(t.x - x, t.y - y) < 30) return false;
    }
    return true;
}

canvas.addEventListener('mousedown', (e) => {
    if (!selectedTowerType || isPaused) return;
    
    const config = TOWER_TYPES[selectedTowerType];
    if (gold >= config.cost && canPlaceTower(mouseX, mouseY)) {
        towers.push({ x: mouseX, y: mouseY, ...config, lastShot: 0 });
        gold -= config.cost;
        selectedTowerType = null;
        selectTower(null);
        updateUI();
    }
});

function updateUI() {
    document.getElementById('gold-txt').innerText = gold;
    document.getElementById('wave-txt').innerText = wave;
    document.getElementById('hp-txt').innerText = playerHP;

    if (playerHP <= 0) {
        gameActive = false;
        alert("GAME OVER! You survived until Wave " + wave);
        location.reload(); 
    }
}

// Dev Tool Function
function addDevMoney() {
    gold += 100;
    updateUI();
}

function spawnWave() {
    const enemyCount = 5 + (wave * 2);
    for (let i = 0; i < enemyCount; i++) {
        setTimeout(() => {
            if (!isPaused && gameActive) {
                enemies.push({ 
                    x: waypoints[0].x, y: waypoints[0].y, wpIdx: 1, 
                    hp: 20 + (wave * 8), maxHp: 20 + (wave * 8), speed: 1 + (wave * 0.05) 
                });
            }
        }, i * 1200);
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (isPaused || !gameActive) {
        ctx.fillStyle = "rgba(79, 172, 254, 0.5)";
        particles.forEach(p => {
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
        });
    }

    if (!isPaused && gameActive) {
        // 1. DRAW PATH
        ctx.strokeStyle = "#34495e";
        ctx.lineWidth = PATH_WIDTH;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(waypoints[0].x, waypoints[0].y);
        for(let i = 1; i < waypoints.length; i++) ctx.lineTo(waypoints[i].x, waypoints[i].y);
        ctx.stroke();

        // 2. PLACEMENT PREVIEW
        if (selectedTowerType) {
            const config = TOWER_TYPES[selectedTowerType];
            const isValid = canPlaceTower(mouseX, mouseY) && gold >= config.cost;
            ctx.fillStyle = isValid ? "rgba(255, 255, 255, 0.1)" : "rgba(231, 76, 60, 0.2)";
            ctx.strokeStyle = isValid ? "white" : "red";
            ctx.beginPath(); ctx.arc(mouseX, mouseY, config.range, 0, Math.PI * 2); 
            ctx.fill(); ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = config.color;
            ctx.beginPath(); ctx.arc(mouseX, mouseY, 15, 0, Math.PI * 2); ctx.fill();
            ctx.globalAlpha = 1.0;
        }

        // 3. UPDATE & DRAW ENEMIES
        for (let i = enemies.length - 1; i >= 0; i--) {
            let e = enemies[i];
            let targetWp = waypoints[e.wpIdx];
            let dx = targetWp.x - e.x;
            let dy = targetWp.y - e.y;
            let dist = Math.hypot(dx, dy);

            if (dist < e.speed) {
                e.x = targetWp.x; e.y = targetWp.y;
                e.wpIdx++;
                if (e.wpIdx >= waypoints.length) {
                    playerHP -= 10; // Health Displayer Logic
                    enemies.splice(i, 1);
                    updateUI();
                    continue;
                }
            } else {
                e.x += (dx / dist) * e.speed;
                e.y += (dy / dist) * e.speed;
            }
            
            // Draw Enemy & Bars
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(e.x - 10, e.y - 10, 20, 20);
            ctx.fillStyle = "#555"; ctx.fillRect(e.x - 12, e.y - 20, 24, 4); 
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(e.x - 12, e.y - 20, (e.hp/e.maxHp) * 24, 4);
            
            // HP Number
            ctx.fillStyle = "white";
            ctx.font = "10px Arial";
            ctx.textAlign = "center";
            ctx.fillText(Math.ceil(e.hp), e.x, e.y - 25);

            if (e.hp <= 0) {
                enemies.splice(i, 1);
                gold += 15;
                updateUI();
            }
        }

        // 4. TOWERS & SHOOTING
        let hoveredTower = null;
        towers.forEach(t => {
            ctx.fillStyle = t.color;
            ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI * 2); ctx.fill();

            if (!selectedTowerType && Math.hypot(mouseX - t.x, mouseY - t.y) < 15) {
                hoveredTower = t;
            }

            t.lastShot++;
            if (t.lastShot >= t.fireRate) {
                const target = enemies.find(e => Math.hypot(e.x - t.x, e.y - t.y) < t.range);
                if (target) {
                    bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, dmg: t.damage, splash: t.splash, speed: 8, color: t.color });
                    t.lastShot = 0;
                }
            }
        });

        // 5. BULLETS & EXPLOSIONS
        for (let i = bullets.length - 1; i >= 0; i--) {
            let b = bullets[i];
            let dx = b.tx - b.x; let dy = b.ty - b.y;
            let dist = Math.hypot(dx, dy);
            
            if (dist < b.speed) {
                if (b.splash > 0) {
                    explosions.push({ x: b.x, y: b.y, radius: 10, maxRadius: b.splash, alpha: 1 });
                    enemies.forEach(en => {
                        if (Math.hypot(en.x - b.x, en.y - b.y) < b.splash) en.hp -= b.dmg;
                    });
                } else {
                    const target = enemies.find(en => Math.hypot(en.x - b.x, en.y - b.y) < 20);
                    if (target) target.hp -= b.dmg;
                }
                bullets.splice(i, 1);
            } else {
                b.x += (dx / dist) * b.speed; b.y += (dy / dist) * b.speed;
                ctx.fillStyle = b.color;
                ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
            }
        }

        // Draw Explosions
        for (let i = explosions.length - 1; i >= 0; i--) {
            let exp = explosions[i];
            exp.radius += 3; exp.alpha -= 0.05;
            ctx.fillStyle = `rgba(230, 126, 34, ${exp.alpha})`;
            ctx.beginPath(); ctx.arc(exp.x, exp.y, exp.radius, 0, Math.PI*2); ctx.fill();
            if (exp.alpha <= 0) explosions.splice(i, 1);
        }

        // 6. HOVER TOOLTIP
        if (hoveredTower) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(mouseX + 15, mouseY + 15, 120, 60);
            ctx.fillStyle = "white";
            ctx.font = "12px Arial";
            ctx.textAlign = "left";
            ctx.fillText(`Type: ${hoveredTower.name}`, mouseX + 25, mouseY + 35);
            ctx.fillText(`Dmg: ${hoveredTower.damage}`, mouseX + 25, mouseY + 50);
            ctx.fillText(`Range: ${hoveredTower.range}`, mouseX + 25, mouseY + 65);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
            ctx.beginPath(); ctx.arc(hoveredTower.x, hoveredTower.y, hoveredTower.range, 0, Math.PI * 2); ctx.stroke();
        }

        if (enemies.length === 0 && gameActive) {
            wave++;
            updateUI();
            spawnWave();
        }
    }
    requestAnimationFrame(gameLoop);
}

function selectTower(type) {
    selectedTowerType = selectedTowerType === type ? null : type;
    document.getElementById('btn-turret').style.border = selectedTowerType === 'turret' ? "2px solid gold" : "1px solid #4facfe";
    document.getElementById('btn-splash').style.border = selectedTowerType === 'splash' ? "2px solid gold" : "1px solid #4facfe";
}
