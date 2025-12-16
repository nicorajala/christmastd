
export class UIManager {
    constructor(game) {
        this.game = game;
        this.hud = {
            wave: document.getElementById('wave-display'),
            candy: document.getElementById('candy-display'),
            lives: document.getElementById('lives-display')
        };

        this.upgradePanel = document.getElementById('upgrade-panel');
        this.upgradeOptions = document.getElementById('upgrade-options');
        this.closeUpgradeBtn = document.getElementById('close-upgrade-btn');

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('start-wave-btn').addEventListener('click', () => {
            this.game.startWave();
            // Button state is handled in updateStats
        });

        document.querySelectorAll('.shop-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                this.game.placingTower = type;
            });
        });

        this.closeUpgradeBtn.addEventListener('click', () => {
            this.hideUpgradeMenu();
        });

        document.getElementById('restart-btn').addEventListener('click', () => location.reload()); // Simple restart
        document.getElementById('play-again-btn').addEventListener('click', () => location.reload());
    }

    updateStats() {
        this.hud.wave.innerText = this.game.wave;
        this.hud.candy.innerText = Math.floor(this.game.candy);
        this.hud.lives.innerText = this.game.lives;

        const btn = document.getElementById('start-wave-btn');
        if (!this.game.waveActive) {
            btn.disabled = false;
            if (this.game.wave > 10) {
                btn.disabled = true;
                btn.innerText = "All Waves Done";
            } else if (this.game.wave === 10) {
                btn.innerText = "Start Boss Wave";
            } else {
                btn.innerText = `Start Wave ${this.game.wave}`;
            }
            // Reset style
            btn.classList.remove('active-speed');
        } else {
            // Speed toggle state
            btn.disabled = false; // Allow clicking for speed
            if (this.game.gameSpeed > 1.0) {
                btn.innerText = ">> FAST FORWARD >>";
                btn.classList.add('active-speed');
                btn.style.background = '#ff0';
                btn.style.color = 'black';
            } else {
                btn.innerText = "> Normal Speed";
                btn.classList.remove('active-speed');
                btn.style.background = '';
                btn.style.color = '';
            }
        }
    }

    showUpgradeMenu(tower) {
        this.selectedTower = tower;
        this.upgradePanel.classList.remove('hidden');
        this.renderUpgrades();
    }

    hideUpgradeMenu() {
        this.selectedTower = null;
        this.upgradePanel.classList.add('hidden');
    }

    renderUpgrades() {
        if (!this.selectedTower) return;

        this.upgradeOptions.innerHTML = '';
        const t = this.selectedTower;

        // Sell Button
        const sellContainer = document.createElement('div');
        sellContainer.style.marginBottom = '10px';
        sellContainer.style.textAlign = 'center';
        const sellValue = t.getSellValue();

        const sellBtn = document.createElement('button');
        sellBtn.className = 'btn';
        sellBtn.style.backgroundColor = '#d33';
        sellBtn.style.color = 'white';
        sellBtn.style.width = '100%';
        sellBtn.innerText = `Sell for ${sellValue} 🍬`;
        sellBtn.addEventListener('click', () => {
            this.game.sellTower(t);
        });
        sellContainer.appendChild(sellBtn);
        this.upgradeOptions.appendChild(sellContainer);

        // 3 Paths
        // Path 1: Damage
        // Path 2: Range
        // Path 3: Fire Rate

        const paths = [
            { id: 0, name: "Sugar Rush (Speed)", cost: 50 * (t.upgrades[0] + 1), stat: "Fire Rate" },
            { id: 1, name: "Hard Candy (Damage)", cost: 50 * (t.upgrades[1] + 1), stat: "Damage" },
            { id: 2, name: "Peppermint sight (Range)", cost: 50 * (t.upgrades[2] + 1), stat: "Range" }
        ];

        paths.forEach(p => {
            const div = document.createElement('div');
            div.className = 'upgrade-path';

            // Check locking
            let locked = false;
            if (t.upgradePath !== null && t.upgradePath !== p.id) {
                locked = true;
                div.classList.add('locked');
            }

            const currentLvl = t.upgrades[p.id];

            div.innerHTML = `
                <strong>${p.name}</strong><br>
                Lvl: ${currentLvl}<br>
                Cost: ${p.cost}
                <button class="upgrade-btn" ${locked ? 'disabled' : ''}>Upgrade</button>
            `;

            if (!locked) {
                const btn = div.querySelector('button');
                btn.addEventListener('click', () => {
                    this.tryUpgrade(t, p.id, p.cost);
                });
            }

            this.upgradeOptions.appendChild(div);
        });
    }

    tryUpgrade(tower, pathId, cost) {
        if (this.game.candy >= cost) {
            this.game.candy -= cost;
            tower.totalInvested += cost; // Track investment for sell value

            // Set path if first upgrade
            if (tower.upgradePath === null) {
                tower.upgradePath = pathId;
            }

            tower.upgrades[pathId]++;

            // Apply Stats
            if (pathId === 0) tower.fireRate *= 1.2;
            if (pathId === 1) tower.damage *= 1.2;
            if (pathId === 2) tower.range *= 1.15;

            this.updateStats();
            this.renderUpgrades();
        } else {
            console.log("Not enough candy");
        }
    }
}
