
import { Enemy, Tower, Projectile, Spike } from './entity.js';
import { UIManager } from './ui.js';

const WAVES = [
    // Scaled up waves: ~3x enemies, scripted bursts

    // Wave 1
    {
        bursts: [
            { count: 10, interval: 1.0, type: 'elf' }, // Was 5
            { delay: 3.0 },
            { count: 5, interval: 0.8, type: 'elf' }
        ]
    },

    // Wave 2
    {
        bursts: [
            { count: 15, interval: 1.0, type: 'elf' },
            { delay: 4.0 },
            { count: 15, interval: 0.8, type: 'elf' }
        ]
    },

    // Wave 3
    {
        bursts: [
            { count: 5, interval: 0.5, type: 'elf' }, // Fast pulse
            { count: 5, interval: 0.5, type: 'elf' },
            { delay: 2.0 },
            { count: 20, interval: 0.8, type: 'elf' },
            { delay: 2.0 },
            { count: 10, interval: 0.5, type: 'elf' }
        ]
    },

    // Wave 4
    { bursts: [{ count: 60, interval: 0.6, type: 'elf' }] }, // Swarm

    // Wave 5
    {
        bursts: [
            { count: 30, interval: 0.5, type: 'elf' },
            { delay: 5.0 },
            { count: 30, interval: 0.5, type: 'elf' },
            { delay: 2.0 },
            { count: 10, interval: 0.3, type: 'elf' } // Rush
        ]
    },

    // Wave 6
    { bursts: [{ count: 80, interval: 0.4, type: 'elf' }] },

    // Wave 7
    {
        bursts: [
            { count: 20, interval: 0.3, type: 'elf' },
            { delay: 2.0 },
            { count: 40, interval: 0.6, type: 'elf' },
            { delay: 2.0 },
            { count: 20, interval: 0.3, type: 'elf' }
        ]
    },

    // Wave 8
    { bursts: [{ count: 100, interval: 0.4, type: 'elf' }] },

    // Wave 9
    {
        bursts: [
            { count: 50, interval: 0.3, type: 'elf' },
            { delay: 5.0 },
            { count: 50, interval: 0.3, type: 'elf' }
        ]
    },

    // Wave 10: Boss + Minions
    {
        bursts: [
            { count: 20, interval: 0.4, type: 'elf' },
            { delay: 3.0 },
            { count: 1, interval: 1.0, type: 'santa' },
            { delay: 5.0 },
            { count: 30, interval: 0.5, type: 'elf' } // Reinforcements
        ]
    }
];

export class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.wave = 1;
        this.candy = 300; // Increased starting candy for harder start
        this.lives = 50; // Increased lives
        this.gameOver = false;
        this.gameWon = false;

        this.enemies = [];
        this.towers = [];
        this.projectiles = []; // Includes Spikes

        this.lastTime = 0;
        this.gameSpeed = 1.0;

        this.waveActive = false;
        this.waveCompleteFlag = false;
        this.currentWaveConfig = null;
        this.burstIndex = 0;
        this.enemiesInBurstSpawned = 0;
        this.burstTimer = 0;
        this.delayTimer = 0;
        this.processingDelay = false;

        this.mouseX = 0;
        this.mouseY = 0;
        this.placingTower = false;
        this.selectedTower = null;

        this.imgs = {
            bg: new Image(),
            elf: new Image(),
            santa: new Image(),
            tower_cane: new Image(),
            tower_trap: new Image(),
            spike: new Image()
        };
        window.imgs = this.imgs;

        this.assetsLoaded = 0;
        this.totalAssets = 6;

        this.pathPoints = [
            { x: 0, y: 0.5 },
            { x: 0.2, y: 0.5 },
            { x: 0.2, y: 0.2 },
            { x: 0.5, y: 0.2 },
            { x: 0.5, y: 0.8 },
            { x: 0.8, y: 0.8 },
            { x: 0.8, y: 0.4 },
            { x: 1.0, y: 0.4 }
        ];

        this.ui = new UIManager(this);

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.setupInput();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    start() {
        this.loadAssets().then(() => {
            console.log("Assets loaded, starting loop");
            this.ui.updateStats();
            this.lastTime = performance.now();
            this.loop(this.lastTime);
        });
    }

    loadAssets() {
        return new Promise(resolve => {
            let loaded = 0;
            const onload = () => {
                loaded++;
                if (loaded === this.totalAssets) resolve();
            };

            this.imgs.bg.onload = onload;
            this.imgs.bg.src = 'assets/bg_winter.png';
            this.imgs.elf.onload = onload;
            this.imgs.elf.src = 'assets/elf.png';
            this.imgs.santa.onload = onload;
            this.imgs.santa.src = 'assets/santa.png';
            this.imgs.tower_cane.onload = onload;
            this.imgs.tower_cane.src = 'assets/tower_cane.png';
            this.imgs.tower_trap.onload = onload;
            this.imgs.tower_trap.src = 'assets/tower_trap.png';
            this.imgs.spike.onload = onload;
            this.imgs.spike.src = 'assets/spike.png';
        });
    }

    setupInput() {
        this.canvas.addEventListener('mousemove', e => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });

        this.canvas.addEventListener('click', e => {
            if (this.gameOver || this.gameWon) return;

            if (this.placingTower) {
                this.tryPlaceTower();
            } else {
                const clickedTower = this.towers.find(t => {
                    const dx = t.x - this.mouseX;
                    const dy = t.y - this.mouseY;
                    return dx * dx + dy * dy < t.radius * t.radius;
                });

                if (clickedTower) {
                    this.selectedTower = clickedTower;
                    this.ui.showUpgradeMenu(clickedTower);
                } else {
                    this.selectedTower = null;
                    this.ui.hideUpgradeMenu();
                }
            }
        });

        document.addEventListener('contextmenu', e => {
            e.preventDefault();
            this.placingTower = false;
        });
    }

    startWave() {
        if (this.waveActive) {
            this.gameSpeed = this.gameSpeed === 1.0 ? 3.0 : 1.0;
            this.ui.updateStats();
            return;
        }

        if (this.wave > WAVES.length) return;

        this.waveActive = true;
        this.waveCompleteFlag = false;
        this.currentWaveConfig = WAVES[Math.min(this.wave - 1, WAVES.length - 1)];
        this.burstIndex = 0;
        this.enemiesInBurstSpawned = 0;
        this.burstTimer = 0;
        this.delayTimer = 0;
        this.processingDelay = false;
        this.gameSpeed = 1.0;

        this.ui.updateStats();
    }

    sellTower(tower) {
        if (!tower) return;
        this.candy += tower.getSellValue();
        this.towers = this.towers.filter(t => t !== tower);
        this.selectedTower = null;
        this.ui.hideUpgradeMenu();
        this.ui.updateStats();
    }

    tryPlaceTower() {
        const cost = this.placingTower === 'trap' ? 150 : 50;
        if (this.candy < cost) return;

        if (this.isCollidingWithPath(this.mouseX, this.mouseY, 25)) return;

        for (let t of this.towers) {
            let dx = t.x - this.mouseX;
            let dy = t.y - this.mouseY;
            if (Math.hypot(dx, dy) < t.radius + 25) return;
        }

        this.towers.push(new Tower(this.mouseX, this.mouseY, this.placingTower));
        this.candy -= cost;
        this.ui.updateStats();
        this.placingTower = false;
    }

    isCollidingWithPath(x, y, radius) {
        const absPath = this.getAbsoluteWaypoints();
        for (let i = 0; i < absPath.length - 1; i++) {
            let p1 = absPath[i];
            let p2 = absPath[i + 1];
            if (this.circleLineIntersect(x, y, radius, p1.x, p1.y, p2.x, p2.y)) {
                return true;
            }
        }
        return false;
    }

    circleLineIntersect(cx, cy, r, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        let t = 0;
        if (lenSq !== 0) {
            t = ((cx - x1) * dx + (cy - y1) * dy) / lenSq;
        }
        t = Math.max(0, Math.min(1, t));
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;
        const dist = Math.hypot(cx - closestX, cy - closestY);
        return dist < r + 40;
    }

    getAbsoluteWaypoints() {
        return this.pathPoints.map(p => ({
            x: p.x * this.canvas.width,
            y: p.y * this.canvas.height
        }));
    }

    loop(timestamp) {
        const dt = ((timestamp - this.lastTime) / 1000); // Real delta
        this.lastTime = timestamp;

        if (!this.gameOver && !this.gameWon) {
            this.update(dt * this.gameSpeed);
        }
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Wave Spawning
        if (this.waveActive && this.currentWaveConfig) {
            if (this.burstIndex < this.currentWaveConfig.bursts.length) {
                const burst = this.currentWaveConfig.bursts[this.burstIndex];

                if (burst.delay && !this.processingDelay) {
                    this.processingDelay = true;
                    this.delayTimer = burst.delay;
                }

                if (this.processingDelay) {
                    this.delayTimer -= dt;
                    if (this.delayTimer <= 0) {
                        this.processingDelay = false;
                        this.burstIndex++;
                        this.enemiesInBurstSpawned = 0;
                    }
                } else {
                    this.burstTimer -= dt;
                    if (this.burstTimer <= 0) {
                        if (this.enemiesInBurstSpawned < burst.count) {
                            const speedMult = 1.0 + (this.wave * 0.1);
                            this.enemies.push(new Enemy(this.getAbsoluteWaypoints(), burst.type || 'elf', speedMult));

                            this.enemiesInBurstSpawned++;
                            this.burstTimer = burst.interval;
                        } else {
                            this.burstIndex++;
                            this.enemiesInBurstSpawned = 0;
                        }
                    }
                }
            } else if (this.enemies.length === 0) {
                this.waveComplete();
            }
        }

        // Entities
        this.enemies.forEach(e => e.update(dt));

        // Towers need projectilesList to spawn projectiles OR Spikes
        this.towers.forEach(t => t.update(dt, this.enemies, this.projectiles));

        // Projectiles (and Spikes)
        this.projectiles.forEach(p => {
            if (p instanceof Spike) {
                p.update(dt, this.enemies);
            } else {
                p.update(dt);
            }
        });

        // Cleanup
        this.enemies = this.enemies.filter(e => {
            if (e.reachedEnd) {
                this.lives--;
                this.ui.updateStats();
                if (this.lives <= 0) this.triggerGameOver();
                return false;
            }
            if (e.health <= 0) {
                this.candy += e.value;
                this.ui.updateStats();

                if (e.type === 'santa') {
                    this.triggerWin();
                }
                return false;
            }
            return true;
        });

        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
    }

    waveComplete() {
        if (this.waveCompleteFlag) return;
        this.waveCompleteFlag = true;
        this.waveActive = false;
        this.candy += 100 + (this.wave * 20);
        this.wave++;
        this.gameSpeed = 1.0;
        this.ui.updateStats();
    }

    triggerGameOver() {
        this.gameOver = true;
        document.getElementById('game-over-screen').classList.remove('hidden');
    }

    triggerWin() {
        this.gameWon = true;
        document.getElementById('victory-screen').classList.remove('hidden');
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // BG
        if (this.imgs.bg.complete && this.imgs.bg.naturalWidth > 0) {
            const ptrn = this.ctx.createPattern(this.imgs.bg, 'repeat');
            this.ctx.fillStyle = ptrn;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            this.ctx.fillStyle = '#222';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        const waypoints = this.getAbsoluteWaypoints();
        if (waypoints.length > 0) {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(waypoints[0].x, waypoints[0].y);
            for (let i = 1; i < waypoints.length; i++) {
                this.ctx.lineTo(waypoints[i].x, waypoints[i].y);
            }
            this.ctx.lineWidth = 60;
            this.ctx.strokeStyle = 'rgba(230, 240, 255, 0.6)';
            this.ctx.stroke();

            this.ctx.beginPath();
            this.ctx.moveTo(waypoints[0].x, waypoints[0].y);
            for (let i = 1; i < waypoints.length; i++) {
                this.ctx.lineTo(waypoints[i].x, waypoints[i].y);
            }
            this.ctx.lineWidth = 50;
            this.ctx.strokeStyle = '#d4e9ed';
            this.ctx.stroke();
        }

        // Projectiles/Spikes usually drawn below units or above? Spikes below.
        // We sort all entities by Y for simple logic.
        const entities = [...this.towers, ...this.enemies];
        entities.sort((a, b) => a.y - b.y);

        // Draw Spikes first (ground level)
        this.projectiles.filter(p => p instanceof Spike).forEach(s => s.draw(this.ctx));

        entities.forEach(e => {
            const isSelected = (e === this.selectedTower);
            e.draw(this.ctx, isSelected);
        });

        // Draw Projectiles (Air)
        this.projectiles.filter(p => !(p instanceof Spike)).forEach(p => p.draw(this.ctx));

        // Placement Ghost
        if (this.placingTower) {
            this.ctx.globalAlpha = 0.5;
            this.ctx.beginPath();
            const range = this.placingTower === 'trap' ? 100 : 150;
            this.ctx.arc(this.mouseX, this.mouseY, range, 0, Math.PI * 2); // Range
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.stroke();

            let size = 50;
            let img = this.placingTower === 'trap' ? this.imgs.tower_trap : this.imgs.tower_cane;
            if (img) {
                this.ctx.drawImage(img, this.mouseX - size / 2, this.mouseY - size / 2, size, size);
            }

            if (this.isCollidingWithPath(this.mouseX, this.mouseY, 25)) {
                this.ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                this.ctx.beginPath();
                this.ctx.arc(this.mouseX, this.mouseY, 25, 0, Math.PI * 2);
                this.ctx.fill();
            }

            this.ctx.globalAlpha = 1.0;
        }
    }
}
