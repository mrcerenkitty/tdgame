const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let gold = 500, wave = 1, playerHP = 100;
let selectedTowerType = null, isPaused = false, gameActive = false;
let enemies = [], towers = [], bullets = [], explosions = [], particles = [];
let mouseX = 0, mouseY = 0;

const TOWER_TYPES = {
    turret: { name: "Turret", cost: 100, damage: 25, range: 180, color: "#3498db", fireRate: 30, splash: 0 },
    splash: { name: "Blast", cost: 200, damage: 30, range: 110, color: "#e67e22", fireRate: 80, splash: 80 }
};

const waypoints = [{x:0, y:150}, {x:600, y:150}, {x:600, y:450}, {x:150, y:450}, {x:150, y:600}];

function startGame() {
    console.log("Game Starting...");
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

function spawnWave() {
    let count = 5 + (wave * 2);
    for(let i=0; i<count; i++) {
        setTimeout(() => {
            if(gameActive && !isPaused) enemies.push({
                x: waypoints[0].x, y: waypoints[0].y, wpIdx: 1,
                hp: 20+(wave*8), maxHp: 20+(wave*8), speed: 1+(wave*0.05)
            });
        }, i * 1000);
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!isPaused && gameActive) {
        // Draw Path
        ctx.strokeStyle = "#34495e"; ctx.lineWidth = 40; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(waypoints[0].x, waypoints[0].y);
        waypoints.forEach(w => ctx.lineTo(w.x, w.y)); ctx.stroke();

        // Enemies
        for(let i=enemies.length-1; i>=0; i--) {
            let e = enemies[i], target = waypoints[e.wpIdx];
            let dx = target.x - e.x, dy = target.y - e.y, dist = Math.hypot(dx, dy);
            if(dist < e.speed) {
                e.wpIdx++;
                if(e.wpIdx >= waypoints.length) { playerHP -= 10; enemies.splice(i, 1); updateUI(); continue; }
            } else {
                e.x += (dx/dist)*e.speed; e.y += (dy/dist)*e.speed;
            }
            ctx.fillStyle = "#e74c3c"; ctx.fillRect(e.x-10, e.y-10, 20, 20);
            ctx.fillStyle = "#2ecc71"; ctx.fillRect(e.x-10, e.y-15, (e.hp/e.maxHp)*20, 3);
            if(e.hp <= 0) { enemies.splice(i,1); gold += 15; updateUI(); }
        }

        // Towers
        towers.forEach(t => {
            ctx.fillStyle = t.color; ctx.beginPath(); ctx.arc(t.x, t.y, 15, 0, Math.PI*2); ctx.fill();
            t.lastShot = (t.lastShot || 0) + 1;
            if(t.lastShot >= t.fireRate) {
                let target = enemies.find(e => Math.hypot(e.x-t.x, e.y-t.y) < t.range);
                if(target) { bullets.push({x:t.x, y:t.y, tx:target.x, ty:target.y, dmg:t.damage, splash:t.splash, color:t.color}); t.lastShot=0; }
            }
        });

        // Bullets
        for(let i=bullets.length-1; i>=0; i--) {
            let b = bullets[i], dx = b.tx-b.x, dy = b.ty-b.y, dist = Math.hypot(dx, dy);
            if(dist < 10) {
                if(b.splash > 0) {
                    explosions.push({x:b.x, y:b.y, r:10, maxR:b.splash, a:1});
                    enemies.forEach(en => { if(Math.hypot(en.x-b.x, en.y-b.y) < b.splash) en.hp -= b.dmg; });
                } else {
                    let target = enemies.find(en => Math.hypot(en.x-b.x, en.y-b.y) < 20);
                    if(target) target.hp -= b.dmg;
                }
                bullets.splice(i, 1);
            } else {
                b.x += (dx/dist)*8; b.y += (dy/dist)*8;
                ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.x, b.y, 4, 0, Math.PI*2); ctx.fill();
            }
        }

        // Explosions
        for(let i=explosions.length-1; i>=0; i--) {
            let ex = explosions[i]; ex.r += 2; ex.a -= 0.05;
            ctx.fillStyle = `rgba(230, 126, 34, ${ex.a})`; ctx.beginPath(); ctx.arc(ex.x, ex.y, ex.r, 0, Math.PI*2); ctx.fill();
            if(ex.a <= 0) explosions.splice(i, 1);
        }

        if(enemies.length === 0) { wave++; spawnWave(); updateUI(); }
    }
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener('mousemove', e => { 
    const rect = canvas.getBoundingClientRect(); 
    mouseX = e.clientX - rect.left; mouseY = e.clientY - rect.top; 
});

canvas.addEventListener('mousedown', () => {
    if(!selectedTowerType || isPaused) return;
    const config = TOWER_TYPES[selectedTowerType];
    if(gold >= config.cost) {
        towers.push({x: mouseX, y: mouseY, ...config});
        gold -= config.cost; updateUI();
    }
});

function updateUI() {
    document.getElementById('gold-txt').innerText = gold;
    document.getElementById('wave-txt').innerText = wave;
    document.getElementById('hp-txt').innerText = playerHP;
    if(playerHP <= 0) { alert("Game Over"); location.reload(); }
}

function selectTower(type) { selectedTowerType = type; }
function addDevMoney() { gold += 100; updateUI(); }
function toggleEncyclopedia(s) { 
    document.getElementById('main-menu').classList.toggle('hidden', s);
    document.getElementById('encyclopedia').classList.toggle('hidden', !s);
}
