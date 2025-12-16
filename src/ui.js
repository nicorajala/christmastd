
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

        // Define paths based on tower type
        let paths = [];

        if (t.type === 'trap') {
            paths = [
                { id: 0, name: "Deploy Speed", cost: 50 * (t.upgrades[0] + 1), stat: "Fire Rate" },
                { id: 1, name: "Extra Spikes", cost: 100 * (t.upgrades[1] + 1), stat: "Max Spikes" },
                { id: 2, name: "Throw Range", cost: 50 * (t.upgrades[2] + 1), stat: "Range" }
            ];
        } else if (t.type === 'snowman') {
            paths = [
                { id: 0, name: "Reload Speed", cost: 100 * (t.upgrades[0] + 1), stat: "Fire Rate" },
                { id: 1, name: "Freeze Power (Dmg)", cost: 100 * (t.upgrades[1] + 1), stat: "Damage" },
                { id: 2, name: "Eagle Eye (Range)", cost: 100 * (t.upgrades[2] + 1), stat: "Range" }
            ];
        } else {
            // Default (Cane)
            paths = [
                { id: 0, name: "Sugar Rush (Speed)", cost: 50 * (t.upgrades[0] + 1), stat: "Fire Rate" },
                { id: 1, name: "Hard Candy (Damage)", cost: 50 * (t.upgrades[1] + 1), stat: "Damage" },
                { id: 2, name: "Peppermint sight (Range)", cost: 50 * (t.upgrades[2] + 1), stat: "Range" }
            ];
        }

        paths.forEach(p => {
            const div = document.createElement('div');
            div.className = 'upgrade-path';

            // Check locking
            let locked = false;
            // Upgrade path locking removed - user didn't ask for exclusive paths, just "damage upgrade shouldn't be available on trap guy". 
            // Wait, previous code had `upgradePath` locking. "The damage upgrade path shouldn't be available...".
            // User request: "make every towers upgrades specific... make every towers upgrades go to only ten".
            // Usually TD games allow upgrading dependently. The previous code enforced choosing ONE path: `if (t.upgradePath !== null && t.upgradePath !== p.id) locked = true;`
            // User didn't explicitly say remove locking, but usually with "level 10 cap" implies linear progression per path. 
            // I will keep the locking if it was there to respect original design, OR I can remove it if it feels restrictive. 
            // The user said "damage upgrade path shouldn't be available".
            // Let's Keep the "One Path Only" mechanic if that was the intent, BUT actually standard BTD6 lets you upgrade multiple paths (usually 2).
            // The current code forces ONE path. I'll stick to that simple model for now unless requested otherwise, as it simplifies "upgradePath".
            // Actually, wait. "make every towers upgrades go to only ten". That sounds like standard progression.
            // Let's KEEP the locking for now to avoid changing core mechanics too much, effectively making them "Specializations".

            if (t.upgradePath !== null && t.upgradePath !== p.id) {
                locked = true;
                div.classList.add('locked');
            }

            const currentLvl = t.upgrades[p.id];
            const isMaxed = currentLvl >= 10;

            div.innerHTML = `
                <strong>${p.name}</strong><br>
                Lvl: ${currentLvl}${isMaxed ? ' (MAX)' : ''}<br>
                ${isMaxed ? 'Maxed Out' : `Cost: ${p.cost}`}
                <button class="upgrade-btn" ${locked || isMaxed ? 'disabled' : ''}>${isMaxed ? 'MAX' : 'Upgrade'}</button>
            `;

            if (!locked && !isMaxed) {
                const btn = div.querySelector('button');
                btn.addEventListener('click', () => {
                    this.tryUpgrade(t, p.id, p.cost);
                });
            }

            this.upgradeOptions.appendChild(div);
        });
    }

    tryUpgrade(tower, pathId, cost) {
        if (tower.upgrades[pathId] >= 10) return; // Cap

        if (this.game.candy >= cost) {
            this.game.candy -= cost;
            tower.totalInvested += cost; // Track investment for sell value

            // Set path if first upgrade
            if (tower.upgradePath === null) {
                tower.upgradePath = pathId;
            }

            tower.upgrades[pathId]++;

            // Apply Stats
            // Generic multipliers
            if (pathId === 0) tower.fireRate *= 1.2;

            // Damage (Path 1 for most, but Trap Path 1 is Max Spikes)
            if (tower.type === 'trap') {
                if (pathId === 1) tower.maxActiveSpikes += 1;
            } else {
                if (pathId === 1) tower.damage *= 1.2;
            }

            // Range
            if (pathId === 2) tower.range *= 1.15;

            this.updateStats();
            this.renderUpgrades();
        } else {
            console.log("Not enough candy");
        }
    }
}
