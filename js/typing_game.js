const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    backgroundColor: '#000022',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

let game = new Phaser.Game(config);
let player;
let enemies;
let scoreText;
let livesText;
let gameOverText;
let restartButton;
let targetLine; 
let errorText; 

let score = 0;
let lives = 5;
let isGameOver = false;
let words = []; 
let currentTarget = null;
let inputField; 

function preload () {
    this.load.image('player', 'assets/cannon.png');
}

function create () {
    console.log("Game Create Started");
    score = 0;
    lives = 5;
    isGameOver = false;
    currentTarget = null;

    createStars(this);

    player = this.physics.add.sprite(400, 550, 'player');
    // 如果图片加载失败，给个保底颜色，防止看不见
    if (!player.texture || player.texture.key === '__MISSING') {
        let g = this.make.graphics({x:0, y:0, add:false});
        g.fillStyle(0x00ccff, 1);
        g.fillRect(0,0,40,80);
        g.generateTexture('player_fallback', 40, 80);
        player.setTexture('player_fallback');
    }
    
    player.displayHeight = 80;
    player.scaleX = player.scaleY;
    player.setOrigin(0.5, 0.7); 
    player.setCollideWorldBounds(true);

    // 使用普通组
    enemies = this.add.group();
    
    scoreText = this.add.text(16, 16, 'Score: 0', { font: '32px Arial', fill: '#00ff00' });
    livesText = this.add.text(650, 16, 'Lives: 5', { font: '32px Arial', fill: '#ff0000' });
    errorText = this.add.text(400, 500, '', { font: 'bold 32px Arial', fill: '#ff0000' }).setOrigin(0.5);
    
    targetLine = this.add.graphics();

    fetchWords(this);

    inputField = document.getElementById('word-input');
    if (inputField) {
        inputField.value = '';
        inputField.focus();
        // 移除旧的监听器防止重复 (虽然 create 只运行一次，但是个好习惯)
        // 这里简单处理，因为每次刷新页面都是新的 JS环境
        inputField.addEventListener('input', handleInput.bind(this));
    }

    this.time.addEvent({
        delay: 2000, 
        callback: spawnEnemy,
        callbackScope: this,
        loop: true
    });
    
    console.log("Game Create Finished");
}

function handleInput(e) {
    if (isGameOver) return;
    errorText.setText('');
    
    let val = e.target.value.trim().toLowerCase();
    
    if (currentTarget && currentTarget.active) {
        let targetWord = currentTarget.getData('word');
        
        if (val === targetWord) {
            successShot(this);
        } 
        else if (val.length >= targetWord.length && val !== targetWord) {
            failShot(this);
        }
    }
}

function createStars(scene) {
    let starGraphics = scene.make.graphics({ x: 0, y: 0, add: false });
    starGraphics.fillStyle(0xffffff, 1);
    starGraphics.fillCircle(2, 2, 2); 
    starGraphics.generateTexture('star', 4, 4);
    starGraphics.destroy();

    for(let i=0; i<150; i++) {
        let x = Phaser.Math.Between(0, 800);
        let y = Phaser.Math.Between(0, 600);
        let star = scene.add.image(x, y, 'star');
        star.setScale(Phaser.Math.FloatBetween(0.5, 1.5));
        star.setAlpha(Phaser.Math.FloatBetween(0.3, 1));
        scene.tweens.add({
            targets: star,
            alpha: { from: 0.2, to: 1 },
            duration: Phaser.Math.Between(1000, 3000),
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
            delay: Phaser.Math.Between(0, 2000)
        });
    }
}

function fetchWords(scene) {
    fetch('/api/words')
        .then(res => res.json())
        .then(data => {
            if(data && data.length > 0) words = data;
            else words = [{en: 'error', cn: '错误'}, {en: 'test', cn: '测试'}];
        })
        .catch(err => {
            console.error(err);
            words = [{en: 'network', cn: '网络'}, {en: 'offline', cn: '离线'}];
        });
}

function spawnEnemy() {
    if (isGameOver || words.length === 0) return;

    if (enemies.countActive(true) >= 5) return;

    let wordData = Phaser.Utils.Array.GetRandom(words);
    let x = Phaser.Math.Between(50, 750);
    let y = -30;

    let enemyContainer = this.add.container(x, y);
    
    let text = this.add.text(0, 0, wordData.cn, {
        font: 'bold 20px "Microsoft YaHei", Arial', 
        fill: '#ffffff',
        stroke: '#000000', 
        strokeThickness: 4 
    }).setOrigin(0.5);

    let radius = Math.max(text.width, text.height) / 2 + 10; 
    radius = Phaser.Math.Clamp(radius, 25, 60);

    let bg = this.add.graphics();
    bg.fillStyle(0xff0000, 0.6);
    bg.fillCircle(0, 0, radius);

    enemyContainer.add([bg, text]);
    enemyContainer.setSize(radius*2, radius*2);
    
    // 我们手动移动，不使用 physics.world.enable，减少副作用
    // enemyContainer.setData...
    enemyContainer.setData('word', wordData.en.toLowerCase());
    enemyContainer.setData('speed', Phaser.Math.Between(80, 150));
    
    enemies.add(enemyContainer);
}

function update(time, delta) {
    if (isGameOver) return;

    findTarget();

    if (currentTarget && currentTarget.active) {
        let angle = Phaser.Math.Angle.Between(player.x, player.y, currentTarget.x, currentTarget.y);
        player.rotation = angle + Math.PI / 2;
        
        targetLine.clear();
        targetLine.lineStyle(2, 0x00ff00, 0.3); 
        targetLine.beginPath();
        targetLine.moveTo(player.x, player.y);
        targetLine.lineTo(currentTarget.x, currentTarget.y);
        targetLine.strokePath();
    } else {
        targetLine.clear();
        if (inputField && inputField.value !== '') inputField.value = '';
    }

    // 修复遍历方式: 使用 getChildren().forEach
    enemies.getChildren().forEach(function(enemy) {
        if (enemy.active) {
            // 移动
            enemy.y += enemy.getData('speed') * (delta / 1000);

            if (enemy.y > 580) {
                enemy.destroy();
                loseLife(this);
                if (enemy === currentTarget) {
                    currentTarget = null;
                    if (inputField) inputField.value = ''; 
                }
            }
        }
    }, this);
}

function findTarget() {
    if (!currentTarget || !currentTarget.active) {
        let closestDist = Infinity;
        let closestEnemy = null;

        enemies.getChildren().forEach(function(enemy) {
            if (enemy.active) {
                let dist = Phaser.Math.Distance.Between(player.x, player.y, enemy.x, enemy.y);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestEnemy = enemy;
                }
            }
        });

        if (closestEnemy) {
            currentTarget = closestEnemy;
            if (inputField) {
                inputField.value = ''; 
                inputField.placeholder = "Type: " + closestEnemy.getData('word').length + " letters"; 
            }
        }
    }
}

function successShot(scene) {
    fireLaser(scene, currentTarget, 0x00ffff); 
    
    currentTarget.destroy();
    currentTarget = null;
    
    score += 10;
    scoreText.setText('Score: ' + score);
    
    if (inputField) inputField.value = '';
    findTarget();
}

function failShot(scene) {
    scene.cameras.main.shake(100, 0.01); 
    errorText.setText('WRONG!'); 
    errorText.alpha = 1;
    
    scene.tweens.add({
        targets: errorText,
        alpha: 0,
        duration: 800,
        delay: 200
    });

    fireLaser(scene, currentTarget, 0xff0000); 
    if (inputField) inputField.value = '';
}

function fireLaser(scene, target, color) {
    let laser = scene.add.graphics();
    laser.lineStyle(5, color, 1);
    laser.beginPath();
    laser.moveTo(player.x, player.y - 40);
    laser.lineTo(target.x, target.y);
    laser.strokePath();

    scene.time.delayedCall(100, () => {
        laser.destroy();
    });
}

function loseLife(scene) {
    lives--;
    livesText.setText('Lives: ' + lives);
    if (lives <= 0) {
        gameOver(scene);
    }
}

function gameOver(scene) {
    isGameOver = true;
    enemies.clear(true, true);
    targetLine.clear();
    if (inputField) inputField.disabled = true;
    
    gameOverText = scene.add.text(400, 300, 'GAME OVER\nFinal Score: ' + score, {
        font: 'bold 64px Arial',
        fill: '#ff0000',
        stroke: '#ffffff',
        strokeThickness: 6,
        align: 'center'
    }).setOrigin(0.5);

    restartButton = scene.add.text(400, 480, 'Click to Restart', {
        font: '32px Arial',
        fill: '#ffffff',
        backgroundColor: '#006600',
        padding: { x: 20, y: 10 }
    }).setOrigin(0.5).setInteractive();

    restartButton.on('pointerdown', function() {
        location.reload(); 
    });
}
